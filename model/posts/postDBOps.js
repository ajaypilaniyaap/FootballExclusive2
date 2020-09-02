const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
var sqlLiteTools = require("../db/sqlLiteTools");
var cache = require('memory-cache');
var moment = require('moment');

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
                let postsToRemove = [];
                _.forEach(posts, function (post, index) {
                    try {
                        post.tags = post.tags.split(",");
                    } catch (e) {
                        post.tags = [];
                    }
                    try {
                        post.meta = utils.jsonParser(post.meta, {});
                    } catch (e) {
                        post.meta = {};
                    }
                    if (!post.meta.image) {
                        post.meta.image = '/images/logofull.png'
                    }
                    post.created_at = moment(post.created_at).format('DD MMM YYYY HH:MM');
                    if (!post.title || !post.content) {
                        postsToRemove.push(index);
                    }
                });
                _.forEach(postsToRemove, function (i) {
                    delete posts[i];
                })
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
                try {
                    post.meta = utils.jsonParser(post.meta, {});
                } catch (e) {
                    post.meta = {};
                }
                if (!post.meta.image) {
                    post.meta.image = '/images/logofull.png'
                }
                post.created_at = moment(post.created_at).format('DD MMM YYYY HH:MM');
                if (!post.title || !post.content) {
                    post = undefined;
                }
                finalResult.post = post;
                return cb(err, finalResult);
            });
        });
    },
    runQueryMiddleware : function (req, res, next) {
        let query = utils.getKey(req, 'query_db');
        if (!query) {
            return res.json({
                message : 'No query specified!'
            });
        }
        postsDBOps.initDB(function (err, db) {
            if (err) {
                return res.json({
                    message : 'Error while DB Init :: ' + err
                });
            }
            try {
                db.run(query, function (err, response) {
                    if (err) {
                        return res.json({
                            message : 'Error while DB Run :: ' + err
                        });
                    }
                    return res.json({
                        message : 'Res :: ' + (response || 'Operation Performed!')
                    });
                });
            }
            catch (e) {
                return res.json({
                    message : 'Exception :: ' + e
                });
            }
        });
    },
    updateArticle : function (req, res, next) {
        let keys = ['title', 'content', 'external_url', 'meta', 'tags','post_id'];
        let keyValueMap = {};
        _.forEach(keys, function (key) {
            let val = utils.getKey(req, key);
            if (!val) {
                return res.json({
                    message : 'Please provide ' + key
                });
            }
            keyValueMap[key] = val;
        });
        postsDBOps.initDB(function (err, db) {
            if (err) {
                return res.json({
                    message : 'Error while DB Init :: ' + err
                });
            }
            try {
                db.run('UPDATE articles SET title=?,meta=?,tags=?,content=?,external_url=? where id=?', keyValueMap.title, keyValueMap.meta, keyValueMap.tags, keyValueMap.content, keyValueMap.external_url, keyValueMap.post_id, function (err, response) {
                    if (err) {
                        return res.json({
                            message : 'Operation Failed :: ' + err
                        });
                    }
                    return res.json({
                        message : ' - ' + (response || 'Operation Performed!')
                    });
                });
            }
            catch (e) {
                return res.json({
                    message : 'Error occured :: ' + e
                });
            }
        });
    },

    deleteArticle : function (req, res, next) {
        let keys = ['post_id'];
        let keyValueMap = {};
        _.forEach(keys, function (key) {
            let val = utils.getKey(req, key);
            if (!val) {
                return res.json({
                    message : 'Please provide ' + key
                });
            }
            keyValueMap[key] = val;
        });
        postsDBOps.initDB(function (err, db) {
            if (err) {
                return res.json({
                    message : 'Error while DB Init :: ' + err
                });
            }
            try {
                db.run('DELETE from articles where id=?', keyValueMap.post_id, function (err, response) {
                    if (err) {
                        return res.json({
                            message : 'Operation Failed :: ' + err
                        });
                    }
                    return res.json({
                        message : ' - ' + (response || 'Operation Performed!')
                    });
                });
            }
            catch (e) {
                return res.json({
                    message : 'Error occured :: ' + e
                });
            }
        });
    }
};

module.exports = postsDBOps;