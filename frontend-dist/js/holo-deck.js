// holo-deck.js
import { state } from './state.js';
import { getRoleMeta } from './role-utils.js';
import { logToConsole } from './ui.js';

export function renderHoloDeck(container, currentTpl) {
    const trashRoles = currentTpl.trashBin || [];
    
    if (trashRoles.length === 0) return;
    
    const deck = document.createElement('div');
    deck.className = 'holo-deck';
    
    const header = document.createElement('div');
    header.className = 'holo-header';
    header.innerHTML = `<span><i class="fas fa-recycle"></i> 角色回收站 (${trashRoles.length})</span> <i class="fas fa-chevron-down"></i>`;
    
    const content = document.createElement('div');
    content.className = 'holo-content';
    if (state.holoDeckOpen) content.classList.add('open');
    
    header.onclick = () => {
        content.classList.toggle('open');
        state.holoDeckOpen = content.classList.contains('open');
    };
    
    trashRoles.forEach(roleId => {
        const meta = getRoleMeta(roleId);
        if (!meta) return;
        
        const card = document.createElement('div');
        card.className = 'holo-card';
        card.dataset.target = `${roleId}-panel`;
        card.innerHTML = `<i class="${meta.icon}"></i> ${meta.name}`;
        
        // 绑定拖拽
        if(window.bindDragToNewCard) window.bindDragToNewCard(card);
        
        // 双击恢复功能
        card.ondblclick = () => {
            // 恢复到第一个分组
            if (window.addRoleToCurrentGroup) {
                window.addRoleToCurrentGroup(roleId);
            }
            // 从回收站移除
            currentTpl.trashBin = currentTpl.trashBin.filter(r => r !== roleId);
            localStorage.setItem('user_templates', JSON.stringify(state.templates));
            
            // 刷新UI
            refreshHoloDeckDisplay(currentTpl);
            
            logToConsole(`角色 [${meta.name}] 已恢复`, 'success');
        };
        
        content.appendChild(card);
    });
    
    deck.appendChild(header);
    deck.appendChild(content);
    container.appendChild(deck);
}

// 从分组移除角色到回收站
export function removeRoleFromGroup(roleId) {
    const tpl = state.templates.find(t => t.id === state.activeTemplateId);
    if (!tpl) return;
    
    console.log(`🗑️ 移动角色到回收站: ${roleId}`);
    
    // 1. 从所有分组中移除
    tpl.groups.forEach(g => {
        g.roles = g.roles.filter(r => r !== roleId);
    });
    
    // 2. 添加到回收站（去重）
    if (!tpl.trashBin) tpl.trashBin = [];
    if (!tpl.trashBin.includes(roleId)) {
        tpl.trashBin.push(roleId);
    }
    
    // 3. 保存
    localStorage.setItem('user_templates', JSON.stringify(state.templates));
    
    // 4. 直接从侧边栏移除卡片
    removeRoleCardFromSidebar(roleId);
    
    // 5. 刷新回收站显示
    refreshHoloDeckDisplay(tpl);
    
    const meta = getRoleMeta(roleId);
    logToConsole(`角色 [${meta?.name || roleId}] 已移入回收站`, 'info');
}

// 移动角色到指定分组
export function moveRoleToGroup(roleId, targetGroupId) {
    const tpl = state.templates.find(t => t.id === state.activeTemplateId);
    if (!tpl) {
        console.error('❌ moveRoleToGroup: 未找到当前模板');
        return false;
    }
    
    console.log(`📦 移动角色 ${roleId} 到分组 ${targetGroupId}`);
    
    // 1. 查找目标分组
    const targetGroup = tpl.groups.find(g => g.id === targetGroupId);
    if (!targetGroup) {
        console.error(`❌ 找不到目标分组: ${targetGroupId}`);
        return false;
    }
    
    // 2. 获取角色元数据
    const meta = getRoleMeta(roleId);
    
    // 3. 从所有分组中移除该角色
    tpl.groups.forEach(g => {
        g.roles = g.roles.filter(r => r !== roleId);
    });
    
    // 4. 添加到目标分组
    if (!targetGroup.roles.includes(roleId)) {
        targetGroup.roles.push(roleId);
    }
    
    // 5. 从回收站移除
    const wasInTrash = tpl.trashBin && tpl.trashBin.includes(roleId);
    if (wasInTrash) {
        tpl.trashBin = tpl.trashBin.filter(r => r !== roleId);
    }
    
    // 6. 保存到本地存储
    localStorage.setItem('user_templates', JSON.stringify(state.templates));
    
    // 7. 更新UI
    if (wasInTrash) {
        // 从回收站UI移除
        removeRoleFromHoloDeck(roleId);
        // 刷新回收站显示
        refreshHoloDeckDisplay(tpl);
    }
    
    // 添加到分组UI
    addRoleToGroupUI(roleId, targetGroupId, meta);
    
    const groupName = targetGroup.name || targetGroup.title || targetGroupId;
    logToConsole(`角色 [${meta?.name || roleId}] 已移动到 [${groupName}]`, 'success');
    
    return true;
}

// ==========================================
// 内部辅助函数
// ==========================================

// 从侧边栏移除角色卡片
function removeRoleCardFromSidebar(roleId) {
    const roleCard = document.querySelector(`.mini-card[data-target="${roleId}-panel"]`);
    if (roleCard) {
        roleCard.remove();
    }
    
    // 检查并更新空分组
    document.querySelectorAll('.group-content').forEach(groupContent => {
        if (groupContent.children.length === 0) {
            const emptyMsg = groupContent.querySelector('.empty-group-msg');
            if (!emptyMsg) {
                const msg = document.createElement('div');
                msg.className = 'empty-group-msg';
                msg.textContent = '空分组';
                msg.style.color = '#999';
                msg.style.padding = '8px';
                msg.style.textAlign = 'center';
                groupContent.appendChild(msg);
            }
        }
    });
}

// 从回收站UI移除角色
function removeRoleFromHoloDeck(roleId) {
    const holoCard = document.querySelector(`.holo-card[data-target="${roleId}-panel"]`);
    if (holoCard) {
        holoCard.remove();
        updateHoloDeckCount();
    }
}

// 添加到分组UI
function addRoleToGroupUI(roleId, groupId, meta) {
    const targetGroup = document.querySelector(`.group[data-group-id="${groupId}"] .group-content`);
    if (!targetGroup) {
        console.log(`目标分组UI未找到: ${groupId}`);
        return;
    }
    
    // 检查是否已存在
    const existingCard = document.querySelector(`.mini-card[data-target="${roleId}-panel"]`);
    if (existingCard) {
        console.log(`卡片已存在: ${roleId}`);
        return;
    }
    
    // 创建新卡片
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.dataset.target = `${roleId}-panel`;
    
    // 根据实际卡片结构创建
    if (meta) {
        card.innerHTML = `
            <i class="${meta.icon}"></i>
            <span class="name">${meta.name}</span>
        `;
    } else {
        card.textContent = roleId;
    }
    
    // 绑定拖拽
    if (window.bindDragToNewCard) {
        window.bindDragToNewCard(card);
    }
    
    targetGroup.appendChild(card);
}

// 刷新回收站显示
function refreshHoloDeckDisplay(tpl) {
    // 查找现有的回收站容器
    const container = document.querySelector('.holo-deck-container');
    const existingDeck = container ? container.querySelector('.holo-deck') : null;
    
    if (!container) {
        // 如果没有容器，检查是否需要创建（在detail视图且回收站不为空）
        if (state.currentView === 'detail' && tpl.trashBin && tpl.trashBin.length > 0) {
            // 触发侧边栏重新渲染
            if (window.renderSidebar) {
                window.renderSidebar();
            }
        }
        return;
    }
    
    // 保存展开状态
    const wasOpen = existingDeck ? existingDeck.querySelector('.holo-content')?.classList.contains('open') : false;
    
    // 清除容器内容
    container.innerHTML = '';
    
    // 如果回收站不为空，重新渲染
    if (tpl.trashBin && tpl.trashBin.length > 0) {
        renderHoloDeck(container, tpl);
        
        // 恢复展开状态
        if (wasOpen) {
            const newDeck = container.querySelector('.holo-deck');
            if (newDeck) {
                const content = newDeck.querySelector('.holo-content');
                if (content) {
                    content.classList.add('open');
                    if (state) state.holoDeckOpen = true;
                }
            }
        }
    } else {
        // 如果回收站为空，移除整个容器
        container.remove();
    }
}
// 更新回收站计数
function updateHoloDeckCount() {
    const holoHeader = document.querySelector('.holo-header span');
    if (holoHeader) {
        const currentCount = document.querySelectorAll('.holo-card').length;
        const icon = '<i class="fas fa-recycle"></i>';
        holoHeader.innerHTML = `${icon} 角色回收站 (${currentCount})`;
    }
}