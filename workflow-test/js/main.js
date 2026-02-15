// 文件名: main.js

// -----------------------------------------------------------------------------
// 1. 导入业务模块
// -----------------------------------------------------------------------------
import { RolePartsLibrary } from './modules/role-parts-library.js';
import * as UI from './modules/ui.js';
import * as Modals from './modules/modals.js';
import * as DragDrop from './modules/drag-drop.js';
import { initTrashCan } from './modules/trash.js';
import * as Bridge from './modules/factory-warehouse-bridge.js';

// 💡【重构重点】: 导入拆分后的新模块
import { initializeAlchemyState } from './modules/alchemy_core.js';
import { executeWorkflow, autoOrchestrate } from './modules/workflow.js';
import * as RoleGen from './modules/role_generation.js';
// -----------------------------------------------------------------------------
// 2. 主程序逻辑
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 页面脚本启动...");

    // 1. 初始化 UI 组件
    Modals.initializeModalToggles();
    UI.initToolbar();
    initTrashCan();
    
    // 2. 初始化数据
    // 直接使用全局环境早已准备好的 window.supabase
    if (window.supabase) {
        await RolePartsLibrary.init(window.supabase);
    } else {
        console.error("⚠️ 未检测到全局 window.supabase 对象，无法加载角色数据。");
    }
    
    // 3. 启用拖放功能
    DragDrop.initializeDragAndDrop();
    
    // 4. 💡 初始化新的炼丹炉状态 (来自 alchemy_core.js)
    initializeAlchemyState();
    
    // 5. 绑定工作流按钮事件 (来自 workflow.js)
    const runAllBtn = document.getElementById('btn-run-all');
    if (runAllBtn) {
        runAllBtn.onclick = executeWorkflow;
    }
    
    const autoOrchestrateBtn = document.getElementById('btn-auto-orchestrate');
    if (autoOrchestrateBtn) {
        autoOrchestrateBtn.onclick = () => autoOrchestrate('deepseek-chat');
    }

    // 6. 设置其他动态监听器
    UI.setupDynamicListeners();
    
    console.log("✅ 页面脚本初始化完成。");
});
window.quickAction = async function(roleId, promptTemplate) {
    console.log(`⚡ 触发快捷技能: ${roleId}`);
    const stage = document.getElementById('main-stage');
    
    // 检查是否有 createCustomRoleWindow 函数 (通常在 ui.js 或 modals.js 中)
    if (window.createCustomRoleWindow) {
        window.createCustomRoleWindow(roleId);
        const panel = document.getElementById(`${roleId}-panel`);
        const input = panel?.querySelector('textarea');
        if (input) {
            input.value = promptTemplate;
            input.focus();
        }
        if (stage && !stage.contains(panel)) {
            stage.appendChild(panel);
            panel.style.display = 'flex';
            const empty = stage.querySelector('.empty-state');
            if(empty) empty.style.display = 'none';
        }
    } else {
        // 如果找不到弹窗函数，用 alert 提示 (兜底)
        alert(`【技能预览】\n\n角色ID: ${roleId}\n指令模板: ${promptTemplate}\n\n(请确保 createCustomRoleWindow 已加载)`);
    }
};


// -----------------------------------------------------------------------------
// 3. 全局挂载 (确保 HTML 中的 onclick="..." 有效)
// -----------------------------------------------------------------------------
window.UI = UI;
window.Modals = Modals;
window.RolePartsLibrary = RolePartsLibrary;
window.DragDrop = DragDrop;
window.Bridge = Bridge;

// 💡 挂载工作流相关函数，以便在控制台调试或HTML中调用
window.Workflow = {
    executeWorkflow,
    autoOrchestrate
};
// 2. 挂载 RoleGen 到 window，方便调试
window.RoleGen = RoleGen;
// window.quickAction 已经在上面定义并直接挂载了
// 挂载常用工具函数
window.showToast = UI.showToast;
window.createRoleCard = UI.createRoleCard;
window.renderPartsGrid = UI.renderPartsGrid;
window.getRoleName = (roleId) => RolePartsLibrary.getRoleDetailsEnhanced(roleId)?.name || '未知';
