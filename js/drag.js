import { state } from './state.js';
import { logToConsole, createMergedAgentWindow } from './ui.js';

// ==========================================
// 1. 辅助函数
// ==========================================
function setupDragDataTransfer(e, card) {
    if (!e.dataTransfer) return false;
    e.dataTransfer.effectAllowed = 'copyMove';
    // 确保有 target，否则不让拖
    const target = card.dataset.target;
    if (!target) return false;
    
    e.dataTransfer.setData('text/plain', target);
    return true;
}

// ==========================================
// 2. 绑定卡片拖拽 (处理“搬家”和“合并”的源头)
// ==========================================
export function bindDragToNewCard(card) {
    // 🛑 核心修复：如果是第一层的模板卡片 (root-card) 或返回按钮，直接跳过，不绑定拖拽
    if (card.classList.contains('root-card') || card.classList.contains('back-bar')) {
        return card;
    }

    if (card.hasAttribute('data-drag-bound')) return card;
    
    // 1. 样式设置
    card.style.cursor = 'grab';
    card.style.userSelect = 'none';
    card.style.webkitUserSelect = 'none';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-drag-bound', 'true');
    
    // 2. 拖拽开始
    card.ondragstart = function(e) {
        if (!setupDragDataTransfer(e, this)) {
            e.preventDefault(); // 没有 target 就不让拖
            return;
        }
        state.draggedCard = this;
        // 延时添加样式，让拖拽的“幽灵”显示原样，本体变半透明
        setTimeout(() => this.classList.add('dragging'), 0);
       // ✅ 新增：给所有分组标题加高亮类，提示用户“往这儿拖”
        document.querySelectorAll('.group-title').forEach(t => t.classList.add('droppable-active'));
    
    };
    
    // 3. 拖拽结束
    card.ondragend = function() {
        state.draggedCard = null;
        this.classList.remove('dragging');
       // ✅ 新增：移除高亮类
        document.querySelectorAll('.group-title').forEach(t => {
            t.classList.remove('droppable-active');
            t.classList.remove('drag-over-target'); // 清理悬停样式
        });
    };
    
    // 4. 点击事件 (激活窗口)
    card.onclick = function(e) {
        e.stopPropagation();
        
        const targetId = this.dataset.target;
        if (!targetId) return; // 没 ID 的卡片点着没反应是正常的
        
        activateWindow(targetId);
        
        // 高亮当前选中的卡片
        document.querySelectorAll('.mini-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
    };
    
    // 5. 作为放置目标 (处理“合并”)
    card.ondragover = function(e) {
        e.preventDefault();
        // 自己不能合并自己
        if (state.draggedCard && state.draggedCard !== this) {
            this.classList.add('drag-over'); // 触发紫色高亮 + "⚡ 融合"
        }
    };
    
    card.ondragleave = function() {
        this.classList.remove('drag-over');
    };
    
    card.ondrop = function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        
        // 触发合并逻辑
        if (state.draggedCard && state.draggedCard !== this) {
            handleMerge(state.draggedCard, this);
        }
    };
    
    return card;
}

// ==========================================
// 3. 绑定分组标题 (处理“搬家”)
// ==========================================
// ✅ 绑定分组标题的拖拽 (归类逻辑 - 优化版)
export function bindDragToGroupTitle(titleDiv, groupId) {
    
    // 1. 拖拽悬停 (进入目标区域)
    titleDiv.ondragover = function(e) {
        e.preventDefault();
        // 添加高亮样式类 (需配合 CSS .drag-over-target)
        this.classList.add('drag-over-target');
    };
    
    // 2. 拖拽离开 (移出目标区域)
    titleDiv.ondragleave = function() {
        // 移除高亮
        this.classList.remove('drag-over-target');
    };
    
    // 3. 放置 (松手)
    titleDiv.ondrop = function(e) {
        e.preventDefault();
        e.stopPropagation(); // 防止冒泡
        
        // 立即移除高亮
        this.classList.remove('drag-over-target');
        
        console.log('🔥 触发归类 Drop:', groupId);
        
        // 检查必要条件
        if (!state.draggedCard) {
            console.error('❌ 失败: 没有拖拽源');
            return;
        }
        
        if (!window.moveRoleToGroup) {
            console.error('❌ 失败: moveRoleToGroup 函数未定义');
            return;
        }

        // 获取角色 ID
        const roleId = state.draggedCard.dataset.target.replace('-panel', '');
        console.log(`✅ 执行搬家: [${roleId}] -> [${groupId}]`);
        
        // 执行搬家
        window.moveRoleToGroup(roleId, groupId);
        
        // 强制重置拖拽状态 (防止二次触发)
        state.draggedCard = null;
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.group-title').forEach(el => el.classList.remove('droppable-active'));
    };
}
// ==========================================
// 4. 全局初始化
// ==========================================
export function initDragAndDrop() {
    const miniCards = document.querySelectorAll('.mini-card');
    const stage = document.getElementById('main-stage');
    
    miniCards.forEach(card => bindDragToNewCard(card));
    
    // 舞台放置 (用于打开窗口)
    if (stage) {
        stage.addEventListener('dragover', e => e.preventDefault());
        stage.addEventListener('drop', e => {
            e.preventDefault();
            // 只有拖到空白处才算打开
            if (!e.target.closest('.mini-card') && state.draggedCard) {
                const targetId = state.draggedCard.dataset.target;
                if(targetId) activateWindow(targetId);
            }
        });
    }
}

// ==========================================
// 5. 核心逻辑实现
// ==========================================

function activateWindow(windowId) {
    if (state.isGridMode) return logToConsole('九宫格模式下无法切换窗口', 'warning');
    if (!windowId) return;
    
    const stage = document.getElementById('main-stage');
    const pool = document.getElementById('windows-pool');
    let target = document.getElementById(windowId);
    
    // 如果窗口不存在，尝试动态创建 (针对自定义角色)
    if (!target) {
        const roleId = windowId.replace('-panel', '');
        if (window.createCustomRoleWindow) {
             window.createCustomRoleWindow(roleId);
             target = document.getElementById(windowId);
        }
    }
    
    if (target) {
        const current = stage.querySelector('.window-card');
        if (current) pool.appendChild(current); // 把原来的放回池子
        stage.appendChild(target); // 把新的放上舞台
        // logToConsole(`已激活窗口: ${windowId}`, 'success'); // 日志太吵可以注释掉
    }
}

function handleMerge(sourceCard, targetCard) {
    const sTarget = sourceCard.dataset.target || '';
    const tTarget = targetCard.dataset.target || '';
    if (!sTarget || !tTarget) return;
    
    const sourceRole = sTarget.replace('-panel', '');
    const targetRole = tTarget.replace('-panel', '');
    
    // ✅ 修复：正确获取名字
    const sourceNameEl = sourceCard.querySelector('.name');
    const targetNameEl = targetCard.querySelector('.name');
    
    const sourceName = sourceNameEl ? sourceNameEl.textContent : sourceRole;
    const targetName = targetNameEl ? targetNameEl.textContent : targetRole;
    
    const mergedId = `${sourceRole}+${targetRole}`;
    
    logToConsole(`⚡ 正在融合: [${sourceName}] + [${targetName}]`, 'info');
    createMergedAgentWindow(mergedId, sourceName, targetName);
    
    if (window.updateSidebarAfterMerge) {
        window.updateSidebarAfterMerge(sourceRole, targetRole, mergedId);
    }
}

// 挂载到全局
window.initDragAndDrop = initDragAndDrop;
window.bindDragToNewCard = bindDragToNewCard;
window.bindDragToGroupTitle = bindDragToGroupTitle;
