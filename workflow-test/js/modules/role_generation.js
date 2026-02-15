// js/role_generation.js
import { updateFurnaceDisplay } from './alchemy_core.js';
// 注意：这里假设 updateFurnaceDisplay 和 RolePartsLibrary 已经是全局变量了

export async function startAIAlchemy(roleItem, modelItem) {
    if (!window.alchemyState) return;

    window.alchemyState.isProcessing = true;
    if (window.updateFurnaceDisplay) window.updateFurnaceDisplay();

    const roleId = roleMaterial.id; 
    const modelId = modelMaterial.id;

    // 获取原始数据
    const rawRole = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    if (!rawRole) {
        alert("错误：找不到角色数据");
        resetFurnace();
        return;
    }

    console.log(`🔥 开始炼丹: ${rawRole.name}`);

    // 模拟 AI 处理过程 (这里保留您原有的 API 调用逻辑)
    // ...

    // 假设这是 AI 返回的新数据
    const updatedRoleData = {
        ...rawRole,
        name: `${rawRole.name} (AI版)`,
        description: `由 ${modelId} 增强`,
        is_temp: true, // 👈 关键：标记为临时
        is_local: false // 还没入库
    };

    // 💡 关键修复：
    // 只更新临时列表，不写 LocalStorage！
    // 这样仓库里就不会有它，只有侧边栏能看到。
    window.RolePartsLibrary.tempManager.upsert(updatedRoleData);

    console.log(`✅ 角色生成完毕 (临时状态)`);
    if (window.showToast) window.showToast('生成成功！请手动保存到仓库。', 'success');

    resetFurnace();
}

export function simulateInteraction() {
    if (window.alchemyState) {
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
    }
    setTimeout(() => {
        if (window.updateFurnaceDisplay) window.updateFurnaceDisplay();
    }, 500);
}

// ⚠️ 手动挂载
window.startAIAlchemy = startAIAlchemy;

