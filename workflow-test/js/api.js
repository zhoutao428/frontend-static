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
async function fetchAI(endpoint, options = {}) {
    const url = `${NEXTJS_BACKEND}${endpoint}`;
    
    // 1. 准备基础 Header
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    // 2. 鉴权逻辑 A: 优先检查用户自定义 Key (DeepSeek/OpenAI Key)
    const userKey = localStorage.getItem('deepseek_api_key'); 
    
    // 3. 鉴权逻辑 B: 如果没有自定义 Key，必须带上登录 Token (Authorization)
    const token = localStorage.getItem('user_token');

    if (userKey) {
        headers['X-Custom-Api-Key'] = userKey;
        console.log("正在使用用户自定义 Key 发送请求...");
    } else if (token) {
        // ⚠️ 关键修复：带上 Token，防止 401
        headers['Authorization'] = `Bearer ${token}`;
        console.log("使用平台付费通道 (已登录)...");
    } else {
        console.warn("未登录且无自定义Key，请求可能会失败");
    }

    // 3. 发送请求
    const response = await fetch(url, {
        // credentials: 'include', // 既然用了 Header Token，这行可以删了，留着也无害
        headers: headers,
        ...options
    });
        
        if (response.status === 401) {
            console.error("Python后台认证失败！请重新登录原系统。");
            // 这里可以加一个跳转到原登录页的逻辑
            // window.location.href = '/login.html'; 
        }

        if (!response.ok) throw new Error(`Python后台报错(${response.status})`);
        return await response.json();
    } catch (error) {
        console.error(`Python API 错误 [${endpoint}]:`, error);
        throw error;
    }
}

// 请求 AI 后台 (修改版)
async function fetchAI(endpoint, options = {}) {
    const url = `${NEXTJS_BACKEND}${endpoint}`;
    
    // 1. 准备基础 Header
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    // 2. 【新增逻辑】检查用户本地是否有 DeepSeek Key
    // 假设你在 config.html 里把 key 存为了 'user_custom_key'
    const userKey = localStorage.getItem('deepseek_api_key'); 
    
    if (userKey) {
        // 如果用户有 Key，放在特殊 Header 里传过去
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

    // ... (后面的错误处理逻辑不变) ...
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


