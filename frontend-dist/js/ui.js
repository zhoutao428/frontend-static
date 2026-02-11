import { state } from './state.js';

// === 基础日志 ===
export function logToConsole(msg, type='info') {
    const out = document.getElementById('console-output');
    if(out) {
        const div = document.createElement('div');
        div.className = `log-item ${type}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
    }
    console.log(`[${type}] ${msg}`);
}

// === 控制台抽屉 ===
export function toggleConsole() {
    const panel = document.querySelector('.console-panel');
    const icon = document.getElementById('console-toggle-icon');
    if (panel) {
        panel.classList.toggle('collapsed');
        if (icon) {
            icon.className = panel.classList.contains('collapsed') 
                ? 'fas fa-chevron-up' 
                : 'fas fa-chevron-down';
        }
    }
}

export function clearConsole(e) {
    if(e) e.stopPropagation();
    const output = document.getElementById('console-output');
    if (output) output.innerHTML = '<div class="log-item info">♻️ 控制台已清空</div>';
}

// === 视图切换 ===
export function toggleViewMode() {
    state.isGridMode = !state.isGridMode;
    const stage = document.getElementById('main-stage');
    const btn = document.getElementById('view-mode-btn');
    const pool = document.getElementById('windows-pool');
    
    if (state.isGridMode) {
        // 九宫格模式：显示当前模板的所有窗口
        stage.classList.add('grid-mode');
        if(btn) btn.innerHTML = '<i class="fas fa-stop"></i> 单窗口';
        
        // 清空舞台
        stage.innerHTML = '';
        
        // 获取当前模板的所有角色
        const activeTemplate = state.templates.find(t => t.id === state.activeTemplateId);
        if (activeTemplate) {
            // 收集所有角色ID
            const roleIds = [];
            activeTemplate.groups.forEach(group => {
                if (Array.isArray(group.roles)) {
                    roleIds.push(...group.roles);
                }
            });
            
            // 为每个角色创建/获取窗口并添加到舞台
            roleIds.forEach(roleId => {
                // 确保窗口存在
                if (!document.getElementById(`${roleId}-panel`) && window.createCustomRoleWindow) {
                    window.createCustomRoleWindow(roleId);
                }
                const win = document.getElementById(`${roleId}-panel`);
                if (win) {
                    stage.appendChild(win);
                    win.style.display = 'flex';
                    win.classList.remove('zoomed');
                }
            });
        }
        
        // 隐藏empty-state
        const empty = stage.querySelector('.empty-state');
        if (empty) empty.style.display = 'none';
        
    } else {
        // 单窗口模式
        stage.classList.remove('grid-mode');
        if(btn) btn.innerHTML = '<i class="fas fa-th-large"></i> 九宫格';
        
        // 把除了当前激活窗口外的所有窗口放回池子
        const wins = Array.from(stage.querySelectorAll('.window-card'));
        const activeWin = stage.querySelector('.window-card:last-child'); // 最后一个为当前激活
        
        wins.forEach(win => {
            if (win !== activeWin) {
                pool.appendChild(win);
                win.style.display = 'none';
            }
        });
    }
}
// === 窗口控制 (新增) ===
export function maximizeWindow(targetId) {
    const card = document.getElementById(targetId);
    if (!card) return;
    
    // 切换最大化状态
    if (card.classList.contains('fixed-maximized')) {
        card.classList.remove('fixed-maximized');
        card.style = ""; // 清除内联样式
    } else {
        card.classList.add('fixed-maximized');
        // 强制样式覆盖
        card.style.position = 'fixed';
        card.style.top = '60px';
        card.style.left = '0';
        card.style.width = '100vw';
        card.style.height = 'calc(100vh - 60px)';
        card.style.zIndex = '999';
        card.style.borderRadius = '0';
    }
}

export function minimizeWindow(targetId) {
    const card = document.getElementById(targetId);
    if (!card) return;
    // 简单实现：最小化就是把 body 隐藏
    const body = card.querySelector('.card-body');
    if (body) {
        body.style.display = body.style.display === 'none' ? 'flex' : 'none';
    }
}

export function removeWindow(targetId) {
    const card = document.getElementById(targetId);
    if (card) card.remove();
}

// === 模态框逻辑 ===
export function showInputModal(title, placeholder, onConfirm) {
    const modal = document.getElementById('custom-modal');
    const input = document.getElementById('modal-input');
    const btn = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('modal-title');
    
    if (!modal) return prompt(title);
    
    if(titleEl) titleEl.innerText = title;
    input.value = '';
    input.placeholder = placeholder;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    input.focus();
    
    // 移除旧监听，添加新监听 (这里为了方便还是用了 onclick 覆盖，但局限在模态框内部)
    // 如果要极致纯净，这里也可以改，但为了代码简洁暂且保留逻辑
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
        if (input.value.trim()) {
            onConfirm(input.value.trim());
            closeCustomModal();
        }
    });
    
    // 回车支持
    input.onkeydown = (e) => {
        if(e.key === 'Enter') newBtn.click();
    };
}

export function closeCustomModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// === 标签同步 (兼容版) ===
export function updateAllWindowTags(provider, modelName) {
    let displayText = 'Role';

    // 情况 A: 传入的是 <select> 元素 (main.js 的调用方式)
    if (provider instanceof HTMLElement && provider.tagName === 'SELECT') {
        if (provider.selectedIndex >= 0) {
            // 获取选中的文本，并去掉括号里的价格信息
            displayText = provider.options[provider.selectedIndex].text.split('(')[0].trim();
        }
    } 
    // 情况 B: 传入的是两个字符串 (旧代码的调用方式)
    else if (typeof modelName === 'string') {
        displayText = modelName;
    } 
    // 情况 C: 只传了一个字符串
    else if (typeof provider === 'string') {
        displayText = provider;
    }

    const tags = document.querySelectorAll('.model-tag');
    tags.forEach(tag => {
        tag.innerText = displayText;
        tag.title = `Current Model: ${displayText}`;
        
        // 视觉反馈：闪烁一下绿色
        tag.style.transition = 'color 0.3s';
        tag.style.color = '#4ade80';
        setTimeout(() => tag.style.color = '', 500);
    });
}
// === 智能体融合窗口 ===
export function createMergedAgentWindow(mergedId, name1, name2) {
    const stage = document.getElementById('main-stage');
    const pool = document.getElementById('windows-pool');
    let win = document.getElementById(`${mergedId}-panel`);
    
    if (!win) {
        win = document.createElement('div');
        win.className = 'window-card merged-window';
        win.id = `${mergedId}-panel`;
        win.dataset.role = mergedId; // 重要：用于事件委托查找
        
        win.innerHTML = `
            <div class="card-header" style="background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2));">
                <div class="title"><i class="fas fa-link"></i> ${name1} & ${name2}</div>
                <div class="model-tag">Fusion</div>
                <div class="window-controls">
                    <!-- 注意：这里也不写 onclick 了，只留 class -->
                    <i class="fas fa-times btn-close-window" data-target="${mergedId}-panel"></i>
                </div>
            </div>
            <div class="card-body">
                <div class="fusion-indicator">🤖 融合模式已激活: [${name1}] + [${name2}]</div>
                <textarea class="input-box" placeholder="输入协作任务..."></textarea>
                <div class="tools-bar">
                    <button class="btn-tool action btn-run-agent" data-role="${mergedId}"><i class="fas fa-bolt"></i> 执行</button>
                </div>
                <div class="output-box"></div>
            </div>
        `;
        pool.appendChild(win);
    }
    
    const current = stage.querySelector('.window-card');
    if (current) pool.appendChild(current);
    stage.appendChild(win);
    logToConsole(`融合完毕: ${name1} + ${name2}`, 'success');
}
// ... (之前的函数保持不变)

// === Token 进度条控制 ===
export function updateTokenProgress(role, usage) {
    // 找到侧边栏对应的卡片
    const card = document.querySelector(`.mini-card[data-target="${role}-panel"]`);
    if (!card) return;
    
    // 检查是否已有进度条，没有则创建
    let bar = card.querySelector('.token-progress-bar');
    let value = card.querySelector('.token-progress-value');
    
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'token-progress-bar';
        bar.style.display = 'block';
        
        value = document.createElement('div');
        value.className = 'token-progress-value';
        
        bar.appendChild(value);
        // 插入到 info 块下面
        card.querySelector('.info').appendChild(bar);
    }
    
    // 更新宽度
    const percent = Math.min(usage.percentage, 100);
    value.style.width = `${percent}%`;
    
    // 更新颜色
    value.className = 'token-progress-value'; // 重置
    if (percent > 80) value.classList.add('danger');
    else if (percent > 50) value.classList.add('warning');
    
    // 可选：添加 Tooltip 显示具体数值
    card.title = `Token Usage: ${usage.total_tokens} / ${usage.limit} (${percent}%)`;
}
function editRoleName(roleId, currentName) {
    showInputModal('重命名角色', currentName, (newName) => {
        const names = JSON.parse(localStorage.getItem('custom_role_names') || '{}');
        names[roleId] = newName;
        localStorage.setItem('custom_role_names', JSON.stringify(names));
        renderSidebar(); // 刷新
    });
}