var winston = require('winston');
var _ = require('underscore');
var walk = require('walk');
var fs = require('fs');

module.exports = function (callback) {
    var cronJob = require('cron').CronJob;


    new cronJob('0 */1 * * * *', function () {
        winston.info('--- CRON HEARTBEAT ---');

        // Walker options
        var walker = walk.walk('./uploads', { followLinks: false });

        //auto delete images older than 1 day
        walker.on('file', function (root, stat, next) {
            // auto delete images older than 1 day
            var outOfDate = (new Date().getTime() - stat.mtime.getTime()) / 1000 >= (24 * 60 * 60);
            if (outOfDate) {
                fs.unlink(root + '/' + stat.name, function () {
                    next();
                })
            }
        });
    }).start();

    if (_.isFunction(callback)) {
        callback(null);
    }
};