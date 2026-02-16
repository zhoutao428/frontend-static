// js/modules/role_generation.js

import { updateFurnaceDisplay } from './alchemy_core.js';
import { runAgent } from './workflow.js';
import { RolePartsLibrary } from './role-parts-library.js';
import { showToast } from './ui.js';

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑 (带动画)
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

    // 🎬 1. 启动动画 (复用旧版逻辑：先启动)
    if (window.AlchemyAnimation && window.AlchemyAnimation.start) {
        window.AlchemyAnimation.start(
            { name: rawRole.name, icon: rawRole.icon || 'fa-user' }, 
            { name: modelId, icon: 'fa-cube' }
        );
    }

    try {
        console.log(`🤖 请求云端炼丹 (使用后台配方)...`);
        
        // 🚀 2. 真实调用 (不加额外延迟，API多快动画就多快)
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

        // 3. 构造新角色数据
        const updatedRoleData = {
            ...rawRole,
            ...enhancedData,
            is_temp: true, // 保留今天的修改：标记为临时
            is_local: false
        };

        // 4. 更新临时列表 (保留今天的修改：解决双胞胎)
        lib.tempManager.upsert(updatedRoleData);

        console.log(`✅ 角色生成完毕 (临时状态)`);

        // 🎬 5. 动画完成 (API 回来后立刻调用)
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
        // 延迟重置，给用户看一眼结果
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
// 3. 真实的 AI 调用逻辑 (只调后台 API)
// -----------------------------------------------------------------------------
async function callRealAIForEnhancement(roleInfo, modelId) {
    console.log(`🤖 请求云端炼丹 (使用后台配方)...`);
    let enhancedData = null;

    try {
        // 优先使用 window.api 封装
        if (window.api && window.api.alchemyAPI) {
            enhancedData = await window.api.alchemyAPI.forge(roleInfo.name, modelId);
        } 
        // 否则直接 fetch
        else {
            // ⚠️ 这里的 URL 请替换为您真实的后端地址
            const apiUrl = 'https://public-virid-chi.vercel.app/api/alchemy/forge'; 
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role_name: roleInfo.name, 
                    model_id: modelId
                })
            });

            if (!response.ok) {
                throw new Error(`后台服务错误: ${response.status}`);
            }
            enhancedData = await response.json();
        }
    } catch (err) {
        console.error("云端炼丹失败:", err);
        throw err;
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        throw new Error("后台返回数据为空");
    }
    if (!enhancedData.name) enhancedData.name = `${roleInfo.name} (AI版)`;
    
    return enhancedData;
}

