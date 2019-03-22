export interface User {
    id: string;
    name: string;
    token?: string;

}
export interface UserCreds {
    id: string;
    token: string;
}

export interface Content {
    id: string;
    title: string;
    thumb?: { url: string, width: number, height: number };
    subtitle?: string;
}
export interface QueueContent extends Content {
    user: User;
    queueId: string;
    score: number;
    historical: boolean;
    canSkip?: boolean;
    votes: { user: User, up: boolean }[]
    progress?: number;
    current?: number;
    duration?: number;
}

export interface QueueContentStored {
    userId: string;
    queueId: string;
    contentId: string;
    progress?: string;
    current?: string;
    duration?: string;
}