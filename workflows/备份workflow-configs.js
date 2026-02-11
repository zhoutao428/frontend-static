// frontend/workflows/workflow-center.js

// 状态管理
let instances = []; // 任务实例数组
let activeDrawerId = null;
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 渲染右侧模板库
    renderLibrary();
    // 2. 初始化左侧拖拽接收
    initDropZone();
});

// =======================
// 1. 渲染模板库
// =======================
function renderLibrary() {
    const container = document.getElementById('template-library');
    if(!container) return;
    
    // 从 workflow-templates.js 获取数据，如果没有就用兜底
    const templates = window.WORKFLOW_TEMPLATES || {};
    
    Object.entries(templates).forEach(([id, tpl]) => {
        const card = document.createElement('div');
        card.className = 'tpl-card';
        card.draggable = true;
        card.dataset.id = id;
        
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="font-size:20px; color:${tpl.color};"><i class="${tpl.icon}"></i></div>
                <div style="font-size:10px; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${tpl.category}</div>
            </div>
            <div style="font-weight:bold; margin-top:5px;">${tpl.name}</div>
            <div style="font-size:11px; color:#94a3b8; line-height:1.4;">${tpl.description}</div>
            <div style="margin-top:auto; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); font-size:10px; color:#64748b;">
                <i class="fas fa-layer-group"></i> ${tpl.steps.length} 步骤
            </div>
        `;
        
        // 拖拽开始
        card.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', id);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => card.style.opacity = '1';
        
        container.appendChild(card);
    });
}

// =======================
// 2. 拖拽逻辑 (Left Side)
// =======================
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
            createTask(tplId);
        }
    };
}

// =======================
// 3. 任务管理 (核心)
// =======================
function createTask(tplId) {
    const tpl = window.WORKFLOW_TEMPLATES[tplId];
    const task = {
        id: 'task_' + Date.now(),
        tpl: tpl,
        status: 'ready', // ready, running, paused, completed
        progress: 0,
        currentStep: 0,
        logs: [`[System] Task Initialized: ${tpl.name}`],
        tokenCost: 0,
        timer: null
    };
    
    instances.push(task);
    renderTasks();
    
    // 隐藏空提示
    document.getElementById('empty-pool-hint').style.display = 'none';
}

function renderTasks() {
    const container = document.getElementById('execution-pool');
    container.innerHTML = '';
    
    // 如果没有任务，显示提示
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
        
        // ✅ 这里的 HTML 结构必须包含删除按钮
        card.innerHTML = `
            <div class="task-header">
                <span>${task.tpl.name}</span>
                <span style="font-size:10px; opacity:0.8;"><i class="fas ${statusIcon}"></i> ${statusText}</span>
            </div>
            
            <div class="task-progress-bar">
                <div class="task-progress-fill" style="width:${task.progress}%"></div>
            </div>
            
            <div class="task-controls">
                <button class="ctrl-btn play" onclick="startTask('${task.id}')" title="启动/继续">
                    <i class="fas fa-play"></i>
                </button>
                <button class="ctrl-btn pause" onclick="pauseTask('${task.id}')" title="暂停">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="ctrl-btn stop" onclick="requestStopTask('${task.id}')" title="终止/删除">
                    <i class="fas fa-trash-alt"></i> <!-- ✅ 删除按钮在这里 -->
                </button>
                <div style="width:1px; background:rgba(255,255,255,0.1); margin:0 5px;"></div>
                <button class="ctrl-btn" onclick="openDrawer('${task.id}')" title="查看详情">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    document.getElementById('active-count').innerText = 
        `${instances.filter(t => t.status === 'running').length} 运行中`;
}
    
    // 更新顶部计数
    document.getElementById('active-count').innerText = 
        `${instances.filter(t => t.status === 'running').length} Running`;
}

// =======================
// 4. 执行逻辑 (模拟器)
// =======================
window.startTask = function(id) {
    const task = instances.find(t => t.id === id);
    if (!task || task.status === 'completed' || task.status === 'running') return;
    
    task.status = 'running';
    task.logs.push(`[${new Date().toLocaleTimeString()}] >> 任务启动...`);
    renderTasks();
    if(activeDrawerId === id) updateDrawerUI(task); // 实时更新抽屉
    
    // 模拟执行循环
    task.timer = setInterval(() => {
        if (task.progress >= 100) {
            completeTask(task);
            return;
        }
        
        // 进度增加
        task.progress += 1;
        
        // 模拟消耗 Token
        task.tokenCost += Math.floor(Math.random() * 50);
        
        // 模拟日志
        if (task.progress % 10 === 0) {
            const stepName = task.tpl.steps[task.currentStep] || 'Finalizing';
            task.logs.push(`[Process] Executing: ${stepName} ... OK`);
            
            // 步骤递进
            if (task.progress > (task.currentStep + 1) * (100 / task.tpl.steps.length)) {
                task.currentStep++;
            }
        }
        
        // 实时更新 UI (只更新进度条和抽屉，避免全列表重绘太卡)
        // 这里简化处理，直接刷新
        if(activeDrawerId === id) updateDrawerUI(task);
        renderTasks(); 
        
    }, 100); // 速度
};

window.pauseTask = function(id) {
    const task = instances.find(t => t.id === id);
    if (!task || task.status !== 'running') return;
    
    clearInterval(task.timer);
    task.status = 'paused';
    task.logs.push(`[System] 任务已暂停`);
    renderTasks();
};

function completeTask(task) {
    clearInterval(task.timer);
    task.status = 'completed';
    task.progress = 100;
    task.logs.push(`[System] ✅ 任务完成! 总消耗: ${task.tokenCost} KB`);
    renderTasks();
}

// =======================
// 5. 抽屉与交互
// =======================
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
    // 更新标题
    document.getElementById('drawer-title').innerHTML = `<i class="fas fa-terminal"></i> ${task.tpl.name} - ${task.status.toUpperCase()}`;
    
    // 更新 Cost
    document.getElementById('token-cost').innerText = `Cost: ${task.tokenCost} KB`;
    
    // 更新日志
    const term = document.getElementById('terminal-content');
    term.innerHTML = task.logs.map(l => `<div class="log-line">${l}</div>`).join('');
    term.scrollTop = term.scrollHeight;
    
    // 更新步骤条
    const stepsDiv = document.getElementById('drawer-steps');
    stepsDiv.innerHTML = '';
    task.tpl.steps.forEach((s, i) => {
        const d = document.createElement('div');
        d.style.padding = '5px 10px';
        d.style.fontSize = '12px';
        d.style.borderRadius = '4px';
        d.style.marginRight = '10px';
        
        if (i < task.currentStep) {
            d.style.color = '#10b981';
            d.style.background = 'rgba(16,185,129,0.1)';
            d.innerHTML = `<i class="fas fa-check"></i> ${s}`;
        } else if (i === task.currentStep && task.status === 'running') {
            d.style.color = '#f59e0b';
            d.style.border = '1px solid #f59e0b';
            d.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${s}`;
        } else {
            d.style.color = '#64748b';
            d.innerHTML = `${i+1}. ${s}`;
        }
        stepsDiv.appendChild(d);
    });
}

// 终止确认
window.requestStopTask = function(id) {
    pendingDeleteId = id;
    document.getElementById('confirm-drawer').classList.add('open');
};

window.closeConfirmDrawer = function() {
    document.getElementById('confirm-drawer').classList.remove('open');
    pendingDeleteId = null;
};

// 绑定确认按钮
document.getElementById('btn-confirm-kill').onclick = () => {
    if(pendingDeleteId) {
        // 真正的删除
        const task = instances.find(t => t.id === pendingDeleteId);
        if(task) clearInterval(task.timer); // 停掉计时器
        
        instances = instances.filter(t => t.id !== pendingDeleteId);
        renderTasks();
        
        // 如果删的是当前打开的详情页，关掉抽屉
        if(activeDrawerId === pendingDeleteId) closeDrawer();
        
        closeConfirmDrawer();
    }
};
      