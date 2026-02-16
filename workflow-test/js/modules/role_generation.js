// js/modules/role_generation.js

// 1. 引入依赖 (不再假设，直接引用)
import { updateFurnaceDisplay } from './alchemy_core.js';
import { runAgent } from './workflow.js'; // 引入 runAgent，供 sendRoleMessage 使用
import { RolePartsLibrary } from './role-parts-library.js';
import { showToast } from './ui.js';

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑
// -----------------------------------------------------------------------------
export async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    if (isLocal) {
        console.log(`🔌 使用本地模型直连...`);
        // 从全局配置获取模型信息
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        if (!modelConfig) throw new Error("找不到本地模型配置，请先在右侧配置");

        // 构造 Prompt
        const simplePrompt = `请为角色 [${roleInfo.name}] 生成JSON定义。
要求：
1. description: 限制在30字以内。
2. tags: 严格限制为5个短词组。
3. 不要任何解释，直接返回JSON对象。

模板示例：
{
  "name": "${roleInfo.name}",
  "description": "负责统筹拍摄现场，指导演员表演。",
  "tags": ["场面调度", "剧本分析", "演员指导", "镜头语言", "团队管理"]
}`;
        try {
            const systemPrompt = "你是一个JSON生成器。只返回纯JSON，不要包含Markdown标记，不要包含任何解释性文字。";
            
            // 发起请求
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelConfig.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: simplePrompt }
                    ],
                    stream: false,
                    format: "json"
                })
            });

            if (!response.ok) throw new Error(`本地模型连接失败 (${response.status})`);

            const data = await response.json();
            // 兼容 Ollama 和其他格式
            let content = data.message?.content || data.response || data.choices?.[0]?.message?.content;
            if (!content) throw new Error("模型返回内容为空");
            
            // 清理 Markdown 标记
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            enhancedData = JSON.parse(content);

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            throw new Error(`本地模型调用失败: ${err.message}`);
        }
    } else {
        console.log(`🤖 请求云端炼丹...`);
        try {
            // 假设 api.js 已挂载到 window.api
            // 这里的 api 路径可能需要根据您实际的 api.js 调整
            if (window.api && window.api.alchemyAPI) {
                enhancedData = await window.api.alchemyAPI.forge(roleInfo.name, modelId);
            } else if (window.alchemyAPI) {
                enhancedData = await window.alchemyAPI.forge(roleInfo.name, modelId);
            } else {
                throw new Error("找不到云端 API 接口 (window.api.alchemyAPI)");
            }
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        // 兜底数据
        enhancedData = {
            name: `${roleInfo.name} (生成失败)`,
            description: "AI未返回有效格式。",
            tags: ["失败"],
            capabilities: { core: [] }
        };
    }
    
    // 确保名字存在
    if (!enhancedData.name) enhancedData.name = `${roleInfo.name} (AI版)`;
    
    return enhancedData;
}


function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    setTimeout(() => {
        updateFurnaceDisplay();
    }, 500);
}

// -----------------------------------------------------------------------------
// 2. 模拟互动逻辑
// -----------------------------------------------------------------------------

export function simulateInteraction() {
    console.log("🎭 启动模拟互动...");
    
    if (!window.alchemyState || window.alchemyState.materials.length === 0) {
        alert("请先将角色拖入炼丹炉，再点击模拟！");
        return;
    }
    
    const roleMaterial = window.alchemyState.materials.find(m => m.type === 'role');
    if (!roleMaterial) {
        alert("炼丹炉里没有角色！");
        return;
    }
    
    createCustomRoleWindow(roleMaterial.id);
}

// 导出这个辅助函数，因为 main.js 或者 html onclick 可能会用到
export function createCustomRoleWindow(roleId) {
    const roleName = (window.getRoleName && window.getRoleName(roleId)) || roleId;
    let panelId = `${roleId}-panel`;
    let panel = document.getElementById(panelId);
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'modal custom-role-window';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="modal-content" style="max-width: 600px; padding: 20px;">
                <span class="modal-close" onclick="document.getElementById('${panelId}').style.display='none'" style="float: right; cursor: pointer;">&times;</span>
                <h3>💬 ${roleName}</h3>
                <div class="chat-container" id="${roleId}-chat" style="height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
                    <div class="system-message" style="color: #888; text-align: center;">角色已就绪。</div>
                </div>
                <div class="input-area" style="display: flex; gap: 10px;">
                    <textarea id="${roleId}-input" placeholder="输入内容..." style="flex: 1; height: 60px;"></textarea>
                    <button onclick="window.sendRoleMessage('${roleId}')">发送</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }
    panel.style.display = 'flex';
}

// 导出发送消息函数
export async function sendRoleMessage(roleId) {
    const input = document.getElementById(`${roleId}-input`);
    const chat = document.getElementById(`${roleId}-chat`);
    if (!input || !chat) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    chat.innerHTML += `<div class="user-msg" style="text-align:right; margin:5px;"><b>我:</b> ${text}</div>`;
    input.value = '';
    
    chat.innerHTML += `<div class="ai-msg" style="text-align:left; margin:5px; color:blue;"><b>AI:</b> (正在思考...)</div>`;
    
    // 调用 runAgent (现在是从 workflow.js 导入的，不再是 window.runAgent)
    try {
        const response = await runAgent(roleId, text);
        chat.lastElementChild.innerHTML = `<b>AI:</b> ${response}`;
    } catch (e) {
        chat.lastElementChild.innerHTML = `<b>AI:</b> (出错) ${e.message}`;
    }
    
    chat.scrollTop = chat.scrollHeight;
}

