// js/role_generation.js
import { chatAPI, alchemyAPI } from '../api.js';
import { log, parseJSONSafe, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';

/**
 * 更新炼丹炉的界面显示
 */
export function updateFurnaceDisplay() {
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint || !window.alchemyState) return;
    
    const count = window.alchemyState.materials.length;
    const p = dropHint.querySelector('p') || dropHint;
    
    if (window.alchemyState.isProcessing) {
        p.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> 正在铸造中...`;
    } else if (count === 0) {
        p.innerHTML = `<i class="fas fa-arrow-down"></i> 拖入 [角色] + [模型]`;
    } else if (count === 1) {
        const item = window.alchemyState.materials[0];
        const typeText = item.type === 'role' ? '角色' : '模型';
        p.innerHTML = `<i class="fas fa-plus"></i> 已放入${typeText}，还差一个...`;
    }
}

/**
 * 检查炼丹原料是否齐备，并触发炼丹
 */
export function checkAlchemyReady() {
    if (!window.alchemyState) return;
    const materials = window.alchemyState.materials;
    
    const roleMaterial = materials.find(m => m.type === 'role');
    const modelMaterial = materials.find(m => m.type === 'model');

    if (roleMaterial && modelMaterial) {
        console.log('✅ 原料齐备，正在构造 Mock DOM...');

        const extractString = (val) => {
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val !== null) {
                return val.name || val.title || val.innerText || "未知";
            }
            return String(val || "");
        };

        const realRoleData = roleMaterial.id?.id ? roleMaterial.id : roleMaterial;
        const roleNameStr = extractString(realRoleData.name || realRoleData.id?.name);

        const mockRoleEl = {
            dataset: { id: realRoleData.id || "unknown_role" },
            getAttribute: () => realRoleData.id || "unknown_role",
            querySelector: (sel) => {
                if (sel.includes('name')) return { innerText: roleNameStr };
                if (sel.includes('icon') || sel.includes('i')) return { 
                    className: extractString(realRoleData.icon || "fa-user") 
                };
                return { innerText: "" }; 
            }
        };

        const realModelData = modelMaterial.id?.id ? modelMaterial.id : modelMaterial;
        const modelNameStr = extractString(realModelData.name || modelMaterial.name);

        const mockModelEl = {
            dataset: { id: realModelData.id || "unknown_model" },
            getAttribute: () => realModelData.id || "unknown_model",
            querySelector: (sel) => {
                if (sel.includes('name')) {
                    const rawName = realModelData.name;
                    const safeName = (typeof rawName === 'object') ? (rawName.innerText || "AI模型") : rawName;
                    return { innerText: String(safeName), trim: () => String(safeName).trim() };
                }
                return { innerText: "" };
            }
        };
        
        startAIAlchemy(mockRoleEl, mockModelEl).catch(e => console.error("❌ 启动失败:", e));
    }
}

/**
 * 启动 AI 炼丹（角色生成）的主流程
 */
export async function startAIAlchemy(roleItem, modelItem) {
    console.log('炼丹参数:', { roleItem, modelItem });

    let roleId = roleItem;
    if (typeof roleId === 'object') roleId = roleId.id || roleId.data?.id || roleItem.dataset?.id;
    
    let modelId = modelItem;
    if (typeof modelId === 'object') modelId = modelId.id || modelId.data?.id || modelItem.dataset?.id;

    const getSafeName = (item) => {
        if (!item) return "未知";
        if (typeof item === 'string') return "未知";
        return item.name || item.querySelector?.('.part-name')?.innerText.trim() || "未知";
    };
    
    const roleName = window.getRoleName ? window.getRoleName(roleId) : getSafeName(roleItem);
    const modelName = window.getModelName ? window.getModelName(modelId) : getSafeName(modelItem);

    log(`🔥 检查炼丹条件: ${roleName} + ${modelName}`);

    const isCloudModel = typeof modelId === 'string' && !modelId.startsWith('custom_');
    const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;

    if (!isCloudModel && (!modelConfig || !modelConfig.endpoint)) {
        log(`❌ 失败：模型 [${modelName}] 未配置API地址`);
        alert(`请先为 [${modelName}] 配置API地址`);
        resetFurnace();
        return;
    }

    log(`✅ 炼丹条件满足，开始炼制...`);

    if (window.AlchemyAnimation) {
        try {
            const roleData = { name: roleName, icon: 'fa-user' };
            const modelData = { name: modelName, id: modelId };
            if (typeof window.AlchemyAnimation.startAlchemy === 'function') {
                window.AlchemyAnimation.startAlchemy(roleData, modelData);
            } else if (typeof window.AlchemyAnimation.start === 'function') {
                window.AlchemyAnimation.start(roleData, modelData);
            }
        } catch (e) {
            console.warn('动画启动微瑕:', e);
        }
    }

    if (window.alchemyState) window.alchemyState.isProcessing = true;
    if (window.updateFurnaceDisplay) updateFurnaceDisplay();

    try {
        let rawRole = null;
        if (window.RolePartsLibrary && typeof RolePartsLibrary.getRoleDetailsEnhanced === 'function') {
            try { rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId); } catch(e){}
        }
        if (!rawRole && typeof roleId === 'string' && roleId.startsWith('user_')) {
            if (window.RolePartsLibrary && window.RolePartsLibrary.userParts && typeof window.RolePartsLibrary.userParts.find === 'function') {
                rawRole = RolePartsLibrary.userParts.find(roleId);
            }
        }
        if (!rawRole) {
            rawRole = { name: roleName, id: roleId, tags: [], description: "", icon: "fa-user" };
        }

        log(`🤖 调用AI API进行角色增强...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

        const newRoleName = enhancedData.name || `${roleName} (增强版)`;
        const newRole = {
            name: newRoleName,
            description: enhancedData.description || `由 ${modelName} 增强`,
            icon: rawRole.icon || 'fa-robot',
            bg_class: 'role-ai',
            expertise: enhancedData.tags || enhancedData.expertise || [],
            prompt_template: enhancedData.prompt || enhancedData.system_prompt || "",
            actions: enhancedData.actions || [],
            capabilities: enhancedData.capabilities || { core: [] },
            role_type: 'user',
            is_deletable: true,
            created_at: new Date().toISOString()
        };
        
        let userEmail = '';
        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            userEmail = data.session?.user?.email;
            token = data.session?.access_token;
        }

        if (userEmail === 'z17756037070@gmail.com') {
            if (confirm(`👑 管理员操作\n\n是否发布到官方云端仓库？\n(取消则存入本地)`)) {
                try {
                    const cloudRole = { ...newRole, role_type: 'system', is_deletable: false };
                    const res = await fetch(`${API_BASE}/api/roles`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(cloudRole)
                    });
                    if (!res.ok) throw new Error("云端上传失败");
                    showToast(`🎉 [官方] 角色已发布！`);
                } catch(e) {
                    alert("发布失败: " + e.message);
                    saveToLocal(newRole);
                }
            } else {
                saveToLocal(newRole);
            }
        } else {
            saveToLocal(newRole);
        }

        log(`✅ 炼丹成功！新角色 [${newRoleName}] 已生成`);

        if (window.AlchemyAnimation && window.AlchemyAnimation.finish) {
            window.AlchemyAnimation.finish();
        }

        setTimeout(() => resetFurnace(), 2000);

    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        resetFurnace();
    }
}

/**
 * 调用真实 AI 进行角色增强
 */
export async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    if (isLocal) {
        log(`🔌 使用本地模型直连...`);
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        if (!modelConfig) throw new Error("找不到本地模型配置，请先在右侧配置");

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

            if (!response.ok) throw new Error(`本地模型连接失败 (${response.status}): ${await response.text()}`);

            const data = await response.json();
            let content = data.message?.content || data.response;
            if (!content) throw new Error("Ollama 返回内容为空");
            
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            enhancedData = JSON.parse(content);

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            alert(`本地模型调用失败: ${err.message}，将使用基础模板。`);
            enhancedData = {
                name: roleInfo.name,
                description: "本地模型生成失败，这是默认描述。",
                expertise: ["基础能力"],
                prompt: "你是一个助手。"
            };
        }
    } else {
        log(`🤖 请求云端炼丹 (Prompt 受保护)...`);
        try {
            enhancedData = await alchemyAPI.forge(roleInfo.name, modelId);
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        enhancedData = {
            name: `${roleInfo.name} (生成失败)`,
            description: "AI未返回有效格式，请检查模型输出或Prompt。",
            tags: ["失败"],
            capabilities: { core: [] }
        };
    }
    if (!enhancedData.name) {
        enhancedData.name = `${roleInfo.name} (AI版)`;
    }
    return enhancedData;
}

/**
 * 将生成的角色保存到本地
 */
function saveToLocal(role) {
    role.id = `local_${Date.now()}`;
    role.is_local = true;
    role.tags = role.expertise || role.tags || []; 
    role.desc = role.description || "";
    role.category = 'custom';
    
    let localRoles = [];
    try {
        localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
    } catch(e) { localRoles = []; }
    
    localRoles.unshift(role);
    localStorage.setItem('user_templates', JSON.stringify(localRoles));
    
    console.log("🔄 正在刷新侧边栏...");
    if (window.RolePartsLibrary) {
        if (typeof window.RolePartsLibrary.loadUserRoles === 'function') {
            window.RolePartsLibrary.loadUserRoles();
        } else if (window.RolePartsLibrary.userParts) {
            if (window.RolePartsLibrary.userParts.add) {
                window.RolePartsLibrary.userParts.add(role);
            }
            if (window.RolePartsLibrary.userParts.init) {
                window.RolePartsLibrary.userParts.init();
            }
        }
    }
    
    if (typeof window.renderPartsGrid === 'function') {
        window.renderPartsGrid();
    }
    
    showToast(`✅ 角色 [${role.name}] 已存入本地`);
}

/**
 * 重置炼丹炉状态
 */
export function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
        updateFurnaceDisplay();
    }
}

/**
 * 显示一个 Toast 消息
 */
function showToast(msg, type='info') {
    if (window.showToast) {
        window.showToast(msg, type);
    } else {
        alert(msg);
    }
}

/**
 * 触发快捷技能
 */
window.quickAction = async function(roleId, promptTemplate) {
    console.log(`⚡ 触发快捷技能: ${roleId}`);
    const stage = document.getElementById('main-stage');
    
    if (stage && window.createCustomRoleWindow) {
        window.createCustomRoleWindow(roleId);
        const panel = document.getElementById(`${roleId}-panel`);
        const input = panel?.querySelector('textarea');
        if (input) {
            input.value = promptTemplate;
            input.focus();
        }
        if (!stage.contains(panel)) {
            stage.appendChild(panel);
            panel.style.display = 'flex';
            const empty = stage.querySelector('.empty-state');
            if(empty) empty.style.display = 'none';
        }
    } else {
        alert(`【技能预览】\n\n角色ID: ${roleId}\n指令模板: ${promptTemplate}\n\n(请在 Workbench 主页中使用此功能以执行)`);
    }
};

