import { redisGet, transaction, redisSet, rediszadd, redishset, redishsetobj, redisztop, redishgetall, rediszrange, rediszrem, redishget, rediszincr, rediszscore, redishdel, rediszcard, rediszrangebyscore, rediszexists } from "./redisUtil";
import { hashCode } from "./utils";
import { Server } from "socket.io";
import { Message, Next, Add, Init, Vote, Skip } from "./model/message";
import { IoWrapper, InitQueue, Event, IoBatch } from "./model/event";
import { QueueContent, QueueContentStored, Content, User as IUser } from "./model/entity";
import { User } from "./user";

let scoreShift = 4000000000000000;
let likeShift = 3000000000;
export let pickSession = () => {
    return (makeid());
}

export let makeid = () => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

export let getTokenFroSession = (id: string) => {
    return new Promise<{ token: string, new: boolean }>(async (res, error) => {
        try {
            await transaction(async tsx => {
                let token = await redisGet('session_host_token_' + id, tsx);
                if (!token) {
                    token = makeid()
                    await redisSet('session_host_token_' + id, token, tsx);
                    res({ token, new: true });
                } else {
                    res({ token, new: false })
                }
            });

        } catch (e) {
            error(e)
        }
    });
}

export let handleMessage = async (io: IoWrapper, message: Message) => {
    let validToken = (await getTokenFroSession(message.session.id)).token;
    let isHost = message.session.token === validToken;
    let batch = io.batch();
    try {
        if (message.type === 'add') {
            await handleAdd(batch, message);
        } else if (message.type === 'next') {
            await handleNext(batch, message, isHost);
        } else if (message.type === 'init') {
            await handleInit(batch, message, isHost);
        } else if (message.type === 'vote') {
            await handleVote(batch, message, isHost);
        } else if (message.type === 'skip') {
            await handleSkip(batch, message, isHost);
        }
        batch.commit();

    } catch (e) {
        io.emit({ type: 'error', message: e.message, source: message });
    }

}


let handleInit = async (io: IoBatch, message: Init, host: boolean) => {
    await checkQueue(io, message);
    await sendInit(io, message, host);
}

let sendInit = async (io: IoBatch, message: Init, host: boolean, forceGlobal?: boolean) => {
    let playingId = await redisGet('queue-playing-' + message.session.id);
    let playing: QueueContent;
    if (playingId) {
        playing = await resolveQueueEntry(playingId, message.session.id);
    }
    let content: QueueContent[] = [];
    let qids = await rediszrange('queue-' + message.session.id);
    for (let qid of qids) {
        let c = await resolveQueueEntry(qid.key, message.session.id);
        content.push(c);
    }
    io.emit({ type: 'InitQueue', content, playing }, forceGlobal)
}


let handleAdd = async (io: IoBatch, message: Add) => {
    // save content
    await redishsetobj('content-' + message.content.id, message.content);
    // create queue entry
    let queueId = makeid();
    let entry: QueueContentStored = { queueId, contentId: message.content.id, userId: message.creds.id };
    await redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift - new Date().getTime();
    await rediszadd('queue-' + message.session.id, queueId, score);
    await rediszadd('queue-history-' + message.session.id, queueId, score);
    // notify clients
    let res: QueueContent = { ...message.content, user: await User.getUser(message.creds.id), score: score - scoreShift, queueId, historical: false, votes: [] }
    io.emit({ type: 'AddQueueContent', content: res }, true)
    await checkQueue(io, message);
}

let handleAddHistorical = async (io: IoBatch, sessionId: string, source: QueueContent) => {
    // create queue entry
    let queueId = makeid() + '-h';
    let entry: QueueContentStored = { queueId, contentId: source.id, userId: source.user.id };
    await redishsetobj('queue-entry-' + queueId, entry);
    let score = scoreShift / 2 - new Date().getTime();
    await rediszadd('queue-' + sessionId, queueId, score);
    // notify clients
    let res: QueueContent = { ...source, score: score - scoreShift, queueId, historical: true, canSkip: true }
    io.emit({ type: 'AddQueueContent', content: res }, true)
}


let checkQueue = async (io: IoBatch, source: Message) => {
    console.warn('checkQueue')
    // add top from history if nothing to play
    let size = await rediszcard('queue-' + source.session.id);
    console.warn('checkQueue current size ', size);
    if (size < 6) {
        let histroyTop = await rediszrangebyscore('queue-history-' + source.session.id, 100000);
        console.warn('checkQueue add ', histroyTop);
        let count = 6 - size;
        for (let t of histroyTop) {
            await handleAddHistorical(io, source.session.id, await resolveQueueEntry(t, source.session.id));
            // lower score to pick other content later
            await rediszincr('queue-history-' + source.session.id, t, -likeShift);
            if (!--count) {
                break;
            }
        }
    }

    let playing = await redisGet('queue-playing-' + source.session.id);
    if (!playing) {
        let top = await redisztop('queue-' + source.session.id);
        console.warn('top - ' + top);
        if (top) {
            playing = top;
            // save playing
            await redisSet('queue-playing-' + source.session.id, playing);
            // todo: better get from redis - check fields, resolve fields that amy changed eg user
            let queueEntry = await resolveQueueEntry(playing, source.session.id);
            await io.emit({ type: 'Playing', content: queueEntry }, true);

            await rediszrem('queue-' + source.session.id, playing);
        }
    }
}


let handleVote = async (io: IoBatch, message: Vote, host: boolean) => {
    if (message.queueId.endsWith('-h')) {
        return;
    }
    let vote = message.up ? 'up' : 'down';
    let increment = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
    increment *= likeShift;

    // get old vote
    let voteStored = await redishget('queue-entry-vote-' + message.queueId, message.creds.id);
    // save new vote
    await redishset('queue-entry-vote-' + message.queueId, message.creds.id, vote);

    if (voteStored === vote) {
        increment *= -1;
        await redishdel('queue-entry-vote-' + message.queueId, message.creds.id);

    } else if (voteStored) {
        console.warn('stored -x2', voteStored);
        // have saved vote and new is diffirent - x2 for reset and increment new
        increment *= 2;
    }

    // do not change score for playing - it will return it to queue
    let playingId = await redisGet('queue-playing-' + message.session.id);
    if (playingId !== message.queueId) {
        await rediszincr('queue-' + message.session.id, message.queueId, increment);
    }
    // increment history anyway
    await rediszincr('queue-history-' + message.session.id, message.queueId, increment);

    await io.emit({ type: 'UpdateQueueContent', queueId: message.queueId, content: await resolveQueueEntry(message.queueId, message.session.id) }, true);
}

let handleSkip = async (io: IoBatch, message: Skip, host: boolean) => {
    let historical = message.queueId.endsWith('-h');
    let votes = await getVotes(message.queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;
    let score = await rediszscore('queue-' + message.session.id, message.queueId)
    if (downs > Math.max(1, upds) || historical) {
        let playingId = await redisGet('queue-playing-' + message.session.id);
        if (playingId === message.queueId) {
            await (handleNext(io, { type: 'next', session: message.session, queueId: message.queueId, creds: message.creds }, true))
        } else {
            await rediszrem('queue-' + message.session.id, message.queueId);
            io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true)
        }
    }
    await checkQueue(io, message);
}

let handleNext = async (io: IoBatch, message: Next, host: boolean) => {
    if (host) {
        await redisSet('queue-playing-' + message.session.id, null);
        await rediszrem('queue-' + message.session.id, message.queueId);
        io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true)
    } else {
        io.emit({ type: 'error', message: 'only host can fire next', source: message })
    }
    await checkQueue(io, message);
}

//
// resolvers
//


let getVotes = async (queueId: string) => {
    let allVotes = await redishgetall('queue-entry-vote-' + queueId);
    let allVotesRes: { user: IUser, up: boolean }[] = [];
    for (let uid of Object.keys(allVotes)) {
        let vote = allVotes[uid];
        allVotesRes.push({ user: await User.getUser(uid), up: vote === 'up' });
    }
    return allVotesRes;
}

let resolveQueueEntry = async (queueId: string, sessionId: string) => {
    console.warn('resolveQueueEntry')
    let historical = queueId.endsWith('-h');

    let entry: QueueContentStored = await redishgetall('queue-entry-' + queueId) as any;
    let content: Content = await redishgetall('content-' + entry.contentId) as any;

    let votes = await getVotes(queueId);
    let upds = votes.filter(v => v.up).length;
    let downs = votes.filter(v => !v.up).length;

    let score = await rediszscore('queue-' + sessionId, queueId)
    let res: QueueContent = { ...content, user: await User.getUser(entry.userId), score: score - scoreShift, queueId, historical, canSkip: downs > Math.max(1, upds) || historical, votes }
    return res;
}


// let handle = async (io: IoWrapper, message: Message, host: boolean) => {

// }
