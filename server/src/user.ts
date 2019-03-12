import { rediszincr, redisincr, redishsetobj, redishset, redishget, redishgetall } from "./redisUtil";
import { pickId } from "./session";
import { User as IUser } from "./model/entity";
import { IoWrapper } from "./model/event";
import { Message } from "./model/message";

export class User {
    static getNewUser = async () => {
        let id = await redisincr('user-id');
        let user: IUser = { id: id + '', token: await pickId('user'), name: 'anon' };
        await redishsetobj('user-' + id, user);
        return user;
    }

    static setName = async (id: string, name: string) => {
        await redishset('user-' + id, 'name', name);
    }

    static getUser = async (id: string) => {
        let { token, ...user } = await redishgetall('user-' + id);
        user.name = user.name || 'someone 🤔'
        return user as any as IUser;
    }

    static checkToken = async (id: string, token: string) => {
        return (await redishget('user-' + id, 'token')) === token;
    }
}

export let handleMessageUser = async (io: IoWrapper, message: Message) => {
    let authorized = message.creds && await User.checkToken(message.creds.id, message.creds.token);
    if (!authorized) {
        io.emit({ type: 'error', message: 'not authorized', source: message });
        return;
    }

    if (message.type === 'setName') {
        await User.setName(message.id, message.name)
        // todo: notify all name updated
    }
}