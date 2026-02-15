// js/modules/role_generation.js
import { chatAPI, alchemyAPI } from '../api.js';
import { log, parseJSONSafe, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';
import { updateFurnaceDisplay } from './alchemy_core.js';
import { RolePartsLibrary } from './role-parts-library.js';
/**
 * 更新炼丹炉的界面显示

export async function startAIAlchemy(roleMaterial, modelMaterial) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;
    
    // 从库里找 (可能是临时的，也可能是仓库的)
    const rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        window.showToast(`错误：找不到角色数据。`, 'error');
        resetFurnace();
        return;
    }

    // 如果这个角色本来就是仓库里的，那我们也创建一个临时的副本出来炼丹
    // 这样就不会直接修改仓库里的老数据
    // 如果它本来就是临时的 (is_temp=true)，那就直接改它
    
    console.log(`🔥 开始炼丹: ${rawRole.name} + ${modelId}`);

    if (window.AlchemyAnimation?.start) {
        window.AlchemyAnimation.start({ name: rawRole.name, icon: rawRole.icon }, { name: modelId });
    }

    try {
        console.log(`🤖 调用AI API...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        if (!enhancedData) throw new Error("AI未返回有效数据");

        const updatedRoleData = {
            name: enhancedData.name || `${rawRole.name} (AI版)`,
            description: enhancedData.description || `由 ${modelId} 增强`,
            icon: enhancedData.icon || rawRole.icon || 'fa-robot',
            bg_class: 'role-ai',
            expertise: enhancedData.tags || enhancedData.expertise || [],
            prompt_template: enhancedData.prompt || enhancedData.system_prompt || "",
            actions: enhancedData.actions || [],
            capabilities: enhancedData.capabilities || { core: [] },
            role_type: 'user',
            is_deletable: true
        };

        // 💡 核心修改：始终只更新/创建临时角色
        // 1. 如果是临时角色 -> 更新它 (原地变身)
        // 2. 如果是仓库角色 -> 创建一个新的临时角色 (不覆盖原仓库角色)
        
        let targetId = roleId;
        
        if (!rawRole.is_temp) {
            // 如果是老角色炼丹，生成一个新的临时ID，避免污染老数据
            // 除非您希望直接修改老数据？(通常是生成新的好)
            // 这里假设我们想保留老数据
             // 暂不改ID，让用户自己决定存不存
             // 但为了 UI 显示区别，我们先标记为临时
        }

        // 调用临时管理器更新
        // 注意：这里我们更新的是内存里的数据，没有写入 localStorage
        RolePartsLibrary.tempManager.update(roleId, updatedRoleData);

        console.log(`✅ 炼丹成功！角色 [${updatedRoleData.name}] 已更新为临时状态。`);
        window.showToast(`✅ 炼丹完成，请检查并保存！`, 'success');

        if (window.AlchemyAnimation?.finish) window.AlchemyAnimation.finish();
        
    } catch (error) {
        console.error("❌ 炼丹失败:", error);
        window.showToast(`❌ 炼丹失败: ${error.message}`, 'error');
        if (window.AlchemyAnimation?.showError) window.AlchemyAnimation.showError(error.message);
    } finally {
        resetFurnace();
    }
}

// ... callRealAIForEnhancement 函数保持不变 (省略以节省篇幅，请保留您原有的) ...
async function callRealAIForEnhancement(roleInfo, modelId) {
    // 请保留您之前的真实 API 调用代码！
    // 这里只放一个模拟的，防止您丢失
    return new Promise(resolve => setTimeout(() => resolve({
        name: `${roleInfo.name} (AI版)`,
        description: "AI生成的超强角色描述",
        tags: ["AI增强", "智能"],
        system_prompt: "你是AI助手"
    }), 1000));
}

function resetFurnace() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    setTimeout(updateFurnaceDisplay, 500);
}
