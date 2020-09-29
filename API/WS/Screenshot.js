const qs = require('querystring');
var hardcodedAPIKey = require("../../appconfig.json").ApiKey;
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


        if ( hardcodedAPIKey != "" && obj.apiKey != hardcodedAPIKey ){
            callback(null, JSON.stringify({
                status: 400,
                content: "Invalid API Key"
            }));
            return;
        }

        
        var resp = null;

        if ( obj.cmd == "screenshot" ){

            var sharedmem = context.sharedmem;
            var beginPipeline = process.hrtime();

            while ( sharedmem.getInteger("nbPuppeteerProcess") >= maxConcurrency ){
                await tools.sleep(20);
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
            var screenshotResult = null;
            try{
                screenshotResult = await tools.screnshotForUrlTab(url, obj.isFullPage, obj.resX, obj.resY, obj.outFormat, obj.waitTime);
            }
            catch(ex){
                //do nothing
            }
            

            sharedmem.incInteger("nbPuppeteerProcess", -1);
            sharedmem.incInteger("nbScreenshots", 1);

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

            var b64Data = "";
            try{
                if (screenshotResult.data != null){
                    b64Data = screenshotResult.data.toString("base64");
                }
            }
            catch(ex){

            }


            if ( screenshotResult == null ){
                resp = {
                    "cmd": "responseScreenshot", 
                    "data": "", 
                    "execTime": durationMS.toFixed(2) + "ms",
                    "totalScreenshots": sharedmem.getInteger("nbScreenshots"),
                    "originalTS": obj.originalTS,
                    "outFormat": obj.outFormat,
                    "Content-Type": "application/json"
                };
            }   
            else{
                resp = {
                    "cmd": "responseScreenshot", 
                    "data": b64Data, 
                    "execTime": durationMS.toFixed(2) + "ms",
                    "totalScreenshots": sharedmem.getInteger("nbScreenshots"),
                    "originalTS": obj.originalTS,
                    "outFormat": obj.outFormat,
                    "Content-Type": screenshotResult.mimeType
                };
            }
            
            
        }
        else if ( obj.cmd == "CleanMemory" ){
            await tools.CleanMemory();
            resp = {
                "cmd": "responseCleanMemory", 
                "originalTS": obj.originalTS,
                "status": "OK"
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
