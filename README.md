# ws-screenshot
## Fast websocket + rest api based screenshot server
&nbsp;

# Requirements

- Linux, Windows or Mac OS
- Node 10+ for single-threaded mode, Node 12+ for multi-threaded mode

if you are on Node 10, you can activate multi-threading by executing this in your terminal:

    export NODE_OPTIONS=--experimental-worker


## Install Node.js 12
    sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
    curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
    sudo apt -y install nodejs
&nbsp;

# Install ws-screenshot server

First, let's start TimescaleDB with docker. This create a docker service for PostgreSQL + TimescaleDB module

    ./DB/startTimescaleDB.sh

Then create the DB & tables in the container named "timescaledb":

    ./DB/createDB.sh

then install NPM dependencies for ws-screenshot:
    
    npm install
&nbsp;

# Run ws-screenshot


## Run directly

Finally we can start WS-SCREENSHOT Server one-time:
    
    ./run.sh

or 

    npm run server

## Run with docker
Run just once

    docker build -t ws-screenshot .
    docker run -p 3000:3000 -it ws-screenshot

Run as a docker service

    docker run -p 3000:3000 -it ws-screenshot -d --restart always