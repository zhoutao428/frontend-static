// 文件名: role_generation.js (完整版本)

import { updateFurnaceDisplay } from './alchemy_core.js';

/**
 * 启动 AI 炼丹（角色生成）的主流程
 * @param {object} roleMaterial - 炼丹炉中的角色原料
 * @param {object} modelMaterial - 炼丹炉中的模型原料
 */
export async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();

    // 假设 roleMaterial.id 是创建时生成的临时ID
    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    const rawRole = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        window.showToast(`错误：找不到ID为 ${roleId} 的原始角色数据。`, 'error');
        resetFurnace();
        return;
    }
    
    const roleName = rawRole.name || '未知角色';
    const modelName = modelMaterial.name || '未知模型';

    console.log(`🔥 开始炼丹: ${roleName} + ${modelName}`);

    if (window.AlchemyAnimation?.start) {
        window.AlchemyAnimation.start({ name: roleName, icon: rawRole.icon }, { name: modelName });
    }

    try {
        console.log(`🤖 调用AI API进行角色增强...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        if (!enhancedData) throw new Error("AI未返回有效数据");

        const updatedRoleData = {
            name: enhancedData.name || `${rawRole.name} (增强版)`,
            description: enhancedData.description || `由 ${modelName} 增强`,
            icon: enhancedData.icon || rawRole.icon || 'fa-robot',
            bg_class: 'role-ai',
            expertise: enhancedData.tags || enhancedData.expertise || [],
            prompt_template: enhancedData.prompt || enhancedData.system_prompt || "",
            actions: enhancedData.actions || [],
            capabilities: enhancedData.capabilities || { core: [] }
        };

        // 【核心修复】调用 update 方法，实现“装备升级”
        const success = window.RolePartsLibrary.userParts.update(roleId, updatedRoleData);

        if (success) {
            console.log(`✅ 装备升级成功！角色 [${updatedRoleData.name}] 已更新。`);
            window.showToast(`✅ 角色 [${updatedRoleData.name}] 已生成`, 'success');
            
            if (typeof window.renderPartsGrid === 'function') {
                window.renderPartsGrid(); // 刷新UI
            }
        } else {
            throw new Error(`更新角色 ${roleId} 失败。该角色可能已被删除。`);
        }

        if (window.AlchemyAnimation?.finish) window.AlchemyAnimation.finish();
        
    } catch (error) {
        console.error("❌ 炼丹失败:", error);
        window.showToast(`❌ 炼丹失败: ${error.message}`, 'error');
        if (window.AlchemyAnimation?.showError) window.AlchemyAnimation.showError(error.message);
    } finally {
        resetFurnace();
    }
}

/**
 * 【完整版】调用真实 AI API 进行角色增强
 * (此函数之前被省略，现在已补全)
 */
async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    if (isLocal) {
        console.log(`🔌 使用本地模型直连...`);
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        if (!modelConfig || !modelConfig.endpoint) {
            throw new Error("找不到本地模型配置，请先在右侧配置");
        }

        // 这里的 Prompt 来自您原始文件，是核心业务逻辑
        const simplePrompt = `请为角色 [${roleInfo.name}] 生成JSON定义。\n要求:\n1. description: 限制在30字以内。\n2. tags: 严格限制为5个短词组。\n3. 不要任何解释，直接返回JSON对象。\n\n模板示例:\n{\n  "name": "${roleInfo.name}",\n  "description": "负责统筹拍摄现场，指导演员表演。",\n  "tags": ["场面调度", "剧本分析", "演员指导", "镜头语言", "团队管理"]\n}`;
        
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
            if (!content) throw new Error("Ollama 模型返回内容为空");
            
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            enhancedData = JSON.parse(content);

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            throw new Error(`本地模型调用失败: ${err.message}`);
        }
    } else {
        console.log(`☁️ 请求云端炼丹 (Prompt 受保护)...`);
        try {
            // 假设 alchemyAPI 在全局可用
            enhancedData = await window.alchemyAPI.forge(roleInfo.name, modelId);
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        throw new Error("AI未返回有效格式的数据。");
    }
    
    if (!enhancedData.name) {
        enhancedData.name = `${roleInfo.name} (AI版)`;
    }
    return enhancedData;
}


/**
 * 重置炼丹炉状态和UI
 */
function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    // 延迟一点更新UI，让用户看到最终状态
    setTimeout(updateFurnaceDisplay, 500);
}
