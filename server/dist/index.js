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
const event_1 = require("./src/model/event");
let authorized = (req) => __awaiter(this, void 0, void 0, function* () {
    let session = req.params.session;
    if (session) {
        let targetCookie = req.cookies['ytb_queue_token_' + session];
        if (targetCookie) {
            let validToken = (yield session_1.getTokenFroSession(session)).token;
            console.warn(targetCookie, validToken);
            return validToken === targetCookie;
        }
        return false;
    }
    return true;
});
//
// Configure http
//
let app = express();
app
    .use(bodyParser.json())
    .use(cookieParser())
    .get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
    res.redirect('/' + session_1.pickSession());
}))
    .use(express.static(path.resolve(__dirname + '/../../public')))
    .use("/build", express.static(__dirname + '/../../public/build'))
    .get('/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
    // authorize first host session
    let token = yield session_1.getTokenFroSession(req.params.id);
    if (token.new) {
        res.cookie('ytb_queue_token_' + req.params.id, token.token);
    }
    if (!req.cookies.ytb_queue_client) {
        res.cookie('ytb_queue_client', session_1.makeid());
    }
    res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
}))
    .post('/api/:session/next', (req, res) => __awaiter(this, void 0, void 0, function* () {
    if (yield authorized(req)) {
        res.send('ok');
        console.warn('okkk');
    }
    else {
        console.warn('no auth');
    }
}));
// app.listen(PORT, () => console.log(`lll on ${PORT}`))
//
// Configure ws
//
let server = http_1.createServer(app);
let io = socketIo(server);
io.on('connect', (socket) => {
    console.log('Connected client on port %s.', PORT);
    let wrapper = new event_1.IoWrapper(socket);
    socket.on('message', (m) => __awaiter(this, void 0, void 0, function* () {
        console.log('[server](message): %s', m);
        if (!m) {
            return;
        }
        let message = JSON.parse(m);
        wrapper.bindSession(message.session.id);
        // todo: validate message
        // check token
        let validToken = (yield session_1.getTokenFroSession(message.session.id)).token;
        yield session_1.handleMessage(wrapper, message, validToken === message.session.token);
    }));
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});
server.listen(PORT, () => console.log(`lll on ${PORT}`));
