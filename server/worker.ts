import * as express from 'express';
const PORT = process.env.PORT || 5000
import { createServer } from 'http';
import * as socketIo from 'socket.io';
import { SocketListener } from './src/model/transport/SocketListener';
import bodyParser = require('body-parser');

//
// Configure ws
//
let app = express();
app.use(bodyParser.json())

let server = createServer(app);
let io = socketIo(server, { transports: ['websocket'] });

io.on('connect', (socket) => {
  console.log('Connected client on port %s.', PORT);
  let listener = new SocketListener(socket);

  socket.on('disconnect', () => {
    listener.dispose();
  });
});

server.listen(PORT, () => console.log(`lll on ${PORT}`))

