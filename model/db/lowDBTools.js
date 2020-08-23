const low = require('lowdb');
const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
const FileSync = require('lowdb/adapters/FileSync');
const FileAsync = require('lowdb/adapters/FileAsync')
const adapter = new FileAsync(constants.DB_ROOT_FILE);

const lowDBTools = {
    init : function(cb) {
        low(adapter).then(function (db) {
            lowDBTools.db = db;
            cb();
        });
    },
    insert : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['tableName', 'rowToInsert']);
        if (options.error) {
            return cb();
        }
        let db = lowDBTools.db;
        db.get(options.tableName)
            .push(options.rowToInsert)
            .write();
        util.log("Table : %s, Operation : INSERT, row : %s", options.tableName, utils.logJson(options.rowToInsert));
        return cb();
    },
    updateFirstMatchOnly : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['updateJson', 'whereClause', 'tableName']);
        if (!_.size(options.whereClause)) {
            options.error = 'Cannot update with an empty where clause';
        }
        if (options.error) {
            util.log("Sending error in options");
            return cb();
        }
        let db = lowDBTools.db;
        db.get(options.tableName)
            .find(options.whereClause)
            .assign(options.updateJson)
            .write();
        util.log("Table : %s, Operation : UPDATE_SINGLE, where : %s, update : %s", options.tableName, utils.logJson(options.whereClause), utils.logJson(options.updateJson));
        return cb();
    },
    updateBulk : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['updateJson', 'whereClause', 'tableName']);
        if (!_.size(options.whereClause)) {
            options.error = 'Cannot update with an empty where clause';
        }
        if (options.error) {
            util.log("Sending error in options");
            return cb();
        }
        let db = lowDBTools.db;
        db.get(options.tableName)
            .filter(options.whereClause)
            .each(function (row) {
                _.assign(row, options.updateJson)
            })
            .write()
            .then(function () {
                util.log("Table : %s, Operation : UPDATE_BULK, where : %s, update : %s", options.tableName, utils.logJson(options.whereClause), utils.logJson(options.updateJson));
                return cb();
            });
    },
    remove : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['whereClause', 'tableName']);
        if (!_.size(options.whereClause)) {
            options.error = 'Cannot delete with an empty where clause';
        }
        if (options.error) {
            util.log("Sending error in options");
            return cb();
        }
        let db = lowDBTools.db;
        db.get(options.tableName)
            .remove(options.whereClause)
            .write();
        util.log("Table : %s, Operation : REMOVE, where : %s", options.tableName, utils.logJson(options.whereClause));
        return cb();
    },
    get : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['whereClause', 'tableName']);
        if (options.error) {
            util.log("Sending error in options");
            return cb();
        }
        let db = lowDBTools.db;
        let rows = db.get(options.tableName)
            .filter(options.whereClause)
            .value();
        options.results = rows;
        util.log("Table : %s, Operation : GET, where : %s, rows_size : %s", options.tableName, utils.logJson(options.whereClause), _.size(rows));
        return cb();
    },
    getDB : function (options, response, cb) {
        let db = lowDBTools.db;
        if (!options.tableName) {
            return response.send('No table Name Specified');
        }
        let data = db.get(options.tableName)
            .filter((row)=>{return true})
            .value();
        options.data = {
            table : options.tableName,
            data : data
        }
        return cb();
    },
    APICallPreProcessing : function (req, res, next) {
        _.assign(req, req.body);
        _.assign(req, req.query);
        return next();
    },
    addSubscriber : function (req, res, next) {
        let email = req.query.email || req.body.email;
        if (!email) {
            return res.json({
                message : 'Provide an email ID!'
            })
        }
        let insertOptions = {
            tableName : 'subscribers', rowToInsert : {id : email}
        };
        lowDBTools.insert(insertOptions, {}, function () {
            if (insertOptions.error){
                return res.json({
                    message : insertOptions.error
                });
            }
            return res.json({
                message : util.format("Your email has been added to FootballExclusive subscriber's list. Get ready to receive exclusive football content."),
                success : true
            });
        });
    },
    addContactRequest : function (req, res, next) {
        let email = req.query.email || req.body.email;
        let message = req.query.message || req.body.message;
        let name = req.query.name || req.body.name;
        if (!email || !message || !name) {
            return res.json({
                message : 'Provide all required fields!'
            })
        }
        let insertOptions = {
            tableName : 'contact_requests', rowToInsert : {email : email, message : message, name : name}
        };
        lowDBTools.insert(insertOptions, {}, function () {
            if (insertOptions.error){
                return res.json({
                    message : insertOptions.error
                });
            }
            return res.json({
                message : util.format("Your message has been sent. We will reply to you within next 24 hours."),
                success : true
            });
        });
    },
    dbExec : function (req, res, next) {
        let queryOptions = {
            rowToInsert : req.body.rowToInsert, whereClause : req.body.whereClause, updateJson: req.body.updateJson, tableName : req.body.tableName
        }
        req.responseJson = {};
        switch (req.body.operation.toUpperCase()) {
            case 'GET' :
                lowDBTools.get(queryOptions, {}, function () {
                    if (queryOptions.error) {
                        req.responseJson.error = queryOptions.error;
                    } else {
                        req.responseJson.error = 'No error occured';
                    }
                    req.responseJson.results = queryOptions.results;
                });
                break;
            case 'UPDATE':
                lowDBTools.updateBulk(queryOptions, {}, function () {
                    if (queryOptions.error) {
                        req.responseJson.error = queryOptions.error;
                    } else {
                        req.responseJson.error = 'No error occured';
                    }
                    req.responseJson.results = queryOptions.results;
                });
                break;
            case 'REMOVE' :
                lowDBTools.remove(queryOptions, {}, function () {
                    if (queryOptions.error) {
                        req.responseJson.error = queryOptions.error;
                    } else {
                        req.responseJson.error = 'No error occured';
                    }
                    req.responseJson.results = queryOptions.results;
                });
                break;
        }
        return next();
    }
};

module.exports = lowDBTools;

(function () {
    if (require.main == module) {
        let sampleRow = {
            title : 'Hello', id : '1'
        };
        let Insertoptions = {
            rowToInsert  : sampleRow, tableName : 'polls'
        };
        let insert = {
                "tableName": "subscribers",
                "rowToInsert": {
                "id": "axd@ajax.com"
            }
        }
        let updateOptions = {
            "whereClause": {
                "id": 1
            },
            "tableName": "polls",
            "updateJson": {
                "options": {
                    "Messi": {
                        "votes": 15
                    },
                    "Ronaldo": {
                        "votes": 14
                    },
                    "Pollard": {
                        "votes": 10
                    },
                    "Iniesta": {
                        "votes": 16
                    },
                    "Xavi": {
                        "votes": 10
                    }
                }
            }
        };
        let removeOptions = {
            tableName : 'polls', whereClause : {id : 1}
        };
        let getOptions = {
            tableName : 'polls', whereClause : {id : 1}
        };
        lowDBTools.init(function () {
            lowDBTools.insert(insert, {}, function () {
            })
        })
    }
}())