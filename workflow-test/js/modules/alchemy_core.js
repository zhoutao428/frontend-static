// js/modules/alchemy_core.js
import { chatAPI, alchemyAPI } from '../api.js';
import { log, parseJSONSafe, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';

/**
 * 炼丹炉显示更新
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
 * 检查炼丹条件是否满足
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
 * 初始化炼丹状态
 */
export function initializeAlchemyState() {
    if (!window.alchemyState) {
        window.alchemyState = {
            materials: [],
            isProcessing: false
        };
    }
}

/**
 * 重置炼丹炉
 */
export function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    updateFurnaceDisplay();
}

/**
 * 调用真实AI进行角色增强
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
            console.log("🦙 正在调用本地模型:", modelConfig.model);
            
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

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`本地模型连接失败 (${response.status}): ${errText}`);
            }

            const data = await response.json();
            
            let content = data.message?.content || data.response;
            
            if (!content) throw new Error("Ollama 返回内容为空");

            console.log("🦙 原始返回:", content);

            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            enhancedData = JSON.parse(content);

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            alert(`本地模型调用失败: ${err.message}，将使用基础模板。`);
            
            enhancedData = {
                name: roleInfo.name,
                description: "本地模型生成失败，这是默认描述。",
                expertise: ["基础能力"],
                tone: "默认",
                prompt: "你是一个助手。"
            };
        }

    } else {
        log(`🤖 请求云端炼丹 (Prompt 受保护)...`);
        try {
            console.log('🔥【炼丹调试】roleName:', roleInfo.name);
            console.log('🔥【炼丹调试】原始modelId:', modelId, '类型:', typeof modelId);
            console.log('🔥【炼丹调试】转换后modelId:', typeof modelId === 'string' ? parseInt(modelId, 10) : modelId);
            
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
 * Toast提示工具
 */
function showToast(msg, type='info') {
    if (window.showToast) {
        window.showToast(msg, type);
    } else {
        alert(msg);
    }
}

/**
 * 保存角色到本地
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
// js/modules/alchemy_core.js 底部
export {
    updateFurnaceDisplay,
    checkAlchemyReady,
    initializeAlchemyState,
    resetFurnace,
    callRealAIForEnhancement,
    saveToLocal  // 添加导出
};
