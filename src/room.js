module.exports = class Rooms {
    constructor(io) {
        this.io = io;
        this.rooms = [];
    }

    add(owner) {
        if (owner.controlled_room !== undefined) { return; }
        var id = Math.random().toString(36).slice(2, 8);
        while (this.has(id)) {
            id = Math.random().toString(36).slice(2, 8);
        }
        this.rooms.push({
            id: id,
            owner: owner
        });
        owner.controlled_room = id;
        return id;
    }

    close(owner) {
        var remove = owner.controlled_room;
        if (remove !== undefined) {
            this.io.in(remove.id).clients((err, clients) => {
                clients.forEach(client => {
                    var socket = this.io.sockets.connected[client];
                    socket.leave(remove.id);
                    socket.emit('room_closed', socket === owner);
                });
            });
            owner.controlled_room = undefined;
            this.rooms = this.rooms.filter((room) => {
                remove != room;
            });
        }
    }

    has(id) {
        var found = false;
        this.rooms.forEach(room => {
            if (room.id == id) {
                found = true;
            }
        });
        return found;
    }

    status(id) {
        return 'statussss';
    }
}