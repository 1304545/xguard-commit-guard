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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitMessageProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class CommitMessageProvider {
    constructor(statusBar) {
        this.statusBar = statusBar;
        this.serviceUrl = 'http://127.0.0.1:8765';
        this.config = {
            risk_thresholds: {
                "Data Privacy-Personal Privacy": 0.4,
                "Cybersecurity-Access Control": 0.3,
                "Cybersecurity-Hacker Attack": 0.5
            },
            timeout_seconds: 10,
            skip_patterns: ["^fix", "^feat", "^docs", "^chore", "^refactor"],
            min_length: 10
        };
        // 加载配置
        this.loadConfig();
    }
    async loadConfig() {
        try {
            const response = await axios_1.default.get(`${this.serviceUrl}/config`, { timeout: 3000 });
            this.config = response.data;
            console.log('Loaded XGuard configuration:', this.config);
        }
        catch (error) {
            console.warn('Failed to load XGuard configuration, using defaults:', error);
        }
    }
    shouldSkipDetection(commitMessage) {
        const { min_length, skip_patterns } = this.config;
        // 检查长度
        if (commitMessage.length < min_length) {
            return true;
        }
        // 检查跳过模式
        for (const pattern of skip_patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(commitMessage)) {
                return true;
            }
        }
        return false;
    }
    async checkCommitMessage(commitMessage) {
        // 预筛：跳过明显安全的短消息
        if (this.shouldSkipDetection(commitMessage)) {
            this.statusBar.updateStatus({ safeScore: 1.0, isSafe: true });
            return null;
        }
        let loadingTimeout = null;
        try {
            // 显示加载状态
            this.statusBar.setLoading(true);
            // 添加额外的客户端超时保护（15秒）
            const clientTimeoutPromise = new Promise((_, reject) => {
                loadingTimeout = setTimeout(() => {
                    reject(new Error('Client timeout: XGuard检测超时'));
                }, 15000);
            });
            const responsePromise = axios_1.default.post(`${this.serviceUrl}/check-commit`, { message: commitMessage }, { timeout: this.config.timeout_seconds * 1000 });
            const response = await Promise.race([responsePromise, clientTimeoutPromise]);
            console.log('XGuard response received:', response);
            const result = response.data;
            console.log('XGuard result parsed:', result);
            if (result.error) {
                vscode.window.showErrorMessage(`XGuard检测错误: ${result.error}`);
                this.statusBar.updateStatus({ safeScore: 0.5, isSafe: false });
                return result;
            }
            // 检查是否触发高风险
            const highRisks = this.getHighRiskCategories(result.risk_scores);
            const isBlocked = highRisks.length > 0;
            console.log('High risks detected:', highRisks);
            // 立即更新状态栏（在显示警告之前）
            this.statusBar.updateStatus({
                safeScore: result.safe_score,
                isSafe: !isBlocked,
                risks: highRisks
            });
            console.log('Status bar updated');
            // 如果有高风险，显示拦截对话框
            if (isBlocked) {
                console.log('Showing security alert');
                await this.showSecurityAlert(commitMessage, result, highRisks);
                console.log('Security alert closed');
            }
            else if (result.safe_score > 0.8) {
                // 显示安全提示
                vscode.window.showInformationMessage(`✅ Commit Message安全 (XGuard安全分: ${(result.safe_score * 100).toFixed(0)}%)`);
            }
            return result;
        }
        catch (error) {
            console.error('XGuard检测失败:', error);
            if (error.code === 'ECONNREFUSED') {
                vscode.window.showWarningMessage('XGuard本地服务未启动，请先运行xguard-service.py', '启动服务').then(choice => {
                    if (choice === '启动服务') {
                        this.startLocalService();
                    }
                });
            }
            else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                vscode.window.showWarningMessage('XGuard检测超时，请稍后重试');
            }
            else {
                vscode.window.showErrorMessage(`XGuard检测失败: ${error.message}`);
            }
            this.statusBar.updateStatus({ safeScore: 0.5, isSafe: false });
            return null;
        }
        finally {
            // 清除超时定时器
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
            }
            this.statusBar.setLoading(false);
        }
    }
    getHighRiskCategories(riskScores) {
        const highRisks = [];
        const thresholds = this.config.risk_thresholds;
        for (const [category, score] of Object.entries(riskScores)) {
            // 排除Safe相关类别，因为分数越高越安全
            const safeCategoryPatterns = ['Safe', 'safe', 'SAFE'];
            const isSafeCategory = safeCategoryPatterns.some(pattern => category.toLowerCase().includes(pattern.toLowerCase()));
            if (isSafeCategory) {
                continue;
            }
            const threshold = this.getThresholdForCategory(category, thresholds);
            if (score > threshold) {
                highRisks.push({ category, score });
            }
        }
        // 按分数降序排序
        return highRisks.sort((a, b) => b.score - a.score);
    }
    getThresholdForCategory(category, thresholds) {
        // 精确匹配
        if (thresholds[category] !== undefined) {
            return thresholds[category];
        }
        // 模糊匹配（检查类别是否包含关键词）
        for (const [key, threshold] of Object.entries(thresholds)) {
            if (category.includes(key.split('-')[1] || key)) {
                return threshold;
            }
        }
        // 默认阈值
        return 0.5;
    }
    async showSecurityAlert(commitMessage, result, highRisks) {
        const riskItems = highRisks.map(risk => `• ${this.formatRiskCategory(risk.category)}: ${(risk.score * 100).toFixed(2)}%`).join('\n');
        // 修复：确保Math.min接收的是数字数组
        const thresholdValues = Object.values(this.config.risk_thresholds);
        const minThreshold = Math.min(...thresholdValues);
        const message = `🚨 COMMIT REJECTED BY XGUARD SECURITY GUARD\n\n` +
            `⚠️ 检测到高风险内容（阈值>${minThreshold}）:\n` +
            `${riskItems}\n\n` +
            `💡 XGuard原生解释:\n${result.explanation}\n\n` +
            `✅ 修复建议:\n` +
            `   0. 删除不健康或违规的内容\n` +
            `   1. 删除敏感信息（密码、密钥、身份证等）\n` +
            `   2. 重新编辑Commit Message\n` +
            `   3. 强制绕过（不推荐）: git commit --no-verify\n\n` +
            `🔍 全局文本安全检测提醒:\n` +
            `   XGuard不仅是Commit Message检测工具，更是全方位的\n` +
            `   敏感信息检测专家！在任意文件中选中文本，之后点击右下角图标或点击右键选择\n` +
            `   "XGuard: 检测选中文本"即可进行安全扫描。\n`;
        const selection = await vscode.window.showErrorMessage(message, { modal: true }, '立即修改', '强制提交（需填写原因）', '取消');
        switch (selection) {
            case '立即修改':
                // 聚焦到当前编辑器
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.revealRange(editor.document.validateRange(new vscode.Range(0, 0, editor.document.lineCount, 0)));
                }
                break;
            case '强制提交（需填写原因）':
                const reason = await vscode.window.showInputBox({
                    prompt: '请输入强制提交的原因（用于审计）',
                    placeHolder: '例如：误报、测试提交等'
                });
                if (reason) {
                    // 记录审计日志
                    this.logAuditEvent(commitMessage, reason, highRisks);
                    vscode.window.showInformationMessage('已记录强制提交原因，您可以继续提交');
                }
                break;
            case '取消':
                // 什么都不做
                break;
        }
    }
    formatRiskCategory(category) {
        const parts = category.split('-');
        if (parts.length >= 2) {
            return parts[1]; // 返回具体的子类别
        }
        return category;
    }
    logAuditEvent(commitMessage, bypassReason, risks) {
        const auditLog = {
            timestamp: new Date().toISOString(),
            commitMessage: commitMessage.substring(0, 100) + (commitMessage.length > 100 ? '...' : ''),
            bypassReason,
            risks: risks.map(r => ({ category: r.category, score: r.score })),
            workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'unknown'
        };
        // 写入审计日志文件
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(require('os').homedir(), '.xguard_commit_audit.log');
        fs.appendFileSync(logPath, JSON.stringify(auditLog) + '\n', 'utf8');
        console.log('Audit log written:', auditLog);
    }
    async startLocalService() {
        try {
            const terminal = vscode.window.createTerminal('XGuard Service');
            terminal.sendText('cd /path/to/xguard-service && python xguard_service.py');
            terminal.show();
            vscode.window.showInformationMessage('XGuard本地服务已启动，请稍等模型加载完成...');
        }
        catch (error) {
            vscode.window.showErrorMessage(`启动服务失败: ${error}`);
        }
    }
    // 添加dispose方法以符合VSCode Disposable接口
    dispose() {
        // 清理资源（如果有的话）
        // 目前没有需要清理的资源，但方法必须存在
    }
}
exports.CommitMessageProvider = CommitMessageProvider;
//# sourceMappingURL=commitProvider.js.map