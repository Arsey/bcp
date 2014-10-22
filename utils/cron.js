var winston = require('winston');
var _ = require('underscore');
var walk = require('walk');
var fs = require('fs');

function removeOneDayOldFile(root, stat, next) {
    var outOfDate = (new Date().getTime() - stat.mtime.getTime()) / 1000 >= (24 * 60 * 60);
    if (outOfDate) {
        fs.unlink(root + '/' + stat.name, function () {
            next();
        })
    }
}

module.exports = function (callback) {
    var cronJob = require('cron').CronJob;


    new cronJob('0 */1 * * * *', function () {
        winston.info('--- CRON HEARTBEAT ---');

        // Walker options
        var imgsWalker = walk.walk('./uploads', { followLinks: false });
        //auto delete images older than 1 day
        imgsWalker.on('file', function (root, stat, next) {
            removeOneDayOldFile(root, stat, next)
        });


        // Walker options
        var zipWalker = walk.walk('./zip', { followLinks: false });
        //delete zip's older than 1 day
        zipWalker.on('file', function (root, stat, next) {
            removeOneDayOldFile(root, stat, next)
        });
    }).start();

    if (_.isFunction(callback)) {
        callback(null);
    }
};