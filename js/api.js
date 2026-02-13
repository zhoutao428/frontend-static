// frontend/js/api.js (最终修复版)

// ✅ 1. 定义常量 (修复变量名不一致的问题)
const API_BASE_URL = 'https://public-virid-chi.vercel.app/api';

// ✅ 2. 定义延迟工具 (修复 mockDelay 未定义报错)
const mockDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 3. 核心请求工具 (Fetch AI)
// ==========================================
async function fetchAI(endpoint, options = {}) {
    let token = null;

    // A. 尝试通过 Supabase SDK 获取 (优先)
    if (window.supabase) {
        try {
            const { data } = await window.supabase.auth.getSession();
            if (data?.session) {
                token = data.session.access_token;
            }
        } catch (e) {
            console.warn("SDK获取Session失败", e);
        }
    }

    // B. 本地兜底
    if (!token) {
        token = localStorage.getItem('user_token');
    }

    // 构造 URL
    const url = `${API_BASE_URL}${endpoint}`;

    // 构造 Headers
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`[API] 请求 ${endpoint} 未携带 Token`);
    }

    // 检查自定义 Key
    const userCustomKey = localStorage.getItem('deepseek_api_key');
    if (userCustomKey && endpoint.includes('/chat')) {
        headers['X-Custom-Api-Key'] = userCustomKey;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        // 处理 401
        if (response.status === 401) {
            console.error("Token 失效");
            localStorage.removeItem('user_token');
            // window.location.href = 'login.html'; // 可选：强制跳转
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

// ==========================================
// 4. 业务 API (混合模式)
// ==========================================

// >>>>> Mock 数据 (防止主页报错) >>>>>
export const projectAPI = {
    list: async () => {
        await mockDelay(100);
        return [
            { id: 'p1', name: '默认项目', description: '本地演示项目' }
        ];
    },
    create: async () => console.log("Mock: Create Project"),
    update: async () => {},
    delete: async () => {},
    detail: async () => ({})
};

export const roleAPI = {
    list: async () => {
        await mockDelay(100);
        return [
            { id: 'frontend', name: '前端专家', description: 'React/Vue', type: '预设' },
            { id: 'backend', name: '后端架构师', description: 'Node/Python', type: '预设' }
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
    startContentWorkflow: async () => alert("工作流演示模式"),
    getStatus: async () => ({ status: 'running' }),
};

// >>>>> 真实 AI 接口 (走 Vercel) >>>>>
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
// 5. 导出兼容层
// ==========================================
export const post = (endpoint, data) => {
    // 自动修正路径：如果传了 /api/chat，自动转为 /chat
    if (endpoint.includes('/chat') || endpoint.includes('/models') || endpoint.includes('/alchemy')) {
        const cleanEndpoint = endpoint.replace('/api', ''); 
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
    
    // Mock 路由
    if (endpoint.includes('/roles')) return roleAPI.list();
    if (endpoint.includes('/projects')) return projectAPI.list();
    
    console.log(`Mock GET: ${endpoint}`);
    return Promise.resolve([]);
};

export default {
    projectAPI, roleAPI, localAPI, chatAPI, systemAPI, workflowAPI, alchemyAPI,
    post, get
};
