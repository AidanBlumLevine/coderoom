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
    $('.horizontal-flex').addClass('unflat-strong');
    cm = CodeMirror($('#inner-code')[0], {
        lineNumbers: true,
        theme: 't-light'
    });
    cm.on("change", function () {
        clearTimeout(run_timeout);
        run_timeout = setTimeout(run, 300);
    });
    cm.on("cursorActivity", function () {
        var cursor = cm.getCursor();
        var line = 'ln ' + cursor.line + '\xa0 ch ' + cursor.ch + '\xa0 javascript'
        $('#code').attr('after-content', line);
    });
    $('#code').attr('after-content', 'ln ' + 0 + '\xa0 ch ' + 0 + '\xa0 javascript');


    cm_console = CodeMirror($('#inner-console')[0], {
        theme: 't-console',
        readOnly: true,
        mode: 'text/plain'
    });
    setInterval(function () {
        cm.refresh();
        cm_console.refresh();
        other_cm_console.refresh();
    }, 1500);
    canvas = $('#canvas')[0];
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx = canvas.getContext('2d');
    ctx.save();

    //Other

    other_cm_console = CodeMirror($('.other-console')[0], {
        theme: 't-console',
        readOnly: true,
        mode: 'text/plain'
    });
    other_cm = CodeMirror($('.other-code')[0], {
        readOnly: true,
        lineNumbers: true,
        theme: 't-light'
    });
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
$('#canvas-title').click(e => {
    $('#canvas-help').addClass('show');
});
$('.close-canvas-help').click(e => {
    $('#canvas-help').removeClass('show');
})
$('.other-switch').click(e => {
    $('.other-console').toggleClass('hide');
    $('.other-canvas').toggleClass('hide');
    if($('.other-console').hasClass('hide')){
        $(this).text('click to switch to console');
    } else {
        $(this).text('click to switch to canvas');
    }
});


function run() {
    ctx.restore();
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cm_console.setValue('');
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
    cm_console.replaceRange(newline + ' ' + text + ' ', CodeMirror.Pos(cm_console.lastLine()));
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
    // this.filter = "none";
    // this.font = "10px sans-serif";
    // this.globalAlpha = 1.0;
    // this.globalCompositeOperation = "source-over";
    // this.imageSmoothingEnabled = true;
    // this.imageSmoothingQuality = ;
    // this.lineCap = ;
    // this.lineDashOffset = ;
    // this.lineJoin = ;
    // this.miterLimit = ;
    // this.shadowBlur = ;
    // this.shadowColor = ;
    // this.shadowOffsetX = ;
    // this.shadowOffsetY = ;
    // this.textAlign = ;
    // this.textBaseline = ;
};

CanvasRenderingContext2D.prototype['drawImage'] = function () {
    var msg = {
        type: 'image',
        args: Array.prototype.slice.call(arguments)
    }
    postMessage(JSON.stringify(msg));
};

["clearRect", "strokeRect", "fillRect", "fillText", "strokeText", "setLineDash", 
"createLinearGradient", "createRadialGradient", "createPattern", "beginPath", 
"closePath", "moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "arc", 
"arcTo", "ellipse", "rect", "fill", "stroke", "drawFocusIfNeeded", "clip", 
"rotate", "scale", "translate", "setTransform", "resetTransform"].forEach(function (methodName) {
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