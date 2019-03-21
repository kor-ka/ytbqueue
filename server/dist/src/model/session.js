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
const redisUtil_1 = require("../redisUtil");
const user_1 = require("./user");
let scoreShift = 4000000000000000;
let likeShift = 3000000000;
exports.pickSession = () => __awaiter(this, void 0, void 0, function* () {
    return (yield exports.pickId('session'));
});
exports.pickId = (nameSpace) => __awaiter(this, void 0, void 0, function* () {
    let id = undefined;
    while (!id) {
        id = makeId();
        let exists = yield redisUtil_1.redishget(nameSpace, id);
        if (exists) {
            id = undefined;
        }
        else {
            yield redisUtil_1.redishset(nameSpace, id, id);
        }
    }
    return id;
});
let makeId = () => {
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
                    token = yield exports.pickSession();
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
exports.handleMessage = (batch, message) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (message.type === 'add') {
            yield handleAdd(batch, message);
        }
        else if (message.type === 'next') {
            yield handleNext(batch, message);
        }
        else if (message.type === 'init') {
            yield handleInit(batch, message);
        }
        else if (message.type === 'vote') {
            yield handleVote(batch, message);
        }
        else if (message.type === 'skip') {
            yield handleSkip(batch, message);
        }
        else if (message.type === 'remove') {
            yield handleSkip(batch, message);
        }
        else if (message.type === 'progress') {
            yield handleProgress(batch, message);
        }
    }
    catch (e) {
        batch.emit({ type: 'error', message: e.message, source: message });
        return true;
    }
    return false;
});
let handleInit = (io, message) => __awaiter(this, void 0, void 0, function* () {
    yield checkQueue(io, message);
    yield sendInit(io, message);
});
let sendInit = (io, message, forceGlobal) => __awaiter(this, void 0, void 0, function* () {
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
    let queueId = yield exports.pickId('queue_entry');
    let entry = { queueId, contentId: message.content.id, userId: message.creds.id };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift - new Date().getTime();
    yield redisUtil_1.rediszadd('queue-' + message.session.id, queueId, score);
    let historyScore = score;
    let historyCount = yield redisUtil_1.rediszcard('queue-history-' + message.session.id);
    if (historyCount === 1) {
        let historyTop = yield redisUtil_1.rediszrange('queue-history-' + message.session.id, -1, -1);
        if (historyTop[0]) {
            historyScore = historyTop[0].score + 1000;
        }
    }
    else {
        let historyBottom = yield redisUtil_1.rediszrange('queue-history-' + message.session.id, -1, -1);
        if (historyBottom[0]) {
            // move to end of history queue
            historyScore = historyBottom[0].score - 1000;
        }
    }
    yield redisUtil_1.rediszadd('queue-history-' + message.session.id, queueId, historyScore);
    // notify clients
    let res = yield resolveQueueEntry(queueId, message.session.id);
    io.emit({ type: 'AddQueueContent', content: res }, true);
    yield checkQueue(io, message);
});
let handleAddHistorical = (io, sessionId, source) => __awaiter(this, void 0, void 0, function* () {
    source.progress = undefined;
    // create queue entry
    let queueId = (yield exports.pickId('queue_entry')) + '-h';
    let entry = { queueId, contentId: source.id, userId: source.user.id };
    yield redisUtil_1.redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift / 2 - new Date().getTime();
    yield redisUtil_1.rediszadd('queue-' + sessionId, queueId, score);
    // notify clients
    let res = yield resolveQueueEntry(queueId, sessionId);
    io.emit({ type: 'AddQueueContent', content: res }, true);
});
let checkQueue = (io, source) => __awaiter(this, void 0, void 0, function* () {
    console.warn('checkQueue');
    // add top from history if nothing to play
    let size = yield redisUtil_1.rediszcard('queue-' + source.session.id);
    console.warn('checkQueue current size ', size);
    let minHistoryLength = 6;
    if (size < minHistoryLength) {
        let histroyTop = yield redisUtil_1.rediszrangebyscore('queue-history-' + source.session.id, 100000);
        console.warn('checkQueue add ', histroyTop);
        let historyAddCount = minHistoryLength - size;
        for (let t of histroyTop) {
            yield handleAddHistorical(io, source.session.id, yield resolveQueueEntry(t, source.session.id));
            // lower score to pick other content later
            let count = yield redisUtil_1.rediszcard('queue-history-' + source.session.id);
            let middleIndex = Math.round(count / 2) - 1;
            let middle = (yield redisUtil_1.rediszrange('queue-history-' + source.session.id, middleIndex, middleIndex))[0];
            let bottom = (yield redisUtil_1.rediszrange('queue-history-' + source.session.id, -1, -1))[0];
            let score;
            // todo? use votes to affect random part 
            if (count < 3) {
                // no too much content, just send to bottom
                score = bottom.score - 1000;
            }
            else {
                // pretty much content, add bit of random
                score = middle.score - Math.round(Math.random() * (middle.score - bottom.score + 1000));
            }
            console.warn('checkQueue', 'rotate history', 'new score', score);
            yield redisUtil_1.rediszadd('queue-history-' + source.session.id, t, score, 'XX');
            if (!--historyAddCount) {
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
let handleVote = (io, message) => __awaiter(this, void 0, void 0, function* () {
    let historical = message.queueId.includes('-h');
    let origQueueId = message.queueId.replace('-h', '');
    let vote = message.up ? 'up' : 'down';
    let increment = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
    increment *= likeShift;
    // get old vote
    let voteStored = yield redisUtil_1.redishget('queue-entry-vote-' + origQueueId, message.creds.id);
    // save new vote
    yield redisUtil_1.redishset('queue-entry-vote-' + origQueueId, message.creds.id, vote);
    if (!historical) {
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
    }
    yield io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: yield resolveQueueEntry(message.queueId, message.session.id) }, true);
});
let handleSkip = (io, message) => __awaiter(this, void 0, void 0, function* () {
    let historical = message.queueId.endsWith('-h');
    let orgQueueId = message.queueId.replace('-h', '');
    let owner = yield redisUtil_1.redishget('queue-entry-' + orgQueueId, 'userId');
    if (message.type === 'remove' && owner !== message.creds.id) {
        throw new Error('only owner can remove contnet from queue');
    }
    let votes = yield getVotes(orgQueueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    if (downs > Math.max(1, upds) || historical || message.type === 'remove') {
        let playingId = yield redisUtil_1.redisGet('queue-playing-' + message.session.id);
        if (playingId === message.queueId) {
            yield (handleNext(io, { type: 'next', session: message.session, queueId: message.queueId, creds: message.creds }));
        }
        else {
            yield redisUtil_1.rediszrem('queue-' + message.session.id, message.queueId);
            io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true);
        }
        // if skipped by users choise - remove from history
        if (downs > Math.max(1, upds) || message.type === 'remove') {
            yield redisUtil_1.rediszrem('queue-history-' + message.session.id, orgQueueId);
        }
    }
    yield checkQueue(io, message);
});
let handleProgress = (io, message) => __awaiter(this, void 0, void 0, function* () {
    yield redisUtil_1.redishset('queue-entry-' + message.queueId, 'progress', message.current / message.duration + '');
    yield redisUtil_1.redishset('queue-entry-' + message.queueId, 'current', message.current + '');
    yield redisUtil_1.redishset('queue-entry-' + message.queueId, 'duration', message.duration + '');
    yield io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: yield resolveQueueEntry(message.queueId, message.session.id) }, true);
});
let handleNext = (io, message) => __awaiter(this, void 0, void 0, function* () {
    yield redisUtil_1.redisSet('queue-playing-' + message.session.id, null);
    yield redisUtil_1.rediszrem('queue-' + message.session.id, message.queueId);
    io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true);
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
    let orgQueueId = queueId.replace('-h', '');
    let entry = yield redisUtil_1.redishgetall('queue-entry-' + queueId);
    let content = yield redisUtil_1.redishgetall('content-' + entry.contentId);
    let votes = yield getVotes(orgQueueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let ownerId = yield redisUtil_1.redishget('queue-entry-' + orgQueueId, 'userId');
    let owner = yield user_1.User.getUser(ownerId);
    let score = yield redisUtil_1.rediszscore('queue-' + sessionId, queueId);
    let progress = entry.progress ? Number.parseFloat(entry.progress) || 0 : 0;
    let current = entry.current ? Number.parseFloat(entry.current) || 0 : 0;
    let duration = entry.duration ? Number.parseFloat(entry.duration) || 0 : 0;
    let res = Object.assign({}, content, { user: yield user_1.User.getUser(entry.userId), score: score - scoreShift, queueId, historical, canSkip: downs > Math.max(1, upds) || historical, votes, progress, current, duration, owner });
    return res;
});
// let handle = async (io: IoWrapper, message: Message) => {
// }
