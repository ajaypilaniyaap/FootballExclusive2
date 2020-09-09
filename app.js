var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var util = require("util");
var pollTools = require("./model/polls/pollTools");
var tasks = require("./model/jobs/tasks");
var lowDBTools = require("./model/db/lowDBTools");
var scraper = require("./model/posts/scraper");
var loggerTool = require("./model/logs/logger");
var constants = require("./constants");
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var articlesRouter = require('./routes/articles');
var app = express();

pollTools.intializePollMap();

lowDBTools.init(function () {
  util.log("Low DB Initiated Succesfully");
});

tasks.init();

loggerTool.init();

scraper.initSources();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/articles', articlesRouter);

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
