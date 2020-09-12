const qs = require('querystring');
var jwt = require('jsonwebtoken');
var JWTKey = require("../../appconfig.json").JWTKey;
const tools = require('../shared.js');

const os = require('os')
const cpuCount = os.cpus().length
var maxConcurrency = (cpuCount)/2;
if (maxConcurrency < 1){
    maxConcurrency = 1;
}

exports.upgrade = async (event, context, callback) => {
    //console.log("Upgraded!");
};

exports.open = async (event, context, callback) => {
    callback(null, JSON.stringify({"status": "OK", "msg": "Connected to websocket screenshot service"}));
};


var timeoutsList = {};

exports.message = async (event, context, callback) => {

    try{

        //Do something with the message received from the client (echo, broadcast it, subscribe to a channel, execute some code ...)
        var msg = event.body;
        var obj = JSON.parse(msg);
        msg = JSON.stringify(obj);
        
        var resp = null;

        if ( obj.cmd == "screenshot" ){

            var sharedmem = context.sharedmem;
            var beginPipeline = process.hrtime();

            while ( sharedmem.getInteger("nbPuppeteerProcess") >= maxConcurrency ){
                await sleep(20);
            }

            sharedmem.incInteger("nbPuppeteerProcess", 1);

            var url = obj.url;
            if ( url == null || url == "" ){
                url = "https://www.google.com";
            }
            else{
                url = decodeURIComponent(url);
            }

            //var screenshotResult = await tools.screnshotForUrl(url, true);
            var screenshotResult = await tools.screnshotForUrlTab(url, true);

            sharedmem.incInteger("nbPuppeteerProcess", -1);

            const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
            var durationMS = (nanoSeconds/1000000);

            /*
            callback(null, {
                    status: 200,
                    content: screenshotResult.data, 
                    headers:{
                        "execTime": durationMS.toFixed(2) + "ms",
                        "nbPuppeteerProcess": sharedmem.getInteger("nbPuppeteerProcess"),
                        "Content-Type": screenshotResult.mimeType
                    }
            });
            */

            resp = {
                "cmd": "responseScreenshot", 
                "data": screenshotResult.data.toString("base64"), 
                "execTime": durationMS.toFixed(2) + "ms",
                "originalTS": obj.originalTS,
                "Content-Type": screenshotResult.mimeType
            };
        }
    
    }
    catch(ex){
        console.log(ex);
        console.log("Crash in Message handling");
    }

    

    //return the response to the websocket client (caller)
    if ( resp != null ){
        callback(null, JSON.stringify(resp));
    }
    
};

exports.close = async (event, context, callback) => {
            
    //here your response will be discarded because the websocket 
    //is already closed at clientside when we receive this event
    callback(null, null);
};
