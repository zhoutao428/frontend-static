import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
    'https://uispjsahipixbocvfdrg.supabase.co',
    'sb_publishable_qgH5KWfpLwYRpdCDmdVoTQ_6tAl3pG9'
);
console.log("✅ Supabase SDK 已就绪 (api.js 自托管)");
// ==========================================
// 1. 地址配置 (根据你的实际端口)
// ==========================================
const PYTHON_BACKEND = 'http://localhost:8000';    // 原后台 (Roles, Projects)
const API_BASE_URL = 'https://public-virid-chi.vercel.app/api'; // 必须是新后台地址

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
// 核心请求工具 (修复版)
async function fetchAI(endpoint, options = {}) {
    // 1. 获取最新 Token
    let token = null;

    // A. 尝试通过 Supabase SDK 获取 (优先)
    // 注意：确保 alchemy.html 里也引入了 supabase-js SDK！
    if (window.supabase) {
        try {
            const { data } = await window.supabase.auth.getSession();
            token = data.session?.access_token;
        } catch (e) {
            console.warn("SDK获取Session失败", e);
        }
    }

    // B. 本地兜底
    if (!token) {
        token = localStorage.getItem('user_token');
    }

    // 2. 构造 URL
    const url = `${API_BASE_URL}${endpoint}`;

    // 3. 构造 Headers
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    // 4. ✅ 关键修复：带上 Token！
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`[炼丹炉] 未登录，请求 ${endpoint} 可能会失败 (401)`);
    }

    // 5. 检查自定义 Key (用于 Chat)
    const userCustomKey = localStorage.getItem('deepseek_api_key');
    if (userCustomKey && endpoint.includes('/chat')) {
        headers['X-Custom-Api-Key'] = userCustomKey;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        if (response.status === 401) {
            console.error("炼丹炉认证失效");
            // localStorage.removeItem('user_token'); // 可选：是否强制登出
            throw new Error("认证失效，请重新登录主系统");
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `请求失败: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Alchemy API Error [${endpoint}]:`, error);
        throw error;
    }
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







