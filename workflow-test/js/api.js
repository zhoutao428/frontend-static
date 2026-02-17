// ==========================================
// 1. 地址配置 (统一使用你的Vercel后台)
// ==========================================

const API_BASE_URL = 'https://public-virid-chi.vercel.app/api';

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

/**
 * 通用AI请求工具 - 所有接口统一使用
 * @param {string} endpoint - API端点，如 '/chat', '/models', '/alchemy'
 * @param {object} options - fetch选项
 */
async function fetchAI(endpoint, options = {}) {
    // 1. 获取最新 Token
    let token = null;

    // A. 尝试通过 Supabase SDK 获取
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

    // 4. 带上 Token
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`[API] 未登录，请求 ${endpoint} 可能会失败 (401)`);
    }

    // 5. 只有聊天接口需要用户自定义Key
    if (endpoint.includes('/chat')) {
        const userCustomKey = localStorage.getItem('deepseek_api_key');
        if (userCustomKey) {
            headers['X-Custom-Api-Key'] = userCustomKey;
        }
        // 注意：即使用户没有Key，也不应该报错，后端会用平台Key
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        // 处理401 - Token过期
        if (response.status === 401) {
            console.error("认证失效，尝试刷新token...");
            
            // 尝试刷新token
            if (window.supabase) {
                try {
                    const { data, error } = await window.supabase.auth.refreshSession();
                    if (error) throw error;
                    
                    const newToken = data.session?.access_token;
                    if (newToken) {
                        localStorage.setItem('user_token', newToken);
                        headers['Authorization'] = `Bearer ${newToken}`;
                        
                        // 重试请求
                        const retryResponse = await fetch(url, {
                            ...options,
                            headers: headers
                        });
                        
                        if (retryResponse.ok) {
                            return await retryResponse.json();
                        }
                    }
                } catch (refreshError) {
                    console.error("token刷新失败:", refreshError);
                }
            }
            
            throw new Error("认证失效，请重新登录");
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `请求失败: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

/**
 * Python后台请求工具（如果还有Python服务）
 * 如果已全部迁移到Vercel，可以删除此函数和相关API
 */
async function fetchPython(endpoint, options = {}) {
    console.warn("fetchPython 被调用，请确认是否还需要Python服务");
    return fetchAI(endpoint, options); // 临时指向同一个后端
}

// ==========================================
// 3. 业务API - 全部指向同一个后端
// ==========================================

// 项目管理
export const projectAPI = {
    list: () => fetchAI('/projects'),
    create: (data) => fetchAI('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAI(`/projects/${id}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchAI(`/projects/${id}/delete`, { method: 'POST' }),
    detail: (id) => fetchAI(`/projects/${id}`)
};

// 角色管理
export const roleAPI = {
    list: () => fetchAI('/roles'),
    create: (data) => fetchAI('/roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAI(`/roles/${id}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => fetchAI(`/roles/${id}/delete`, { method: 'POST' }),
};

// 本地文件操作（如果还有需要）
export const localAPI = {
    scan: (path) => fetchAI('/local/scan', { method: 'POST', body: JSON.stringify({path}) }),
    tree: (path) => fetchAI(`/local/tree?path=${encodeURIComponent(path)}`),
    readFile: (path) => fetchAI(`/local/read?path=${encodeURIComponent(path)}`),
    writeFile: (path, content) => fetchAI('/local/write', { method: 'POST', body: JSON.stringify({path, content}) })
};

// 工作流
export const workflowAPI = {
    startContentWorkflow: (params) => fetchAI('/workflows/content/start', { method: 'POST', body: JSON.stringify(params) }),
    getStatus: (id) => fetchAI(`/workflows/${id}/status`),
};

// 聊天
export const chatAPI = {
    send: (modelId, messages) => fetchAI('/chat', { 
        method: 'POST', 
        body: JSON.stringify({ model_id: modelId, messages: messages }) 
    }),
};

// 系统信息
export const systemAPI = {
    getModels: () => fetchAI('/models'),
    getUserInfo: () => fetchAI('/user/info'),
};

// 炼丹炉
export const alchemyAPI = {
    forge: (roleName, modelId) => fetchAI('/alchemy', {
        method: 'POST',
        body: JSON.stringify({ roleName, modelId })
    }),
    orchestrate: (data) => fetchAI('/alchemy/orchestrate', {  // 新增
        method: 'POST',
        body: JSON.stringify(data)
    })
};

// ==========================================
// 4. 兼容旧代码的 post/get
// ==========================================

export const post = (endpoint, data) => {
    return fetchAI(endpoint, { method: 'POST', body: JSON.stringify(data) });
};

export const get = (endpoint) => {
    return fetchAI(endpoint);
};

// ==========================================
// 5. 默认导出
// ==========================================

export default {
    projectAPI, roleAPI, localAPI, chatAPI, systemAPI, workflowAPI, alchemyAPI,
    post, get
};
