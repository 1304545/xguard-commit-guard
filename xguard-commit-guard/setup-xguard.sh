#!/bin/bash
# XGuard Commit Message Security Guard - 安装脚本

set -e

echo "🚀 Setting up XGuard Commit Message Security Guard..."
echo "=================================================="

# 检查依赖
check_dependencies() {
    echo "🔍 检查系统依赖..."
    
    # 检查Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 未安装，请先安装Python 3"
        exit 1
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装Node.js"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装，请先安装npm"
        exit 1
    fi
    
    # 检查VSCode和code-server
    if ! command -v code &> /dev/null && ! command -v code-server &> /dev/null; then
        echo "⚠️  VSCode 和 code-server 均未安装"
        echo "   请安装其中一个："
        echo "   - VSCode: https://code.visualstudio.com/"
        echo "   - code-server: https://github.com/cdr/code-server"
    fi
    
    echo "✅ 所有依赖检查通过"
}

# 安装Python依赖
install_python_deps() {
    echo "📦 安装Python依赖..."
    cd server
    pip install -r requirements.txt
    cd ..
}

# 安装Node.js依赖
install_node_deps() {
    echo "📦 安装Node.js依赖..."
    cd client
    npm install
    cd ..
}

# 编译VSCode插件
compile_extension() {
    echo "🔨 编译VSCode插件..."
    cd client
    npm run compile
    cd ..
}

# 创建系统服务（可选）
create_system_service() {
    echo "⚙️  创建系统服务（可选）..."
    read -p "是否创建XGuard系统服务？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SERVICE_FILE="/etc/systemd/system/xguard.service"
        if [ "$EUID" -eq 0 ]; then
            cat > "$SERVICE_FILE" << EOF
[Unit]
Description=XGuard Commit Message Security Guard
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)/server
ExecStart=/usr/bin/python3 xguard_service.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            systemctl daemon-reload
            systemctl enable xguard.service
            systemctl start xguard.service
            echo "✅ XGuard系统服务已创建并启动"
        else
            echo "⚠️  需要root权限来创建系统服务"
            echo "   请手动运行: sudo ./setup-xguard.sh"
        fi
    fi
}

# 安装vsce工具（用于打包）
install_vsce() {
    echo "📦 安装vsce打包工具..."
    if ! command -v vsce &> /dev/null; then
        npm install -g @vscode/vsce
    fi
    echo "✅ vsce工具已安装"
}

# 打包生成.vsix文件
package_extension() {
    echo "📦 打包VSCode插件..."
    cd client
    install_vsce
    if ! vsce package; then
        echo "❌ 插件打包失败"
        exit 1
    fi
    cd ..
    echo "✅ 插件已打包为.vsix文件"
}

# 安装VSCode插件（桌面版）
install_vscode_extension() {
    if command -v code &> /dev/null; then
        echo "🔌 安装VSCode插件（桌面版）..."
        cd client
        code --install-extension .
        cd ..
        echo "✅ VSCode插件安装完成"
    else
        echo "⚠️  VSCode未安装，跳过插件安装"
        echo "   请手动安装生成的VSIX文件"
    fi
}

# 安装code-server插件
install_codeserver_extension() {
    echo "🔌 安装code-server插件..."
    # 查找生成的vsix文件
    VSIX_FILE=$(ls client/xguard-commit-guard-*.vsix 2>/dev/null | head -n1)
    if [ -z "$VSIX_FILE" ]; then
        echo "❌ 未找到.vsix文件，请先打包插件"
        exit 1
    fi
    
    if command -v code-server &> /dev/null; then
        code-server --install-extension "$VSIX_FILE"
        echo "✅ code-server插件安装完成"
    else
        echo "⚠️  code-server未安装"
        echo "   请手动运行: code-server --install-extension $VSIX_FILE"
    fi
}

# 选择安装方式
choose_install_method() {
    echo ""
    echo "请选择插件安装方式："
    echo "1) 桌面版VSCode（开发模式）"
    echo "2) code-server（Web版VSCode）"
    echo "3) 两种都安装"
    echo ""
    
    read -p "请输入选项 (1/2/3): " choice
    
    case $choice in
        1)
            install_vscode_extension
            ;;
        2)
            package_extension
            install_codeserver_extension
            ;;
        3)
            install_vscode_extension
            package_extension
            install_codeserver_extension
            ;;
        *)
            echo "❌ 无效选项，使用默认选项（桌面版VSCode）"
            install_vscode_extension
            ;;
    esac
}

# 显示使用说明
show_usage() {
    echo ""
    echo "🎉 安装完成！"
    echo "========================================"
    echo "使用说明："
    echo ""
    echo "1. 启动XGuard服务（如果未创建系统服务）："
    echo "   cd server && python xguard_service.py"
    echo ""
    echo "2. 在VSCode中打开项目，插件会自动激活"
    echo ""
    echo "3. 状态栏会显示XGuard安全评分"
    echo ""
    echo "4. 如需自定义配置，请在项目根目录创建 .xguard-config.json"
    echo ""
    echo "5. 查看详细文档：README.md"
    echo "========================================"
}

# 主函数
main() {
    check_dependencies
    install_python_deps
    install_node_deps
    compile_extension
    create_system_service
    choose_install_method
    show_usage
}

# 运行主函数
main