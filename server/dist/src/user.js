"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const redisUtil_1 = require("./redisUtil");
const session_1 = require("./session");
class User {
}
User.getNewUser = () => __awaiter(this, void 0, void 0, function* () {
    let id = yield redisUtil_1.redisincr('user-id');
    let user = { id: id + '', token: session_1.makeid(), name: 'anon' };
    yield redisUtil_1.redishsetobj('user-' + id, user);
    return user;
});
User.setName = (id, name) => __awaiter(this, void 0, void 0, function* () {
    yield redisUtil_1.redishset('user-' + id, 'name', name);
});
User.getUser = (id) => __awaiter(this, void 0, void 0, function* () {
    let _a = yield redisUtil_1.redishgetall('user-' + id), { token } = _a, user = __rest(_a, ["token"]);
    user.name = user.name || 'someone 🤔';
    return user;
});
User.checkToken = (id, token) => __awaiter(this, void 0, void 0, function* () {
    return (yield redisUtil_1.redishget('user-' + id, 'token')) === token;
});
exports.User = User;
exports.handleMessageUser = (io, message) => __awaiter(this, void 0, void 0, function* () {
    let authorized = message.creds && (yield User.checkToken(message.creds.id, message.creds.token));
    if (!authorized) {
        io.emit({ type: 'error', message: 'not authorized', source: message });
        return;
    }
    if (message.type === 'setName') {
        yield User.setName(message.id, message.name);
        // todo: notify all name updated
    }
});
