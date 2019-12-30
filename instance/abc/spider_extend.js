/**
 * Created by james on 13-12-17.
 * spider extend: diy spider
 */
const MongoClient = require('mongodb').MongoClient;
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
require('../../lib/jsextend.js');
var util = require('util');

var spider_extend = function(spiderCore) {
        this.spiderCore = spiderCore;
        logger = spiderCore.settings.logger;
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * synchronized assembly spider extender
     * @param callback
     */
spider_extend.prototype.assembly = function(callback) {
        //do something initiation

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
        //  var self = this;
        //  self.reportdb = self.spiderCore.spider.redis_cli2;
        //  callback();
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * customize downloading
     * urlinfo<object>:{"url":string,"version":long,"type":"branch|node","format":"html|json|binary","encoding":"auto|utf-8|gbk","referer":string,string,"urllib":string,"save_page":true|false,"cookie":array[object],"jshandle":true|false,"inject_jquery":true|false,"drill_rules":object,"drill_relation":object,"validation_keywords":array,"script":array,"navigate_rule":array,"stoppage":int,"start_time":long}
     * callback:
     * parameter 1: error
     * parameter 2: <object>:{
                "remote_proxy":string,
                "drill_count":int,
                "cookie":array or string,
                "url":string,
                "statusCode":int,
                "origin":object==urlinfo,
                "cost":long,
                "content":html string
            }
     * if all parameter return null, means give up customize downloading, use built-in download middleware
     */
    //spider_extend.prototype.download = function(urlinfo,callback){
    //    callback(null,null);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * DIY extract, it happens after spider framework extracted data.
     * @param extracted_info
     * {
            "signal":CMD_SIGNAL_CRAWL_SUCCESS,
            "content":'...',
            "remote_proxy":'...',
            "cost":122,
            "extracted_data":{"field":"value"...}
            "inject_jquery":true,
            "js_result":[],
            "drill_link":{"urllib_alias":[]},
            "drill_count":0,
            "cookie":[],
            "url":'',
            "status":200,
            "origin":{
                "url":link,
                "type":'branch/node',
                "referer":'',
                "url_pattern":'...',
                "save_page":true,
                "cookie":[],
                "jshandle":true,
                "inject_jquery":true,
                "drill_rules":[],
                "script":[],
                "navigate_rule":[],
                "stoppage":-1,
                "start_time":1234
            }
        };
     */
    //spider_extend.prototype.extract = function(extracted_info,callback){
    //    callback(extracted_info);
    //}

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
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * it happens crawl started
     * @param urlinfo
     */
    //spider_extend.prototype.crawl_start_alert = function(urlinfo){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'crawl:'+__getTopLevelDomain(urlinfo['url']),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report retry crawl
     * @param urlinfo:{
                "url":link,
                "type":'branch/node',
                "referer":'',
                "url_pattern":'...',
                "save_page":true,
                "cookie":[],
                "jshandle":true,
                "inject_jquery":true,
                "drill_rules":[],
                "script":[],
                "navigate_rule":[],
                "stoppage":-1,
                "start_time":1234
            }
     *
     */
    //spider_extend.prototype.crawl_retry_alert = function(urlinfo){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'retry:'+__getTopLevelDomain(urlinfo['url']),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report failed crawl
     * @param urlinfo:{
                "url":link,
                "type":'branch/node',
                "referer":'',
                "url_pattern":'...',
                "save_page":true,
                "cookie":[],
                "jshandle":true,
                "inject_jquery":true,
                "drill_rules":[],
                "script":[],
                "navigate_rule":[],
                "stoppage":-1,
                "start_time":1234
            }
     *
     */
    //spider_extend.prototype.crawl_fail_alert = function(urlinfo){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'fail:'+__getTopLevelDomain(urlinfo['url']),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report extracted data lacks of some fields
     */
    //spider_extend.prototype.data_lack_alert = function(url,fields){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'lack:'+__getTopLevelDomain(url),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report a url crawling finish
     * @param crawled_info
     */
    //spider_extend.prototype.crawl_finish_alert = function(crawled_info){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'finish:'+__getTopLevelDomain(crawled_info['url']),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report saving content
     * if it do nothing , comment it
     * @param extracted_info (same to extract)
     */
    //spider_extend.prototype.save_content_alert  = function(extracted_info){
    //    this.reportdb.hincrby('count:'+__getDateStr(),'save:'+__getTopLevelDomain(extracted_info['url']),1);
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * report no queue
     */
    //spider_extend.prototype.no_queue_alert = function(){
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /**
     * TOP Domain,e.g: http://www.baidu.com/sdfdsfdsf  -> baidu.com
     * @param domain
     * @returns {*}
     * @private
     */
    //var __getTopLevelDomain = function(link){
    //    var urlobj = url.parse(link);
    //    var domain = urlobj['hostname'];
    //    var arr = domain.split('.');
    //    if(arr.length<=2)return domain;
    //    else return arr.slice(1).join('.');
    //}
    /**
     * get date string
     * @returns {string} 20140928
     * @private
     */
    //var __getDateStr = function(){
    //    var d = new Date();
    //    return ''+ d.getFullYear() + (d.getMonth()>9?d.getMonth()+1:'0'+(d.getMonth()+1)) + (d.getDate()>9?d.getDate():'0'+d.getDate());
    //}
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports = spider_extend;