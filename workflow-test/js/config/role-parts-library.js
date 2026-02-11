// js/config/role-parts-library.js

// 定义角色库对象
const RolePartsLibrary = {
    // 预设系统零件 (可按需添加)
    parts: {
        'frontend_expert': {
            id: 'frontend_expert',
            name: '前端专家',
            category: 'tech',
            icon: 'fa-code',
            color: '#3b82f6',
            tags: ['React', 'Vue', 'CSS'],
            description: '精通前端技术栈',
            apiTemplate: { systemPrompt: '你是一个资深前端专家。', temperature: 0.7 }
        },
        'product_manager': {
            id: 'product_manager',
            name: '产品经理',
            category: 'product',
            icon: 'fa-tasks',
            color: '#a855f7',
            tags: ['需求分析', '原型设计'],
            description: '负责产品规划与设计',
            apiTemplate: { systemPrompt: '你是一个资深产品经理。', temperature: 0.7 }
        }
    },

    // 用户自定义零件模块
    userParts: {
        _parts: {}, // 内部存储
        
        // 初始化：从 LocalStorage 加载
        init() {
            const saved = localStorage.getItem('user_created_parts');
            if (saved) {
                try {
                    this._parts = JSON.parse(saved);
                } catch (e) {
                    console.error('加载用户零件失败', e);
                    this._parts = {};
                }
            }
        },

        // 保存到 LocalStorage
        _save() {
            localStorage.setItem('user_created_parts', JSON.stringify(this._parts));
        },

        // 获取所有用户零件 (数组)
        getAll() {
            return Object.values(this._parts);
        },

        // 创建新零件
        create(partData) {
            const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            
            const newPart = {
                id: newId,
                name: partData.name?.trim() || '新角色',
                category: partData.category || 'custom',
                icon: partData.icon || 'fa-user',
                color: partData.color || '#6b7280',
                tags: partData.tags || [],
                description: partData.description || '',
                
                // 👇 关键字段补全
                actions: partData.actions || [],
                apiTemplate: partData.apiTemplate || {},
                metadata: partData.metadata || {},
                capabilities: partData.capabilities || {},

                isCustom: true,
                createdAt: new Date().toISOString(),
                createdBy: 'user'
            };
            
            // 复制额外属性
            if (partData.capabilities) newPart.capabilities = partData.capabilities;
            if (partData.apiTemplate) newPart.apiTemplate = partData.apiTemplate;
            
            this._parts[newId] = newPart;
            this._save();
            return newId;
        },
        
        // 更新零件
        update(partId, updates) {
            if (!this._parts[partId]) return false;
            
            this._parts[partId] = {
                ...this._parts[partId],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this._save();
            return true;
        },
        
        // 删除零件
        delete(partId) {
            if (!this._parts[partId]) return false;
            delete this._parts[partId];
            this._save();
            return true;
        },
        
        // 查找零件
        find(partId) {
            return this._parts[partId] || null;
        },
        
        // 导出所有
        exportAll() {
            return JSON.stringify(this._parts, null, 2);
        },
        
        // 导入
        import(jsonStr) {
            try {
                const imported = JSON.parse(jsonStr);
                let count = 0;
                
                // 兼容数组或对象格式
                const items = Array.isArray(imported) ? imported : Object.values(imported);
                
                items.forEach(part => {
                    if (part.id && part.id.startsWith('user_')) {
                        this._parts[part.id] = part;
                        count++;
                    }
                });
                
                if (count > 0) this._save();
                return { success: true, count };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    },

    // ===== 增强版获取方法（合并系统+用户零件）=====
    
    // 获取所有零件（系统+用户）
    getAllPartsEnhanced() {
        return [
            ...Object.values(this.parts),          // 系统零件
            ...this.userParts.getAll()            // 用户零件
        ];
    },
    
    // 兼容旧接口
    getAllParts() {
        return this.getAllPartsEnhanced();
    },

    // 按分类获取零件
    getPartsByCategoryEnhanced(categoryId) {
        return this.getAllPartsEnhanced().filter(part => part.category === categoryId);
    },
    
        // 获取零件详情（修复版）
    getRoleDetailsEnhanced(roleId) {
        // 1. 先查用户零件
        let part = this.userParts.find(roleId);
        // 2. 再查系统零件
        if (!part) part = this.parts[roleId];
        
        if (!part) return null;
        
        // 3. 构建默认 API 模板 (防止 undefined)
        const defaultPrompt = `你是${part.name || '一个AI助手'}。`;
        
        let apiTemplate = {
            systemPrompt: defaultPrompt,
            temperature: 0.7,
            ...part.apiTemplate // 覆盖默认值
        };
        
        // ⚠️ 关键修复：确保 systemPrompt 是字符串
        if (!apiTemplate.systemPrompt) apiTemplate.systemPrompt = defaultPrompt;

        // 4. 动态替换模板变量
        if (part.tags && Array.isArray(part.tags)) {
            apiTemplate.systemPrompt = apiTemplate.systemPrompt
                .replace('{tags}', part.tags.join('、'))
                .replace('{capabilities.core}', (part.capabilities?.core || []).join('、'));
        }
        
        return {
            ...part,
            apiTemplate: apiTemplate
        };
    },

    
    // 搜索零件
    searchPartsEnhanced(keyword) {
        keyword = keyword.toLowerCase();
        return this.getAllPartsEnhanced().filter(part => 
            part.name.toLowerCase().includes(keyword) ||
            (part.tags && part.tags.some(tag => tag.toLowerCase().includes(keyword))) ||
            (part.description && part.description.toLowerCase().includes(keyword))
        );
    }
};

// 初始化用户零件模块
RolePartsLibrary.userParts.init();

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.RolePartsLibrary = RolePartsLibrary;
    console.log("📚 角色库 (RolePartsLibrary) 已加载");
}
