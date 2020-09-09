const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
const request = require("request");
const getURLs = require('get-hrefs');
var Queue = require('better-queue');
var metadata = require("./metaData");
var sqlLiteTools = require("../db/sqlLiteTools");
var tags = require("./tags");
var logger = require("../logs/logger");
var moment = require("moment");
var postDbOps = require("./postDBOps");

var DB;
var POSTS_PROCESSED_SMMRY_API = {};
var POSTS_META_DATA_NOT_FOUND = {};

function queueCb(cb, finalPost) {
    /**
     * Process final post data here [TO TEST PROCESS ALWAYS]
     */
    if ((finalPost.title && finalPost.content && finalPost.external_url && DB)) {
        DB.run('INSERT INTO articles (title, content, external_url, meta, created_at) VALUES(?, ?, ?, ?, ?)', finalPost.title, finalPost.content, finalPost.external_url, JSON.stringify(finalPost.metaInfo), new Date(), function (err) {
            if (err) {
                logger.queue.push({
                    key : finalPost.external_url, message : {
                        'DB_SAVE_FAILED' : err
                    }
                });
            }
            logger.queue.push({
                key : finalPost.external_url, message : {
                    'DB_SAVE_SUCCESS_TIME' : utils.getTime()
                }
            });
            tags.tagsQueue.push(finalPost);
        });
    }
    else {
        logger.queue.push({
            key : finalPost.external_url, message : {
                'DB_SAVE_SKIP_POST' : finalPost
            }
        });
    }
    setTimeout(function () {
        return cb();
    }, 10 * 1000)
}
var API_KEY_COUNT = 0;
var COMMON_KEYS_TO_IGNORE = ['fantasy', 'videos', 'video', 'ads', 'googleads', 'adsense', 'terms-conditions', 'contact-us', '/live/', 'galleries', 'india', '-isl-', 'affiliate', 'doubleclick', '-promo', '/promo', 'instagram', 'facebook', 'twitter', 'lifestyle', 'album'];
var scraperConstants = {
    SOURCES : [
        {
            url : 'https://goal.com',
            domain : 'https://goal.com',
            sourceName : 'GOAL',
            keysToHave: [],
            keysToIgnore: COMMON_KEYS_TO_IGNORE,
            refreshInterval : 10 * 60 * 1000,
            minimumLength : 60,
            active : false
        },
        {
            url : 'https://www.espn.in/football/',
            domain : 'https://www.espn.in',
            sourceName : 'ESPN',
            keysToHave: ['football'],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['disney', 'blog']),
            refreshInterval : 10 * 60 * 1000,
            minimumLength : 60,
            metaDataFunction : metadata.general,
            active : true
        },
        {
            url : 'https://www.marca.com/en/',
            domain : 'https://www.marca.com',
            sourceName : 'MARCA',
            keysToHave: [],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['s_kw']),
            refreshInterval : 15 * 60 * 1000,
            minimumLength : 80,
            metaDataFunction : metadata.general,
            active : true
        },
        {
            url : 'https://www.bbc.co.uk/sport/football',
            domain : 'https://www.bbc.co.uk',
            sourceName : 'BBC',
            keysToHave: ['/sport/football'],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['teams/']),
            refreshInterval : 20 * 60 * 1000,
            minimumLength : 20,
            metaDataFunction : metadata.general,
            active : true,
            expressionMatch : '\\/sport\\/football\\/\\d\\d\\d\\d\\d\\d'
        },
        {
            url : 'https://www.theguardian.com/football',
            domain : 'https://www.theguardian.com',
            sourceName : 'The Guardian',
            keysToHave: ['football'],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['/audio/', 'ng-interactive']),
            refreshInterval : 10 * 60 * 1000,
            minimumLength : 100,
            metaDataFunction : metadata.general,
            active : false
        },
        {
            url : 'https://www.bundesliga.com/en/bundesliga',
            domain : 'https://www.bundesliga.com',
            sourceName : 'Bundesliga',
            keysToHave: ['bundesliga', 'news'],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['/audio/', 'ng-interactive']),
            refreshInterval : 30 * 60 * 1000,
            minimumLength : 70,
            metaDataFunction : metadata.general,
            active : true
        },
        {
            url : 'https://metro.co.uk/sport/football/',
            domain : 'https://metro.co.uk',
            sourceName : 'Metro Sport',
            keysToHave: [],
            keysToIgnore: COMMON_KEYS_TO_IGNORE.concat(['/audio/', 'ng-interactive']),
            refreshInterval : 20 * 60 * 1000,
            minimumLength : 80,
            metaDataFunction : metadata.general,
            active : false
        }
    ]
};

var summaryQueue = new Queue(function (input, cb) {
    let url = input.url;
    let metaInfo = input.metaInfo || {};
    if (!url || !utils.isValidHttpUrl(url)) {
        logger.queue.push({
            key : url, message : {
                'INIT_PROCESS_SKIP' : 'Invalid URL'
            }
        });
        return cb();
    }
    if (POSTS_PROCESSED_SMMRY_API[url]) {
        logger.queue.push({
            key : url, message : {
                'SMMRY_API_SKIP' : 'IN MEMORY FLAG SKIP'
            }
        });
        return cb();
    }
    let summaryOptions = {
        uri : constants.SMMRY_API_URL(url, constants.SMMRY_API_KEY[API_KEY_COUNT]),
        method: 'GET',
        timeout : 30 * 1000
    };
    //API_KEY_COUNT +=10;
    postDbOps.checkIfExistsFromURL(DB, url, function (err, res) {
        if (err) {
            logger.queue.push({
                key : url, message : {
                    'DB_ERR_CHECK_EXIST' : err
                }
            });
            return cb();
        }
        else if (res.count) {
            POSTS_PROCESSED_SMMRY_API[url] = true;
            logger.queue.push({
                key : url, message : {
                    'DB_CHECK_EXIST' : 'Already exists. Skipping.'
                }
            });
            return cb();
        }
        else if (POSTS_PROCESSED_SMMRY_API[url]) {
            logger.queue.push({
                key : url, message : {
                    'SMMRY_API' : 'Already processed once'
                }
            });
            return cb();
        }
        else {
            try {
                logger.queue.push({
                    key : url, message : {
                        'SMMRY_API_KEY' : constants.SMMRY_API_KEY[API_KEY_COUNT]
                    }
                });
                API_KEY_COUNT = (API_KEY_COUNT + 1) % constants.SMMRY_API_KEY.length;
                request(summaryOptions, function (err, res, body) {
                    let response = res ? res.body : '';
                    response = utils.jsonParser(response);
                    if (err) {
                        logger.queue.push({
                            key : url, message : {
                                'SMMRY_ERR_FROM_REQ' : err
                            }
                        });
                        return cb();
                    }
                    if (response.sm_api_error) {
                        logger.queue.push({
                            key : url, message : {
                                'SMMRY_ERR_API' : response.sm_api_message,
                                'SMMRY_API_KEY_COUNT' : API_KEY_COUNT-1
                            }
                        });
                        //response.sm_api_content = 'test';
                    }
                    POSTS_PROCESSED_SMMRY_API[url] = true;
                    let finalPost = {
                        external_url : url
                    };
                    if (response.sm_api_content) {
                        //Store it
                        finalPost.content = response.sm_api_content;
                        finalPost.title = metaInfo.title;
                        finalPost.metaInfo = _.pick(metaInfo, ['image']) || {};
                        finalPost.metaInfo.tags = response.sm_api_keyword_array;
                        queueCb(cb, finalPost);
                    }
                    else {
                        queueCb(cb, finalPost);
                    }
                });
            } catch (e) {
                logger.queue.push({
                    key : url, message : {
                        'SMMRY_QUEUE_EXECUTION_EXCEPTION' : e.message || e
                    }
                });
                util.log('Exception while calling SMMRY API :: ', e);
                return cb();
            }
        }
    });
});

setInterval(function () {
    logger.queue.push({
        key : 'SUMMARY_QUEUE', message : {
            'DATA_IN_QUEUE' : summaryQueue.length
        }
    });
}, 5 * 60 * 1000);


var scraper = {
    initDB : function () {
        sqlLiteTools.initDBTablesAndState(constants.ARTICLES_DB_ROOT_FILE, function (err, db) {
            if (err) {
                util.log('[SCRAPER] DB Init failed');
            }
            else {
                util.log('[SCRAPER] DB Init Successfull');
                postDbOps.DB = db;
                DB = db;
            }
        });
    },
    getHTML : function (options, cb) {
        if (!options.url) {
            options.error = '[GET HTML] No URL Provided';
            return cb();
        }
        let reqOpts = {
            uri : options.url,
            method : 'GET'
        };
        request(reqOpts, function (err, res, body) {
            let response = res ? res.body : '';
            if (err) {
                options.error = '[GET HTML] Error during HTML Request :: ' + err;
                return cb();
            }
            return cb(response);
        });
    },
    getURLsFromSource : function (options, cb) {
        scraper.getHTML(options, function (htmlResponse) {
            if (options.error) {
                util.log('[FETCH FROM SOURCE] Error :: ',options.error);
                return cb();
            }
            if (!htmlResponse) {
                logger.queue.push({
                    key : options.url, message : {
                        'HTML_FETCH_FAILED' : 'No HTML Body'
                    }
                });
                return cb();
            }
            let urlList = getURLs(htmlResponse);
            let finalUrlList = [];
            /**
             * Filter URLs
             */
            let keysToHave = options.keysToHave || [];
            let keysToIgnore = options.keysToIgnore || [];
            let totalUrls = urlList.length;
            let processedUrls = 0;
            _.forEach(urlList, function (url) {
                url = url.toLowerCase();
               //console.log("Url :: ",url," Length :: ",url.length)
                let itHasAll = true;
                _.forEach(keysToHave, function (key) {
                    itHasAll = itHasAll && url.includes(key);
                });
                let itIgnoresAll = true;
                _.forEach(keysToIgnore, function (key) {
                    itIgnoresAll = itIgnoresAll && !url.includes(key);
                });
                if (itHasAll && itIgnoresAll && (_.size(url) > (options.minimumLength || 0))) {
                    if (!url.includes(options.domain) && !url.includes('http')) {
                        url = options.domain + url;
                    }
                    if (options.expressionMatch && !url.match(options.expressionMatch)) {
                        processedUrls++;
                        return;
                    }
                    if (POSTS_PROCESSED_SMMRY_API[url] || POSTS_META_DATA_NOT_FOUND[url]) {
                        processedUrls++;
                        return;
                    }
                    let metaData = {};
                    if (options.metaDataFunction && typeof options.metaDataFunction == "function") {
                        options.metaDataFunction(url, function (err, metaInfo) {
                            processedUrls++;
                            if (err) {
                                logger.queue.push({
                                    key : url, message : {
                                        'META_DATA_SCRAPER' : err
                                    }
                                });
                            }
                            if (metaInfo.image) {
                                metaData.image = metaInfo.image;
                            }
                            if (metaInfo.title) {
                                metaData.title = metaInfo.title;
                            }
                            if (metaInfo.image && metaInfo.title) {
                                finalUrlList.push(url);
                                summaryQueue.push({
                                    url:url,
                                    source: options,
                                    metaInfo : metaData
                                });
                            } else {
                                logger.queue.push({
                                    key : url, message : {
                                        'META_DATA_INFO_MISSING' : metaInfo
                                    }
                                });
                                POSTS_META_DATA_NOT_FOUND[url] = true;
                            }
                        });
                    }
                    else {
                        processedUrls++;
                        logger.queue.push({
                            key : url, message : {
                                'META_DATA_FUNCTION_NOT_FOUND' : 'Pushing to queue without metainfo'
                            }
                        });
                        finalUrlList.push(url);
                        summaryQueue.push({
                            url:url,
                            source: options,
                            metaInfo : metaData
                        });
                    }
                }
            });
            options.finalUrlList = finalUrlList;
            return cb();
        });
    },
    initSources : function () {
        scraper.initDB();
        _.forEach(scraperConstants.SOURCES, function (source) {
            if (!source.active) {
                return;
            }
            if (process.env.NODE_ENV == 'staging') {
                source.refreshInterval = 60 * 1000;
            }
            util.log('[SCRAPER] Initiating source : ',source.sourceName);
            setInterval(function () {
                util.log('[SCRAPER] Fetching source : ',source.sourceName);
                scraper.getURLsFromSource(source, function () {
                    let key = 'URLS_FETCHED';
                    let messageJson = {};
                    messageJson[key] = _.size(source.finalUrlList);
                    // logger.queue.push({
                    //     key : source.sourceName, message : messageJson
                    // });
                });
            }, source.refreshInterval);
        });
    }
};

module.exports = scraper;

(function () {
    if (require.main == module) {
        let options = {
            url : 'https://www.goal.com/en/news/a-death-threat-leaks-eriksen-why-conte-could-leave-inter/e2bjgqqhc8vq1gjgk5pvowz2l',
            keysToHave : ['goal.com'],
            keysToIgnore : ['/team/']
        }
        scraper.getURLsFromSource(scraperConstants.SOURCES[6], ()=>{});
    }
}())