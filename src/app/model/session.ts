
import * as socketIo from 'socket.io-client';
export const endpoint = window.location.hostname.indexOf('localhost') >= 0 ? 'http://localhost:5000' : '';

import { QueueContent, Content, UserCreds } from './../../../server/src/model/entity'
import { Event, InitQueue, AddQueueContent, RemoveQueueContent, Playing, UpdateQueueContent } from './../../../server/src/model/event'
import { Message } from './../../../server/src/model/message'
import * as Cookie from 'js-cookie';

class Emitter {
    io: SocketIOClient.Socket;
    session: { id: string, token: string };
    user: { id: string, token: string };
    clientId: string;
    constructor(io: SocketIOClient.Socket, session: { id: string, token: string }, user: UserCreds) {
        this.io = io;
        this.session = session;
        this.user = user;
    }

    emit = (message: Message) => {
        console.warn('emmiting', message);
        this.io.emit('message', JSON.stringify({ ...message, session: this.session, creds: this.user })).send();
    }
}

export type QueueContentLocal = QueueContent & { playing?: boolean };
export class QueueSession {
    id: string;
    clientId: string;
    playing?: QueueContentLocal;
    queue = new Map<string, QueueContentLocal>();
    io: Emitter;
    inited = false;

    constructor() {
        this.id = window.location.pathname.split('/').filter(s => s.length)[0];
        let token = Cookie.get('azaza_app_host_' + (this.id ? this.id.toUpperCase() : ''));

        let client = Cookie.get('azaza_app_client');
        this.clientId = client.split('-')[0];
        let clientToken = client.split('-')[1];

        this.id = this.id ? this.id.toUpperCase() : this.id;

        let socket = socketIo(endpoint);
        socket.on('event', this.handleEvent);

        this.io = new Emitter(socket, { id: this.id, token }, { id: this.clientId, token: clientToken });
        socket.on('connect', () => this.io.emit({ type: 'init' }));

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
        let events = JSON.parse(e) as { events: Event[] };
        for (let event of events.events) {
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
        this.notifyAll();
    }

    handlePlaying = async (event: Playing) => {
        this.playing = event.content;
        this.queue.delete(event.content.queueId);
    }

    handleAdd = async (event: AddQueueContent) => {
        this.queue.set(event.content.queueId, event.content);
    }

    handleRemove = async (event: RemoveQueueContent) => {
        this.queue.delete(event.queueId);
        if ((this.playing && this.playing.queueId) === event.queueId) {
            this.playing = undefined;
        }
    }

    handleUpdate = async (event: UpdateQueueContent) => {
        let trget = this.queue.get(event.queueId);
        if (trget) {
            this.queue.set(event.queueId, { ...trget, ...event.content })
        }
        if (this.playing && this.playing.queueId === event.queueId) {
            this.playing = { ...this.playing, ...event.content };
        }
    }

    handleInit = async (event: InitQueue) => {
        for (let c of event.content) {
            this.queue.set(c.queueId, c);
        }
        this.playing = event.playing;
        this.inited = true;
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
        let queue = [...this.queue.values()].sort((a, b) => b.score - a.score);
        if (this.playing) {
            queue.unshift({ ...this.playing, playing: true })
        }
        for (let l of this.queueListeners) {
            l({ queue, inited: this.inited });
        }
    }
    notifyAll = async () => {
        this.notifyPlaying();
        this.notifyQueue();
    }
}