// frontend/js/api.js (主页修复版 - Mock Mode)

// ==========================================
window.API_BASE_URL = 'https://public-virid-chi.vercel.app/api';
delete window.API_BASE_URL;
const NEXTJS_BACKEND = 'https://public-virid-chi.vercel.app/api';

// ==========================================
// 2. 核心请求工具 (只保留 Next.js 的)
// =========================================

async function fetchAI(endpoint, options = {}) {
    // 1. 获取最新 Token (优先问 SDK 要)
    let token = null;

    // A. 尝试通过 Supabase SDK 获取 (自动处理续期)
    if (window.supabase) {
        try {
            const { data } = await window.supabase.auth.getSession();
            // 如果有 session，这个 token 绝对是最新的
            if (data?.session) {
                token = data.session.access_token;
            }
        } catch (e) {
            console.warn("SDK获取Session失败，尝试本地Token", e);
        }
    }

    // B. 如果 SDK 没取到，尝试从本地 localStorage 兜底
    if (!token) {
        token = localStorage.getItem('user_token');
    }

    // 2. 构造请求 URL (确保用的是新后台地址)
    const url = `${API_BASE_URL}${endpoint}`; // 确保 API_BASE_URL 已经在前面定义过

    // 3. 构造请求头
    const headers = { 
        'Content-Type': 'application/json',
        ...options.headers 
    };

    // 4. 添加 Authorization 头
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        // 如果没 Token，可能是未登录状态
        // 这里不 throw Error，因为有些接口可能允许匿名访问
        console.warn(`[API] 请求 ${endpoint} 未携带 Token (可能未登录)`);
    }

    // 5. 检查是否需要自定义 Key (针对 Chat 接口)
    const userCustomKey = localStorage.getItem('deepseek_api_key');
    if (userCustomKey && endpoint.includes('/chat')) {
        headers['X-Custom-Api-Key'] = userCustomKey;
        // 如果有自定义 Key，可以不用 Token (视后端逻辑而定)
    }

    try {
        // 6. 发送请求
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        // 7. 处理 401 未授权 (Token过期或无效)
        if (response.status === 401) {
            console.error("Token 失效或未登录，请重新登录");
            // 可选：清除本地失效 Token
            localStorage.removeItem('user_token');
            
            // 可选：强制跳转登录页 (慎用，可能会打断用户操作)
            // window.location.href = 'login.html';
            
            throw new Error("认证失效，请重新登录");
        }

        // 8. 处理其他错误
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








