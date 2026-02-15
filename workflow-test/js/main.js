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

import { initializeAlchemyState } from './modules/alchemy_core.js';
import { executeWorkflow, autoOrchestrate } from './modules/workflow.js';
import * as RoleGen from './modules/role_generation.js';

// -----------------------------------------------------------------------------
// 💡 关键修复：初始化您原代码需要的全局状态 (替代 state.js)
// -----------------------------------------------------------------------------
try {
    // 尝试从 localStorage 恢复数据，如果失败则创建空 Map
    window.apiConfigs = new Map(JSON.parse(localStorage.getItem('api_configs') || '[]'));
    window.modelAPIConfigs = new Map(JSON.parse(localStorage.getItem('model_api_configs') || '[]'));
} catch (e) {
    console.warn("重置 API 配置状态");
    window.apiConfigs = new Map();
    window.modelAPIConfigs = new Map();
}

// -----------------------------------------------------------------------------
// 2. 主程序逻辑
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 页面脚本启动...");

    Modals.initializeModalToggles();
    UI.initToolbar();
    initTrashCan();
    
    if (window.supabase) {
        await RolePartsLibrary.init(window.supabase);
    } else {
        console.error("⚠️ 未检测到全局 window.supabase 对象");
    }
    
    DragDrop.initializeDragAndDrop();
    initializeAlchemyState();
    
    const runAllBtn = document.getElementById('btn-run-all');
    if (runAllBtn) runAllBtn.onclick = executeWorkflow;
    
    const autoOrchestrateBtn = document.getElementById('btn-auto-orchestrate');
    if (autoOrchestrateBtn) autoOrchestrateBtn.onclick = () => autoOrchestrate('deepseek-chat');

    UI.setupDynamicListeners();
    
    console.log("✅ 页面脚本初始化完成。");
});

// -----------------------------------------------------------------------------
// 3. 全局挂载 (关键！让您的 onclick="..." 生效)
// -----------------------------------------------------------------------------
window.UI = UI;
window.Modals = Modals;
window.RolePartsLibrary = RolePartsLibrary;
window.DragDrop = DragDrop;
window.Bridge = Bridge;
window.RoleGen = RoleGen;

window.Workflow = { executeWorkflow, autoOrchestrate };

// 💡 补全您的 HTML 模板中调用的全局函数
window.showApiConfig = Modals.showApiConfig;
window.showRoleDetails = Modals.showRoleDetails;
window.createCustomRoleWindow = Modals.createCustomRoleWindow;

// 💡 补全您的 HTML 模板中调用的拖拽函数 (兼容旧逻辑)
window.onRoleDragStart = function(event) {
    // 简单的兼容处理，确保数据能传出去
    const target = event.target.closest('.part-card');
    if(target) {
        event.dataTransfer.setData('text/plain', JSON.stringify({
            id: target.dataset.roleId, // 注意您的模板用的是 data-role-id
            type: 'role',
            name: target.querySelector('.part-name')?.innerText
        }));
    }
};
window.onDragEnd = function(event) {
    // 拖拽结束逻辑，可留空
};

// 常用工具
window.showToast = UI.showToast;
window.createRoleCard = UI.createRoleCard;
window.renderPartsGrid = UI.renderPartsGrid;
window.getRoleName = (roleId) => RolePartsLibrary.getRoleDetailsEnhanced(roleId)?.name || '未知';

// 补回 quickAction
window.quickAction = async function(roleId, promptTemplate) {
    console.log(`⚡ 触发快捷技能: ${roleId}`);
    if (window.createCustomRoleWindow) {
        window.createCustomRoleWindow(roleId);
        // 尝试自动填入指令
        setTimeout(() => {
            const panel = document.getElementById(`${roleId}-panel`);
            const input = panel?.querySelector('textarea');
            if (input) {
                input.value = promptTemplate;
                input.focus();
            }
        }, 100);
    } else {
        alert(`技能: ${promptTemplate}`);
    }
};
