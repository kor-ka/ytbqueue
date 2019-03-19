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
const event_1 = require("../transport/event");
const session_1 = require("../../../src/model/session");
const hostRace_1 = require("../../../src/model/hostRace");
const user_1 = require("../../../src/model/user");
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
            let batch = wrapper.batch();
            // todo: validate message
            let handlers = [];
            handlers.push(hostRace_1.handleMessage);
            handlers.push(session_1.handleMessage);
            handlers.push(user_1.handleMessageUser);
            for (let h of handlers) {
                let stop = yield h(batch, message);
                if (stop) {
                    break;
                }
            }
            batch.commit();
        }));
    }
}
exports.SocketListener = SocketListener;
