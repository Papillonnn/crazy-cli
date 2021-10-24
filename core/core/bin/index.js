#! /usr/bin/env node

const importLocal = require('import-local');
const log = require('@crazy-cli/log');

if(importLocal(__filename)) {
    log.success('crazy-cli', '正在使用 crazy-cli 本地版本')
}else {
    require('../lib')();
}
