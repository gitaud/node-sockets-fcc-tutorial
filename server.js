'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
// const passport = require('passport');
// const LocalStrategy = require('passport-local');
// const bcrypt = require('bcrypt');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const routes = require('./routes.js');
const auth = require('./auth.js');
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

fccTesting(app); //For FCC testing purposes
app.set('view engine', 'pug');
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  resave: true,
  store: store,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  auth(app, myDataBase);
  routes(app, myDataBase);

  function onAuthorizeSuccess(data, accept) {
    console.log('Successful connection to socket.io');

    accept(null, true);
  }

  function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('Failed connection to socket.io: ', message);
    accept(null, false);
  }

  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );

  let currentUsers = 0;
  io.on('connection', socket => {
    console.log('User ' + socket.request.user.name + ' connected');
    ++currentUsers; 
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers: currentUsers,
      connected: true
    });
    socket.on('disconnect', () => {
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers: currentUsers,
        connected: false
      });
    });
    socket.on('chat message', message => {
      io.emit('chat message', {name: socket.request.user.name, message: message})  
    });
  });


}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: e,
      message: 'Unable to login'
    });
  });
});
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
