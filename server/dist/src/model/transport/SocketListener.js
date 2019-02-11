"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = require("../event");
const session_1 = require("../../../src/session");
const user_1 = require("../../../src/user");
class SocketListener {
    constructor(socket) {
        this.dispose = () => {
            //
        };
        this.socket = socket;
        let wrapper = new event_1.IoWrapper(socket);
        socket.on('message', (m) => __awaiter(this, void 0, void 0, function* () {
            console.log('[server](message): %s', m);
            if (!m) {
                return;
            }
            let message = JSON.parse(m);
            if (message.session && message.session.id) {
                message.session.id = message.session.id.toUpperCase();
            }
            wrapper.bindSession(message.session.id);
            // todo: validate message
            // check token
            yield session_1.handleMessage(wrapper, message);
            yield user_1.handleMessageUser(wrapper, message);
        }));
    }
}
exports.SocketListener = SocketListener;
