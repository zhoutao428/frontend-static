// 文件名: role-parts-library.js (最终完整版)

export const RolePartsLibrary = {
    systemParts: [],
    userPartsData: [], // 更改：这是一个更清晰的命名

    init: async function(supabase) {
        console.log("📚 RolePartsLibrary 初始化...");
        const { data: systemData, error: systemError } = await supabase.from('roles').select('*').eq('role_type', 'system');
        if (systemError) console.error("加载系统角色失败:", systemError);
        else this.systemParts = systemData;

        this.userParts.init(); // 初始化用户本地角色
        this.renderAll();
    },

    renderAll: function() {
        if (window.renderPartsGrid) {
            window.renderPartsGrid();
        } else {
            console.warn("renderPartsGrid 函数未在全局范围内找到。");
        }
    },

    createPartCard: function(part) {
        // ... (此函数来自您的原始文件，保持不变) ...
        // 假设该函数在 ui.js 或其他地方定义，这里只是一个占位符
        if (window.createRoleCard) {
            return window.createRoleCard(part);
        }
        const card = document.createElement('div');
        card.textContent = part.name;
        return card;
    },
    
    // 这是一个关键的、获取最完整角色信息的方法
    getRoleDetailsEnhanced: function(partId) {
        return this.getAllParts().find(p => p.id == partId);
    },

    getAllParts: function() {
        return [...this.systemParts, ...this.userParts.getAll()];
    },

    // ----------------------------------------------------
    //  用户自定义角色模块 (核心修改区域)
    // ----------------------------------------------------
    userParts: {
        key: 'user_templates',

        init: function() {
            RolePartsLibrary.userPartsData = this.getAll();
            console.log(`👤 加载了 ${RolePartsLibrary.userPartsData.length} 个本地用户角色。`);
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
            RolePartsLibrary.userPartsData = parts; // 更新内存中的数据
            return newPart.id; // 返回新创建的ID，这是“炼丹”流程的关键
        },

        delete: function(partId) {
            let parts = this.getAll();
            const initialLength = parts.length;
            parts = parts.filter(p => p.id !== partId);
            if (parts.length < initialLength) {
                localStorage.setItem(this.key, JSON.stringify(parts));
                RolePartsLibrary.userPartsData = parts; // 更新内存中的数据
                console.log(`本地角色 [${partId}] 已删除。`);
                return true;
            }
            return false;
        },

        /**
         * 💡【最终版核心函数】更新一个现有的本地角色
         * 这就是我们“装备升级”的逻辑实现
         * @param {string} partId - 要更新的角色的ID (那个“老装备”的ID)
         * @param {object} updatedData - 包含新属性的对象 (“升级后的属性”)
         */
        update: function(partId, updatedData) {
            let parts = this.getAll();
            const partIndex = parts.findIndex(p => p.id === partId);

            if (partIndex !== -1) {
                const originalPart = parts[partIndex];
                
                // 使用新数据覆盖旧数据，同时保留不可变的原始ID和分类
                const finalPart = { 
                    ...originalPart, 
                    ...updatedData, 
                    id: partId, // 强制确保ID不变
                    is_local: true,
                    category: 'custom'
                };
                
                parts[partIndex] = finalPart;
                
                localStorage.setItem(this.key, JSON.stringify(parts));
                RolePartsLibrary.userPartsData = parts; // 更新内存中的数据
                console.log(`✅ 本地角色 [${partId}] 已成功“升级”。`);
                return true;
            } else {
                console.warn(`⚠️ 尝试“升级”一个不存在的本地角色: ${partId}`);
                return false;
            }
        },

        getAll: function() {
            try {
                // 总是从 localStorage 读取最新数据，确保同步
                return JSON.parse(localStorage.getItem(this.key) || '[]');
            } catch (e) {
                console.error("无法解析本地角色数据:", e);
                return [];
            }
        },

        find: function(partId) {
            return this.getAll().find(p => p.id === partId);
        }
    }
};
