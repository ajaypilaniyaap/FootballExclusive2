var util = require('util');
var utils = require('../../utils');
var constants = require("../../constants");
var _ = require("lodash");
var request = require("request");

var tasks = {
    savePollMap : function () {
        let options = {
            uri : utils.localHostURI() + 'savePollMap',
            method : 'GET'
        };
        util.log("Saving poll map with options ::",options);
        request(options, function (err, res) {
            let response = res ? utils.jsonParser(res.body) : {};
            if (err || response.error) {
                util.log('PollMap To DB SAVE FAILED :: ',(err || response.error));
            }
            util.log("Message from savePollMap ::", response.message);
        });
    },
    init : function () {
        setInterval(tasks.savePollMap, constants.DB_SAVE_INTERVAL_POLLS);
    }
};

module.exports = tasks;