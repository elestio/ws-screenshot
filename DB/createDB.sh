# CREATE THE DB
docker exec timescaledb psql -U postgres -c "CREATE DATABASE ws_trail;";

# COPY SQL script to the container
docker cp ./createTables.sql timescaledb:/tmp/createTables.sql;

# CREATE Tables with the SQL script
docker exec timescaledb psql -U postgres -d ws_trail -a -f /tmp/createTables.sql;

# CREATE THE HYPERTABLE (TimescaleDB) ON THE TIME COLUMN
docker exec timescaledb psql -U postgres -d ws_trail -c "SELECT create_hypertable('logs', 'time');";
