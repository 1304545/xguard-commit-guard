"""
XGuard服务配置模块
"""

import os
import json

class Config:
    """XGuard服务配置类"""
    
    def __init__(self):
        self.port = int(os.environ.get('PORT', 8765))
        self.host = os.environ.get('HOST', '127.0.0.1')
        self.debug = os.environ.get('DEBUG', 'false').lower() == 'true'
        self.timeout_seconds = 10
        self.model_path = "Alibaba-AAIG/YuFeng-XGuard-Reason-8B"
        
        # 风险阈值配置
        self.risk_thresholds = {
            "Data Privacy-Personal Privacy": 0.4,
            "Cybersecurity-Access Control": 0.3,
            "Cybersecurity-Hacker Attack": 0.5,
            "Crimes and Illegal Activities-Dangerous Weapons": 0.6,
            "Extremism-Violent Terrorist Activities": 0.7
        }
        
        # 跳过检测的模式
        self.skip_patterns = [
            "^fix",
            "^feat", 
            "^docs",
            "^chore",
            "^refactor",
            "^style",
            "^test"
        ]
        
        self.min_length = 10
        self.audit_log_enabled = True
        
        # 加载用户配置
        self.load_user_config()
    
    def load_user_config(self):
        """加载用户自定义配置"""
        config_path = os.path.join(os.getcwd(), '.xguard-config.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    for key, value in user_config.items():
                        if hasattr(self, key):
                            setattr(self, key, value)
            except Exception as e:
                print(f"加载用户配置失败: {e}")




                