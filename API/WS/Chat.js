
exports.open = (event, context, callback) => {
    //Say hello or send a message to the client, increment number of connected users, ...
    event.ws.subscribe('mainChannel');
    callback(null, "Open from CloudGate! Thread: " + require('worker_threads').threadId);
};

exports.message = (event, context, callback) => {
    //Do something with the message received from the client (echo, broadcast it, subscribe to a channel, execute some code ...)

    if ( event.body != null && event.body != ""){
        event.app.publish('mainChannel', event.body);
    }
    
    //return the body received (echo)
    callback(null, null);
};

exports.close = (event, context, callback) => {
    // Do something like decrement number of users, close session,  ...
    
    //here your response will be discarded because the websocket 
    //is already closed at clientside when we receive this event
    callback(null, null);
};