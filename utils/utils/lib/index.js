'use strict';

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

module.exports = {
    isObject,
    spinnerStart
};

