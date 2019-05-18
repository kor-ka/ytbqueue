"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const PORT = process.env.PORT || 5000;
const http_1 = require("http");
const socketIo = require("socket.io");
const SocketListener_1 = require("./src/model/transport/SocketListener");
const bodyParser = require("body-parser");
//
// Configure ws
//
let app = express();
app.use(bodyParser.json());
let server = http_1.createServer(app);
let io = socketIo(server, { transports: ['websocket'] });
if (process.env.REDIS_URL) {
    var redis = require('socket.io-redis');
    // let redsisUrlSplit = process.env.REDIS_URL.split(':');
    // let port = redsisUrlSplit[redsisUrlSplit.length - 1];
    // let host = process.env.REDIS_URL.substr(0, process.env.REDIS_URL.length - (port.length + 1))
    // console.warn('boom', host, port);
    io.adapter(redis({ host: process.env.REDIS_URL }));
}
io.on('connect', (socket) => {
    console.log('Connected client on port %s.', PORT);
    let listener = new SocketListener_1.SocketListener(socket);
    socket.on('disconnect', () => {
        listener.dispose();
    });
});
server.listen(PORT, () => console.log(`lll on ${PORT}`));
