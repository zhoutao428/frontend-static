// role-parts-library.js
// 角色部件库管理

const RolePartsLibrary = {
    // 系统预设角色
    systemParts: [
        {
            id: 'director',
            name: '导演',
            description: '负责统筹拍摄现场，指导演员表演，把控整体创作方向',
            icon: 'fa-clapperboard',
            bg_class: 'role-system',
            expertise: ['场面调度', '剧本分析', '演员指导', '镜头语言', '团队管理'],
            prompt_template: '你是一位经验丰富的电影导演，擅长...',
            actions: ['🎬 执导', '📝 修改剧本', '🎭 指导表演'],
            capabilities: { core: ['导演能力1', '导演能力2'] },
            role_type: 'system',
            is_deletable: false
        },
        {
            id: 'writer',
            name: '编剧',
            description: '擅长故事创作、剧本撰写和情节设计',
            icon: 'fa-feather',
            bg_class: 'role-system',
            expertise: ['故事架构', '对话撰写', '情节设计', '人物塑造', '节奏把控'],
            prompt_template: '你是一位富有创意的编剧，擅长...',
            actions: ['✍️ 创作', '📖 写对白', '🔄 修改情节'],
            capabilities: { core: ['编剧能力1', '编剧能力2'] },
            role_type: 'system',
            is_deletable: false
        },
        {
            id: 'actor',
            name: '演员',
            description: '专业表演者，能够诠释各种角色和情感',
            icon: 'fa-mask',
            bg_class: 'role-system',
            expertise: ['情感表达', '肢体语言', '台词功底', '角色分析', '即兴表演'],
            prompt_template: '你是一位专业的演员，能够...',
            actions: ['🎭 表演', '🎪 即兴', '📋 分析角色'],
            capabilities: { core: ['演员能力1', '演员能力2'] },
            role_type: 'system',
            is_deletable: false
        },
        {
            id: 'critic',
            name: '影评人',
            description: '深入分析电影作品，提供专业见解和评价',
            icon: 'fa-star',
            bg_class: 'role-system',
            expertise: ['电影分析', '文化解读', '技术评估', '历史对比', '趋势预测'],
            prompt_template: '你是一位专业的影评人，擅长...',
            actions: ['⭐ 点评', '📊 分析', '🔍 深度解读'],
            capabilities: { core: ['影评人能力1', '影评人能力2'] },
            role_type: 'system',
            is_deletable: false
        }
    ],

    // 用户自定义角色（存储在 localStorage）
    userParts: {
        key: 'user_templates',
        init: function() {
            const container = document.getElementById('user-parts-container');
            if (!container) return;
            container.innerHTML = '';
            this.getAll().forEach(part => {
                const card = RolePartsLibrary.createPartCard(part);
                container.appendChild(card);
            });
        },

        create: function(name = '新角色', desc = '待定义', icon = 'fa-user-plus') {
            const newPart = {
                id: `local_${Date.now()}`,
                name: name,
                desc: desc,
                description: desc,
                icon: icon,
                tags: ['自定义'],
                expertise: ['自定义'],
                category: 'custom',
                is_local: true,
                is_deletable: true,
                created_at: new Date().toISOString()
            };
            const parts = this.getAll();
            parts.unshift(newPart);
            localStorage.setItem(this.key, JSON.stringify(parts));
            return newPart.id;
        },

        delete: function(partId) {
            let parts = this.getAll();
            const initialLength = parts.length;
            parts = parts.filter(p => p.id !== partId);
            if (parts.length < initialLength) {
                localStorage.setItem(this.key, JSON.stringify(parts));
                console.log(`本地角色 [${partId}] 已删除。`);
                return true;
            }
            return false;
        },

        // 添加 update 函数，用于更新本地角色
        update: function(partId, updatedData) {
            let parts = this.getAll();
            const partIndex = parts.findIndex(p => p.id === partId);

            if (partIndex !== -1) {
                // 确保 ID 和关键的本地标识被保留
                const originalPart = parts[partIndex];
                updatedData.id = partId; // 强制使用原始 ID
                updatedData.is_local = true; // 保持本地标记
                updatedData.category = 'custom'; // 保持分类
                
                // 合并数据，新数据覆盖旧数据
                parts[partIndex] = { ...originalPart, ...updatedData };
                
                localStorage.setItem(this.key, JSON.stringify(parts));
                console.log(`✅ 本地角色 [${partId}] 已更新。`);
                return true;
            } else {
                console.warn(`⚠️ 尝试更新一个不存在的本地角色: ${partId}`);
                return false;
            }
        },

        getAll: function() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '[]');
            } catch (e) {
                console.error("无法解析本地角色数据:", e);
                return [];
            }
        },

        find: function(partId) {
            return this.getAll().find(p => p.id === partId);
        }
    },

    // 创建角色卡片DOM元素
    createPartCard: function(part) {
        const card = document.createElement('div');
        card.className = `part-card ${part.bg_class || 'role-custom'}`;
        card.setAttribute('data-id', part.id);
        card.setAttribute('data-type', 'role');
        card.setAttribute('draggable', 'true');
        
        // 添加拖拽事件
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        // 双击编辑（仅自定义角色可编辑）
        if (part.is_deletable) {
            card.addEventListener('dblclick', () => {
                if (typeof window.openRoleEditor === 'function') {
                    window.openRoleEditor(part);
                }
            });
        }
        
        // 构建卡片内容
        const expertiseHtml = (part.expertise || part.tags || []).slice(0, 3).map(tag => 
            `<span class="expertise-tag">${tag}</span>`
        ).join('');
        
        card.innerHTML = `
            <div class="part-header">
                <i class="fas ${part.icon || 'fa-user'}"></i>
                <span class="part-name">${part.name}</span>
                ${part.is_deletable ? '<i class="fas fa-times delete-btn" title="删除"></i>' : ''}
            </div>
            <div class="part-desc">${part.description || part.desc || ''}</div>
            <div class="part-expertise">${expertiseHtml}</div>
            ${part.actions ? `
                <div class="part-actions">
                    ${part.actions.map(action => `<button class="action-btn">${action}</button>`).join('')}
                </div>
            ` : ''}
        `;
        
        // 添加删除按钮事件
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除角色 [${part.name}] 吗？`)) {
                    if (RolePartsLibrary.userParts.delete(part.id)) {
                        card.remove();
                        // 如果删除后容器为空，可以显示一个提示
                        const container = document.getElementById('user-parts-container');
                        if (container && container.children.length === 0) {
                            container.innerHTML = '<div class="empty-parts">暂无自定义角色，拖入或双击创建</div>';
                        }
                    }
                }
            });
        }
        
        return card;
    },

    // 初始化整个角色库
    init: function() {
        // 渲染系统角色
        const systemContainer = document.getElementById('system-parts-container');
        if (systemContainer) {
            systemContainer.innerHTML = '';
            this.systemParts.forEach(part => {
                const card = this.createPartCard(part);
                systemContainer.appendChild(card);
            });
        }
        
        // 初始化用户角色
        this.userParts.init();
        
        // 添加双击创建功能
        const userContainer = document.getElementById('user-parts-container');
        if (userContainer) {
            userContainer.addEventListener('dblclick', (e) => {
                // 防止双击卡片时触发（卡片有自己的双击编辑）
                if (e.target === userContainer || e.target.classList.contains('empty-parts')) {
                    const newId = this.userParts.create();
                    const newPart = this.userParts.find(newId);
                    if (newPart && typeof window.openRoleEditor === 'function') {
                        window.openRoleEditor(newPart);
                    }
                    this.userParts.init(); // 刷新显示
                }
            });
        }
    },

    // 获取角色详情（增强版，用于炼丹）
    getRoleDetailsEnhanced: function(roleId) {
        // 先在系统角色中查找
        let role = this.systemParts.find(r => r.id === roleId);
        if (role) return { ...role };
        
        // 再在用户角色中查找
        role = this.userParts.find(roleId);
        if (role) return { ...role };
        
        return null;
    },

    // 加载用户角色（从localStorage重新加载）
    loadUserRoles: function() {
        this.userParts.init();
    }
};

// 导出到全局
window.RolePartsLibrary = RolePartsLibrary;

// 初始化拖拽相关函数（如果不存在）
if (typeof window.handleDragStart !== 'function') {
    window.handleDragStart = function(e) {
        const card = e.target.closest('.part-card');
        if (!card) return;
        
        const partId = card.dataset.id;
        const partType = card.dataset.type || 'role';
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            id: partId,
            type: partType,
            name: card.querySelector('.part-name')?.innerText || '未知'
        }));
        
        card.classList.add('dragging');
        
        // 如果有炼丹炉状态，可以在这里设置
        if (window.dragState) {
            window.dragState.isDragging = true;
            window.dragState.dragType = partType;
        }
    };
}

if (typeof window.handleDragEnd !== 'function') {
    window.handleDragEnd = function(e) {
        const card = e.target.closest('.part-card');
        if (card) {
            card.classList.remove('dragging');
        }
        
        if (window.dragState) {
            window.dragState.isDragging = false;
            window.dragState.dragType = null;
        }
    };
}

// DOM加载完成后自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (window.RolePartsLibrary) {
        window.RolePartsLibrary.init();
    }
});
