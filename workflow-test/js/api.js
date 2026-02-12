// ==========================================
// 1. 地址配置 (根据你的实际端口)
// ==========================================
const PYTHON_BACKEND = 'http://localhost:8000';    // 原后台 (Roles, Projects)
const NEXTJS_BACKEND = 'https://public-virid-chi.vercel.app/api'; 

// ==========================================
// 2. 核心请求工具
// ==========================================

// 兼容旧代码的错误处理
function handleErrorResponse(response) {
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }
    return response;
}

// --- 工具 A: 访问 Python 后台 (带 Token) ---
// 请求 AI 后台 (修改版)
async function fetchAI(endpoint, options = {}) {
    const url = `${NEXTJS_BACKEND}${endpoint}`;
    
    // 1. 准备基础 Header
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    // 2. 【新增逻辑】检查用户本地是否有 DeepSeek Key
    const userKey = localStorage.getItem('deepseek_api_key'); 
    
    if (userKey) {
        headers['X-Custom-Api-Key'] = userKey;
        console.log("正在使用用户自定义 Key 发送请求...");
    } else {
        console.log("使用平台付费通道...");
    }

    // 3. 发送请求
    const response = await fetch(url, {
        credentials: 'include', 
        headers: headers,
        ...options
    });

    if (!response.ok) {
        throw new Error(`AI后台报错: ${response.status}`);
    }
    
    return await response.json();

}
// ==========================================
// 3. 业务 API 分流
// ==========================================

// >>>>> 这些去 8000 (Python) >>>>>
export const projectAPI = {
    list: () => fetchPython('/api/projects'),
    create: (data) => fetchPython('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchPython(`/api/projects/${id}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchPython(`/api/projects/${id}/delete`, { method: 'POST' }),
    detail: (id) => fetchPython(`/api/projects/${id}`)
};

export const roleAPI = {
    list: () => fetchPython('/api/roles'),
    create: (data) => fetchPython('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchPython(`/api/roles/${id}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchPython(`/api/roles/${id}/delete`, { method: 'POST' }),
};

export const localAPI = {
    scan: (path) => fetchPython('/api/local/scan', { method: 'POST', body: JSON.stringify({path}) }),
    tree: (path) => fetchPython(`/api/local/tree?path=${encodeURIComponent(path)}`),
    readFile: (path) => fetchPython(`/api/local/read?path=${encodeURIComponent(path)}`),
    writeFile: (path, content) => fetchPython('/api/local/write', { method: 'POST', body: JSON.stringify({path, content}) })
};

export const workflowAPI = {
    startContentWorkflow: (params) => fetchPython('/api/workflows/content/start', { method: 'POST', body: JSON.stringify(params) }),
    getStatus: (id) => fetchPython(`/api/workflows/${id}/status`),
};

// >>>>> 这些去 3001 (Next.js) >>>>>
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

// ==========================================
// 4. 核心修复：直接导出 post 和 get
// ==========================================

// 兼容 main.js 的 import { post, get } from './api.js'
export const post = (endpoint, data) => {
    if (endpoint.startsWith('/chat') || endpoint.startsWith('/models')) {
        return fetchAI(endpoint, { method: 'POST', body: JSON.stringify(data) });
    }
    return fetchPython(endpoint, { method: 'POST', body: JSON.stringify(data) });
};

export const get = (endpoint) => {
    if (endpoint.startsWith('/models') || endpoint.startsWith('/user')) {
        return fetchAI(endpoint);
    }
    return fetchPython(endpoint);
};

// ==========================================
// 5. 默认导出
// =========================================
// ==========================================
// 4. 炼丹专用 API (新增)
// ==========================================
export const alchemyAPI = {
    /**
     * 调用后台炼丹炉
     * @param {string} roleName - 角色名
     * @param {string|number} modelId - 模型ID (数据库ID)
     */
    forge: (roleName, modelId) => fetchAI('/alchemy', {
        method: 'POST',
        body: JSON.stringify({ roleName, modelId })
    })
};

export default {
    projectAPI, roleAPI, localAPI, chatAPI, systemAPI, workflowAPI,alchemyAPI,
    post, get
};




