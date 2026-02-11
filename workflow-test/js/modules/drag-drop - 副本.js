// js/modules/drag-drop.js
import { log, getRoleName, getModelName } from './utils.js';
import { renderGroups, updateBindingsUI, renderPartsGrid, updateApiStatus } from './ui.js';
import { updateFurnaceDisplay, checkAlchemyReady } from './alchemy.js';

export function initDropZone() {
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint) return;
    dropHint.addEventListener('dragover', (e) => { e.preventDefault(); dropHint.classList.add('drag-over'); });
    dropHint.addEventListener('dragleave', (e) => { dropHint.classList.remove('drag-over'); });
    dropHint.addEventListener('drop', (e) => {
        e.preventDefault();
        dropHint.classList.remove('drag-over');
        const item = window.draggedItem;
        const type = window.draggedType;
        if (!item || !type) return;
        
        console.log('放入炉子:', type, item);
        if (!window.alchemyState) window.alchemyState = { materials: [] };
        window.alchemyState.materials.push({ type: type, id: item, timestamp: Date.now() });
        updateFurnaceDisplay();
        checkAlchemyReady();
    });
}

export function onRoleDragStart(e) {
    const roleId = e.target.dataset.roleId;
    
    // 获取完整角色数据（增强版方法）
    const roleData = RolePartsLibrary.getRoleDetailsEnhanced 
        ? RolePartsLibrary.getRoleDetailsEnhanced(roleId)
        : RolePartsLibrary.getRoleDetails(roleId);
    
    // 如果没有获取到，尝试从用户零件库找
    if ((!roleData || !roleData.name) && roleId.startsWith('user_')) {
        const userPart = RolePartsLibrary.userParts.find(roleId);
        if (userPart) {
            window.draggedItem = userPart;
        }
    } else {
        window.draggedItem = roleData || { id: roleId };
    }
    
    window.draggedType = 'role';
    e.target.classList.add('dragging');
    log(`开始拖拽角色: ${roleId}`);
}


export function onModelDragStart(e) {
    const modelId = e.target.dataset.modelId;
    
    // 直接保存ID，暂时不处理详情
    window.draggedItem = { id: modelId };
    window.draggedType = 'model';
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'link';
    log(`开始拖拽模型: ${modelId}`);
}


export function onDragEnd(e) {
    e.target.classList.remove('dragging');
    window.draggedItem = null;
    window.draggedType = null;
}

export function onGroupDragOver(e, groupIndex) {
    e.preventDefault();
    if (!draggedItem) return;
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if (draggedType === 'role') {
        group.classList.add('drag-over');
    } else if (draggedType === 'model') {
        group.classList.add('drag-over-model');
    }
}

export function onGroupDragLeave(e, groupIndex) {
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    group.classList.remove('drag-over', 'drag-over-model');
}

export function onGroupDrop(e, groupIndex) {
    e.preventDefault();
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if(group) group.classList.remove('drag-over', 'drag-over-model');
    
    if (!window.draggedItem) return;

    // ⚠️ 关键：统一提取 ID (String)
    const itemId = (typeof window.draggedItem === 'object') ? window.draggedItem.id : window.draggedItem;
    
    if (window.draggedType === 'role') {
        // 添加角色
        if (!window.builderData[groupIndex].roles.includes(itemId)) {
            window.builderData[groupIndex].roles.push(itemId);
            renderGroups();
         if(typeof updateApiStatus === 'function')updateApiStatus(itemId);            
              log(`角色 ${getRoleName(itemId)} 已加入分组`);
        }
    } 
    else if (window.draggedType === 'model') {
        // 绑定模型
        window.builderData[groupIndex].roles.forEach(roleId => {
            window.bindings.set(roleId, itemId);
        });
        updateBindingsUI();
        renderGroups();
        log(`模型 ${getModelName(itemId)} 已绑定到整组`);
    }
}

export function bindModelToRole(roleId, modelId) {
    bindings.set(roleId, modelId);
    updateBindingsUI();
    renderGroups();
    log(`绑定: ${roleId} → ${modelId}`);
}

