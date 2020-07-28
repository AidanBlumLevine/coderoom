var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var _rooms = require('./src/room');
var Rooms = new _rooms(io);

app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    socket.on('name', (name) => {
        socket.username = name;
        socket.emit('name', name);
    });
    socket.on('create', () => {
        Rooms.add(socket);
    });

    socket.on('room', (id) => {
        if (socket.rooms[id] == undefined && Rooms.find(id) != undefined) {
            Rooms.join(socket, id);
        } else {
            socket.emit('bad-room', id);
        }
    });

    socket.on('update', (code) => {
        Rooms.update(socket, code);
    });

    socket.on('disconnect', () => {
        // var closed_room = socket.controlled_room;
        // if (closed_room) {
        //     Rooms.close(socket);
        // }
        Rooms.disconnect(socket);
    });
});

setInterval(function () {
    Rooms.update_clients();
}, 1000);

http.listen(5000, () => {
    console.log('listening on *:5000');
});