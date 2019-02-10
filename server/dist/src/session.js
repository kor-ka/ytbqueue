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
                let token = yield redisUtil_1.redisGet('session_token_' + id, tsx);
                if (!token) {
                    token = exports.makeid();
                    yield redisUtil_1.redisSet('session_token_' + id, token, tsx);
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
exports.handleMessage = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    if (message.type === 'add') {
        yield handleAdd(io, message, host);
    }
    else if (message.type === 'next') {
        yield handleNext(io, message, host);
    }
    else if (message.type === 'init') {
        yield handleInit(io, message, host);
    }
    else if (message.type === 'vote') {
        yield handleVote(io, message, host);
    }
    else if (message.type === 'skip') {
        yield handleSkip(io, message, host);
    }
});
let handleInit = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    // todo: implement history
    yield checkQueue(io, message.session.id);
    let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
    let playing;
    if (playingId) {
        playing = yield resolveQueueEntry(playingId, message.session.id);
    }
    let content = [];
    let qids = yield redisUtil_1.rediszrange('queue-' + message.session.id);
    for (let qid of qids) {
        let c = yield resolveQueueEntry(qid.key, message.session.id);
        content.push(Object.assign({}, c, { score: qid.score - scoreShift }));
    }
    io.emit({ type: 'InitQueue', content, playing });
});
let handleAdd = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    // save content
    yield redisUtil_1.redishsetobj('content-' + message.content.id, message.content);
    // create queue entry
    let queueId = exports.makeid();
    let entry = { queueId, contentId: message.content.id, userId: message.clientId };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    yield redisUtil_1.rediszadd('queue-' + message.session.id, queueId, scoreShift);
    // notify clients
    let res = Object.assign({}, message.content, { user: { id: message.clientId, name: 'anon' }, score: 0, queueId, historical: false, votes: [] });
    io.emit({ type: 'AddQueueContent', content: res }, true);
    yield checkQueue(io, message.session.id);
});
let checkQueue = (io, sessionId) => __awaiter(this, void 0, void 0, function* () {
    // todo: implement history
    console.warn('checkQueue');
    let playing = yield redisUtil_1.redisGet('queue-playing-' + sessionId);
    if (!playing) {
        let top = yield redisUtil_1.redisztop('queue-' + sessionId);
        console.warn('top - ' + top);
        if (top) {
            playing = top;
            // save playing
            yield redisUtil_1.redisSet('queue-playing-' + sessionId, playing);
            // todo: better get from redis - check fields, resolve fields that amy changed eg user
            let queueEntry = yield resolveQueueEntry(playing, sessionId);
            yield io.emit({ type: 'Playing', content: queueEntry }, true);
            yield redisUtil_1.rediszrem('queue-' + sessionId, playing);
        }
    }
});
let handleVote = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    let vote = message.up ? 'up' : 'down';
    let increment = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
    // get old vote
    let voteStored = yield redisUtil_1.redishget('queue-entry-vote-' + message.queueId, message.clientId);
    // save new vote
    yield redisUtil_1.redishset('queue-entry-vote-' + message.queueId, message.clientId, vote);
    if (voteStored === vote) {
        increment *= -1;
        yield redisUtil_1.redishdel('queue-entry-vote-' + message.queueId, message.clientId);
    }
    else if (voteStored) {
        console.warn('stored -x2', voteStored);
        // have saved vote and new is diffirent - x2 for reset and increment new
        increment *= 2;
    }
    // do not change score for playing - it fill return it to queue
    let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
    if (playingId !== message.queueId) {
        yield redisUtil_1.rediszincr('queue-' + message.session.id, message.queueId, increment);
    }
    yield io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: yield resolveQueueEntry(message.queueId, message.session.id) }, true);
});
let handleSkip = (io, message, host) => __awaiter(this, void 0, void 0, function* () {
    let votes = yield getVotes(message.queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    if (downs > Math.max(0, upds)) {
        yield (handleNext(io, { type: 'next', session: message.session, queueId: message.queueId }, true));
    }
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
    yield checkQueue(io, message.session.id);
});
//
// resolvers
//
let getVotes = (queueId) => __awaiter(this, void 0, void 0, function* () {
    let allVotes = yield redisUtil_1.redishgetall('queue-entry-vote-' + queueId);
    let allVotesRes = [];
    for (let uid of Object.keys(allVotes)) {
        let vote = allVotes[uid];
        allVotesRes.push({ user: { id: uid, name: 'anon' }, up: vote === 'up' });
    }
    return allVotesRes;
});
let resolveQueueEntry = (queueId, sessionId) => __awaiter(this, void 0, void 0, function* () {
    console.warn('resolveQueueEntry');
    let entry = yield redisUtil_1.redishgetall('queue-entry-' + queueId);
    let content = yield redisUtil_1.redishgetall('content-' + entry.contentId);
    let votes = yield getVotes(queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = yield redisUtil_1.rediszscore('queue-' + sessionId, queueId);
    let res = Object.assign({}, content, { user: { id: entry.queueId, name: 'anon' }, score: score - scoreShift, queueId, historical: false, canSkip: downs > Math.max(0, upds), votes });
    return res;
});
// let handle = async (io: IoWrapper, message: Message, host: boolean) => {
// }
