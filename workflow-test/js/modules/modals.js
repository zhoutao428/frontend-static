// 文件名: js/modules/modals.js

import { getRoleName, getModelName } from './utils.js';
import { saveAllAPIConfigs } from './state.js';
import { renderPartsGrid, renderAICategories } from './ui.js';
import { log } from './utils.js';
import { RolePartsLibrary } from './role-parts-library.js'; // 导入 RolePartsLibrary 以便 showRoleDetails 使用

// -----------------------------------------------------------------------------
// 1. 新增：通用的弹窗管理函数 (为了修复 main.js 报错)
// -----------------------------------------------------------------------------

/**
 * 初始化所有弹窗的通用事件监听
 * (main.js 会调用此函数)
 */
export function initializeModalToggles() {
    console.log("🔧 初始化弹窗系统...");

    // 绑定所有 .modal-close 按钮的点击事件
    document.addEventListener('click', (event) => {
        if (event.target.closest('.modal-close') || event.target.classList.contains('modal-close')) {
            const modal = event.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        // 点击弹窗背景遮罩层关闭
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // 绑定 ESC 键关闭所有弹窗
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        const input = modal.querySelector('input, textarea');
        if (input) setTimeout(() => input.focus(), 50);
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        window.dispatchEvent(new Event('resize'));
    }
}

/**
 * 创建并打开自定义角色的对话窗口
 */
export function createCustomRoleWindow(roleId) {
    const roleName = (window.getRoleName && window.getRoleName(roleId)) || roleId;
    let panelId = `${roleId}-panel`;
    let panel = document.getElementById(panelId);
    
    if (!panel) {
        panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'modal custom-role-window';
        panel.style.display = 'none';
        
        panel.innerHTML = `
            <div class="modal-content" style="max-width: 600px; padding: 20px;">
                <span class="modal-close" onclick="Modals.closeModal('${panelId}')" style="float: right; cursor: pointer; font-size: 24px;">&times;</span>
                <h3>💬 ${roleName}</h3>
                <div class="chat-container" id="${roleId}-chat" style="height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background: #f9f9f9;">
                    <div class="system-message" style="color: #888; text-align: center; font-size: 12px;">角色已就绪。你可以开始对话，或输入指令。</div>
                </div>
                <div class="input-area" style="display: flex; gap: 10px;">
                    <textarea placeholder="输入指令或对话内容... (Ctrl+Enter 发送)" style="flex: 1; height: 60px; padding: 5px;"></textarea>
                    <button onclick="window.sendRoleMessage && window.sendRoleMessage('${roleId}')" style="padding: 0 20px;">发送</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        const textarea = panel.querySelector('textarea');
        const sendBtn = panel.querySelector('button');
        if (textarea && sendBtn) {
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    sendBtn.click();
                }
            });
        }
    }
    openModal(panelId);
}


// -----------------------------------------------------------------------------
// 2. 保留：您原有的 API 配置和业务逻辑
// -----------------------------------------------------------------------------

function resetModalUI(mode) {
    const titleEl = document.querySelector('#api-config-modal .modal-header h3');
    const labelEl = document.querySelector('label[for="config-role-name"]');
    const nameInput = document.getElementById('config-role-name');
    const keyInput = document.getElementById('api-key');

    const form = document.getElementById('api-config-form');
    if(form) form.reset();

    if (mode === 'role') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-user-cog"></i> 角色API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-user"></i> 角色名称`;
        if(nameInput) { nameInput.readOnly = true; nameInput.placeholder = ""; }
    } else if (mode === 'new_model') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-plus-circle"></i> 添加自定义模型`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型显示名称`;
        if(nameInput) { nameInput.readOnly = false; nameInput.placeholder = "例如: My Local DeepSeek"; }
    } else if (mode === 'edit_model') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-server"></i> 模型API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型名称`;
        if(nameInput) { nameInput.readOnly = true; nameInput.placeholder = ""; }
    }
}

function fillModalForm(config, defaults) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.value = val !== undefined ? val : '';
    };

    setVal('api-type', config.type || defaults.type || 'openai');
    setVal('api-endpoint', config.endpoint || defaults.endpoint || '');
    setVal('api-key', config.apiKey || defaults.key || '');
    setVal('api-model', config.model || defaults.model || '');
    setVal('api-temperature', config.temperature || defaults.temp || 0.7);
    setVal('api-system-prompt', config.systemPrompt || defaults.prompt || '');

    const tempVal = document.getElementById('temp-value');
    if(tempVal) tempVal.textContent = document.getElementById('api-temperature')?.value;
}

export function showApiConfig(roleId, event) {
    if (event) event.stopPropagation();
    resetModalUI('role');

    const roleName = getRoleName(roleId);
    const nameInput = document.getElementById('config-role-name');
    const idInput = document.getElementById('config-role-id');
    
    if(nameInput) nameInput.value = roleName;
    if(idInput) idInput.value = roleId;

    const config = (window.apiConfigs && window.apiConfigs.get(roleId)) || {};
    fillModalForm(config, { type: 'openai', endpoint: '', key: '', model: '', temp: 0.7, prompt: '' });

    const modal = document.getElementById('api-config-modal');
    if(modal) modal.style.display = 'flex';
}

export function addCustomModel() {
    resetModalUI('new_model');
    
    const idInput = document.getElementById('config-role-id');
    const nameInput = document.getElementById('config-role-name');
    
    if(idInput) idInput.value = 'NEW_CUSTOM_MODEL';
    if(nameInput) nameInput.value = '';

    fillModalForm({}, { type: 'custom', endpoint: 'http://localhost:11434/api/chat', key: '', model: 'deepseek-coder:1.3b', temp: 0.7, prompt: '' });

    const modal = document.getElementById('api-config-modal');
    if(modal) modal.style.display = 'flex';
}

export function showModelAPIConfig(modelId, event) {
    if (event) event.stopPropagation();
    resetModalUI('edit_model');

    const modelName = getModelName(modelId);
    const nameInput = document.getElementById('config-role-name');
    const idInput = document.getElementById('config-role-id');
    
    if(nameInput) nameInput.value = modelName;
    if(idInput) idInput.value = modelId;

    const config = (window.modelAPIConfigs && window.modelAPIConfigs.get(modelId)) || {};
    fillModalForm(config, {});

    const modal = document.getElementById('api-config-modal');
    if(modal) modal.style.display = 'flex';
}

export async function saveApiConfig() {
    const configId = document.getElementById('config-role-id').value;
    const isNewModel = configId === 'NEW_CUSTOM_MODEL';

    const config = {
        type: document.getElementById('api-type').value,
        endpoint: document.getElementById('api-endpoint').value,
        apiKey: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value,
        temperature: parseFloat(document.getElementById('api-temperature').value),
        systemPrompt: document.getElementById('api-system-prompt').value,
        displayName: document.getElementById('config-role-name').value || '未命名模型',
        lastUpdated: new Date().toISOString()
    };

    const isLocal = config.type === 'custom' || config.endpoint.includes('localhost');

    if (!config.apiKey && !isLocal) return alert('请输入 API 密钥');
    if (!config.apiKey && isLocal) config.apiKey = 'sk-local';

    if (isNewModel) {
        const newId = `custom_${Date.now()}`;
        if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
        window.modelAPIConfigs.set(newId, config);
        
        renderAICategories();
        log(`✨ 已添加模型: ${config.displayName}`);
    } else {
        const isModelID = configId.startsWith('custom_') || configId.startsWith('deepseek') || configId.startsWith('gpt') || configId.startsWith('openai');

        if (isModelID) { 
            if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
            window.modelAPIConfigs.set(configId, config); 
            renderAICategories(); 
        } else { 
            if (!window.apiConfigs) window.apiConfigs = new Map();
            window.apiConfigs.set(configId, config); 
            renderPartsGrid(); 
        }
        log(`✅ 配置已更新`);
    }

    saveAllAPIConfigs();
    hideApiConfigModal();
}

export function hideApiConfigModal() { 
    const modal = document.getElementById('api-config-modal');
    if(modal) modal.style.display = 'none'; 
}

export async function testApiConnection() {
    const endpoint = document.getElementById('api-endpoint').value;
    const key = document.getElementById('api-key').value;
    const model = document.getElementById('api-model').value;
    
    if (!endpoint) return alert("请先填写 API 端点");
    
    const btn = document.querySelector('#api-config-modal .modal-footer .btn-secondary:first-child');
    let originalText = "测试连接";
    if(btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
        btn.disabled = true;
    }

    try {
        const isOllamaNative = endpoint.includes('/api/chat');
        let body = {};
        
        if (isOllamaNative) {
            body = { model: model, messages: [{ role: 'user', content: 'Hi' }], stream: false };
        } else {
            body = { model: model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key || 'ollama'}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const data = await response.json();
            let reply = "";
            if (data.message) reply = data.message.content; // Ollama
            else if (data.choices) reply = data.choices[0].message.content; // OpenAI
            
            alert(`✅ 连接成功！\n\nAPI 响应正常。\n模型回复: "${reply.substring(0, 50)}..."`);
        } else {
            const errText = await response.text();
            alert(`❌ 连接失败 (${response.status})\n\n错误信息:\n${errText.substring(0, 200)}...`);
        }
    } catch (e) {
        alert(`❌ 网络错误:\n${e.message}\n\n可能原因：\n1. 地址填错了\n2. 本地服务没开\n3. 跨域(CORS)被拦截`);
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

export function showRoleDetails(roleId) {
    let roleData = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    if (!roleData && roleId.startsWith('user_')) {
        roleData = RolePartsLibrary.userParts.find(roleId);
    }
    
    if (!roleData) return alert("未找到角色数据");

    const info = [
        `【${roleData.name}】`,
        `----------------`,
        `📝 描述: ${roleData.description || '无'}`,
        ``,
        `🏷️ 标签: ${(roleData.tags || []).join(', ')}`,
        ``,
        `⚡ 核心能力:`,
        ...(roleData.capabilities?.core || []).map(c => `  - ${c}`),
        ``,
        `🤖 AI 风格: ${roleData.capabilities?.aiStyle || '默认'}`,
        ``,
        `⚙️ System Prompt (API):`,
        roleData.apiTemplate?.systemPrompt || '未生成'
    ].join('\n');

    alert(info);
    console.log("角色完整数据:", roleData);
}

export function checkModelAPIConfig(modelId) {
    if (modelId.startsWith('gpt') || modelId.startsWith('deepseek') || modelId.startsWith('claude') || modelId === 'openai') {
        return true; 
    }
    if (window.modelAPIConfigs && window.modelAPIConfigs.has(modelId)) {
        return true;
    }
    if (modelId.includes('deepseek')) return !!localStorage.getItem('deepseek_api_key');
    if (modelId.includes('gpt')) return !!localStorage.getItem('openai_api_key');
    
    return false;
}

export function showTaskDetails(roleId, taskDesc) {
    showRoleDetails(roleId);
    if (taskDesc && taskDesc !== 'undefined') {
        setTimeout(() => {
            alert(`【当前任务指令】\n\n${taskDesc}`);
        }, 500);
    }
}
