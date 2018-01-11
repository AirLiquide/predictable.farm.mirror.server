var server = require('http').createServer();
var io = require('socket.io')(server);

var ports = {};
var currentConnections = {};
var clientConnected = {};

function getFreePort(ports) {
    for(var i = 30000; i <= 31000; i++) {
        if(ports[i] === undefined) {
            return i;
        }
    }
}

function assignPort(port, ports) {
    ports[port] = true;
    return ports;
}

function unassignPort(port, ports) {
    ports[port] = undefined;
    return ports;
}

io.on('connection', function(client) {
    console.log("CONNECTED");

    client.on('get_port', function(name) {
        var port = getFreePort(ports);
        ports = assignPort(port, ports);

        clientConnected[port] = name;
        currentConnections[client.id] = port;

        client.broadcast.emit('ssh_items_list', clientConnected);

        io.to(client.id).emit('open_tunnel', port);
    });

    client.on('get_connected_clients', function() {
        io.to(client.id).emit('ssh_items_list', clientConnected);
    });

    client.on('disconnect', function() {
        delete clientConnected[currentConnections[client.id]];
        ports = unassignPort(currentConnections[client.id], ports);
        client.broadcast.emit('ssh_items_list', clientConnected);
        console.log('DISCONNECTED');
    });
});

server.listen(3000, function () {
    console.log('STARTED');
});