const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

var session = require('express-session');
const uuid = require('uuid');


const indexRouter = require('./routes/index');
const usersApiRouter = require('./routes/users_api');


const app = express();

//Body Parser
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//session
const sessionMiddleware = session({
  secret: uuid.v4().split('-').join(''),
  resave: false,
  saveUninitialized: false,
  cookie:{
  httpOnly: true,
  secure: false,
  maxage: 1000 * 60 * 30
  }
});
global.session = sessionMiddleware;
app.use(sessionMiddleware); 

//ポートマッピング
/*
const NatAPI = require("nat-api");
const client = new NatAPI({
  ttl: 1200,
  autoUpdate: true,
});

const openPort = (port) => {
  client.map(port, port, err => {
    if(err){
      console.log("Error", err);
      return;
    }
    console.log(`port ${port} mapped!`);
  });
}
*/

process.on("exit", function() {
  console.log("Exitting...");
  //client.destroy();
  //console.log("port client destroy!");
})
process.on("SIGINT", function () {
  process.exit(0);
});



//openPort(3000);
//openPort(5001);

//グローバルip取得
// const fetch = require("node-fetch");
// fetch("http://ifconfig.moe/")
//   .then(res => res.text())
//   .then(body => {
//     console.log(body);
//   });
/*
client.externalIp((err, ip) => {
  if(err){
    return console.log("Error", err);
  }
  console.log(ip);
})
*/

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/users', usersApiRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
