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
import { SocketListener } from './src/model/transport/SocketListener';
import { User } from './src/user';

const notSoSoon = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 1000);
//
// Configure http
//
let app = express();
app
  .use(bodyParser.json())
  .use(cookieParser())

  .get('/legal/terms-and-conditions', async (req, res) => {
    res.sendFile(path.resolve(__dirname + '/../../public/terms.html'));
  })
  .get('/legal/privacy-policy', async (req, res) => {
    res.sendFile(path.resolve(__dirname + '/../../public/privacy-policy.html'));
  })
  .get('/legal/cookie-policy', async (req, res) => {
    res.sendFile(path.resolve(__dirname + '/../../public/cookie-policy.html'));
  })
  .get('/', async (req, res) => {
    let target = pickSession();
    for (let k of Object.keys(req.cookies || {})) {
      if (k.startsWith('azaza_app_host_')) {
        target = k.replace('azaza_app_host_', '');
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
      res.cookie('azaza_app_host_' + sessionId, token.token, { expires: notSoSoon });
    }
    // authorize client if not
    if (!req.cookies.azaza_app_client) {
      let u = await User.getNewUser();
      res.cookie('azaza_app_client', u.id + '-' + u.token, { expires: notSoSoon });
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
  let listener = new SocketListener(socket);

  socket.on('disconnect', () => {
    listener.dispose();
  });
});

server.listen(PORT, () => console.log(`lll on ${PORT}`))

