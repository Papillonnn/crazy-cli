'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const ejs = require('ejs');
const glob = require('glob');
const semver = require('semver');
const userHome = require('user-home');
const inquirer = require('inquirer');
const Command = require('@crazy-cli/command');
const Package = require('@crazy-cli/package');
const log = require('@crazy-cli/log');
const { spinnerStart, execAsync } = require('@crazy-cli/utils');

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMAND = ['npm', 'cnpm'];

class InitCommand extends Command {

    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._cmd.force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    async exec() {
        try {
            await this.prepare();
            if(this.projectInfo) {
                log.verbose('projectInfo', this.projectInfo);
                // 下载模板
                await this.downloadTemplate();
                // 安装模板
                await this.installTemplate();
            }
        } catch (e) {
            log.error(e.message);
        }
    }

    async prepare() {
        // 0. 判断项目模板是否存在
        const template = await getProjectTemplate();
        if(!template || !template.length) {
            throw new Error('项目模板不存在');
        }
        this.template = template;
        const localPath = process.cwd();
        // 1.判断当前目录是否为空
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            // 1.1 询问是否继续创建
            if(!this.force) {
                const res = await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    message: '当前文件夹不为空，是否继续创建项目？',
                    default: false,
                });
                ifContinue = res.ifContinue;
                if(!ifContinue) {
                    return;
                }
            }
            if(ifContinue || this.force) {
                // 给用户做二次确认
                const { confirmDelete } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    message: '是否清空当前目录下的所有文件',
                    default: false,
                })
                if(confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath);
                }
            }
        }
        await this.getProjectInfo();
    }

    async getProjectInfo() {
        let projectInfo = {};
        // 1.选择创建项目或组件
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT,
            }, {
                name: '组件',
                value: TYPE_COMPONENT,
            }]
        })
        if(type === TYPE_PROJECT) {
            const project = await inquirer.prompt([{
                type: 'input',
                name: 'projectName',
                message: '请输入项目名称',
                default: '',
                validate: function(v) {
                    const done = this.async();
                    // 1.首字符必须为英文字符
                    // 2.尾字符必须为英文或数字，不能为字符
                    // 3.字符仅允许 "-_"
                    setTimeout(() => {
                        if(!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                            done('请输入合法的项目名称');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
                filter: v => {
                    return v;
                }
            }, {
                type: 'input',
                name: 'version',
                message: '请输入项目版本号',
                default: '1.0.0',
                validate: function(v) {
                    const done = this.async();
                    setTimeout(() => {
                        if(!!!semver.valid(v)) {
                            done('请输入合法的项目版本号');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
                filter: v => {
                    if(!!semver.valid(v)) {
                        return semver.valid(v);
                    }
                    return v;
                }
            }, {
                type: 'list',
                name: 'projectTemplate',
                message: '请选择项目模板',
                choices: this.createTemplateChoice()
            }])
            projectInfo = {
                type,
                ...project,
            }
        }else if(type === TYPE_COMPONENT) {

        }
        // 生成className
        if(projectInfo.projectName) {
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
        }
        this.projectInfo = projectInfo;
        // 2.获取项目的基本信息
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        // 文件过滤逻辑
        fileList = fileList.filter(file => !file.startsWith('.') && !['node_modules'].includes(file));
        return !fileList || fileList.length <=0;
    }

    async downloadTemplate() {
        // 1.通过项目模板API获取项目模板信息
        // 1.1 通过egg.js搭建一套后端系统
        // 1.2 通过npm存储项目模板
        // 1.3 将项目模板信息存储到mongodb数据库中
        // 1.4 通过egg.js获取mongodb中的数据并且通过API返回
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        const targetPath = path.resolve(userHome, '.crazy-cli', 'template');
        const storeDir = path.resolve(userHome, '.crazy-cli', 'template', 'node_modules');
        const { npmName, version } = templateInfo;
        this.templateInfo = templateInfo;
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version,
        })
        if(await templateNpm.exists()) {
            log.verbose('更新模板');
            const spinner = spinnerStart('正在更新模版...');
            try {
                await templateNpm.update();
                this.templateNpm = templateNpm;
            } catch(e) {
                throw e;
            } finally {
                spinner.stop(true);
                if(await templateNpm.exists()) {
                    log.success('更新模板成功！');
                }
            }
        }else {
            log.verbose('下载模板');
            const spinner = spinnerStart('正在下载模板...');
            try {
                await templateNpm.install();
                this.templateNpm = templateNpm;
            } catch (e) {
                throw e;
            } finally {
                spinner.stop(true);
                if(await templateNpm.exists()) {
                    log.success('下载模板成功！');
                }
            }
        }
    }

    async installTemplate() {
        log.verbose('templateInfo', this.templateInfo);
        if(!this.templateInfo) {
            throw new Error('项目模板信息不存在');
        }
        if(!this.templateInfo.type) {
            this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
        }
        if(this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
            await this.installNormalTemplate();
        }else if(this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
            await this.installCustomTemplate();
        }else {
            throw new Error('无法识别的项目模板类型！');
        }
    }

    async installNormalTemplate() {
        log.verbose('templateNpm', this.templateNpm);
        const spinner = spinnerStart('正在安装模板...');
        try {
            log.verbose('安装标准模板');
            // 拷贝模板至当前目录
            const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
            const targetPath = process.cwd();
            log.verbose('templatePath', templatePath);
            log.verbose('targetPath', targetPath);
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(targetPath);
            fse.copySync(templatePath, targetPath);
        } catch (e) {
            throw e;
        } finally {
            spinner.stop(true);
            log.success('模板安装成功！');
        }
        // ejs模板渲染
        const ignore = ['node_modules/**', 'public/**'];
        await this.ejsRender({ ignore });
        // 依赖安装
        const { installCommand, startCommand } = this.templateInfo;
        const installRes = await this.execCommand(installCommand);
        if(installRes !== 0) {
            throw new Error('模板依赖安装失败！');
        }
        // 启动命令执行
        await this.execCommand(startCommand);
    }

    async installCustomTemplate() {
        console.log('安装自定义模板');
    }

    async ejsRender(options) {
        const dir = process.cwd();
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            glob('**', {
                cwd: dir,
                ignore: options.ignore || '',
                nodir: true,
            }, (err, files) => {
                if(err) {
                    reject(err);
                }
                console.log(files);
                Promise.all(files.map(file => {
                    const filePath = path.join(dir, file);
                    return new Promise((resolve1, reject1) => {
                        ejs.renderFile(filePath, projectInfo, (err, result) => {
                            if(err) {
                                reject1(err);
                            } else {
                                fse.writeFileSync(filePath, result);
                                resolve1(result);
                            }
                        })
                    })
                })).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                })
            })
        })
    }

    async execCommand(command) {
        let res;
        if(command) {
            const cmdArray = command.split(' ');
            const cmd = this.checkCommand(cmdArray[0]);
            const args = cmdArray.slice(1);
            res = await execAsync(cmd, args, {
                stdio: 'inherit',
                cwd: process.cwd(),
            })
        }
        return res;
    }

    checkCommand(cmd) {
        return WHITE_COMMAND.includes(cmd) ? cmd : null;
    }


    createTemplateChoice() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name,
        }))
    }
}

function init(argv) {
    new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
