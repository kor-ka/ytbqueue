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
const session_1 = require("./session");
const redisUtil_1 = require("../redisUtil");
const session_2 = require("./session");
exports.handleMessage = (batch, message) => __awaiter(this, void 0, void 0, function* () {
    let validToken = (yield session_1.getTokenFroSession(message.session.id)).token;
    let isHost = message.session.token === validToken;
    let hasFlag = (yield redisUtil_1.redisGet('host_flag_' + message.session.id)) === message.creds.id;
    try {
        yield guardHostMessage(batch, message, isHost, hasFlag);
        if (message.type === 'hostPing') {
            yield handleHostPing(batch, message, isHost, hasFlag);
        }
    }
    catch (e) {
        batch.emit({ type: 'error', message: e.message, source: message });
        return true;
    }
    return false;
});
exports.setHostFlag = (sessionId, userId) => __awaiter(this, void 0, void 0, function* () {
    yield redisUtil_1.redisSet('host_flag_' + sessionId, userId);
});
let guardHostMessage = (io, message, isHost, hasFlag) => __awaiter(this, void 0, void 0, function* () {
    if ((message.type === 'next' || message.type === 'progress') && !(isHost && hasFlag)) {
        if (isHost) {
            // keep rejected value for flag change case
            yield redisUtil_1.redishset('host_rejected_' + message.session.id, message.creds.id, JSON.stringify(message));
        }
        throw new Error('Only active host can emit ' + message.type);
    }
});
let handleHostPing = (io, message, isHost, hasFlag) => __awaiter(this, void 0, void 0, function* () {
    console.warn('handleHostPing', message.creds.id, hasFlag);
    // track does session have any active host
    yield redisUtil_1.redisSet('host_latest_ttl_' + message.session.id, (new Date().getTime() + 3000) + '');
    let sendPing = () => {
        io.emit({ type: 'host_ping' }, true);
    };
    if (hasFlag) {
        yield redisUtil_1.redisSet('host_flag_ttl_' + message.session.id, (new Date().getTime() + 3000) + '');
        sendPing();
    }
    else {
        let flagTtlStr = yield redisUtil_1.redisGet('host_flag_ttl_' + message.session.id);
        let flagTtl = Number.parseInt(flagTtlStr) || 0;
        console.warn('handleHostPing', new Date().getTime(), flagTtl);
        if (new Date().getTime() > flagTtl) {
            console.warn(message.session.id, message.creds.id, 'flag acquired');
            exports.setHostFlag(message.session.id, message.creds.id);
            sendPing();
            let messagestring = yield redisUtil_1.redishget('host_rejected_' + message.session.id, message.creds.id);
            if (messagestring) {
                let message = JSON.parse(messagestring);
                yield session_2.handleMessage(io, message);
            }
        }
    }
});
