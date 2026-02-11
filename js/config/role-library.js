// 角色库配置文件
// 包含所有预置角色的完整元数据

export const ROLE_LIBRARY = {
    // ================= 预制角色（系统内置） =================
    
    // 项目管理类
    'pm': {
        id: 'pm',
        name: '产品经理',
        displayName: '产品经理',
        icon: 'fas fa-tasks',
        colorClass: 'role-pm',
        description: '负责需求分析、功能规划和项目管理',
        category: 'management',
        tags: ['管理', '规划', '需求'],
        defaultTemperature: 0.7,
        expertise: ['项目管理', '需求分析', '用户调研']
    },
    
    'ui': {
        id: 'ui',
        name: 'UI设计师',
        displayName: 'UI设计师',
        icon: 'fas fa-palette',
        colorClass: 'role-ui',
        description: '负责界面设计和用户体验优化',
        category: 'design',
        tags: ['设计', '视觉', '用户体验'],
        defaultTemperature: 0.8,
        expertise: ['UI设计', '原型设计', '动效设计']
    },
    
    'product': {
        id: 'product',
        name: '产品总监',
        displayName: '产品总监',
        icon: 'fas fa-chart-line',
        colorClass: 'role-product',
        description: '负责产品战略和团队管理',
        category: 'management',
        tags: ['战略', '管理', '决策'],
        defaultTemperature: 0.6,
        expertise: ['产品战略', '团队管理', '市场分析']
    },
    
    // 开发类
    'arch-front': {
        id: 'arch-front',
        name: '前端架构师',
        displayName: '前端架构师',
        icon: 'fas fa-sitemap',
        colorClass: 'role-dev',
        description: '负责前端技术选型和架构设计',
        category: 'development',
        tags: ['架构', '前端', '技术'],
        defaultTemperature: 0.5,
        expertise: ['前端架构', '性能优化', '框架选型']
    },
    
    'dev-front': {
        id: 'dev-front',
        name: '前端开发',
        displayName: '前端开发',
        icon: 'fas fa-code',
        colorClass: 'role-dev',
        description: '负责前端代码实现和功能开发',
        category: 'development',
        tags: ['前端', '开发', 'JavaScript'],
        defaultTemperature: 0.7,
        expertise: ['React/Vue', 'JavaScript', 'CSS']
    },
    
    'arch-back': {
        id: 'arch-back',
        name: '后端架构师',
        displayName: '后端架构师',
        icon: 'fas fa-server',
        colorClass: 'role-backend',
        description: '负责后端系统架构设计',
        category: 'development',
        tags: ['架构', '后端', '数据库'],
        defaultTemperature: 0.5,
        expertise: ['系统架构', '数据库设计', 'API设计']
    },
    
    'dev-back': {
        id: 'dev-back',
        name: '后端开发',
        displayName: '后端开发',
        icon: 'fas fa-database',
        colorClass: 'role-backend',
        description: '负责后端业务逻辑实现',
        category: 'development',
        tags: ['后端', '开发', '数据库'],
        defaultTemperature: 0.7,
        expertise: ['Python/Java', '数据库', 'API开发']
    },
    
    // 支持类
    'qa': {
        id: 'qa',
        name: '质量测试',
        displayName: '质量测试',
        icon: 'fas fa-vial',
        colorClass: 'role-qa',
        description: '负责质量保证和测试用例设计',
        category: 'support',
        tags: ['测试', '质量', '验证'],
        defaultTemperature: 0.3,
        expertise: ['测试用例', '自动化测试', '质量监控']
    },
    
    'idea': {
        id: 'idea',
        name: '创意灵感',
        displayName: '创意灵感',
        icon: 'fas fa-lightbulb',
        colorClass: 'role-idea',
        description: '负责创意构思和头脑风暴',
        category: 'support',
        tags: ['创意', '灵感', '创新'],
        defaultTemperature: 0.9,
        expertise: ['头脑风暴', '创意构思', '概念设计']
    },
    
    // ================= 特殊角色 =================
    
    'custom': {
        id: 'custom',
        name: '临时工作台',
        displayName: '临时工作台',
        icon: 'fas fa-edit',
        colorClass: 'role-idea',
        description: '临时会话，可自定义系统提示词',
        category: 'custom',
        tags: ['临时', '自定义', '通用'],
        defaultTemperature: 0.7,
        expertise: ['通用对话', '自定义任务']
    },
    
    // ================= 合并角色模板 =================
    
    'merged-template': {
        id: 'merged',
        name: '融合助手',
        displayName: '融合助手',
        icon: 'fas fa-link',
        colorClass: 'role-pm', // 默认使用第一个角色的颜色
        description: '多个角色融合协作',
        category: 'merged',
        tags: ['融合', '协作', '多角色'],
        defaultTemperature: 0.7
    }
};

// 角色分类信息
export const ROLE_CATEGORIES = {
    'management': { name: '管理类', icon: 'fas fa-users', color: '#a855f7' },
    'design': { name: '设计类', icon: 'fas fa-palette', color: '#ec4899' },
    'development': { name: '开发类', icon: 'fas fa-code', color: '#3b82f6' },
    'support': { name: '支持类', icon: 'fas fa-hands-helping', color: '#10b981' },
    'custom': { name: '自定义', icon: 'fas fa-user-cog', color: '#eab308' },
    'merged': { name: '融合角色', icon: 'fas fa-link', color: '#8b5cf6' }
};

// 默认角色配置
export const DEFAULT_ROLE_CONFIG = {
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: '你是一个专业的助手，请根据你的角色完成任务。',
    formatPreference: 'markdown'
};
