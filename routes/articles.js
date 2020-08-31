var express = require('express');
var router = express.Router();
var util = require("util");
var _ = require("lodash");
var constants = require("../constants");
var utils = require("../utils");
var pollTools = require("../model/polls/pollTools");
var lowDBTools = require("../model/db/lowDBTools");
var upload = require("../model/files/upload").upload;
var tags = require("../model/posts/tags");
var scraper = require("../model/posts/scraper");
var postDBOps = require("../model/posts/postDBOps");
var postHTML = require("../model/posts/postsHTML");

/* GET users listing. */
router.get('/tags/getTags', tags.loadTagsFromFile, function(req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});

router.get('/tags/suggestions', function(req, res, next) {
    req.responseJson = req.responseJson || {};
    req.responseJson.suggestions = scraper.suggestedTags;
    return res.json(req.responseJson);
});

router.post('/tags/addnodes', utils.authorize, tags.loadTagsFromFile, tags.tagsToGraphData, tags.addNode, tags.saveTagsDataInFile, function (req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});


router.post('/tags/removenodes', utils.authorize, tags.loadTagsFromFile, tags.tagsToGraphData, tags.removeNode, tags.saveTagsDataInFile, function (req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});

router.post('/tags/addedge', utils.authorize, tags.loadTagsFromFile, tags.tagsToGraphData, tags.checkIfEdgeExists, tags.addEdge, tags.saveTagsDataInFile, function (req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});

router.post('/tags/deleteedge', utils.authorize, tags.loadTagsFromFile, tags.tagsToGraphData, tags.deleteEdge, tags.saveTagsDataInFile, function (req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});

router.get('/tags/dfs', tags.loadTagsFromFile, tags.tagsToGraphData, tags.dfs, function (req, res, next) {
    req.responseJson = req.responseJson || {};
    return res.json(req.responseJson);
});

router.get('/tagadmin', utils.getConstants, tags.loadTagsFromFile, function (req, res, next) {
    postDBOps.getTopNPosts(req, function (err, results) {
        let alreadyAddedTags = req.tags && req.tags.nodes || [];
        _.forEach(results.suggestedTags, function (tag, i) {
            results.suggestedTags[i] = tag.toUpperCase();
        });
        req.data.suggestedTags = _.difference(results.suggestedTags, alreadyAddedTags);
        req.data.allTags = _.uniq(req.data.suggestedTags.concat(alreadyAddedTags));
        return res.render('tagadmin.ejs', req.data);
    });
});

router.get('/tag/:tag', utils.getConstants, function (req, res, next) {
    postDBOps.getPostsByTag(req, function (err, results) {
        req.results = results;
        return next()
    });
}, postHTML.tagPageHTML, function (req, res, next) {
    _.assign(req.responseJson , req.data);
    return res.render('tagpage.ejs', req.responseJson);
});

router.get('/gettagarticles', utils.getConstants, function (req, res, next) {
    postDBOps.getPostsByTag(req, function (err, results) {
        req.results = results;
        return next()
    });
}, postHTML.tagPageHTML, function (req, res, next) {
    _.assign(req.responseJson , req.data);
    return res.json(req.responseJson);
});

router.get('/:post_id/:identifier', utils.getConstants, function (req, res, next) {
    postDBOps.getPostsByID(req, function (err, results) {
        let post = results.post;
        if (typeof post != "object" || !post) {
            req.data.message = 'Requested article not found : 404'
            res.render('404.ejs', req.data);
        }
        req.data.post = post;
        res.render('articlesingle.ejs', req.data);
        return next()
    });
});

module.exports = router;
