// js/modules/ui.js
import { systemAPI } from '../api.js';
import { getRoleName, getModelName, getModelColor } from './utils.js';
// 注意：因为循环依赖，onclick 里的函数名我们直接用 window.xxx，反正 main.js 会挂载
export function renderPartsGrid() {
    const grid = document.getElementById('parts-grid');
    if(!grid) return;

    const allParts = window.RolePartsLibrary.getAllPartsEnhanced 
        ? window.RolePartsLibrary.getAllPartsEnhanced() 
        : window.RolePartsLibrary.getAllParts();
    
    // 辅助：转义引号
    const escapeHtml = (text) => text.replace(/'/g, "&apos;").replace(/"/g, "&quot;");

    grid.innerHTML = allParts.map(part => {
        const hasApi = window.apiConfigs.has(part.id);
        
        // ✨ 新增：生成技能按钮 HTML
        const actions = part.actions || [];
        const skillsHtml = actions.length > 0 
            ? `<div class="part-skills" style="display:flex; gap:6px; flex-wrap:wrap; margin:10px 0 5px 0;">
                 ${actions.map(act => `
                    <button class="btn-mini-skill" 
                            style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; padding:2px 8px; border-radius:4px; font-size:10px; cursor:pointer;"
                            onclick="event.stopPropagation(); window.quickAction('${part.id}', '${escapeHtml(act.prompt)}')">
                        <i class="fas fa-bolt" style="color:#fbbf24; margin-right:4px;"></i>${act.label}
                    </button>
                 `).join('')}
               </div>`
            : '';

        return `
        <div class="part-card" 
             onclick="window.showRoleDetails('${part.id}')"
             draggable="true" 
             data-role-id="${part.id}"
             ondragstart="window.onRoleDragStart(event)"
             ondragend="window.onDragEnd(event)">
            <div class="part-header">
                <div class="part-icon" style="background: ${part.color || '#3b82f6'}">
                    <i class="${part.icon || 'fa-user'}"></i>
                </div>
                <div class="part-name">${part.name}</div>
                <div class="api-status ${hasApi ? 'has-api' : 'no-api'}" 
                     onclick="window.showApiConfig('${part.id}', event)"
                     title="${hasApi ? '已配置API' : '未配置API'}">
                    <i class="fas ${hasApi ? 'fa-plug' : 'fa-plug-circle-exclamation'}"></i>
                </div>
            </div>
            
            <div class="part-tags">
                ${(part.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            
            <!-- ✨ 关键：插入技能按钮 -->
            ${skillsHtml}

            <div class="part-actions">
                <button class="btn-api-config" onclick="window.showApiConfig('${part.id}', event)">
                    <i class="fas fa-cog"></i> 配置API
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// js/modules/ui.js

// 渲染右侧 AI 引擎库 (含状态检测)
export async function renderAICategories() {
    const container = document.getElementById('ai-categories');
    if(!container) return;

    try {
        // 1. 获取云端模型
        const realModels = await systemAPI.getModels(); 
        
        const categories = {
            'openai': { id: 'openai', name: 'OpenAI', icon: 'fa-robot', expanded: true, models: [] },
            'google': { id: 'google', name: 'Google', icon: 'fa-google', expanded: true, models: [] },
            'deepseek': { id: 'deepseek', name: 'DeepSeek', icon: 'fa-code', expanded: true, models: [] },
            'anthropic': { id: 'anthropic', name: 'Anthropic', icon: 'fa-brain', expanded: true, models: [] }
        };

        // 整理云端模型数据
        realModels.forEach(m => {
            const providerKey = categories[m.provider] ? m.provider : 'openai'; 
            categories[providerKey].models.push({
                id: m.id, 
                name: m.display_name, 
                provider: m.provider, 
                price: m.sale_price,
                // 根据类型显示不同图标
                typeIcon: m.model_type === 'image' ? '🎨' : (m.model_type === 'tts' ? '🗣️' : ''),
                color: m.provider === 'deepseek' ? '#8b5cf6' : (m.provider === 'openai' ? '#10b981' : '#3b82f6')
            });
        });

        // 2. 生成云端模型 HTML
        let html = Object.values(categories).filter(cat => cat.models.length > 0).map(cat => `
            <div class="ai-category ${cat.expanded ? 'expanded' : ''}">
                <div class="ai-category-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <i class="fas fa-chevron-right"></i>
                    <i class="fas ${cat.icon}"></i>
                    <span>${cat.name}</span>
                </div>
                <div class="ai-models">
                    ${cat.models.map(model => `
                        <div class="ai-model-card"
                             draggable="true"
                             data-model-id="${model.id}" 
                             ondragstart="window.onModelDragStart(event)"
                             ondragend="window.onDragEnd(event)">
                            
                            <div class="model-icon" style="background: ${model.color}">
                                ${model.name.charAt(0)}
                            </div>
                            
                            <div class="model-info">
                                <div class="model-name">
                                    ${model.typeIcon} ${model.name}
                                </div>
                                <div class="model-provider">
                                    <i class="fas fa-coins" style="color:#fbbf24;margin-right:4px"></i>
                                    ${model.price} 积分
                                </div>
                            </div>

                            <!-- 🚦 状态灯 (默认灰色，稍后 JS 变色) -->
                            <div class="model-api-status" 
                                 id="status-${model.id}"
                                 title="正在检测..."
                                 style="cursor: help; display:flex; align-items:center; justify-content:center;">
                                <i class="fas fa-circle" style="color:#64748b; font-size:10px;"></i>
                            </div>
                            
                            <!-- 锁定按钮 -->
                            <button class="model-config-btn" style="opacity:0.3; cursor:not-allowed">
                                <i class="fas fa-lock"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // 3. 追加本地自定义模型
        if (window.modelAPIConfigs) {
            const customModelsHTML = Array.from(window.modelAPIConfigs.entries())
                .filter(([id]) => id.startsWith('custom_'))
                .map(([id, config]) => `
                    <div class="ai-model-card" draggable="true" data-model-id="${id}" 
                         ondragstart="window.onModelDragStart(event)" ondragend="window.onDragEnd(event)">
                        <div class="model-icon" style="background: #f59e0b">L</div>
                        <div class="model-info">
                            <div class="model-name">${config.displayName || '自定义模型'}</div>
                            <div class="model-provider">本地</div>
                        </div>
                        <div class="model-api-status configured" title="本地配置"><i class="fas fa-plug"></i></div>
                        <button class="model-config-btn" onclick="window.showModelAPIConfig('${id}', event)"><i class="fas fa-cog"></i></button>
                    </div>
                `).join('');

            if (customModelsHTML) {
                html = `
                <div class="ai-category expanded" style="border-left: 3px solid #f59e0b;">
                    <div class="ai-category-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <i class="fas fa-server"></i>
                        <span>自定义模型 (本地)</span>
                    </div>
                    <div class="ai-models">${customModelsHTML}</div>
                </div>` + html;
            }
        }

        // 4. 渲染 HTML
        container.innerHTML = html;

        // 5. 🚀 异步启动状态检测
        Object.values(categories).forEach(cat => {
            cat.models.forEach(model => checkModelHealth(model.id, model.provider));
        });

    } catch (err) {
        console.error("加载模型失败:", err);
        container.innerHTML = '<div class="p-4 text-gray-500">加载失败</div>';
    }
}

// 异步检测模型状态
async function checkModelHealth(modelId, provider) {
    const statusEl = document.getElementById(`status-${modelId}`);
    if (!statusEl) return;

    // 检查用户是否配置了自定义 Key
    const userKey = localStorage.getItem(`${provider}_api_key`); // 比如 deepseek_api_key
    
    if (userKey) {
        // === 蓝色方案：用户自带 Key ===
        statusEl.innerHTML = '<i class="fas fa-user-check" style="color:#3b82f6"></i>'; // 蓝人头
        statusEl.title = "使用您的自定义 Key (免费)";
        
        // 进一步：真的发个请求测试一下 (可选，怕费流量可以不做)
        // await testUserKey(provider, userKey)...
        
    } else {
        // === 绿色方案：平台托管 ===
        // 这里我们默认平台是通的 (或者去调后台 /api/health 接口)
        // 简单起见，直接给绿灯
        statusEl.innerHTML = '<i class="fas fa-cloud" style="color:#10b981"></i>'; // 绿云
        statusEl.title = "平台托管 (正常)";
        
        // 如果你想做故障检测：
        /*
        try {
            const res = await fetch('/api/chat/ping', { method: 'HEAD' });
            if (!res.ok) throw new Error();
        } catch (e) {
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ef4444"></i>';
            statusEl.title = "平台服务异常";
        }
        */
    }
}
export function renderGroups() {
    const container = document.getElementById('groups-container');
    if(!container) return;

    // 辅助函数：转义 HTML 字符 (必须定义在这里，或者在文件顶部)
    const escapeHtml = (text) => text ? text.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : '';

    container.innerHTML = window.builderData.map((group, index) => `
        <div class="build-group" data-group-index="${index}" 
             ondragover="window.onGroupDragOver(event, ${index})" 
             ondragleave="window.onGroupDragLeave(event, ${index})" 
             ondrop="window.onGroupDrop(event, ${index})">
            
            <div class="group-header">
                <input type="text" class="group-name-input" 
                       value="${group.name === '规划阶段' ? '' : group.name}" 
                       placeholder="${group.name === '规划阶段' ? '规划阶段' : '新分组'}" 
                       onchange="window.updateGroupName(${index}, this.value || '新分组')">
                <button onclick="window.removeGroup(${index})" title="删除"><i class="fas fa-trash" style="color:#ef4444;"></i></button>
            </div>

            <div class="group-roles" id="group-roles-${index}">
                ${group.roles.map(roleId => {
                    const boundModel = window.bindings.get(roleId);
                    const hasApi = window.apiConfigs.has(roleId);
                    
                    // ⚠️ 关键：定义 taskDesc
                    const taskDesc = (group.tasks && group.tasks[roleId]) || '';

                    return `<div class="role-in-group ${boundModel ? 'bound' : ''}" 
                         data-role-id="${roleId}" 
                         onclick="window.showTaskDetails('${roleId}', '${escapeHtml(taskDesc)}')" 
                         title="${taskDesc || '点击查看详情'}">
                    
                        <!-- 图标 -->
                        <i class="fas fa-user" style="margin-right:8px; opacity:0.7;"></i>
                        
                        <!-- 名字 -->
                        <span>${getRoleName(roleId)}</span>
                        
                        <!-- 插头 (API状态) -->
                        ${hasApi ? `<i class="fas fa-plug" style="color:#10b981; margin-left:auto;"></i>` : ''}
                        
                        <!-- 模型徽章 -->
                        ${boundModel ? `<span class="model-badge">${getModelName(boundModel)}</span>` : ''}
                        
                    </div>`;
                }).join('')}
            </div>
        </div>`).join('');

    // 更新拖拽提示
    const dropHint = document.getElementById('drop-hint');
    if(dropHint) dropHint.style.display = window.builderData.some(g => g.roles.length > 0) ? 'none' : 'block';
}

export function updateBindingsUI() {
    const list = document.getElementById('binding-list');
    const boundCount = document.getElementById('bound-roles-count');
    const usedModelsCount = document.getElementById('used-models-count');
    if(!list) return;
    list.innerHTML = Array.from(window.bindings.entries()).map(([roleId, modelId]) => `
        <div class="binding-item"><span>${getRoleName(roleId)}</span><span class="binding-arrow">→</span><span style="color:${getModelColor(modelId)}">${getModelName(modelId)}</span></div>`).join('');
    if(boundCount) boundCount.textContent = window.bindings.size;
    if(usedModelsCount) usedModelsCount.textContent = new Set(Array.from(window.bindings.values())).size;
}

// 辅助 UI 函数
export function addNewCategory() {
    const name = prompt('请输入新角色的名称:');
    if (!name || !name.trim()) return;
    try {
        const newPartId = window.RolePartsLibrary.userParts.create({
            name: name.trim(), category: 'custom', icon: 'fa-user-tag', color: '#94a3b8', tags: ['待定义'], description: '这是一个初始概念角色。'
        });
        renderPartsGrid();
        console.log(`✨ 已创建白板角色: ${name}`);
    } catch (error) { alert(`创建失败: ${error.message}`); }
}
export function addGroup() {
    window.builderData.push({ id: 'g' + Date.now(), name: '新分组', roles: [] });
    renderGroups();
}
export function removeGroup(index) {
    window.builderData[index].roles.forEach(roleId => window.bindings.delete(roleId));
    window.builderData.splice(index, 1);
    renderGroups();
    updateBindingsUI();
}
// ... (前面的代码保持不变)

export function updateGroupName(index, name) {
    if (window.builderData && window.builderData[index]) {
        window.builderData[index].name = name;
    }
}

export function toggleSearch() { 
    alert("搜索功能开发中"); 
}

export function refreshModels() { 
    renderAICategories(); 
}

export function toggleAICategory(categoryId) {
    // 简单实现：找到对应元素并切换类名
    // 这里其实不依赖 categoryId，因为 HTML 里的 onclick 是直接绑定到 this.parentElement 的
    // 但为了兼容可能的显式调用，保留空壳或者实现逻辑
    const items = document.querySelectorAll('.ai-category');
    items.forEach(item => item.classList.toggle('expanded')); 
}

// 别忘了加上 renderAll 总入口
export function renderAll() {
    renderPartsGrid();
    renderAICategories();
    renderGroups();
    updateBindingsUI();
}
export function updateApiStatus(roleId) {
    // 找到所有代表这个角色的卡片 (无论在左侧还是中间)
    const cards = document.querySelectorAll(`[data-role-id="${roleId}"] .api-status`);
    const hasApi = window.apiConfigs.has(roleId);
    
    cards.forEach(el => {
        if (hasApi) {
            el.classList.add('has-api');
            el.classList.remove('no-api');
            el.innerHTML = '<i class="fas fa-plug"></i>';
            el.title = '已配置API';
        } else {
            el.classList.remove('has-api');
            el.classList.add('no-api');
            el.innerHTML = '<i class="fas fa-plug-circle-exclamation"></i>';
            el.title = '未配置API';
        }
    });
}

