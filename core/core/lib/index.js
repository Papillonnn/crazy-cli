
'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const pkg = require('../package.json');
const log = require('@crazy-cli/log');
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./const');

let args, config;

async function core() {
    try {
        checkPkgVersion();
        checkNodeVersion();
        checkRoot();
        checkUserHome();
        checkInputArgs();
        checkEnv();
        await checkGlobalUpdate();
    } catch (e) {
        log.error(e.message);
    }
}

function checkPkgVersion() {
    log.notice('cli', pkg.version);
}

function checkNodeVersion() {
    // get current node version
    const currentVersion = process.version;
    // compare current version with lowest version
    if(!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
        throw new Error(colors.red('当前node版本过低，请升级至 v' + LOWEST_NODE_VERSION));
    }
}

// Try to downgrade the permissions of a process with root privileges and block access if it fails
function checkRoot() {
    const rootCheck = require('root-check');
    rootCheck();
}

function checkUserHome() {
    if(!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在！'));
    }
}

function checkInputArgs() {
    const minimist = require('minimist');
    args = minimist(process.argv.slice(2));
    checkArgs();
}

function checkArgs() {
    if(args.debug) {
        process.env.LOG_LEVEL = 'verbose';
    } else {
        process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
}

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if(pathExists(dotenvPath)) {
        config = dotenv.config({ path: dotenvPath });
    }
    createDefaultConfig();
    log.verbose('env', process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome,
    }
    if(process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

async function checkGlobalUpdate() {
    const { getNpmSemverVersion } = require('@crazy-cli/get-npm-info');
    // get current version and module name
    // const currentVersion = pkg.version;
    const currentVersion = '1.0.6';
    // const npmName = pkg.name;
    const npmName = '@imooc-cli/core';
    // get all versions via npm API
    const latestVersion = await getNpmSemverVersion(currentVersion, npmName);
    if(latestVersion && semver.gt(latestVersion, currentVersion)) {
        log.warn(colors.yellow(`请手动更新至最新版本 ${latestVersion}，当前版本 ${currentVersion}，更新命令：npm install -g ${npmName}`));
    }
}