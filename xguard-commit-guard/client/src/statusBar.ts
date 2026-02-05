import * as vscode from 'vscode';

interface StatusUpdate {
    safeScore: number;
    isSafe: boolean;
    risks?: Array<{ category: string; score: number }>;
}

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private loadingTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'xguard-commit-guard.checkCommit';
        this.statusBarItem.tooltip = 'XGuard Commit Message Security Guard';
        this.statusBarItem.show();
        this.updateStatus({ safeScore: 1.0, isSafe: true });
    }

    public updateStatus(update: StatusUpdate): void {
        const { safeScore, isSafe } = update;
        const percentage = Math.round(safeScore * 100);
        
        let icon: string;
        let color: string;
        
        if (percentage > 80) {
            icon = '$(shield)';
            color = '#4CAF50'; // 绿色
        } else if (percentage > 50) {
            icon = '$(warning)';
            color = '#FF9800'; // 橙色
        } else {
            icon = '$(alert)';
            color = '#F44336'; // 红色
        }
        
        this.statusBarItem.text = `${icon} ${percentage}%`;
        this.statusBarItem.color = color;
        this.statusBarItem.tooltip = `XGuard安全评分: ${percentage}%\n点击手动检测当前文本`;
    }

    public setLoading(isLoading: boolean): void {
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
        } else {
            // 清除加载动画
            if (this.loadingTimer) {
                clearTimeout(this.loadingTimer);
                this.loadingTimer = null;
            }
        }
    }

    public dispose(): void {
        if (this.loadingTimer) {
            clearTimeout(this.loadingTimer);
        }
        this.statusBarItem.dispose();
    }
}