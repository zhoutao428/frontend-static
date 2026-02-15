// js/main.js
import * as State from './modules/state.js';
import * as Utils from './modules/utils.js';
import * as UI from './modules/ui.js';
import * as Modals from './modules/modals.js';
import * as Drag from './modules/drag-drop.js';
import * as Trash from './modules/trash.js';
import * as Alchemy from './modules/alchemy.js';

document.addEventListener('DOMContentLoaded', () => {
    Utils.log('🚀 系统启动 (模块化版)...');
    
    State.initState();
    State.loadAllAPIConfigs();
    State.loadTestData();
    
    UI.renderPartsGrid();
    UI.renderAICategories();
    UI.renderGroups();
    UI.updateBindingsUI();
    
    Trash.initTrashCan();
    Drag.initDropZone();
    
    // 绑定顶部按钮
    const btnMap = {
        'btn-reset': State.resetAll,
        'btn-export': State.exportConfig,
        'btn-simulate': Alchemy.simulateInteraction,
        'btn-run-all': Alchemy.executeWorkflow,
        'btn-stop': Alchemy.stopExecution
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
// Drag
window.onRoleDragStart = Drag.onRoleDragStart;
window.onModelDragStart = Drag.onModelDragStart;
window.onDragEnd = Drag.onDragEnd;
window.onGroupDragOver = Drag.onGroupDragOver;
window.onGroupDragLeave = Drag.onGroupDragLeave;
window.onGroupDrop = Drag.onGroupDrop;

// Alchemy
window.executeWorkflow = Alchemy.executeWorkflow;
window.stopExecution = Alchemy.stopExecution;
window.toggleResultsPanel = Alchemy.toggleResultsPanel;
window.simulateInteraction = Alchemy.simulateInteraction;
window.autoOrchestrate = Alchemy.autoOrchestrate;
window.runAgent = Alchemy.runAgent;
// State
window.resetAll = State.resetAll;
window.exportConfig = State.exportConfig;

// Utils
window.clearDebugLog = Utils.clearDebugLog;
window.toggleDebugPanel = Utils.toggleDebugPanel;
window.togglePinDebugPanel = Utils.togglePinDebugPanel;
window.showRoleDetails = Modals.showRoleDetails; // 补上这一行！