var util = require("util");
var _ = require("lodash");
var constants = require("../../constants");
var utils = require("../../utils");
var lowDBTools = require("../db/lowDBTools");
var async = require("async");
var request = require("request");

/**
 * We will save all poll results in memory and after a specific interval we will write them to DB.
 */
var pollTools = {
    intializePollMap : function () {
        pollTools.pollMap = pollTools.pollMap || {};
        pollTools.whiteListIPs = {};
    },
    saveAnswerToPollMap : function (req, res, next) {
        let poll_id = req.poll_id;
        let answer = req.body.answer;
        let ip = req.ip;

        if (ip) {
            util.log("Ip :: ",ip);
            if (!pollTools.whiteListIPs[ip] && _.get(pollTools, ['pollMap', poll_id, 'IP_LIST', ip])) {
                _.set(req, 'data.message', 'We have already received a vote from your sytem for this poll! You can vote again after 24 hours.');
                return next();
            }
            _.set(pollTools, ['pollMap', poll_id, 'IP_LIST', ip], true);
        }

        if (pollTools.pollMap[poll_id] && pollTools.pollMap[poll_id].offline) {
            _.set(req, 'data.message', 'Voting for this poll has been closed.');
            return next();
        }

        util.log("Casting vote, poll id : %s, answer : %s", poll_id, answer);
        _.set(req, 'data.message', 'Your vote has been recorded!');
        _.set(pollTools, ['pollMap', poll_id, 'answersData', answer], _.get(pollTools, ['pollMap', poll_id, 'answersData', String(answer)], 0) + 1);

        return next();
    },
    /**
     * This function will check if we have data in poll map, if not then it will initiate the data in poll map
     */
    setPollMapbyId : function (req, res, next) {
        let poll_id = req.poll_id;
        let poll_data = pollTools.pollMap[poll_id];
        if (poll_data) {
            return next(); //This means we have received the data in map
        }
        /**
         * If data not found we need to fetch it from DB
         */
        let queryOptions = {
            tableName : 'polls', whereClause : {id : Number(poll_id)}
        };
        lowDBTools.get(queryOptions, {}, function () {
            req.poll_data = queryOptions.results && queryOptions.results[0];
            /**
             * Now set the data in pollMap
             */
            req.poll_options = _.keys(_.get(req, ['poll_data', 'options']));
            if (!pollTools.pollMap[poll_id]) {
                pollTools.pollMap[poll_id] = {};
            }
            pollTools.pollMap[poll_id].answersData = {};
            _.forEach(req.poll_options, function (option) {
                _.set(pollTools, ['pollMap', poll_id, 'answersData', option], _.get(req, ['poll_data', 'options', option, 'votes'], 0));
            });
            _.set(pollTools, ['pollMap', poll_id, 'offline'], req.poll_data && req.poll_data.offline);
            _.set(pollTools, ['pollMap', poll_id, 'poll_options'], req.poll_options);
            return next();
        });
    },
    pollToChartData : function (req, res, next) {
        let poll_id = req.poll_id;
        let pollData = _.cloneDeep(_.get(pollTools, ['pollMap', poll_id, 'answersData'], {}));
        let poll_options = _.get(pollTools, ['pollMap', poll_id, 'poll_options'], []);
        pollData['voteShare'] = {};
        let totalVotes= 0;
        _.forEach(poll_options, function (answer) {
            totalVotes += pollData[answer];
        });
        util.log("Total Votes for id : %s are %s", poll_id, totalVotes);
        _.forEach(poll_options, function (answer) {
            let share = (pollData[answer] / totalVotes) * 100;
            pollData['voteShare'][answer] = Math.round(share * Math.pow(10, 2)) / Math.pow(10, 2);
        });
        /**
         * At this point we have vote shares. We will now convert them to Chart Data
         */
        let chartDataArr = [];
        _.forEach(poll_options, function (answer) {
            chartDataArr.push({
                name: answer,
                y: pollData['voteShare'][answer],
                drilldown: answer
            });
        });
        /**
         * Set chart specific data in req.chartData
         */
        req.chartData = {
            dataArr : chartDataArr, Ytitle : 'Votes Percentage', series_tile : 'Votes'
        };
        return next();
    },
    /**
     * Send poll data in req.pollData (as received from DB) and it will return chartData in req.chartData
     */
    pollDataToChartData : function (req, res, next) {
        let pollData = req.pollData;
        let poll_options = _.keys(pollData.options);
        pollData['voteShare'] = {};
        let totalVotes= 0;
        _.forEach(poll_options, function (answer) {
            totalVotes += pollData.options[answer].votes;
        });
        _.forEach(poll_options, function (answer) {
            let share = (pollData.options[answer].votes / totalVotes) * 100;
            pollData['voteShare'][answer] = Math.round(share * Math.pow(10, 2)) / Math.pow(10, 2);
        });
        /**
         * At this point we have vote shares. We will now convert them to Chart Data
         */
        let chartDataArr = [];
        _.forEach(poll_options, function (answer) {
            chartDataArr.push({
                name: answer,
                y: pollData['voteShare'][answer],
                drilldown: answer
            });
        });
        /**
         * Set chart specific data in req.chartData
         */
        req.chartData = {
            dataArr : chartDataArr, Ytitle : 'Votes Percentage', series_tile : 'Votes'
        };
        return next();
    },
    getPollDataById : function (req, res, next) {
        let poll_id = req.poll_id || req.body.poll_id || req.query.poll_id;
        if (!Number(poll_id)) {
            return res.json({
                message : 'Please provide a valid poll ID.'
            })
        }
        let queryOptions = {
            tableName : 'polls', whereClause : {id : Number(poll_id)}
        };
        lowDBTools.get(queryOptions, {}, function () {
            req.poll_data = queryOptions.results && queryOptions.results[0];
            if (_.isEmpty(req.poll_data)) {
                _.assign(req.data, {message: constants.ERROR_404});
                res.status(404);
                return res.render('404', req.data);
            }
            req.poll_options = _.keys(_.get(req, ['poll_data', 'options']));
            return next();
        });
    },
    preProcessing : function (req, res, next) {
        let poll_id = _.get(req, ['params', 'poll_id'], _.get(req, ['body', 'poll_id'], _.get(req, ['query', 'poll_id'])));
        if (!poll_id) {
            req.error = 'Poll Id Not Found';
        }
        req.poll_id = Number(poll_id);
        if (req.error) {
            _.assign(req.data, {message: req.error});
            res.status(404);
            return res.render('404', req.data);
        }
        return next();
    },
    /**
     * This function when called will be saving data to DB after specific time
     */
    triggerDBSave : function (req, res, next) {
        let pollMap = pollTools.pollMap;
        let poll_ids = _.keys(pollMap);
        /**
         * For every poll id we need to save data
         */
        async.eachLimit(poll_ids, 1, saveFromMapToDB, function (err) {
            util.log("Updated poll ids :: ",String(poll_ids));
            req.resJson = {
                error : req.error, message : req.message
            }
            if (next) {
                return next();
            }
        });
        function saveFromMapToDB(poll_id, cb) {
            /**
             * First we need to get options stored in DB
             */
            util.log("Saving to db for poll_id = %s", poll_id);
            let selectQueryOptions = {
                whereClause : {id : Number(poll_id)}, tableName : 'polls'
            };
            lowDBTools.get(selectQueryOptions, {}, function () {
                if (selectQueryOptions.error) {
                    util.log('Error returned by get query :: ',options.error);
                    return cb();
                }
                let result = selectQueryOptions.results && selectQueryOptions.results[0];
                if (!result) {
                    util.log('Error : No result found for given poll id');
                    return cb();
                }
                let dbPollOptions = result.options;
                let pollMapOptions = pollMap[poll_id]['poll_options'] || [];
                _.forEach(pollMapOptions, function (option) {
                    _.set(dbPollOptions, [option, 'votes'], Number(_.get(pollMap, [poll_id, 'answersData', String(option)])));
                });
                let updateQueryOptions = {
                    whereClause : selectQueryOptions.whereClause,
                    tableName : selectQueryOptions.tableName,
                    updateJson: {options : dbPollOptions}
                }
                lowDBTools.updateBulk(updateQueryOptions, {}, function () {
                    if (updateQueryOptions.error) {
                        util.log('Error returned by update query :: ',options.error);
                        return cb();
                    }
                    req.message = 'Data has been updated successfully';
                    return cb();
                });
            })
        }
    },
    savePollDataToDB : function (req, res, next) {
        let body = req.body || {};
        if (!body.title) {
            return res.json({
                message : 'Provide a valid poll title/question.'
            });
        }

        if (!body.options) {
            return res.json({
                message : 'Provide comma seperated options.'
            });
        }
        let poll_options = body.options.split(",");
        let finalOptions = {};
        _.forEach(poll_options, function (option) {
            option = option.trim();
            _.set(finalOptions, [option, 'votes'], 0);
        })
        let pollRow = {
            title : body.title,
            options : finalOptions,
            string_id : body.title.replace(/[\W_]+/g,"-"),
            id : Date.now(),
            ...(body.poll_image && {image : body.poll_image})
        };
        let insertOptions = {
            tableName : 'polls', rowToInsert : pollRow
        };
        lowDBTools.insert(insertOptions, {}, function () {
            if (insertOptions.error){
                return res.json({
                    message : insertOptions.error
                });
            }
            return res.json({
                message : util.format("Your poll has been saved succesfully."),
                poll_link : util.format('%s/poll/%s/%s',constants.SITE_HOST, pollRow.id, pollRow.string_id),
                success : true
            });
        });
    },
    /**
     * This function will fetch the polls data only from pollsmap
     */
    getActivePolls : function (req, res, next) {
        let poll_ids = _.keys(pollTools.pollMap).map(function (elem) {
            return Number(elem);
        });
        req.pollsArray = [];
        req.responseJson = {};
        let queryOptions = {
            tableName : 'polls',
            whereClause : (row) => {return poll_ids.indexOf(row.id) > -1 ? true : false;}
        }
        lowDBTools.get(queryOptions, {}, function () {
            if (queryOptions.error) {
                util.log("Error in active polls get call :: ",queryOptions.error);
                req.responseJson.error = queryOptions.error;
                return next();
            }
            Array.prototype.push.apply(req.pollsArray, queryOptions.results);
            req.responseJson.polls = req.pollsArray;
            return next();
        });
    },
    getPolls : function (req, res, next) {
        let page = Number(req.query.page || req.body.page || 1) || 1;
        let offset = (page - 1) * constants.ITEMS_PER_PAGE.POLLS;
        let limit = offset + constants.ITEMS_PER_PAGE.POLLS;
        req.pollsArray = [];
        req.responseJson = {};
        let queryOptions = {
            tableName : 'polls',
            whereClause : (row) => {return true}
        }
        lowDBTools.get(queryOptions, {}, function () {
            if (queryOptions.error) {
                util.log("Error in active polls get call :: ",queryOptions.error);
                req.responseJson.error = queryOptions.error;
                return next();
            }
            let pollsReceived = _.cloneDeep(queryOptions.results);
            Array.prototype.push.apply(req.pollsArray, _.slice(pollsReceived, offset, limit));
            req.pollsArray.sort(function (a,b) {
                return b.id-a.id;
            });
            /**
             * Get Chart Data
             */
            _.forEach(req.pollsArray, function (poll) {
                let options = {
                    pollData : poll
                };
                pollTools.pollDataToChartData(options, {}, function () {
                    utils.calculateBarChartData(options, {}, function () {
                        poll.barChartData = options.data.barChartDataPollPage;
                    });
                });
            });
            req.responseJson.polls = req.pollsArray;
            req.responseJson.page = page;
            if (_.isEmpty(req.responseJson.polls)) {
                req.responseJson.error = 'There is nothing more to see here folks. Move along!'
            }
            return next();
        });
    },
    callGetPollsAPI : function (req, res, next) {
        let options = {
            uri : utils.localHostURI() + 'getpolls',
            json : req.query || req.body,
            method : 'GET'
        };
        request(options, function (err, resp) {
            let error = err || _.get(resp, ['body', 'error']);
            if (error) {
                util.log("Error while called api to get polls :: ",error);
                _.assign(req.data, {
                    message : 'There are no polls to see. Try again later.',
                    polls : []
                });
                res.status(404);
                return res.render('404', req.data);
            }
            req.responseJson = utils.jsonParser(resp.body);
            if (req.responseJson.polls.length == 0) {
                req.responseJson.error = 'There is nothing more to see here folks! Move along.';
                return res.json(req.responseJson);
            }
            return next();
        });
    },
    getPendingOptionsPolls : function (req, res, next) {
        let queryOptions = {
            tableName : 'polls',
            whereClause : (row) => {return row.pendingoptions && row.pendingoptions.length}
        }
        req.responseJson = {}
        lowDBTools.get(queryOptions, {}, function () {
            if (queryOptions.error) {
                util.log("Error in active polls get call :: ", queryOptions.error);
                req.responseJson.error = 'Some error has occured. Try again in a few moments.';
                return next();
            }
            let pollsReceived = _.cloneDeep(queryOptions.results);
            pollsReceived.sort(function (a,b) {
                return b.id-a.id;
            });
            req.responseJson.polls = pollsReceived;
            return next();
        });
    },
    getPendingPollsHTML : function (req, res, next) {
        let polls = req.responseJson.polls;
        let html = '';

        let pollIDMap = {};
        _.forEach(polls, function (poll) {
            /**
             * For each poll we will add the link of poll, an input box of pending options and submit button.
             */
            html += util.format("<a href='%s' target='_blank' class='link-medium'>%s</a>", utils.getPollURL(poll), poll.title);
            html += util.format('<input type="text" style="margin-top: 2%" name = "pending_options_%s" value="%s">', poll.id, String(poll.pendingoptions));
            html += util.format('<input type="submit" class="pending-submit" id="%s" value="ADD">', poll.id);
            html += util.format('<br/><img src="/images/loading.gif" id="loader_%s" style="display: none"><img>', poll.id);
            html += util.format('<div id="message_%s" style="margin-top: 10px;"></div><br/>', poll.id);
        });
        if (html == '') {
            html = "<h1> NO DATA FOUND FOR PENDING POLLS</h1>";
        }
        //html = "<input type=\"text\" style=\"margin-top: 2%\" name = \"secretkey\" placeholder=\"Enter your secret key before taking any action\"><br/>" + html;
        req.responseJson.html = html;
        return next();
    },
    addNewOptions : function (req, res, next) {
        let optionsToAdd = req.body.optionsToAdd || '';
        let poll_id = req.poll_id || req.body.poll_id;
        optionsToAdd = optionsToAdd.split(",") || [];
        let finalOptions = _.get(req, ['poll_data', 'options']);
        req.responseJson = {};
        _.forEach(optionsToAdd, function (option) {
            option = option.trim();
            _.set(finalOptions, [option, 'votes'], 0);
        });
        let updateOptions = {
            tableName : 'polls', whereClause : {id : Number(poll_id)}, updateJson: {options : finalOptions, pendingoptions : []}
        };
        lowDBTools.updateBulk(updateOptions, {}, function () {
            if (updateOptions.error) {
                util.log("Error in updating add new options :: ", updateOptions.error);
                req.responseJson.message = 'Some error has occured. Try again in a few moments.';
                return next();
            }
            req.responseJson.message = 'New options have been added to the poll successfully.';
            req.responseJson.success = true;
            /**
             * Add relavant data in poll map also
             */
            let pollMapData = pollTools.pollMap[poll_id];
            if (pollMapData) {
                _.forEach(optionsToAdd, function (option) {
                    _.set(pollTools, ['pollMap', poll_id, 'answersData', option], _.get(req, ['poll_data', 'options', option, 'votes'], 0));
                });
                _.set(pollTools, ['pollMap', poll_id, 'poll_options'], _.get(pollTools, ['pollMap', poll_id, 'poll_options']).concat(optionsToAdd));
            }
            return next();
        });
    },
    addPendingOptions : function (req, res, next) {
        let optionsToAdd = req.body.optionsToAdd || '';
        let poll_id = req.poll_id || req.body.poll_id;
        let currentPendingOptions = req.poll_data.pendingoptions || [];
        optionsToAdd = optionsToAdd.split(",") || [];
        req.responseJson = {};
        _.forEach(optionsToAdd, function (option) {
            option = option.trim();
        });
        currentPendingOptions = currentPendingOptions.concat(optionsToAdd);
        let updateOptions = {
            tableName : 'polls', whereClause : {id : Number(poll_id)}, updateJson: {pendingoptions : currentPendingOptions}
        };
        lowDBTools.updateBulk(updateOptions, {}, function () {
            if (updateOptions.error) {
                util.log("Error in updating add new options :: ", updateOptions.error);
                req.responseJson.message = 'Some error has occured. Try again in a few moments.';
                return next();
            }
            req.responseJson.message = 'New options have been added to the poll successfully. Once admin approves them they will appear here.';
            req.responseJson.success = true;
            return next();
        });
    },
    triggerOfflineFlag : function (req, res, next) {
        let offline = !req.poll_data.offline;
        let poll_id = req.poll_id || req.body.poll_id || req.query.poll_id;
        _.set(pollTools, ['pollMap', poll_id, 'offline'], offline);
        let updateQueryOptions = {
            tableName : 'polls', whereClause : {id : Number(poll_id)}, updateJson : {offline : offline}
        }
        lowDBTools.updateBulk(updateQueryOptions, {}, function () {
            if (updateQueryOptions.error) {
                util.log('Error occured while triggering db save :: ',updateQueryOptions.error);
                return res.json({
                    message : 'Some error occured. Please try again later.'
                });
            }
            return res.json({
                message : 'Operation successfull!'
            });
        });
    }
};

module.exports = pollTools;