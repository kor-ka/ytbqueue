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
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session_1 = require("./src/session");
var path = require('path');
const PORT = process.env.PORT || 5000;
const http_1 = require("http");
const socketIo = require("socket.io");
const SocketListener_1 = require("./src/model/transport/SocketListener");
const user_1 = require("./src/user");
const notSoSoon = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 1000);
//
// Configure http
//
let app = express();
app
    .use(bodyParser.json())
    .use(cookieParser())
    .get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
    let target = session_1.pickSession();
    for (let k of Object.keys(req.cookies || {})) {
        if (k.startsWith('azaza_app_host_')) {
            target = k.replace('azaza_app_host_', '');
        }
    }
    res.redirect('/' + target);
}))
    .use(express.static(path.resolve(__dirname + '/../../public')))
    .use("/build", express.static(__dirname + '/../../public/build'))
    .get('/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
    // authorize first host session
    let sessionId = req.params.id.toUpperCase();
    let token = yield session_1.getTokenFroSession(sessionId);
    if (token.new) {
        res.cookie('azaza_app_host_' + sessionId, token.token, { expires: notSoSoon });
    }
    // authorize client if not
    if (!req.cookies.azaza_app_client) {
        let u = yield user_1.User.getNewUser();
        res.cookie('azaza_app_client', u.id + '-' + u.token, { expires: notSoSoon });
    }
    res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
}));
//
// Configure ws
//
let server = http_1.createServer(app);
let io = socketIo(server);
io.on('connect', (socket) => {
    console.log('Connected client on port %s.', PORT);
    let listener = new SocketListener_1.SocketListener(socket);
    socket.on('disconnect', () => {
        listener.dispose();
    });
});
server.listen(PORT, () => console.log(`lll on ${PORT}`));
