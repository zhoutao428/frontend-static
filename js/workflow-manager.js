// workflow-manager.js
import { state } from './state.js';
import { createCustomRoleWindow } from './window-manager.js';
import { logToConsole } from './ui.js';

export function loadSavedWorkflows() {
    const saved = localStorage.getItem('user_workflows');
    if (!saved) return;
    
    const workflows = JSON.parse(saved);
    const menuContainer = document.querySelector('#features-menu'); 
    
    if (workflows.length > 0 && menuContainer) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        menuContainer.appendChild(divider);
        
        const title = document.createElement('div');
        title.style.cssText = "font-size:10px; color:#64748b; padding:0 10px; margin-top:5px; text-transform:uppercase;";
        title.innerText = "我的工作流";
        menuContainer.appendChild(title);

        workflows.forEach(wf => {
            const link = document.createElement('a');
            link.className = 'menu-item';
            link.href = '#';
            link.innerHTML = `<i class="fas fa-play-circle" style="color:#10b981"></i> ${wf.name}`;
            link.onclick = (e) => {
                e.preventDefault();
                loadWorkflowToStage(wf);
            };
            menuContainer.appendChild(link);
        });
    }
}

export function loadWorkflowToStage(workflow) {
    if (!confirm(`确定要加载工作流 [${workflow.name}] 吗？\n当前舞台将被清空。`)) return;
    
    const stage = document.getElementById('main-stage');
    const pool = document.getElementById('windows-pool');
    
    // 确保 custom 窗口被移回池子
    const customWin = document.getElementById('custom-panel');
    if (customWin && customWin.parentElement === stage) {
        pool.appendChild(customWin);
        customWin.style.display = 'none';
    }
    
    Array.from(stage.children).forEach(c => {
        if(!c.classList.contains('empty-state')) {
            pool.appendChild(c);
        }
    });
    
    console.log("加载工作流:", workflow);
    
    workflow.groups.forEach(group => {
        group.roles.forEach(roleId => {
            createCustomRoleWindow(roleId);
            const win = document.getElementById(`${roleId}-panel`);
            if (win) {
                stage.appendChild(win);
                win.style.display = 'flex';
                const task = group.tasks?.[roleId];
                if (task) {
                    const input = win.querySelector('textarea');
                    if (input) input.value = task;
                }
            }
        });
    });
    
    const empty = stage.querySelector('.empty-state');
    if(empty) empty.style.display = 'none';
    
    // 设置工作流模式
    ensureWorkflowTemplate(workflow);
    state.currentView = 'detail';
    state.activeTemplateId = 'workflow_temp';
    window.dispatchEvent(new CustomEvent('sidebar-refresh'));
}

function ensureWorkflowTemplate(workflow) {
    let workflowTemplate = state.templates.find(t => t.id === 'workflow_temp');
    
    if (!workflowTemplate) {
        workflowTemplate = {
            id: 'workflow_temp',
            type: 'workflow',
            name: workflow.name,
            description: '临时工作流',
            icon: 'fas fa-play-circle',
            bgClass: 'role-workflow',
            groups: workflow.groups || []
        };
        state.templates.push(workflowTemplate);
    } else {
        workflowTemplate.name = workflow.name;
        workflowTemplate.groups = workflow.groups || [];
    }
    
    return workflowTemplate;
}