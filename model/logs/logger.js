var util = require('util');
var utils = require("../../utils");
var constants = require("../../constants");
var _ = require("lodash");
var fs = require("fs");

var MIN_LENGTH_QUEUE = 10;
var WRITE_INTERVAL = 30 * 1000;

var logger = {
    final_queue : [],
    queue : {
        push : function (input) {
            input.time_stamp = utils.getTime();
            if (input.message) {
                _.forEach(_.keys(input.message), function (key) {
                    let value = input.message[key];
                    delete input.message[key];
                    key = key + '_' + utils.getTimePretty();
                    input.message[key] = value;
                });
            }
            logger.final_queue.push(input);
        }
    },
    logData : function (inputs) {
        try {
            let path = constants.LOG_FILE;
            let logs = JSON.parse(fs.readFileSync(path));
            _.forEach(inputs, function (input) {
                if (input.key && input.message && typeof input.message == "object") {
                    logs[input.key] = logs[input.key] || {};
                    _.assign(logs[input.key], input.message);
                    //_.assign(logs[input.key], {time:input.time_stamp});
                    if (utils.isValidHttpUrl(input.key)) {
                        _.assign(logs[input.key], {POST_DATA:constants.SITE_HOST + '/articles/postby?external_url='+input.key});
                    }
                }
            });
            fs.writeFileSync(path, JSON.stringify(logs));
        } catch (e) {
            util.log('[LOGGER] Error while writing logs : ', e);
        }
    },
    init : function () {
        util.log('[INIT] Logger...')
        setInterval(function () {
            if (_.size(logger.final_queue) > MIN_LENGTH_QUEUE) {
                logger.logData(_.cloneDeep(logger.final_queue));
                logger.final_queue = [];
            }
        }, WRITE_INTERVAL)
    }
}

module.exports = logger;