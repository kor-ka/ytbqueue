import { User, Content, QueueContent as QueueContent } from "./entity";
import { Message } from "./message";
import { Server } from "socket.io";

interface IEvent {
    session?: string;
    by?: User;
    type: string;
}

export type Event = AddQueueContent | RemoveQueueContent | UpdateQueueContent | InitQueue | Playing | Error;

export interface AddQueueContent extends IEvent {
    type: 'AddQueueContent';
    content: QueueContent;
}

export interface Playing extends IEvent {
    type: 'Playing';
    content: QueueContent;
}

export interface RemoveQueueContent extends IEvent {
    type: 'RemoveQueueContent';
    queueId: string;
}

export interface UpdateQueueContent extends IEvent {
    type: 'UpdateQueueContent';
    queueId: string;
    content: Partial<QueueContent>;
}

export interface InitQueue extends IEvent {
    type: 'InitQueue';
    playing?: QueueContent;
    content: QueueContent[]
}

export interface Error extends IEvent {
    type: 'error';
    message: string;
    source: Message;
}

let sessionEmitters = new Map<string, Set<IoWrapper>>();

export class IoWrapper {
    io: SocketIO.Socket;
    session: string;
    constructor(io: SocketIO.Socket) {
        this.io = io;
    }

    // todo ref using redis pub/sub
    bindSession = (session: string) => {
        this.session = session;
        let sessions = sessionEmitters.get(session);
        if (!sessions) {
            sessions = new Set();
            sessionEmitters.set(session, sessions);
        }
        sessions.add(this);
    }

    batch = () => {
        return new IoBatch(this);
    }

    emit = (event: Event[] | Event, global?: boolean) => {
        if (!Array.isArray(event)) {
            event = [event];
        }
        if (!event.length) {
            return;
        }
        let m = JSON.stringify({ events: event, session: this.session });
        if (global) {
            for (let e of sessionEmitters.get(this.session).values()) {
                console.warn('emiting[g] to ', this.io.id, m);
                e.io.emit('event', m)
            }
        } else {
            console.warn('emiting to ', this.io.id, m);
            this.io.emit('event', m)
        }
    }
}

export class IoBatch {
    io: IoWrapper;
    events: { event: Event, global?: boolean }[] = [];

    constructor(io: IoWrapper) {
        this.io = io;
    }

    emit = (event: Event, global?: boolean) => {
        this.events.push({ event, global });
    }

    commit = () => {
        this.io.emit(this.events.filter(e => e.global).map(e => e.event), true);
        this.io.emit(this.events.filter(e => !e.global).map(e => e.event), false);
    }

}