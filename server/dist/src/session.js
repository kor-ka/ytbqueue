"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisUtil_1 = require("./redisUtil");
const user_1 = require("./user");
let scoreShift = 4000000000000000;
exports.pickSession = () => {
    return (exports.makeid());
};
exports.makeid = () => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};
exports.getTokenFroSession = (id) => {
    return new Promise((res, error) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield redisUtil_1.transaction((tsx) => __awaiter(this, void 0, void 0, function* () {
                let token = yield redisUtil_1.redisGet('session_host_token_' + id, tsx);
                if (!token) {
                    token = exports.makeid();
                    yield redisUtil_1.redisSet('session_host_token_' + id, token, tsx);
                    res({ token, new: true });
                }
                else {
                    res({ token, new: false });
                }
            }));
        }
        catch (e) {
            error(e);
        }
    }));
};
exports.handleMessage = (io, message) => __awaiter(this, void 0, void 0, function* () {
    let validToken = (yield exports.getTokenFroSession(message.session.id)).token;
    let isHost = message.session.token === validToken;
    if (message.type === 'add') {
        yield handleAdd(io, message, isHost);
    }
    else if (message.type === 'next') {
        yield handleNext(io, message, isHost);
    }
    else if (message.type === 'init') {
        yield handleInit(io, message, isHost);
    }
    else if (message.type === 'vote') {
        yield handleVote(io, message, isHost);
    }
    else if (message.type === 'skip') {
        yield handleSkip(io, message, isHost);
    }
});
let handleInit = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    yield checkQueue(io, message);
    yield sendInit(io, message, host);
});
let sendInit = (io, message, host, forceGlobal) => __awaiter(this, void 0, void 0, function* () {
    let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
    let playing;
    if (playingId) {
        playing = yield resolveQueueEntry(playingId, message.session.id);
    }
    let content = [];
    let qids = yield redisUtil_1.rediszrange('queue-' + message.session.id);
    for (let qid of qids) {
        let c = yield resolveQueueEntry(qid.key, message.session.id);
        content.push(c);
    }
    io.emit({ type: 'InitQueue', content, playing }, forceGlobal);
});
let handleAdd = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    // save content
    yield redisUtil_1.redishsetobj('content-' + message.content.id, message.content);
    // create queue entry
    let queueId = exports.makeid();
    let entry = { queueId, contentId: message.content.id, userId: message.creds.id };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    yield redisUtil_1.rediszadd('queue-' + message.session.id, queueId, scoreShift);
    yield redisUtil_1.rediszadd('queue-history-' + message.session.id, queueId, scoreShift);
    // notify clients
    let res = Object.assign({}, message.content, { user: yield user_1.User.getUser(message.creds.id), score: 0, queueId, historical: false, votes: [] });
    io.emit({ type: 'AddQueueContent', content: res }, true);
    yield checkQueue(io, message);
});
let checkQueue = (io, source) => __awaiter(this, void 0, void 0, function* () {
    console.warn('checkQueue');
    // add top from history if nothing to play
    let size = yield redisUtil_1.rediszcard('queue-' + source.session.id);
    console.warn('checkQueue current size ', size);
    if (size < 3) {
        let histroyTop = yield redisUtil_1.rediszrangebyscore('queue-history-' + source.session.id, 10);
        // mb reduce history score here? - prevent repeat same content too often
        console.warn('checkQueue add ', histroyTop);
        for (let t of histroyTop) {
            yield redisUtil_1.rediszadd('queue-' + source.session.id, t, scoreShift - new Date().getTime(), 'NX');
        }
        yield sendInit(io, { type: 'init', session: source.session }, true, true);
    }
    let playing = yield redisUtil_1.redisGet('queue-playing-' + source.session.id);
    if (!playing) {
        let top = yield redisUtil_1.redisztop('queue-' + source.session.id);
        console.warn('top - ' + top);
        if (top) {
            playing = top;
            // save playing
            yield redisUtil_1.redisSet('queue-playing-' + source.session.id, playing);
            // todo: better get from redis - check fields, resolve fields that amy changed eg user
            let queueEntry = yield resolveQueueEntry(playing, source.session.id);
            yield io.emit({ type: 'Playing', content: queueEntry }, true);
            yield redisUtil_1.rediszrem('queue-' + source.session.id, playing);
        }
    }
});
let handleVote = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    let vote = message.up ? 'up' : 'down';
    let increment = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
    // get old vote
    let voteStored = yield redisUtil_1.redishget('queue-entry-vote-' + message.queueId, message.creds.id);
    // save new vote
    yield redisUtil_1.redishset('queue-entry-vote-' + message.queueId, message.creds.id, vote);
    if (voteStored === vote) {
        increment *= -1;
        yield redisUtil_1.redishdel('queue-entry-vote-' + message.queueId, message.creds.id);
    }
    else if (voteStored) {
        console.warn('stored -x2', voteStored);
        // have saved vote and new is diffirent - x2 for reset and increment new
        increment *= 2;
    }
    // do not change score for playing - it will return it to queue
    let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
    if (playingId !== message.queueId) {
        yield redisUtil_1.rediszincr('queue-' + message.session.id, message.queueId, increment);
    }
    // increment history anyway
    yield redisUtil_1.rediszincr('queue-history-' + message.session.id, message.queueId, increment);
    yield io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: yield resolveQueueEntry(message.queueId, message.session.id) }, true);
});
let handleSkip = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    let historical = (yield redisUtil_1.redisGet('queue-history-played-session' + message.session.id + '-q-' + message.queueId)) === 'true';
    let votes = yield getVotes(message.queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = yield redisUtil_1.rediszscore('queue-' + message.session.id, message.queueId);
    if (downs > Math.max(1, upds) || historical || score < 1000) {
        let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
        if (playingId === message.queueId) {
            yield (handleNext(io, { type: 'next', session: message.session, queueId: message.queueId, creds: message.creds }, true));
        }
        else {
            yield redisUtil_1.rediszrem('queue-' + message.session.id, message.queueId);
            io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true);
        }
    }
    yield checkQueue(io, this.message.sessionId);
});
let handleNext = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    if (host) {
        let playing = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
        if (playing) {
            yield redisUtil_1.redisSet('queue-history-played-session' + message.session.id + '-q-' + message.queueId, 'true');
        }
        yield redisUtil_1.redisSet('queue-playing-' + message.session.id, null);
        yield redisUtil_1.rediszrem('queue-' + message.session.id, message.queueId);
        io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true);
    }
    else {
        io.emit({ type: 'error', message: 'only host can fire next', source: message });
    }
    yield checkQueue(io, message);
});
//
// resolvers
//
let getVotes = (queueId) => __awaiter(this, void 0, void 0, function* () {
    let allVotes = yield redisUtil_1.redishgetall('queue-entry-vote-' + queueId);
    let allVotesRes = [];
    for (let uid of Object.keys(allVotes)) {
        let vote = allVotes[uid];
        allVotesRes.push({ user: yield user_1.User.getUser(uid), up: vote === 'up' });
    }
    return allVotesRes;
});
let resolveQueueEntry = (queueId, sessionId) => __awaiter(this, void 0, void 0, function* () {
    console.warn('resolveQueueEntry');
    let historical = (yield redisUtil_1.redisGet('queue-history-played-session' + sessionId + '-q-' + queueId)) === 'true';
    let entry = yield redisUtil_1.redishgetall('queue-entry-' + queueId);
    let content = yield redisUtil_1.redishgetall('content-' + entry.contentId);
    let votes = yield getVotes(queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = yield redisUtil_1.rediszscore('queue-' + sessionId, queueId);
    let res = Object.assign({}, content, { user: yield user_1.User.getUser(entry.userId), score: score - scoreShift, queueId, historical, canSkip: downs > Math.max(1, upds) || historical || score < 1000, votes });
    return res;
});
// let handle = async (io: IoWrapper, message: Message, host: boolean) => {
// }
