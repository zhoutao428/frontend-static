// sidebar-renderer.js
import { state } from './state.js';
import { createSectionTitle } from './ui-utils.js';
import { createRoleCard } from './role-utils.js';
import { createCustomRoleWindow } from './window-manager.js';
import { renderHoloDeck } from './holo-deck.js';

export function renderSidebar() {
    const sidebar = document.getElementById('sidebar-area');
    if (!sidebar) return;
    
    // 保存当前的回收站展开状态
    const existingDeck = sidebar.querySelector('.holo-deck');
    const wasOpen = existingDeck && existingDeck.querySelector('.holo-content')?.classList.contains('open');
    
    // 清除现有内容
    sidebar.innerHTML = ''; 

    if (state.currentView === 'root') {
        renderRootView(sidebar);
    } else if (state.currentView === 'detail') {
        renderDetailView(sidebar);
    }
    
    // 渲染回收站（只在detail视图）
    if (state.currentView === 'detail') {
        renderHoloDeckToSidebar(sidebar, wasOpen);
    }
}
function renderHoloDeckToSidebar(sidebar, wasOpen) {
    const currentTpl = state.templates.find(t => t.id === state.activeTemplateId);
    if (!currentTpl || !currentTpl.trashBin || currentTpl.trashBin.length === 0) {
        return;
    }
    
    // 创建容器
    const container = document.createElement('div');
    container.className = 'holo-deck-container';
    
    // 调用渲染函数
    renderHoloDeck(container, currentTpl);
    
    // 恢复展开状态
    if (wasOpen) {
        const newDeck = container.querySelector('.holo-deck');
        if (newDeck) {
            const content = newDeck.querySelector('.holo-content');
            if (content) {
                content.classList.add('open');
                // 更新状态
                if (state) state.holoDeckOpen = true;
            }
        }
    }
    
    sidebar.appendChild(container);
}
export function renderRootView(container) {
    container.appendChild(createSectionTitle('自定义层 (Custom)'));
    
    const libraryCard = document.createElement('div');
    libraryCard.className = 'mini-card root-card library-entry';
    libraryCard.style.cssText = "border: 1px dashed #6366f1; background: rgba(99,102,241,0.1);";
    libraryCard.innerHTML = `
        <div class="icon-box" style="background:transparent; color:#818cf8;"><i class="fas fa-plus-circle"></i></div>
        <div class="info">
            <div class="name" style="color:#818cf8;">新建/管理模板</div>
            <div class="status">进入配置库</div>
        </div>
    `;
    libraryCard.onclick = () => window.location.href = 'role-manager.html';
    container.appendChild(libraryCard);

    const customTemplates = state.templates.filter(t => t.type === 'custom');
    customTemplates.forEach(tpl => container.appendChild(createTemplateCard(tpl)));

    container.appendChild(createSectionTitle('预制层 (Presets)'));

    const presetTemplates = state.templates.filter(t => t.type === 'preset');
    presetTemplates.forEach(tpl => container.appendChild(createTemplateCard(tpl)));
}

export function renderDetailView(container) {
    const tpl = state.templates.find(t => t.id === state.activeTemplateId);
    if (!tpl) {
        state.currentView = 'root';
        state.activeTemplateId = null;
        return renderRootView(container);
    }

    // 返回按钮
    const backBar = document.createElement('div');
    backBar.className = 'mini-card back-bar';
    backBar.style.cssText = "margin-bottom: 15px; background: rgba(255,255,255,0.05); cursor: pointer;";
    backBar.innerHTML = `
        <div class="icon-box"><i class="fas fa-arrow-left"></i></div>
        <div class="info">
            <div class="name">${tpl.name}</div>
            <div class="status">返回主菜单</div>
        </div>
    `;
    backBar.onclick = () => {
        state.currentView = 'root';
        state.activeTemplateId = null;
        
        cleanupWorkflowWindows();
        renderSidebar();
        showDefaultCustomWindow();
    };
    container.appendChild(backBar);

    // 渲染分组和角色
    tpl.groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'agent-group';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'group-title';
        titleDiv.textContent = group.title;
        
        if (window.bindDragToGroupTitle) window.bindDragToGroupTitle(titleDiv, group.id);
        
        groupDiv.appendChild(titleDiv);
        
        if (Array.isArray(group.roles)) {
            group.roles.forEach(roleId => {
                const card = createRoleCard(roleId);
                
                card.onclick = (e) => {
                    e.stopPropagation();
                    console.log('点击了角色:', roleId);
                    
                    if (window.createCustomRoleWindow) window.createCustomRoleWindow(roleId);
                    
                    const win = document.getElementById(`${roleId}-panel`);
                    if (win) {
                        const stage = document.getElementById('main-stage');
                        const pool = document.getElementById('windows-pool');
                        
                        const current = stage.querySelector('.window-card');
                        if (current) pool.appendChild(current);
                        
                        stage.appendChild(win);
                        win.style.display = 'flex';
                        
                        const empty = stage.querySelector('.empty-state');
                        if (empty) empty.style.display = 'none';
                        
                        document.querySelectorAll('.mini-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                    }
                };
                
                groupDiv.appendChild(card);
            });
        }
        container.appendChild(groupDiv);
    });

    // 预生成窗口
    if (window.renderWindows) window.renderWindows(tpl);
}

export function createTemplateCard(tpl) {
    const card = document.createElement('div');
    card.className = 'mini-card root-card';
    card.dataset.id = tpl.id;
    
    let deleteBtn = '';
    if (tpl.type === 'custom') {
        deleteBtn = `<i class="fas fa-trash-alt btn-delete-tpl" title="删除模板" style="margin-left:auto; color:#666; font-size:12px; z-index:10;"></i>`;
    } else {
        deleteBtn = `<div class="arrow" style="margin-left:auto; opacity:0.3;"><i class="fas fa-chevron-right"></i></div>`;
    }
    
    const bgClass = tpl.bgClass || 'role-idea';
    
    card.innerHTML = `
        <div class="icon-box ${bgClass}">
            <i class="${tpl.icon || 'fas fa-layer-group'}"></i>
        </div>
        <div class="info">
            <div class="name">${tpl.name}</div>
            <div class="status">${tpl.description || '点击进入'}</div>
        </div>
        ${deleteBtn}
    `;
    
    card.onclick = (e) => {
        if (e.target.classList.contains('btn-delete-tpl')) {
            e.stopPropagation();
            if(confirm(`确定删除模板 [${tpl.name}] 吗？`)) {
                state.templates = state.templates.filter(t => t.id !== tpl.id);
                localStorage.setItem('user_templates', JSON.stringify(state.templates));
                renderSidebar();
            }
            return;
        }
        
        state.currentView = 'detail';
        state.activeTemplateId = tpl.id;
        renderSidebar();
    };
    
    return card;
}