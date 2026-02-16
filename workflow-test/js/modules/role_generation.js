// js/modules/role_generation.js

// 1. 引入依赖 (不再假设，直接引用)
import { updateFurnaceDisplay } from './alchemy_core.js';
import { runAgent } from './workflow.js'; // 引入 runAgent，供 sendRoleMessage 使用
import { RolePartsLibrary } from './role-parts-library.js';
import { showToast } from './ui.js';

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑
// -----------------------------------------------------------------------------
export async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay(); // 调用导入的函数

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    
    // 获取原始数据
    // 注意：如果 role-parts-library.js 是全局脚本没 export，这里就只能用 window.RolePartsLibrary
    const lib = window.RolePartsLibrary || RolePartsLibrary;
    const rawRole = lib.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        showToast("错误：找不到角色数据", 'error');
        resetFurnace();
        return;
    }

    console.log(`🔥 开始炼丹: ${rawRole.name}`);

    // 模拟 AI 处理 (请替换为您真实的 API 调用)
    const enhancedData = await new Promise(resolve => setTimeout(() => resolve({
        name: `${rawRole.name} (AI版)`,
        description: `由 ${modelId} 增强的角色描述`,
        tags: ["AI增强", "智能"],
        system_prompt: "你是一个AI助手"
    }), 1000));

    // 构造新角色数据
    const updatedRoleData = {
        ...rawRole,
        ...enhancedData,
        is_temp: true, // 标记为临时
        is_local: false
    };

    // 更新临时列表
    lib.tempManager.upsert(updatedRoleData);

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
