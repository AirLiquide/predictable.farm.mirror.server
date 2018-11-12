/*
  Copyright (C) Air Liquide S.A,  2017-2018
  Author: Sébastien Lalaurette and Cyril Chapellier, La Factory, Creative Foundry
  This file is part of Predictable Farm project.

  The MIT License (MIT)

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
   
  See the LICENSE.txt file in this repository for more information.
*/

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
