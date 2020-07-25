var socket = io();
var cm;
var cm_console;
var worker;
var run_timeout;
var canvas;
var ctx;
socket.on('name', name => {
    $('.naming').addClass('flat').parent().addClass('hide-left');
    $('.room').addClass('unflat').parent().addClass('hide-left');
    $('.header').addClass('show');
    $('.name').text(name);
});
socket.on('connected', id => {
    $('.id').text(id);
    $('.content').parent().addClass('hide-left-double');
    $('.room').removeClass('unflat').addClass('flat').parent().addClass('hide-left-double');
    $('.content').find('.box-flat').addClass('unflat');
    cm = CodeMirror($('#code')[0], {
        lineNumbers: true,
        theme: 't-light'
    });
    cm.on("change", function () {
        clearTimeout(run_timeout);
        run_timeout = setTimeout(run, 300);
    });
    cm_console = CodeMirror($('#console')[0], {
        theme: 't-console',
        readOnly: true,
        mode: 'text/plain'
    });
    cm_console.setSize(500, 300);
    cm.setSize(500, 300);
    setTimeout(function () {
        cm.refresh();
    }, 1500);
    canvas = $('#canvas')[0];
    ctx = canvas.getContext('2d');
});
socket.on('bad-room', id => {
    $('#id').addClass('error');
});
socket.on('created', id => {
    socket.emit('room', id);
})
$('#submit').click(e => {
    socket.emit('name', $('#name').val());
});
$('#join').click(e => {
    socket.emit('room', $('#id').val());
    $('#id').removeClass('error');
});
$('#create').click(e => {
    socket.emit('create', '');
});


function run() {
    cm_console.setValue('');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var code = cm.getValue();
    code = code.split('console.log').join('console_log');
    code = worker_addons + '\n' + code;
    var blob = new Blob([code]);
    if (worker) {
        worker.terminate();
    }
    worker = new Worker(window.URL.createObjectURL(blob));
    worker.onmessage = function (message) {
        var msg = JSON.parse(message.data);
        if (msg.type == 'console') {
            print(msg.message);
        }
        if (msg.type == 'canvas') {
            var attributes = msg.attributes;
            for (var a in attributes) {
                ctx[a] = attributes[a];
            }
            var method = ctx[msg.method];
            if (typeof method === "function") {
                //if (method.length === msg.args.length) {
                method.apply(ctx, msg.args);
                // } else if (method.length > msg.args.length) {
                //     print_error('TypeError: Not enough arguments');
                // } else {
                //     print_error('TypeError: Too many arguments');
                // }
            } else {
                print_error('TypeError: ' + msg.method + 'is not a function.');
            }
        }
        if (msg.type == 'image') {
            var img = new Image();
            img.onload = function () {
                if (msg.args.length == 5) {
                    ctx.drawImage(img, msg.args[1], msg.args[2], msg.args[3], msg.args[4]);
                } else {
                    ctx.drawImage(img, msg.args[1], msg.args[2]);
                }
            };
            img.src = msg.args[0];
        }
    }
    worker.onerror = function (error) {
        print_error(error.message);
    }
}

function print(text) {
    var newline = '';
    if (cm_console.getValue().length > 0) {
        newline = '\n';
    }
    cm_console.replaceRange(newline + text, CodeMirror.Pos(cm_console.lastLine()));
    //I dont need escapeHtml because codemirror excapes it for me
}

function print_error(text) {
    var curr_length = cm_console.lineCount();
    var newline = '';
    if (cm_console.getValue().length > 0) {
        newline = '\n';
        curr_length++;
    }
    cm_console.replaceRange(newline + ' ' + text + ' ' + text, CodeMirror.Pos(cm_console.lastLine()));
    cm_console.markText({ line: curr_length - 1, ch: 0 },
        { line: curr_length - 1, ch: cm_console.getLine(curr_length - 1).length },
        { className: "cm-error" });
}

function escapeHtml(unsafe) {
    if (unsafe == undefined) {
        return '';
    }
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

//CANVAS EMULATOR
var worker_addons = `

var CanvasRenderingContext2D = function () {
    this.fillStyle = "black";
    this.strokeStyle = "black";
    this.lineWidth = 1.0;
};

CanvasRenderingContext2D.prototype['drawImage'] = function () {
    var msg = {
        type: 'image',
        args: Array.prototype.slice.call(arguments)
    }
    postMessage(JSON.stringify(msg));
};

["fillRect", "strokeRect", "beginPath", "rotate", "stroke"].forEach(function (methodName) {
    CanvasRenderingContext2D.prototype[methodName] = function () {
        var msg = {
            type: 'canvas',
            method: methodName,
            args: Array.prototype.slice.call(arguments),
            attributes: this
        }
        postMessage(JSON.stringify(msg));
    };
});

ctx = new CanvasRenderingContext2D;

function console_log(message) {
    var msg = {
        type: 'console',
        message: message
    }
    postMessage(JSON.stringify(msg));
}

`;