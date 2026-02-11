// frontend/js/api.js (主页修复版 - Mock Mode)

// ==========================================
window.API_BASE_URL = 'https://0o0o0.shop/api';
delete window.API_BASE_URL;
const NEXTJS_BACKEND = 'https://0o0o0.shop/api';

// ==========================================
// 2. 核心请求工具 (只保留 Next.js 的)
// ==========================================

// 请求 AI 后台
async function fetchAI(endpoint, options = {}) {
    const url = `${NEXTJS_BACKEND}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    // 检查自定义 Key
    const userKey = localStorage.getItem('deepseek_api_key'); 
    if (userKey) headers['X-Custom-Api-Key'] = userKey;

    try {
        const response = await fetch(url, {
            credentials: 'include', 
            headers: headers,
            ...options
        });
        
        if (!response.ok) {
            // 如果 401，提示去登录
            if (response.status === 401) {
                console.warn("AI服务未登录 (401)"); 
                // 主页可以不弹窗，只是让相关功能不可用
            }
            throw new Error(`AI后台报错: ${response.status}`);
        }
        return await response.json();
    } catch (e) {
        console.error("fetchAI error:", e);
        throw e;
    }
}

// 模拟 Python 后端的响应 (Mock Data)
const mockDelay = (ms) => new Promise(r => setTimeout(r, ms));

// ==========================================
// 3. 业务 API (混合模式)
// ==========================================

// >>>>> 原 Python 接口 (现在伪造数据，防止主页报错) >>>>>
export const projectAPI = {
    list: async () => {
        await mockDelay(100);
        return [
            { id: 'p1', name: '默认项目', description: '本地演示项目' }
        ];
    },
    create: async () => { console.log("Mock: 创建项目"); },
    update: async () => {},
    delete: async () => {},
    detail: async () => ({})
};

export const roleAPI = {
    list: async () => {
        await mockDelay(100);
        return [
            { id: 'frontend_expert', name: '前端专家', description: '擅长 React/Vue', type: '预设' },
            { id: 'backend_architect', name: '后端架构师', description: '擅长 Python/Go', type: '预设' },
            { id: 'product_manager', name: '产品经理', description: '需求分析与规划', type: '预设' }
        ];
    },
    create: async () => {},
    update: async () => {},
    delete: async () => {},
};

export const localAPI = {
    scan: async () => ({ success: true, files_count: 0 }),
    tree: async () => ([]),
    readFile: async () => (""),
    writeFile: async () => {}
};

export const workflowAPI = {
    startContentWorkflow: async () => { alert("工作流已启动 (模拟)"); },
    getStatus: async () => ({ status: 'running' }),
};

// >>>>> 新 AI 接口 (走 Next.js，真实可用) >>>>>
export const chatAPI = {
    send: (modelId, messages) => fetchAI('/chat', { 
        method: 'POST', 
        body: JSON.stringify({ model_id: modelId, messages: messages }) 
    }),
};

export const systemAPI = {
    getModels: () => fetchAI('/models'),
    getUserInfo: () => fetchAI('/user/info'),
};

export const alchemyAPI = {
    forge: (roleName, modelId) => fetchAI('/alchemy', {
        method: 'POST',
        body: JSON.stringify({ roleName, modelId })
    })
};

// ==========================================
// 4. 导出兼容层
// ==========================================

export const post = (endpoint, data) => {
    // 关键修正：同时匹配 /chat 和 /api/chat
    if (endpoint.includes('/chat') || endpoint.includes('/models') || endpoint.includes('/alchemy')) {
        // 如果 endpoint 包含了 /api 前缀，去掉它，因为 fetchAI 会自动拼上
        // 或者简单点，fetchAI 内部其实是 ${NEXTJS_BACKEND}${endpoint} -> http://localhost:3001/api/api/chat (这样会错)
        
        // 正确逻辑：
        // 1. 如果传入 '/api/chat'，我们需要把它变成 '/chat' 传给 fetchAI
        // 2. 或者直接让 fetchAI 支持完整路径
        
        const cleanEndpoint = endpoint.replace('/api', ''); // 去掉 /api 前缀
        return fetchAI(cleanEndpoint, { method: 'POST', body: JSON.stringify(data) });
    }
    
    console.log(`Mock POST: ${endpoint}`, data);
    return Promise.resolve({ success: true });
};

export const get = (endpoint) => {
    if (endpoint.includes('/models') || endpoint.includes('/user')) {
        const cleanEndpoint = endpoint.replace('/api', '');
        return fetchAI(cleanEndpoint);
    }
    
    // ... (Mock 逻辑不变) ...
    if (endpoint === '/api/roles') return roleAPI.list();
    if (endpoint === '/api/projects') return projectAPI.list();
    
    console.log(`Mock GET: ${endpoint}`);
    return Promise.resolve([]);
};
export default {
    projectAPI, roleAPI, localAPI, chatAPI, systemAPI, workflowAPI, alchemyAPI,
    post, get
};





