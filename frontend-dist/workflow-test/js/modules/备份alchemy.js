// js/modules/alchemy.js
import { chatAPI, alchemyAPI } from '../api.js';
import { log, parseJSONSafe, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid } from './ui.js';

export function updateFurnaceDisplay() {
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

export function checkAlchemyReady() {
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
export async function startAIAlchemy(roleItem, modelItem) {
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
       // ...
    const enhancedData = await callRealAIForEnhancement(rawRole, modelId);

    if (!enhancedData) throw new Error("AI未返回有效数据");
    console.log("【调试】AI返回的数据:", enhancedData); // 👈 加这行
    console.log("【调试】actions 字段:", enhancedData.actions); // 👈 加这行
// 🛡️ 强制兜底：如果没技能，必须补上！
    if (!enhancedData.actions || !Array.isArray(enhancedData.actions) || enhancedData.actions.length === 0) {
    console.log("【调试】触发兜底补丁！"); // 👈 加这行
    console.warn("⚠️ AI未生成技能，正在应用兜底补丁...");
    enhancedData.actions = [
        { label: "⚡ 开始工作", prompt: `作为${enhancedData.name || roleName}，请开始你的工作：` },
        { label: "💡 提供建议", prompt: "请针对当前情况提供你的专业建议：" }
    ];
}

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
        
        // ⚠️ 关键：必须显式传入 actions
        actions: enhancedData.actions, 
        
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
        // 🧼 数据清洗：确保 actions 格式正确
let validActions = [];

if (Array.isArray(enhancedData.actions)) {
    validActions = enhancedData.actions
        .map(act => {
            // 兼容各种奇怪的 AI 输出
            if (typeof act === 'string') {
                return { label: act.substring(0, 6), prompt: `请执行${act}` };
            }
            if (typeof act === 'object' && act !== null) {
                // 有些模型喜欢用 name/description 代替 label/prompt
                const label = act.label || act.name || act.title || "未知技能";
                const prompt = act.prompt || act.description || act.value || label;
                return { label, prompt };
            }
            return null;
        })
        .filter(a => a !== null); // 过滤掉无效的
}

// 如果清洗后没东西，就用兜底
if (validActions.length === 0) {
    validActions = [
        { label: "⚡ 开始工作", prompt: `作为${enhancedData.name}，请开始你的工作：` },
        { label: "💡 提供建议", prompt: "请针对当前情况提供你的专业建议：" }
    ];
}

// 赋值回去
enhancedData.actions = validActions;

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

export async function callRealAIForEnhancement(roleInfo, modelId) {
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

export function resetFurnace() {
    window.alchemyState.materials = [];
    window.alchemyState.isProcessing = false;
    updateFurnaceDisplay();
}

// 模拟/执行工作流
export async function executeWorkflow() {
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


export function stopExecution() {
    log('停止执行工作流');
    document.getElementById('run-status-text').textContent = '已停止';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
}

export async function simulateRoleExecution(roleId, modelId) {
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

export function simulateInteraction() {
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

export function toggleResultsPanel() {
    const panel = document.getElementById('results-panel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}
// 挂载到 window
window.quickAction = async function(roleId, promptTemplate) {
    console.log(`⚡ 触发快捷技能: ${roleId}`);
    
    const stage = document.getElementById('main-stage');
    
    // === 分支 1: Workbench 主页模式 ===
    if (stage && window.createCustomRoleWindow) {
        // 1. 打开/激活窗口
        window.createCustomRoleWindow(roleId);
        
        // 2. 找到窗口里的输入框
        const panel = document.getElementById(`${roleId}-panel`);
        const input = panel?.querySelector('textarea');
        
        if (input) {
            // 3. 填入模板
            input.value = promptTemplate;
            input.focus();
        }
        
        // 4. 切换视图或聚焦
        if (!stage.contains(panel)) {
            stage.appendChild(panel);
            panel.style.display = 'flex';
            const empty = stage.querySelector('.empty-state');
            if(empty) empty.style.display = 'none';
        }
    } 
    // === 分支 2: 炼丹炉预览模式 ===
    else {
        alert(`【技能预览】\n\n角色ID: ${roleId}\n指令模板: ${promptTemplate}\n\n(请在 Workbench 主页中使用此功能以执行)`);
    }
};
export async function autoOrchestrate() {
    // 1. 收集桌面上所有角色
    // 假设 window.builderData 存的是目前的分组情况
    // 或者是左侧列表里的所有自定义角色？通常是用户先拖几个角色到中间，然后点编排
    
    // 这里我们假设用户已经把需要的角色拖到了中间的某个“待定区”或者直接从左侧选
    // 为了简单，我们收集【中间组装台】里所有的角色
    let allRolesOnStage = [];
    window.builderData.forEach(group => {
        group.roles.forEach(roleId => {
            const role = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
            if(role) allRolesOnStage.push(role);
        });
    });

    if (allRolesOnStage.length < 2) {
        return alert("请至少拖入 2 个角色到组装台，AI 才能帮你安排工作！");
    }

    // 2. 询问目标
    const goal = prompt("你想让这支团队完成什么大项目？\n(例如：开发一个外卖APP / 制作一部恐怖短片)");
    if (!goal) return;

    log("🧠 指挥官正在思考战略...");

    try {
        // 3. 调用后台
        const res = await fetch('http://localhost:3001/api/alchemy/orchestrate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                goal: goal,
                availableRoles: allRolesOnStage,
                modelId: '8' // 默认用 GPT-4o 或 DeepSeek (填你数据库里最强的那个ID)
            })
        });

        const plan = await res.json();
        if (plan.error) throw new Error(plan.error);

        // 4. 应用计划 (重绘界面)
        applyPlanToUI(plan);
        
        log(`✅ 战略规划完成！项目：${plan.workflow_name}`);

    } catch (e) {
        alert("编排失败: " + e.message);
    }
}

function applyPlanToUI(plan) {
    const newGroups = plan.steps.map((step, index) => ({
        id: `g_auto_${index}`,
        name: `阶段 ${index+1}: ${step.task.substring(0, 10)}...`,
        roles: [step.role_id],
        
        // ✨ 关键：把 AI 生成的具体任务存起来
        tasks: {
            [step.role_id]: step.task // 存入：PM -> "写功能列表..."
        }
    }));
    
    window.builderData = newGroups;
    renderGroups();
}