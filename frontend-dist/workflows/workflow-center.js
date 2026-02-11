import { WorkflowEngine } from '../js/workflow-engine.js';

import { WorkflowAPI } from './api-bridge.js';

    // 获取工作流列表
    async getWorkflows() {
        const token = localStorage.getItem('user_token');
        if (!token) return null;

        try {
            const res = await fetch('http://localhost:8000/api/workflows', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("无法连接后端工作流库，使用本地兜底");
        }
        return null;
    }
};

// ======================
// 2. 全局状态
// ======================
const engine = new WorkflowEngine(WorkflowAPI);
let instances = [];
let activeDrawerId = null;
let pendingDeleteId = null;

// 兜底数据 (当后端没连接时显示)
const FALLBACK_TEMPLATES = {
    'demo_local': { 
        name: '本地演示模板', 
        icon: 'fas fa-laptop-code', 
        color: '#64748b', 
        category: 'DEMO', 
        description: '后端连接失败，这是本地演示数据', 
        steps: ['检查网络', '确认后端运行', '刷新页面'] 
    }
};

// ======================
// 3. 初始化
// ======================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 工作流中心启动...');
    loadAndRenderLibrary();
    initDropZone();
    
    // 监听引擎事件
    engine.on('log', (msg) => {
        if (activeDrawerId && engine.currentTask && engine.currentTask.id === activeDrawerId) {
            appendLogToDrawer(msg);
        }
        if (engine.currentTask) engine.currentTask.logs.push(msg);
    });
    
    engine.on('update', (task) => {
        renderTasks(); // 刷新列表进度条
        if (activeDrawerId === task.id) updateDrawerUI(task);
    });
});

// ======================
// 4. 核心逻辑
// ======================

async function loadAndRenderLibrary() {
    const container = document.getElementById('template-library');
    if(!container) return;
    
    container.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center;"><i class="fas fa-circle-notch fa-spin"></i> 正在加载模组库...</div>';
    
    // 1. 尝试从后端获取
    const remoteTemplates = await WorkflowAPI.getWorkflows();
    
    // 2. 决定使用哪份数据
    const templates = remoteTemplates && Object.keys(remoteTemplates).length > 0 
        ? remoteTemplates 
        : (window.WORKFLOW_TEMPLATES || FALLBACK_TEMPLATES); // 优先用 window 全局变量(如果 script 引入了)，最后用兜底
        
    // 3. 更新全局变量 (供拖拽使用)
    window.WORKFLOW_TEMPLATES = templates;
    
    // 4. 渲染
    container.innerHTML = ''; // 清空 Loading
    
    // 新建入口
    const addCard = document.createElement('div');
    addCard.className = 'template-card add-card';
    addCard.style.border = '1px dashed #6366f1';
    addCard.style.background = 'rgba(99,102,241,0.05)';
    addCard.style.justifyContent = 'center';
    addCard.style.alignItems = 'center';
    addCard.style.cursor = 'pointer';
    addCard.innerHTML = `<i class="fas fa-plus-circle" style="font-size:32px; color:#6366f1; margin-bottom:10px;"></i><span style="color:#818cf8; font-weight:bold;">自定义 / 组装</span>`;
    addCard.onclick = () => window.location.href = '../role-manager.html';
    container.appendChild(addCard);

    Object.entries(templates).forEach(([id, tpl]) => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.draggable = true;
        card.dataset.id = id;
        
        const stepCount = tpl.steps ? tpl.steps.length : 0;
        
        card.innerHTML = `
            <div class="template-header">
                <div class="template-icon" style="color:${tpl.color || '#fff'}"><i class="${tpl.icon || 'fas fa-box'}"></i></div>
                <span style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.1); border-radius:4px; color:#aaa;">${tpl.category || '通用'}</span>
            </div>
            <div style="font-weight:bold; font-size:14px; margin-bottom:4px; color:#fff;">${tpl.name}</div>
            <div style="font-size:12px; color:#94a3b8; line-height:1.4; flex:1; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${tpl.description || '暂无描述'}</div>
            <div class="template-meta">
                <div class="meta-item"><i class="fas fa-layer-group"></i> ${stepCount}步骤</div>
                <div class="meta-item"><i class="fas fa-clock"></i> ${tpl.time || '未知'}</div>
                <div class="meta-item"><i class="fas fa-signal"></i> ${tpl.difficulty || '一般'}</div>
            </div>
        `;
        
        card.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', id);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => card.style.opacity = '1';
        
        container.appendChild(card);
    });
}

function initDropZone() {
    const zone = document.querySelector('.wf-sidebar');
    
    zone.ondragover = (e) => {
        e.preventDefault();
        zone.style.borderColor = '#6366f1';
        zone.style.boxShadow = '0 0 20px rgba(99,102,241,0.2) inset';
    };
    
    zone.ondragleave = () => {
        zone.style.borderColor = '';
        zone.style.boxShadow = '';
    };
    
    zone.ondrop = (e) => {
        e.preventDefault();
        zone.style.borderColor = '';
        zone.style.boxShadow = '';
        
        const tplId = e.dataTransfer.getData('text/plain');
        if (tplId && window.WORKFLOW_TEMPLATES[tplId]) {
            // 弹窗输入需求
            showWorkflowInputModal(window.WORKFLOW_TEMPLATES[tplId].name, (input) => {
                createTask(tplId, window.WORKFLOW_TEMPLATES[tplId], input);
            });
        }
    };
}

function createTask(tplId, tpl, userInput) {
    const task = {
        id: 'task_' + Date.now(),
        tpl: tpl,
        status: 'ready',
        progress: 0,
        currentStep: 0,
        initialInput: userInput,
        logs: [`[System] 任务初始化: ${tpl.name}`, `[Input] 需求: ${userInput}`],
        tokenCost: 0,
        results: []
    };
    instances.push(task);
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('execution-pool');
    container.innerHTML = '';
    
    if (instances.length === 0) {
        document.getElementById('empty-pool-hint').style.display = 'block';
        return;
    } else {
        document.getElementById('empty-pool-hint').style.display = 'none';
    }
    
    instances.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.status}`;
        
        let statusIcon = 'fa-stop-circle';
        let statusText = '准备就绪';
        if (task.status === 'running') { statusIcon = 'fa-spin fa-circle-notch'; statusText = '运行中'; }
        if (task.status === 'paused') { statusIcon = 'fa-pause-circle'; statusText = '已暂停'; }
        if (task.status === 'completed') { statusIcon = 'fa-check-circle'; statusText = '已完成'; }
        
        card.innerHTML = `
            <div class="task-header">
                <span>${task.tpl.name}</span>
                <span style="font-size:10px; opacity:0.8;"><i class="fas ${statusIcon}"></i> ${statusText}</span>
            </div>
            <div class="task-progress-bar">
                <div class="task-progress-fill" style="width:${task.progress}%"></div>
            </div>
            <div class="task-controls">
                <button class="ctrl-btn play" onclick="startTask('${task.id}')" title="启动"><i class="fas fa-play"></i></button>
                <button class="ctrl-btn pause" onclick="pauseTask('${task.id}')" title="暂停"><i class="fas fa-pause"></i></button>
                <button class="ctrl-btn stop" onclick="deleteTask('${task.id}')" title="删除"><i class="fas fa-trash-alt"></i></button>
                <div style="width:1px; background:rgba(255,255,255,0.1); margin:0 5px;"></div>
                <button class="ctrl-btn" onclick="openDrawer('${task.id}')" title="详情"><i class="fas fa-eye"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    
    document.getElementById('active-count').innerText = `${instances.filter(t => t.status === 'running').length} 运行中`;
}

// ======================
// 5. 控制逻辑 (暴露给 window)
// ======================

window.startTask = function(id) {
    const task = instances.find(t => t.id === id);
    if (!task) return;
    
    // 引擎接管
    engine.run(task);
};

window.pauseTask = function() {
    engine.pause();
};

window.deleteTask = function(id) {
    if(engine.currentTask && engine.currentTask.id === id) engine.stop();
    instances = instances.filter(t => t.id !== id);
    renderTasks();
    if(activeDrawerId === id) closeDrawer();
};

// 抽屉逻辑
window.openDrawer = function(id) {
    const task = instances.find(t => t.id === id);
    if(!task) return;
    activeDrawerId = id;
    document.getElementById('detail-drawer').classList.add('open');
    updateDrawerUI(task);
};

window.closeDrawer = function() {
    document.getElementById('detail-drawer').classList.remove('open');
    activeDrawerId = null;
};

function updateDrawerUI(task) {
    document.getElementById('drawer-title').innerHTML = `<i class="fas fa-terminal"></i> ${task.tpl.name}`;
    document.getElementById('token-cost').innerText = `消耗: ${task.tokenCost || 0} chars`;
    
    const term = document.getElementById('terminal-content');
    term.innerHTML = task.logs.map(l => `<div class="log-line">${l}</div>`).join('');
    term.scrollTop = term.scrollHeight;
    
    const stepsDiv = document.getElementById('drawer-steps');
    stepsDiv.innerHTML = '';
    if(task.tpl.steps) {
        task.tpl.steps.forEach((s, i) => {
            const stepName = typeof s === 'string' ? s : s.name;
            const d = document.createElement('div');
            d.className = `step-item ${i < task.currentStep ? 'done' : (i === task.currentStep ? 'active' : '')}`;
            d.innerHTML = `${i+1}. ${stepName}`;
            stepsDiv.appendChild(d);
        });
    }
}

function appendLogToDrawer(msg) {
    const term = document.getElementById('terminal-content');
    const div = document.createElement('div');
    div.className = 'log-line';
    div.innerText = msg;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
}

// 弹窗辅助
function showWorkflowInputModal(tplName, callback) {
    // 简单实现，如果 ui.js 没加载，这就很有用
    const val = prompt(`启动 [${tplName}]\n请输入核心目标：`, "例如：写一篇关于AI的文章");
    if(val) callback(val);
}

// 导出日志
window.exportCurrentLog = function() {
    if(!activeDrawerId) return;
    const task = instances.find(t => t.id === activeDrawerId);
    const content = task.logs.join('\n') + "\n\n=== 详细结果 ===\n" + (task.results || []).join('\n---\n');
    const blob = new Blob([content], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.tpl.name}_report.txt`;
    a.click();
};
