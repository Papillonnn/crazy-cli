'use strict';

const cp = require("child_process");

function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}

function spinnerStart(text) {
    const { Spinner } = require('cli-spinner');

    const spinner = new Spinner(text || 'loading...');
    spinner.setSpinnerString('');
    spinner.setSpinnerString('|/-\\');
    spinner.start();
    return spinner;
}

function exec(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
    return cp.spawn(cmd, cmdArgs,  options || {});
}

function execAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = exec(command, args, options);
        p.on('error', e => {
            reject(e);
        })
        p.on('exit', c => {
            resolve(c);
        })
    })
}

module.exports = {
    isObject,
    spinnerStart,
    exec,
    execAsync,
};

