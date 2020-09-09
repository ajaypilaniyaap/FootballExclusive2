const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");
const fs = require("fs");

var Queue = require('better-queue');
var postDbOps = require("./postDBOps");
var cache = require('memory-cache');
var request = require('request');
var logger = require("../logs/logger");
var Graph = require("graph-data-structure");
var graph = Graph();

function getDFSFromAPICall (sourceNodes, cb) {
    if (sourceNodes == '') {
        return cb([]);
    }
    let opts = {
        source : sourceNodes || ''
    };
    let cacheKey = 'dfs_'+String(sourceNodes);
    if (cache.get(cacheKey)) {
        return cb(utils.jsonParser(cache.get(cacheKey)));
    }
    let reqOpts = {
        uri : utils.localHostURI() + 'articles/tags/dfs',
        json : opts,
        timeout : 30 * 1000
    }
    request(reqOpts, function (err, res) {
        let body;
        try {
            body = utils.jsonParser(res.body);
        } catch (e) {
            body = {};
        }
        cache.put(cacheKey, JSON.stringify(body.dfs || []), 15 * 1000);
        return cb(body.dfs || []);
    });
}
/**
 * This will be calculate tags. We will push the results in queue and this will then calculate the tags.
 */
function calculateTags (finalPost, cb) {
    if (!(finalPost.title && finalPost.content && finalPost.external_url)) {
        logger.queue.push({
            key : finalPost.external_url, message : {
                'SKIPPING_TAGS' : 'Info missing'
            }
        });
        return cb();
    }
    try {
        tags.getTagsAndGraphData(function (result) {
            let title = finalPost.title || '';
            let content = finalPost.content || '';
            let finalTags = {};
            title = title.toUpperCase();
            title = " " + title + " ";
            content = content.toUpperCase();
            let modifiedNodes = {};
            let suffixAllowed = ['?', '.', ':', ',' ,'\'', '"'];
            try {
                _.forEach(result.nodes || [], function (node, i) {
                    modifiedNodes[node] = [];
                    modifiedNodes[node].push(' '+node+' ');
                    modifiedNodes[node].push(' '+node);
                    modifiedNodes[node].push(node+' ');
                    _.forEach(suffixAllowed, function (suffix) {
                        modifiedNodes[node].push(node + suffix);
                        modifiedNodes[node].push(node + ' ' + suffix);
                    })
                });
            } catch (e) {
                logger.queue.push({
                    key : finalPost.external_url, message : {
                        'TAGS_MODIF_EXECPTION' : e
                    }
                });
            }
            let dfsCall = 0;
            _.forEach(result.nodes || [], function (tag) {
                let itIncludes = false;
                _.forEach(modifiedNodes[tag] || [], function (tagModified) {
                    if (title.includes(tagModified)) {
                        itIncludes = itIncludes || true;
                    }
                })
                if (itIncludes) {
                    finalTags[tag] = true;
                    dfsCall++;
                    getDFSFromAPICall(tag, function (connectedTags) {
                        dfsCall--;
                        _.forEach(connectedTags, function (cTag) {
                            finalTags[cTag] = true;
                        });
                        let tagsToStore = _.keys(finalTags)
                        if (dfsCall == 0) {
                            logger.queue.push({
                                key : finalPost.external_url, message : {
                                    'DB_TAGS_STORING' : tagsToStore
                                }
                            });
                            postDbOps.saveTagsByURL(finalPost.external_url, tagsToStore, function (err) {
                                if (err) {
                                    logger.queue.push({
                                        key : finalPost.external_url, message : {
                                            'DB_TAGS_SAVE_ERR' : err
                                        }
                                    });
                                }
                                else {
                                    logger.queue.push({
                                        key : finalPost.external_url, message : {
                                            'DB_TAGS_SAVE_DONE' : utils.getTime()
                                        }
                                    });
                                }
                            });
                        }
                    })
                }
            });
            logger.queue.push({
                key : finalPost.external_url, message : {
                    'DB_TAGS_CALL_BACK' : utils.getTime()
                }
            });
            cb();
        });
    } catch (e) {
        logger.queue.push({
            key : finalPost.external_url, message : {
                'CALCULATE_TAGS_EXCEPTION' : e.message || e
            }
        });
        cb();
    }
}

var tags = {
    tagsQueue : new Queue(calculateTags),
    loadTagsFromFile : function (req, res, next) {
        fs.exists(constants.ARTICLES_TAG_ROOT_FILE, function (exists) {
            if (exists) {
                req.tags = JSON.parse(fs.readFileSync(constants.ARTICLES_TAG_ROOT_FILE));
            }
            else {
                fs.writeFileSync(constants.ARTICLES_TAG_ROOT_FILE, JSON.stringify({}));
                req.tags = {};
            }
            let nodes = _.get(req, ['tags', 'tagsGraph', 'nodes'], []);
            req.tags.nodes = _.map(nodes, "id");
            _.set(req, 'responseJson.tags', req.tags);
            return next();
        });
    },
    saveTagsDataInFile : function (req, res, next) {
        if (req.graphData) {
            req.tags.tagsGraph = req.graphData.serialize();
        }
        cache.del('tags_graph_data');
        let links = _.get(req, ['tags', 'tagsGraph', 'links'], []);
        _.set(req, ['tags', 'tagsGraph', 'links'], _.uniqWith(links, _.isEqual));
        fs.writeFileSync(constants.ARTICLES_TAG_ROOT_FILE, JSON.stringify(req.tags || {}));
        return next();
    },
    tagsToGraphData : function (req, res, next) {
        if (!req.tags) {
            _.set(req, 'responseJson.message', 'No tags data found!');
            return res.json(req.responseJson);
        }
        req.graphData = graph.deserialize(req.tags.tagsGraph || {"nodes":[],"links":[]});
        return next();
    },
    addNode : function (req, res, next) {
        let nodes = req.nodesToAdd || req.body.nodesToAdd || req.query.nodesToAdd || req.query.nodestoadd;
        try {
            nodes = nodes.split(",");
        } catch (e) {
            nodes = [];
        }
        nodes.forEach(function (node) {
            node = node.trim();
            node = node.toUpperCase();
            if (node != '') {
                req.graphData.addNode(node);
            }
        });
        _.set(req, 'responseJson.message', 'Nodes added succesfully.');
        return next();
    },
    removeNode : function (req, res, next) {
        let nodes = req.nodesToRemove || req.body.nodesToRemove || req.query.nodesToRemove || req.query.nodestoremove;
        try {
            nodes = nodes.split(",");
        } catch (e) {
            nodes = [];
        }
        nodes.forEach(function (node) {
            node = node.trim();
            node = node.toUpperCase();
            if (node != '') {
                req.graphData.removeNode(node);
            }
        });
        _.set(req, 'responseJson.message', 'Nodes removed succesfully.');
        return next();
    },
    addEdge : function (req, res, next) {
        let source = req.source || req.body.source || req.query.source;
        let biDirectional = req.bid || req.body.bid || req.query.bid;
        let destination = req.destination || req.body.destination || req.query.destination;
        if (!source || !destination) {
            _.set(req, 'responseJson.message', 'Please provide source and destination nodes.');
            return res.json(req.responseJson);
        }
        source = source.trim();
        destination = destination.trim();
        source = source.toUpperCase();
        destination = destination.toUpperCase();
        if (!req.edgeAlreadyAdded) {
            req.graphData.addEdge(source, destination);
            if (Number(biDirectional) == 1) {
                req.graphData.addEdge(destination, source);
            }
        }
        _.set(req, 'responseJson.message', 'Edge added succesfully.');
        return next();
    },
    checkIfEdgeExists : function (req, res, next) {
        let source = req.source || req.body.source || req.query.source;
        let destination = req.destination || req.body.destination || req.query.destination;
        if (!source || !destination) {
            _.set(req, 'responseJson.message', 'Please provide source and destination nodes.');
            return res.json(req.responseJson);
        }
        source = source.trim();
        destination = destination.trim();
        source = source.toUpperCase();
        destination = destination.toUpperCase();
        let links = _.get(req, ['tags', 'tagsGraph', 'links'], []);
        _.forEach(links, function (link) {
            if (link.source == source && link.target == destination) {
                req.edgeAlreadyAdded = true;
            }
        });
        if (req.edgeAlreadyAdded) {
            _.set(req, 'responseJson.message', 'Edge already exists.');
            return res.json(req.responseJson).end();
        }
        return next();
    },
    deleteEdge : function (req, res, next) {
        let source = req.source || req.body.source || req.query.source;
        let biDirectional = req.bid || req.body.bid || req.query.bid;
        let destination = req.destination || req.body.destination || req.query.destination;
        if (!source || !destination) {
            _.set(req, 'responseJson.message', 'Please provide source and destination nodes.');
            return res.json(req.responseJson);
        }
        source = source.trim();
        destination = destination.trim();
        source = source.toUpperCase();
        destination = destination.toUpperCase();
        req.graphData.removeEdge(source, destination);
        if (Number(biDirectional) == 1) {
            req.graphData.removeEdge(destination, source);
        }
        _.set(req, 'responseJson.message', 'Edge removed succesfully.');
        return next();
    },
    dfs : function (req, res, next) {
        let sourceNodes = req.source || req.body.source || req.query.source;
        try {
            sourceNodes = sourceNodes.split(",");
        } catch (e) {
            sourceNodes = [];
        }
        _.forEach(sourceNodes, function (node, i) {
            sourceNodes[i] = sourceNodes[i].toUpperCase();
        })
        _.set(req, 'responseJson.dfs', req.graphData.depthFirstSearch(sourceNodes));
        _.set(req, 'responseJson.message', 'Successfull.');
        return next();
    },
    getTagsAndGraphData : function (cb) {
        let opts = {};
        if (cache.get('tags_graph_data')) {
            return cb(utils.jsonParser(cache.get('tags_graph_data')));
        }
        tags.loadTagsFromFile(opts, {}, function () {
            cache.put('tags_graph_data', JSON.stringify(opts.tags), 15 * 10 * 1000);
            return cb(opts.tags);
        });
    }
};

module.exports = tags;