// js/modules/drag-drop.js


function initDropZone() {
    // ----------------------------------------
    // Part 1: 下面的炼丹炉 (炼制角色)
    // ----------------------------------------
    const furnace = document.getElementById('drop-hint');
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

            window.alchemyState.materials.push(materialData);
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
               checkAlchemyReady();
            }
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

function onRoleDragStart(e) {
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


function onModelDragStart(e) {
    const modelId = e.target.dataset.modelId;
    
    // 直接保存ID，暂时不处理详情
    window.draggedItem = { id: modelId };
    window.draggedType = 'model';
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'link';
    log(`开始拖拽模型: ${modelId}`);
}


function onDragEnd(e) {
    e.target.classList.remove('dragging');
    window.draggedItem = null;
    window.draggedType = null;
}

function onGroupDragOver(e, groupIndex) {
    e.preventDefault();
    if (!draggedItem) return;
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if (draggedType === 'role') {
        group.classList.add('drag-over');
    } else if (draggedType === 'model') {
        group.classList.add('drag-over-model');
    }
}

function onGroupDragLeave(e, groupIndex) {
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    group.classList.remove('drag-over', 'drag-over-model');
}

function onGroupDrop(e, groupIndex) {
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

function bindModelToRole(roleId, modelId) {
    bindings.set(roleId, modelId);
    updateBindingsUI();
    renderGroups();
    log(`绑定: ${roleId} → ${modelId}`);
}

// 1. 初始化拖放系统
export function initializeDragAndDrop() {
    console.log("🖱️ 初始化拖放系统...");

    // 设置可拖拽源 (Draggables)
    const draggables = document.querySelectorAll('.part-card, .model-card, .role-card'); // 兼容所有类名
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            // 使用全局函数处理 (如果 ui.js 里有的话)
            if (window.onRoleDragStart) {
                window.onRoleDragStart(e);
            } else {
                // 兜底逻辑
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: draggable.dataset.id,
                    type: draggable.dataset.type,
                    name: draggable.querySelector('.part-name, .model-name, .role-name')?.innerText || '未知'
                }));
            }
            e.dataTransfer.effectAllowed = 'copy';
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });

    // 2. 设置炼丹炉投放区
    const furnaceZone = document.getElementById('alchemy-drop-zone');
    if (furnaceZone) {
        furnaceZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            furnaceZone.classList.add('drag-over');
        });

        furnaceZone.addEventListener('dragleave', () => {
            furnaceZone.classList.remove('drag-over');
        });

        furnaceZone.addEventListener('drop', (e) => {
            e.preventDefault();
            furnaceZone.classList.remove('drag-over');
            
            // 尝试解析数据
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData('text/plain'));
            } catch (err) {
                console.error("拖拽数据解析失败", err);
                return;
            }
            
            handleFurnaceDrop(data);
        });
    }

    // 3. 设置工作流组装台投放区
    const workflowStage = document.getElementById('workflow-stage');
    if (workflowStage) {
        workflowStage.addEventListener('dragover', (e) => {
            e.preventDefault();
            workflowStage.classList.add('drag-over');
        });
        
        workflowStage.addEventListener('dragleave', () => {
            workflowStage.classList.remove('drag-over');
        });

        workflowStage.addEventListener('drop', (e) => {
            e.preventDefault();
            workflowStage.classList.remove('drag-over');
            
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData('text/plain'));
            } catch (err) { return; }

            // 只有角色才能拖入工作流组装台
            if (data.type === 'role') {
                handleWorkflowDrop(data);
            } else {
                alert("组装台只接受 [角色] 卡片！");
            }
        });
    }
}

// -----------------------------------------------------------------------------
// 内部处理函数
// -----------------------------------------------------------------------------

function handleFurnaceDrop(item) {
    if (!window.alchemyState) return;

    console.log("放入炉子:", item);

    // 检查是否已存在同类物品
    const existingIndex = window.alchemyState.materials.findIndex(m => m.type === item.type);
    
    if (existingIndex !== -1) {
        // 替换旧的
        window.alchemyState.materials[existingIndex] = item;
    } else {
        // 添加新的
        if (window.alchemyState.materials.length < 2) {
            window.alchemyState.materials.push(item);
        } else {
            alert("炼丹炉已满！请先清空或替换。");
            return;
        }
    }

    // 更新UI显示 (调用全局函数)
    if (window.updateFurnaceDisplay) window.updateFurnaceDisplay();
    
    // 检查是否满足炼丹条件 (调用全局函数)
    if (window.checkAlchemyReady) window.checkAlchemyReady();
}

function handleWorkflowDrop(roleItem) {
    if (!window.builderData) window.builderData = [];

    // 创建一个新的组 (Step)
    const newGroup = {
        id: `g_${Date.now()}`,
        name: `步骤 ${window.builderData.length + 1}`,
        roles: [roleItem.id], // 存放角色ID
        tasks: { [roleItem.id]: "请输入任务指令..." }
    };

    window.builderData.push(newGroup);
    
    // 重新渲染组装台 (调用全局函数)
    if (window.renderGroups) window.renderGroups();
}

// -----------------------------------------------------------------------------
// 3. 挂载到 Window (放在最后)
// -----------------------------------------------------------------------------
window.initializeDragAndDrop = initializeDragAndDrop;
// 不需要挂载 handleFurnaceDrop，因为它是内部使用的




