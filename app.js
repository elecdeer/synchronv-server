var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var liveRouter = require('./routes/live');

var app = express();


//ポートマッピング
const NatAPI = require("nat-api");
const client = new NatAPI();
client.map(5001, err => {
  if(err){
    return console.log("Error", err);
  }
  console.log(`port ${5001} mapped!`);
});

//グローバルip取得
const fetch = require("node-fetch");
fetch("http://ifconfig.moe/")
  .then(res => res.text())
  .then(body => {
    console.log(body);
  });


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use('/live', liveRouter);

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
