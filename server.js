var express = require("express");
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var phantom = require('phantom');
var fs = require('fs');
var url = require('url');
var JSZip = require("jszip");
var cors = require('cors');
var morgan = require('morgan');
var _ = require('underscore');
var path = require('path');
var mkdirp = require('mkdirp');
var cron = require('./utils/cron.js');
var moment = require('moment');
var winston = require('winston');

var port = parseInt(process.env.PORT, 10) || 19431;

mkdirp('uploads');
mkdirp('zip');

cron();

var app = express();
app.use(cors());
app.use(morgan('combined'));

app.get('/uploads/:filename', function (req, res) {
    var url_parts = url.parse(req.url, true);
    var ext = path.extname(url_parts.path);

    fs.readFile(url_parts.path.replace('/', ''), function (err, data) {
        if (err) {// Fail if the file can't be read.
            res.end('no file'); // Send the file data to the browser.
            return false;
        }

        res.writeHead(200, {'Content-Type': 'image/' + ext});
        res.end(data); // Send the file data to the browser.
    });
});

app.get('/', function (req, res) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;

    // render things
    query.offsets = JSON.parse(decodeURIComponent(query.offsets));
    // list of banner's ids
    var banners = query.banners.split(',');
    var bannerNames = query.bannerNames.split(',');
    var qualityVals = query.quality.split(',');
    // here we will store offset for each banner
    var filenames = [];
    var filenamesReal = [];
    //create zip
    var zip = new JSZip();


    // archive name
    var date = moment().format('MM-YYYY-DD_h:mm:ss');
    var zipname = "bcp(" + date + ").zip";

    phantom.create(
        function (ph) {
            ph.createPage(function (page) {
                // set correct viewport
                page.set('viewportSize', {width: 1920, height: 6000});

                page.open(query.url, function (status) {
                    page.evaluate(function () {
                        },
                        //second evaluate func
                        function (result) {
                            // make actino for eeach banner
                            banners.forEach(function (el, index) {
                                //set render area
                                page.set('clipRect', query.offsets[index]);
                                //for zip
                                filenames.push(bannerNames[index] + '.jpeg');
                                // for save to drive
                                filenamesReal.push('uploads/' + bannerNames[index] + (new Date().valueOf()) + '.jpeg');
                                // render image
                                page.render(filenamesReal[index], {format: 'jpeg', quality: qualityVals[index] || 100});
                            });
                            //close phantom
                            ph.exit();
                            // if downloading
                            if (query.download) {
                                setTimeout(function () {

                                    banners.forEach(function (el, index) {
                                        while (fs.existsSync(filenamesReal[index]) === false) {
                                            winston.info('waiting for a file...');
                                        }
                                    });

                                    banners.forEach(function (el, index) {
                                        if (fs.existsSync(filenamesReal[index])) {
                                            // read a file and add it to a zip
                                            var f = fs.readFileSync(filenamesReal[index]);
                                            zip.file(filenames[index], f, {binary: true});
                                        }
                                    });

                                    var buffer = zip.generate({type: "nodebuffer"});
                                    // save archive to filesystem
                                    fs.writeFile('zip/' + zipname, buffer, function (err) {
                                        // download zip
                                        if (err)
                                            throw err;
                                        res.setHeader('Content-disposition', 'attachment; filename=' + 'zip/' + zipname);
                                        res.setHeader('Content-type', 'zip');
                                        var readFile = fs.createReadStream('zip/' + zipname);
                                        readFile.pipe(res);
                                    });

                                }, 1000);
                            } else {
                                // if simply return image links
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({params: query, images: filenamesReal}));
                            }
                        }, 'banners');
                });
            });

        },
        {
            dnodeOpts: {
                weak: false
            }
        }
    );
    return false;


});

app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/public'));
app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));

console.log("Simple static server listening at http://localhost:" + port);
app.listen(port);
