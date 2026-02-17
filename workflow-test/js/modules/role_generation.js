// js/modules/role_generation.js
import { log, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';
import { callRealAIForEnhancement, resetFurnace, updateFurnaceDisplay } from './alchemy_core.js';

/**
 * 启动AI炼丹主流程
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
        if (window.alchemyState) {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
        }
        if (window.updateFurnaceDisplay) updateFurnaceDisplay();
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
        console.log("【调试】AI返回的数据:", enhancedData);

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

        console.log(`👤 结算身份: ${userEmail}`);

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
                    const savedRole = await res.json();
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

        setTimeout(() => {
            if (window.alchemyState) {
                window.alchemyState.materials = [];
                window.alchemyState.isProcessing = false;
                if(window.updateFurnaceDisplay) updateFurnaceDisplay();
            }
        }, 2000);

    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        
        if (window.alchemyState) {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
            if(window.updateFurnaceDisplay) updateFurnaceDisplay();
        }
    }
}

/**
 * 发送角色消息
 */
export function sendRoleMessage(roleId, message) {
    console.log(`💬 发送消息给 ${roleId}:`, message);
    // 实际发送逻辑
}

/**
 * 创建自定义角色窗口
 */
export function createCustomRoleWindow(roleId) {
    console.log(`🪟 创建角色窗口: ${roleId}`);
    // 窗口创建逻辑
}

/**
 * 模拟交互（用于演示）
 */
export function simulateInteraction() {
    log('开始模拟交互...');
    
    setTimeout(() => {
        if (window.builderData && window.builderData[0]) {
            window.builderData[0].roles.push('frontend_expert');
            window.builderData[0].roles.push('data_analyst');
            if (typeof renderGroups === 'function') renderGroups();
            log('模拟：添加了2个角色到分组');
        }
    }, 500);
    
    setTimeout(() => {
        if (typeof window.bindModelToRole === 'function') {
            window.bindModelToRole('frontend_expert', 'deepseek-chat');
            window.bindModelToRole('data_analyst', 'gpt4');
        }
        log('模拟：绑定了2个模型');
    }, 1000);
    
    setTimeout(() => {
        if (typeof window.addGroup === 'function') {
            window.addGroup();
        }
        log('模拟：添加了新分组');
    }, 1500);
    
    setTimeout(() => {
        if (!window.apiConfigs || !window.apiConfigs.has('ui_designer')) {
            const uiConfig = {
                type: 'openai',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4',
                temperature: 0.9,
                systemPrompt: '你是一个专业的UI设计师，擅长Figma和Sketch等设计工具。'
            };
            if (window.apiConfigs) {
                window.apiConfigs.set('ui_designer', uiConfig);
                if (typeof window.updateApiStatus === 'function') {
                    window.updateApiStatus('ui_designer');
                }
            }
            log('模拟：为UI设计师配置了API');
        }
    }, 2000);
}
