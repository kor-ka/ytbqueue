"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const PORT = process.env.PORT || 5000;
const http_1 = require("http");
const socketIo = require("socket.io");
const SocketListener_1 = require("./src/model/transport/SocketListener");
//
// Configure ws
//
let app = express();
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
