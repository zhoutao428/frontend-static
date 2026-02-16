// js/modules/drag-drop.js

// 引入依赖 (确保这些模块已正确 export)
import { getRoleName, getModelName, log } from './utils.js';
import { updateApiStatus, updateBindingsUI, renderGroups } from './ui.js';
import { checkAlchemyReady, updateFurnaceDisplay } from './alchemy_core.js';
import { RolePartsLibrary } from './role-parts-library.js';

// -----------------------------------------------------------------------------
// 1. 初始化拖放系统 (对应 main.js 中的 Drag.initializeDragAndDrop)
// -----------------------------------------------------------------------------
export function initializeDragAndDrop() {
    console.log("🖱️ 初始化拖放系统...");

    // ----------------------------------------
    // Part 1: 下面的炼丹炉 (炼制角色)
    // ----------------------------------------
    const furnace = document.getElementById('drop-hint'); // 注意：有些版本可能是 alchemy-drop-zone，以您提供的代码为准
    if (furnace) {
        furnace.addEventListener('dragover', (e) => { e.preventDefault(); furnace.classList.add('drag-over'); });
        furnace.addEventListener('dragleave', () => furnace.classList.remove('drag-over'));
        furnace.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            furnace.classList.remove('drag-over');
            
            // 优先从全局取 (因为同页面拖拽)
            // 此时 item 已经是包含 {id, name, icon} 的完整对象了
            const item = window.draggedItem;
            const type = window.draggedType;

            if (!item || !type) return;
            
            console.log('放入炉子:', type, item);

            if (!window.alchemyState) window.alchemyState = { materials: [] };
            
            // 🚨 关键：存入 alchemyState 时，确保把 name 拷进去！
            // 如果 item 是对象，直接解构；如果是 ID 字符串，就没名字了
            const materialData = { 
                type: type, 
                timestamp: Date.now(),
                // 兼容逻辑：
                id: item.id || item, 
                name: item.name || (type === 'role' ? getRoleName(item) : getModelName(item)),
                icon: item.icon || (type === 'role' ? 'fas fa-user' : 'fas fa-cube')
            };

            // 检查是否已存在同类物品 (替换旧的)
            const existingIdx = window.alchemyState.materials.findIndex(m => m.type === type);
            if (existingIdx !== -1) {
                window.alchemyState.materials[existingIdx] = materialData;
            } else {
                window.alchemyState.materials.push(materialData);
            }

            // === 👇 直接内联更新 UI (替代函数调用) ===
            const count = window.alchemyState.materials.length;
            const p = furnace.querySelector('p') || furnace;
            
            if (count === 1) {
                const first = window.alchemyState.materials[0];
                const typeText = first.type === 'role' ? '角色' : '模型';
                p.innerHTML = `<i class="fas fa-plus"></i> 已放入${typeText}，还差一个...`;
                p.style.color = '#4ade80';
            } else if (count >= 2) {
                p.innerHTML = `<i class="fas fa-check"></i> 原料齐备！正在启动...`;
                // 调用检查 (这个还是得调，因为它涉及业务逻辑)
                if (typeof checkAlchemyReady === 'function') checkAlchemyReady();
            }
            
            // 如果有 updateFurnaceDisplay 也调用一下以防万一
            if (typeof updateFurnaceDisplay === 'function') updateFurnaceDisplay();
        });
    }

    // ----------------------------------------
    // Part 2: 上面的工作流区域 (自动编排)
    // ----------------------------------------
    const stage = document.getElementById('groups-container');
    if (stage) {
        stage.addEventListener('dragover', (e) => {
            if (window.draggedType === 'model') {
                e.preventDefault();
                stage.classList.add('drag-over-stage'); // CSS 需要加个高亮样式
            }
        });
        stage.addEventListener('dragleave', () => stage.classList.remove('drag-over-stage'));
        
        stage.addEventListener('drop', (e) => {
            // 如果拖到了具体的分组卡片上，不触发这里
            if (e.target.closest('.build-group')) return;

            e.preventDefault();
            stage.classList.remove('drag-over-stage');

            if (window.draggedType === 'model') {
                const modelId = typeof window.draggedItem === 'object' ? window.draggedItem.id : window.draggedItem;
                const modelName = getModelName(modelId);
                
                if (confirm(`🤖 任命 [${modelName}] 为总指挥，对当前角色进行自动编排？`)) {
                    if (window.autoOrchestrate) window.autoOrchestrate(modelId);
                }
            }
        });
    }
}

// -----------------------------------------------------------------------------
// 2. 导出事件处理函数 (供 main.js 挂载)
// -----------------------------------------------------------------------------

export function onRoleDragStart(e) {
    const roleId = e.target.dataset.roleId || e.target.dataset.id; // 兼容两种 ID 写法
    
    // 获取完整角色数据（增强版方法）
    // 注意：这里需要确保 RolePartsLibrary 已正确导入或存在于 window
    const lib = window.RolePartsLibrary || RolePartsLibrary;
    let roleData = null;
    
    if (lib) {
        roleData = lib.getRoleDetailsEnhanced 
            ? lib.getRoleDetailsEnhanced(roleId)
            : lib.getRoleDetails(roleId);
            
        // 如果没有获取到，尝试从用户零件库找
        if ((!roleData || !roleData.name) && roleId && roleId.startsWith('user_') && lib.userParts) {
            const userPart = lib.userParts.find(roleId);
            if (userPart) {
                window.draggedItem = userPart;
            }
        }
    }
    
    if (!window.draggedItem) {
        window.draggedItem = roleData || { id: roleId, name: '未知角色' };
    }
    
    window.draggedType = 'role';
    e.target.classList.add('dragging');
    log(`开始拖拽角色: ${roleId}`);
    
    // 设置 dataTransfer 以兼容原生拖拽
    if(e.dataTransfer) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            id: roleId,
            type: 'role',
            name: window.draggedItem.name
        }));
    }
}

export function onModelDragStart(e) {
    const modelId = e.target.dataset.modelId || e.target.dataset.id;
    
    // 直接保存ID，暂时不处理详情
    window.draggedItem = { id: modelId, name: getModelName(modelId) };
    window.draggedType = 'model';
    
    e.target.classList.add('dragging');
    if(e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'link';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            id: modelId,
            type: 'model',
            name: window.draggedItem.name
        }));
    }
    log(`开始拖拽模型: ${modelId}`);
}

export function onDragEnd(e) {
    e.target.classList.remove('dragging');
    window.draggedItem = null;
    window.draggedType = null;
}

export function onGroupDragOver(e, groupIndex) {
    e.preventDefault();
    if (!window.draggedItem) return;
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if (group) {
        if (window.draggedType === 'role') {
            group.classList.add('drag-over');
        } else if (window.draggedType === 'model') {
            group.classList.add('drag-over-model');
        }
    }
}

export function onGroupDragLeave(e, groupIndex) {
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if (group) group.classList.remove('drag-over', 'drag-over-model');
}

export function onGroupDrop(e, groupIndex) {
    e.preventDefault();
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if(group) group.classList.remove('drag-over', 'drag-over-model');
    
    if (!window.draggedItem) return;

    // ⚠️ 关键：统一提取 ID (String)
    const itemId = (typeof window.draggedItem === 'object') ? window.draggedItem.id : window.draggedItem;
    
    if (!window.builderData) window.builderData = [];
    // 确保 builderData 结构存在
    if (!window.builderData[groupIndex]) return;

    if (window.draggedType === 'role') {
        // 添加角色
        if (!window.builderData[groupIndex].roles.includes(itemId)) {
            window.builderData[groupIndex].roles.push(itemId);
            renderGroups();
            if(typeof updateApiStatus === 'function') updateApiStatus(itemId);            
            log(`角色 ${getRoleName(itemId)} 已加入分组`);
        }
    } 
    else if (window.draggedType === 'model') {
        // 绑定模型
        if (!window.bindings) window.bindings = new Map();
        
        window.builderData[groupIndex].roles.forEach(roleId => {
            window.bindings.set(roleId, itemId);
        });
        updateBindingsUI();
        renderGroups();
        log(`模型 ${getModelName(itemId)} 已绑定到整组`);
    }
}
