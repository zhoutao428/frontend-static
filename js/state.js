// frontend/js/state.js

export const state = {
    // 视图状态控制
    currentView: 'root', // 'root' | 'detail'
    activeTemplateId: null, // 当前进入的模板ID
    
    draggedCard: null,
    isGridMode: false,
    currentLocalPath: '',
    allRoles: [], // 后端角色库缓存

    // 默认模板库 (栈长预设)
    defaultTemplates: [
        {
            id: "fullstack",
            type: "preset",
            name: "全栈设计",
            description: "标准 Web 开发工作流",
            icon: "fas fa-code",
            bgClass: "role-dev", // 用于卡片背景色
            groups: [
                { id: "planning", title: "规划层", roles: ["pm", "ui"] },
                { id: "execution", title: "执行层", roles: ["arch-front", "dev-front", "arch-back", "dev-back"] },
                { id: "support", title: "支持层", roles: ["qa", "idea"] }
            ]
        },
        {
            id: "novel",
            type: "preset",
            name: "小说创作",
            description: "网文/剧本创作辅助",
            icon: "fas fa-book-open",
            bgClass: "role-product",
            groups: [
                { id: "world", title: "世界观", roles: ["idea", "custom_world_builder"] },
                { id: "chapter", title: "章节编写", roles: ["custom_writer", "custom_editor"] }
            ]
        },
        {
            id: "movie",
            type: "preset",
            name: "影视制作",
            description: "分镜与脚本统筹",
            icon: "fas fa-film",
            bgClass: "role-ui",
            groups: [
                { id: "script", title: "剧本层", roles: ["custom_screenwriter"] },
                { id: "visual", title: "视觉层", roles: ["ui"] }
            ]
        },
        // ✅ 新增：包含 custom 角色的自定义模板
        {
            id: "user_custom",
            type: "custom",
            name: "我的工作台",
            description: "自定义工作空间",
            icon: "fas fa-tools",
            bgClass: "role-idea",
            groups: [
                { id: "temp_tools", title: "临时工具", roles: ["custom"] } // ✅ 把 custom 加在这里
            ]
        }
    ],

    // 运行时数据 (包含用户的自定义模板)
    templates: [] 

};
window.state = state;
