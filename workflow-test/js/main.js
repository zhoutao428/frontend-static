// js/main.js

import * as State from './modules/state.js';
import * as Utils from './modules/utils.js';
import * as UI from './modules/ui.js';
import * as Modals from './modules/modals.js';
import * as Drag from './modules/drag-drop.js';
import * as Trash from './modules/trash.js';
import * as AlchemyCore from './modules/alchemy_core.js';
import * as RoleGen from './modules/role_generation.js';
import * as Workflow from './modules/workflow.js';

document.addEventListener('DOMContentLoaded', () => {
    Utils.log('🚀 系统启动 (模块化版)...');
    
    // State 初始化
    if(State.initState) State.initState();
    if(State.loadAllAPIConfigs) State.loadAllAPIConfigs();
    if(State.loadTestData) State.loadTestData();
    
    // UI 渲染
    UI.renderPartsGrid();
    UI.renderAICategories();
    UI.renderGroups();
    UI.updateBindingsUI();
    
    // 功能模块初始化
    Trash.initTrashCan();
    
    // 💡 关键：调用 drag-drop.js 导出的函数
    Drag.initializeDragAndDrop();
    
    // 初始化炼丹炉状态
    if(AlchemyCore.initializeAlchemyState) AlchemyCore.initializeAlchemyState();

    // 绑定顶部按钮
    const btnMap = {
        'btn-reset': State.resetAll,
        'btn-export': State.exportConfig,
        'btn-simulate': RoleGen.simulateInteraction, // 确保 role_generation.js 导出了 simulateInteraction
        'btn-run-all': Workflow.executeWorkflow,     // 确保 workflow.js 导出了 executeWorkflow
        'btn-stop': Workflow.stopExecution           // 确保 workflow.js 导出了 stopExecution
    };
    Object.keys(btnMap).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.onclick = btnMap[id];
    });
    
    // 绑定全局键盘事件
    bindGlobalEvents();
    
    Utils.log('✅ 模块加载完成');
});

function bindGlobalEvents() {
    const modal = document.getElementById('api-config-modal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) Modals.hideApiConfigModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modals.hideApiConfigModal(); });
    // ... 调试快捷键 ...
}

// ==========================================
// ⚠️ 关键：挂载到 Window 供 HTML onclick 使用
// ==========================================

// UI
window.addNewCategory = UI.addNewCategory;
window.toggleSearch = UI.toggleSearch;
window.refreshModels = UI.refreshModels;
window.toggleAICategory = UI.toggleAICategory;
window.addGroup = UI.addGroup;
window.removeGroup = UI.removeGroup;
window.updateGroupName = UI.updateGroupName;
window.renderPartsGrid = UI.renderPartsGrid;

// Modals
window.showApiConfig = Modals.showApiConfig;
window.showModelAPIConfig = Modals.showModelAPIConfig;
window.addCustomModel = Modals.addCustomModel;
window.saveApiConfig = Modals.saveApiConfig;
window.testApiConnection = Modals.testApiConnection;
window.hideApiConfigModal = Modals.hideApiConfigModal;
window.showRoleDetails = Modals.showRoleDetails;
window.showTaskDetails = Modals.showTaskDetails;

// Drag (从 Drag 模块挂载)
window.onRoleDragStart = Drag.onRoleDragStart;
window.onModelDragStart = Drag.onModelDragStart;
window.onDragEnd = Drag.onDragEnd;
window.onGroupDragOver = Drag.onGroupDragOver;
window.onGroupDragLeave = Drag.onGroupDragLeave;
window.onGroupDrop = Drag.onGroupDrop;

// Workflow
window.executeWorkflow = Workflow.executeWorkflow;
window.stopExecution = Workflow.stopExecution;
window.toggleResultsPanel = Workflow.toggleResultsPanel;
window.autoOrchestrate = Workflow.autoOrchestrate;
window.runAgent = Workflow.runAgent;

// State
window.resetAll = State.resetAll;
window.exportConfig = State.exportConfig;

// Utils
window.clearDebugLog = Utils.clearDebugLog;
window.toggleDebugPanel = Utils.toggleDebugPanel;
window.togglePinDebugPanel = Utils.togglePinDebugPanel;

// Role Generation
window.simulateInteraction = RoleGen.simulateInteraction;
// 手动挂载炼丹入口，供 drag-drop.js 调用
window.startAIAlchemy = RoleGen.startAIAlchemy;
window.sendRoleMessage = RoleGen.sendRoleMessage;
window.createCustomRoleWindow = RoleGen.createCustomRoleWindow;

