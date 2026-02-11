// js/modules/trash.js
import { log, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderAICategories } from './ui.js';
import { saveAllAPIConfigs } from './state.js';

// 初始化垃圾桶
export function initTrashCan() {
    // 1. 动态插入样式
    const styleId = 'trash-can-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #trash-can {
                position: fixed; left: 30px; bottom: 30px; width: 70px; height: 70px;
                background: rgba(30, 41, 59, 0.8); border: 2px dashed #475569; border-radius: 50%;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                color: #cbd5e1; cursor: pointer; z-index: 1000; transition: all 0.3s; backdrop-filter: blur(4px);
            }
            #trash-can i { font-size: 24px; margin-bottom: 4px; }
            #trash-can span { font-size: 10px; }
            #trash-can.drag-over {
                background: rgba(239, 68, 68, 0.9); border-color: #fca5a5; transform: scale(1.15); color: white;
            }
            .shaking { animation: shake 0.5s ease-in-out; }
            @keyframes shake { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-10deg)} 75%{transform:rotate(10deg)} }
        `;
        document.head.appendChild(style);
    }

    // 2. 创建元素
    let trash = document.getElementById('trash-can');
    if (!trash) {
        trash = document.createElement('div');
        trash.id = 'trash-can';
        trash.innerHTML = `<i class="fas fa-trash-alt"></i><span>粉碎机</span>`;
        document.body.appendChild(trash);
    }

    // 3. 绑定事件
    trash.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (isValidTrashItem()) trash.classList.add('drag-over');
    });
    trash.addEventListener('dragleave', () => trash.classList.remove('drag-over'));
    trash.addEventListener('drop', (e) => {
        e.preventDefault();
        trash.classList.remove('drag-over');
        if (isValidTrashItem()) handleTrashDelete();
    });
}

// 检查是否可回收
function isValidTrashItem() {
    if (!window.draggedItem) return false;
    const id = window.draggedItem.id || window.draggedItem;
    // 允许删除自定义角色和模型
    if (window.draggedType === 'role' && typeof id === 'string' && id.startsWith('user_')) return true;
    if (window.draggedType === 'model' && typeof id === 'string' && id.startsWith('custom_')) return true;
    return false;
}

// 执行删除
function handleTrashDelete() {
    const id = window.draggedItem.id || window.draggedItem;
    const name = window.draggedType === 'role' ? getRoleName(id) : getModelName(id);

    if (confirm(`⚠️ 确定要粉碎 [${name}] 吗？`)) {
        if (window.draggedType === 'role') {
            if (window.RolePartsLibrary && window.RolePartsLibrary.userParts) {
                window.RolePartsLibrary.userParts.delete(id);
                renderPartsGrid();
                log(`🗑️ 已粉碎角色: ${name}`);
            }
        } else if (window.draggedType === 'model') {
            if (window.modelAPIConfigs) {
                window.modelAPIConfigs.delete(id);
                saveAllAPIConfigs();
                renderAICategories();
                log(`🗑️ 已粉碎模型: ${name}`);
            }
        }
        
        // 动画效果
        const trash = document.getElementById('trash-can');
        trash.classList.add('shaking');
        setTimeout(() => trash.classList.remove('shaking'), 500);
    }
}
