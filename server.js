var express = require("express"),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override'),
    phantom = require('phantom'),
    fs = require('fs'),
    url = require('url'),
    JSZip = require("jszip"),
    cors = require('cors');

var port = parseInt(process.env.PORT, 10) || 19431;
var app = express();

app.use(cors());

app.get('/:filename?', function (req, res) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var requestFilename = url_parts.path.split('.');

    if (requestFilename.length === 2 && (requestFilename[1] === 'jpg' || requestFilename[1] === 'png' || requestFilename[1] === 'gif' || requestFilename[1] === 'jpeg')) {
        // output image
        fs.readFile(url_parts.path.replace('/', ''), function (err, data) {
            if (err) {// Fail if the file can't be read.
                res.end('no file'); // Send the file data to the browser.
                return false;
            }
            ;
            res.writeHead(200, {'Content-Type': 'image/' + requestFilename[1]});
            res.end(data); // Send the file data to the browser.
        });
        return false;
    } else {
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
        var zipname = "test" + (new Date().valueOf()) + ".zip";

        phantom.create(function (ph) {
            ph.createPage(function (page) {
                // set correct viewport
                console.log('success!');
                page.set('viewportSize', {width: 1920, height: 6000});

                page.open(query.url, function (status) {
                    page.evaluate(function () {
                    }, function (result) {
                        // make actino for eeach banner
                        banners.forEach(function (el, index) {
                            //set render area
                            page.set('clipRect', query.offsets[index]);
                            //for zip
                            filenames.push(bannerNames[index] + '.jpeg');
                            // for save to drive
                            filenamesReal.push(bannerNames[index] + (new Date().valueOf()) + '.jpeg');
                            // render image
                            page.render(filenamesReal[index], {format: 'jpeg', quality: qualityVals[index] || 100});

                        });
                        //close phantom
                        ph.exit();
                        // if downloading
                        if (query.download) {
                            setTimeout(function () {

                                banners.forEach(function (el, index) {
                                    // read a file and add it to a zip
                                    zip.file(filenames[index], fs.readFileSync(filenamesReal[index]), {binary: true});
                                });

                                var buffer = zip.generate({type: "nodebuffer"});
                                // save archive to filesystem
                                fs.writeFile(zipname, buffer, function (err) {
                                    // download zip
                                    if (err)
                                        throw err;
                                    res.setHeader('Content-disposition', 'attachment; filename=' + zipname);
                                    res.setHeader('Content-type', 'zip');
                                    var readFile = fs.createReadStream(zipname);
                                    readFile.pipe(res);
                                });

                            }, 500);
                        } else {
                            // if simply return image links
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({params: query, images: filenamesReal}));
                        }
                    });
                });
            });
        }, {
            dnodeOpts: {
                weak: false
            }
        });
        return false;
    }

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
