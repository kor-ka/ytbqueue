import * as socketIo from 'socket.io';
import { IoWrapper } from '../event';
import { handleMessage as handleMessageSession, getTokenFroSession } from '../../../src/session';
import { Message } from '../message';
import { handleMessageUser } from '../../../src/user';

export class SocketListener {
    socket: socketIo.Socket
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
            wrapper.bindSession(message.session.id);
            // todo: validate message
            // check token
            await handleMessageSession(wrapper, message);
            await handleMessageUser(wrapper, message);
        });
    }

    dispose = () => {
        //
    }
}