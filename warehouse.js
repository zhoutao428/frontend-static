// warehouse.js - 仓库页面逻辑

// ============ 配置 ============
const API_BASE = 'https://public-virid-chi.vercel.app';

// ============ 状态 ============
let currentTab = 'roles'; // roles / workflows
let allRoles = [];
let filteredRoles = [];
let searchTerm = '';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('仓库页面初始化');
    
    // 绑定事件
    bindEvents();
    
    // 加载数据
    await loadRoles();
});

// ============ 事件绑定 ============
function bindEvents() {
    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // 搜索框
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            filterRoles();
        });
    }
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadRoles();
        });
    }
}

// ============ 标签页切换 ============
function switchTab(tabName) {
    if (tabName === currentTab) return;
    
    // 更新UI
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    currentTab = tabName;
    
    // 更新标题和搜索占位符
    const searchInput = document.getElementById('search-input');
    const totalCount = document.getElementById('total-count');
    // 从 window.supabase 获取最新的 token
    const { data: { session } } = await window.supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${API_BASE}/api/roles`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
});
    if (tabName === 'roles') {
        searchInput.placeholder = '搜索角色、技能或标签...';
        totalCount.textContent = `共 ${filteredRoles.length} 个角色`;
        renderRoles();
    } else {
        searchInput.placeholder = '搜索工作流、阶段或角色数...';
        totalCount.textContent = '共 0 个工作流';
        // TODO: 加载工作流
        document.getElementById('role-grid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-diagram-project"></i>
                <p>工作流仓库开发中...</p>
            </div>
        `;
    }
}

// ============ 加载角色 ============
async function loadRoles() {
    const grid = document.getElementById('role-grid');
    grid.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner"></i>
            <p>加载角色中...</p>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('user_token');
        const res = await fetch(`${API_BASE}/api/roles`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error('加载失败');
        
        allRoles = await res.json();
        filteredRoles = [...allRoles];
        
        // 更新计数
        document.getElementById('role-count').textContent = allRoles.length;
        document.getElementById('total-count').textContent = `共 ${allRoles.length} 个角色`;
        
        renderRoles();
        
    } catch (error) {
        console.error('加载角色失败:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载失败，请稍后重试</p>
                <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #6366f1; border: none; border-radius: 6px; color: white; cursor: pointer;">
                    刷新页面
                </button>
            </div>
        `;
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
                ${!searchTerm ? '<p style="font-size: 12px; margin-top: 8px;">去工厂炼制角色，会自动存入仓库</p>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredRoles.map(role => {
        // 判断角色类型
        const isSystem = role.role_type === 'system' || role.type === 'system';
        const isDeletable = role.is_deletable === true || role.role_type === 'user';
        
        // 角标
        const badgeHtml = isSystem 
            ? `<span class="role-badge prebuild"><i class="fas fa-star"></i> 预制</span>`
            : `<span class="role-badge user"><i class="fas fa-thumbtack"></i> 我的</span>`;
        
        // 删除按钮（仅我的角色）
        const deleteBtn = !isSystem && isDeletable
            ? `<i class="fas fa-trash-alt btn-delete" onclick="deleteRole(${role.id}, event)"></i>`
            : '';
        
        // 技能标签
        const expertise = Array.isArray(role.expertise) ? role.expertise : [];
        const tagsHtml = expertise.slice(0, 3).map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
        
        // 图标和颜色
        const icon = role.icon || 'fa-user';
        const bgClass = role.bg_class || 'role-dev';
        
        return `
            <div class="part-card" data-role-id="${role.id}">
                <div class="part-header">
                    <div class="part-icon ${bgClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="part-name">${role.name || '未命名'}</div>
                    <div class="api-status" style="display: none;"></div>
                </div>
                <div class="part-tags">
                    ${tagsHtml}
                    ${expertise.length > 3 ? `<span class="tag">+${expertise.length - 3}</span>` : ''}
                </div>
                <div class="part-actions-warehouse">
                    <div>
                        ${badgeHtml}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn-take" onclick="takeRole(${role.id}, '${role.name}', event)">
                            <i class="fas fa-briefcase"></i> 取用
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
    event.stopPropagation();
    
    // 获取完整角色信息
    const role = allRoles.find(r => r.id === roleId);
    if (!role) return;
    
    // 存入 sessionStorage
    let tempRoles = JSON.parse(sessionStorage.getItem('workspace_temp_roles') || '[]');
    
    // 去重
    if (!tempRoles.some(r => r.id === roleId)) {
        tempRoles.push({
            id: roleId,
            name: role.name,
            description: role.description,
            icon: role.icon || 'fa-user',
            bgClass: role.bg_class || 'role-dev',
            originalId: role.id
        });
        
        sessionStorage.setItem('workspace_temp_roles', JSON.stringify(tempRoles));
    }
    
    // 提示
    showToast(`✅ ${roleName} 已放入工作台`);
};

// ============ 删除角色 ============
window.deleteRole = async function(roleId, event) {
    event.stopPropagation();
    
    if (!confirm('确定删除这个角色吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('user_token');
        const res = await fetch(`${API_BASE}/api/roles/${roleId}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || '删除失败');
        }
        
        // 从列表中移除
        allRoles = allRoles.filter(r => r.id !== roleId);
        filteredRoles = filteredRoles.filter(r => r.id !== roleId);
        
        // 更新计数
        document.getElementById('role-count').textContent = allRoles.length;
        document.getElementById('total-count').textContent = `共 ${filteredRoles.length} 个角色`;
        
        // 重新渲染
        renderRoles();
        
        showToast('✅ 角色已删除');
        
    } catch (error) {
        alert(error.message);
    }
};

// ============ 提示 Toast ============
function showToast(message) {
    // 检查是否已存在toast容器
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
    
    // 3秒后消失
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// 暴露到全局
window.switchTab = switchTab;
