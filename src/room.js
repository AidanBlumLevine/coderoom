const { v1: uuid } = require('uuid');
module.exports = class Rooms {
    constructor(io) {
        this.io = io;
        this.rooms = [];
    }

    update() {
        this.rooms.forEach((room) => {

        });
    }

    add(owner) {
        if (owner.controlled_room !== undefined) { return; }
        var id = 0;
        while (id == 0 || this.find(id)) {
            id = Math.random().toString(36).slice(2, 8);
        }
        this.rooms.push({
            id: id,
            participants: [{
                owner: true,
                socket: owner,
                userid: uuid(),
                code: ""
            }],
        });
        owner.controlled_room = id;
        owner.emit('connected', this.status(id));
        return id;
    }

    join(socket, id) {
        socket.join(id, () => {
            this.find(id).participants.push({
                owner: false,
                socket: socket,
                userid: uuid(),
                code: ""
            });
            socket.emit('connected', this.status(id));
        });
    }

    close(owner) {
        var remove = owner.controlled_room;
        if (remove !== undefined) {
            this.find(remove).participants.forEach(participant => {
                participant.socket.leave(remove.id);
                participant.socket.emit('room_closed', participant.owner);
            })
            owner.controlled_room = undefined;
            this.rooms = this.rooms.filter((room) => {
                remove != room.id;
            });
        }
    }

    find(id) {
        var found = undefined;
        this.rooms.forEach(room => {
            if (room.id == id) {
                found = room;
            }
        });
        return found;
    }

    status(id) {
        var room = this.find(id);
        var simplified_participants = [];
        for (var i = 0; i < room.participants.length; i++) {
            simplified_participants.push({
                owner: room.participants[i].owner,
                socket: room.participants[i].socket.id,
                userid: room.participants[i].userid,
                code: room.participants[i].code     
            });
        }
        return {
            id: id,
            participants: simplified_participants
        }
    }

    update(socket, code) {
        this.rooms.forEach(room => {
            var participants = room.participants.filter(p => {
                p.socket === socket;
            });
            if (participants.length > 0) {
                participants[0].code = code;
            }
        })
    }
}