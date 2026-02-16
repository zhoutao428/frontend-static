// 文件名: alchemy_core.js

/**
 * 初始化全局炼丹炉状态
 */
function initializeAlchemyState() {
    window.alchemyState = {
        materials: [],      // 存放拖入的 "角色" 和 "模型"
        isProcessing: false // 是否正在炼丹中
    };
    console.log("🔥 炼丹炉状态已初始化。");
}

/**
 * 更新炼丹炉（拖放区域）的界面显示
 */
function updateFurnaceDisplay() {
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
    } else {
        p.textContent = "原料已集齐！";
    }
}

/**
 * 检查炼丹原料是否齐备，如果齐备则触发“角色生成”流程
 */
function checkAlchemyReady() {
    if (!window.alchemyState || window.alchemyState.isProcessing) return;
    
    const materials = window.alchemyState.materials;
    const roleMaterial = materials.find(m => m.type === 'role');
    const modelMaterial = materials.find(m => m.type === 'model');

    // 当角色和模型都已放入，就触发角色生成
    if (roleMaterial && modelMaterial) {
        console.log('✅ 原料齐备，准备启动角色生成...');
        
        // 动态导入并执行角色生成函数
        // ✅ 既然是全局脚本，直接调就完事了！
if (window.startAIAlchemy) {
    window.startAIAlchemy(roleMaterial, modelMaterial);
} else {
    // 防止 HTML 里没引用 role_generation.js
    console.error("❌ 找不到 window.startAIAlchemy 函数！请检查 HTML 是否引入了 role_generation.js");
}
} // 👈 别忘了这个 if 的结束括号
} // 👈 别忘了这个函数的结束括号

// ⚠️ 手动挂载
window.initializeAlchemyState = initializeAlchemyState;
window.updateFurnaceDisplay = updateFurnaceDisplay;
window.checkAlchemyReady = checkAlchemyReady;



