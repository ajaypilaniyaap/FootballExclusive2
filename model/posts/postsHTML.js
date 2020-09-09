const util = require('util');
const _ = require("lodash");
const utils = require("../../utils");
const constants = require("../../constants");

var postHTML = {
    tagPageHTML : function (req, res, next) {
        let posts = (req.results && req.results.posts) || [];
        let html = '';
        _.forEach(posts, function (post, index) {
            let image = (post.meta && utils.jsonParser(post.meta).image) || "/images/logofull.png"

            html += util.format('<div class="article_row_container">' +
                '<div class="col-md-6 agileits_welcome_grid_left">\n' +
                '            <div class="link-medium" style="margin-bottom: 0px !important;">\n' +
                '                <a class =\'link-medium\' style="margin-bottom: 0px !important;" href="%s"> %s </a>\n' +
                '            </div>\n' +
                '            </div>\n' +
                '        <div class="col-md-6 agileits_welcome_grid_right"> <img src="%s" alt=" " style="margin-bottom: 10px" class="img-responsive" />\n' +
                '            \n' +
                '        </div> </div>', utils.getPostURL(post), post.title, image);
        });
        req.responseJson.postsFound = posts.length;
        req.responseJson.postsHTML = html;
        req.responseJson.tag = req.tag;
        req.responseJson.page = req.page;
        return next();
    }
};

module.exports = postHTML;