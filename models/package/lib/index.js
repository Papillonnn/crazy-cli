'use strict';

const path = require('path');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists').sync;
const fse = require('fs-extra');
const npmInstall = require('npminstall');
const { isObject } = require('@crazy-cli/utils');
const formatPath = require('@crazy-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@crazy-cli/get-npm-info');

class Package {
    constructor(options) {
        if(!options) {
            throw new Error('Package类options参数不能为空');
        }if(!isObject(options)) {
            throw new Error('Package类options参数必须为对象');
        }
        // package的目标路径
        this.targetPath = options.targetPath;
        // 缓存package的路径
        this.storeDir = options.storeDir;
        this.packageName = options.packageName;
        this.packageVersion = options.packageVersion;
        // 缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_');
    }

    // _@imooc-cli_init@1.1.2@@imooc-cli
    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
    }
    getSpecificCacheFilePath(version) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${version}@${this.packageName}`);
    }

    async prepare() {
        if(this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }
        if(this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName);
        }
    }

    // 判断当前package是否存在
    async exists() {
        if(this.storeDir) {
            await this.prepare();
            return pathExists(this.cacheFilePath);
        } else {
            return pathExists(this.targetPath);
        }
    }

    async install() {
        await this.prepare();
        return await npmInstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [
                { name: this.packageName, version: this.packageVersion }
            ]
        })
    }

    async update() {
        await this.prepare();
        // 1.获取最新的npm模块版本号
        const latestVersion = await getNpmLatestVersion(this.packageName);
        // 2.查询最新版本号对应的路径是否存在
        const latestCacheFilePath = this.getSpecificCacheFilePath(latestVersion);
        // 3.如果不存在，则直接安装最新版本
        if(!pathExists(latestCacheFilePath)) {
            await npmInstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [
                    { name: this.packageName, version: latestVersion }
                ]
            })
            this.packageVersion = latestVersion;
        }
    }

    // 获取入口文件的路径
    getRootFile() {
        // 1.获取package.json所在目录 -> pkg-dir
        // 2.读取package.json -> require() js/json/node
        // 3.寻找main或lib，解析成路径
        // 4.路径的兼容（mac/windows）
        if(this.storeDir) {
            return _getRootFile(this.cacheFilePath);
        } else {
            return _getRootFile(this.targetPath);
        }
        function _getRootFile(targetPath) {
            const pkgPath = pkgDir(targetPath);
            if(pkgPath) {
                const pkgFile = require(path.resolve(pkgPath, 'package.json'));
                if(pkgFile && pkgFile.main) {
                    return formatPath(path.resolve(pkgPath, pkgFile.main));
                }
            }
            return null;
        }
    }
}

module.exports = Package;
