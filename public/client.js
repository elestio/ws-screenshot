var head = document.getElementsByTagName('head')[0];

var script = document.createElement('script');
script.type = 'text/javascript';
script.src = "https://cdn.jsdelivr.net/npm/jquery@3.5.1/dist/jquery.min.js";
script.onreadystatechange = handler;
script.onload = handler;
head.appendChild(script);

function handler() {
    connect();
}

function connect() {
    var jwt = "";
    if ( _wsTrail_jwt != "" ){
        jwt = _wsTrail_jwt;
    }

    var protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    var rootURL = protocolPrefix + '//' + location.host;
    var ws = new WebSocket(rootURL + '/ws/monitor?jwt=' + jwt);
    var nbConnectRetry = 5;
    globalWS = ws;
    ws.onopen = function() {
        nbConnectRetry = 0;

        //subscribe to ctx channel
        Send({cmd: "subscribe", channel: _wsTrail_ctx });

        SendPendingQueue();
    };

    ws.onmessage = function(e) {
        var msg = e.data;
        //console.log('Message:', msg);

        $(_wsTrail_logSelector).append( sanitizeHTML(msg) + "<br/>");
        $('body').scrollTop($('body').height());
    };

    ws.onclose = function(e) {
        console.log('Socket is closed. Reconnect will be attempted in ' + nbConnectRetry + ' seconds.', e.reason);
        setTimeout(function() {
        connect();
        }, 1000*nbConnectRetry); //backoff mechanism
    };

    ws.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
        nbConnectRetry += 1;
    };
}

var sendQueue = [];
function SendEvent(eventType, eventTitle, eventValue, eventData){    
    
    var event = { cmd: "event", uid: _wsTrail_uid, ctx: _wsTrail_ctx, type: eventType, 
        title: eventTitle, val: eventValue, data: eventData, wlid: _wsTrail_wlid };
     Send(event);
}


function Send(event){    
    if ( globalWS.readyState != 1 ){
        //websocket is closed, add to the sendQueue, will be delivered when we are reconnected
        sendQueue.push(event);
        return;
    }
    globalWS.send( ( JSON.stringify(event)) );
}

function SendPendingQueue(){
    //Send queued events
    for (var i = 0; i < sendQueue.length; i++){
        Send(sendQueue[i]);
    }
    //clear the queue
    sendQueue = [];
}

var sanitizeHTML = function (str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};


/////// USAGE //////
// SendEvent("CREATE_PROJECT", "Title of this event ...", 1, {"toto": true, "tata": "yes", "test": 1230})
