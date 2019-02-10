import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import { pickSession, getTokenFroSession, handleMessage, makeid } from './src/session';
var path = require('path');
const PORT = process.env.PORT || 5000
import { createServer, Server } from 'http';
import * as socketIo from 'socket.io';
import { Message } from './src/model/message';
import { IoWrapper } from './src/model/event';

//
// Configure http
//
let app = express();
app
  .use(bodyParser.json())
  .use(cookieParser())

  .get('/', async (req, res) => {
    let target = pickSession();
    for (let k of Object.keys(req.cookies || {})) {
      if (k.startsWith('ytb_queue_token_')) {
        target = k.replace('ytb_queue_token_', '');
      }
    }
    res.redirect('/' + target)
  })

  .use(express.static(path.resolve(__dirname + '/../../public')))
  .use("/build", express.static(__dirname + '/../../public/build'))
  .get('/:id', async (req, res) => {
    // authorize first host session
    let sessionId = req.params.id.toUpperCase();
    let token = await getTokenFroSession(sessionId);
    if (token.new) {
      res.cookie('ytb_queue_token_' + sessionId, token.token);
    }
    if (!req.cookies.ytb_queue_client) {
      res.cookie('ytb_queue_client', makeid());
    }

    res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
  })

//
// Configure ws
//
let server = createServer(app);
let io = socketIo(server);

io.on('connect', (socket) => {
  console.log('Connected client on port %s.', PORT);
  let wrapper = new IoWrapper(socket);
  socket.on('message', async (m: string) => {
    console.log('[server](message): %s', m);
    if (!m) {
      return;
    }
    let message = JSON.parse(m) as Message
    if (message.session && message.session.id) {
      message.session.id = message.session.id.toUpperCase()
    }
    wrapper.bindSession(message.session.id);
    // todo: validate message
    // check token
    let validToken = (await getTokenFroSession(message.session.id)).token;
    await handleMessage(wrapper, message, validToken === message.session.token);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => console.log(`lll on ${PORT}`))

