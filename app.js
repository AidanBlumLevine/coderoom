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
        socket.emit('created', Rooms.add(socket));
    });

    socket.on('room', (id) => {
        if (socket.rooms[id] === undefined && Rooms.has(id)) {
            socket.join(id, () => {
                socket.emit('connected', Rooms.status(id, socket));
            });
        } else {
            socket.emit('bad-room', id);
        }
    });

    socket.current_js_code = "";
    socket.on('update', (code) => {
        socket.current_js_code = code;
    });

    socket.on('disconnect', () => {
        var closed_room = socket.controlled_room
        if (closed_room !== undefined) {
            Rooms.close(socket);
        }
    });
});

setInterval(function() {
    Rooms.update();
}, 1000);

http.listen(5000, () => {
    console.log('listening on *:5000');
});