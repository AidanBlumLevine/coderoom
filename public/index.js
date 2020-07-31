var socket = io();
var workers = {};
var run_timeout;
var owner = false;
var changed = false; //queue for updating server
var reconnect; //cached cookie
socket.on('name', name => {
    $('.naming').addClass('flat').parent().addClass('hide-left');
    $('.room').addClass('unflat').parent().addClass('hide-left');
    $('.header').addClass('show');
    $('.name').text(name);
});
socket.on('connected', room => {
    var this_p = room.participants.filter(p => {
        return p.socket.id == socket.id;
    })[0];
    owner = this_p.owner;

    set_reconnect({
        name: $('#name').val(),
        userid: this_p.userid,
        id: room.id,
        owner: owner
    });

    $('.id').text(room.id);
    if (owner) {
        $('.teacher-code-toggle').hide();
    } else {
        $('.student-area-sizer').hide();
    }

    $('.content').parent().addClass('hide-left-double');
    $('.room').removeClass('unflat').addClass('flat').parent().addClass('hide-left-double');
    $('.horizontal-flex').addClass('unflat-strong');
    var cm = CodeMirror($('#inner-code')[0], {
        lineNumbers: true,
        theme: 't-light'
    });
    cm.setValue(this_p.code);
    cm.on("change", function () {
        clearTimeout(run_timeout);
        changed = true;
        run_timeout = setTimeout(function () {
            run(workers['local']);
        }, 300);
    });
    setInterval(function () {
        if (changed) {
            changed = false;
            socket.emit('update', cm.getValue());
        }
        update_times();
    }, 1000);
    cm.on("cursorActivity", function () {
        var cursor = cm.getCursor();
        var line = 'ln ' + cursor.line + '\xa0 ch ' + cursor.ch + '\xa0 javascript'
        $('#code').attr('after-content', line);
    });
    $('#code').attr('after-content', 'ln ' + 0 + '\xa0 ch ' + 0 + '\xa0 javascript');
    var cm_console = CodeMirror($('#inner-console')[0], {
        theme: 't-console',
        readOnly: true,
        mode: 'text/plain'
    });

    setTimeout(function () { //all this does is fix misalligned line numbers
        workers['local'].code.refresh();
    }, 1500);

    $(window).on('resize', function () {
        $('canvas').each(function (index) {
            var c = $(this)[0];
            c.width = c.offsetWidth;
            c.height = c.offsetHeight;
        });
        $('#canvas-title').attr('canvas-label', 'html canvas \xa0' + workers['local'].canvas.width + ' x ' + workers['local'].canvas.height);
        for (var id in workers) {
            run(workers[id]);
        }
    });

    var ctx = canvas.getContext('2d');
    ctx.save();
    workers['local'] = {
        console: cm_console,
        code: cm,
        canvas: canvas,
        ctx: ctx
    }

    var other_cm_console = CodeMirror($('.other-console')[0], {
        theme: 't-console',
        readOnly: true,
        mode: 'text/plain'
    });
    var other_cm = CodeMirror($('.other-code')[0], {
        readOnly: true,
        lineNumbers: true,
        theme: 't-light',
        cursorBlinkRate: -1
    });
    var other_canvas = $('.other-canvas-obj')[0];
    var other_ctx = other_canvas.getContext('2d');
    other_ctx.save();

    workers['teacher'] = {
        console: other_cm_console,
        code: other_cm,
        canvas: other_canvas,
        ctx: other_ctx
    }

    $(window).trigger('resize');
});

socket.on('update', room => {
    if (owner) {
        room.participants.forEach(p => {
            if (!p.owner) {
                if ($('.student[userid="' + p.userid + '"]').length == 0) {
                    $('.no-students').remove();
                    var new_student = $('.student:hidden').clone();
                    new_student.removeAttr('hidden').attr('userid', p.userid);
                    new_student.appendTo('.student-area-sizer');
                    new_student.attr('name', p.socket.name);
                    new_student.find('.student-name').text(p.socket.name);
                    var c = new_student.find('canvas')[0];
                    c.width = c.offsetWidth;
                    c.height = c.offsetHeight;
                    var student_code = CodeMirror(new_student.find('.student-code')[0], {
                        readOnly: true,
                        lineNumbers: true,
                        theme: 't-light',
                        cursorBlinkRate: -1
                    });
                    var student_console = CodeMirror(new_student.find('.student-console')[0], {
                        theme: 't-console',
                        readOnly: true,
                        mode: 'text/plain'
                    });
                    var student_canvas = new_student.find('canvas')[0];
                    var student_ctx = student_canvas.getContext('2d');
                    student_ctx.save();
                    workers[p.userid] = {
                        console: student_console,
                        code: student_code,
                        canvas: student_canvas,
                        ctx: student_ctx,
                        last_edit: new Date()
                    }
                }
                var code_instance = workers[p.userid].code;
                if (code_instance.getValue() != p.code) {
                    workers[p.userid].last_edit = new Date();
                    var scrollInfo = code_instance.getScrollInfo();
                    code_instance.setValue(p.code);
                    code_instance.scrollTo(scrollInfo.left, scrollInfo.top);
                    run(workers[p.userid]);
                }
            }
        });
    } else {
        room.participants.forEach(p => {
            if (p.owner) {
                var code_instance = workers['teacher'].code;
                if (code_instance.getValue() != p.code) {
                    var scrollInfo = code_instance.getScrollInfo();
                    code_instance.setValue(p.code);
                    code_instance.scrollTo(scrollInfo.left, scrollInfo.top);
                    run(workers['teacher']);
                }
            }
        });
    }
});
socket.on('bad-room', id => {
    $('#id').addClass('error');
});
socket.on('disconnect_student', userid => {
    if (workers[userid].worker) {
        workers[userid].worker.terminate();
    }
    delete workers[userid];
    $('.student[userid="' + userid + '"]').remove();
    if ($('.student:visible').length == 0) {
        $('.student-area-sizer').html('<div class="no-students">students will appear here once they join</div>');
    }
});


$('#submit').click(e => {
    if ($('#name').val().trim().length == 0) {
        $('#name').addClass('error');
    } else {
        socket.emit('name', $('#name').val());
    }
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
$('.teacher-code-toggle').click(e => {
    $('.teacher-code-window').toggleClass('hidden');
    if ($('.teacher-code-window').hasClass('hidden')) {
        $('.teacher-code-toggle').text('click to show teacher\'s code, canvas and console');
    } else {
        workers['teacher'].code.refresh();
        workers['teacher'].console.refresh();
        var c = $('.other-canvas-obj')[0];
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        run(workers['teacher']);
        $('.teacher-code-toggle').text('click to hide teacher\'s code, canvas and console');
    }
});

$(document).ready(() => {
    if (document.cookie.length > 0) {
        reconnect = JSON.parse(document.cookie.split('reconnect=')[1]);
        socket.emit('can_reconnect', {
            id: reconnect.id,
            userid: reconnect.userid
        });
    }
});

socket.on('can_reconnect', () => {
    $('.reconnect').show();
    $('.reconnect').click(e => {
        socket.emit('do_reconnect', {
            id: reconnect.id,
            userid: reconnect.userid
        });
    });
});


function update_times() {
    $('.student:visible').each(function (index) {
        var w = workers[$(this).attr('userid')];
        var ago = Math.floor((new Date().getTime() - w.last_edit.getTime()) / 1000);
        if (ago < 1) {
            ago = 'now';
        } else {
            ago = ago + " seconds ago"
        }
        $(this).find('.student-edited').text("edited " + ago);
    });
}

function run(w) {
    w.ctx.restore();
    w.ctx.save();
    w.ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
    w.console.setValue('');

    var code = w.code.getValue();
    code = code.split('console.log').join('console_log');
    code = worker_addons + '\n' + code;
    var blob = new Blob([code]);
    if (w.worker) { w.worker.terminate(); }
    w.worker = new Worker(window.URL.createObjectURL(blob));

    w.worker.onmessage = function (message) {
        var msg = JSON.parse(message.data);
        if (msg.type == 'console') {
            var newline = '';
            if (w.console.getValue().length > 0) {
                newline = '\n';
            }
            w.console.replaceRange(newline + msg.message, CodeMirror.Pos(w.console.lastLine()));
        }
        if (msg.type == 'canvas') {
            var attributes = msg.attributes;
            for (var a in attributes) {
                w.ctx[a] = attributes[a];
            }
            var method = w.ctx[msg.method];
            method.apply(w.ctx, msg.args);
        }
        if (msg.type == 'image') {
            var img = new Image();
            img.onload = function () {
                if (msg.args.length == 5) {
                    w.ctx.drawImage(img, msg.args[1], msg.args[2], msg.args[3], msg.args[4]);
                } else {
                    w.ctx.drawImage(img, msg.args[1], msg.args[2]);
                }
            };
            img.src = msg.args[0];
        }
    }

    w.worker.onerror = function (error) {
        var curr_length = w.console.lineCount();
        var newline = '';
        if (w.console.getValue().length > 0) {
            newline = '\n';
            curr_length++;
        }
        w.console.replaceRange(newline + ' ' + error.message + ' ', CodeMirror.Pos(w.console.lastLine()));
        w.console.markText({ line: curr_length - 1, ch: 0 },
            { line: curr_length - 1, ch: w.console.getLine(curr_length - 1).length },
            { className: "cm-error" });
    }
}

function set_reconnect(reconnect_data) {
    var d = new Date();
    d.setTime(d.getTime() + (24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = 'reconnect =' + JSON.stringify(reconnect_data) + ";" + expires + ";path=/";
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