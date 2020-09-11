const qs = require('querystring');
var DB = require("../DB.js");

var jwt = require('jsonwebtoken');
var JWTKey = require("../../appconfig.json").JWTKey;

var sessionsList = {};
var maxDurationBeforeQuitSession = 30000;

exports.upgrade = async (event, context, callback) => {
    //console.log("Upgraded!");
};

exports.open = async (event, context, callback) => {

    try{

        if ( event.headers["cf-connecting-ip"] != null && event.headers["cf-connecting-ip"] != ""){
            event.ip = event.headers["cf-connecting-ip"];
        }

        if ( event.headers["cf-ipcountry"] != null && event.headers["cf-ipcountry"] != ""){
            event.ws.country = event.headers["cf-ipcountry"];
        }

        event.ws.startTime = (+new Date());
        event.ws.startActiveTime = (+new Date());
        event.ws.isActive = true;

        var params = {};
        try{
            params = qs.parse(event.query);     
        }
        catch(exParams){

        }
        
        var jwtSTR = params.jwt;
        var wlid = "-1";
        if ( params.wlid != null && params.wlid != ""){
            wlid = params.wlid;
        }
        event.ws.wlid = wlid;

        //console.log(jwtSTR);
        event.ws.jwt = jwtSTR;

        if ( event.ws.jwt != null && event.ws.jwt != "" ){
            try{
                
                var decodedJWT = jwt.verify(jwtSTR, JWTKey);
                if ( decodedJWT == null || decodedJWT.uid == null ){
                    callback(null, "Invalid JWT provided");
                    return;
                }

                event.ws.decodedJWT = decodedJWT;
                event.ws.uid = decodedJWT.uid;

                //Check if we have an existing active session for this user
                //IN-MEMORY -> should be moved to shared memory in C++
                sharedmem = context.sharedmem;
                var cachedSession = sharedmem.getString(decodedJWT.uid + "", "SessionsList");

                //keep count of number of websockets opened for this user
                sharedmem.incInteger(decodedJWT.uid + "", 1, "SessionsCount");
                sharedmem.setString(event.ws.uid + "", "0", "SessionsFinished");

                //if ( sessionsList[decodedJWT.uid] == null ){
                if ( cachedSession == null || cachedSession == "" ){
                    //console.log(cachedSession);
                    //console.log(event);

                    //sessionsList[decodedJWT.uid] = (+new Date());
                    var newSessionID = (+new Date()) + "";
                    sharedmem.setString(decodedJWT.uid + "", newSessionID + "", "SessionsList");
                    sharedmem.setString(decodedJWT.uid + "_lastBeat", (+new Date()), "Heartbeats");
                    event.ws.sessionID = newSessionID;

                    //INSERT Start of session in logs table
                    var newSessionEvent = {"uid": decodedJWT.uid, "ctx": "", "wlid": wlid, "type": "Session", "title": "Start", "val": "", "data": {"sessionID": newSessionID, "userAgent": event.headers["user-agent"]}};
                    
                    if ( decodedJWT.firstname != null){
                        newSessionEvent.data.firstname = decodedJWT.firstname;
                    }
                    if ( decodedJWT.lastname != null){
                        newSessionEvent.data.lastname = decodedJWT.lastname;
                    }
                    if ( decodedJWT.email != null){
                        newSessionEvent.data.email = decodedJWT.email;
                    }

                    //console.log("newSessionEvent");
                    //console.log(newSessionEvent);

                    await DB.SaveEvent(newSessionEvent, event.ip, event.ws.country);

                    console.log("start of sessionID: " + newSessionID)
                }
                else{
                    event.ws.sessionID = cachedSession;
                    console.log("resuming of sessionID: " + cachedSession)
                }
                
                callback(null, "Monitoring started");
            }
            catch(ex){
                console.log("crash in monitor: ");
                console.log(ex);
                callback(null, ex.message);
                return;
            }
        }   

    }
    catch(ex){
        console.log(ex);
        console.log(ex.stack);
        console.log("Crash in OPEN");
    }
    

    callback(null, JSON.stringify({"status": "OK", "msg": "Monitoring Started"}));
};


var timeoutsList = {};

exports.message = async (event, context, callback) => {

    //console.log("MSG 0");
    try{

        //Do something with the message received from the client (echo, broadcast it, subscribe to a channel, execute some code ...)
        var msg = event.body;
        var obj = JSON.parse(msg);
        var decodedJWT = event.ws.decodedJWT;

        if ( (obj.ctx || obj.channel) != "public"){
            if ( event.ws.jwt != null && event.ws.jwt != "" ){
                try{
                    decodedJWT = jwt.verify(event.ws.jwt, JWTKey);
                    if ( decodedJWT == null || decodedJWT.uid == null ){
                        callback(null, JSON.stringify({"error": "Invalid JWT provided"}));
                        return;
                    }
                }
                catch(ex){
                    callback(null, JSON.stringify({"error": "Invalid JWT provided"}));
                    return;
                }
            }
            else{
                callback(null, JSON.stringify({"error": "You must provide a valid JWT to publish or subscribe to CTX: " + (obj.ctx || obj.channel) }));
                return;
            }
        }

        //add firstname, lastname, email to data object if available in jwt
        if ( obj.data == null ){
            obj.data = {};
        }
        if ( decodedJWT.firstname != null){
            obj.data.firstname = decodedJWT.firstname;
        }
        if ( decodedJWT.lastname != null){
            obj.data.lastname = decodedJWT.lastname;
        }
        if ( decodedJWT.email != null){
            obj.data.email = decodedJWT.email;
        }
        msg = JSON.stringify(obj);
        
        var resp = null;
        if ( obj.cmd == "event" ){

            //publish on the context (appid) channel
            //TODO: ensure the user have permission to publish to that ctx (appid)
            if ( obj.ctx != null && obj.ctx != ""){
                event.app.publish(obj.ctx, msg);
            }

            //Store in DB
            var result = await DB.SaveEvent(obj, event.ip, event.ws.country);
            
            //resp = result; //disabled because we don't need to confirm to the client
        }
        else if ( obj.cmd == "heartbeat" ){

            event.ws.isActive = true;
            sharedmem.setString(event.ws.uid + "_lastBeat", (+new Date()), "Heartbeats");
            sharedmem.setString(event.ws.uid + "_isActive", "1", "Heartbeats");
                       
            //cancel previous timeout if exist
            if ( timeoutsList[event.ws.sessionID] != null ){
                clearTimeout(timeoutsList[event.ws.sessionID]);
                //console.log("timeout cleared for session: " + event.ws.sessionID)
                delete timeoutsList[event.ws.sessionID];
            }
            
            timeoutsList[event.ws.sessionID] = setTimeout( async function(){
                event.ws.isActive = false;
                var lastHeartbeat = -1;               
                if ( event != null && event.ws != null ){
                    lastHeartbeat = sharedmem.getString(event.ws.uid + "_lastBeat", "Heartbeats");
                    if ( lastHeartbeat != "") {
                        lastHeartbeat = parseInt(lastHeartbeat);
                    }
                }
            }, maxDurationBeforeQuitSession);
            
        }
        else if ( obj.cmd == "subscribe" ){
            //subscribe the caller to his ctx channel
            //TODO: ensure the user is allowed to register this context (have permission for that appID)
            if ( obj.channel != null && obj.channel != ""){
                event.ws.subscribe(obj.channel);
                resp = {cmd: "subscriptionStatus", subscribed: true, channel: obj.channel};
            }
            else{
                resp = {cmd: "subscriptionStatus", subscribed: false, msg: "Channel not found or you don't have permission..."};
            }
        }
    
    }
    catch(ex){
        console.log(ex);
        console.log("Crash in Message");
    }

    

    //return the response to the websocket client (caller)
    if ( resp != null ){
        callback(null, JSON.stringify(resp));
    }
    
};

exports.close = async (event, context, callback) => {

    //check in 15 sec if the session was not reopened by another tab
    console.log("Closing websocket for sessionID: " + event.ws.sessionID);
    sharedmem.incInteger(event.ws.uid + "", -1, "SessionsCount");
    console.log("Remaining websockets for that uid: " + sharedmem.getInteger(event.ws.uid + "", "SessionsCount") );

    var remainingSockets = parseInt(sharedmem.getInteger(event.ws.uid + "", "SessionsCount"));

    //No more sockets open for that uid, let's wait 15 seconds to check if the user is going to reconnect
    //if not we will end the session
    if ( remainingSockets == 0 ){
        setTimeout( async function(){
            var lastHeartbeat = parseInt(sharedmem.getString(event.ws.uid + "_lastBeat", "Heartbeats"));
            var remainingSockets = parseInt(sharedmem.getInteger(event.ws.uid + "", "SessionsCount"));

            //check if session have already been ended elsewhere
            if ( sharedmem.getString(event.ws.uid + "", "SessionsFinished") == "1" ) {
                return; //session already ended by another thread
            }

            if ( lastHeartbeat + maxDurationBeforeQuitSession < (+new Date()) && remainingSockets == 0 ) {
                sharedmem.setString(event.ws.uid + "_isActive", "0", "Heartbeats");

                //lets close the session, no other thread have resumed that session in the last 15 seconds
                var activeTimeDuration = (+new Date()) - event.ws.startActiveTime;
                activeTimeDuration = activeTimeDuration / 1000;
                
                //INSERT end of session log
                var endSessionEvent = {"uid": event.ws.decodedJWT.uid, "ctx": "", "wlid": event.ws.wlid, "type": "Session", "title": "Stop", "val": "", "data": {"sessionID": event.ws.sessionID, "durationInSeconds": activeTimeDuration}};

                //add firstname, lastname, email to data object if available in jwt
                if ( event.ws.decodedJWT.firstname != null){
                    endSessionEvent.data.firstname = event.ws.decodedJWT.firstname;
                }
                if ( event.ws.decodedJWT.lastname != null){
                    endSessionEvent.data.lastname = event.ws.decodedJWT.lastname;
                }
                if ( event.ws.decodedJWT.email != null){
                    endSessionEvent.data.email = event.ws.decodedJWT.email;
                }
                await DB.SaveEvent(endSessionEvent, event.ip, event.ws.country);

                console.log("end of sessionID: " + event.ws.sessionID + ", Duration: " + activeTimeDuration);
                
                delete sessionsList[event.ws.decodedJWT.uid];
                event.ws.startActiveTime = null;
                sharedmem.setString(event.ws.uid + "", "", "SessionsList");
                sharedmem.setString(event.ws.uid + "", "1", "SessionsFinished");
            }
            else{
                console.log("sessionID: " + event.ws.sessionID + " is continued in another thread ... so we are not closing the session");
            }
        }, maxDurationBeforeQuitSession)
    }
            
    //here your response will be discarded because the websocket 
    //is already closed at clientside when we receive this event
    callback(null, null);
};
