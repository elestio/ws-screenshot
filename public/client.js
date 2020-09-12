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
    
    var protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    var rootURL = protocolPrefix + '//' + location.host;
    var ws = new WebSocket(rootURL + '/ws/screenshot');
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

        var obj = JSON.parse(msg);
        if ( obj.cmd == "responseScreenshot" ){
            $("#resultImg").attr("src", "data:image/jpeg;base64, " + obj.data);
            $("#stats").html("Processing time: " + obj.execTime + " - Roundtrip: " + ( (+new Date()) - obj.originalTS) + "ms" );
            $("#resultImg").show();
        }
        else{
            $(_wsTrail_logSelector).append( sanitizeHTML(msg) + "<br/>");
            $('body').scrollTop($('body').height());
        }
       
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
function AskForScreenshot(url){    
    $("#resultImg").hide();
    $("#stats").html("Please wait ...");
    var event = { cmd: "screenshot", url: url, originalTS: (+new Date()) };
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
