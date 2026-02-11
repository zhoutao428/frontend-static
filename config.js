// frontend/config.js (动态渲染版)

// 1. 定义支持的 API 列表
const API_PROVIDERS = [
    {
        id: 'deepseek',
        name: 'DeepSeek API',
        desc: '代码生成与推理 (推荐)',
        icon: 'fas fa-code',
        color: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        link: 'https://platform.deepseek.com/api_keys',
        placeholder: 'sk-xxxxxxxx',
        testModel: 'deepseek-chat'
    },
    {
        id: 'openai',
        name: 'OpenAI API',
        desc: 'GPT-4 / GPT-3.5',
        icon: 'fab fa-openai',
        color: 'linear-gradient(135deg, #10a37f, #0d8b6b)',
        link: 'https://platform.openai.com/api-keys',
        placeholder: 'sk-xxxxxxxx',
        testModel: 'gpt-3.5-turbo'
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        desc: 'Gemini Pro / Flash',
        icon: 'fab fa-google',
        color: 'linear-gradient(135deg, #4285f4, #34a853)',
        link: 'https://makersuite.google.com/app/apikey',
        placeholder: 'AIzaSy...',
        testModel: 'gemini-pro'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        desc: 'Claude 3.5 Sonnet',
        icon: 'fas fa-brain',
        color: 'linear-gradient(135deg, #d97706, #b45309)',
        link: 'https://console.anthropic.com/settings/keys',
        placeholder: 'sk-ant-...',
        testModel: 'claude-3-sonnet-20240229'
    }
];

// 2. 初始化
document.addEventListener('DOMContentLoaded', () => {
    renderAPICards();
    loadSavedKeys();
});

// 3. 渲染卡片
function renderAPICards() {
    const container = document.getElementById('api-list-container');
    container.innerHTML = API_PROVIDERS.map(p => `
        <div class="api-section" id="${p.id}-section">
            <div class="api-header">
                <div class="api-icon" style="background: ${p.color}">
                    <i class="${p.icon}"></i>
                </div>
                <div class="api-title">
                    <h3>${p.name}</h3>
                    <p>${p.desc}</p>
                </div>
                <div class="status-indicator">
                    <div class="status-dot" id="${p.id}-status"></div>
                    <span id="${p.id}-status-text">未配置</span>
                </div>
            </div>
            
            <div class="form-group">
                <label>API Key</label>
                <div class="input-with-icon" style="position:relative;">
                    <input type="password" id="${p.id}-key" 
                           placeholder="${p.placeholder}"
                           style="width: 100%; padding: 10px; padding-right: 40px; background: rgba(0,0,0,0.2); border: 1px solid #374151; color: white; border-radius: 6px;">
                    <button onclick="togglePassword('${p.id}-key')" type="button" 
                            style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#9ca3af; cursor:pointer;">
                        <i class="far fa-eye"></i>
                    </button>
                </div>
                <div style="margin-top: 5px; font-size: 12px; color: #6b7280;">
                    <a href="${p.link}" target="_blank" style="color: #60a5fa; text-decoration: none;">
                        获取 Key <i class="fas fa-external-link-alt" style="font-size: 10px;"></i>
                    </a>
                </div>
            </div>
            
            <div style="margin-top: 15px;">
                <button class="test-btn" onclick="testApi('${p.id}')" id="${p.id}-test-btn" 
                        style="padding: 8px 15px; background: #374151; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-vial"></i> 测试连接
                </button>
            </div>
            <div class="status-message" id="${p.id}-message" style="margin-top: 10px; font-size: 13px;"></div>
        </div>
    `).join('');
}

// 4. 加载本地 Key
function loadSavedKeys() {
    API_PROVIDERS.forEach(p => {
        const key = localStorage.getItem(`${p.id}_api_key`);
        if (key) {
            document.getElementById(`${p.id}-key`).value = key;
            updateStatus(p.id, true);
        }
    });
}

function updateStatus(id, hasKey) {
    const dot = document.getElementById(`${id}-status`);
    const text = document.getElementById(`${id}-status-text`);
    if (hasKey) {
        dot.style.background = '#10b981'; // Green
        text.textContent = '已保存';
        text.style.color = '#10b981';
    } else {
        dot.style.background = '#6b7280'; // Gray
        text.textContent = '未配置';
        text.style.color = '#6b7280';
    }
}

// 5. 交互函数
window.togglePassword = (id) => {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
};

window.saveAllKeys = () => {
    let count = 0;
    API_PROVIDERS.forEach(p => {
        const val = document.getElementById(`${p.id}-key`).value.trim();
        if (val) {
            localStorage.setItem(`${p.id}_api_key`, val);
            count++;
        } else {
            localStorage.removeItem(`${p.id}_api_key`);
        }
    });
    alert(`✅ 已保存 ${count} 个 API Key 到本地！`);
    window.location.href = 'index.html';
};

// 6. 测试连接 (修复版：走 Next.js 代理)
window.testApi = async (providerId) => {
    const key = document.getElementById(`${providerId}-key`).value.trim();
    if (!key) return alert('请先输入 API Key');
    
    const btn = document.getElementById(`${providerId}-test-btn`);
    const msgEl = document.getElementById(`${providerId}-message`);
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
    btn.disabled = true;
    msgEl.innerHTML = '';

    try {
        // 找到对应配置
        const config = API_PROVIDERS.find(p => p.id === providerId);
        
        // 发送请求到 Next.js 后台 (/api/chat)
        // 带着 X-Custom-Api-Key，这样后台就不会扣费
        const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Custom-Api-Key': key
    },
    body: JSON.stringify({
        model_id: config.testModel,
        messages: [{ role: 'user', content: 'Say Hi' }]
    })
});

        if (response.ok) {
            msgEl.innerHTML = `<span style="color:#10b981"><i class="fas fa-check-circle"></i> 连接成功！Key 有效。</span>`;
            updateStatus(providerId, true);
            // 顺便保存
            localStorage.setItem(`${providerId}_api_key`, key);
        } else {
            const err = await response.json();
            throw new Error(err.error || '验证失败');
        }
    } catch (e) {
        msgEl.innerHTML = `<span style="color:#ef4444"><i class="fas fa-times-circle"></i> ${e.message}</span>`;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

