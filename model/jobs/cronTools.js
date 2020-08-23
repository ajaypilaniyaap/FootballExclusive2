var CronJob = require('cron').CronJob;
var util = require('util');
var utils = require('../../utils');
var constants = require("../../constants");
var lowDBTools = require("../db/lowDBTools");

var cronTools = {
    init : function () {
        util.log("Initiated cron jobs");
        cronTools.jobs = {
            initiated : true
        };
    },
    addJob : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['job_type', 'execution']);
        if (options.error) {
            return cb();
        }
        let jobData = {}
        switch (options.job_type.toUpperCase()) {
            case 'SAVE_POLL_MAP' :
                jobData.task = 'savePollMap';
                jobData.id = new Date();
                jobData.executionType = 'REPEAT';
                jobData.time = constants.DB_SAVE_INTERVAL_POLLS
                break;
            default :
                util.log("No task found for job type : %s", options.job_type);
        }
        switch (jobData.executionType.toUpperCase()) {
            case 'REPEAT':
                jobData.time = jobData.time / 60; //Convert to minutes
                let timeString = util.format('0 */%s * * * *', jobData.time);
                cronTools.insertJobsData(jobData, function (err) {
                    if (err) {
                        return;
                    }
                    cronTools.jobs[jobData.id] = new CronJob(timeString, function() {
                        const d = new Date();
                        console.log('Every Tenth Minute:', d);
                    });
                    cronTools.jobs[jobData.id].start();
                });
                break;
            default :
                util.log("No execution type for job type : %s", options.job_type);
        }
    },
    insertJobsData : function (jobData, cb) {
        let queryOptions = {
            tableName : 'jobs',
            rowToInsert : jobData
        };
        lowDBTools.insert(queryOptions, {}, function () {
            if (queryOptions.error) {
                util.log("Error occured while Inserting job data :: ",utils.logJson(jobData));
            }
            return cb(queryOptions.error);
        });
    }
}
module.exports = cronTools;