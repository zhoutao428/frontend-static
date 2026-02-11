// role-utils.js
import { getRoleDisplayName, getRoleIcon, getRoleColorClass } from './config/role-mappings.js';
import { state } from './state.js';
import { logToConsole } from './ui.js';
export function getRoleMeta(roleId) {
    return {
        name: getRoleDisplayName(roleId),
        icon: getRoleIcon(roleId),
        colorClass: getRoleColorClass(roleId)
    };
}

export function createRoleCard(roleId) {
    const meta = getRoleMeta(roleId);
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.dataset.target = `${roleId}-panel`;
    card.setAttribute('draggable', 'true');
    
    if (roleId.startsWith('custom_')) card.dataset.custom = "true";

    const unlinkBtn = document.createElement('i');
    unlinkBtn.className = 'fas fa-unlink btn-unlink';
    unlinkBtn.title = '移除至仓库';
    unlinkBtn.onmouseenter = () => unlinkBtn.style.opacity = '1';
    unlinkBtn.onmouseleave = () => unlinkBtn.style.opacity = '0.5';
    unlinkBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        card.classList.add('dissolving');
        setTimeout(() => {
            removeRoleFromGroup(roleId);
        }, 300);
    };
    
    card.innerHTML = `
        <div class="icon-box ${meta.colorClass}">
            <i class="${meta.icon}"></i>
        </div>
        <div class="info">
            <div class="name">${meta.name}</div>
            <div class="status">Ready</div>
            <div class="token-progress-bar" style="display:none;">
                <div class="token-progress-value"></div>
            </div>
        </div>
    `;
    
    card.appendChild(unlinkBtn);
    
    if (window.bindDragToNewCard) window.bindDragToNewCard(card);
    
    return card;
}

function removeRoleFromGroup(roleId) {
    const tpl = state.templates.find(t => t.id === state.activeTemplateId);
    if (!tpl) return;
    
    tpl.groups.forEach(g => {
        g.roles = g.roles.filter(r => r !== roleId);
    });
    
    if (!tpl.trashBin) tpl.trashBin = [];
    if (!tpl.trashBin.includes(roleId)) {
        tpl.trashBin.push(roleId);
    }
    
    localStorage.setItem('user_templates', JSON.stringify(state.templates));
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));
    logToConsole(`角色 [${roleId}] 已移入回收站`, 'info');
}
