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
    var proxy_server = process.env.PROXY_SERVER;

    if ( hardcodedAPIKey != "" && event.queryStringParameters.apiKey != hardcodedAPIKey ){
        callback(null, {
            status: 400,
            content: "Invalid API Key"
        });
        return;
    }

    while ( sharedmem.getInteger("nbPuppeteerProcess") >= maxConcurrency ){
        await tools.sleep(20);
    }

    sharedmem.incInteger("nbPuppeteerProcess", 1);

    var url = event.queryStringParameters.url;
    if ( url == null || url == "" ){
        url = "https://www.google.com";
    }
    else{
        url = decodeURIComponent(url);
    }

    var isFullPage = false; if ( event.queryStringParameters.isFullPage == "true" ) { isFullPage = true; }
    var resX = 1280; if ( event.queryStringParameters.resX != null ) { resX = event.queryStringParameters.resX; }
    var resY = 900; if ( event.queryStringParameters.resY != null ) { resY = event.queryStringParameters.resY; }
    var outFormat = "jpg"; if ( event.queryStringParameters.outFormat != null ) { outFormat = event.queryStringParameters.outFormat; }
    var waitTime = 100; if ( event.queryStringParameters.waitTime != null ) { waitTime = event.queryStringParameters.waitTime; }

    //var screenshotResult = await tools.screnshotForUrl(url, isFullPage, resX, resY, outFormat);
    var screenshotResult = null;

    try{
        screenshotResult = await tools.screnshotForUrlTab(url, isFullPage, resX, resY, outFormat, waitTime, proxy_server);
    }
    catch(ex){
        //do nothing

    }

    sharedmem.incInteger("nbPuppeteerProcess", -1);
    sharedmem.incInteger("nbScreenshots", 1);

    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    if ( screenshotResult == null ){
        screenshotResult = {
            data: "",
            mimeType: ""
        }
    }

    callback(null, {
            status: 200,
            content: screenshotResult.data,
            details: screenshotResult.details,
            headers:{
                "execTime": durationMS.toFixed(2) + "ms",
                "nbPuppeteerProcess": sharedmem.getInteger("nbPuppeteerProcess"),
                "totalScreenshots": sharedmem.getInteger("nbScreenshots"),
                "Content-Type": screenshotResult.mimeType
            }
    });

};