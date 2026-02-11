// window-manager.js
import { state } from './state.js';
import { getRoleMeta } from './role-utils.js';
import { logToConsole } from './ui.js';

export function createCustomRoleWindow(roleId) {
    const pool = document.getElementById('windows-pool');
    if (document.getElementById(`${roleId}-panel`)) return;
    
    const div = document.createElement('div');
    div.className = 'window-card';
    div.id = `${roleId}-panel`;
    div.dataset.role = roleId;
    div.style.display = 'none';
    
    const meta = getRoleMeta(roleId);
    const displayName = meta.name || roleId;
    
    let extraHtml = '';
    if (roleId === 'custom') {
        extraHtml = `
        <div style="margin-bottom: 10px; color: #aaa; font-size: 12px;">
            系统提示词:
            <input type="text" class="input-box" id="custom-system-prompt" 
                   style="height: 30px; min-height: 30px; margin-bottom: 0;" 
                   placeholder="你是一个Python专家...">
        </div>`;
    }
    
    div.innerHTML = `
    <div class="card-header">
        <div class="title"><i class="${meta.icon || 'fas fa-user'}"></i> ${displayName}</div>
        <div class="model-tag">${roleId === 'custom' ? '临时对话' : 'Role'}</div>
        <div class="window-controls">
            <i class="fas fa-expand-alt btn-maximize" data-target="${roleId}-panel"></i>
            <i class="fas fa-minus btn-minimize" data-target="${roleId}-panel"></i>
            <i class="fas fa-times btn-close-window" data-target="${roleId}-panel"></i>
        </div>
    </div>
    <div class="card-body">
        ${extraHtml}
        <div style="margin: 15px 0;">
            <div style="font-size: 12px; color: #a5b4fc; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-terminal"></i>
                <span>任务指令：</span>
            </div>
            <textarea 
                class="input-box" 
                placeholder="输入具体任务..."
                style="width: 100%; min-height: 100px; padding: 12px; font-size: 14px;"
                id="${roleId}-task-input"
            ></textarea>
        </div>
        
        <div class="tools-bar">
            <button class="btn-tool action btn-run-agent" data-role="${roleId}">
                <i class="fas fa-play"></i> 执行任务
            </button>
        </div>
        
        <div class="output-box" style="margin-top: 20px;" id="${roleId}-output"></div>
    </div>
`;
    pool.appendChild(div);
}

export function cleanupWorkflowWindows() {
    const stage = document.getElementById('main-stage');
    const pool = document.getElementById('windows-pool');
    
    if (!stage || !pool) return;
    
    const windows = stage.querySelectorAll('.window-card');
    windows.forEach(win => {
        pool.appendChild(win);
        win.style.display = 'none';
    });
    
    const empty = stage.querySelector('.empty-state');
    if (empty) empty.style.display = 'block';
    
    document.querySelectorAll('.mini-card.active').forEach(card => {
        card.classList.remove('active');
    });
}

export function showDefaultCustomWindow() {
    if (!document.getElementById('custom-panel')) {
        createCustomRoleWindow('custom');
    }
    
    const customWin = document.getElementById('custom-panel');
    if (customWin) {
        const stage = document.getElementById('main-stage');
        const pool = document.getElementById('windows-pool');
        
        if (customWin.parentElement === pool) {
            const stageWindows = stage.querySelectorAll('.window-card');
            stageWindows.forEach(win => {
                pool.appendChild(win);
                win.style.display = 'none';
            });
            
            stage.appendChild(customWin);
            customWin.style.display = 'flex';
            
            const empty = stage.querySelector('.empty-state');
            if (empty) empty.style.display = 'none';
        }
    }
}

export function renderWindows(currentTemplate) {
    const pool = document.getElementById('windows-pool');
    if (!pool) return;
    pool.innerHTML = '';
    
    if (!currentTemplate) return;

    currentTemplate.groups.forEach(group => {
        if (Array.isArray(group.roles)) {
            group.roles.forEach(roleId => {
                createCustomRoleWindow(roleId);
            });
        }
    });
    
    const stage = document.getElementById('main-stage');
    Array.from(stage.children).forEach(child => {
        if (!child.classList.contains('empty-state')) {
            child.remove();
        }
    });
    const empty = stage.querySelector('.empty-state');
    if (empty) empty.style.display = 'block';
}