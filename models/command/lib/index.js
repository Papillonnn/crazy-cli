'use strict';

const semver = require('semver');
const colors = require('colors/safe');
const log = require('@crazy-cli/log');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
    constructor(argv) {
        if(!argv) {
            throw new Error('Command参数不能为空！');
        }
        if(!Array.isArray(argv)) {
            throw new Error('Command参数必须为数组！');
        }
        if(argv.length < 1) {
            throw new Error('Command参数列表为空');
        }
        this._argv = argv;
        const runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch(err => {
                log.error(err.message);
            });
        });
    }

    init() {
        throw new Error('必须实现init方法');
    }

    exec() {
        throw new Error('必须实现exec方法');
    }

    checkNodeVersion() {
        // get current node version
        const currentVersion = process.version;
        // compare current version with lowest version
        if(!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
            throw new Error(colors.red('当前node版本过低，请升级至 v' + LOWEST_NODE_VERSION));
        }
    }

    initArgs() {
        this._cmd = this._argv[this._argv.length - 1];
        this._argv = this._argv.slice(0, this._argv.length - 1);
    }
}

module.exports = Command;
