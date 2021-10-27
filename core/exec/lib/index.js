'use strict';

const path = require('path');
const Package = require('@crazy-cli/package');
const log = require('@crazy-cli/log');

const SETTINGS = {
    init: '@imooc-cli/init',
}
const CACHE_DIR = 'dependencies';

async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH;
    const homePath = process.env.CLI_HOME_PATH;
    let storeDir = '';
    let pkg;
    log.verbose('targetPath', targetPath);
    log.verbose('homePath', homePath);

    const cmdObj = arguments[arguments.length - 1];
    const packageName = SETTINGS[cmdObj.name()];
    const packageVersion = 'latest';

    if(!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
        storeDir = path.resolve(targetPath, 'node_modules');
        log.verbose('targetPath', targetPath);
        log.verbose('storeDir', storeDir);

        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion
        });
        if(await pkg.exists()) {
            // 更新package
            await pkg.update();
        } else {
            await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion
        });
    }

    const rootFile = pkg.getRootFile();
    log.verbose('rootFile', rootFile);
    if(rootFile) {
        require(rootFile).apply(null, arguments);
    }
}

module.exports = exec;
