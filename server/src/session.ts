import { redisGet, transaction, redisSet, rediszadd, redishset, redishsetobj, redisztop, redishgetall, rediszrange, rediszrem } from "./redisUtil";
import { hashCode } from "./utils";
import { Server } from "socket.io";
import { Message, Next, Add, Init } from "./model/message";
import { IoWrapper, InitQueue } from "./model/event";
import { QueueContent, QueueContentStored, Content } from "./model/entity";

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
                let token = await redisGet('session_token_' + id, tsx);
                if (!token) {
                    token = makeid()
                    await redisSet('session_token_' + id, token, tsx);
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

export let handleMessage = async (io: IoWrapper, message: Message, host: boolean) => {
    if (message.type === 'add') {
        await handleAdd(io, message, host);
    } else if (message.type === 'next') {
        await handleNext(io, message, host);
    } else if (message.type === 'init') {
        await handleInit(io, message, host);
    }
}


let checkQueue = async (io: IoWrapper, sessionId: string) => {
    // todo: implement history
    console.warn('checkQueue')
    let playing = await redisGet('queue-playing-' + sessionId);
    if (!playing) {
        let top = await redisztop('queue-' + sessionId);
        console.warn('top - ' + top);
        if (top) {
            playing = top;
            // save playing
            await redisSet('queue-playing-' + sessionId, playing);
            // todo: better get from redis - check fields, resolve fields that amy changed eg user
            let queueEntry = await resolveQueueEntry(playing);
            await io.emit({ type: 'Playing', content: queueEntry }, true);
        }
    }
}

let handleInit = async (io: IoWrapper, message: Init, host: boolean) => {
    // todo: implement history
    await checkQueue(io, message.session.id);
    let playingId = await redisGet('queue-playing-' + message.session.id);
    let playing: QueueContent;
    if (playingId) {
        playing = await resolveQueueEntry(playingId);
    }
    let content: QueueContent[] = [];
    let qids = await rediszrange('queue-' + message.session.id);
    for (let qid of qids) {
        let c = await resolveQueueEntry(qid.key);
        content.push({ ...c, score: qid.score });
    }
    io.emit({ type: 'InitQueue', content, playing })

}

let resolveQueueEntry = async (queueId: string) => {
    console.warn('resolveQueueEntry')
    let entry: QueueContentStored = await redishgetall('queue-entry-' + queueId) as any;
    let content: Content = await redishgetall('content-' + entry.contentId) as any;
    let res: QueueContent = { ...content, user: { id: entry.queueId, name: 'anon' }, score: 0, queueId, historical: false, votes: [] }
    return res;
}


let handleAdd = async (io: IoWrapper, message: Add, host: boolean) => {
    // save content
    await redishsetobj('content-' + message.content.id, message.content);
    // create queue entry
    let queueId = makeid();
    let entry: QueueContentStored = { queueId, contentId: message.content.id, userId: message.clientId };
    await redishsetobj('queue-entry-' + queueId, entry);
    await rediszadd('queue-' + message.session.id, queueId, 1);
    // notify clients
    let res: QueueContent = { ...message.content, user: { id: message.clientId, name: 'anon' }, score: 0, queueId, historical: false, votes: [] }
    io.emit({ type: 'AddQueueContent', content: res }, true)
    await checkQueue(io, message.session.id);
}

let handleNext = async (io: IoWrapper, message: Next, host: boolean) => {
    if (host) {
        await redisSet('queue-playing-' + message.session.id, null);
        await rediszrem('queue-' + message.session.id, message.queueId);
        io.emit({ type: 'RemoveQueueContent', queueId: message.queueId }, true)
    } else {
        io.emit({ type: 'error', message: 'only host can fire next', source: message })
    }
    await checkQueue(io, message.session.id);
}

// let handle = async (io: IoWrapper, message: Message, host: boolean) => {

// }