import { User, Content, QueueContent as QueueContent } from "../entity";
import { Message } from "./message";
import { redissub, redispub } from "../../redisUtil";

interface IEvent {
    session?: string;
    by?: User;
    type: string;
}

export type Event = AddQueueContent | RemoveQueueContent | UpdateQueueContent | InitQueue | Playing | Error | HostPing;

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
    content: QueueContent[];
    hostPingTtl?: string;
}

export interface Error extends IEvent {
    type: 'error';
    message: string;
    source: Message;
}

export interface HostPing extends IEvent {
    type: 'host_ping';
}

export class IoWrapper {
    io: SocketIO.Socket;
    session: string;
    constructor(io: SocketIO.Socket) {
        this.io = io;
    }
    unsubscribe?: () => void = undefined;

    bindSession = async (session: string) => {
        if (this.session !== session) {
            this.session = session;
            if (this.unsubscribe) {
                this.unsubscribe();
            }
            this.unsubscribe = await redissub(session, (message) => {
                this.io.emit('event', message);
            });

        }
        return this.unsubscribe;
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
            redispub(this.session, m)
        } else {
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