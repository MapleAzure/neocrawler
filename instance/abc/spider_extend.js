/**
 * Created by james on 13-12-17.
 * spider extend: diy spider
 */
const MongoClient = require('mongodb').MongoClient;
const crypto = require('crypto');
require('../../lib/jsextend.js');

var spider_extend = function(spiderCore) {
    this.spiderCore = spiderCore;
    logger = spiderCore.settings.logger;
}
/**
 * synchronized assembly spider extender
 * @param callback
 */
spider_extend.prototype.assembly = function(callback) {
    var self = this;
    self.mongoDb = null;
    self.mongoTable = null;
    self.reportdb = self.spiderCore.spider.redis_cli2;
    MongoClient.connect("mongodb://127.0.0.1:27017", function(err, client) {
        if (err) throw err;
        self.mongoDb = client;
        self.mongoTable = client.db('test').collection('crawled');
        callback();
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * customizing pipeline
 * if it do nothing , comment it
 * @param extracted_info (same to extract)
 */
spider_extend.prototype.pipeline = function(extracted_info, callback) {
    var spider_extend = this;

    if (!extracted_info['extracted_data'] || isEmpty(extracted_info['extracted_data'])) {
        logger.warn('data of ' + extracted_info['url'] + ' is empty.');
        callback();
    } else {
        var data = extracted_info['extracted_data'];
        var _id = crypto.createHash('md5').update(extracted_info['url']).digest('hex');
        var currentTime = (new Date()).getTime();
        data['updated'] = currentTime;

        //drop additional info
        if (data['$category']) delete data['$category'];
        if (data['$require']) delete data['$require'];

        //format relation to array
        if (extracted_info['drill_relation']) {
            data['relation'] = extracted_info['drill_relation'].split('->');
        }

        //get domain
        var urlibarr = extracted_info['origin']['urllib'].split(':');
        var domain = urlibarr[urlibarr.length - 2];
        data['domain'] = domain;

        logger.debug('get ' + data['title'] + ' from ' + domain + '(' + extracted_info['url'] + ')');
        data['url'] = extracted_info['url'];

        var query = {
            "$or": [{
                '_id': _id
            }]
        };

        spider_extend.mongoTable.findOne(query, function(err, item) {
            if (err) {
                throw err;
                callback();
            } else {
                if (item) {
                    // if the new data of field less than the old, drop it
                    (function(nlist) {
                        for (var c = 0; c < nlist.length; c++)
                            if (data[nlist[c]] && item[nlist[c]] && data[nlist[c]].length < item[nlist[c]].length) delete data[nlist[c]];
                    })(['title', 'article', 'tags', 'keywords']);

                    spider_extend.mongoTable.update({ '_id': item['_id'] }, { $set: data }, { w: 1 }, function(err, result) {
                        if (!err) {
                            spider_extend.reportdb.rpush('queue:crawled', _id);
                            logger.debug('update ' + data['title'] + ' to mongodb, ' + data['url'] + ' --override-> ' + item['url']);
                        }
                        callback();
                    });
                } else {
                    data['_id'] = _id;
                    data['created'] = currentTime;
                    spider_extend.mongoTable.insert(data, { w: 1 }, function(err, result) {
                        if (!err) {
                            spider_extend.reportdb.rpush('queue:crawled', _id);
                            logger.debug('insert ' + data['title'] + ' to mongodb');
                        }
                        callback();
                    });
                }
            }
        });
    }
}

module.exports = spider_extend;