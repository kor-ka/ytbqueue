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
const redisUtil_1 = require("../../redisUtil");
class IoWrapper {
    constructor(io) {
        this.unsubscribe = undefined;
        this.bindSession = (session) => __awaiter(this, void 0, void 0, function* () {
            if (this.session !== session) {
                this.session = session;
                if (this.unsubscribe) {
                    this.unsubscribe();
                }
                this.unsubscribe = yield redisUtil_1.redissub(session, (message) => {
                    this.io.emit('event', message);
                });
            }
            return this.unsubscribe;
        });
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
                redisUtil_1.redispub(this.session, m);
            }
            else {
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
