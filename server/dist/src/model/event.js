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
            let m = JSON.stringify(Object.assign({}, event, { session: this.session }));
            if (global) {
                for (let e of sessionEmitters.get(this.session).values()) {
                    console.warn('emiting[g] to ', this.io.id, m);
                    e.io.emit('event', m);
                }
            }
            else {
                console.warn('emiting to ', this.io.id, m);
                this.io.emit('event', m);
            }
        };
        this.io = io;
    }
}
exports.IoWrapper = IoWrapper;
