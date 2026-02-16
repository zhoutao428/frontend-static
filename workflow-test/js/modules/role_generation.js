// js/modules/role_generation.js

// 1. 引入依赖
import { updateFurnaceDisplay } from './alchemy_core.js';
import { runAgent } from './workflow.js';
import { RolePartsLibrary } from './role-parts-library.js';
import { showToast } from './ui.js';

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑 (导出)
// -----------------------------------------------------------------------------
export async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    
    // 获取原始数据 (使用导入的 RolePartsLibrary)
    const rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        showToast("错误：找不到角色数据", 'error');
        resetFurnace();
        return;
    }

    console.log(`🔥 开始炼丹: ${rawRole.name}`);

    // ---------------------------------------------------------
    // 🚀 真实调用开始 (去掉了所有模拟代码)
    // ---------------------------------------------------------
    let enhancedData = null;
    try {
        console.log(`🤖 调用AI API...`);
        // 调用下面的真实函数
        enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

    } catch (err) {
        console.error("炼丹失败:", err);
        showToast(`炼丹失败: ${err.message}`, 'error');
        resetFurnace();
        return;
    }

    // 构造新角色数据
    const updatedRoleData = {
        ...rawRole,
        ...enhancedData,
        is_temp: true, // 标记为临时
        is_local: false
    };

    // 更新临时列表
    RolePartsLibrary.tempManager.upsert(updatedRoleData);

    console.log(`✅ 角色生成完毕 (临时状态)`);
    showToast('生成成功！请手动保存到仓库。', 'success');

    resetFurnace();
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
// 2. 模拟互动逻辑 (导出)
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

// 导出辅助函数
export function createCustomRoleWindow(roleId) {
    // 尝试获取名称
    const roleName = RolePartsLibrary.getRoleDetailsEnhanced(roleId)?.name || roleId;
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

export async function sendRoleMessage(roleId) {
    const input = document.getElementById(`${roleId}-input`);
    const chat = document.getElementById(`${roleId}-chat`);
    if (!input || !chat) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    chat.innerHTML += `<div class="user-msg" style="text-align:right; margin:5px;"><b>我:</b> ${text}</div>`;
    input.value = '';
    
    chat.innerHTML += `<div class="ai-msg" style="text-align:left; margin:5px; color:blue;"><b>AI:</b> (正在思考...)</div>`;
    
    try {
        const response = await runAgent(roleId, text);
        chat.lastElementChild.innerHTML = `<b>AI:</b> ${response}`;
    } catch (e) {
        chat.lastElementChild.innerHTML = `<b>AI:</b> (出错) ${e.message}`;
    }
    
    chat.scrollTop = chat.scrollHeight;
}

// -----------------------------------------------------------------------------
// 3. 真实的 AI 调用逻辑 (内部使用，无需导出)
// -----------------------------------------------------------------------------
async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    if (isLocal) {
        console.log(`🔌 使用本地模型直连...`);
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        if (!modelConfig) throw new Error("找不到本地模型配置");

        const simplePrompt = `请为角色 [${roleInfo.name}] 生成JSON定义。\n要求：\n1. description: 限制30字。\n2. tags: 5个短词。\n3. 直接返回JSON。`;
        
        try {
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelConfig.model,
                    messages: [
                        { role: 'system', content: "你是一个JSON生成器。" },
                        { role: 'user', content: simplePrompt }
                    ],
                    stream: false,
                    format: "json"
                })
            });

            if (!response.ok) throw new Error(`本地模型连接失败 (${response.status})`);

            const data = await response.json();
            let content = data.message?.content || data.response;
            if (!content) throw new Error("模型返回内容为空");
            
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            enhancedData = JSON.parse(content);

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            throw err;
        }
    } else {
        console.log(`🤖 请求云端炼丹...`);
        try {
            // 假设 api.js 已挂载 (如果没有挂载，这里会报错，请确保 window.api 存在)
            if (window.api && window.api.alchemyAPI) {
                enhancedData = await window.api.alchemyAPI.forge(roleInfo.name, modelId);
            } else {
                // 兜底模拟 (防止没有云端环境时彻底卡死)
                console.warn("⚠️ 未找到云端 API，使用模拟数据");
                enhancedData = {
                    name: `${roleInfo.name} (AI版)`,
                    description: "云端API未连接，这是模拟描述。",
                    tags: ["模拟数据"]
                };
            }
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        throw new Error("AI未返回有效格式。");
    }
    
    if (!enhancedData.name) enhancedData.name = `${roleInfo.name} (AI版)`;
    
    return enhancedData;
}
