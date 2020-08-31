const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
var sqlLiteTools = require("../db/sqlLiteTools");
var cache = require('memory-cache');

var postsDBOps = {
    initDB : function (cb) {
        if (postsDBOps.DB) {
            return cb (null, postsDBOps.DB);
        }
        sqlLiteTools.initDBTablesAndState(constants.ARTICLES_DB_ROOT_FILE, function (err, db) {
            if (err) {
                util.log('[dbOps] DB Init failed');
            }
            postsDBOps.DB = db;
            return cb(err, db);
        });
    },
    checkIfExistsFromURL : function (db, url, cb) {
        db.each('SELECT COUNT(*) as count FROM articles where external_url=? LIMIT 1', url, function (err, row) {
            if (err) {
                return cb(err);
            }
            if (row) {
                return cb(null, row);
            }
            return cb(null, null);
        });
    },
    getTopNPosts : function (options, cb) {
        let posts = [], finalResult = {};
        let count = Number(utils.getKey(options, 'count')) || 100;
        let cacheKey = 'topNPosts_'+count;
        if (cache.get(cacheKey)) {
            return cb(null, utils.jsonParser(cache.get(cacheKey)));
        }
        postsDBOps.initDB(function (err, db) {
            if (err) {
                util.log('Error while fetching top N Posts during DB Init :: ', err);
                return cb(err);
            }
            db.all('SELECT * FROM articles order by id desc LIMIT ?', count, function (err, row) {
                if (err) {
                    util.log('Error while fetching top N Posts :: ', err);
                    return cb(err);
                }
                if (row) {
                    posts = row;
                }
                finalResult.suggestedTags = [];
                _.forEach(posts, function (post) {
                    let meta = utils.jsonParser(post.meta || {});
                    Array.prototype.push.apply(finalResult.suggestedTags, (meta.tags || []));
                });
                finalResult.posts = posts;
                cache.put(cacheKey, JSON.stringify(finalResult), 5 * 60 * 1000);
                return cb(err, finalResult);
            });
        });
    },
    saveTagsByURL : function (url, tags, cb) {
        postsDBOps.initDB(function (err, db) {
            if (err) {
                return cb(err);
            }
            db.run('UPDATE articles set tags = ? where external_url = ?', String(tags), url, function (err) {
                if (err) {
                    return cb(err);
                }
                return cb();
            });
        });
    },
    getPostsByTag : function (options, cb) {
        let posts = [], finalResult = {};
        let tag = utils.getKey(options, 'tag') || ',';

        tag = tag.toUpperCase();
        if (tag == 'ALL') {
            tag = '';
        }
        let page = Number(utils.getKey(options, 'page')) || 1;
        let offset = (page - 1) * constants.ITEMS_PER_PAGE.POSTS;
        let limit = offset + constants.ITEMS_PER_PAGE.POSTS;
        let cacheKey = util.format('postbytag_%s_%s', tag, page);

        options.tag = tag;
        options.page = page;

        if (cache.get(cacheKey)) {
            return cb(null, utils.jsonParser(cache.get(cacheKey)));
        }
        postsDBOps.initDB(function (err, db) {
            if (err) {
                util.log('Error while fetching Posts by tag during DB Init :: ', err);
                return cb(err);
            }
            db.all('SELECT * FROM articles where tags LIKE ? order by id desc LIMIT ? OFFSET ?', '%'+tag+'%', limit, offset, function (err, row) {
                if (err) {
                    util.log('Error while fetching top N Posts :: ', err);
                    return cb(err);
                }
                if (row) {
                    posts = row;
                }
                _.forEach(posts, function (post) {
                    try {
                        post.tags = post.tags.split(",");
                    } catch (e) {
                        post.tags = [];
                    }
                });
                finalResult.posts = posts;
                cache.put(cacheKey, JSON.stringify(finalResult), 5 * 60 * 1000);
                return cb(err, finalResult);
            });
        });
    },
    getPostsByID : function (options, cb) {
        let post = [], finalResult = {};
        let id = utils.getKey(options, 'post_id') || ',';
        postsDBOps.initDB(function (err, db) {
            if (err) {
                util.log('Error while fetching Posts by ID during DB Init :: ', err);
                return cb(err);
            }
            db.all('SELECT * FROM articles where id = ? LIMIT 1', id, function (err, row) {
                if (err) {
                    util.log('Error while fetching top N Posts :: ', err);
                    return cb(err);
                }
                if (row && row[0]) {
                    post = row[0];
                }
                try {
                    post.tags = post.tags.split(",");
                } catch (e) {
                    post.tags = [];
                }
                post.meta = utils.jsonParser(post.meta);
                finalResult.post = post;
                return cb(err, finalResult);
            });
        });
    }
};

module.exports = postsDBOps;