import { chatAPI, systemAPI, alchemyAPI } from './api.js'; // 引入所有需要的 API// 全局炉子状态
window.alchemyState = window.alchemyState || {
    materials: [],
    isProcessing: false
};
 // 使用 window 对象，避免重复声明
if (!window.bindings) window.bindings = new Map();
if (!window.apiConfigs) window.apiConfigs = new Map();
if (!window.builderData) window.builderData = [];
if (!window.draggedItem) window.draggedItem = null;
if (!window.draggedType) window.draggedType = null;
if (!window.roleNames) window.roleNames = {};
if (!window.modelNames) window.modelNames = {};
if (!window.modelColors) window.modelColors = {};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadTestData();
    renderPartsGrid();
    renderAICategories();
    renderGroups();
    updateBindingsUI();
    initTrashCan(); // <--- 添加这一行
    loadAllAPIConfigs();
    // 绑定按钮事件
    document.getElementById('btn-reset').onclick = resetAll;
    document.getElementById('btn-export').onclick = exportConfig;
    document.getElementById('btn-simulate').onclick = simulateInteraction;
    // 在DOMContentLoaded事件中添加
    document.getElementById('btn-run-all').onclick = executeWorkflow;
    document.getElementById('btn-stop').onclick = stopExecution;
    // 绑定全局事件
    bindGlobalEvents();
    renderAICategories();
    log('系统初始化完成');
});

// ========== 测试数据加载 ==========
function loadTestData() {
    // 确保变量存在且是Map
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
    
    // 初始化测试绑定
    bindings.set('frontend_expert', 'deepseek_v3');
    bindings.set('data_analyst', 'gpt4');
    
    // 加载测试API配置
    loadTestApiConfigs();
}

function loadTestApiConfigs() {
    // 测试API配置
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

// 替换 renderPartsGrid() 函数
function renderPartsGrid() {
    const grid = document.getElementById('parts-grid');
    
    // 从零件库获取数据
    const allParts = RolePartsLibrary.getAllPartsEnhanced
        ? RolePartsLibrary.getAllPartsEnhanced() 
        : RolePartsLibrary.getAllParts();
    
    grid.innerHTML = allParts.map(part => {
        const hasApi = apiConfigs.has(part.id);
        return `
        <div class="part-card" 
             onclick="showRoleDetails('${part.id}')"  <-- 加上这行
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
// 修改 main.js 中的 renderAICategories
async function renderAICategories() {
    const container = document.getElementById('ai-categories');
    
    try {
        // 1. 从后台获取真实的上架模型
        // 注意：这里需要 import { systemAPI } from './api.js'
        const realModels = await systemAPI.getModels(); 
        
        // 2. 转换数据格式适配 UI
        const categories = {
            'openai': { id: 'openai', name: 'OpenAI', icon: 'fa-robot', models: [] },
            'google': { id: 'google', name: 'Google', icon: 'fa-google', models: [] },
            'deepseek': { id: 'deepseek', name: 'DeepSeek', icon: 'fa-code', models: [] },
            'anthropic': { id: 'anthropic', name: 'Anthropic', icon: 'fa-brain', models: [] }
        };

        realModels.forEach(m => {
            if (categories[m.provider]) {
                categories[m.provider].models.push({
                    id: m.id, // ✅ 这里就是数据库的数字ID了
                    name: m.display_name,
                    provider: m.provider,
                    color: '#10b981' // 可以根据 provider 给不同颜色
                });
            }
        });

        // 3. 渲染 HTML (只渲染有模型的分类)
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

    } catch (err) {
        console.error("加载模型失败:", err);
        container.innerHTML = '<div class="p-4 text-gray-500">无法加载模型列表，请检查后台连接</div>';
    }
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
    
    // 更新拖拽提示显示
    const hasRoles = builderData.some(g => g.roles.length > 0);
    document.getElementById('drop-hint').style.display = hasRoles ? 'none' : 'block';
}
// ========== 拖拽逻辑 ==========
function onRoleDragStart(e) {
    const roleId = e.target.dataset.roleId;
    
    // 获取完整角色数据（增强版方法）
    const roleData = RolePartsLibrary.getRoleDetailsEnhanced 
        ? RolePartsLibrary.getRoleDetailsEnhanced(roleId)
        : RolePartsLibrary.getRoleDetails(roleId);
    
    // 如果没有获取到，尝试从用户零件库找
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
    
    // 直接保存ID，暂时不处理详情
    window.draggedItem = { id: modelId };
    window.draggedType = 'model';
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'link';
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
        // 添加角色到分组
        if (!builderData[groupIndex].roles.includes(draggedItem)) {
            builderData[groupIndex].roles.push(draggedItem);
            renderGroups();
            updateApiStatus(draggedItem);
            log(`角色 ${draggedItem} 添加到分组 ${groupIndex}`);
        }
    } else if (draggedType === 'model') {
        // 绑定模型到整个分组
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
    
    // 更新绑定列表
    list.innerHTML = Array.from(bindings.entries()).map(([roleId, modelId]) => `
        <div class="binding-item">
            <span>${getRoleName(roleId)}</span>
            <span class="binding-arrow">→</span>
            <span style="color:${getModelColor(modelId)}">${getModelName(modelId)}</span>
        </div>
    `).join('');
    
    // 更新统计
    boundCount.textContent = bindings.size;
    const uniqueModels = new Set(Array.from(bindings.values()));
    usedModelsCount.textContent = uniqueModels.size;
}

// ========== 工具函数 ==========
function toggleCategory(categoryId) {
    const item = document.querySelector(`.category-item`);
    item.classList.toggle('expanded');
}

function toggleAICategory(categoryId) {
    const item = document.querySelector(`.ai-category`);
    item.classList.toggle('expanded');
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
    // 移除前先解绑所有角色
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

function filterBySubCategory(subCategory) {
    log(`过滤子分类: ${subCategory}`);
    // 实现过滤逻辑
}

// 升级版 showRoleDetails
function showRoleDetails(roleId) {
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

function getRoleName(roleId) {
    return roleNames[roleId] || roleId;
}

function getModelName(modelId) {
    return modelNames[modelId] || modelId;
}

function getModelColor(modelId) {
    return modelColors[modelId] || '#94a3b8';
}
// 检查模型是否有API配置
function checkModelAPIConfig(modelId) {
    // 先检查专门的模型配置存储
    if (window.modelAPIConfigs && window.modelAPIConfigs.has(modelId)) {
        return true;
    }
    
    // 检查全局API密钥
    if (modelId.includes('deepseek')) {
        const deepseekKey = localStorage.getItem('deepseek_api_key');
        return !!deepseekKey;
    } else if (modelId.includes('gpt')) {
        const openaiKey = localStorage.getItem('openai_api_key');
        return !!openaiKey;
    }
    
    return false;
}

// 模型API配置的存储
if (!window.modelAPIConfigs) {
    window.modelAPIConfigs = new Map();
}
// ==========================================
// 统一弹窗管理 (角色/模型/新建)
// ==========================================

// 1. 左侧入口：配置角色 API
function showApiConfig(roleId, event) {
    if (event) event.stopPropagation();
    
    // --- 界面重置为 [角色模式] ---
    resetModalUI('role');
    const roleName = getRoleName(roleId);
    document.getElementById('config-role-name').value = roleName;
    document.getElementById('config-role-id').value = roleId;

    // --- 加载角色配置 ---
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

// 2. 右侧加号入口：新建自定义模型
function addCustomModel() {
    // --- 界面重置为 [新建模型模式] ---
    resetModalUI('new_model');
    document.getElementById('config-role-id').value = 'NEW_CUSTOM_MODEL';
    document.getElementById('config-role-name').value = ''; // 空白供输入

    // --- 填入默认 Ollama 配置 ---
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

// 3. 右侧卡片入口：配置已有模型 API
function showModelAPIConfig(modelId, event) {
    if (event) event.stopPropagation();

    // --- 界面重置为 [编辑模型模式] ---
    resetModalUI('edit_model');
    const modelName = getModelName(modelId);
    document.getElementById('config-role-name').value = modelName;
    document.getElementById('config-role-id').value = modelId;

    // --- 加载模型配置 ---
    const config = (window.modelAPIConfigs && window.modelAPIConfigs.get(modelId)) || {};
    
    // 智能推断默认值 (根据 ID 推断是 DeepSeek 还是 GPT)
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

// ==========================================
// 辅助函数 (内部使用)
// ==========================================

// 重置弹窗 UI 状态 (健壮版)
function resetModalUI(mode) {
    // 1. 安全获取元素
    const titleEl = document.querySelector('#api-config-modal .modal-header h3');
    const labelEl = document.querySelector('label[for="config-role-name"]');
    const nameInput = document.getElementById('config-role-name');
    const keyInput = document.getElementById('api-key');
    
    // 2. 清空表单
    const form = document.getElementById('api-config-form');
    if (form) form.reset();

    // 3. 根据模式设置内容 (加了非空检查)
    if (mode === 'role') {
        // 角色模式
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-user-cog"></i> 角色API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-user"></i> 角色名称`;
        if(nameInput) {
            nameInput.readOnly = true;
            nameInput.placeholder = "";
        }
        if(keyInput) keyInput.placeholder = "sk-...";
    } 
    else if (mode === 'new_model') {
        // 新建模型模式
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-plus-circle"></i> 添加自定义模型`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型显示名称`;
        if(nameInput) {
            nameInput.readOnly = false; // 允许输入名字
            nameInput.placeholder = "例如: My Local DeepSeek";
        }
        if(keyInput) keyInput.placeholder = "本地模型可留空 (默认 ollama)";
    } 
    else if (mode === 'edit_model') {
        // 编辑模型模式
        if(titleEl) titleEl.innerHTML = `<i class="fas fa-server"></i> 模型API配置`;
        if(labelEl) labelEl.innerHTML = `<i class="fas fa-tag"></i> 模型名称`;
        if(nameInput) {
            nameInput.readOnly = true; // 名字不可改
            nameInput.placeholder = "";
        }
        if(keyInput) keyInput.placeholder = "本地模型可留空";
    }
}

// 填充表单数据
function fillModalForm(config, defaults) {
    document.getElementById('api-type').value = config.type || defaults.type;
    document.getElementById('api-endpoint').value = config.endpoint || defaults.endpoint;
    document.getElementById('api-key').value = config.apiKey || defaults.key;
    document.getElementById('api-model').value = config.model || defaults.model;
    document.getElementById('api-temperature').value = config.temperature || defaults.temp;
    document.getElementById('api-system-prompt').value = config.systemPrompt || defaults.prompt;
    
    // 更新滑块显示
    const tempVal = document.getElementById('temp-value');
    if(tempVal) tempVal.textContent = document.getElementById('api-temperature').value;
}

// ==========================================
// 保存逻辑 (统一处理)
// ==========================================

// 辅助：把新模型加到界面最上面
function appendCustomModelToUI(id, name) {
    const container = document.getElementById('ai-categories');
    const html = `
    <div class="ai-category expanded" style="border-left: 3px solid #f59e0b;">
        <div class="ai-category-header" onclick="this.parentElement.classList.toggle('expanded')">
            <i class="fas fa-server"></i> <span>自定义: ${name}</span>
        </div>
        <div class="ai-models">
            <div class="ai-model-card" draggable="true" data-model-id="${id}" 
                 ondragstart="onModelDragStart(event)" ondragend="onDragEnd(event)">
                <div class="model-icon" style="background: #f59e0b">L</div>
                <div class="model-info">
                    <div class="model-name">${name}</div>
                    <div class="model-provider">本地</div>
                </div>
                <div class="model-api-status configured"><i class="fas fa-plug"></i></div>
                <button class="model-config-btn" onclick="showModelAPIConfig('${id}', event)"><i class="fas fa-cog"></i></button>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('afterbegin', html);
}

// 隐藏配置模态框 (如果也没定义的话)
function hideApiConfigModal() {
    document.getElementById('api-config-modal').style.display = 'none';
}

// 测试连接 (如果也没定义的话)
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
        // 发送一个最简单的请求
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
window.testApiConnection = testApiConnection; // 挂载到全局

// 获取默认API类型
function getDefaultAPIType(modelId) {
    if (modelId.includes('deepseek')) return 'deepseek';
    if (modelId.includes('gpt')) return 'openai';
    return 'openai';
}

// 获取默认端点
function getDefaultEndpoint(modelId) {
    if (modelId.includes('deepseek')) {
        return 'https://api.deepseek.com/v1/chat/completions';
    } else if (modelId.includes('gpt')) {
        return 'https://api.openai.com/v1/chat/completions';
    }
    return 'https://api.openai.com/v1/chat/completions';
}
// ==========================================
// 保存逻辑 (最终修复版)
// ==========================================
async function saveApiConfig() {
    const configId = document.getElementById('config-role-id').value;
    const isNewModel = configId === 'NEW_CUSTOM_MODEL'; // 判定是否为新建
    
    // 获取表单数据
    const config = {
        type: document.getElementById('api-type').value,
        endpoint: document.getElementById('api-endpoint').value,
        apiKey: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value,
        temperature: parseFloat(document.getElementById('api-temperature').value),
        systemPrompt: document.getElementById('api-system-prompt').value,
        // 关键：把显示名称也存进去，方便后续恢复
        displayName: document.getElementById('config-role-name').value || '未命名模型',
        lastUpdated: new Date().toISOString()
    };

    // 校验：除了本地/自定义模型外，Key 必填
    const isLocal = config.type === 'custom' || config.endpoint.includes('localhost');
    if (!config.apiKey && !isLocal) {
        alert('请输入 API 密钥');
        return;
    }
    // 本地模型给个占位符 Key
    if (!config.apiKey && isLocal) config.apiKey = 'sk-local';

    // === 分支 1: 新建自定义模型 ===
    if (isNewModel) {
        const newId = `custom_${Date.now()}`;
        
        // 1. 存入内存
        if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
        window.modelAPIConfigs.set(newId, config);
        
        // 2. 动态插入 UI (立即显示)
        appendCustomModelToUI(newId, config.displayName);
        
        log(`✨ 已添加自定义模型: ${config.displayName}`);
    } 
    // === 分支 2: 编辑现有模型或角色 ===
    else {
        // 判断 configId 是模型ID还是角色ID
        // 只要是 custom_, deepseek_, gpt_ 开头的，或者是刚才新建的 ID，都算模型
        const isModelID = configId.startsWith('custom_') || configId.startsWith('deepseek') || configId.startsWith('gpt') || configId.startsWith('openai');
        
        if (isModelID) {
            window.modelAPIConfigs.set(configId, config);
            log(`✅ 模型配置已更新`);
            // 这里不需要重新 renderAICategories，因为只是改了配置，卡片还在
        } else {
            apiConfigs.set(configId, config);
            renderPartsGrid(); // 刷新左侧小绿点
            log(`✅ 角色配置已更新`);
        }
    }

    saveAllAPIConfigs(); // 持久化
    hideApiConfigModal();
}
// 保存所有API配置到本地存储
function saveAllAPIConfigs() {
    const allConfigs = {
        roles: Object.fromEntries(apiConfigs.entries()),
        models: Object.fromEntries(modelAPIConfigs.entries())
    };
    localStorage.setItem('workflow_api_configs_all', JSON.stringify(allConfigs));
}

// ==========================================
// 1. 修正后的 loadAllAPIConfigs (只读数据，不渲染)
// ==========================================
function loadAllAPIConfigs() {
    const saved = localStorage.getItem('workflow_api_configs_all');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            
            // 恢复角色配置
            if (parsed.roles) {
                Object.keys(parsed.roles).forEach(id => apiConfigs.set(id, parsed.roles[id]));
            }
            
            // 恢复自定义模型配置 (只存入内存，等待 renderAICategories 渲染)
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
function bindGlobalEvents() {
    // 点击模态框外部关闭
    document.getElementById('api-config-modal').addEventListener('click', (e) => {
        if (e.target.id === 'api-config-modal') {
            hideApiConfigModal();
        }
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideApiConfigModal();
        }
    });
}
// ========== 执行工作流函数 ==========
async function executeWorkflow() {
    log('开始执行工作流...');
    
    // 检查是否有配置好的角色
    const hasRoles = builderData.some(group => group.roles.length > 0);
    if (!hasRoles) {
        alert('请先添加角色到工作流！');
        return;
    }
    
    // 检查API配置
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
    
    // 更新UI状态
    document.getElementById('run-status-text').textContent = '执行中...';
    document.getElementById('btn-run-all').disabled = true;
    document.getElementById('btn-stop').disabled = false;
    
    // 显示结果面板
    document.getElementById('results-panel').style.display = 'flex';
    
    // 清空之前的结果
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = '';
    
    // 执行每个分组
    let totalTasks = 0;
    let completedTasks = 0;
    
    // 计算总任务数
    builderData.forEach(group => {
        totalTasks += group.roles.length;
    });
    
    for (let groupIndex = 0; groupIndex < builderData.length; groupIndex++) {
        const group = builderData[groupIndex];
        
        // 添加分组标题
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
        
        // 执行组内的每个角色
        for (let roleIndex = 0; roleIndex < group.roles.length; roleIndex++) {
            const roleId = group.roles[roleIndex];
            const modelId = bindings.get(roleId);
            
            // 模拟执行延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟执行结果
            const result = await simulateRoleExecution(roleId, modelId);
            
            // 显示结果
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
            
            // 滚动到底部
            resultsContent.scrollTop = resultsContent.scrollHeight;
            
            // 更新进度
            completedTasks++;
            const progress = Math.round((completedTasks / totalTasks) * 100);
            document.getElementById('progress-fill').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `${progress}%`;
        }
    }
    
    // 执行完成
    document.getElementById('run-status-text').textContent = '执行完成';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    log('工作流执行完成');
}

// 模拟角色执行
async function simulateRoleExecution(roleId, modelId) {
    const roleName = getRoleName(roleId);
    const hasAPI = apiConfigs.has(roleId);
    
    // 这里应该是实际的API调用
    // 现在只是模拟
    
    const tasks = {
        'frontend_expert': '实现了React组件，优化了页面性能',
        'backend_architect': '设计了API接口，完成了数据库设计',
        'ui_designer': '完成了UI设计稿，创建了设计系统',
        'copywriter': '撰写了营销文案，优化了SEO内容',
        'data_analyst': '分析了用户数据，生成了报表',
        'devops_engineer': '部署了应用，配置了监控'
    };
    
    const success = Math.random() > 0.2; // 80%成功率
    const task = tasks[roleId] || '完成了任务';
    
    return {
        success,
        message: hasAPI 
            ? `✅ ${roleName} 使用 ${modelId ? getModelName(modelId) : 'AI'} ${task}`
            : `⚠️ ${roleName} (未配置API) 模拟${task}`
    };
}

// 切换结果面板显示
function toggleResultsPanel() {
    const panel = document.getElementById('results-panel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

// 停止执行
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
            // 安全处理API密钥
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
    
    // 模拟添加角色
    setTimeout(() => {
        if (builderData[0]) {
            builderData[0].roles.push('frontend_expert');
            builderData[0].roles.push('data_analyst');
            renderGroups();
            updateApiStatus('frontend_expert');
            updateApiStatus('data_analyst');
            log('模拟：添加了2个角色到分组');
        }
    }, 500);
    
    // 模拟绑定模型
    setTimeout(() => {
        bindModelToRole('frontend_expert', 'deepseek-chat');
        bindModelToRole('data_analyst', 'gpt4');
        log('模拟：绑定了2个模型');
    }, 1000);
    
    // 模拟添加新分组
    setTimeout(() => {
        addGroup();
        log('模拟：添加了新分组');
    }, 1500);
    
    // 模拟API配置
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
            updateApiStatus('ui_designer');
            log('模拟：为UI设计师配置了API');
        }
    }, 2000);
}

// 其他辅助函数
function addNewCategory() {
    // 1. 获取名称
    const name = prompt('请输入新角色的名称 (例如：导演、产品经理):');
    if (!name || !name.trim()) return;
    
    // 2. 检查库是否加载
    if (!window.RolePartsLibrary || !window.RolePartsLibrary.userParts) {
        alert('系统模块未加载完全，请刷新重试');
        return;
    }
    
    try {
        // 3. 创建一个"白板"角色 (只有名字，没有详细技能)
        const newPartId = RolePartsLibrary.userParts.create({
            name: name.trim(),
            category: 'custom', // 放入自定义分类
            icon: 'fa-user-tag',
            color: '#94a3b8',   // 默认灰色，代表未激活/未炼制
            tags: ['待定义'],
            description: '这是一个初始概念角色，请拖入炼丹炉结合AI模型生成详细技能。'
        });
        
        // 4. 刷新网格显示
        renderPartsGrid();
        
        // 5. 自动滚动到底部并高亮 (可选优化)
        log(`✨ 已创建白板角色: ${name} (ID: ${newPartId})，请将其拖入炼丹炉铸造。`);
        
    } catch (error) {
        console.error('创建失败:', error);
        alert(`创建失败: ${error.message}`);
    }
}
function toggleSearch() {
    log('切换搜索功能');
    // 实现搜索功能
}


function refreshModels() {
    log('刷新AI模型列表');
    // 实现刷新逻辑
}
// ========== 调试功能管理器 ==========
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
        // 初始化事件监听
        this.initDragEvents();
        this.initClickEvents();
        this.initAutoHide();
        
        // 初始日志
        this.log('调试系统已初始化');
    }
    
    initDragEvents() {
        this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // 触摸屏支持
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
        // 点击手柄切换面板显示
        this.handle.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.togglePanel();
            }
        });
        
        // 阻止面板内的点击事件冒泡
        const panel = this.container.querySelector('.debug-panel');
        panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    initAutoHide() {
        // 鼠标离开容器时自动隐藏（非固定模式）
        this.container.addEventListener('mouseleave', (e) => {
            if (!this.isPinned && !this.isDragging) {
                this.hidePanel();
            }
        });
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.handle.classList.add('dragging');
        
        // 计算鼠标相对于手柄的偏移
        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        // 如果面板是隐藏的，先显示
        if (!this.isPinned) {
            this.showPanel();
        }
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        
        // 计算新位置
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // 应用新位置
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
        
        // 实时更新位置限制
        this.constrainToWindow();
    }
    
    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.handle.classList.remove('dragging');
        
        // 应用边缘吸附
        this.applyEdgeSnap();
    }
    
    constrainToWindow() {
        const rect = this.container.getBoundingClientRect();
        const containerRect = this.container.parentElement.getBoundingClientRect();
        
        // 限制在可视区域内
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
        const snapThreshold = 50; // 吸附阈值
        
        // 移除所有边缘类
        this.container.classList.remove('left-edge', 'right-edge', 'top-edge', 'bottom-edge');
        
        // 检查是否靠近边缘
        if (rect.left < snapThreshold) {
            this.container.classList.add('left-edge');
            this.container.style.left = '10px';
        } else if (windowWidth - rect.right < snapThreshold) {
            this.container.classList.add('right-edge');
            this.container.style.right = '10px';
            this.container.style.left = 'auto';
        }
        
        if (rect.top < snapThreshold + 60) { // 60是顶部导航栏高度
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
        
        // 更新计数器
        this.messageCount++;
        this.updateCounters();
        
        // 如果有错误，自动显示面板
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

// ========== 全局日志函数 ==========
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

// ==========================================
// 2. 修正后的初始化顺序 (DOMContentLoaded)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 确保全局变量存在 (最优先)
    if (!window.bindings) window.bindings = new Map();
    if (!window.apiConfigs) window.apiConfigs = new Map();
    if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map(); // 确保这个也在
    if (!window.builderData) window.builderData = [];
    
    // 2. 加载本地配置 (必须在渲染之前！)
    loadAllAPIConfigs();
    
    // 3. 加载测试数据 (可能会覆盖部分配置，按需保留)
    loadTestData();
    
    // 4. 渲染界面 (这时候数据已经全了)
    renderPartsGrid();      // 渲染左侧零件
    renderAICategories();   // 渲染右侧模型 (包含云端+本地)
    renderGroups();         // 渲染中间工作流
    updateBindingsUI();     // 渲染绑定连线
    
    // 5. 初始化交互组件
    initTrashCan();         // 初始化垃圾桶
    initDropZone();         // 初始化拖拽区域
    
    // 6. 绑定按钮事件
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.onclick = resetAll;
    
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.onclick = exportConfig;
    
    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) btnSimulate.onclick = simulateInteraction;
    
    const btnRunAll = document.getElementById('btn-run-all');
    if (btnRunAll) btnRunAll.onclick = executeWorkflow;
    
    const btnStop = document.getElementById('btn-stop');
    if (btnStop) btnStop.onclick = stopExecution;
    
    // 7. 绑定全局事件 (键盘、模态框关闭等)
    bindGlobalEvents();
    
    log('🚀 系统初始化完成 (配置已加载)');
});
// ========== 初始化拖拽区域函数 ==========

// 更新炉子UI显示
function updateFurnaceDisplay() {
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint || !window.alchemyState) return;
    
    const count = window.alchemyState.materials.length;
    const p = dropHint.querySelector('p') || dropHint; // 兼容性处理
    
    // 根据数量显示不同状态
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

// ============================================================
// 更新后的炼丹逻辑 (包含原料消耗功能)
// ============================================================

async function startAIAlchemy(roleItem, modelItem) {
    console.log('炼丹参数:', { roleItem, modelItem });
    
    // 1. 提取ID
    const roleId = roleItem.id || (roleItem.data && roleItem.data.id) || roleItem;
    const modelId = modelItem.id || (modelItem.data && modelItem.data.id) || modelItem;
    
    // 2. 获取名称
    const roleName = getRoleName(roleId);
    const modelName = getModelName(modelId);
    
    log(`🔥 检查炼丹条件: ${roleName} + ${modelName}`);
    
    // 3. 检查模型配置
    // 如果是云端模型(Next.js托管)，不需要前端有Key，只要有ID就行
    // 如果是本地模型，检查是否已添加
    const isCloudModel = !modelId.startsWith('custom_');
    const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
    
    // 只有当它是自定义模型，且没有配置时才拦截
    if (!isCloudModel && (!modelConfig || !modelConfig.endpoint)) {
        const errorMsg = `❌ 失败：模型 [${modelName}] 未配置API地址`;
        log(errorMsg);
        alert(`请先为 [${modelName}] 配置API地址`);
        
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
        updateFurnaceDisplay();
        return;
    }
    
    log(`✅ 炼丹条件满足，开始炼制...`);
    
    // 4. 启动动画
    if (window.AlchemyAnimation) {
        try {
            // 构建简单的动画数据对象
            const roleData = { name: roleName, icon: 'fa-user' };
            const modelData = { 
                    id: modelId || 'unknown',  // 兜底
                    name: modelName || '未知模型' 
};
            window.AlchemyAnimation.startAlchemy(roleData, modelData);
        } catch (e) {
            console.warn('动画启动失败:', e);
        }
    }
    
    // 5. 锁定状态
    window.alchemyState.isProcessing = true;
    updateFurnaceDisplay();
    
    try {
        // 6. 获取原始角色数据
        let rawRole = null;
        if (window.RolePartsLibrary && RolePartsLibrary.getRoleDetailsEnhanced) {
            rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
        }
        if (!rawRole && roleId.startsWith('user_') && RolePartsLibrary.userParts) {
            rawRole = RolePartsLibrary.userParts.find(roleId);
        }
        if (!rawRole) rawRole = { name: roleName, id: roleId, tags: [] };
        
        // 7. 调用真实API进行增强
        log(`🤖 调用AI API进行角色增强...`);
        
        // 调用下面的 callRealAIForEnhancement
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");

        // 8. 创建新卡片 (成品)
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
        
        // 9. 成功反馈
        log(`✅ 炼丹成功！新角色 [${newRoleName}] 已生成`);
        
        // 10. 消耗原料 (仅消耗用户自定义的角色)
        if (roleId.startsWith('user_') && RolePartsLibrary.userParts) {
            RolePartsLibrary.userParts.delete(roleId);
            log(`♻️ 原料 [${roleName}] 已被消耗`);
        }
        
        renderPartsGrid(); // 刷新列表
        
        // 11. 清理现场
        setTimeout(() => {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
            updateFurnaceDisplay();
        }, 2000);
        
    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        
        // 显示错误动画
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        
        // 重置状态
        window.alchemyState.materials = [];
        window.alchemyState.isProcessing = false;
        updateFurnaceDisplay();
    }
}
// ============================================================
// 3. API 调用层 (混合模式)
// ============================================================

// ============================================================
// 3. API 调用层 (混合模式：本地/云端分流 + 结果补全)
// ============================================================

async function callRealAIForEnhancement(roleInfo, modelId) {
    const isLocal = modelId.startsWith('custom_') || modelId.includes('localhost');
    let enhancedData = null;

    // --- 分支 A: 本地模型 (Ollama 直连) ---
    if (isLocal) {
        log(`🔌 使用本地模型直连...`);
        const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;
        
        if (!modelConfig) throw new Error("找不到本地模型配置，请先在右侧配置");

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
            // 发送 fetch 请求到本地 Ollama
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
            
            // 解析内容 (兼容不同 Ollama 版本返回格式)
            const content = data.message ? data.message.content : (data.choices && data.choices[0] ? data.choices[0].message.content : null);
            
            if (!content) throw new Error("Ollama 返回内容为空");
            
            // 解析 JSON
            enhancedData = parseJSONSafe(content);

        } catch (err) {
            console.error("本地炼丹失败:", err);
            throw err; // 抛出给上层处理
        }
    } 

    // --- 分支 B: 云端模型 (走 Next.js 后台) ---
    else {
        log(`🤖 请求云端炼丹 (Prompt 受保护)...`);
        try {
            // alchemyAPI.forge 已经在 api.js 里定义好了
            // 后台返回的已经是解析好的 JSON 对象，不需要再 parseJSONSafe
            enhancedData = await alchemyAPI.forge(roleInfo.name, modelId);
        } catch (err) {
            console.error("云端炼丹失败:", err);
            throw err;
        }
    }

    // --- 统一后处理：数据补全 ---
    // 如果解析失败或者是空对象，给予默认值，防止后续报错
    if (!enhancedData || Object.keys(enhancedData).length === 0) {
        enhancedData = {
            name: `${roleInfo.name} (生成失败)`,
            description: "AI未返回有效格式，请检查模型输出或Prompt。",
            tags: ["失败"],
            capabilities: { core: [] }
        };
    }

    // 确保 name 字段存在 (防止 TypeError: Cannot read properties of undefined reading 'name')
    if (!enhancedData.name) {
        enhancedData.name = `${roleInfo.name} (AI版)`;
    }

    return enhancedData;
}

function checkAlchemyReady() {
    if (!window.alchemyState) return;
    
    const materials = window.alchemyState.materials;
    
    // 检查是否有角色和模型各一个
    const hasRole = materials.some(m => m.type === 'role');
    const hasModel = materials.some(m => m.type === 'model');
    
    if (hasRole && hasModel) {
        console.log('炉子材料齐备，开始AI生成...');
        
        // 获取材料数据
        const roleMaterial = materials.find(m => m.type === 'role');
        const modelMaterial = materials.find(m => m.type === 'model');
        console.log('开始炼丹:', roleMaterial.data, modelMaterial.data);
        // 调用生成函数 ← 加上这行
        startAIAlchemy(roleMaterial.id, modelMaterial.id);
    }
}
// 辅助：智能获取 API 配置
async function getAIProviderConfig(modelId) {
    // 1. 映射模型ID到配置Key (gpt4 -> openai, deepseek-chat -> deepseek)
    let providerKey = 'openai'; // 默认
    let modelName = 'gpt-3.5-turbo'; // 默认

    if (modelId.includes('deepseek')) {
        providerKey = 'deepseek';
        modelName = 'deepseek-chat';
    } else if (modelId.includes('gpt4') || modelId.includes('gpt-4')) {
        providerKey = 'openai';
        modelName = 'gpt-4-turbo';
    } else if (modelId.includes('claude')) {
        providerKey = 'anthropic';
        modelName = 'claude-3-sonnet';
    }

    // 2. 尝试从全局 apiConfigs 获取 (这是 api-manager.js 维护的 Map)
    // 我们检查是否有针对该 provider 的通用配置
    let config = window.apiConfigs.get(providerKey);

    // 3. 如果没有配置或没有Key，弹窗请求
    if (!config || !config.apiKey) {
        const inputKey = prompt(`炼丹炉需要 [${providerKey}] 的 API Key 才能驱动 [${modelId}]。\n\n请输入 API Key (仅保存在本地):`);
        
        if (!inputKey) throw new Error("未提供 API Key，炼丹取消");
        
        // 自动补全 Endpoint
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        if (providerKey === 'deepseek') endpoint = 'https://api.deepseek.com/v1/chat/completions';
        if (providerKey === 'anthropic') endpoint = 'https://api.anthropic.com/v1/messages';

        // 存入全局配置 (复用 api-manager.js 的逻辑)
        config = {
            type: providerKey,
            apiKey: inputKey,
            endpoint: endpoint,
            model: modelName
        };
        
        window.apiConfigs.set(providerKey, config);
        // 如果有保存函数，顺便保存一下
        if (typeof saveApiConfig === 'function') {
            // 这里为了简化，不强制调用 UI 保存，只存在内存中即可，或者手动触发 localStorage 保存
            console.log("API Key 已临时缓存");
        }
    }

    // 4. 返回标准化的配置对象
    return {
        apiKey: config.apiKey,
        endpoint: config.endpoint || (providerKey === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'),
        modelName: config.model || modelName
    };
}

// 安全的JSON解析辅助函数 (修复版)
function parseJSONSafe(text) {
    if (!text) return null; // 返回 null 让上层处理

    try {
        // 1. 尝试直接解析
        return JSON.parse(text);
    } catch (e) {
        console.warn('直接解析失败，尝试提取...');
        
        // 2. 提取 markdown 代码块
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlock) {
            try { return JSON.parse(codeBlock[1]); } catch(e){}
        }

        // 3. 提取最外层 {}
        const jsonBlock = text.match(/\{[\s\S]*\}/);
        if (jsonBlock) {
            try { return JSON.parse(jsonBlock[0]); } catch(e){}
        }
        
        // 4. 彻底失败：返回一个简单的结构 (不要引用外部变量!)
        console.error("无法解析JSON，返回默认结构");
        return {
            name: "生成角色", 
            description: "AI返回内容无法解析，请检查模型输出。",
            tags: ["解析失败"]
        };
    }
}
//关键修改：
function initDropZone() {
    console.log('🎯 DROP事件触发', window.draggedItem, window.draggedType);
console.log('🎯 当前材料数:', window.alchemyState.materials.length);
    const dropHint = document.getElementById('drop-hint');
    if (!dropHint) return;
    // 确保炉子状态存在
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
        
        console.log('放入炉子:', type, item);
        
        // 初始化炉子状态
        if (!window.alchemyState) {
            window.alchemyState = { materials: [] };
        }
        
        // 添加到炉子
        window.alchemyState.materials.push({
            type: type,
            id: item,
            timestamp: Date.now()
        });
        
        // 更新炉子显示（需要实现这个函数）
        updateFurnaceDisplay();
        
        // 检查是否可以开始炼制（角色+模型都有）
        checkAlchemyReady();
        
        // 清理拖拽状态
        //window.draggedItem = null;
        //window.draggedType = null;
    });
}
// ========== 键盘快捷键 ==========
document.addEventListener('keydown', (e) => {
    // Ctrl + ` 切换调试面板
    if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleDebugPanel();
    }
    
    // Ctrl + Shift + L 清空日志
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        clearDebugLog();
    }
});
// ============================================================
// 4. 左下角粉碎机 (垃圾桶) 功能
// ============================================================

function initTrashCan() {
    // 1. 动态插入样式 (如果你的CSS里没写的话)
    const style = document.createElement('style');
    style.innerHTML = `
        #trash-can {
            position: fixed;
            left: 30px;
            bottom: 30px;
            width: 70px;
            height: 70px;
            background: rgba(30, 41, 59, 0.8); /* 深色半透明 */
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
        
        /* 拖拽进入时的状态 - 变红且放大 */
        #trash-can.drag-over {
            background: rgba(239, 68, 68, 0.9); /* Red-500 */
            border-color: #fca5a5;
            transform: scale(1.15) rotate(-5deg);
            color: white;
            box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.5);
        }
        
        /* 晃动动画 */
        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
        }
        .shaking { animation: shake 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);

    // 2. 动态创建DOM元素
    const trash = document.createElement('div');
    trash.id = 'trash-can';
    trash.innerHTML = `<i class="fas fa-trash-alt"></i><span>粉碎机</span>`;
    document.body.appendChild(trash);

    // 3. 绑定拖拽事件
    
    // 当卡片拖到垃圾桶上方
    trash.addEventListener('dragover', (e) => {
        e.preventDefault(); // 允许放置
        
        // 只有自定义角色才能被粉碎
        if (isValidTrashItem()) {
            trash.classList.add('drag-over');
        }
    });

    // 离开垃圾桶区域
    trash.addEventListener('dragleave', () => {
        trash.classList.remove('drag-over');
    });

    // 放入垃圾桶 (删除触发)
    trash.addEventListener('drop', (e) => {
        e.preventDefault();
        trash.classList.remove('drag-over');
        
        if (isValidTrashItem()) {
            handleTrashDelete();
        }
    });
}

// 检查拖拽物是否可回收
function isValidTrashItem() {
    // 必须是角色 (draggedType === 'role') 且存在
    if (window.draggedType !== 'role' || !window.draggedItem) return false;
    
    // 检查ID是否以 user_ 开头 (系统自带的不能删)
    const roleId = window.draggedItem.id || window.draggedItem; // 兼容对象或ID字符串
    return typeof roleId === 'string' && roleId.startsWith('user_');
}

// 执行删除逻辑
function handleTrashDelete() {
    const roleId = window.draggedItem.id || window.draggedItem;
    const roleName = window.draggedItem.name || '该角色';

    if (confirm(`⚠️ 确定要粉碎 [${roleName}] 吗？\n此操作无法撤销。`)) {
        // 调用零件库的删除方法
        const success = RolePartsLibrary.userParts.delete(roleId);
        
        if (success) {
            // 视觉反馈
            const trash = document.getElementById('trash-can');
            trash.classList.add('shaking');
            setTimeout(() => trash.classList.remove('shaking'), 500);
            
            log(`🗑️ 已粉碎角色: ${roleId}`);
            renderPartsGrid(); // 刷新左侧列表
        } else {
            alert('删除失败，未找到该零件');
        }
    }
}
// ==========================================
// 5. 暴露函数给 HTML (解决 onclick 找不到的问题)
// ==========================================
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
window.testApiConnection = testApiConnection; // 如果有这个函数
window.hideApiConfigModal = hideApiConfigModal;

// 拖拽相关
window.onRoleDragStart = onRoleDragStart;
window.onModelDragStart = onModelDragStart;
window.onDragEnd = onDragEnd;
window.onGroupDragOver = onGroupDragOver;
window.onGroupDragLeave = onGroupDragLeave;
window.onGroupDrop = onGroupDrop;

// 运行控制
window.executeWorkflow = executeWorkflow;
window.stopExecution = stopExecution;
window.toggleResultsPanel = toggleResultsPanel;

// 顶部按钮
window.resetAll = resetAll;
window.exportConfig = exportConfig;
window.simulateInteraction = simulateInteraction;

console.log("✅ 已将核心函数挂载到全局 window");

// 确保所有函数都在全局作用域定义，不在 DOMContentLoaded 内部