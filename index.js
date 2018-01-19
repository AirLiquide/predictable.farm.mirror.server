var server = require('http').createServer();
var io = require('socket.io')(server);

var ports = {};
var currentConnections = {};
var clientConnected = {};

function getFreePort(ports) {
    for (var i = 30000; i <= 31000; i++) {
        if (ports[i] === undefined) {
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

io.on('connection', function (client) {
    client.on('get_port', function (name) {
        var port = getFreePort(ports);
        ports = assignPort(port, ports);

        clientConnected[port] = {name: name, tunnel: false};
        currentConnections[client.id] = port;

        client.broadcast.emit('ssh_items_list', clientConnected);

        io.to(client.id).emit('open_tunnel', port);
    });

    client.on('get_connected_clients', function () {
        io.to(client.id).emit('ssh_items_list', clientConnected);
    });

    client.on('reload_tunnel', function (port) {
        port = parseInt(port);
        for (var key in currentConnections) {
            if (currentConnections[key] === port) {
                io.to(key).emit('open_tunnel', port);
            }
        }
    });

    client.on('disconnect', function () {
        if (currentConnections[client.id] !== undefined) {
            delete clientConnected[currentConnections[client.id]];
            ports = unassignPort(currentConnections[client.id], ports);
            client.broadcast.emit('ssh_items_list', clientConnected);
        }
    });

    client.on('tunnel_ok', function (name) {
        for (var key in clientConnected) {
            if (clientConnected[key].name === name) {
                clientConnected[key].tunnel = true;
                client.broadcast.emit('ssh_items_list', clientConnected);
            }
        }
    });
});

server.listen(3000);