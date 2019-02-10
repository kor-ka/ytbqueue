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

    emit = (event: Event, global?: boolean) => {
        if (global) {
            for (let e of sessionEmitters.get(this.session).values()) {
                e.io.emit('event', JSON.stringify({ ...event, session: this.session }))
            }
        } else {
            this.io.emit('event', JSON.stringify({ ...event, session: this.session }))
        }
    }
}