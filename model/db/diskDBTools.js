const low = require('lowdb');
const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
var db = require("diskdb");

const diskDBTools = {
    init : function(cb) {

    },
    insert : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['tableName', 'rowToInsert']);
        if (options.error) {
            return cb();
        }
        db = db.connect(constants.DB_ROOT_DIRECTORY, [options.tableName]);
        db[options.tableName].save(options.rowToInsert);
        util.log("Table : %s, Operation : INSERT, row : %s", options.tableName, utils.logJson(options.rowToInsert));
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

        db = db.connect(constants.DB_ROOT_DIRECTORY, [options.tableName]);
        db[options.tableName].update(options.whereClause, options.updateJson);

        util.log("Table : %s, Operation : UPDATE_BULK, where : %s, update : %s", options.tableName, utils.logJson(options.whereClause), utils.logJson(options.updateJson));
        return cb();
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
        db = db.connect(constants.DB_ROOT_DIRECTORY, [options.tableName]);
        db[options.tableName].remove(options.whereClause);
        util.log("Table : %s, Operation : REMOVE, where : %s", options.tableName, utils.logJson(options.whereClause));
        return cb();
    },
    get : function (options, response, cb) {
        utils.checkMandatoryParams(options, ['whereClause', 'tableName']);
        if (options.error) {
            util.log("Sending error in options");
            return cb();
        }
        db = db.connect(constants.DB_ROOT_DIRECTORY, [options.tableName]);
        let rows = db[options.tableName].find(options.whereClause);
        options.results = rows;
        util.log("Table : %s, Operation : GET, where : %s, rows_size : %s", options.tableName, utils.logJson(options.whereClause), _.size(rows));
        return cb();
    }
};

module.exports = diskDBTools;

(function () {
    if (require.main == module) {
        let sampleRow = {
            title : 'Who is UCL Winner', id : 3, options : {
                Bayern : {votes:0}, Chelsea :{votes:0}, Barcelona : {votes:0}
            }
        };
        let Insertoptions = {
            rowToInsert  : sampleRow, tableName : 'polls'
        };
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
        diskDBTools.get(getOptions, {}, function () {})
    }
}())