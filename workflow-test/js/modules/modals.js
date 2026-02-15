// js/modules/modals.js
import { getRoleName, getModelName } from './utils.js';
import { saveAllAPIConfigs } from './state.js';
import { renderPartsGrid, renderAICategories } from './ui.js';
import { log } from './utils.js';

function resetModalUI(mode) {
    const titleEl = document.querySelector('#api-config-modal .modal-header h3');
    const labelEl = document.querySelector('label[for="config-role-name"]');
    const nameInput = document.getElementById('config-role-name');
    const keyInput = document.getElementById('api-key');
    document.getElementById('api-config-form').reset();

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
    document.getElementById('api-type').value = config.type || defaults.type || 'openai';
    document.getElementById('api-endpoint').value = config.endpoint || defaults.endpoint || '';
    document.getElementById('api-key').value = config.apiKey || defaults.key || '';
    document.getElementById('api-model').value = config.model || defaults.model || '';
    document.getElementById('api-temperature').value = config.temperature || defaults.temp || 0.7;
    document.getElementById('api-system-prompt').value = config.systemPrompt || defaults.prompt || '';
    const tempVal = document.getElementById('temp-value');
    if(tempVal) tempVal.textContent = document.getElementById('api-temperature').value;
}

export function showApiConfig(roleId, event) {
    if (event) event.stopPropagation();
    resetModalUI('role');
    const roleName = getRoleName(roleId);
    document.getElementById('config-role-name').value = roleName;
    document.getElementById('config-role-id').value = roleId;
    const config = window.apiConfigs.get(roleId) || {};
    fillModalForm(config, { type: 'openai', endpoint: '', key: '', model: '', temp: 0.7, prompt: '' });
    document.getElementById('api-config-modal').style.display = 'flex';
}

export function addCustomModel() {
    resetModalUI('new_model');
    document.getElementById('config-role-id').value = 'NEW_CUSTOM_MODEL';
    document.getElementById('config-role-name').value = '';
    fillModalForm({}, { type: 'custom', endpoint: 'http://localhost:11434/api/chat', key: '', model: 'deepseek-coder:1.3b', temp: 0.7, prompt: '' });
    document.getElementById('api-config-modal').style.display = 'flex';
}

export function showModelAPIConfig(modelId, event) {
    if (event) event.stopPropagation();
    resetModalUI('edit_model');
    const modelName = getModelName(modelId);
    document.getElementById('config-role-name').value = modelName;
    document.getElementById('config-role-id').value = modelId;
    const config = (window.modelAPIConfigs && window.modelAPIConfigs.get(modelId)) || {};
    fillModalForm(config, {});
    document.getElementById('api-config-modal').style.display = 'flex';
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
        // appendCustomModelToUI 在 UI 模块里，这里可以直接调 renderAICategories
        renderAICategories();
        log(`✨ 已添加模型: ${config.displayName}`);
    } else {
        const isModelID = configId.startsWith('custom_') || configId.startsWith('deepseek') || configId.startsWith('gpt') || configId.startsWith('openai');
        if (isModelID) { window.modelAPIConfigs.set(configId, config); renderAICategories(); }
        else { window.apiConfigs.set(configId, config); renderPartsGrid(); }
        log(`✅ 配置已更新`);
    }
    saveAllAPIConfigs();
    hideApiConfigModal();
}

export function hideApiConfigModal() { document.getElementById('api-config-modal').style.display = 'none'; }

// 测试连接 (优化版)
export async function testApiConnection() {
    const endpoint = document.getElementById('api-endpoint').value;
    const key = document.getElementById('api-key').value;
    const model = document.getElementById('api-model').value;
    
    if (!endpoint) return alert("请先填写 API 端点");
    
    // 按钮 loading 状态
    const btn = document.querySelector('#api-config-modal .modal-footer .btn-secondary:first-child');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
    btn.disabled = true;

    try {
        // 智能判断请求格式 (Ollama 原生 vs OpenAI)
        const isOllamaNative = endpoint.includes('/api/chat');
        let body = {};
        
        if (isOllamaNative) {
            body = {
                model: model,
                messages: [{ role: 'user', content: 'Hi' }],
                stream: false
            };
        } else {
            body = {
                model: model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            };
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
            // 尝试提取回复内容，证明真的通了
            let reply = "";
            if (data.message) reply = data.message.content; // Ollama
            else if (data.choices) reply = data.choices[0].message.content; // OpenAI
            
            alert(`✅ 连接成功！\n\nAPI 响应正常。\n模型回复: "${reply.substring(0, 50)}..."`);
        } else {
            const errText = await response.text();
            // 优化错误显示，防止太长
            alert(`❌ 连接失败 (${response.status})\n\n错误信息:\n${errText.substring(0, 200)}...`);
        }
    } catch (e) {
        alert(`❌ 网络错误:\n${e.message}\n\n可能原因：\n1. 地址填错了\n2. 本地服务没开\n3. 跨域(CORS)被拦截`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

export function showRoleDetails(roleId) {
    // 1. 获取完整数据
    let roleData = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    if (!roleData && roleId.startsWith('user_')) {
        roleData = RolePartsLibrary.userParts.find(roleId);
    }
    
    if (!roleData) return alert("未找到角色数据");

    // 2. 组装详情文本
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

    // 3. 弹窗显示 (后续可以改成漂亮的 Modal)
    alert(info);
    
    // 如果你想看 JSON 结构，方便调试：
    console.log("角色完整数据:", roleData);
}

export function checkModelAPIConfig(modelId) {
    // 1. 如果是云端模型 (GPT/DeepSeek/Claude)，直接算作已配置 (绿灯)
    // 因为它们走 Next.js 后台，平台有 Key
    if (modelId.startsWith('gpt') || modelId.startsWith('deepseek') || modelId.startsWith('claude') || modelId === 'openai') {
        return true; 
    }

    // 2. 如果是自定义模型 (custom_xxx)，必须检查是否有配置
    if (window.modelAPIConfigs && window.modelAPIConfigs.has(modelId)) {
        return true;
    }
    
    // 3. 兼容旧逻辑 (可选)
    if (modelId.includes('deepseek')) return !!localStorage.getItem('deepseek_api_key');
    if (modelId.includes('gpt')) return !!localStorage.getItem('openai_api_key');
    
    return false;
}
export function showTaskDetails(roleId, taskDesc) {
    // 先显示角色信息
    showRoleDetails(roleId);
    
    // 如果有任务，额外弹窗或者在 console 显示
    if (taskDesc && taskDesc !== 'undefined') {
        setTimeout(() => {
            alert(`【当前任务指令】\n\n${taskDesc}`);
        }, 500);
    }
}
