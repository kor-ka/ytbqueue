
import * as socketIo from 'socket.io-client';
export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

import { QueueContent, Content } from './../../../server/src/model/entity'
import { Event, InitQueue, AddQueueContent, RemoveQueueContent, Playing, UpdateQueueContent } from './../../../server/src/model/event'
import { Message } from './../../../server/src/model/message'

class Emitter {
    io: SocketIOClient.Socket;
    session: { id: string, token: string };
    clientId: string;
    constructor(io: SocketIOClient.Socket, session: { id: string, token: string }, clientId: string) {
        this.io = io;
        this.session = session;
        this.clientId = clientId;
    }

    emit = (message: Message) => {
        console.warn('emmiting', message);
        this.io.emit('message', JSON.stringify({ ...message, session: this.session, clientId: this.clientId })).send();
    }
}

export class QueueSession {
    playing?: QueueContent;
    queue = new Map<string, QueueContent>();
    io: Emitter;
    inited = false;

    constructor(id: string, token: string | undefined, clientId: string | undefined) {
        let socket = socketIo(endpoint);
        socket.on('event', this.handleEvent);
        this.io = new Emitter(socket, { id, token }, clientId);

        this.io.emit({ type: 'init' });
    }

    //
    // Output
    //

    add = async (content: Content) => {
        await this.io.emit({ type: 'add', content });
    }

    next = async (qid: string) => {
        await this.io.emit({ type: 'next', queueId: qid });
    }

    vote = async (qid: string, up: boolean) => {
        await this.io.emit({ type: 'vote', queueId: qid, up: up });
    }

    skip = async (qid: string) => {
        await this.io.emit({ type: 'skip', queueId: qid });
    }

    //
    // Input
    //
    handleEvent = async (e: string) => {
        let event = JSON.parse(e) as Event;
        console.warn('onEvent', event)
        if (event.type === 'InitQueue') {
            await this.handleInit(event);
        } else if (event.type === 'AddQueueContent') {
            await this.handleAdd(event);
        } else if (event.type === 'RemoveQueueContent') {
            await this.handleRemove(event);
        } else if (event.type === 'Playing') {
            await this.handlePlaying(event);
        } else if (event.type === 'UpdateQueueContent') {
            await this.handleUpdate(event);
        }

    }

    handlePlaying = async (event: Playing) => {
        this.playing = event.content;
        this.queue.delete(event.content.queueId);
        this.notifyAll();
    }

    handleAdd = async (event: AddQueueContent) => {
        this.queue.set(event.content.queueId, event.content);
        this.notifyQueue();
    }

    handleRemove = async (event: RemoveQueueContent) => {
        this.queue.delete(event.queueId);
        if ((this.playing && this.playing.queueId) === event.queueId) {
            this.playing = undefined;
        }
        this.notifyAll();
    }

    handleUpdate = async (event: UpdateQueueContent) => {
        let trget = this.queue.get(event.queueId);
        if (trget) {
            this.queue.set(event.queueId, { ...trget, ...event.content })
            this.notifyQueue();
        }
        if (this.playing && this.playing.queueId === event.queueId) {
            this.playing = { ...this.playing, ...event.content };
            this.notifyPlaying();
        }
    }

    handleInit = async (event: InitQueue) => {
        for (let c of event.content) {
            this.queue.set(c.queueId, c);
        }
        this.playing = event.playing;
        this.inited = true;
        this.notifyAll();
    }


    //
    // Subscriptoins
    //
    playingListeners = new Set<(playing?: QueueContent) => void>()
    queueListeners = new Set<(data: { queue: QueueContent[], inited: boolean }) => void>()

    onPlayingChange = (callback: (playing: QueueContent) => void) => {
        this.playingListeners.add(callback);
        callback(this.playing);
    }

    onQueueChange = (callback: (data: { queue: QueueContent[], inited: boolean }) => void) => {
        this.queueListeners.add(callback);
        callback({ queue: [...this.queue.values()].sort((a, b) => b.score - a.score), inited: this.inited });
    }

    notifyPlaying = () => {
        for (let l of this.playingListeners) {
            l(this.playing);
        }
    }

    notifyQueue = () => {
        for (let l of this.queueListeners) {
            l({ queue: [...this.queue.values()].sort((a, b) => b.score - a.score), inited: this.inited });
        }
    }
    notifyAll = async () => {
        this.notifyPlaying();
        this.notifyQueue();
    }
}