import { chatAPI, systemAPI, alchemyAPI } from './api.js';

// 全局状态
window.alchemyState = window.alchemyState || {
    materials: [],
    isProcessing: false
};

if (!window.bindings) window.bindings = new Map();
if (!window.apiConfigs) window.apiConfigs = new Map();
if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
if (!window.builderData) window.builderData = [];
if (!window.draggedItem) window.draggedItem = null;
if (!window.draggedType) window.draggedType = null;
if (!window.roleNames) window.roleNames = {};
if (!window.modelNames) window.modelNames = {};
if (!window.modelColors) window.modelColors = {};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadAllAPIConfigs();
    loadTestData();
    
    renderPartsGrid();
    renderAICategories();
    renderGroups();
    updateBindingsUI();
    
    initTrashCan();
    initDropZone();
    
    bindGlobalEvents();
    
    document.getElementById('btn-reset').onclick = resetAll;
    document.getElementById('btn-export').onclick = exportConfig;
    document.getElementById('btn-simulate').onclick = simulateInteraction;
    document.getElementById('btn-run-all').onclick = executeWorkflow;
    document.getElementById('btn-stop').onclick = stopExecution;
    
    log('系统初始化完成');
});

// ========== 数据加载 ==========
function loadTestData() {
    if (!bindings || !(bindings instanceof Map)) {
        bindings = new Map();
    }
    if (!apiConfigs || !(apiConfigs instanceof Map)) {
        apiConfigs = new Map();
    }
    
    builderData = [
        { id: 'g1', name: '规划阶段', roles: [] },
        { id: 'g2', name: '执行阶段', roles: [] }
    ];
    
    bindings.set('frontend_expert', 'deepseek_v3');
    bindings.set('data_analyst', 'gpt4');
    
    loadTestApiConfigs();
}

function loadTestApiConfigs() {
    const testConfigs = {
        'frontend_expert': {
            type: 'deepseek',
            endpoint: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            temperature: 0.8,
            systemPrompt: '你是一个资深前端开发专家，擅长React、Vue等现代前端框架。'
        },
        'data_analyst': {
            type: 'openai',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4-turbo',
            temperature: 0.7,
            systemPrompt: '你是一个数据分析专家，擅长Python、SQL和数据可视化。'
        }
    };
    
    Object.keys(testConfigs).forEach(roleId => {
        apiConfigs.set(roleId, testConfigs[roleId]);
    });
}

// ========== 左侧零件库 ==========
function renderPartsGrid() {
    const grid = document.getElementById('parts-grid');
    
    const allParts = RolePartsLibrary.getAllPartsEnhanced
        ? RolePartsLibrary.getAllPartsEnhanced() 
        : RolePartsLibrary.getAllParts();
    
    grid.innerHTML = allParts.map(part => {
        const hasApi = apiConfigs.has(part.id);
        return `
        <div class="part-card" 
             onclick="showRoleDetails('${part.id}')"
             draggable="true" 
             data-role-id="${part.id}"
             ondragstart="onRoleDragStart(event)"
             ondragend="onDragEnd(event)">
            <div class="part-header">
                <div class="part-icon" style="background: ${part.color || '#3b82f6'}">
                    <i class="${part.icon || 'fa-user'}"></i>
                </div>
                <div class="part-name">${part.name}</div>
                <div class="api-status ${hasApi ? 'has-api' : 'no-api'}" 
                     onclick="showApiConfig('${part.id}', event)"
                     title="${hasApi ? '已配置API' : '未配置API'}">
                    <i class="fas ${hasApi ? 'fa-plug' : 'fa-plug-circle-exclamation'}"></i>
                </div>
            </div>
            <div class="part-tags">
                ${(part.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="part-actions">
                <button class="btn-api-config" onclick="showApiConfig('${part.id}', event)">
                    <i class="fas fa-cog"></i> 配置API
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// ========== 右侧AI引擎 ==========
async function renderAICategories() {
    const container = document.getElementById('ai-categories');
    
    try {
        const realModels = await systemAPI.getModels();
        
        const categories = {
            'openai': { id: 'openai', name: 'OpenAI', icon: 'fa-robot', models: [] },
            'google': { id: 'google', name: 'Google', icon: 'fa-google', models: [] },
            'deepseek': { id: 'deepseek', name: 'DeepSeek', icon: 'fa-code', models: [] },
            'anthropic': { id: 'anthropic', name: 'Anthropic', icon: 'fa-brain', models: [] }
        };

        realModels.forEach(m => {
            if (categories[m.provider]) {
                categories[m.provider].models.push({
                    id: m.id,
                    name: m.display_name,
                    provider: m.provider,
                    color: '#10b981'
                });
            }
        });

        container.innerHTML = Object.values(categories)
            .filter(cat => cat.models.length > 0)
            .map(cat => `
                <div class="ai-category expanded">
                    <div class="ai-category-header">
                        <i class="fas ${cat.icon}"></i>
                        <span>${cat.name}</span>
                    </div>
                    <div class="ai-models">
                        ${cat.models.map(model => `
                            <div class="ai-model-card"
                                 draggable="true"
                                 data-model-id="${model.id}" 
                                 ondragstart="onModelDragStart(event)"
                                 ondragend="onDragEnd(event)">
                                <div class="model-icon" style="background: ${model.color}">
                                    ${model.name.charAt(0)}
                                </div>
                                <div class="model-info">
                                    <div class="model-name">${model.name}</div>
                                    <div class="model-provider">💎 ${model.sale_price || 0}积分</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

        renderCustomModels();

    } catch (err) {
        console.error("加载模型失败:", err);
        container.innerHTML = '<div class="p-4 text-gray-500">无法加载模型列表，请检查后台连接</div>';
    }
}

function renderCustomModels() {
    const container = document.getElementById('ai-categories');
    if (!window.modelAPIConfigs || modelAPIConfigs.size === 0) return;
    
    let customSection = container.querySelector('.custom-models-section');
    
    if (!customSection) {
        customSection = document.createElement('div');
        customSection.className = 'ai-category expanded custom-models-section';
        customSection.innerHTML = `
            <div class="ai-category-header">
                <i class="fas fa-server"></i>
                <span>自定义模型</span>
            </div>
            <div class="ai-models" id="custom-models-list"></div>
        `;
        container.appendChild(customSection);
    }
    
    const customList = document.getElementById('custom-models-list') || customSection.querySelector('.ai-models');
    customList.innerHTML = '';
    
    modelAPIConfigs.forEach((config, id) => {
        if (id.startsWith('custom_')) {
            const html = `
                <div class="ai-model-card" 
                     draggable="true"
                     data-model-id="${id}" 
                     ondragstart="onModelDragStart(event)"
                     ondragend="onDragEnd(event)">
                    <div class="model-icon" style="background: #f59e0b">L</div>
                    <div class="model-info">
                        <div class="model-name">${config.displayName || id}</div>
                        <div class="model-provider">本地</div>
                    </div>
                    <button class="model-config-btn" onclick="showModelAPIConfig('${id}', event)">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            `;
            customList.innerHTML += html;
        }
    });
}

// ========== 中间组装台 ==========
function renderGroups() {
    const container = document.getElementById('groups-container');
    container.innerHTML = builderData.map((group, index) => `
        <div class="build-group"
             data-group-index="${index}"
             ondragover="onGroupDragOver(event, ${index})"
             ondragleave="onGroupDragLeave(event, ${index})"
             ondrop="onGroupDrop(event, ${index})">
            <div class="group-header">
                <input type="text" 
                    class="group-name-input" 
                    value="${group.name === '规划阶段' ? '' : group.name}"
                    placeholder="${group.name === '规划阶段' ? '规划阶段 (点击改名)' : '点击修改分组名'}"
                    onchange="updateGroupName(${index}, this.value || '新分组')">
                <button onclick="removeGroup(${index})" title="删除">
                    <i class="fas fa-trash" style="color:#ef4444;"></i>
                </button>
            </div>
            <div class="group-roles" id="group-roles-${index}">
                ${group.roles.map(roleId => {
                    const boundModel = bindings.get(roleId);
                    const hasApi = apiConfigs.has(roleId);
                    return `
                        <div class="role-in-group ${boundModel ? 'bound' : ''}"
                             data-role-id="${roleId}"
                             onclick="showRoleDetails('${roleId}')">
                            <i class="fas fa-user"></i>
                            <span>${getRoleName(roleId)}</span>
                            ${hasApi ? `<i class="fas fa-plug" style="color:#10b981; margin-left:auto;"></i>` : ''}
                            ${boundModel ? `
                                <span class="model-badge">${getModelName(boundModel)}</span>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
    
    const hasRoles = builderData.some(g => g.roles.length > 0);
    document.getElementById('drop-hint').style.display = hasRoles ? 'none' : 'block';
}

// ========== 拖拽逻辑 ==========
function onRoleDragStart(e) {
    const roleId = e.target.dataset.roleId;
    
    const roleData = RolePartsLibrary.getRoleDetailsEnhanced 
        ? RolePartsLibrary.getRoleDetailsEnhanced(roleId)
        : RolePartsLibrary.getRoleDetails(roleId);
    
    if ((!roleData || !roleData.name) && roleId.startsWith('user_')) {
        const userPart = RolePartsLibrary.userParts.find(roleId);
        if (userPart) {
            window.draggedItem = userPart;
        }
    } else {
        window.draggedItem = roleData || { id: roleId };
    }
    
    window.draggedType = 'role';
    e.target.classList.add('dragging');
    log(`开始拖拽角色: ${roleId}`);
}

function onModelDragStart(e) {
    const modelId = e.target.dataset.modelId;
    window.draggedItem = { id: modelId };
    window.draggedType = 'model';
    e.target.classList.add('dragging');
    log(`开始拖拽模型: ${modelId}`);
}

function onDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItem = null;
    draggedType = null;
}

function onGroupDragOver(e, groupIndex) {
    e.preventDefault();
    if (!draggedItem) return;
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    if (draggedType === 'role') {
        group.classList.add('drag-over');
    } else if (draggedType === 'model') {
        group.classList.add('drag-over-model');
    }
}

function onGroupDragLeave(e, groupIndex) {
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    group.classList.remove('drag-over', 'drag-over-model');
}

function onGroupDrop(e, groupIndex) {
    e.preventDefault();
    
    const group = document.querySelector(`.build-group[data-group-index="${groupIndex}"]`);
    group.classList.remove('drag-over', 'drag-over-model');
    
    if (!draggedItem) return;
    
    if (draggedType === 'role') {
        if (!builderData[groupIndex].roles.includes(draggedItem)) {
            builderData[groupIndex].roles.push(draggedItem);
            renderGroups();
            updateApiStatus(draggedItem);
            log(`角色 ${draggedItem} 添加到分组 ${groupIndex}`);
        }
    } else if (draggedType === 'model') {
        builderData[groupIndex].roles.forEach(roleId => {
            bindings.set(roleId, draggedItem);
        });
        updateBindingsUI();
        renderGroups();
        log(`模型 ${draggedItem} 绑定到分组 ${groupIndex} 的所有角色`);
    }
}

// ========== 绑定管理 ==========
function bindModelToRole(roleId, modelId) {
    bindings.set(roleId, modelId);
    updateBindingsUI();
    renderGroups();
    log(`绑定: ${roleId} → ${modelId}`);
}

function updateBindingsUI() {
    const list = document.getElementById('binding-list');
    const boundCount = document.getElementById('bound-roles-count');
    const usedModelsCount = document.getElementById('used-models-count');
    
    list.innerHTML = Array.from(bindings.entries()).map(([roleId, modelId]) => `
        <div class="binding-item">
            <span>${getRoleName(roleId)}</span>
            <span class="binding-arrow">→</span>
            <span style="color:${getModelColor(modelId)}">${getModelName(modelId)}</span>
        </div>
    `).join('');
    
    boundCount.textContent = bindings.size;
    const uniqueModels = new Set(Array.from(bindings.values()));
    usedModelsCount.textContent = uniqueModels.size;
}

// ========== 工具函数 ==========
function getRoleName(roleId) {
    return roleNames[roleId] || roleId;
}

function getModelName(modelId) {
    return modelNames[modelId] || modelId;
}

function getModelColor(modelId) {
    return modelColors[modelId] || '#94a3b8';
}

function addGroup() {
    const newGroup = {
        id: 'g' + Date.now(),
        name: '新分组',
        roles: []
    };
    builderData.push(newGroup);
    renderGroups();
    log('添加新分组');
}

function removeGroup(index) {
    builderData[index].roles.forEach(roleId => {
        bindings.delete(roleId);
    });
    builderData.splice(index, 1);
    renderGroups();
    updateBindingsUI();
    log(`删除分组 ${index}`);
}

function updateGroupName(index, name) {
    builderData[index].name = name;
}

function showRoleDetails(roleId) {
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

// ========== API配置管理 ==========
function showApiConfig(roleId, event) {
    if (event) event.stopPropagation();
    
    resetModalUI('role');
    const roleName = getRoleName(roleId);
    document.getElementById('config-role-name').value = roleName;
    document.getElementById('config-role-id').value = roleId;

    const config = apiConfigs.get(roleId) || {};
    fillModalForm(config, {
        type: 'openai',
        endpoint: '',
        key: '',
        model: '',
        temp: 0.7,
        prompt: ''
    });
    
    document.getElementById('api-config-modal').style.display = 'flex';
    log(`打开角色配置: ${roleName}`);
}

function addCustomModel() {
    resetModalUI('new_model');
    document.getElementById('config-role-id').value = 'NEW_CUSTOM_MODEL';
    document.getElementById('config-role-name').value = '';
    
    fillModalForm({}, {
        type: 'custom',
        endpoint: 'http://localhost:11434/v1/chat/completions',
        key: '',
        model: 'deepseek-r1:7b',
        temp: 0.7,
        prompt: ''
    });

    document.getElementById('api-config-modal').style.display = 'flex';
}

function showModelAPIConfig(modelId, event) {
    if (event) event.stopPropagation();

    resetModalUI('edit_model');
    const modelName = getModelName(modelId);
    document.getElementById('config-role-name').value = modelName;
    document.getElementById('config-role-id').value = modelId;

    const config = (window.modelAPIConfigs && window.modelAPIConfigs.get(modelId)) || {};
    
    const defaults = {
        type: modelId.includes('deepseek') ? 'deepseek' : 'openai',
        endpoint: modelId.includes('deepseek') ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
        key: '',
        model: modelId,
        temp: 0.7,
        prompt: ''
    };
    
    fillModalForm(config, defaults);
    document.getElementById('api-config-modal').style.display = 'flex';
}

function resetModalUI(mode) {
    const titleEl = document.querySelector('#api-config-modal .modal-header h3');
    const labelEl = document.querySelector('label[for="config-role-name"]');
    const nameInput = document.getElementById('config-role-name');
    const keyInput = document.getElementById('api-key');
    
    const form = document.getElementById('api-config-form');
    if (form) form.reset();

    if (mode === 'role') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-user-cog"></i> 角色API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-user"></i> 角色名称`;
        if(nameInput) nameInput.readOnly = true;
        if(keyInput) keyInput.placeholder = "sk-...";
    } 
    else if (mode === 'new_model') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-plus-circle"></i> 添加自定义模型`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型显示名称`;
        if(nameInput) nameInput.readOnly = false;
        if(keyInput) keyInput.placeholder = "本地模型可留空 (默认 ollama)";
    } 
    else if (mode === 'edit_model') {
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-server"></i> 模型API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型名称`;
        if(nameInput) nameInput.readOnly = true;
        if(keyInput) keyInput.placeholder = "本地模型可留空";
    }
}

function fillModalForm(config, defaults) {
    document.getElementById('api-type').value = config.type || defaults.type;
    document.getElementById('api-endpoint').value = config.endpoint || defaults.endpoint;
    document.getElementById('api-key').value = config.apiKey || defaults.key;
    document.getElementById('api-model').value = config.model || defaults.model;
    document.getElementById('api-temperature').value = config.temperature || defaults.temp;
    document.getElementById('api-system-prompt').value = config.systemPrompt || defaults.prompt;
    
    const tempVal = document.getElementById('temp-value');
    if(tempVal) tempVal.textContent = document.getElementById('api-temperature').value;
}

async function saveApiConfig() {
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
    if (!config.apiKey && !isLocal) {
        alert('请输入 API 密钥');
        return;
    }
    if (!config.apiKey && isLocal) config.apiKey = 'sk-local';

    if (isNewModel) {
        const newId = `custom_${Date.now()}`;
        
        if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
        window.modelAPIConfigs.set(newId, config);
        
        renderAICategories();
        log(`✨ 已添加自定义模型: ${config.displayName}`);
    } 
    else {
        const isModelID = configId.startsWith('custom_') || configId.startsWith('deepseek') || configId.startsWith('gpt') || configId.startsWith('openai');
        
        if (isModelID) {
            window.modelAPIConfigs.set(configId, config);
            log(`✅ 模型配置已更新`);
            renderAICategories();
        } else {
            apiConfigs.set(configId, config);
            renderPartsGrid();
            log(`✅ 角色配置已更新`);
        }
    }

    saveAllAPIConfigs();
    hideApiConfigModal();
}

function saveAllAPIConfigs() {
    const allConfigs = {
        roles: Object.fromEntries(apiConfigs.entries()),
        models: Object.fromEntries(modelAPIConfigs.entries())
    };
    localStorage.setItem('workflow_api_configs_all', JSON.stringify(allConfigs));
}

function loadAllAPIConfigs() {
    const saved = localStorage.getItem('workflow_api_configs_all');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            if (parsed.roles) {
                Object.keys(parsed.roles).forEach(id => apiConfigs.set(id, parsed.roles[id]));
            }
            
            if (parsed.models) {
                if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
                Object.keys(parsed.models).forEach(id => {
                    window.modelAPIConfigs.set(id, parsed.models[id]);
                });
            }
            log(`已从本地恢复配置`);
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

function hideApiConfigModal() {
    document.getElementById('api-config-modal').style.display = 'none';
}

async function testApiConnection() {
    const endpoint = document.getElementById('api-endpoint').value;
    const key = document.getElementById('api-key').value;
    const model = document.getElementById('api-model').value;
    
    if (!endpoint) return alert("请先填写 API 端点");
    
    const btn = document.querySelector('.btn-secondary[onclick="testApiConnection()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 测试中...';
    btn.disabled = true;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key || 'ollama'}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });

        if (response.ok) {
            alert("✅ 连接成功！API 响应正常。");
        } else {
            const err = await response.text();
            alert(`❌ 连接失败 (${response.status}):\n${err}`);
        }
    } catch (e) {
        alert(`❌ 网络错误:\n${e.message}\n请检查地址是否正确，或是否需要处理 CORS 跨域。`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========== 炼丹炉功能 ==========
function initDropZone() {
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint) return;
    
    if (!window.alchemyState) {
        window.alchemyState = {
            materials: [],
            isProcessing: false
        };
    }
    
    dropHint.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropHint.classList.add('drag-over');
    });
    
    dropHint.addEventListener('dragleave', (e) => {
        dropHint.classList.remove('drag-over');
    });
    
    dropHint.addEventListener('drop', (e) => {
        e.preventDefault();
        dropHint.classList.remove('drag-over');
        
        const item = window.draggedItem;
        const type = window.draggedType;
        
        if (!item || !type) return;
        
        window.alchemyState.materials.push({
            type: type,
            id: item,
            timestamp: Date.now()
        });
        
        updateFurnaceDisplay();
        checkAlchemyReady();
    });
}

function updateFurnaceDisplay() {
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint || !window.alchemyState) return;
    
    const count = window.alchemyState.materials.length;
    const p = dropHint.querySelector('p') || dropHint;
    
    if (window.alchemyState.isProcessing) {
        p.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> 正在铸造中...`;
    } else if (count === 0) {
        p.innerHTML = `<i class="fas fa-arrow-down"></i> 拖入 [角色] + [模型]`;
    } else if (count === 1) {
        const item = window.alchemyState.materials[0];
        const typeText = item.type === 'role' ? '角色' : '模型';
        p.innerHTML = `<i class="fas fa-plus"></i> 已放入${typeText}，还差一个...`;
    }
}

function checkAlchemyReady() {
    if (!window.alchemyState) return;
    
    const materials = window.alchemyState.materials;
    const hasRole = materials.some(m => m.type === 'role');
    const hasModel = materials.some(m => m.type === 'model');
    
    if (hasRole && hasModel) {
        const roleMaterial = materials.find(m => m.type === 'role');
        const modelMaterial = materials.find(m => m.type === 'model');
        startAIAlchemy(roleMaterial.id, modelMaterial.id);
    }
}

async function startAIAlchemy(roleItem, modelItem) {
    const roleId = roleItem.id || (roleItem.data && roleItem.data.id) || roleItem;
    const modelId = modelItem.id || (modelItem.data && modelItem.data.id) || modelItem;
    
    const roleName = getRoleName(roleId);
    const modelName = getModelName(modelId);
    
    log(`🔥 检查炼丹条件: ${roleName} + ${modelName}`);
    
    const isCloudModel = !modelId.startsWith('custom_');
    const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
    
    if (!isCloudModel && (!modelConfig || !modelConfig.endpoint)) {
        log(`❌ 失败：模型 [${modelName}] 未配置API地址`);
        alert(`请先为 [${modelName}] 配置API地址`);
        
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
        updateFurnaceDisplay();
        return;
    }
    
    log(`✅ 炼丹条件满足，开始炼制...`);
    
    if (window.AlchemyAnimation) {
        try {
            const roleData = { name: roleName, icon: 'fa-user' };
            const modelData = { 
                id: modelId || 'unknown',
                name: modelName || '未知模型' 
            };
            window.AlchemyAnimation.startAlchemy(roleData, modelData);
        } catch (e) {
            console.warn('动画启动失败:', e);
        }
    }
    
    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();
    
    try {
        let rawRole = null;
        if (window.RolePartsLibrary && RolePartsLibrary.getRoleDetailsEnhanced) {
            rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
        }
        if (!rawRole && roleId.startsWith('user_') && RolePartsLibrary.userParts) {
            rawRole = RolePartsLibrary.userParts.find(roleId);
        }
        if (!rawRole) rawRole = { name: roleName, id: roleId, tags: [] };
        
        log(`🤖 调用AI API进行角色增强...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

        const newRoleName = enhancedData.name || `${roleName} (增强版)`;
        
        if (window.RolePartsLibrary && RolePartsLibrary.userParts) {
            RolePartsLibrary.userParts.create({
                name: newRoleName,
                category: 'custom',
                icon: rawRole.icon || 'fa-robot',
                color: '#8b5cf6',
                tags: enhancedData.tags || [],
                description: enhancedData.description || `由 ${modelName} 增强`,
                capabilities: enhancedData.capabilities || { core: [] },
                apiTemplate: {
                    systemPrompt: `你是一个${newRoleName}。${enhancedData.description}`,
                    temperature: 0.7,
                    preferredModels: [modelId]
                },
                metadata: {
                    sourceRoleId: roleId,
                    enhancedByModel: modelId,
                    bornTime: new Date().toISOString()
                }
            });
        }
        
        log(`✅ 炼丹成功！新角色 [${newRoleName}] 已生成`);
        
        if (roleId.startsWith('user_') && RolePartsLibrary.userParts) {
            RolePartsLibrary.userParts.delete(roleId);
            log(`♻️ 原料 [${roleName}] 已被消耗`);
        }
        
        renderPartsGrid();
        
        setTimeout(() => {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
            updateFurnaceDisplay();
        }, 2000);
        
    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
        updateFurnaceDisplay();
    }
}

async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    if (isLocal) {
        log(`🔌 使用本地模型直连...`);
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        
        if (!modelConfig) throw new Error("找不到本地模型配置");
        
        const simplePrompt = `请为角色 [${roleInfo.name}] 生成JSON定义。
要求：
1. description: 限制在30字以内。
2. tags: 严格限制为5个短词组。
3. 不要任何解释，直接返回JSON对象。

模板示例：
{
  "name": "${roleInfo.name}",
  "description": "负责统筹拍摄现场，指导演员表演。",
  "tags": ["场面调度", "剧本分析", "演员指导", "镜头语言", "团队管理"]
}`;
        
        try {
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelConfig.model,
                    messages: [{ role: 'user', content: simplePrompt }],
                    stream: false
                })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`本地模型连接失败 (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const content = data.message ? data.message.content : (data.choices && data.choices[0] ? data.choices[0].message.content : null);
            
            if (!content) throw new Error("Ollama 返回内容为空");
            
            enhancedData = parseJSONSafe(content);
        } catch (err) {
            console.error("本地炼丹失败:", err);
            throw err;
        }
    } 
    else {
        log(`🤖 请求云端炼丹 (Prompt 受保护)...`);
        try {
            enhancedData = await alchemyAPI.forge(roleInfo.name, modelId);
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        enhancedData = {
            name: `${roleInfo.name} (生成失败)`,
            description: "AI未返回有效格式，请检查模型输出或Prompt。",
            tags: ["失败"],
            capabilities: { core: [] }
        };
    }

    if (!enhancedData.name) {
        enhancedData.name = `${roleInfo.name} (AI版)`;
    }

    return enhancedData;
}

function parseJSONSafe(text) {
    if (!text) return null;
    
    try {
        return JSON.parse(text);
    } catch (e) {
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlock) {
            try { return JSON.parse(codeBlock[1]); } catch(e){}
        }

        const jsonBlock = text.match(/\{[\s\S]*\}/);
        if (jsonBlock) {
            try { return JSON.parse(jsonBlock[0]); } catch(e){}
        }
        
        console.error("无法解析JSON，返回默认结构");
        return {
            name: "生成角色", 
            description: "AI返回内容无法解析，请检查模型输出。",
            tags: ["解析失败"]
        };
    }
}

// ========== 工作流执行 ==========
async function executeWorkflow() {
    log('开始执行工作流...');
    
    const hasRoles = builderData.some(group => group.roles.length > 0);
    if (!hasRoles) {
        alert('请先添加角色到工作流！');
        return;
    }
    
    const missingAPIs = [];
    builderData.forEach(group => {
        group.roles.forEach(roleId => {
            if (!apiConfigs.has(roleId)) {
                missingAPIs.push(roleId);
            }
        });
    });
    
    if (missingAPIs.length > 0) {
        const confirmRun = confirm(`${missingAPIs.length}个角色未配置API，是否继续模拟执行？`);
        if (!confirmRun) return;
    }
    
    document.getElementById('run-status-text').textContent = '执行中...';
    document.getElementById('btn-run-all').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    
    document.getElementById('results-panel').style.display = 'flex';
    
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = '';
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    builderData.forEach(group => {
        totalTasks += group.roles.length;
    });
    
    for (let groupIndex = 0; groupIndex < builderData.length; groupIndex++) {
        const group = builderData[groupIndex];
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'result-item';
        groupHeader.innerHTML = `
            <div class="result-header">
                <div class="result-role">📁 ${group.name}</div>
                <div class="result-time">${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="result-content">开始执行本组任务...</div>
        `;
        resultsContent.appendChild(groupHeader);
        
        for (let roleIndex = 0; roleIndex < group.roles.length; roleIndex++) {
            const roleId = group.roles[roleIndex];
            const modelId = bindings.get(roleId);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await simulateRoleExecution(roleId, modelId);
            
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${result.success ? '' : 'error'}`;
            resultItem.innerHTML = `
                <div class="result-header">
                    <div class="result-role">👤 ${getRoleName(roleId)}</div>
                    <div class="result-model">${modelId ? getModelName(modelId) : '未绑定'}</div>
                </div>
                <div class="result-content">${result.message}</div>
            `;
            resultsContent.appendChild(resultItem);
            
            resultsContent.scrollTop = resultsContent.scrollHeight;
            
            completedTasks++;
            const progress = Math.round((completedTasks / totalTasks) * 100);
            document.getElementById('progress-fill').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `${progress}%`;
        }
    }
    
    document.getElementById('run-status-text').textContent = '执行完成';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    log('工作流执行完成');
}

async function simulateRoleExecution(roleId, modelId) {
    const roleName = getRoleName(roleId);
    const hasAPI = apiConfigs.has(roleId);
    
    const tasks = {
        'frontend_expert': '实现了React组件，优化了页面性能',
        'backend_architect': '设计了API接口，完成了数据库设计',
        'ui_designer': '完成了UI设计稿，创建了设计系统',
        'copywriter': '撰写了营销文案，优化了SEO内容',
        'data_analyst': '分析了用户数据，生成了报表',
        'devops_engineer': '部署了应用，配置了监控'
    };
    
    const success = Math.random() > 0.2;
    const task = tasks[roleId] || '完成了任务';
    
    return {
        success,
        message: hasAPI 
            ? `✅ ${roleName} 使用 ${modelId ? getModelName(modelId) : 'AI'} ${task}`
            : `⚠️ ${roleName} (未配置API) 模拟${task}`
    };
}

function toggleResultsPanel() {
    const panel = document.getElementById('results-panel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

function stopExecution() {
    log('停止执行工作流');
    document.getElementById('run-status-text').textContent = '已停止';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
}

// ========== 核心功能 ==========
function resetAll() {
    if (confirm('确定要重置所有数据吗？这将清除所有工作流和绑定。')) {
        builderData = [{ id: 'g1', name: '新工作流', roles: [] }];
        bindings.clear();
        apiConfigs.clear();
        renderGroups();
        updateBindingsUI();
        renderPartsGrid();
        log('系统已重置');
    }
}

function exportConfig() {
    const workflowName = document.getElementById('workflow-name').value;
    
    const config = {
        workflow: {
            name: workflowName,
            groups: builderData,
            bindings: Array.from(bindings.entries())
        },
        apiConfigs: Array.from(apiConfigs.entries()).map(([roleId, config]) => {
            const safeConfig = { ...config };
            if (safeConfig.apiKey) {
                safeConfig.apiKey = '***MASKED***';
            }
            return [roleId, safeConfig];
        }),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflowName || 'workflow'}-config.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    log('配置已导出');
}

function simulateInteraction() {
    log('开始模拟交互...');
    
    setTimeout(() => {
        if (builderData[0]) {
            builderData[0].roles.push('frontend_expert');
            builderData[0].roles.push('data_analyst');
            renderGroups();
            log('模拟：添加了2个角色到分组');
        }
    }, 500);
    
    setTimeout(() => {
        bindModelToRole('frontend_expert', 'deepseek-chat');
        bindModelToRole('data_analyst', 'gpt4');
        log('模拟：绑定了2个模型');
    }, 1000);
    
    setTimeout(() => {
        addGroup();
        log('模拟：添加了新分组');
    }, 1500);
    
    setTimeout(() => {
        if (!apiConfigs.has('ui_designer')) {
            const uiConfig = {
                type: 'openai',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4',
                temperature: 0.9,
                systemPrompt: '你是一个专业的UI设计师，擅长Figma和Sketch等设计工具。'
            };
            apiConfigs.set('ui_designer', uiConfig);
            log('模拟：为UI设计师配置了API');
        }
    }, 2000);
}

// ========== 垃圾桶功能 ==========
function initTrashCan() {
    const style = document.createElement('style');
    style.innerHTML = `
        #trash-can {
            position: fixed;
            left: 30px;
            bottom: 30px;
            width: 70px;
            height: 70px;
            background: rgba(30, 41, 59, 0.8);
            border: 2px dashed #475569;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(4px);
            user-select: none;
        }
        #trash-can i { font-size: 24px; margin-bottom: 4px; }
        #trash-can span { font-size: 10px; }
        
        #trash-can.drag-over {
            background: rgba(239, 68, 68, 0.9);
            border-color: #fca5a5;
            transform: scale(1.15) rotate(-5deg);
            color: white;
            box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.5);
        }
        
        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
        }
        .shaking { animation: shake 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);

    const trash = document.createElement('div');
    trash.id = 'trash-can';
    trash.innerHTML = `<i class="fas fa-trash-alt"></i><span>粉碎机</span>`;
    document.body.appendChild(trash);

    trash.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (isValidTrashItem()) {
            trash.classList.add('drag-over');
        }
    });

    trash.addEventListener('dragleave', () => {
        trash.classList.remove('drag-over');
    });

    trash.addEventListener('drop', (e) => {
        e.preventDefault();
        trash.classList.remove('drag-over');
        if (isValidTrashItem()) {
            handleTrashDelete();
        }
    });
}

function isValidTrashItem() {
    if (window.draggedType !== 'role' || !window.draggedItem) return false;
    const roleId = window.draggedItem.id || window.draggedItem;
    return typeof roleId === 'string' && roleId.startsWith('user_');
}

function handleTrashDelete() {
    const roleId = window.draggedItem.id || window.draggedItem;
    const roleName = window.draggedItem.name || '该角色';

    if (confirm(`⚠️ 确定要粉碎 [${roleName}] 吗？\n此操作无法撤销。`)) {
        const success = RolePartsLibrary.userParts.delete(roleId);
        
        if (success) {
            const trash = document.getElementById('trash-can');
            trash.classList.add('shaking');
            setTimeout(() => trash.classList.remove('shaking'), 500);
            log(`🗑️ 已粉碎角色: ${roleId}`);
            renderPartsGrid();
        } else {
            alert('删除失败，未找到该零件');
        }
    }
}

// ========== 全局事件绑定 ==========
function bindGlobalEvents() {
    document.getElementById('api-config-modal').addEventListener('click', (e) => {
        if (e.target.id === 'api-config-modal') {
            hideApiConfigModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideApiConfigModal();
        }
        
        if (e.ctrlKey && e.key === '`') {
            e.preventDefault();
            toggleDebugPanel();
        }
        
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            clearDebugLog();
        }
    });
}

// ========== 其他功能 ==========
function addNewCategory() {
    const name = prompt('请输入新角色的名称 (例如：导演、产品经理):');
    if (!name || !name.trim()) return;
    
    if (!window.RolePartsLibrary || !window.RolePartsLibrary.userParts) {
        alert('系统模块未加载完全，请刷新重试');
        return;
    }
    
    try {
        const newPartId = RolePartsLibrary.userParts.create({
            name: name.trim(),
            category: 'custom',
            icon: 'fa-user-tag',
            color: '#94a3b8',
            tags: ['待定义'],
            description: '这是一个初始概念角色，请拖入炼丹炉结合AI模型生成详细技能。'
        });
        
        renderPartsGrid();
        log(`✨ 已创建白板角色: ${name} (ID: ${newPartId})，请将其拖入炼丹炉铸造。`);
    } catch (error) {
        console.error('创建失败:', error);
        alert(`创建失败: ${error.message}`);
    }
}

function toggleSearch() {
    log('切换搜索功能');
}

function refreshModels() {
    log('刷新AI模型列表');
    renderAICategories();
}

// ========== 调试系统 ==========
class DebugManager {
    constructor() {
        this.container = document.getElementById('debug-float-container');
        this.handle = document.getElementById('debug-handle');
        this.badge = document.getElementById('debug-badge');
        this.debugCount = document.getElementById('debug-count');
        this.debugLog = document.getElementById('debug-log');
        this.pinBtn = document.querySelector('.debug-pin');
        
        this.messageCount = 0;
        this.isDragging = false;
        this.isPinned = false;
        this.isVisible = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.initDragEvents();
        this.initClickEvents();
        this.initAutoHide();
        this.log('调试系统已初始化');
    }
    
    initDragEvents() {
        this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        this.handle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrag(e.touches[0]);
        });
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches[0]) this.onDrag(e.touches[0]);
        });
        document.addEventListener('touchend', () => this.stopDrag());
    }
    
    initClickEvents() {
        this.handle.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.togglePanel();
            }
        });
        
        const panel = this.container.querySelector('.debug-panel');
        panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    initAutoHide() {
        this.container.addEventListener('mouseleave', (e) => {
            if (!this.isPinned && !this.isDragging) {
                this.hidePanel();
            }
        });
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.handle.classList.add('dragging');
        
        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        if (!this.isPinned) {
            this.showPanel();
        }
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
        
        this.constrainToWindow();
    }
    
    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handle.classList.remove('dragging');
        this.applyEdgeSnap();
    }
    
    constrainToWindow() {
        const rect = this.container.getBoundingClientRect();
        const containerRect = this.container.parentElement.getBoundingClientRect();
        
        const minX = 0;
        const maxX = containerRect.width - rect.width;
        const minY = 0;
        const maxY = containerRect.height - rect.height;
        
        let left = parseInt(this.container.style.left);
        let top = parseInt(this.container.style.top);
        
        if (left < minX) this.container.style.left = minX + 'px';
        if (left > maxX) this.container.style.left = maxX + 'px';
        if (top < minY) this.container.style.top = minY + 'px';
        if (top > maxY) this.container.style.top = maxY + 'px';
    }
    
    applyEdgeSnap() {
        const rect = this.container.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const snapThreshold = 50;
        
        this.container.classList.remove('left-edge', 'right-edge', 'top-edge', 'bottom-edge');
        
        if (rect.left < snapThreshold) {
            this.container.classList.add('left-edge');
            this.container.style.left = '10px';
        } else if (windowWidth - rect.right < snapThreshold) {
            this.container.classList.add('right-edge');
            this.container.style.right = '10px';
            this.container.style.left = 'auto';
        }
        
        if (rect.top < snapThreshold + 60) {
            this.container.classList.add('top-edge');
            this.container.style.top = '70px';
        } else if (windowHeight - rect.bottom < snapThreshold) {
            this.container.classList.add('bottom-edge');
            this.container.style.bottom = '20px';
            this.container.style.top = 'auto';
        }
    }
    
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }
    
    showPanel() {
        this.isVisible = true;
        this.container.classList.add('pinned');
        this.isPinned = true;
        this.pinBtn.classList.add('pinned');
    }
    
    hidePanel() {
        if (!this.isPinned) {
            this.isVisible = false;
            this.container.classList.remove('pinned');
        }
    }
    
    togglePinDebugPanel() {
        this.isPinned = !this.isPinned;
        this.container.classList.toggle('pinned', this.isPinned);
        this.pinBtn.classList.toggle('pinned', this.isPinned);
        
        if (!this.isPinned && !this.isDragging) {
            this.hidePanel();
        }
    }
    
    log(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${time}] ${message}`;
        
        this.debugLog.appendChild(logEntry);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
        
        this.messageCount++;
        this.updateCounters();
        
        if (message.toLowerCase().includes('error') || 
            message.includes('错误') || 
            message.includes('失败')) {
            if (!this.isVisible) {
                this.showPanel();
            }
        }
    }
    
    clearDebugLog(e) {
        if (e) e.stopPropagation();
        
        if (confirm('确定要清空调试日志吗？')) {
            this.debugLog.innerHTML = '';
            this.messageCount = 0;
            this.updateCounters();
            this.log('调试日志已清空');
        }
    }
    
    updateCounters() {
        this.badge.textContent = this.messageCount > 0 ? this.messageCount : '';
        this.debugCount.textContent = `(${this.messageCount})`;
    }
}

let debugManager = null;

function log(message) {
    if (!debugManager) {
        debugManager = new DebugManager();
    }
    debugManager.log(message);
}

function toggleDebugPanel() {
    if (debugManager) {
        debugManager.togglePanel();
    }
}

function togglePinDebugPanel() {
    if (debugManager) {
        debugManager.togglePinDebugPanel();
    }
}

function clearDebugLog(e) {
    if (debugManager) {
        debugManager.clearDebugLog(e);
    }
}

// ========== 全局函数挂载 ==========
window.addNewCategory = addNewCategory;
window.toggleSearch = toggleSearch;
window.addGroup = addGroup;
window.removeGroup = removeGroup;
window.updateGroupName = updateGroupName;
window.addCustomModel = addCustomModel;
window.refreshModels = refreshModels;
window.showRoleDetails = showRoleDetails;
window.showModelAPIConfig = showModelAPIConfig;
window.showApiConfig = showApiConfig;
window.toggleAICategory = toggleAICategory;
window.saveApiConfig = saveApiConfig;
window.testApiConnection = testApiConnection;
window.hideApiConfigModal = hideApiConfigModal;
window.onRoleDragStart = onRoleDragStart;
window.onModelDragStart = onModelDragStart;
window.onDragEnd = onDragEnd;
window.onGroupDragOver = onGroupDragOver;
window.onGroupDragLeave = onGroupDragLeave;
window.onGroupDrop = onGroupDrop;
window.executeWorkflow = executeWorkflow;
window.stopExecution = stopExecution;
window.toggleResultsPanel = toggleResultsPanel;
window.resetAll = resetAll;
window.exportConfig = exportConfig;
window.simulateInteraction = simulateInteraction;

console.log("✅ 已将核心函数挂载到全局 window");