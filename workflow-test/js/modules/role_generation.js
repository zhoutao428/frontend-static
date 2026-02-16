// js/modules/role_generation.js

import { updateFurnaceDisplay } from './alchemy_core.js';
import { runAgent } from './workflow.js';
import { RolePartsLibrary } from './role-parts-library.js';
import { showToast } from './ui.js';

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑
// -----------------------------------------------------------------------------
export async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    
    // 获取原始数据
    const lib = window.RolePartsLibrary || RolePartsLibrary;
    const rawRole = lib.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        showToast("错误：找不到角色数据", 'error');
        resetFurnace();
        return;
    }

    console.log(`🔥 开始炼丹: ${rawRole.name}`);

    // ---------------------------------------------------------
    // 🎬 动画启动 (采用您提供的兼容逻辑)
    // ---------------------------------------------------------
    if (window.AlchemyAnimation) {
        try {
            const roleData = { name: rawRole.name, icon: rawRole.icon || 'fa-user' };
            const modelData = { name: modelId, id: modelId }; // 暂用ID作为名称

            // 自动识别方法名：先试 Manager 版的 startAlchemy，再试 Object 版的 start
            if (typeof window.AlchemyAnimation.startAlchemy === 'function') {
                window.AlchemyAnimation.startAlchemy(roleData, modelData);
            } else if (typeof window.AlchemyAnimation.start === 'function') {
                window.AlchemyAnimation.start(roleData, modelData);
            }
        } catch (e) {
            console.warn('动画启动微瑕:', e);
        }
    }

    try {
        console.log(`🤖 请求云端炼丹 (使用后台配方)...`);
        
        // 调用后台 API
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

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

        // 🎬 动画结束 (同样做兼容处理)
        if (window.AlchemyAnimation && window.AlchemyAnimation.finish) {
            window.AlchemyAnimation.finish();
        }
        
        showToast('✨ 炼丹成功！新角色已生成 (临时)', 'success');

    } catch (err) {
        console.error("炼丹失败:", err);
        showToast(`❌ 炼丹失败: ${err.message}`, 'error');
        
        // 🎬 动画报错
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(err.message);
        }
    } finally {
        setTimeout(resetFurnace, 1500);
    }
}

function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    updateFurnaceDisplay();
}

// -----------------------------------------------------------------------------
// 2. 模拟互动逻辑 (保持不变)
// -----------------------------------------------------------------------------
export function simulateInteraction() {
    console.log("🎭 启动模拟互动...");
    if (!window.alchemyState || window.alchemyState.materials.length === 0) {
        alert("请先将角色拖入炼丹炉，再点击模拟！");
        return;
    }
    const roleMaterial = window.alchemyState.materials.find(m => m.type === 'role');
    if(roleMaterial) createCustomRoleWindow(roleMaterial.id);
}

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
                <div class="chat-container" id="${roleId}-chat" style="height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px;"></div>
                <div class="input-area" style="display: flex; gap: 10px;">
                    <textarea id="${roleId}-input" placeholder="输入内容..." style="flex: 1; height: 60px;"></textarea>
                    <button onclick="window.sendRoleMessage('${roleId}')">发送</button>
                </div>
            </div>`;
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
// 3. 真实的 AI 调用逻辑 (只调后台)
// -----------------------------------------------------------------------------
async function callRealAIForEnhancement(roleInfo, modelId) {
    console.log(`🤖 请求云端炼丹 (使用后台配方)...`);
    
    // 优先使用封装好的 api.js
    if (window.api && window.api.alchemyAPI) {
        return await window.api.alchemyAPI.forge(roleInfo.name, modelId);
    }
    
    // 兜底 fetch
    const apiUrl = 'https://public-virid-chi.vercel.app/api/alchemy/forge'; 
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: roleInfo.name, model_id: modelId })
    });

    if (!response.ok) throw new Error(`后台服务错误: ${response.status}`);
    const data = await response.json();
    
    if (!data.name) data.name = `${roleInfo.name} (AI版)`;
    return data;
}
