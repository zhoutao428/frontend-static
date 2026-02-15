// 文件名: js/modules/ui.js

import { getRoleName, getModelName } from './utils.js';
import { RolePartsLibrary } from './role-parts-library.js';
import { decorateRoleCardWithFactoryButton } from './factory-warehouse-bridge.js';
import { initializeDragAndDrop } from './drag-drop.js';

// -----------------------------------------------------------------------------
// 1. 新增：初始化工具栏事件 (修复 main.js 报错)
// -----------------------------------------------------------------------------
export function initToolbar() {
    console.log("🛠️ 初始化工具栏...");
    
    // 绑定 "保存" 按钮
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
        saveBtn.onclick = () => {
            // 这里假设您有保存逻辑，或者暂时用 alert
            if (window.saveWorkflowToHomepage) {
                window.saveWorkflowToHomepage();
            } else {
                alert("保存功能暂未连接到主逻辑。");
            }
        };
    }

    // 绑定 "加载" 按钮
    const loadBtn = document.getElementById('btn-load');
    if (loadBtn) {
        loadBtn.onclick = () => {
            alert("加载功能开发中...");
        };
    }

    // 绑定 "清空" 按钮
    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (confirm("确定要清空组装台吗？所有未保存的更改将丢失。")) {
                if (window.builderData) window.builderData = [];
                renderGroups(); // 重新渲染组装台
            }
        };
    }
    
    // 初始化侧边栏搜索框
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterParts(e.target.value);
        });
    }
}

// -----------------------------------------------------------------------------
// 2. 原有逻辑 (加上 export)
// -----------------------------------------------------------------------------
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


// 为了兼容 HTML 中的 onclick="window.deleteLocalRole..."
window.deleteLocalRole = function(roleId, event) {
    if (event) event.stopPropagation();
    if (confirm(`确定要删除角色 [${getRoleName(roleId)}] 吗？此操作不可恢复。`)) {
        const success = RolePartsLibrary.userParts.delete(roleId);
        if (success) {
            renderPartsGrid();
            if (window.showToast) window.showToast('角色已删除', 'success');
        } else {
            alert('删除失败');
        }
    }
};
export async function renderAICategories() {
    const container = document.getElementById('ai-categories');
    if (!container) return;

    console.log("🚀 开始渲染右侧模型列表...");

    try {
        // ============================================================
        // 1. 获取云端模型 (从 Supabase ai_models 表)
        // ============================================================
        const { data: models, error } = await window.supabase
            .from('ai_models')
            .select('*')
            .order('provider');

        if (error) console.error("云端模型获取失败:", error);
        
        // 准备分组数据
        const groups = {};
        
        // 如果有云端数据，进行分组
        if (models && models.length > 0) {
            models.forEach(m => {
                const p = m.provider || '其他';
                if (!groups[p]) groups[p] = [];
                groups[p].push(m);
            });
        }

        // ============================================================
        // 2. 生成云端模型的 HTML
        // ============================================================
        let html = '';
        for (const [provider, items] of Object.entries(groups)) {
            const styleMap = {
                'google': { icon: 'fa-google', color: '#ea4335', name: 'Google' },
                'openai': { icon: 'fa-bolt', color: '#10b981', name: 'OpenAI' },
                'deepseek': { icon: 'fa-code', color: '#8b5cf6', name: 'DeepSeek' },
                'anthropic': { icon: 'fa-brain', color: '#d97706', name: 'Anthropic' }
            };
            const style = styleMap[provider] || { icon: 'fa-robot', color: '#64748b', name: provider.toUpperCase() };

            html += `
            <div class="ai-category expanded">
                <div class="ai-category-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <i class="fas fa-chevron-right"></i>
                    <i class="fas ${style.icon}" style="color: ${style.color}"></i>
                    <span>${style.name}</span>
                </div>
                <div class="ai-models">
                    ${items.map(m => `
                        <div class="ai-model-card" 
                             draggable="true"
                             data-id="${m.model_code}"    
                             data-provider="${m.provider}"
                             ondragstart="window.onRoleDragStart(event)">
                            <div class="model-icon" style="background: ${style.color}">
                                ${m.display_name.charAt(0)}
                            </div>
                            <div class="model-info">
                                <div class="model-name">${m.display_name}</div>
                                <div class="model-provider">${m.sale_price} 积分</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // ============================================================
        // 3. 💡 补回：本地自定义模型 (window.modelAPIConfigs)
        // ============================================================
        if (window.modelAPIConfigs) {
            const customModelsHTML = Array.from(window.modelAPIConfigs.entries())
                .filter(([id]) => id.startsWith('custom_'))
                .map(([id, config]) => `
                    <div class="ai-model-card" 
                         draggable="true" 
                         data-id="${id}" 
                         data-provider="local"
                         ondragstart="window.onRoleDragStart(event)">
                        <div class="model-icon" style="background: #f59e0b">L</div>
                        <div class="model-info">
                            <div class="model-name">${config.displayName || '自定义模型'}</div>
                            <div class="model-provider">本地</div>
                        </div>
                        <div class="model-api-status configured" title="本地配置"><i class="fas fa-plug"></i></div>
                        <button class="model-config-btn" onclick="window.showModelAPIConfig('${id}', event)">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                `).join('');

            // 如果有本地模型，插到最前面
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

        // ============================================================
        // 4. 💡 补回：添加模型按钮
        // ============================================================
        // 创建一个包裹容器来放按钮，或者直接追加到 HTML 底部
        html += `
        <div class="ai-model-card add-new" 
             style="justify-content:center; cursor:pointer; margin-top:10px; border:1px dashed #666;"
             onclick="window.Modals.addCustomModel && window.Modals.addCustomModel()">
            <i class="fas fa-plus-circle" style="margin-right:8px;"></i> 添加本地模型
        </div>`;

        // ============================================================
        // 5. 最终渲染
        // ============================================================
        container.innerHTML = html;
        console.log("✅ 渲染完成！(含本地模型)");

    } catch (e) {
        console.error("渲染出错:", e);
        container.innerHTML = '<div style="color:red; padding:10px;">渲染发生错误</div>';
    }
}

// --- 辅助函数：让代码更干净 ---

function getProviderDisplayName(key) {
    const map = {
        'openai': 'OpenAI',
        'google': 'Google PaLM',
        'deepseek': 'DeepSeek',
        'anthropic': 'Anthropic',
        'aliyun': '阿里云',
        'baidu': '百度千帆'
    };
    return map[key] || key.toUpperCase();
}

function getProviderIcon(key) {
    const map = {
        'openai': 'fa-robot',
        'google': 'fa-google',
        'deepseek': 'fa-code',
        'anthropic': 'fa-brain',
        'aliyun': 'fa-cloud',
        'baidu': 'fa-paw'
    };
    return map[key] || 'fa-microchip';
}

function getProviderColor(key) {
    const map = {
        'openai': '#10b981', // Green
        'deepseek': '#8b5cf6', // Purple
        'google': '#ea4335', // Red
        'anthropic': '#d97706' // Amber
    };
    return map[key] || '#3b82f6'; // Blue default
}

// 异步检测模型状态 (保持您原有的逻辑)
async function checkModelHealth(modelId, provider) {
    const statusEl = document.getElementById(`status-${modelId}`);
    if (!statusEl) return;
    const userKey = localStorage.getItem(`${provider}_api_key`);
    
    if (userKey) {
        statusEl.innerHTML = '<i class="fas fa-user-check" style="color:#3b82f6"></i>'; 
        statusEl.title = "使用您的自定义 Key";
    } else {
        statusEl.innerHTML = '<i class="fas fa-cloud" style="color:#10b981"></i>'; 
        statusEl.title = "平台托管 (正常)";
    }
}


function createModelCard(model) {
    const div = document.createElement('div');
    div.className = 'model-card';
    div.draggable = true;
    div.dataset.id = model.id;
    div.dataset.type = 'model'; // 明确标记为模型
    
    // 绑定数据供拖拽使用
    div.data = model;

    let editBtnHtml = '';
    if (model.isCustom) {
        editBtnHtml = `<i class="fas fa-cog config-icon" onclick="window.Modals.showModelAPIConfig('${model.id}', event)"></i>`;
    }

    div.innerHTML = `
        <i class="fas ${model.icon}"></i>
        <div class="model-info">
            <div class="model-name">${model.name}</div>
            <div class="model-desc">${model.desc}</div>
        </div>
        ${editBtnHtml}
    `;
    return div;
}

export function filterParts(keyword) {
    const cards = document.querySelectorAll('.part-card');
    const lowerKey = keyword.toLowerCase();
    
    cards.forEach(card => {
        const name = card.querySelector('.part-name').innerText.toLowerCase();
        const desc = card.querySelector('.part-desc').innerText.toLowerCase();
        const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.innerText.toLowerCase());
        
        if (name.includes(lowerKey) || desc.includes(lowerKey) || tags.some(t => t.includes(lowerKey))) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// -----------------------------------------------------------------------------
// 3. 其他UI辅助函数
// -----------------------------------------------------------------------------

export function setupDynamicListeners() {
    // 可以在这里添加一些动态生成的元素的事件监听
    // 或者处理窗口缩放等
    window.addEventListener('resize', () => {
        // ... 响应式布局调整 ...
    });
}

export function showToast(message, type = 'info') {
    // 创建一个简单的 Toast 提示
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        padding: 10px 20px; background: #333; color: #fff; 
        border-radius: 4px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') toast.style.background = '#10b981';
    if (type === 'error') toast.style.background = '#ef4444';
    
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// 渲染组装台 (这个函数可能在 main.js 或 workflow.js 中也有用到，放在这里作为 UI 渲染的一部分)
export function renderGroups() {
    const stage = document.getElementById('workflow-stage'); // 假设组装台容器ID
    if (!stage) return;
    stage.innerHTML = '';
    
    if (!window.builderData || window.builderData.length === 0) {
        stage.innerHTML = `<div class="empty-state">拖入角色以组装工作流...</div>`;
        return;
    }
    
    // ... 这里可以添加具体的组装台渲染逻辑 ...
    // 如果您原来的 ui.js 里有 renderGroups 的具体实现，请把它加在这里
    console.log("渲染组装台:", window.builderData);
}
// -----------------------------------------------------------------------------
// 💡 修复：补上 updateApiStatus 函数
// -----------------------------------------------------------------------------
export function updateApiStatus() {
    // 遍历所有角色卡片
    const cards = document.querySelectorAll('.part-card');
    cards.forEach(card => {
        const roleId = card.dataset.id;
        // 检查全局配置中是否有该角色的配置
        const hasConfig = window.apiConfigs && window.apiConfigs.has(roleId);
        
        // 找到配置按钮的图标
        const configIcon = card.querySelector('.api-config-btn i');
        if (configIcon) {
            if (hasConfig) {
                // 如果已配置，变成绿色，表示就绪
                configIcon.style.color = '#10b981'; 
            } else {
                // 否则恢复默认颜色
                configIcon.style.color = '';
            }
        }
    });
}
// -----------------------------------------------------------------------------
// 💡 修复：补上 updateBindingsUI 函数
// -----------------------------------------------------------------------------
export function updateBindingsUI() {
    const cards = document.querySelectorAll('.part-card');
    cards.forEach(card => {
        const roleId = card.dataset.id;
        const bindingIndicator = card.querySelector('.binding-tag');
        
        if (window.bindings && window.bindings.has(roleId)) {
            const modelId = window.bindings.get(roleId);
            // 简单获取模型名称，如果没有 helper 函数则显示 ID
            const modelName = (window.getModelName && window.getModelName(modelId)) || modelId;
            
            if (bindingIndicator) {
                bindingIndicator.innerHTML = `<i class="fas fa-link"></i> ${modelName}`;
                bindingIndicator.style.display = 'inline-block';
            } else {
                // 如果标签区域存在，添加一个新的绑定标签
                const tagsDiv = card.querySelector('.part-tags');
                if (tagsDiv) {
                    const newTag = document.createElement('span');
                    newTag.className = 'tag binding-tag';
                    newTag.style.border = '1px solid #10b981';
                    newTag.style.color = '#10b981';
                    newTag.innerHTML = `<i class="fas fa-link"></i> ${modelName}`;
                    tagsDiv.appendChild(newTag);
                }
            }
        } else {
            // 没有绑定，移除指示器
            if (bindingIndicator) bindingIndicator.remove();
        }
    });
}













