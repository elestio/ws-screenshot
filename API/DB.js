const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'postgres',
  password: '8ed89611-dff5-444f-867c-c66098a349cd',
  host: '172.17.0.1',
  database: 'ws_trail',
  port: 5432,
  max: 4
})

module.exports.SaveEvent = async function (data, sourceIP, country) {

    var userID = data.uid;
    var context = data.ctx;
    var eventType = data.type;
    var eventTitle = data.title;
    var eventValue = data.val;
    var eventData = data.data;
    var wlid = data.wlid;

    if ( country != null && country != ""){
        if ( eventData == null ){
            eventData = {};
        }
        eventData.country = country;
    }
    
    var SQL = `INSERT INTO Logs (time, userID, context, eventType, eventTitle, eventValue, eventData, sourceIP, wlid)
    VALUES (NOW(), '${Clean(userID)}', '${Clean(context)}', '${Clean(eventType)}', '${Clean(eventTitle)}', 
    '${Clean(eventValue)}', '${Clean(JSON.stringify(eventData))}', '${sourceIP}', '${Clean(wlid)}' ) RETURNING time;`

    //console.log(SQL);

    var rez = null;
    try{
        rez = await pool.query(SQL);
    }
    catch(ex){
        console.log("Crash in SQL Query for SaveEvent: " + SQL);
        var obj = { count: 0, command: "INVALID_QUERY", time: 0 };
        return obj
    }
    //console.log(rez);
    var obj = { count: rez.rowCount, command: rez.command, time: rez.rows[0].time };
    return obj
}

module.exports.Query = async function (SQL, sourceIP) {
    var rez = await pool.query(SQL);
    //console.log(rez);
    var obj = { count: rez.rowCount, rows: rez.rows };
    return obj
}

module.exports.StartOrUpdateSession = async function (data, sourceIP, userAgent) {

    var userID = data.uid;
    
    var context = data.ctx;
    if ( context == null ){
        context = "";
    }

    var wlid = data.wlid;
    
    if ( wlid == null || wlid == "" ){
        wlid = -1;
    }
    else{
        try{
            wlid = parseInt(wlid);
        }catch(ex){}
    }


    var SQLSearch = `SELECT * FROM sessions WHERE lastupdate > ( now()::timestamp - INTERVAL '1 min' )::timestamp ORDER BY id desc LIMIT 1`;
    var rezSearch = await pool.query(SQLSearch);

    if ( rezSearch.rowCount == 0 ){
        var SQL = `INSERT INTO sessions (start_time, is_active, wlid, userid, context, total_time, active_time, idle_time, user_agent, sourceip, lastupdate)
        VALUES (NOW(), '1', '${Clean(wlid)}', '${Clean(userID)}', '${Clean(context)}', 0, 0, 0, '${Clean(userAgent)}', '${sourceIP}', NOW() ) RETURNING id;`
        var rez = await pool.query(SQL);
        //console.log(rez);
        var obj = { count: rez.rowCount, command: rez.command, sessionID: rez.rows[0].id };
        return obj
    }
    else{
        var timeDiffInMinutes = `extract(epoch from (NOW()::timestamp - start_time::timestamp))::integer`;
        var SQL = `UPDATE sessions SET is_active = '1', total_time = ${timeDiffInMinutes}, lastupdate = NOW() WHERE id = '${rezSearch.rows[0].id}';`
        var rez = await pool.query(SQL);
        //console.log(rez);
        var obj = { count: rez.rowCount, command: rez.command, sessionID: rezSearch.rows[0].id };
        return obj
    }

}

module.exports.UpdateSession = async function (sessionID, active_time, is_active) {

    var timeDiffInMinutes = `extract(epoch from (NOW() - start_time::timestamp))::integer`;

    var SQL = `UPDATE sessions SET is_active = '${Clean(is_active)}', total_time = ${timeDiffInMinutes}, active_time = active_time + ${active_time}, idle_time = (${timeDiffInMinutes}) - (active_time + ${active_time}), lastupdate = NOW() WHERE id = '${sessionID}';`
    //console.log(SQL);

    var rez = await pool.query(SQL);
    
    var obj = { count: rez.rowCount, command: rez.command, sessionID: sessionID };
    return obj

}

module.exports.CloseSession = async function (sessionID) {

    /*
    var timeDiffInMinutes = `(DATE_PART('day', end_time::timestamp - start_time::timestamp) * 24 + 
               DATE_PART('hour', end_time::timestamp - start_time::timestamp)) * 60 +
               DATE_PART('minute', end_time::timestamp - start_time::timestamp)`;
    */

    var timeDiffInMinutes = `extract(epoch from (NOW()::timestamp - start_time::timestamp))::integer`;

    var SQL = `UPDATE sessions SET end_time = NOW(), is_active = '0', total_time = ${timeDiffInMinutes}, idle_time = (${timeDiffInMinutes}) - (active_time), lastupdate = NOW() WHERE id = '${sessionID}';`
    var rez = await pool.query(SQL);
    //console.log(rez);
    var obj = { count: rez.rowCount, command: rez.command, sessionID: sessionID };
    return obj

}

function Clean(txt){
    if ( txt == null ){  return ""; }
    else{ return (txt + "").replace(/\'/g, "''"); }
}