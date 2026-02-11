// ========== 全局数据 ==========
let draggedItem = null;
let draggedType = null; // 'role' 或 'model'
let builderData = [];
let bindings = new Map(); // roleId -> modelId

// 测试数据
const testData = {
    parts: RolePartsLibrary.getAllPartsEnhanced(),
    categories: [
        { 
            id: 'tech', 
            name: '技术开发', 
            icon: 'fa-code', 
            expanded: true, 
            sub: ['前端开发', '后端开发', '运维部署'] 
        },
        { 
            id: 'design', 
            name: '创意设计', 
            icon: 'fa-palette', 
            expanded: false,
            sub: ['UI设计', '插画', '视频编辑'] 
        },
        { 
            id: 'content', 
            name: '内容创作', 
            icon: 'fa-feather', 
            expanded: true,
            sub: ['文案写作', '脚本创作', 'SEO优化'] 
        }
    ],
    
    parts: [
        { 
            id: 'frontend_expert', 
            name: '前端开发专家', 
            icon: 'fab fa-react', 
            color: '#61dafb', 
            tags: ['React', 'Vue']
        },
        { 
            id: 'backend_architect', 
            name: '后端架构师', 
            icon: 'fas fa-server', 
            color: '#10b981', 
            tags: ['Node.js', 'Python']
        },
        { 
            id: 'ui_designer', 
            name: 'UI设计师', 
            icon: 'fas fa-paint-brush', 
            color: '#8b5cf6', 
            tags: ['Figma', 'Sketch']
        },
        { 
            id: 'copywriter', 
            name: '文案写手', 
            icon: 'fas fa-pen-fancy', 
            color: '#f59e0b', 
            tags: ['营销文案', 'SEO']
        },
        { 
            id: 'data_analyst', 
            name: '数据分析师', 
            icon: 'fas fa-chart-line', 
            color: '#3b82f6', 
            tags: ['Python', 'SQL']
        },
        { 
            id: 'devops_engineer', 
            name: '运维工程师', 
            icon: 'fas fa-cogs', 
            color: '#6366f1', 
            tags: ['Docker', 'K8s']
        }
    ],
    
    aiCategories: [
        { 
            id: 'recommended', 
            name: '推荐模型', 
            icon: 'fa-crown', 
            expanded: true,
            models: [
                { id: 'deepseek_v3', name: 'DeepSeek V3', color: '#3b82f6', provider: '深度求索' },
                { id: 'gpt4', name: 'GPT-4 Turbo', color: '#10b981', provider: 'OpenAI' }
            ]
        },
        { 
            id: 'fast', 
            name: '高速模型', 
            icon: 'fa-bolt', 
            expanded: false,
            models: [
                { id: 'gemini_flash', name: 'Gemini Flash', color: '#8b5cf6', provider: 'Google' },
                { id: 'claude_haiku', name: 'Claude Haiku', color: '#f59e0b', provider: 'Anthropic' }
            ]
        },
        { 
            id: 'local', 
            name: '本地部署', 
            icon: 'fa-server', 
            expanded: false,
            models: [
                { id: 'llama3', name: 'Llama 3', color: '#6366f1', provider: 'Meta' },
                { id: 'deepseek_coder', name: 'DeepSeek Coder', color: '#3b82f6', provider: '深度求索' }
            ]
        }
    ]
};

// 角色名称映射
const roleNames = {
    'frontend_expert': '前端开发专家',
    'backend_architect': '后端架构师',
    'ui_designer': 'UI设计师',
    'copywriter': '文案写手',
    'data_analyst': '数据分析师',
    'devops_engineer': '运维工程师'
};

// 模型名称映射
const modelNames = {
    'deepseek_v3': 'DeepSeek',
    'gpt4': 'GPT-4',
    'gemini_flash': 'Gemini Flash',
    'claude_haiku': 'Claude',
    'llama3': 'Llama 3',
    'deepseek_coder': 'DeepSeek Coder'
};

// 模型颜色映射
const modelColors = {
    'deepseek_v3': '#3b82f6',
    'gpt4': '#10b981',
    'gemini_flash': '#8b5cf6',
    'claude_haiku': '#f59e0b',
    'llama3': '#6366f1',
    'deepseek_coder': '#3b82f6'
};