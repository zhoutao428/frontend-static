window.WORKFLOW_TEMPLATES = {
    content: {
        name: '内容创作工厂',
        icon: 'fas fa-film',
        color: '#8b5cf6',
        category: 'MEDIA',
        description: '自动生成视频脚本与SEO优化',
        difficulty: '初级',
        time: '3-5分钟',
        // ✅ 升级版 Steps 定义
        steps: [
            { name: '趋势分析', role: 'data_scientist', prompt: '分析 {input} 领域的最新趋势。' },
            { name: '选题生成', role: 'product', prompt: '基于趋势：\n{prev}\n\n生成5个爆款选题。' },
            { name: '脚本撰写', role: 'creative_writer', prompt: '为选题撰写分镜脚本。' },
            { name: 'SEO优化', role: 'seo_expert', prompt: '提取关键词和Tag标签。' }
        ]
    },
    // ... 其他模板 (可以保持旧格式，引擎做了兼容)
    fullstack: {
        name: '全栈开发',
        icon: 'fas fa-code',
        color: '#10b981',
        category: 'DEV',
        description: '前后端代码生成',
        steps: ['需求分析', 'API设计', '前端开发', '后端实现']
    }
};
