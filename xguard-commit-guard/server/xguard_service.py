#!/usr/bin/env python3
"""
XGuard本地服务 - 提供HTTP API接口供VSCode插件调用
严格只做：接收文本 → 调XGuard → 返回原生result
"""

import os
import sys
import json
import logging
import torch
from flask import Flask, request, jsonify
from modelscope import AutoModelForCausalLM, AutoTokenizer
from threading import Lock

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
model_lock = Lock()

# 全局模型实例（单例）
_model = None
_tokenizer = None

def infer(model, tokenizer, messages, policy=None, max_new_tokens=500, reason_first=False):
    """从example.ipynb复制的推理函数"""
    rendered_query = tokenizer.apply_chat_template(messages, policy=policy, reason_first=reason_first, tokenize=False)
    
    model_inputs = tokenizer([rendered_query], return_tensors="pt").to(model.device)
    
    outputs = model.generate(**model_inputs, max_new_tokens=max_new_tokens, do_sample=False, output_scores=True, return_dict_in_generate=True)

    batch_idx = 0
    input_length = model_inputs['input_ids'].shape[1]

    output_ids = outputs["sequences"].tolist()[batch_idx][input_length:]
    response = tokenizer.decode(output_ids, skip_special_tokens=True)
    
    ### parse score ###
    generated_tokens_with_probs = []

    generated_tokens = outputs.sequences[:, input_length:]

    scores = torch.stack(outputs.scores, 1)
    scores = scores.softmax(-1)
    scores_topk_value, scores_topk_index = scores.topk(k=10, dim=-1)

    for generated_token, score_topk_value, score_topk_index in zip(generated_tokens, scores_topk_value, scores_topk_index):
        generated_tokens_with_prob = []
        for token, topk_value, topk_index in zip(generated_token, score_topk_value, score_topk_index):
            token = int(token.cpu())
            if token == tokenizer.pad_token_id:
                continue
            
            res_topk_score = {}
            for ii, (value, index) in enumerate(zip(topk_value, topk_index)):
                if ii == 0 or value.cpu().numpy() > 1e-4:
                    text = tokenizer.decode(index.cpu().numpy())
                    res_topk_score[text] = {
                        "id": str(int(index.cpu().numpy())),
                        "prob": round(float(value.cpu().numpy()), 4),
                    }

            generated_tokens_with_prob.append(res_topk_score)
        
        generated_tokens_with_probs.append(generated_tokens_with_prob)

    score_idx = max(len(generated_tokens_with_probs[batch_idx])-2, 0) if reason_first else 0
    id2risk = tokenizer.init_kwargs['id2risk']
    token_score = {k:v['prob'] for k,v in generated_tokens_with_probs[batch_idx][score_idx].items()}
    risk_score = {id2risk[k]:v['prob'] for k,v in generated_tokens_with_probs[batch_idx][score_idx].items() if k in id2risk}

    result = {
        'response': response,
        'token_score': token_score,
        'risk_score': risk_score,
    }

    return result

def get_config_file_path():
    """获取配置文件路径，按优先级查找"""
    # 1. 当前工作目录下的 .xguard-config.json
    current_dir_config = os.path.join(os.getcwd(), '.xguard-config.json')
    if os.path.exists(current_dir_config):
        return current_dir_config
    
    # 2. 服务器脚本所在目录下的 .xguard-config.json
    server_dir = os.path.dirname(os.path.abspath(__file__))
    server_config = os.path.join(server_dir, '.xguard-config.json')
    if os.path.exists(server_config):
        return server_config
    
    # 3. 项目根目录下的 .xguard-config.json (相对于server目录的上一级)
    project_root = os.path.dirname(server_dir)
    project_config = os.path.join(project_root, '.xguard-config.json')
    if os.path.exists(project_config):
        return project_config
    
    return None

def load_model_config():
    """从配置文件加载模型配置"""
    config = {
        'model_path': None,
        'tokenizer_path': None
    }
    
    # 首先尝试从环境变量获取
    config['model_path'] = os.environ.get('XGUARD_MODEL_PATH')
    config['tokenizer_path'] = os.environ.get('XGUARD_TOKENIZER_PATH')
    
    # 如果环境变量未设置，尝试从配置文件加载
    if not config['model_path'] or not config['tokenizer_path']:
        config_file = get_config_file_path()
        if config_file:
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    if 'model_path' in user_config:
                        config['model_path'] = user_config['model_path']
                    if 'tokenizer_path' in user_config:
                        config['tokenizer_path'] = user_config['tokenizer_path']
            except Exception as e:
                logger.warning(f"加载配置文件失败: {e}")
    
    # 如果仍然没有设置，使用默认相对路径
    if not config['model_path']:
        # 默认模型路径：相对于项目根目录
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config['model_path'] = os.path.join(project_root, 'local_model')
    
    if not config['tokenizer_path']:
        # 默认tokenizer路径：相对于项目根目录  
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config['tokenizer_path'] = os.path.join(project_root, 'local_tokenizer')
    
    return config

def load_model():
    """加载XGuard模型（仅加载一次）"""
    global _model, _tokenizer
    if _model is None:
        logger.info("正在加载XGuard本地模型...")
        try:
            # 从配置文件或环境变量获取模型路径
            config = load_model_config()
            tokenizer_path = config['tokenizer_path']
            model_path = config['model_path']
            
            logger.info(f"使用模型路径: {model_path}")
            logger.info(f"使用tokenizer路径: {tokenizer_path}")
            
            _tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
            _model = AutoModelForCausalLM.from_pretrained(
                model_path, 
                torch_dtype="auto", 
                device_map="auto"
            ).eval()
            logger.info("XGuard本地模型加载完成")
        except Exception as e:
            logger.error(f"本地模型加载失败: {e}")
            raise RuntimeError("无法加载XGuard本地模型，请确保local_model和local_tokenizer目录存在")

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({"status": "healthy", "model_loaded": _model is not None})

@app.route('/check-commit', methods=['POST'])
def check_commit_message():
    """
    检测Commit Message安全性
    请求体: {"message": "commit message text"}
    响应: XGuard原生输出格式
    """
    if _model is None:
        load_model()
    
    data = request.get_json()
    commit_message = data.get('message', '')
    
    if not commit_message.strip():
        return jsonify({
            "risk_scores": {"Safe-Safe": 1.0},
            "explanation": "Empty message is considered safe.",
            "safe_score": 1.0
        })
    
    try:
        with model_lock:  # 确保线程安全
            # 使用与example.ipynb完全一致的推理方式
            result = infer(
                _model,
                _tokenizer,
                messages=[{"role": "user", "content": commit_message}],
                max_new_tokens=500,
                reason_first=False
            )
        
        risk_scores = result.get('risk_score', {})
        explanation = result.get('response', '')
        safe_score = risk_scores.get('Safe-Safe', 0)
        
        logger.info(f"检测完成 - Safe Score: {safe_score:.2%}")
        
        return jsonify({
            "risk_scores": risk_scores,
            "explanation": explanation,
            "safe_score": safe_score
        })
        
    except Exception as e:
        logger.error(f"检测过程中发生错误: {e}")
        return jsonify({
            "error": str(e),
            "risk_scores": {"Safe-Safe": 0.5},
            "explanation": "Error occurred during analysis.",
            "safe_score": 0.5
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    """获取当前配置"""
    config_path = os.path.join(os.getcwd(), '.xguard-config.json')
    default_config = {
        "risk_thresholds": {
            "Data Privacy-Personal Privacy": 0.4,
            "Cybersecurity-Access Control": 0.3,
            "Cybersecurity-Hacker Attack": 0.5
        },
        "timeout_seconds": 10,
        "skip_patterns": ["^fix", "^feat", "^docs", "^chore", "^refactor"],
        "min_length": 10
    }
    
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                # 合并配置
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
        except Exception as e:
            logger.warning(f"配置文件读取失败: {e}")
    
    return jsonify(default_config)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8765))
    host = os.environ.get('HOST', '127.0.0.1')
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    app.run(host=host, port=port, debug=debug, threaded=True)