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
    subtitle?: string;
}
export interface QueueContent extends Content {
    user: User;
    queueId: string;
    score: number;
    historical: boolean;
    canSkip?: boolean;
    votes: { user: User, up: boolean }[]
}

export interface QueueContentStored {
    userId: string;
    queueId: string;
    contentId: string;
}