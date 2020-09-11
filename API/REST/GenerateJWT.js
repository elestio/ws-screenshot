var jwt = require('jsonwebtoken');
var JWTKey = require("../../appconfig.json").JWTKey;
var hardcodedAPIKey = require("../../appconfig.json").ApiKey;

exports.handler = async (event, context, callback) => {
    
    var beginPipeline = process.hrtime();

    //debug
    //var body = {"uid":"120", "token": "123615z1ef88136zg5e1"};

    var ApiKey = event.headers["x-api-key"];
    
    //PROD
    var body = null;
    try{
        body = JSON.parse(event.body);
    }
    catch(ex){
        callback(null, {
            status: 400,
            content: "Invalid content provided, posted body must be in JSON"
        });
        return;
    }
    
    
    var uid = body.uid;
    //if ( ApiKey != hardcodedAPIKey ){
    if ( ApiKey != hardcodedAPIKey ){
        //console.log(event);
        callback(null, {
            status: 400,
            content: "Invalid token provided"
        });
        return;
    }

    var token = jwt.sign(body, JWTKey);
    
    
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    var processTime = durationMS.toFixed(2) + "ms";

    callback(null, {
            status: 200,
            content: {"jwt": token}, 
            headers:{
                "processTime": processTime,
                "Content-Type": "application/json"
            }
    });

};