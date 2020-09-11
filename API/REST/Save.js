var DB = require("../DB.js");

var jwt = require('jsonwebtoken');
var JWTKey = require("../../appconfig.json").JWTKey;
var hardcodedAPIKey = require("../../appconfig.json").ApiKey;

exports.handler = async (event, context, callback) => {
    
    var beginPipeline = process.hrtime();


    var Authorization = event.headers["authorization"];
    var jwtSTR = Authorization;
    if ( jwtSTR != null ){
        jwtSTR = Authorization.replace("Bearer ", "");
    }
    
    var ApiKey = event.headers["x-api-key"];
    var apiAuth = false;
    if ( ApiKey == hardcodedAPIKey ){
        apiAuth = true;
    }

    var decodedJWT = null;
    if (jwtSTR != null && jwtSTR != ""){
        decodedJWT = jwt.verify(jwtSTR, JWTKey);
    }

    var jwtAuth = false;
    if ( decodedJWT == null || decodedJWT.uid == null ){
        //
    }
    else{
        jwtAuth = true;
    }


    if ( !apiAuth && !jwtAuth ){
        callback(null, {
            status: 400,
            content: "Invalid token / jwt provided"
        });
        return;
    }

    
    //debug
    //var body = {"uid":"120", "ctx":"", "type":"Start", "title":"", "val": 1, "data": {}};
    
    //PROD
    
    var body = null;
    try{
        body = JSON.parse(event.body);
    }
    catch(ex){
        callback(null, {
            status: 400,
            content: '{ "error": "Invalid content provided, posted body must be in JSON" }'
        });
        return;
    }
    
    if ( event.headers["cf-ipcountry"] != null && event.headers["cf-ipcountry"] != ""){
        if ( event.ws == null ){
            event.ws = {};
        }
        event.ws.country = event.headers["cf-ipcountry"];
    }
    
    var obj = await DB.SaveEvent(body, event.ip, event.ws.country);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    callback(null, {
            status: 200,
            content: obj, 
            headers:{
                "execTime": durationMS.toFixed(2) + "ms",
                "Content-Type": "application/json"
            }
    });

};