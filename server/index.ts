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

let authorized = async (req: express.Request) => {
  let session = req.params.session;
  if (session) {
    let targetCookie = req.cookies['ytb_queue_token_' + session];
    if (targetCookie) {
      let validToken = (await getTokenFroSession(session)).token;
      console.warn(targetCookie, validToken)
      return validToken === targetCookie;
    }
    return false;
  }
  return true;
}

//
// Configure http
//
let app = express();
app
  .use(bodyParser.json())
  .use(cookieParser())

  .get('/', async (req, res) => {
    res.redirect('/' + pickSession())
  })

  .use(express.static(path.resolve(__dirname + '/../../public')))
  .use("/build", express.static(__dirname + '/../../public/build'))
  .get('/:id', async (req, res) => {
    // authorize first host session
    let token = await getTokenFroSession(req.params.id);
    if (token.new) {
      res.cookie('ytb_queue_token_' + req.params.id, token.token);
    }
    if (!req.cookies.ytb_queue_client) {
      res.cookie('ytb_queue_client', makeid());
    }

    res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
  })

  .post('/api/:session/next', async (req, res) => {
    if (await authorized(req)) {
      res.send('ok')
      console.warn('okkk')
    } else {
      console.warn('no auth')
    }
  });

// app.listen(PORT, () => console.log(`lll on ${PORT}`))


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

