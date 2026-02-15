// js/modules/role-parts-library.js

// js/role-parts-library.js

const RolePartsLibrary = {
    systemParts: [],
    // ✨ 新增：临时角色列表 (只在内存里，不存硬盘)
    tempParts: [], 

    init: async function(supabase) {
        console.log("📚 RolePartsLibrary 初始化...");
        if (supabase) {
            const { data, error } = await supabase.from('roles').select('*').eq('role_type', 'system');
            if (!error) this.systemParts = data || [];
        }
        
        // 清空临时区
        this.tempParts = [];
        
        // 渲染
        if (window.renderPartsGrid) window.renderPartsGrid();
    },

    // ✨ 核心修改：获取所有角色时，把临时的也带上
    getAllParts: function() {
        // 1. 临时角色 (新生成的)
        // 2. 本地仓库角色 (已保存的)
        // 3. 系统角色 (云端的)
        const locals = this.userParts.getAll();
        return [...this.tempParts, ...locals, ...this.systemParts];
    },

    getRoleDetailsEnhanced: function(partId) {
        return this.getAllParts().find(p => p.id == partId);
    },

    // ✨ 新增：临时角色管理器 (解决双胞胎问题)
    tempManager: {
        // 添加或更新临时角色
        upsert: function(role) {
            role.is_temp = true; // 标记为临时
            
            // 检查是否已存在，存在则更新，不存在则添加
            const idx = RolePartsLibrary.tempParts.findIndex(p => p.id === role.id);
            if (idx !== -1) {
                RolePartsLibrary.tempParts[idx] = role;
            } else {
                RolePartsLibrary.tempParts.unshift(role);
            }
            
            // 刷新 UI
            if (window.renderPartsGrid) window.renderPartsGrid();
        },
        
        // 移除临时角色 (比如保存后)
        remove: function(roleId) {
            RolePartsLibrary.tempParts = RolePartsLibrary.tempParts.filter(p => p.id !== roleId);
            if (window.renderPartsGrid) window.renderPartsGrid();
        }
    },

    userParts: {
        key: 'user_templates',

        create: function(roleData) {
            // 💡 真正的入库操作
            const newRole = { ...roleData };
            delete newRole.is_temp; // 去掉临时标记
            newRole.is_local = true;

            const parts = this.getAll();
            // 防止重复
            if (!parts.find(p => p.id === newRole.id)) {
                parts.unshift(newRole);
                localStorage.setItem(this.key, JSON.stringify(parts));
                return true;
            }
            return false;
        },

        delete: function(partId) {
            let parts = this.getAll();
            parts = parts.filter(p => p.id !== partId);
            localStorage.setItem(this.key, JSON.stringify(parts));
            return true;
        },

        getAll: function() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '[]');
            } catch (e) { return []; }
        },
        
        find: function(partId) {
            return this.getAll().find(p => p.id === partId);
        }
    }
};

// ⚠️ 关键：手动挂载到全局，因为没有 export
window.RolePartsLibrary = RolePartsLibrary;
