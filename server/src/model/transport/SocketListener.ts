import * as socketIo from 'socket.io';
import { IoWrapper, IoBatch } from '../transport/event';
import { handleMessage as handleMessageSession } from '../../../src/model/session';
import { handleMessage as handleMessageHostRace } from '../../../src/model/hostRace';
import { Message } from '../transport/message';
import { handleMessageUser } from '../../../src/model/user';

export class SocketListener {
    socket: socketIo.Socket
    subscriptionDispose?: () => void = undefined;
    constructor(socket: socketIo.Socket) {
        this.socket = socket;

        let wrapper = new IoWrapper(socket);
        socket.on('message', async (m: string) => {
            console.log('[server](message): %s', m);
            if (!m) {
                return;
            }
            let message = JSON.parse(m) as Message
            if (message.session && message.session.id) {
                message.session.id = message.session.id.toUpperCase()
            }
            this.subscriptionDispose = await wrapper.bindSession(message.session.id);

            let batch = wrapper.batch();
            // todo: validate message

            let handlers: ((batch: IoBatch, message: Message) => Promise<boolean>)[] = []

            handlers.push(handleMessageHostRace);
            handlers.push(handleMessageSession);
            handlers.push(handleMessageUser);

            for (let h of handlers) {
                let stop = await h(batch, message);
                if (stop) {
                    break;
                }
            }

            batch.commit();
        });
    }

    dispose = async () => {
        if (this.subscriptionDispose) {
            await this.subscriptionDispose();
        }
    }
}