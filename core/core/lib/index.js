
'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const { program } = require('commander');
const pkg = require('../package.json');
const log = require('@crazy-cli/log');
const init = require('@crazy-cli/init');
const exec = require('@crazy-cli/exec');
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./const');

let config;

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch (e) {
        log.error(e.message);
    }
}

async function prepare() {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    // await checkGlobalUpdate();
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

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if(pathExists(dotenvPath)) {
        config = dotenv.config({ path: dotenvPath });
    }
    createDefaultConfig();
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

function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec)

    program.on('option:debug', function() {
        if(program.opts().debug) {
            process.env.LOG_LEVEL = 'verbose';
        } else {
            process.env.LOG_LEVEL = 'info';
        }
        log.level = process.env.LOG_LEVEL;
        log.verbose('debug mode');
    })

    // add targetPath to env
    program.on('option:targetPath', function() {
        process.env.CLI_TARGET_PATH = program.opts().targetPath;
    })

    // listen for unknown commands
    program.on('command:*', function(cmdObj) {
        const availableCommands = program.commands.map(command => command.name());
        console.log(colors.red(`未知的命令：${cmdObj[0]}`));
        if(availableCommands.length > 0) {
            console.log(colors.red(`可用命令：${availableCommands.join(',')}`));
        }
    })

    program.parse(process.argv);

    if(program.args && !program.args.length) {
        program.outputHelp();
    }
}
