// warehouse.js - 仓库页面逻辑（最终修复版）

// ============ 配置 ============
const API_BASE = 'https://public-virid-chi.vercel.app';

// ============ 状态 ============
let currentTab = 'roles';
let allRoles = [];
let filteredRoles = [];
let searchTerm = '';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 仓库页面初始化...');
    bindEvents();

    // 1. 尝试直接获取 Session (如果页面加载快，Session 可能已经有了)
    const { data } = await window.supabase.auth.getSession();
    if (data.session) {
        console.log('✅ 初始 Session 有效，立即加载');
        loadRoles(data.session.access_token);
    } else {
        console.log('⏳ 等待 Session 恢复...');
    }

    // 2. 核心：监听认证状态变化 (兜底逻辑)
    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log(`🔔 认证状态变更: ${event}`);
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            // 只有当数组为空时才重新加载，防止重复刷新
            if (allRoles.length === 0) {
                console.log('✅ 捕获到有效 Session，开始加载数据');
                loadRoles(session.access_token);
            }
        }
    });
});

// ============ 事件绑定 ============
function bindEvents() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            filterRoles();
        });
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const { data } = await window.supabase.auth.getSession();
            if (data.session) loadRoles(data.session.access_token);
        });
    }
}

// ============ 标签页切换 ============
function switchTab(tabName) {
    if (tabName === currentTab) return;

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    currentTab = tabName;
    const searchInput = document.getElementById('search-input');
    const totalCount = document.getElementById('total-count');

    if (tabName === 'roles') {
        searchInput.placeholder = '搜索角色、技能或标签...';
        totalCount.textContent = `共 ${filteredRoles.length} 个角色`;
        renderRoles();
    } else {
        searchInput.placeholder = '搜索工作流、阶段或角色数...';
        totalCount.textContent = '共 0 个工作流';
        document.getElementById('role-grid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-diagram-project"></i>
                <p>工作流仓库开发中...</p>
            </div>
        `;
    }
}

// ============ 加载角色 (核心函数) ============
// warehouse.js

async function loadRoles(token) {
    console.log('📡 开始加载角色...');
    
    // 1. 加载云端 (只加载系统预设角色)
    let cloudRoles = [];
    try {
        // 如果没登录，可能只允许拉取 public 角色，或者 token 为空
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/api/roles`, { headers });
        
        if (res.ok) {
            const data = await res.json();
            // 兼容 {data:[]} 和 [] 格式
            cloudRoles = (Array.isArray(data) ? data : data.data) || [];
            
            // 标记云端角色 (防止 ID 冲突)
            cloudRoles = cloudRoles.map(r => ({
    ...r,
    is_cloud: true,
    // 只有 role_type 明确为 'system' 的才是不可删的预制角色
    // 如果是 'user' 类型（即便是云端的），也应该是可删的（只要你是拥有者）
    is_deletable: r.role_type !== 'system' 
}));
        }
    } catch (e) {
        console.warn("云端角色加载失败:", e);
    }

    // 2. 加载本地 (用户炼制的角色)
    let localRoles = [];
    try {
        localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
        // 确保本地角色有正确标记
        localRoles = localRoles.map(r => ({
            ...r,
            is_cloud: false,
            is_deletable: true // 本地角色随便删
        }));
    } catch (e) {
        console.warn("本地数据解析失败:", e);
    }

    // 3. 合并 (本地在前，云端在后)
    allRoles = [...localRoles, ...cloudRoles];
    filteredRoles = [...allRoles];

    console.log(`📦 加载完成: 本地 ${localRoles.length} + 云端 ${cloudRoles.length}`);
    
    // 更新 UI
    document.getElementById('role-count').textContent = allRoles.length;
    document.getElementById('total-count').textContent = `共 ${allRoles.length} 个角色`;
    renderRoles();
}

// ============ 过滤角色 ============
function filterRoles() {
    if (!searchTerm) {
        filteredRoles = [...allRoles];
    } else {
        filteredRoles = allRoles.filter(role => {
            const name = (role.name || '').toLowerCase();
            const desc = (role.description || '').toLowerCase();
            const tags = (role.expertise || []).join(' ').toLowerCase();
            return name.includes(searchTerm) || desc.includes(searchTerm) || tags.includes(searchTerm);
        });
    }
    document.getElementById('total-count').textContent = `共 ${filteredRoles.length} 个角色`;
    renderRoles();
}

// ============ 渲染角色 ============
function renderRoles() {
    const grid = document.getElementById('role-grid');

    if (filteredRoles.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>${searchTerm ? '没有匹配的角色' : '仓库暂无角色'}</p>
                ${!searchTerm ? '<p style="font-size: 12px; margin-top: 8px; color:#6b7280;">去工厂炼制角色，会自动存入仓库</p>' : ''}
            </div>
        `;
        return;
    }

     grid.innerHTML = filteredRoles.map(role => {
        // 1. 严格判定系统角色 (只有 role_type 是 system 才是官方的)
        // 兼容旧数据：如果 role.type 是 system 且它是云端角色 (is_cloud)，也算官方
        const isSystem = role.role_type === 'system' || (role.is_cloud && role.type === 'system');

        // 2. 判定是否显示删除按钮
        // 只要不是系统角色，或者明确标记为可删除 (is_deletable)，就可以删
        // 注意：本地角色 (is_local) 永远可删
        const canDelete = !isSystem || role.is_local;

        const badgeHtml = isSystem
            ? `<span class="role-badge prebuild" style="background:#4f46e5; padding:2px 6px; border-radius:4px; font-size:10px;"><i class="fas fa-star"></i> 官方</span>`
            : `<span class="role-badge user" style="background:#10b981; padding:2px 6px; border-radius:4px; font-size:10px;"><i class="fas fa-user"></i> 自制</span>`;

        const deleteBtn = canDelete
            ? `<button class="btn-icon danger" onclick="deleteRole('${role.id}', event)" title="删除" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>`
            : '';

        const expertise = Array.isArray(role.expertise) ? role.expertise : [];
        const tagsHtml = expertise.slice(0, 3).map(tag =>
            `<span class="tag">${tag}</span>`
        ).join('');

        const icon = role.icon || 'fa-user';
        const bgClass = role.bg_class || 'role-dev'; // 确保 CSS 里有对应的颜色类

        return `
            <div class="part-card" data-role-id="${role.id}" onclick="showRoleDetail(${role.id})">
                <div class="part-header">
                    <div class="part-icon ${bgClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="part-info" style="flex:1; margin-left:10px;">
                        <div class="part-name" style="font-weight:bold;">${role.name || '未命名'}</div>
                        <div class="part-desc" style="font-size:12px; color:#9ca3af; margin-top:2px;">${role.description ? role.description.substring(0, 20) + '...' : '暂无描述'}</div>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
                
                <div class="part-tags" style="margin-top:10px; display:flex; gap:4px; flex-wrap:wrap;">
                    ${tagsHtml}
                    ${expertise.length > 3 ? `<span class="tag">+${expertise.length - 3}</span>` : ''}
                </div>

                <div class="part-footer" style="margin-top:15px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                    <span style="font-size:11px; color:#6b7280;">ID: ${role.id}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-take" onclick="takeRole(${role.id}, '${role.name}', event)" style="padding:4px 10px; background:#4f46e5; border:none; border-radius:4px; color:white; cursor:pointer;">
                            <i class="fas fa-plus"></i> 放入工作台
                        </button>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============ 取用角色 ============
window.takeRole = function(roleId, roleName, event) {
    event && event.stopPropagation();
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return;

    // 存入 sessionStorage (供主页读取)
    let tempRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
    
    // 检查是否已存在
    if (!tempRoles.some(r => r.id === roleId)) {
        tempRoles.push({
            id: roleId,
            name: role.name,
            description: role.description,
            icon: role.icon || 'fa-user',
            bgClass: role.bg_class || 'role-dev',
            expertise: role.expertise,
            originalId: role.id
        });
        localStorage.setItem('user_templates', JSON.stringify(tempRoles));
        showToast(`✅ ${roleName} 已添加到您的工作台`);
    } else {
        showToast(`⚠️ ${roleName} 已经在工作台了`);
    }
};

// ============ 删除角色 ============

window.deleteRole = async function(roleId, event) {
    event && event.stopPropagation();
    if (!confirm('确定删除这个角色吗？')) return;

    // 1. 找到这个角色
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return;

    if (role.is_cloud) {
        // A. 如果是云端角色 -> 提示不可删 (或者你需要管理员权限才能删)
        alert("🚫 系统预设角色无法删除！");
        return;
    } else {
        // B. 如果是本地角色 -> 删 LocalStorage
        let localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
        localRoles = localRoles.filter(r => r.id !== roleId);
        localStorage.setItem('user_templates', JSON.stringify(localRoles));
        
        showToast('🗑️ 本地角色已删除');
    }

    // 2. 刷新页面显示
    allRoles = allRoles.filter(r => r.id !== roleId);
    filteredRoles = filteredRoles.filter(r => r.id !== roleId);
    
    document.getElementById('role-count').textContent = allRoles.length;
    renderRoles();
};


// ============ 显示详情 (可选) ============
window.showRoleDetail = function(roleId) {
    const role = allRoles.find(r => r.id === roleId);
    if(role) {
        console.log("查看角色详情:", role);
        // 这里可以弹窗显示详情，暂时只 log
    }
}

// ============ 提示 Toast ============
function showToast(message) {
    let toast = document.querySelector('.warehouse-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'warehouse-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(99, 102, 241, 0.5);
            border-radius: 8px;
            padding: 12px 24px;
            color: white;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // 清除旧定时器
    if (toast.timer) clearTimeout(toast.timer);
    
    toast.timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// ============ 暴露到全局 ============
window.switchTab = switchTab;
