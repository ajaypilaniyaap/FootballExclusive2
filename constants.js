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
    ...(process.env.NODE_ENV == 'staging' ? {ARTICLES_DB_ROOT_FILE: '/home/ajaypilania/FootballExclusive/data/articles.db'} : {ARTICLES_DB_ROOT_FILE : __dirname + '/data/articles.db'}),
    ...(process.env.NODE_ENV == 'staging' ? {ARTICLES_TAG_ROOT_FILE: '/home/ajaypilania/FootballExclusive/data/tags.json'} : {ARTICLES_TAG_ROOT_FILE : __dirname + '/data/tags.json'}),
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
    SMMRY_API_KEY : ['8DFB9082C1', '17E1EE8373', '5EEEC20947', '5115FEF9E5', 'FA6DDF6D34', 'F4AACE2BA2'],
    SMMRY_API_URL : function (url, API_KEY) {
        return util.format('https://api.smmry.com/?SM_API_KEY=%s&SM_KEYWORD_COUNT=5&SM_URL=%s', API_KEY, url);
    },
    POLL_VOTE_COOKIE_TIMEOUT : 60 * 60 * 1000
};

constants.ADS = {
    IN_ARTICLE : '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n' +
        '<ins class="adsbygoogle"\n' +
        '     style="display:block; text-align:center;"\n' +
        '     data-ad-layout="in-article"\n' +
        '     data-ad-format="fluid"\n' +
        '     data-ad-client="ca-pub-9659614920434986"\n' +
        '     data-ad-slot="3113583111"></ins>\n' +
        '<script>\n' +
        '     (adsbygoogle = window.adsbygoogle || []).push({});\n' +
        '</script>',
    IN_FEED_TAG : '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n' +
        '<ins class="adsbygoogle"\n' +
        '     style="display:block"\n' +
        '     data-ad-format="fluid"\n' +
        '     data-ad-layout-key="-fb+5w+4e-db+86"\n' +
        '     data-ad-client="ca-pub-9659614920434986"\n' +
        '     data-ad-slot="9088157030"></ins>\n' +
        '<script>\n' +
        '     (adsbygoogle = window.adsbygoogle || []).push({});\n' +
        '</script>',
    HORIZONTAL_ADS : '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n' +
        '<!-- General Horizontal ads -->\n' +
        '<ins class="adsbygoogle"\n' +
        '     style="display:block"\n' +
        '     data-ad-client="ca-pub-9659614920434986"\n' +
        '     data-ad-slot="4574196952"\n' +
        '     data-ad-format="auto"\n' +
        '     data-full-width-responsive="true"></ins>\n' +
        '<script>\n' +
        '     (adsbygoogle = window.adsbygoogle || []).push({});\n' +
        '</script>',
    FIXED_HORIZONTAL_ADS : '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n' +
        '<!-- Fixed horizontal ads -->\n' +
        '<ins class="adsbygoogle"\n' +
        '     style="display:inline-block;width:728px;height:90px"\n' +
        '     data-ad-client="ca-pub-9659614920434986"\n' +
        '     data-ad-slot="1513947019"></ins>\n' +
        '<script>\n' +
        '     (adsbygoogle = window.adsbygoogle || []).push({});\n' +
        '</script>'
}

constants.HTML_DATA ={
    HEAD_ELEMENTS : '<link rel="shortcut icon" href="/images/favicon.ico" type="image/x-icon" />\n' +
        '<script data-ad-client="ca-pub-9659614920434986" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
    footer : '\n <div style="text-align: center"> ' + constants.ADS.HORIZONTAL_ADS + '</div>' +
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
        '                    <!--navbar-header-->\n<hr>' +
        '                    <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">\n' +
        '                        <ul class="nav navbar-nav navbar-right">\n' +
        '                            <li><a href="/" >Home</a></li>\n' +
        '                            <li><a href="/polls">Polls</a></li>\n' +
        '                            <li><a href="/livescores">Live Scores</a></li>\n' +
        '                            <li><a href="/articles/tag/epl">Premier League</a></li>\n' +
        '                            <li><a href="/articles/tag/la%20liga">La Liga</a></li>\n' +
        '                            <li><a href="/articles/tag/serie%20a">Serie A</a></li>\n' +
        '                            <li><a href="/articles/tag/ligue%201">Ligue 1</a></li>\n' +
        '                            <li><a href="/articles/tag/bundesliga">Bundesliga</a></li>\n' +
        '                            <li><a href="/articles/tag/uefa">UEFA</a></li>\n' +
        '                            <li><a href="/articles/tag/international">International</a></li>\n' +
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