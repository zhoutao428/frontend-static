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
async function loadRoles(token) {
    // 如果没有传入 token，尝试获取一次
    if (!token) {
        const { data } = await window.supabase.auth.getSession();
        token = data.session?.access_token;
    }

    if (!token) {
        console.warn('⚠️ 未登录，无法加载角色');
        document.getElementById('role-grid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <p>请先登录查看角色仓库</p>
                <button onclick="window.location.href='login.html'" style="margin-top: 10px; padding: 6px 12px; background: #4f46e5; border:none; border-radius:4px; color:white; cursor:pointer;">去登录</button>
            </div>
        `;
        return;
    }

    console.log('📡 开始请求角色列表...');
    const grid = document.getElementById('role-grid');
    // 只有第一次加载时才显示 loading，刷新时不显示
    if (allRoles.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>正在从云端拉取角色...</p>
            </div>
        `;
    }

    try {
        const res = await fetch(`${API_BASE}/api/roles`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`加载失败: ${res.status}`);

        const responseData = await res.json();
        
        // ✅ 数据格式兼容处理：可能是 [..] 也可能是 { data: [..] }
        let rolesData = [];
        if (Array.isArray(responseData)) {
            rolesData = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
            rolesData = responseData.data;
        } else {
            console.warn("数据格式异常:", responseData);
            rolesData = [];
        }

        allRoles = rolesData;
        filteredRoles = [...allRoles];

        console.log(`📦 成功加载 ${allRoles.length} 个角色`);
        
        document.getElementById('role-count').textContent = allRoles.length;
        document.getElementById('total-count').textContent = `共 ${allRoles.length} 个角色`;
        renderRoles();

    } catch (error) {
        console.error('❌ 加载角色失败:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载失败，请检查网络</p>
                <button id="retry-btn" style="margin-top: 16px; padding: 8px 16px; background: #6366f1; border: none; border-radius: 6px; color: white; cursor: pointer;">
                    重试
                </button>
            </div>
        `;
        document.getElementById('retry-btn').onclick = () => loadRoles(token);
    }
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
        const isSystem = role.role_type === 'system' || role.type === 'system';
        const isDeletable = role.is_deletable === true || role.role_type === 'user'; // 系统角色通常不可删

        const badgeHtml = isSystem
            ? `<span class="role-badge prebuild" style="background:#4f46e5; padding:2px 6px; border-radius:4px; font-size:10px;"><i class="fas fa-star"></i> 官方</span>`
            : `<span class="role-badge user" style="background:#10b981; padding:2px 6px; border-radius:4px; font-size:10px;"><i class="fas fa-user"></i> 自制</span>`;

        const deleteBtn = !isSystem 
            ? `<button class="btn-icon danger" onclick="deleteRole(${role.id}, event)" title="删除" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>`
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
    if (!confirm('确定删除这个角色吗？此操作不可恢复。')) return;

    try {
        const { data } = await window.supabase.auth.getSession();
        const token = data.session?.access_token;

        const res = await fetch(`${API_BASE}/api/roles/${roleId}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || '删除失败');
        }

        // 前端移除
        allRoles = allRoles.filter(r => r.id !== roleId);
        filteredRoles = filteredRoles.filter(r => r.id !== roleId);
        
        document.getElementById('role-count').textContent = allRoles.length;
        document.getElementById('total-count').textContent = `共 ${filteredRoles.length} 个角色`;
        renderRoles();
        
        showToast('✅ 角色已删除');

    } catch (error) {
        alert(error.message);
    }
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
