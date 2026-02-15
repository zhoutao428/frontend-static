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

     userParts: {
        _parts: {}, // 内部存储
        
        // 初始化：从 LocalStorage 加载
        init() {
            // ✅ 必须改为 'user_templates'，这才是炼丹炉和仓库用的Key！
            const saved = localStorage.getItem('user_templates');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // 兼容数组格式 (炼丹炉存的是数组，这里转成对象)
                    if (Array.isArray(parsed)) {
                        this._parts = {};
                        parsed.forEach(p => this._parts[p.id] = p);
                    } else {
                        this._parts = parsed; // 兼容旧的对象格式
                    }
                } catch (e) {
                    console.error('加载用户零件失败', e);
                    this._parts = {};
                }
            }
        },

        // 保存到 LocalStorage
        _save() {
            // ✅ 必须存为数组格式！因为炼丹炉和仓库都是按数组读的
            const arrayData = Object.values(this._parts);
            localStorage.setItem('user_templates', JSON.stringify(arrayData));
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
// ✅ 兼容性补丁：给 alchemy.js 提供刷新接口
if (window.RolePartsLibrary) {
    window.RolePartsLibrary.loadUserRoles = function() {
        console.log("🔄 收到刷新指令，重新加载左侧列表...");
        this.userParts.init(); // 重新读 LocalStorage
        // 这里可能还需要触发 UI 渲染，假设有个全局渲染函数
        if (window.renderPartsGrid) window.renderPartsGrid(); 
    };
}

