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
    const container = document.getElementById('parts-grid');
    if (!container) return;
    container.innerHTML = '';

    const allParts = RolePartsLibrary.getAllParts();
    
    allParts.forEach(part => {
        const card = createRoleCard(part);
        container.appendChild(card);
    });

    // 重新初始化拖拽，确保新生成的卡片也能拖
    if (window.DragDrop && window.DragDrop.initializeDragAndDrop) {
        window.DragDrop.initializeDragAndDrop();
    } else {
        // 兼容旧的拖拽初始化
        initializeDragAndDrop();
    }
}

export function createRoleCard(part) {
    const card = document.createElement('div');
    card.className = `part-card ${part.category || 'custom'}`;
    if (part.bg_class) card.classList.add(part.bg_class);
    
    card.draggable = true;
    card.dataset.id = part.id;
    card.dataset.type = 'role'; // 明确标记为角色
    
    // 确保把完整数据绑定到 DOM 元素上，供拖拽时使用
    card.data = part; 

    // 构建标签HTML
    const tagsHtml = (part.tags || part.expertise || []).slice(0, 3)
        .map(tag => `<span class="tag">${tag}</span>`).join('');

    // 如果是自定义角色，添加删除按钮
    let deleteBtnHtml = '';
    if (part.is_local && part.is_deletable) {
        deleteBtnHtml = `<button class="delete-role-btn" onclick="window.deleteLocalRole('${part.id}', event)" title="删除此角色">×</button>`;
    }

    card.innerHTML = `
        ${deleteBtnHtml}
        <div class="part-icon"><i class="fas ${part.icon || 'fa-user'}"></i></div>
        <div class="part-info">
            <div class="part-name">${part.name}</div>
            <div class="part-desc" title="${part.description || ''}">${part.description || '暂无描述'}</div>
            <div class="part-tags">${tagsHtml}</div>
        </div>
        <div class="part-actions">
            <button class="btn-icon" onclick="window.Modals.showApiConfig('${part.id}', event)" title="配置API">
                <i class="fas fa-cog"></i>
            </button>
            <button class="btn-icon" onclick="window.Modals.showRoleDetails('${part.id}')" title="查看详情">
                <i class="fas fa-info-circle"></i>
            </button>
            <button class="btn-icon" onclick="window.Modals.createCustomRoleWindow('${part.id}')" title="对话测试">
                <i class="fas fa-comment-dots"></i>
            </button>
        </div>
    `;

    // 绑定右键菜单
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (window.showContextMenu) {
            window.showContextMenu(e, part);
        }
    });

    // 添加“存入仓库”按钮 (如果有权限)
    decorateRoleCardWithFactoryButton(card, part.id);

    return card;
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

export function renderAICategories() {
    const container = document.getElementById('ai-models-list');
    if (!container) return;
    container.innerHTML = '';

    // 1. 预设的云端模型 (DeepSeek, GPT等)
    const presets = [
        { id: 'deepseek-chat', name: 'DeepSeek V3', icon: 'fa-brain', desc: '通用对话' },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', icon: 'fa-code', desc: '代码生成' },
        { id: 'gpt-4o', name: 'GPT-4o', icon: 'fa-robot', desc: '高级推理' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', icon: 'fa-bolt', desc: '快速响应' }
    ];

    presets.forEach(model => {
        const el = createModelCard(model);
        container.appendChild(el);
    });

    // 2. 用户自定义的本地模型 (Ollama等)
    if (window.modelAPIConfigs) {
        window.modelAPIConfigs.forEach((config, id) => {
            if (id.startsWith('custom_')) {
                const model = { 
                    id: id, 
                    name: config.displayName || '未命名模型', 
                    icon: 'fa-server', 
                    desc: '本地/自定义模型',
                    isCustom: true 
                };
                const el = createModelCard(model);
                container.appendChild(el);
            }
        });
    }
    
    // 添加“新建模型”按钮
    const addBtn = document.createElement('div');
    addBtn.className = 'model-card add-new';
    addBtn.innerHTML = `<i class="fas fa-plus"></i> 添加模型`;
    addBtn.onclick = () => {
        if(window.Modals && window.Modals.addCustomModel) window.Modals.addCustomModel();
    };
    container.appendChild(addBtn);
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

