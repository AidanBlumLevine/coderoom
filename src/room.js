const { v1: uuid } = require('uuid');
module.exports = class Rooms {
    constructor(io) {
        this.io = io;
        this.rooms = [];
    }

    update_clients() {
        this.rooms.forEach((room) => {
            room.participants.forEach((participant) => {
                if (!participant.disconnected) {
                    participant.socket.emit('update', this.status(room.id));
                }
            })
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
            if (!room.participants[i].disconnected || room.participants[i].owner) { //send teacher even if they are disconnected
                simplified_participants.push({
                    owner: room.participants[i].owner,
                    socket: {
                        id: room.participants[i].socket.id,
                        name: room.participants[i].socket.username
                    },
                    userid: room.participants[i].userid,
                    code: room.participants[i].code
                });
            }
        }
        return {
            id: id,
            participants: simplified_participants
        }
    }

    update(socket, code) {
        this.rooms.forEach(room => {
            var participants = room.participants.filter(p => {
                return p.socket === socket;
            });
            if (participants.length > 0) {
                participants[0].code = code;
            }
        })
    }

    can_reconnect(info) {
        var room = this.find(info.id);
        if (room != undefined) {
            var found = room.participants.filter(p => {
                return p.userid === info.userid;
            });
            if (found.length > 0) {
                return true;
            }
        }
        return false;
    }

    reconnect(socket, info) {
        var room = this.find(info.id);
        if (room != undefined) {
            var found = room.participants.filter(p => {
                return p.userid === info.userid;
            });
            if (found.length > 0) {
                found[0].disconnected = undefined;
                socket.emit('name', found[0].socket.username);
                socket.username = found[0].socket.username;
                socket.controlled_room = found[0].socket.controlled_room;
                found[0].socket = socket;
                socket.emit('connected', this.status(room.id));
            }
        }
    }

    disconnect(socket) {
        this.rooms.forEach(room => {
            var leaving = room.participants.filter(p => {
                return p.socket === socket;
            });
            if (leaving.length > 0) {
                leaving[0].disconnected = true;
                if (leaving[0].owner) {
                    room.participants.forEach(participant => {
                        participant.socket.emit('disconnect_teacher', '');
                    })
                } else {
                    var owner = room.participants.filter(p => {
                        return p.owner;
                    })[0];
                    owner.socket.emit('disconnect_student', leaving[0].userid);
                }
                if(room.participants.filter(p => {
                    return !p.disconnected;
                }).length == 0){
                    this.rooms.splice(this.rooms.indexOf(room), 1);
                }
            }
        });
    }
}