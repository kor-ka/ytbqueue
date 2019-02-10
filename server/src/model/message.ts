import { Content } from "./entity";

interface IMessage {
    session?: { id: string, token: string };
    clientId?: string;
    type: string;
}

export type Message = Init | Next | Add | Vote | Skip | Promote;

export interface Init extends IMessage {
    type: 'init';
}

export interface Next extends IMessage {
    type: 'next';
    queueId: string;
}

export interface Add extends IMessage {
    type: 'add';
    content: Content
}

export interface Vote extends IMessage {
    type: 'vote';
    queueId: string;
    up: boolean;
}

export interface Skip extends IMessage {
    type: 'skip';
    queueId: string;
}

export interface Promote extends IMessage {
    type: 'promite';
    queueId: string;
    up: boolean;
}
