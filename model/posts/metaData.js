const util = require('util');
const _ = require("lodash");
var extract = require('html-metadata');

var metaData = {
    general : function (url, cb) {
        if (!url) {
            return cb('[META DATA] No URL Provided.');
        }
        let metaInfo = {};
        try {
            extract(url).then(function (metaData) {
                try {
                    metaInfo.image = metaData.openGraph.image.url;
                } catch (e) {
                    util.log('[META DATA] No image found');
                }
                try {
                    metaInfo.title = metaData.openGraph.title;
                } catch (e) {
                    util.log('[META DATA] No Title found');
                }
                return cb(null, metaInfo);
            });
        } catch (e) {
            util.log('[META DATA] Exception while calling Extraction API :: ', e);
            return cb(e, metaInfo);
        }
    }
};

module.exports = metaData;

(function () {
    if (require.main == module) {
        let options = {
            url : 'https://www.goal.com/en/news/a-death-threat-leaks-eriksen-why-conte-could-leave-inter/e2bjgqqhc8vq1gjgk5pvowz2l',
            keysToHave : ['goal.com'],
            keysToIgnore : ['/team/']
        }
        metaData.ESPN(options.url);
    }
}())