var express = require('express');
var router = express.Router();
var util = require("util");
var _ = require("lodash");
var constants = require("../constants");
var utils = require("../utils");
var pollTools = require("../model/polls/pollTools");
var lowDBTools = require("../model/db/lowDBTools");
var upload = require("../model/files/upload").upload;

/* GET home page. */
router.get('/', utils.getConstants, function(req, res, next) {
  res.render('index', req.data);
});

router.get('/addpoll', utils.getConstants, function(req, res, next) {
  res.render('addpoll', req.data);
});

router.get('/poll/:poll_id/:poll_string_id', utils.getConstants, pollTools.preProcessing, pollTools.setPollMapbyId, pollTools.getPollDataById, pollTools.pollToChartData, utils.calculateBarChartData, function(req, res, next) {
  _.assign(req.data, {
    poll_data : req.poll_data, poll_options : req.poll_options
  });
  res.render('poll', req.data);
});

router.get('/polls', utils.getConstants, pollTools.callGetPollsAPI, function(req, res, next) {
  _.assign(req.data, req.responseJson);
  res.render('polls', req.data);
});

router.get('/getActivePolls', utils.getConstants, pollTools.getActivePolls, function (req, res, next) {
  return res.send(req.responseJson);
});

router.get('/getpolls', utils.getConstants, pollTools.getPolls, utils.pollsPageHTMLFetch, function (req, res, next) {
  return res.send(req.responseJson);
});

router.post('/submitvote', utils.saveIP, utils.saveAndGetPollCookie, pollTools.preProcessing, pollTools.setPollMapbyId, pollTools.saveAnswerToPollMap, pollTools.pollToChartData, utils.calculateBarChartData, function(req, res, next) {
  res.send(req.data);
});


router.post('/submitvotecustom', utils.checkParams, utils.authorize, pollTools.preProcessing, pollTools.setPollMapbyId, pollTools.saveAnswerToPollMap, function(req, res, next) {
  res.send(req.data);
});


router.get('/savePollMap', pollTools.triggerDBSave, function (req, res, next) {
  return res.send(req.resJson);
});

router.get('/getdb', lowDBTools.APICallPreProcessing, lowDBTools.getDB, function (req, res, next) {
  return res.send(req.data);
});


router.post('/triggerpolloffline', utils.authorize, pollTools.getPollDataById, pollTools.triggerOfflineFlag, function (req, res, next) {
  return res.send(req.data);
});

router.post('/addpolldb', utils.authorize, pollTools.savePollDataToDB, function (req, res, next) {
  return res.send(req.data);
});
//Add subscriber
router.post('/addsub', lowDBTools.addSubscriber, function (req, res, next) {
  return res.send(req.data);
});

//Save Contact Details
router.post('/addcontactrequest', lowDBTools.addContactRequest, function (req, res, next) {
  return res.send(req.data);
});

router.post('/dbexec', utils.authorize, lowDBTools.dbExec, function (req, res, next) {
  return res.send(req.responseJson);
});

router.get('/polladmin', utils.getConstants, pollTools.getPendingOptionsPolls, pollTools.getPendingPollsHTML, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.render('polladmin', req.responseJson);
});

router.post('/approveoptions', utils.authorize, pollTools.getPollDataById, pollTools.addNewOptions, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.send(req.responseJson);
});

router.post('/addpendingoptions', pollTools.getPollDataById, pollTools.addPendingOptions, pollTools.triggerDBSave, pollTools.removeFromPollMap, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.send(req.responseJson);
});

router.post('/editpollimage', utils.authorize, pollTools.replaceImageURL, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.send(req.responseJson);
});

router.get('/downloaddata', function(req, res){
  const file = constants.DB_ROOT_FILE;
  console.log("Path to download :: ",file);
  res.download(file);
});

router.post('/changeipstatus', utils.authorize, utils.saveIP, function(req, res) {
  pollTools.whiteListIPs[req.user_ip] = !(pollTools.whiteListIPs && pollTools.whiteListIPs[req.user_ip]);
  return res.json({
    "message" : 'IP '+req.user_ip+' status changed.'
  });
});

router.get('/getip', utils.saveIP, function(req, res) {
  let finalJson = {
    'x-forwared-for' : req.headers['x-forwarded-for'],
    'remoteAddress' : req.connection.remoteAddress,
    'x-real-ip' : req.headers['x-real-ip'],
    'ip' : req.ip,
    'user_ip' : req.user_ip,
    'headers' : req.headers,
    'cookies' : req.cookies
  }
  return res.json(finalJson);
});

router.get('/dbinit', function (req, res, next) {
  if (req.query.hash == constants.HASH && req.query.toput) {
    let toPut = {};
    toPut[req.query.toput] = [];
    lowDBTools.db.defaults(toPut)
        .write();
    return res.send('Done');
  }
  return res.send('Invalid HASH');
})

router.get('/pollmap', function (req, res, next) {
  let finalJson = {
    pollMap : pollTools.pollMap, whiteListIPs : pollTools.whiteListIPs
  }
  return res.json(finalJson);
})

router.post('/removeoptions', utils.authorize, pollTools.getPollDataById, pollTools.removeOptions, pollTools.triggerDBSave, pollTools.removeFromPollMap, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.send(req.responseJson);
});

module.exports = router;
