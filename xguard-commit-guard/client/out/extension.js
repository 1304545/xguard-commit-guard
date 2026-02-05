"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const commitProvider_1 = require("./commitProvider");
const statusBar_1 = require("./statusBar");
function activate(context) {
    console.log('XGuard Commit Message Security Guard is now active!');
    // 初始化状态栏管理器
    const statusBar = new statusBar_1.StatusBarManager();
    context.subscriptions.push(statusBar);
    // 初始化Commit Message检测提供者
    const commitProvider = new commitProvider_1.CommitMessageProvider(statusBar);
    context.subscriptions.push(commitProvider);
    // 注册命令
    const checkCommitCommand = vscode.commands.registerCommand('xguard-commit-guard.checkCommit', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const selection = editor.selection;
        const commitMessage = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);
        if (!commitMessage.trim()) {
            vscode.window.showInformationMessage('Commit Message为空');
            return;
        }
        await commitProvider.checkCommitMessage(commitMessage);
    });
    context.subscriptions.push(checkCommitCommand);
    // 新增：检测任意选中文本的命令
    const checkSelectedTextCommand = vscode.commands.registerCommand('xguard-commit-guard.checkSelectedText', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('请先打开一个文件');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('请先选中要检测的文本');
            return;
        }
        const selectedText = editor.document.getText(selection);
        if (!selectedText.trim()) {
            vscode.window.showInformationMessage('选中的文本为空');
            return;
        }
        // 使用相同的检测逻辑
        await commitProvider.checkCommitMessage(selectedText);
    });
    context.subscriptions.push(checkSelectedTextCommand);
    // 监听Git提交事件
    const gitApi = vscode.extensions.getExtension('vscode.git');
    if (gitApi) {
        // 使用async/await处理Promise
        (async () => {
            try {
                const api = await gitApi.activate();
                if (api && api.getAPI) {
                    const git = api.getAPI(1);
                    if (git && git.repositories && git.repositories.length > 0) {
                        // 监听提交后事件（用于日志记录）
                        git.onDidCommit?.(async (commit) => {
                            // 这里可以添加提交后的日志记录
                            console.log('Commit completed:', commit.message);
                        });
                    }
                }
            }
            catch (err) {
                console.warn('Failed to get Git API:', err);
            }
        })();
    }
    // 增强：拦截VSCode Git提交命令
    enhanceGitCommitCommands(context, commitProvider);
    // 自动检测当前编辑器中的Commit Message
    const detectCommitMessage = async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && isLikelyCommitMessageFile(editor.document.fileName)) {
            const commitMessage = editor.document.getText().trim();
            if (commitMessage) {
                await commitProvider.checkCommitMessage(commitMessage);
            }
        }
    };
    // 监听文档变化
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
            // 防抖处理
            setTimeout(async () => {
                await detectCommitMessage();
            }, 400);
        }
    });
    context.subscriptions.push(documentChangeListener);
    // 监听活动编辑器变化
    const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(async () => {
        await detectCommitMessage();
    });
    context.subscriptions.push(activeEditorChangeListener);
}
// 新增：增强Git提交命令拦截
function enhanceGitCommitCommands(context, commitProvider) {
    // 拦截标准的Git提交命令
    const originalGitCommit = vscode.commands.executeCommand.bind(vscode.commands, 'git.commit');
    const originalGitCommitStaged = vscode.commands.executeCommand.bind(vscode.commands, 'git.commitStaged');
    const originalGitCommitAll = vscode.commands.executeCommand.bind(vscode.commands, 'git.commitAll');
    // 重写git.commit命令
    const enhancedGitCommit = vscode.commands.registerCommand('git.commit', async (...args) => {
        // 提取commit message
        let commitMessage = '';
        if (args.length > 0 && typeof args[0] === 'string') {
            commitMessage = args[0];
        }
        else if (args.length > 1 && typeof args[1] === 'string') {
            // 处理不同的参数格式
            commitMessage = args[1];
        }
        // 如果没有提供message，可能是交互式提交，直接允许
        if (!commitMessage.trim()) {
            return originalGitCommit(...args);
        }
        // 检查commit message安全性
        const isSafe = await checkCommitMessageSafety(commitMessage, commitProvider);
        if (isSafe) {
            return originalGitCommit(...args);
        }
        else {
            vscode.window.showErrorMessage('❌ Commit被XGuard安全卫士拦截！请修改Commit Message后重试。');
            return false;
        }
    });
    // 重写git.commitStaged命令
    const enhancedGitCommitStaged = vscode.commands.registerCommand('git.commitStaged', async (...args) => {
        let commitMessage = '';
        if (args.length > 0 && typeof args[0] === 'string') {
            commitMessage = args[0];
        }
        if (!commitMessage.trim()) {
            return originalGitCommitStaged(...args);
        }
        const isSafe = await checkCommitMessageSafety(commitMessage, commitProvider);
        if (isSafe) {
            return originalGitCommitStaged(...args);
        }
        else {
            vscode.window.showErrorMessage('❌ Commit被XGuard安全卫士拦截！请修改Commit Message后重试。');
            return false;
        }
    });
    // 重写git.commitAll命令
    const enhancedGitCommitAll = vscode.commands.registerCommand('git.commitAll', async (...args) => {
        let commitMessage = '';
        if (args.length > 0 && typeof args[0] === 'string') {
            commitMessage = args[0];
        }
        if (!commitMessage.trim()) {
            return originalGitCommitAll(...args);
        }
        const isSafe = await checkCommitMessageSafety(commitMessage, commitProvider);
        if (isSafe) {
            return originalGitCommitAll(...args);
        }
        else {
            vscode.window.showErrorMessage('❌ Commit被XGuard安全卫士拦截！请修改Commit Message后重试。');
            return false;
        }
    });
    context.subscriptions.push(enhancedGitCommit);
    context.subscriptions.push(enhancedGitCommitStaged);
    context.subscriptions.push(enhancedGitCommitAll);
}
// 新增：检查commit message安全性
async function checkCommitMessageSafety(commitMessage, commitProvider) {
    try {
        // 调用现有的检测方法
        const result = await commitProvider.checkCommitMessage(commitMessage);
        // 如果检测失败（如服务未启动），允许提交但显示警告
        if (!result) {
            return true;
        }
        // 检查是否有高风险类别
        const highRisks = commitProvider['getHighRiskCategories'](result.risk_scores);
        return highRisks.length === 0;
    }
    catch (error) {
        console.warn('安全检测失败，允许提交:', error);
        // 检测失败时允许提交，避免阻塞开发流程
        return true;
    }
}
function isLikelyCommitMessageFile(fileName) {
    // 检查是否为Git Commit Message文件
    return fileName.includes('.git') &&
        (fileName.endsWith('COMMIT_EDITMSG') ||
            fileName.endsWith('MERGE_MSG') ||
            fileName.includes('commit'));
}
function deactivate() {
    console.log('XGuard Commit Message Security Guard deactivated');
}
//# sourceMappingURL=extension.js.map