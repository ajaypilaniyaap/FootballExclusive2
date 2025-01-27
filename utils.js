var util = require("util");
var _ = require("lodash");
var constants = require("./constants");
var moment = require("moment");

var utils = {
    getConstants : function (req, res, next) {
        req.responseJson = req.responseJson || {};
        _.set(req, ['data', 'constants'], _.omit(constants, ['SECRET', 'USERS', 'SMMRY_API_KEY', 'HASH', 'DB_ROOT_FILE', 'DB_ROOT_DIRECTORY', 'ARTICLES_DB_ROOT_FILE', 'ARTICLES_TAG_ROOT_FILE', 'TAG_POST_MAPPING_FILE', 'LOG_FILE']));
        return next();
    },
    checkMandatoryParams : function (options, mandatoryParams) {
        _.forEach(mandatoryParams, function (param) {
            if (!options[param]) {
                util.log('Mandatory Param %s missing',param);
                options.error = util.format('Mandatory Param %s missing',param);
                return;
            }
        });
    },
    logJson : function (json) {
        return JSON.stringify(json, null, "  ");
    },
    saveIP : function (req, res, next) {
        req.user_ip = req.headers['x-real-ip'];
        return next();
    },
    checkParams : function (req, res, next) {
        let prettyKeyMap = {
            'poll_id' : 'Poll ID', 'voteCount' : 'Vote Count', 'secret_key' : 'Secret Key', 'answer' : 'Answer'
        }
        switch (req.url.toLowerCase()) {
            case '/submitvotecustom' :
                ['poll_id', 'voteCount', 'secret_key', 'answer'].forEach(function (key) {
                    let found = req.body[key] || req.query[key]
                    if (!found) {
                        return res.json({
                            message : 'Please provide ' + (prettyKeyMap[key] || key)
                        })
                    }
                });
        }
        return next();
    },
    saveAndGetPollCookie : function (req, res, next) {
        let options = {
            maxAge: constants.POLL_VOTE_COOKIE_TIMEOUT,
            httpOnly: true, // The cookie only accessible by the web server
        }
        let poll_id = req.poll_id || req.body.poll_id || req.query.poll_id;
        if (req.cookies && req.cookies[poll_id]) {
            req.alreadyVoted = true;
        }
        else if (poll_id) {
            res.cookie(poll_id, true, options)
        }
        return next();
    },
    calculateBarChartData : function (req, res, next) {
        let barChartData = {
            chart: {
                type: 'column'
            },
            title: {
                text: _.get(req, ['chartData', 'title'], '')
            },
            subtitle: {
                text: _.get(req, ['chartData', 'subtitle'], '')
            },
            accessibility: {
                announceNewData: {
                    enabled: true
                }
            },
            xAxis: {
                type: 'category'
            },
            yAxis: {
                title: {
                    text: _.get(req, ['chartData', 'Ytitle'], '')
                }

            },
            legend: {
                enabled: false
            },
            plotOptions: {
                series: {
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y:.1f}%'
                    }
                }
            },

            tooltip: {
                headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
                pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
            },

            series: [
                {
                    name: _.get(req, ['chartData', 'series_name'], ''), //votes etc
                    colorByPoint: true,
                    data: _.get(req, ['chartData', 'dataArr'], [])
                }
            ]
        }
        _.set(req, ['data', 'barChartDataPollPage'], barChartData);
        return next();
    },
    exitAndSendMessage : function (message, response) {
        return response.send({
            data : {
                message : message
            }
        });
    },
    authorize : function (req, res, next) {
        let user = req.body.user || req.body.secret_key;
        req.responseJson = req.responseJson || {};
        util.log("[AUTHORIZE] Body :: ",req.body);
        if (!constants.USERS[user]) {
            return res.json({
                message : 'Provide a valid user ID'
            });
        }
        req.user = user;
        return next();
    },
    pollsPageHTMLFetch : function (req, res, next) {
        let html = '';
        req.responseJson.barContainerIDs = [];
        _.forEach(req.responseJson.polls, function (poll, index) {
            html += util.format('<div class="col-md-6 agileits_welcome_grid_left">\n' +
                '            <div class="poll-link-container">\n' +
                '                <a class =\'poll-link\' href="%s"> %s </a>\n' +
                '            </div>\n' +
                '            </div>\n' +
                '        <div class="col-md-6 agileits_welcome_grid_right">\n' +
                '            <figure class="highcharts-figure">\n' +
                '                <div id="container_%s"></div>\n' +
                '            </figure>\n' +
                '        </div>', utils.getPollURL(poll), poll.title, poll.id);
            req.responseJson.barContainerIDs.push(util.format('container_%s', poll.id));
        });
        req.responseJson.pollListHTML = html;
        return next();
    },
    getPollURL : function (poll) {
        return constants.SITE_HOST + '/poll/' + poll.id + '/' + poll.string_id;
    },
    getPostURL : function (post) {
        return constants.SITE_HOST + '/articles/' + post.id + '/' + post.title.replace(/[\W_]+/g,"-");
    },
    jsonParser: function(obj, defaultObj) {

        if (typeof obj === 'string') {
            try { obj = JSON.parse(obj); }
            catch (e) {
                //in case unable to parse set empty ojj to be returned
                obj = {};
                util.log('Failed to parse JSON obj %s with error %s', JSON.stringify(obj), e.message);
            }
        }

        obj = obj || defaultObj;
        return obj;
    },
    localHostURI : function () {
        return util.format('http://localhost:%s/', process.env.PORT || 3000)
    },
    sendToLandingPage : function (req, res, status, message) {
        _.assign(req.data, {
            message : message
        });
        res.status(status);
        return res.render('404', req.data);
    },
    isValidHttpUrl : function (string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    },
    getTime : function () {
        return moment(new Date()).format('DD-MM-YYYY HH:mm:ss');
    },
    getTimeDelim : function () {
        return moment().utcOffset("+05:30").format('DD/MM/YYYY_HH-mm-ss');
    },
    getTimePretty : function () {
        return moment().utcOffset("+05:30").format('DD MMM YYYY HH:mm:ss');
    },
    getKey : function (options, key) {
        return (options[key]) || (options.body && options.body[key]) || (options.query && options.query[key]) || (options.params && options.params[key]);
    }
};

module.exports = utils;