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

router.post('/submitvote', utils.saveIP, pollTools.preProcessing, pollTools.setPollMapbyId, pollTools.saveAnswerToPollMap, pollTools.pollToChartData, utils.calculateBarChartData, function(req, res, next) {
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

router.post('/addpendingoptions', pollTools.getPollDataById, pollTools.addPendingOptions, function (req, res, next) {
  _.assign(req.responseJson, req.data);
  return res.send(req.responseJson);
});

router.get('/downloaddata', function(req, res){
  const file = constants.DB_ROOT_FILE;
  console.log("Path to download :: ",file);
  res.download(file);
});

router.get('/whitelistip', utils.saveIP, function(req, res){
  pollTools.whiteListIPs[req.ip] = true;
  return res.json({
    "message" : 'IP '+req.ip+' whitelisted'
  });
});

router.get('/dbinit', function (req, res, next) {
  if (req.query.hash == constants.HASH) {
    lowDBTools.db.defaults({ polls: [], subscribers : [], jobs:[], contact_requests : [] })
        .write();
    return res.send('Done');
  }
  return res.send('Invalid HASH');
})

module.exports = router;
