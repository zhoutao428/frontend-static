// js/modules/role-parts-library.js

export const RolePartsLibrary = {
    systemParts: [],
    // ✨ 新增：临时角色列表 (只存在于内存中，刷新页面就没了)
    tempParts: [], 

    init: async function(supabase) {
        console.log("📚 RolePartsLibrary 初始化...");
        // 1. 加载系统角色 (云端)
        const { data: systemData, error: systemError } = await supabase
            .from('roles')
            .select('*')
            .eq('role_type', 'system');
            
        if (systemError) console.error("加载系统角色失败:", systemError);
        else this.systemParts = systemData || [];

        // 2. 加载本地仓库角色
        this.userParts.init(); 
        
        // 3. 清空临时列表 (防止上次残留)
        this.tempParts = [];

        this.renderAll();
    },

    renderAll: function() {
        if (window.renderPartsGrid) window.renderPartsGrid();
    },

    // 获取完整数据 (包括临时角色)
    getRoleDetailsEnhanced: function(partId) {
        return this.getAllParts().find(p => p.id == partId);
    },

    // ✨ 核心修改：把临时角色也合并进来返回给 UI
    getAllParts: function() {
        return [
            ...this.tempParts,          // 最先显示临时的
            ...this.userParts.getAll(), // 然后是本地仓库的
            ...this.systemParts         // 最后是系统的
        ];
    },
    
    // ✨ 新增：专门管理临时角色的方法
    tempManager: {
        add: function(role) {
            // 确保标记为临时
            role.is_temp = true;
            // 如果已存在同ID的，替换之 (防止双胞胎)
            const idx = RolePartsLibrary.tempParts.findIndex(p => p.id === role.id);
            if (idx !== -1) {
                RolePartsLibrary.tempParts[idx] = role;
            } else {
                RolePartsLibrary.tempParts.unshift(role);
            }
            RolePartsLibrary.renderAll();
        },
        
        remove: function(roleId) {
            RolePartsLibrary.tempParts = RolePartsLibrary.tempParts.filter(p => p.id !== roleId);
            RolePartsLibrary.renderAll();
        },
        
        update: function(roleId, newData) {
            const idx = RolePartsLibrary.tempParts.findIndex(p => p.id === roleId);
            if (idx !== -1) {
                const old = RolePartsLibrary.tempParts[idx];
                RolePartsLibrary.tempParts[idx] = { ...old, ...newData, id: roleId }; // ID不变
                RolePartsLibrary.renderAll();
                return true;
            }
            return false;
        }
    },

    // 本地仓库管理 (LocalStorage)
    userParts: {
        key: 'user_templates',

        init: function() {
            // 只是为了兼容旧代码，实际数据随用随取
        },
        
        create: function(roleData) {
            // 💡 真正的入库操作
            // 如果传入的是临时角色，先清理掉 is_temp 标记
            const newRole = { ...roleData };
            delete newRole.is_temp;
            
            // 加上入库时间
            newRole.created_at = new Date().toISOString();
            newRole.is_local = true; // 标记为本地仓库角色

            const parts = this.getAll();
            // 防止重复入库
            if (!parts.find(p => p.id === newRole.id)) {
                parts.unshift(newRole);
                localStorage.setItem(this.key, JSON.stringify(parts));
                console.log(`✅ 角色 [${newRole.name}] 已正式存入仓库！`);
                return true;
            }
            return false;
        },

        delete: function(partId) {
            let parts = this.getAll();
            const initialLength = parts.length;
            parts = parts.filter(p => p.id !== partId);
            if (parts.length < initialLength) {
                localStorage.setItem(this.key, JSON.stringify(parts));
                console.log(`本地角色 [${partId}] 已从仓库移除。`);
                return true;
            }
            return false;
        },
        
        // 以前的 create (只给空壳用) 现在不应该直接写库了
        // 这里保留是为了兼容，但建议改用 tempManager.add
        
        getAll: function() {
            try {
                return JSON.parse(localStorage.getItem(this.key) || '[]');
            } catch (e) {
                return [];
            }
        },

        find: function(partId) {
            return this.getAll().find(p => p.id === partId);
        }
    }
};
