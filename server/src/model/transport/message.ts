import { Content, UserCreds } from "../entity";

interface IMessage {
    session?: { id: string, token: string };
    creds?: UserCreds;
    type: string;
}

export type Message =
    // session
    Init | Next | Add | Vote | Skip | Remove | Promote | Progress
    // host race
    | HostPing
    // user
    | SetName;

// session
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

export interface Remove extends IMessage {
    type: 'remove';
    queueId: string;
}

export interface Promote extends IMessage {
    type: 'promite';
    queueId: string;
    up: boolean;
}

export interface Progress extends IMessage {
    type: 'progress';
    queueId: string;
    current: number;
    duration: number;
}

export interface HostPing extends IMessage {
    type: 'hostPing';
}

//user
export interface SetName extends IMessage {
    type: 'setName';
    id: string;
    name: string;
}