#!/usr/bin/env python3
"""
XGuard Commit Message Security Guard - Windows安装脚本
"""
import os
import sys
import subprocess
import platform
import json
import argparse
from pathlib import Path

def print_header(title):
    """打印标题头"""
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def check_python_version():
    """检查Python版本"""
    print("🔍 检查Python版本...")
    if sys.version_info < (3, 7):
        print("❌ Python版本过低，请升级到Python 3.7或更高版本")
        return False
    print(f"✅ Python版本: {platform.python_version()}")
    return True

def check_node_installed():
    """检查Node.js和npm是否已安装"""
    print("🔍 检查Node.js和npm...")
    
    try:
        # 尝试使用shell=True来解决Windows环境变量问题
        node_version = subprocess.check_output(["node", "--version"], 
                                              stderr=subprocess.STDOUT, 
                                              universal_newlines=True,
                                              shell=True)
        print(f"✅ Node.js版本: {node_version.strip()}")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("❌ Node.js未安装，请先安装Node.js")
        return False
    
    try:
        # 同样使用shell=True来查找npm
        npm_version = subprocess.check_output(["npm", "--version"], 
                                             stderr=subprocess.STDOUT, 
                                             universal_newlines=True,
                                             shell=True)
        print(f"✅ npm版本: {npm_version.strip()}")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("❌ npm未安装，请先安装npm")
        return False
    
    return True

def install_python_deps():
    """安装Python依赖"""
    print("📦 安装Python依赖...")
    server_dir = os.path.join(os.path.dirname(__file__), "server")
    
    try:
        # 切换到server目录
        original_dir = os.getcwd()
        os.chdir(server_dir)
        
        # 使用pip安装依赖
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print(f"❌ 安装Python依赖失败: {result.stderr}")
            return False
        
        print("✅ Python依赖安装完成")
        return True
    except Exception as e:
        print(f"❌ 安装Python依赖时出错: {str(e)}")
        return False
    finally:
        # 回到原始目录
        os.chdir(original_dir)

def install_node_deps():
    """安装Node.js依赖"""
    print("📦 安装Node.js依赖...")
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    
    try:
        # 切换到client目录
        original_dir = os.getcwd()
        os.chdir(client_dir)
        
        # 使用npm安装依赖
        result = subprocess.run([
            "npm", "install"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print(f"❌ 安装Node.js依赖失败: {result.stderr}")
            return False
        
        print("✅ Node.js依赖安装完成")
        return True
    except Exception as e:
        print(f"❌ 安装Node.js依赖时出错: {str(e)}")
        return False
    finally:
        # 回到原始目录
        os.chdir(original_dir)

def compile_extension():
    """编译VSCode插件"""
    print("🔨 编译VSCode插件...")
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    
    try:
        # 切换到client目录
        original_dir = os.getcwd()
        os.chdir(client_dir)
        
        # 使用npm编译插件
        result = subprocess.run([
            "npm", "run", "compile"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print(f"❌ 编译VSCode插件失败: {result.stderr}")
            return False
        
        print("✅ VSCode插件编译完成")
        return True
    except Exception as e:
        print(f"❌ 编译VSCode插件时出错: {str(e)}")
        return False
    finally:
        # 回到原始目录
        os.chdir(original_dir)

def install_vsce():
    """安装vsce打包工具"""
    print("📦 安装vsce打包工具...")
    
    try:
        # 检查vsce是否已安装
        result = subprocess.run([
            "vsce", "--version"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            # 安装vsce
            result = subprocess.run([
                "npm", "install", "-g", "@vscode/vsce"
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode != 0:
                print(f"❌ 安装vsce工具失败: {result.stderr}")
                return False
        
        print("✅ vsce工具已安装")
        return True
    except Exception as e:
        print(f"❌ 安装vsce工具时出错: {str(e)}")
        return False

def package_extension():
    """打包VSCode插件"""
    print("📦 打包VSCode插件...")
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    
    try:
        # 切换到client目录
        original_dir = os.getcwd()
        os.chdir(client_dir)
        
        # 安装vsce工具
        if not install_vsce():
            return False
        
        # 打包插件
        result = subprocess.run([
            "vsce", "package"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print(f"❌ 插件打包失败: {result.stderr}")
            return False
        
        print("✅ 插件已打包为.vsix文件")
        return True
    except Exception as e:
        print(f"❌ 打包VSCode插件时出错: {str(e)}")
        return False
    finally:
        # 回到原始目录
        os.chdir(original_dir)

def install_vscode_extension():
    """安装VSCode插件"""
    print("🔌 安装VSCode插件...")
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    
    try:
        # 检查code命令是否存在（VSCode CLI）
        result = subprocess.run([
            "code", "--version"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print("⚠️  VSCode未安装或CLI不可用，跳过插件安装")
            print("   请手动安装生成的VSIX文件")
            return True
        
        # 查找生成的vsix文件
        vsix_files = list(Path(client_dir).glob("*.vsix"))
        if not vsix_files:
            print("❌ 未找到.vsix文件，请先打包插件")
            return False
        
        vsix_file = vsix_files[0]  # 获取第一个找到的vsix文件
        
        # 安装插件
        result = subprocess.run([
            "code", "--install-extension", str(vsix_file)
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print(f"❌ VSCode插件安装失败: {result.stderr}")
            return False
        
        print("✅ VSCode插件安装完成")
        return True
    except Exception as e:
        print(f"❌ 安装VSCode插件时出错: {str(e)}")
        return False

def install_vscode_dev_extension():
    """安装VSCode插件（开发模式）"""
    print("🔌 安装VSCode插件（开发模式）...")
    client_dir = os.path.join(os.path.dirname(__file__), "client")
    
    try:
        # 检查code命令是否存在（VSCode CLI）
        result = subprocess.run([
            "code", "--version"
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            print("⚠️  VSCode未安装或CLI不可用，跳过插件安装")
            print("   请手动安装插件")
            return True
        
        # 切换到client目录
        original_dir = os.getcwd()
        os.chdir(client_dir)
        
        # 安装插件
        result = subprocess.run([
            "code", "--install-extension", "."
        ], capture_output=True, text=True, shell=True)
        
        if result.returncode != 0:
            # 尝试另一种方式安装
            print("⚠️  直接安装失败，尝试打包后安装...")
            os.chdir(original_dir)
            if package_extension():
                return install_vscode_extension()
            else:
                print(f"❌ VSCode插件安装失败: {result.stderr}")
                return False
        
        print("✅ VSCode插件安装完成")
        return True
    except Exception as e:
        print(f"❌ 安装VSCode插件时出错: {str(e)}")
        return False
    finally:
        # 回到原始目录
        os.chdir(os.path.dirname(os.path.dirname(__file__)))

def choose_install_method():
    """选择安装方式"""
    print("\n" + "-"*40)
    print("请选择插件安装方式：")
    print("1) 安装并编译插件（开发模式）")
    print("2) 打包并安装插件")
    print("3) 两种都执行")
    print("-"*40)
    
    while True:
        try:
            choice = input("请输入选项 (1/2/3): ").strip()
            if choice in ['1', '2', '3']:
                break
            else:
                print("无效选项，请重新输入")
        except KeyboardInterrupt:
            print("\n用户取消操作")
            return False
    
    success = True
    
    if choice in ['1', '3']:
        print("\n安装并编译插件...")
        if not compile_extension():
            success = False
    
    if choice in ['2', '3']:
        print("\n打包并安装插件...")
        if not package_extension():
            return False
        if not install_vscode_extension():
            success = False
    
    return success

def show_usage():
    """显示使用说明"""
    print("\n" + "="*60)
    print("🎉 安装完成！")
    print("="*60)
    print("使用说明：")
    print("")
    print("1. 启动XGuard服务：")
    print("   cd server && python xguard_service.py")
    print("")
    print("2. 在VSCode中打开项目，插件会自动激活")
    print("")
    print("3. 状态栏会显示XGuard安全评分")
    print("")
    print("4. 如需自定义配置，请在项目根目录创建 .xguard-config.json")
    print("")
    print("5. 查看详细文档：README.md")
    print("="*60)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='XGuard Commit Message Security Guard - Windows安装脚本')
    parser.add_argument('--skip-deps', action='store_true', help='跳过依赖安装')
    parser.add_argument('--skip-vscode', action='store_true', help='跳过VSCode插件安装')
    
    args = parser.parse_args()
    
    print_header("XGuard Commit Message Security Guard - 安装程序")
    
    # 检查Python版本
    if not check_python_version():
        return False
    
    # 检查Node.js和npm
    if not check_node_installed():
        return False
    
    # 安装依赖
    if not args.skip_deps:
        if not install_python_deps():
            return False
        
        if not install_node_deps():
            return False
    
    # 选择安装方式
    if not args.skip_vscode:
        if not choose_install_method():
            return False
    
    # 显示使用说明
    show_usage()
    
    return True

if __name__ == "__main__":
    if main():
        print("\n✅ 安装成功完成！")
        sys.exit(0)
    else:
        print("\n❌ 安装过程中出现错误！")
        sys.exit(1)