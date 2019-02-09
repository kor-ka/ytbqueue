"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let sessionEmitters = new Map();
class IoWrapper {
    constructor(io) {
        // todo ref using redis pub/sub
        this.bindSession = (session) => {
            this.session = session;
            let sessions = sessionEmitters.get(session);
            if (!sessions) {
                sessions = new Set();
                sessionEmitters.set(session, sessions);
            }
            sessions.add(this);
        };
        this.emit = (event, global) => {
            if (global) {
                for (let e of sessionEmitters.get(this.session).values()) {
                    e.io.emit('event', JSON.stringify(Object.assign({}, event, { session: this.session })));
                }
            }
            else {
                this.io.emit('event', JSON.stringify(Object.assign({}, event, { session: this.session })));
            }
        };
        this.io = io;
    }
}
exports.IoWrapper = IoWrapper;
