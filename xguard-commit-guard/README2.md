# XGuard Security Guard - 敏感信息检测专家

![XGuard Logo](resources/icons/icon.png)

**基于阿里巴巴AAIG YuFeng-XGuard-Reason-8B模型的智能安全检测工具**

XGuard不仅仅是一个**全方位的敏感信息检测专家**,也是一个**Commit Message检测工具**，帮助开发者在任何场景下识别和防范敏感数据泄露风险。

## 🌟 核心能力

### 🔍 全局敏感信息检测（主要功能）
- **任意文件检测**：在代码、配置、文档等任何文本文件中检测敏感信息
- **实时扫描**：选中文本即可立即获得安全评估
- **原生解释**：提供XGuard模型的详细风险分析和解释

### 📝 Commit Message安全防护（经典功能）
- **实时拦截**：在编写Git Commit Message时即时检测敏感信息
- **智能预筛**：快速过滤明显安全的消息，提升检测效率
- **强制防护**：高风险提交会被自动拦截并提供修复建议

### 🌐 多环境无缝支持
- **桌面版VSCode**：完整的开发体验和实时检测
- **Web版VSCode (code-server)**：云端开发环境同样受保护
- **跨平台兼容**：Windows、macOS、Linux全平台支持

## 🚀 一键式安装（推荐）

### 使用安装脚本（全自动）
```bash
# 克隆项目并运行安装脚本
git clone https://github.com/your-username/xguard-commit-guard.git
cd xguard-commit-guard
./setup-xguard.sh
```

安装脚本将自动：
- ✅ 检查系统依赖（Python 3, Node.js, npm）
- ✅ 安装Python和Node.js依赖
- ✅ 编译VSCode插件
- ✅ 启动XGuard本地服务
- ✅ 安装插件到VSCode或code-server（可选择）
- ✅ 提供详细的使用说明

## 🔧 手动安装（自定义配置）

### 1. 安装依赖
```bash
# 安装Python依赖
cd server
pip install -r requirements.txt

# 安装Node.js依赖  
cd ../client
npm install
```

### 2. 配置模型路径
XGuard支持灵活的模型路径配置，**无需修改代码**：

#### 默认配置
如果您的模型文件结构如下：
```
xguard-commit-guard/
├── local_model/          # 模型文件目录
├── local_tokenizer/      # tokenizer文件目录
└── .xguard-config.json   # 配置文件（已包含默认路径）
```

则无需额外配置，直接使用即可。

#### 自定义模型路径
如果您的模型文件在其他位置，编辑 `.xguard-config.json` 文件：
```json
{
    "model_path": "/path/to/your/local_model",
    "tokenizer_path": "/path/to/your/local_tokenizer",
    "risk_thresholds": {
        "Data Privacy-Personal Privacy": 0.4,
        "Cybersecurity-Access Control": 0.3,
        "Cybersecurity-Hacker Attack": 0.5,
        "Crimes and Illegal Activities-Dangerous Weapons": 0.6,
        "Extremism-Violent Terrorist Activities": 0.7
    },
    "timeout_seconds": 10,
    "skip_patterns": [
        "^fix",
        "^feat", 
        "^docs",
        "^chore",
        "^refactor",
        "^style",
        "^test"
    ],
    "min_length": 10,
    "audit_log_enabled": true
}
```

#### 环境变量配置（高级用户）
也可以通过环境变量指定模型路径：
```bash
export XGUARD_MODEL_PATH="/path/to/your/model"
export XGUARD_TOKENIZER_PATH="/path/to/your/tokenizer"
cd server
python xguard_service.py
```

### 3. 启动XGuard服务
```bash
# 在server目录下启动服务
cd server
python xguard_service.py
```

### 4. 安装插件（根据环境选择）

#### 桌面版VSCode（开发模式）
```bash
cd client
npm run compile
code --install-extension .
```

#### Web版VSCode (code-server)
```bash
# 安装vsce打包工具
npm install -g @vscode/vsce

# 打包生成.vsix文件
cd client
vsce package

# 安装到code-server
code-server --install-extension xguard-commit-guard-*.vsix
```

## 🛠️ 使用指南

### 全局敏感信息检测
1. **在任意文件中选中文本**
2. **右键菜单** → "XGuard: 检测选中文本"
   - 或使用**命令面板** (`Ctrl+Shift+P`) → "XGuard: 检测选中文本"
3. **查看检测结果**：
   - ✅ 安全内容：显示绿色安全提示
   - ⚠️ 高风险内容：弹出详细风险分析和拦截警告

### Commit Message检测
1. **执行 `git commit`**（不带 `-m` 参数）
2. **在 `.git/COMMIT_EDITMSG` 文件中编辑提交信息**
3. **插件自动检测**并显示安全评分
4. **高风险消息会被拦截**，提供修复建议

### VSCode内Git提交拦截
- 在VSCode中使用Git提交命令时（如点击"Commit"按钮）
- 插件会自动拦截包含敏感信息的提交
- 提供即时的安全反馈

## ⚙️ 配置选项详解

### 全局配置（VSCode设置）
在VSCode设置中搜索 `xguard-commit-guard`：
- `xguard-commit-guard.serviceUrl`: XGuard本地服务URL（默认: `http://127.0.0.1:8765`）
- `xguard-commit-guard.autoCheck`: 是否自动检测Commit Message（默认: `true`）

### 项目级配置（.xguard-config.json）
完整配置文件示例：
```json
{
    "model_path": "./local_model",
    "tokenizer_path": "./local_tokenizer",
    "risk_thresholds": {
        "Data Privacy-Personal Privacy": 0.4,
        "Cybersecurity-Access Control": 0.3,
        "Cybersecurity-Hacker Attack": 0.5,
        "Crimes and Illegal Activities-Dangerous Weapons": 0.6,
        "Extremism-Violent Terrorist Activities": 0.7
    },
    "timeout_seconds": 10,
    "skip_patterns": [
        "^fix",
        "^feat", 
        "^docs",
        "^chore",
        "^refactor",
        "^style",
        "^test"
    ],
    "min_length": 10,
    "audit_log_enabled": true
}
```

### 配置项说明
| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `model_path` | 本地模型文件路径 | `./local_model` |
| `tokenizer_path` | 本地tokenizer文件路径 | `./local_tokenizer` |
| `risk_thresholds` | 各类风险的拦截阈值 | 见上方示例 |
| `timeout_seconds` | 模型检测超时时间（秒） | `10` |
| `skip_patterns` | 跳过检测的正则模式 | 常见commit类型 |
| `min_length` | 最小检测长度 | `10` |
| `audit_log_enabled` | 是否启用审计日志 | `true` |

### 配置文件查找优先级
XGuard采用**三级配置文件查找机制**，按以下顺序查找 `.xguard-config.json`：

1. **当前工作目录**（最高优先级）
   - 查找运行命令时所在目录的 `.xguard-config.json`
   - 适用于：在特定项目目录中运行服务时使用项目专属配置

2. **服务器脚本目录**（中等优先级）  
   - 查找 `xguard_service.py` 所在目录的 `.xguard-config.json`
   - 适用于：将配置文件与服务脚本放在一起的场景

3. **项目根目录**（最低优先级）
   - 查找项目根目录（server目录的父目录）的 `.xguard-config.json`
   - 适用于：标准项目结构，配置文件放在项目根目录

### 环境变量覆盖机制
**环境变量具有最高优先级**，会覆盖配置文件中的对应设置：

- `XGUARD_MODEL_PATH`：覆盖 `model_path` 配置
- `XGUARD_TOKENIZER_PATH`：覆盖 `tokenizer_path` 配置

**完整优先级顺序**（从高到低）：
1. **环境变量** → 2. **配置文件** → 3. **内置默认值**


## 🛡️ 安全与隐私

- **本地处理**：所有检测均在本地进行，数据绝不上传
- **审计日志**：记录强制绕过操作的原因，满足合规要求
- **紧急绕过**：支持 `git commit --no-verify`（需记录原因）
- **模型安全**：基于阿里巴巴官方XGuard模型，经过严格安全验证

## 📊 性能特性

- **模型预加载**：服务启动时自动加载模型到内存
- **轻量级预筛**：正则表达式快速过滤安全内容
- **异步处理**：非阻塞式检测，不影响开发体验
- **智能缓存**：重复内容检测结果缓存优化


## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

---

**XGuard Security Guard - 您的敏感信息防护专家！** 🔒

> 安全始于细节，无论是Commit Message还是任意代码文件，XGuard都能为您提供专业的安全防护！