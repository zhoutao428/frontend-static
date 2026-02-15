// js/modules/role_generation.js

// 假设 updateFurnaceDisplay 在 alchemy_core.js，且已挂载到 window
// 假设 RolePartsLibrary 在 role-parts-library.js，且已挂载到 window

// -----------------------------------------------------------------------------
// 1. 炼丹核心逻辑
// -----------------------------------------------------------------------------
async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    if (window.updateFurnaceDisplay) window.updateFurnaceDisplay();

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    
    // 获取原始数据
    const rawRole = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        if(window.showToast) window.showToast("错误：找不到角色数据", 'error');
        resetFurnace();
        return;
    }

    console.log(`🔥 开始炼丹: ${rawRole.name}`);

    // 模拟 AI 处理过程 (这里应保留您原有的真实API调用，为演示暂用模拟)
    // ⚠️ 请务必确认这里是否有真实的 callRealAIForEnhancement 函数逻辑
    // 如果有，请粘贴进来。如果没有，这里是一个模拟版本：
    const enhancedData = await new Promise(resolve => setTimeout(() => resolve({
        name: `${rawRole.name} (AI版)`,
        description: `由 ${modelId} 增强的角色描述`,
        tags: ["AI增强", "智能"],
        system_prompt: "你是一个AI助手"
    }), 1000));

    // 构造新角色数据
    const updatedRoleData = {
        ...rawRole, // 保留原属性
        ...enhancedData, // 覆盖新属性
        is_temp: true, // 👈 关键：标记为临时
        is_local: false // 还没入库
    };

    // 💡 核心修复：只更新临时列表，不写 LocalStorage
    window.RolePartsLibrary.tempManager.upsert(updatedRoleData);

    console.log(`✅ 角色生成完毕 (临时状态)`);
    if (window.showToast) window.showToast('生成成功！请手动保存到仓库。', 'success');

    resetFurnace();
}

function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    setTimeout(() => {
        if (window.updateFurnaceDisplay) window.updateFurnaceDisplay();
    }, 500);
}

// -----------------------------------------------------------------------------
// 2. 模拟互动逻辑 (补回丢失的几百行)
// -----------------------------------------------------------------------------

function simulateInteraction() {
    console.log("🎭 启动模拟互动...");
    
    // 检查炼丹炉是否有角色
    if (!window.alchemyState || window.alchemyState.materials.length === 0) {
        alert("请先将角色拖入炼丹炉，再点击模拟！");
        return;
    }
    
    const roleMaterial = window.alchemyState.materials.find(m => m.type === 'role');
    if (!roleMaterial) {
        alert("炼丹炉里没有角色！");
        return;
    }
    
    const roleId = roleMaterial.id;
    // 打开对话窗口
    createCustomRoleWindow(roleId);
}

// 创建并打开自定义角色的对话窗口 (如果 ui.js 里没有，这里必须补上)
function createCustomRoleWindow(roleId) {
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

// 发送消息逻辑 (必须补上)
async function sendRoleMessage(roleId) {
    const input = document.getElementById(`${roleId}-input`);
    const chat = document.getElementById(`${roleId}-chat`);
    if (!input || !chat) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // 显示用户消息
    chat.innerHTML += `<div class="user-msg" style="text-align:right; margin:5px;"><b>我:</b> ${text}</div>`;
    input.value = '';
    
    // 模拟 AI 回复 (这里应接入真实 API)
    chat.innerHTML += `<div class="ai-msg" style="text-align:left; margin:5px; color:blue;"><b>AI:</b> (正在思考...)</div>`;
    
    // 假设调用 runAgent
    if (window.runAgent) {
        try {
            const response = await window.runAgent(roleId, text);
            // 移除思考中，显示回复
            chat.lastElementChild.innerHTML = `<b>AI:</b> ${response}`;
        } catch (e) {
            chat.lastElementChild.innerHTML = `<b>AI:</b> (出错) ${e.message}`;
        }
    } else {
        // 兜底模拟
        setTimeout(() => {
            chat.lastElementChild.innerHTML = `<b>AI:</b> 我收到了你的消息：${text}`;
        }, 1000);
    }
    
    chat.scrollTop = chat.scrollHeight;
}

// -----------------------------------------------------------------------------
// 3. 挂载到 Window
// -----------------------------------------------------------------------------
window.startAIAlchemy = startAIAlchemy;
window.simulateInteraction = simulateInteraction;
window.createCustomRoleWindow = createCustomRoleWindow;
window.sendRoleMessage = sendRoleMessage;
