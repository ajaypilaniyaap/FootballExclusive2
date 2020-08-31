var util = require('util');
var constants = {
    SITE_NAME : 'FootballExclusive',
    SITE_NAME_FIRST : 'Football',
    SITE_NAME_LAST : 'Exclusive',
    PHONE_NUMBER : 'NA',
    ...(process.env.NODE_ENV == 'staging' ? {SITE_HOST: 'http://localhost:3000'} : {SITE_HOST : 'http://www.footballexclusive.live'}),
    EMAIL : 'thefootballexclusiveorg@gmail.com',
    TITLES :{
        HOME : 'Football Exclusive : The Home Of Football'
    },
    KEYWORDS : 'Football, Football Exclusive, Football News, Football Transfer News',
    INSTAGRAM : {
        PROFILE_LINK : 'https://instagram.com/footballexclusive_',
        USERNAME : 'FootballExclusive_'
    },
    ...(process.env.NODE_ENV == 'staging' ? {DB_ROOT_FILE: '/home/ajaypilania/FootballExclusive/data/db.json'} : {DB_ROOT_FILE : __dirname + '/data/db.json'}),
    ...(process.env.NODE_ENV == 'staging' ? {DB_ROOT_DIRECTORY: '/home/ajaypilania/FootballExclusive/data/'} : {DB_ROOT_DIRECTORY : __dirname + '/data/'}),
    ...(process.env.NODE_ENV == 'staging' ? {ARTICLES_DB_ROOT_FILE: '/home/ajaypilania/FootballExclusive/data/articles.db'} : {DB_ROOT_FILE : __dirname + '/data/articles.db'}),
    ...(process.env.NODE_ENV == 'staging' ? {ARTICLES_TAG_ROOT_FILE: '/home/ajaypilania/FootballExclusive/data/tags.json'} : {DB_ROOT_FILE : __dirname + '/data/tags.json'}),
    ...(process.env.NODE_ENV == 'staging' ? {TAG_POST_MAPPING_FILE: '/home/ajaypilania/FootballExclusive/data/tags_posts.json'} : {TAG_POST_MAPPING_FILE : __dirname + '/data/tags_posts.json'}),
    LOG_FILE : __dirname + '/model/logs/logs.json',
    DB_ROOT_DIRECTORY : __dirname + '/data',
    ERROR_404 : 'Page Not Found : 404',
    DB_SAVE_INTERVAL_POLLS : 5 * 30 * 1000,
    DB_BLACK_LIST : ['voteShare', 'barChartData'],
    SECRET : 'ap',
    USERS : {
        ap : {}
    },
    ITEMS_PER_PAGE : {
        POLLS : 10,
        POSTS : 10
    },
    HASH : 'apsdsdefxdvdffxsdd',
    SMMRY_API_KEY : ['8DFB9082C1', '17E1EE8373', '5EEEC20947', '5115FEF9E5', 'FA6DDF6D34'],
    SMMRY_API_URL : function (url, API_KEY) {
        return util.format('https://api.smmry.com/?SM_API_KEY=%s&SM_KEYWORD_COUNT=5&SM_URL=%s', API_KEY, url);
    },
    POLL_VOTE_COOKIE_TIMEOUT : 60 * 60 * 1000
};

constants.HTML_DATA ={
    footer : '\n' +
        '<div class="agileits-w3layouts-footer">\n' +
        '    <div class="container">\n' +
        '        <div class="agile-copyright">\n' +
        '            <p>© 2020 '+constants.SITE_NAME+'. All rights reserved | Design by <a href="http://w3layouts.com">W3Layouts</a></p>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>',
    header : '\n' +
        '        <div class="header">\n' +
        '            <div class="container">\n' +
        '                <nav class="navbar navbar-default">\n' +
        '                    <div class="navbar-header">\n' +
        '                        <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">\n' +
        '                            <span class="sr-only">Toggle navigation</span>\n' +
        '                            <span class="icon-bar"></span>\n' +
        '                            <span class="icon-bar"></span>\n' +
        '                            <span class="icon-bar"></span>\n' +
        '                        </button>\n' +
        '                    </div>\n' +
        '                    <!--navbar-header-->\n' +
        '                    <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">\n' +
        '                        <ul class="nav navbar-nav navbar-right">\n' +
        '                            <li><a href="/" >Home</a></li>\n' +
        '                            <li><a href="/polls">Polls</a></li>\n' +
        '                        </ul>\n' +
        '                        <div class="clearfix"> </div>\n' +
        '                    </div>\n' +
        '                </nav>\n' +
        '            </div>\n' +
        '        </div>',
    header_top : '<div class="header-top">\n' +
        '            <div class="container">\n' +
        '                <div class="header-left">\n' +
        '                    <h1><a href="/">'+constants.SITE_NAME_FIRST+'  <span>'+constants.SITE_NAME_LAST+'</span></a></h1>\n' +
        '                </div>\n' +
        '                <div class="header-middle">\n' +
        '                    <ul>\n' +
        '                        <li><span class="glyphicon glyphicon-phone" aria-hidden="true"></span>'+constants.PHONE_NUMBER+'</li>\n' +
        '                        <li><a href="mailto:'+constants.EMAIL+'"><span class="glyphicon glyphicon-envelope" aria-hidden="true"></span>'+constants.EMAIL+'</a></li>\n' +
        '                    </ul>\n' +
        '                </div>\n' +
        '                <div class="header-right">\n' +
        '                    <div class="search">\n' +
        '                        <form action="#" method="post">\n' +
        '                            <input type="search" name="Search" value="Search" onfocus="this.value = \'\';" onblur="if (this.value == \'\') {this.value = \'Search\';}" required="">\n' +
        '                            <input type="submit" value=" ">\n' +
        '                        </form>\n' +
        '                    </div>\n' +
        '                </div>\n' +
        '                <div class="clearfix"></div>\n' +
        '            </div>\n' +
        '        </div>'
};

module.exports = constants;