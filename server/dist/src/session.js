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
let likeShift = 3000000000;
let cicleShift = 100000000000000;
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
    let batch = io.batch();
    try {
        if (message.type === 'add') {
            yield handleAdd(batch, message);
        }
        else if (message.type === 'next') {
            yield handleNext(batch, message, isHost);
        }
        else if (message.type === 'init') {
            yield handleInit(batch, message, isHost);
        }
        else if (message.type === 'vote') {
            yield handleVote(batch, message, isHost);
        }
        else if (message.type === 'skip') {
            yield handleSkip(batch, message, isHost);
        }
        else if (message.type === 'progress') {
            yield handleProgress(batch, message, isHost);
        }
        batch.commit();
    }
    catch (e) {
        io.emit({ type: 'error', message: e.message, source: message });
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
let handleAdd = (io, message) => __awaiter(this, void 0, void 0, function* () {
    // save content
    yield redisUtil_1.redishsetobj('content-' + message.content.id, message.content);
    // create queue entry
    let queueId = exports.makeid();
    let entry = { queueId, contentId: message.content.id, userId: message.creds.id };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift - new Date().getTime();
    yield redisUtil_1.rediszadd('queue-' + message.session.id, queueId, score);
    yield redisUtil_1.rediszadd('queue-history-' + message.session.id, queueId, score);
    // notify clients
    let res = Object.assign({}, message.content, { user: yield user_1.User.getUser(message.creds.id), score: score - scoreShift, queueId, historical: false, votes: [] });
    io.emit({ type: 'AddQueueContent', content: res }, true);
    yield checkQueue(io, message);
});
let handleAddHistorical = (io, sessionId, source) => __awaiter(this, void 0, void 0, function* () {
    // create queue entry
    let queueId = exports.makeid() + '-h';
    let entry = { queueId, contentId: source.id, userId: source.user.id };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift / 2 - new Date().getTime();
    yield redisUtil_1.rediszadd('queue-' + sessionId, queueId, score);
    // notify clients
    let res = Object.assign({}, source, { score: score - scoreShift, queueId, historical: true, canSkip: true });
    io.emit({ type: 'AddQueueContent', content: res }, true);
});
let checkQueue = (io, source) => __awaiter(this, void 0, void 0, function* () {
    console.warn('checkQueue');
    // add top from history if nothing to play
    let size = yield redisUtil_1.rediszcard('queue-' + source.session.id);
    console.warn('checkQueue current size ', size);
    if (size < 6) {
        let histroyTop = yield redisUtil_1.rediszrangebyscore('queue-history-' + source.session.id, 100000);
        console.warn('checkQueue add ', histroyTop);
        let count = 6 - size;
        for (let t of histroyTop) {
            yield handleAddHistorical(io, source.session.id, yield resolveQueueEntry(t, source.session.id));
            // lower score to pick other content later
            yield redisUtil_1.rediszincr('queue-history-' + source.session.id, t, -likeShift);
            if (!--count) {
                break;
            }
        }
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
    if (message.queueId.endsWith('-h')) {
        return;
    }
    let vote = message.up ? 'up' : 'down';
    let increment = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
    increment *= likeShift;
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
    let historical = message.queueId.endsWith('-h');
    let votes = yield getVotes(message.queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = yield redisUtil_1.rediszscore('queue-' + message.session.id, message.queueId);
    if (downs > Math.max(1, upds) || historical) {
        let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
        if (playingId === message.queueId) {
            yield (handleNext(io, { type: 'next', session: message.session, queueId: message.queueId, creds: message.creds }, true));
        }
        else {
            yield redisUtil_1.rediszrem('queue-' + message.session.id, message.queueId);
            io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true);
        }
    }
    yield checkQueue(io, message);
});
let handleProgress = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    if (!host) {
        io.emit({ type: 'error', message: 'only host can fire progress', source: message });
    }
    redisUtil_1.redishset('queue-entry-' + message.queueId, 'progress', message.current / message.duration + '');
    yield io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: yield resolveQueueEntry(message.queueId, message.session.id) }, true);
});
let handleNext = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    if (host) {
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
    let historical = queueId.endsWith('-h');
    let entry = yield redisUtil_1.redishgetall('queue-entry-' + queueId);
    let content = yield redisUtil_1.redishgetall('content-' + entry.contentId);
    let votes = yield getVotes(queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = yield redisUtil_1.rediszscore('queue-' + sessionId, queueId);
    let progress;
    if (entry.progress) {
        try {
            progress = Number.parseFloat(entry.progress);
        }
        catch (e) {
            console.warn(e);
        }
    }
    let res = Object.assign({}, content, { user: yield user_1.User.getUser(entry.userId), score: score - scoreShift, queueId, historical, canSkip: downs > Math.max(1, upds) || historical, votes, progress });
    return res;
});
// let handle = async (io: IoWrapper, message: Message, host: boolean) => {
// }
