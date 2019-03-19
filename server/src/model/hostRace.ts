import { IoWrapper, IoBatch } from "./transport/event";
import { Message, HostPing } from "./transport/message";
import { getTokenFroSession } from "./session";
import { redisGet, redishset, redisSet, redishget } from "../redisUtil";
import { handleMessage as handleMessageSession } from './session';

export let handleMessage = async (batch: IoBatch, message: Message) => {
    let validToken = (await getTokenFroSession(message.session.id)).token;
    let isHost = message.session.token === validToken;
    let hasFlag = (await redisGet('host_flag_' + message.session.id)) === message.creds.id;

    try {
        await guardHostMessage(batch, message, isHost, hasFlag);
        if (message.type === 'hostPing') {
            await handleHostPing(batch, message, isHost, hasFlag);
        }
    } catch (e) {
        batch.emit({ type: 'error', message: e.message, source: message });
        return true;
    }
    return false;
}

export let setHostFlag = async (sessionId: string, userId: string) => {
    await redisSet('host_flag_' + sessionId, userId);
}

let guardHostMessage = async (io: IoBatch, message: Message, isHost: boolean, hasFlag: boolean) => {
    if (
        (message.type === 'next' || message.type === 'progress') && !(isHost && hasFlag)
    ) {
        if (isHost) {
            // keep rejected value for flag change case
            await redishset('host_rejected_' + message.session.id, message.creds.id, JSON.stringify(message));
        }
        throw new Error('Only active host can emit ' + message.type);
    }
}

let handleHostPing = async (io: IoBatch, message: HostPing, isHost: boolean, hasFlag: boolean) => {
    console.warn('handleHostPing', message.creds.id, hasFlag);
    if (hasFlag) {
        await redisSet('host_flag_ttl_' + message.session.id, (new Date().getTime() + 3000) + '');
    } else {
        let flagTtlStr = await redisGet('host_flag_ttl_' + message.session.id);
        let flagTtl = Number.parseInt(flagTtlStr) || 0;

        console.warn('handleHostPing', new Date().getTime(), flagTtl);
        if (new Date().getTime() > flagTtl) {
            console.warn(message.session.id, message.creds.id, 'flag acquired');
            setHostFlag(message.session.id, message.creds.id);
            let messagestring = await redishget('host_rejected_' + message.session.id, message.creds.id);
            if (messagestring) {
                let message: Message = JSON.parse(messagestring);
                await handleMessageSession(io, message);
            }
        }
    }


}