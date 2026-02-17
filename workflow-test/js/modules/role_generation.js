// js/modules/role_generation.js
import { log, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';
import { callRealAIForEnhancement, updateFurnaceDisplay, saveToLocal } from './alchemy_core.js';

/**
 * 启动AI炼丹主流程
 */
export async function startAIAlchemy(roleItem, modelItem) {
    console.log('炼丹参数:', { roleItem, modelItem });

    // 提取ID
    let roleId = roleItem;
    if (typeof roleId === 'object') roleId = roleId.id || roleId.data?.id || roleItem.dataset?.id;
    
    let modelId = modelItem;
    if (typeof modelId === 'object') modelId = modelId.id || modelId.data?.id || modelItem.dataset?.id;

    // 获取名称
    const getSafeName = (item) => {
        if (!item) return "未知";
        if (typeof item === 'string') return "未知";
        return item.name || item.querySelector?.('.part-name')?.innerText.trim() || "未知";
    };
    
    const roleName = window.getRoleName ? window.getRoleName(roleId) : getSafeName(roleItem);
    const modelName = window.getModelName ? window.getModelName(modelId) : getSafeName(modelItem);

    log(`🔥 检查炼丹条件: ${roleName} + ${modelName}`);

    // 检查模型配置
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

    // 启动动画
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

    // 锁定炼丹炉
    if (window.alchemyState) window.alchemyState.isProcessing = true;
    if (window.updateFurnaceDisplay) updateFurnaceDisplay();

    try {
        // 获取原始角色数据
        let rawRole = null;

        if (window.RolePartsLibrary && typeof RolePartsLibrary.getRoleDetailsEnhanced === 'function') {
            try { rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId); } catch(e){}
        }

        if (!rawRole && typeof roleId === 'string' && roleId.startsWith('user_')) {
            if (window.RolePartsLibrary?.userParts?.find) {
                rawRole = RolePartsLibrary.userParts.find(roleId);
            }
        }

        if (!rawRole) {
            rawRole = { name: roleName, id: roleId };
        }

        log(`🤖 调用AI API进行角色增强...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

        // 组装新角色
        const newRole = {
            name: enhancedData.name || `${roleName} (增强版)`,
            description: enhancedData.description || `由 ${modelName} 增强`,
            icon: rawRole.icon || 'fa-robot',
            bg_class: 'role-ai',
            color: rawRole.color || '#94a3b8',
            expertise: enhancedData.tags || enhancedData.expertise || [],
            prompt_template: enhancedData.prompt || enhancedData.system_prompt || "",
            actions: enhancedData.actions || [],
            capabilities: enhancedData.capabilities || { core: [] },
            role_type: 'user',
            is_deletable: true,
            created_at: new Date().toISOString()
        };
        
        // 获取用户信息
        let userEmail = '';
        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            userEmail = data.session?.user?.email;
            token = data.session?.access_token;
        }

        console.log(`👤 结算身份: ${userEmail}`);

        // 管理员发布或本地保存
        let saved = false;
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
                    saved = true;
                    showToast(`🎉 [官方] 角色已发布！`);
                } catch(e) {
                    alert("发布失败: " + e.message);
                    saveToLocal(newRole);
                    saved = true;
                }
            } else {
                saveToLocal(newRole);
                saved = true;
            }
        } else {
            saveToLocal(newRole);
            saved = true;
        }

        // 删除旧角色（无论它在哪里）
        if (saved && rawRole && rawRole.id) {
            // 从 localStorage 删除
            let localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
            localRoles = localRoles.filter(r => r.id !== rawRole.id);
            localStorage.setItem('user_templates', JSON.stringify(localRoles));
            
            // 从 userParts 内存删除
            if (window.RolePartsLibrary?.userParts?.delete) {
                window.RolePartsLibrary.userParts.delete(rawRole.id);
            }
            
            // 从 tempParts 临时区删除
            if (window.RolePartsLibrary?.tempParts) {
                window.RolePartsLibrary.tempParts = window.RolePartsLibrary.tempParts.filter(p => p.id !== rawRole.id);
            }
            
            // 刷新UI
            if (window.renderPartsGrid) window.renderPartsGrid();
        }

        log(`✅ 炼丹成功！新角色 [${newRole.name}] 已生成`);

        // 结束动画
        if (window.AlchemyAnimation?.finish) {
            window.AlchemyAnimation.finish();
        }

    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        
        if (window.AlchemyAnimation?.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        
    } finally {
        // 统一清理炼丹炉状态
        setTimeout(() => {
            if (window.alchemyState) {
                window.alchemyState.materials = [];
                window.alchemyState.isProcessing = false;
                if(window.updateFurnaceDisplay) window.updateFurnaceDisplay();
            }
        }, 2000);
    }
}

/**
 * 发送角色消息
 */
export function sendRoleMessage(roleId, message) {
    console.log(`💬 发送消息给 ${roleId}:`, message);
}

/**
 * 创建自定义角色窗口
 */
export function createCustomRoleWindow(roleId) {
    console.log(`🪟 创建角色窗口: ${roleId}`);
}

/**
 * 模拟交互（用于演示）
 */
export function simulateInteraction() {
    log('开始模拟交互...');
    
    setTimeout(() => {
        if (window.builderData?.[0]) {
            window.builderData[0].roles.push('frontend_expert', 'data_analyst');
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
        if (typeof window.addGroup === 'function') window.addGroup();
        log('模拟：添加了新分组');
    }, 1500);
    
    setTimeout(() => {
        if (!window.apiConfigs?.has('ui_designer')) {
            const uiConfig = {
                type: 'openai',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4',
                temperature: 0.9,
                systemPrompt: '你是一个专业的UI设计师，擅长Figma和Sketch等设计工具。'
            };
            window.apiConfigs?.set('ui_designer', uiConfig);
            if (typeof window.updateApiStatus === 'function') {
                window.updateApiStatus('ui_designer');
            }
            log('模拟：为UI设计师配置了API');
        }
    }, 2000);
}
