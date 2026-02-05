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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    constructor() {
        this.loadingTimer = null;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'xguard-commit-guard.checkCommit';
        this.statusBarItem.tooltip = 'XGuard Commit Message Security Guard';
        this.statusBarItem.show();
        this.updateStatus({ safeScore: 1.0, isSafe: true });
    }
    updateStatus(update) {
        const { safeScore, isSafe } = update;
        const percentage = Math.round(safeScore * 100);
        let icon;
        let color;
        if (percentage > 80) {
            icon = '$(shield)';
            color = '#4CAF50'; // 绿色
        }
        else if (percentage > 50) {
            icon = '$(warning)';
            color = '#FF9800'; // 橙色
        }
        else {
            icon = '$(alert)';
            color = '#F44336'; // 红色
        }
        this.statusBarItem.text = `${icon} ${percentage}%`;
        this.statusBarItem.color = color;
        this.statusBarItem.tooltip = `XGuard安全评分: ${percentage}%\n点击手动检测当前文本`;
    }
    setLoading(isLoading) {
        if (isLoading) {
            // 显示加载动画
            let dots = '';
            let count = 0;
            const animate = () => {
                dots = '.'.repeat(count % 4);
                this.statusBarItem.text = `$(sync~spin) 检测中${dots}`;
                this.statusBarItem.tooltip = 'XGuard正在分析Commit Message...';
                count++;
                if (this.loadingTimer) {
                    this.loadingTimer = setTimeout(animate, 300);
                }
            };
            this.loadingTimer = setTimeout(animate, 0);
        }
        else {
            // 清除加载动画
            if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
            }
        }
    }
    dispose() {
        if (this.loadingTimer) {
            clearTimeout(this.loadingTimer);
        }
        this.statusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBar.js.map