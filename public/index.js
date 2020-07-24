var socket = io();
var cm;
var cm_console;
var worker;
var run_timeout;

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
//Code editor
$('#run').click(e => {

});

function run() {
    cm_console.setValue('');
    var code = cm.getValue();
    code = code.split('console.log').join('postMessage');
    var blob = new Blob([code]);
    if (worker) {
        worker.terminate();
    }
    worker = new Worker(window.URL.createObjectURL(blob));
    worker.onmessage = function (message) {
        print(message.data);
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
    cm_console.setValue(cm_console.getValue() + newline + text);
    //I dont need escapeHtml because codemirror excapes it for me
}

function print_error(text) {
    var curr_length = cm_console.lineCount();
    var newline = '';
    if (cm_console.getValue().length > 0) {
        newline = '\n';
        curr_length++;
    }
    cm_console.setValue(cm_console.getValue() + newline + ' ' + text + ' ');
    cm_console.markText({ line: curr_length - 1, ch: 0 },
        { line: curr_length - 1, ch: cm_console.getLine(curr_length - 1).length },
        { className: "cm-error" });
}

function clearOutput() {
    $('#console').text('');
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
/*
 $('#run').click(event => {
    clearOutput();
    var code = '"use strict";' + cm.getValue();
    code = code.replaceAll('console.log','print');
    try {
        eval(code);
    } catch (e) {
        console.log(e.message);
    }
});

function print(text){
    $('#console').append(escapeHtml(text));
}

function clearOutput(){
    $('#console').text('');
}

function escapeHtml(unsafe) {
    if(unsafe == undefined){
        return '';
    }
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }*/