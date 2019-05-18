import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import { pickSession, getTokenFroSession, handleMessage, pickId } from './src/model/session';
var path = require('path');
const PORT = process.env.PORT || 5000
import { createServer, Server } from 'http';
import * as socketIo from 'socket.io';
import { SocketListener } from './src/model/transport/SocketListener';
import { User } from './src/model/user';
import * as MobileDetect from 'mobile-detect';
import { setHostFlag } from './src/model/hostRace';

const notSoSoon = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 1000);

//
// Configure http
//
let app = express();
app
  .use(bodyParser.json())
  .use(cookieParser())

  .get('/favicon.ico', async (req, res) => {
    res.sendFile(path.resolve(__dirname + '/../../public/favicon.ico'));
  })
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

    let md = new MobileDetect(req.headers['user-agent'] as string);

    let target = await pickSession();

    if (!md.mobile()) {
      let target = await pickSession();
      for (let k of Object.keys(req.cookies || {})) {
        if (k.startsWith('azaza_app_host_')) {
          target = k.replace('azaza_app_host_', '');
        }
      }
      res.redirect('/' + target)
    } else {
      res.cookie('azaza_app_suggested_session', target);
      res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
    }


  })

  .use(express.static(path.resolve(__dirname + '/../../public')))
  .use("/build", express.static(__dirname + '/../../public/build'))
  .get('/:id', async (req, res) => {
    let sessionId = req.params.id.toUpperCase();
    let token = await getTokenFroSession(sessionId);
    //// authorize first session as host
    // if (token.new) {
    //// authorize non mobile as host
    let md = new MobileDetect(req.headers['user-agent'] as string);

    if (!md.mobile()) {
      res.cookie('azaza_app_host_' + sessionId, token.token, { expires: notSoSoon });
    }
    // authorize client if not
    let uid;
    if (!req.cookies.azaza_app_client) {
      let u = await User.getNewUser();
      res.cookie('azaza_app_client', u.id + '-' + u.token, { expires: notSoSoon });
      uid = u.id;
    } else {
      uid = req.cookies.azaza_app_client.split('-')[0];
    }

    if (token.new) {
      setHostFlag(sessionId, uid)
    }

    res.sendFile(path.resolve(__dirname + '/../../public/index.html'));
  })

//
// Configure ws
//

let server = createServer(app);
let io = socketIo(server, { transports: ['websocket'] });


if (process.env.REDIS_URL) {
  var redis = require('socket.io-redis');
  io.adapter(redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_POST, user: process.env.REDIS_USER, password: process.env.REDIS_PASSWORD }));
}

io.on('connect', (socket) => {
  console.log('Connected client on port %s.', PORT);
  let listener = new SocketListener(socket);

  socket.on('disconnect', () => {
    listener.dispose();
  });
});


server.listen(PORT, () => console.log(`lll on ${PORT}`))

