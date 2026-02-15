// 文件名: js/modules/drag-drop.js

import { updateFurnaceDisplay, checkAlchemyReady } from './alchemy_core.js';
import { updateApiStatus, updateBindingsUI, renderGroups } from './ui.js';

// -----------------------------------------------------------------------------
// 💡 修复：加上 export 关键字
// -----------------------------------------------------------------------------
export function initializeDragAndDrop() {
    console.log("🖱️ 初始化拖放系统...");

    // 1. 设置可拖拽源 (Draggables)
    // ---------------------------------------------------------
    const draggables = document.querySelectorAll('.part-card, .model-card');
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: draggable.dataset.id,
                type: draggable.dataset.type,
                name: draggable.querySelector('.part-name, .model-name')?.innerText || '未知'
            }));
            e.dataTransfer.effectAllowed = 'copy';
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });

    // 2. 设置炼丹炉投放区 (Drop Zone: Furnace)
    // ---------------------------------------------------------
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
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            handleFurnaceDrop(data);
        });
    }

    // 3. 设置工作流组装台投放区 (Drop Zone: Workflow Stage)
    // ---------------------------------------------------------
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
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // 只有角色才能拖入工作流组装台
            if (data.type === 'role') {
                handleWorkflowDrop(data);
            } else {
                alert("组装台只接受 [角色] 卡片！");
            }
        });
    }

    // 4. 设置角色卡片之间的投放 (Role-to-Role Drop for Binding)
    // ---------------------------------------------------------
    // 注意：由于角色卡片是动态生成的，这里最好使用事件委托，或者在 renderPartsGrid 后重新绑定
    // 这里演示的是通过通用容器监听
    const partsGrid = document.getElementById('parts-grid');
    if (partsGrid) {
        partsGrid.addEventListener('dragover', (e) => {
            e.preventDefault(); // 允许投放
        });

        partsGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetCard = e.target.closest('.part-card');
            
            // 如果没拖到卡片上，或者是拖拽者自己，忽略
            if (!targetCard || targetCard.classList.contains('dragging')) return;

            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // 只有 [模型] 才能拖给 [角色]
            if (data.type === 'model') {
                handleBindingDrop(data, targetCard);
            }
        });
    }
}

// -----------------------------------------------------------------------------
// 内部处理函数
// -----------------------------------------------------------------------------

function handleFurnaceDrop(item) {
    if (!window.alchemyState) return;

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

    // 更新UI显示
    updateFurnaceDisplay();
    
    // 检查是否满足炼丹条件
    checkAlchemyReady();
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
    
    // 重新渲染组装台
    renderGroups();
}

function handleBindingDrop(modelItem, targetRoleCard) {
    const roleId = targetRoleCard.dataset.id;
    const modelId = modelItem.id;
    const roleName = targetRoleCard.querySelector('.part-name').innerText;

    if (confirm(`确定要将模型 [${modelItem.name}] 绑定给角色 [${roleName}] 吗？`)) {
        if (!window.bindings) window.bindings = new Map();
        
        window.bindings.set(roleId, modelId);
        
        // 更新 UI 显示绑定状态
        updateBindingsUI();
        
        // 保存绑定关系到本地存储 (可选)
        // localStorage.setItem('user_bindings', JSON.stringify(Array.from(window.bindings.entries())));
    }
}
