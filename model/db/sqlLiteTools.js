const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
const sqlite3 = require('sqlite3').verbose();

var sqlLiteTools = {
    initDBTablesAndState : function (path, cb) {
        switch (path) {
            case constants.ARTICLES_DB_ROOT_FILE :
                let db = new sqlite3.Database(path, function (err) {
                    if (err) {
                        util.log('[DB INIT] Error : %s | Path : %s', err, path);
                        return cb (err, null);
                    }
                    db.run('CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, external_url TEXT NOT NULL, meta TEXT NOT NULL, tags TEXT, created_at DATE, UNIQUE(title,external_url))', function (err) {
                        if (err) {
                            util.log('[DB INIT ARTICLES TABLE] Error : %s | Path : %s', err, path);
                            return cb (err, null);
                        }
                    });
                    cb (null, db);
                });
            default :
                cb(new Error('No handling for given path'));
        }
    },
    runQuery : function (db, query, cb) {
        db.run(query, function (err) {
            if (err) {
                util.log('[DB RUN QUERY] Error : %s', err);
                return cb (err, null);
            }
            return cb (null);
        });
    }
};

module.exports = sqlLiteTools;

(function () {
    if (require.main == module) {
        sqlLiteTools.initDBTablesAndState(constants.ARTICLES_DB_ROOT_FILE);
    }
}())