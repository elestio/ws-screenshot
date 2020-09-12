const puppeteer = require('puppeteer');
var hardcodedAPIKey = require("../../appconfig.json").ApiKey;
const tools = require('../shared.js');

const os = require('os')
const cpuCount = os.cpus().length
var maxConcurrency = (cpuCount)/2;
if (maxConcurrency < 1){
    maxConcurrency = 1;
}

exports.handler = async (event, context, callback) => {

    var sharedmem = context.sharedmem;
    var beginPipeline = process.hrtime();

    /*
    if ( !apiAuth && !jwtAuth ){
        callback(null, {
            status: 400,
            content: "Invalid token / jwt provided"
        });
        return;
    }
    */
    while ( sharedmem.getInteger("nbPuppeteerProcess") >= maxConcurrency ){
        await sleep(20);
    }

    sharedmem.incInteger("nbPuppeteerProcess", 1);

    var url = event.queryStringParameters.url;
    if ( url == null || url == "" ){
        url = "https://www.google.com";
    }
    else{
        url = decodeURIComponent(url);
    }

    var screenshotResult = await tools.screnshotForUrl(url, true);
    //var screenshotResult = await screnshotForUrlTab(url);

    sharedmem.incInteger("nbPuppeteerProcess", -1);

    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    callback(null, {
            status: 200,
            content: screenshotResult.data, 
            headers:{
                "execTime": durationMS.toFixed(2) + "ms",
                "nbPuppeteerProcess": sharedmem.getInteger("nbPuppeteerProcess"),
                "Content-Type": screenshotResult.mimeType
            }
    });

};