var DB = require("../DB.js");
var hardcodedAPIKey = require("../../appconfig.json").ApiKey;

exports.handler = async (event, context, callback) => {
    
    var beginPipeline = process.hrtime();

    //debug
    //var body = {"uid":"120", "ctx":"", "start":"", "end":"", "offset": 0, "token": "123615z1ef88136zg5e1"};
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
    var ctx = body.ctx;
    var start = body.start;
    var end = body.end;
    
    var offset = body.offset;
    var pageSize = 200;
    if ( offset == null || offset == ""){
        offset = 0;
    }

    var pageSize = body.pageSize;
    if ( pageSize == null || pageSize == ""){
        pageSize = 25;
    }

    var eventType = body.eventType;
    if ( eventType == null || eventType == ""){
        eventType = "";
    }

    var showSession = body.session;
    if ( showSession == null || showSession == ""){
        showSession = "";
    }

    var wlid = body.wlid;
    if ( wlid == null || wlid == ""){
        wlid = "";
    }
    
    if ( ApiKey != hardcodedAPIKey ){
        callback(null, {
            status: 400,
            content: "Invalid token provided"
        });
        return;
    }
    
    //TODO: ensure user is allowed to query this uid & ctx!

    var SQL = "SELECT * FROM logs WHERE 1=1 ";
    if ( uid != null && uid != "" ){
        SQL += " AND userID = '" + Clean(uid) + "' ";
    }
    if ( ctx != null && ctx != "" ){
        SQL += " AND context = '" + Clean(ctx) + "' ";
    }
    if ( start != null && start != "" ){
        SQL += " AND time >= '" + Clean(start) + "' ";
    }
    if ( end != null && end != "" ){
        SQL += " AND time <= '" + Clean(end) + "' ";
    }

    if ( eventType != "") {
        SQL += " AND eventtype = '" + Clean(eventType) + "' ";
    }

    if ( eventType != "Session" && showSession == false ) {
        SQL += " AND eventtype != 'Session' ";
    }

    if ( wlid != "") {
        SQL += " AND wlid = '" + Clean(wlid) + "' ";
    }

    //ORDER
    SQL += " ORDER BY time desc "

    //add a LIMIT & OFFSET
    SQL += " LIMIT " + pageSize + " OFFSET " + Clean(offset);

    
    
    var obj = await DB.Query(SQL, event.ip);
    
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    obj.processTime = durationMS.toFixed(2) + "ms";

    callback(null, {
            status: 200,
            content: obj, 
            headers:{
                "processTime": obj.processTime,
                "Content-Type": "application/json; charset=utf-8"
            }
    });

};



function Clean(txt){
    if ( txt == null ){
        return "";
    }
    else{
        return (txt + "").replace(/\'/g, "''");
    }
}