import { state } from './state.js';
import './drag.js'; 
import { toggleViewMode, logToConsole, showInputModal, closeCustomModal, toggleConsole, clearConsole } from './ui.js';
import { post, get, systemAPI } from './api.js';
// 导入各个模块
import { updateAllWindowTags, bindClick, showAnnouncementBar, handleCopy, handleDownload } from './ui-utils.js';
import { createCustomRoleWindow, cleanupWorkflowWindows, showDefaultCustomWindow } from './window-manager.js';
import { loadSavedWorkflows, loadWorkflowToStage } from './workflow-manager.js';
import { createRoleCard, getRoleMeta } from './role-utils.js';
import { renderSidebar, renderRootView, renderDetailView, createTemplateCard } from './sidebar-renderer.js';
import { renderHoloDeck, removeRoleFromGroup, moveRoleToGroup } from './holo-deck.js';
// ==========================================
// 1. 系统启动
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 系统启动 (V3.0 Two-Level Sidebar)');
    
    initEventListeners();
    await initSystemData(); 
    renderSidebar(); 
    
    await updateUserInfo(); 
    await initModelSelector();
    loadSavedWorkflows();
    checkSystemAnnouncement();

    if (state.templates && state.templates.length > 0) {
        createCustomRoleWindow('custom');
        const defaultWin = document.getElementById('custom-panel');
        if (defaultWin) {
            const stage = document.getElementById('main-stage');
            stage.appendChild(defaultWin);
            defaultWin.style.display = 'flex';
            const empty = stage.querySelector('.empty-state');
            if(empty) empty.style.display = 'none';
        }
    }
    
    if (window.initDragAndDrop) window.initDragAndDrop();
    
    logToConsole('系统核心已就绪', 'success');
});

// ==========================================
// 2. 核心业务函数
// ==========================================

async function initSystemData() {
    try {
        state.allRoles = [];
    } catch(e) { state.allRoles = []; }

    const saved = localStorage.getItem('user_templates');
    if (saved) {
        try {
            state.templates = JSON.parse(saved);
        } catch(e) {
            state.templates = JSON.parse(JSON.stringify(state.defaultTemplates));
        }
    } else {
        state.templates = JSON.parse(JSON.stringify(state.defaultTemplates));
    }
}

async function updateUserInfo() {
    try {
        const response = await fetch('api/user/info')  // 这里定义的是 response
        
        const loginBtn = document.getElementById('login-btn');
        const userPanel = document.getElementById('user-logged-in');

        // ❌ 错误：这里用了 res.ok，但变量名是 response
        // ✅ 修复：改为 response.ok
        if (response.ok) {
            // ❌ 错误：这里用了 res.json()，但变量名是 response
            // ✅ 修复：改为 response.json()
            const data = await response.json();
            
            if(loginBtn) loginBtn.style.display = 'none';
            if(userPanel) userPanel.style.display = 'flex';
            
            const balEl = document.getElementById('user-balance');
            if(balEl) balEl.textContent = data.balance?.toLocaleString() || '0';
            
            const nameEl = document.getElementById('user-name-display');
            if(nameEl) nameEl.textContent = data.email?.split('@')[0] || 'User';
            
            const mailEl = document.getElementById('user-email-display');
            if(mailEl) mailEl.textContent = data.email;
            
            const logoutBtn = document.getElementById('logout-btn');
            if(logoutBtn) {
                logoutBtn.onclick = (e) => {
                    e.preventDefault();
                    if(confirm('确定退出吗？')) {
                        localStorage.removeItem('user_token');
                        // 🚨 注意：这里还是硬编码的 localhost:3001
                        // 上线后需要改为相对路径或你的域名
                        // window.location.href = 'http://localhost:3001/login'; 
                        window.location.href = 'https://zhoutao428.github.io/frontend-static/login.html';
                    }
                };
            }
        } else {
            if(loginBtn) loginBtn.style.display = 'block';
            if(userPanel) userPanel.style.display = 'none';
        }
    } catch (e) {
        console.warn("用户状态加载失败", e);
    }
}
async function initModelSelector() {
    const select = document.getElementById('global-model-select');
    if (!select) return;

    try {
        const models = await systemAPI.getModels();
        select.innerHTML = '';
        
        const cloudGroup = document.createElement('optgroup');
        cloudGroup.label = "☁️ 云端模型 (平台托管)";
        const localGroup = document.createElement('optgroup');
        localGroup.label = "💻 本地/自定义";

        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = `${m.provider}:${m.model_code}`; 
            opt.textContent = `${m.display_name} (💰${m.sale_price})`;
            cloudGroup.appendChild(opt);
        });

        const savedConfig = localStorage.getItem('workflow_api_configs_all');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            if (parsed.models) {
                Object.values(parsed.models).forEach(m => {
                    if (m.type === 'custom' || m.endpoint.includes('localhost')) {
                        const opt = document.createElement('option');
                        opt.value = `custom:${m.model}`; 
                        opt.textContent = `[本地] ${m.displayName || m.model}`;
                        localGroup.appendChild(opt);
                    }
                });
            }
        }

        if (cloudGroup.children.length > 0) select.appendChild(cloudGroup);
        if (localGroup.children.length > 0) select.appendChild(localGroup);
        if (select.options.length > 0) select.selectedIndex = 0;

        updateAllWindowTags(select);

    } catch (e) {
        console.error("加载模型失败:", e);
        select.innerHTML = '<option>加载失败</option>';
    }

    select.addEventListener('change', () => {
        updateAllWindowTags(select);
    });
}

async function checkSystemAnnouncement() {
    try {
        const response = await fetch('api/system/announcement')
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.content) showAnnouncementBar(data.content, data.type);
    } catch (e) {
        console.warn("获取公告失败", e);
    }
}

// ==========================================
// 3. 事件监听器
// ==========================================
function initEventListeners() {
    bindClick('view-mode-btn', toggleViewMode);
    bindClick('btn-config', () => window.location.href = 'config.html');
    bindClick('btn-new-project', createNewProject);
    bindClick('btn-open-local', openLocalProject);
    
    bindClick('console-header', toggleConsole);
    bindClick('btn-clear-console', clearConsole);
    bindClick('btn-close-modal', closeCustomModal);
    bindClick('btn-cancel-modal', closeCustomModal);
    
    const projectSelect = document.getElementById('global-project-select');
    if(projectSelect) projectSelect.addEventListener('change', (e) => handleProjectChange(e.target));

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const miniCard = target.closest('.mini-card');
        
        if (miniCard && 
            state.currentView === 'detail' && 
            !miniCard.classList.contains('back-bar') &&
            !miniCard.classList.contains('root-card')) {
            
            const roleId = miniCard.dataset.target.replace('-panel', '');
            
            if (!document.getElementById(`${roleId}-panel`)) {
                createCustomRoleWindow(roleId);
            }
            const win = document.getElementById(`${roleId}-panel`);
            
            if(win) {
                const stage = document.getElementById('main-stage');
                const pool = document.getElementById('windows-pool');
                const current = stage.querySelector('.window-card');
                if (current) pool.appendChild(current);
                stage.appendChild(win);
                win.style.display = 'flex';
                
                const empty = stage.querySelector('.empty-state');
                if(empty) empty.style.display = 'none';
                
                document.querySelectorAll('.mini-card').forEach(c => c.classList.remove('active'));
                miniCard.classList.add('active');
            }
            return;
        }
        
        const runBtn = target.closest('.btn-run-agent');
        if (runBtn) { runAgent(runBtn.dataset.role); return; }
        
        if (target.closest('#features-btn') || target.closest('#features-menu')) return;
    });

    const featuresBtn = document.getElementById('features-btn');
    const featuresMenu = document.getElementById('features-menu');
    if (featuresBtn && featuresMenu) {
        featuresBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            featuresMenu.style.display = featuresMenu.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!featuresBtn.contains(e.target) && !featuresMenu.contains(e.target)) {
                featuresMenu.style.display = 'none';
            }
        });
    }
}

// ==========================================
// 4. 辅助函数
// ==========================================
async function createNewProject() {
    showInputModal("新建项目", "请输入...", async (name) => {
        try { await post('/api/projects', { name }); loadProjects(); } catch(e){}
    });
}

async function openLocalProject() {
    try {
        const res = await get('/api/system/pick-folder');
        if (res.success) startScan(res.path);
        else showInputModal("手动路径", "D:/Code", (p)=>startScan(p));
    } catch(e) { showInputModal("手动路径", "D:/Code", (p)=>startScan(p)); }
}

async function startScan(path) {
    try {
        const d = await post('/api/local/scan', {path});
        if(d.success) logToConsole(`扫描 ${d.files_count} 文件`, 'success');
    } catch(e){}
}

function loadProjects() {
    get('/api/projects').then(projects => {
        console.log('项目数据:', projects); // ← 添加这行
        const sel = document.getElementById('global-project-select');
        if(sel && Array.isArray(projects)) {
            sel.innerHTML = '<option value="">默认项目</option>';
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.text = p.name;
                sel.appendChild(opt);
            });
        } else {
            console.warn('项目数据格式错误或为空:', projects); // ← 添加这行
        }
    }).catch(e => {
        console.error('加载项目失败:', e); // ← 添加这行
        logToConsole('加载项目列表失败', 'error');
    });
}
function handleProjectChange(selectElement) {
    logToConsole(`切换到项目 ID: ${selectElement.value}`, 'success');
}
// 在 main.js 中添加事件监听
window.addEventListener('sidebar-refresh', () => {
    if (window.renderSidebar) window.renderSidebar();
});
// ==========================================
// 5. 暴露全局
// ==========================================
window.createCustomRoleWindow = createCustomRoleWindow;
window.showDefaultCustomWindow = showDefaultCustomWindow;
window.cleanupWorkflowWindows = cleanupWorkflowWindows;
window.loadWorkflowToStage = loadWorkflowToStage;
window.removeRoleFromGroup = removeRoleFromGroup;
window.renderHoloDeck = renderHoloDeck;
window.moveRoleToGroup = moveRoleToGroup;
