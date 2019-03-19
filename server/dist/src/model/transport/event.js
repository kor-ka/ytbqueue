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
        this.batch = () => {
            return new IoBatch(this);
        };
        this.emit = (event, global) => {
            if (!Array.isArray(event)) {
                event = [event];
            }
            if (!event.length) {
                return;
            }
            let m = JSON.stringify({ events: event, session: this.session });
            if (global) {
                for (let e of sessionEmitters.get(this.session).values()) {
                    console.warn('emiting[g] to ', e.io.id, m);
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
class IoBatch {
    constructor(io) {
        this.events = [];
        this.emit = (event, global) => {
            this.events.push({ event, global });
        };
        this.commit = () => {
            this.io.emit(this.events.filter(e => e.global).map(e => e.event), true);
            this.io.emit(this.events.filter(e => !e.global).map(e => e.event), false);
        };
        this.io = io;
    }
}
exports.IoBatch = IoBatch;
