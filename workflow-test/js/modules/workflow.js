// js/modules/workflow.js
import { log, getRoleName, getModelName } from './utils.js';
import { chatAPI } from '../api.js';
import { renderGroups } from './ui.js';
import { alchemyAPI } from '../api.js';  // 添加这一行
/**
 * 执行完整工作流
 */
export async function executeWorkflow() {
    log('🚀 开始执行工作流...');
    
    const hasData = window.builderData && window.builderData.length > 0 && window.builderData[0].roles.length > 0;
    
    let executionSteps = [];
    let initialGoal = "";

    if (hasData) {
        log("📋 检测到现有编排，正在按序执行...");
        initialGoal = prompt("请输入本次执行的具体内容 (例如: 关于DeepSeek的新闻)", "默认任务");
        if (!initialGoal) return;

        window.builderData.forEach((group, gIndex) => {
            if (Array.isArray(group.roles)) {
                group.roles.forEach(roleId => {
                    const task = (group.tasks && group.tasks[roleId]) || `执行步骤 ${gIndex+1}`;
                    executionSteps.push({
                        roleId: roleId,
                        roleName: getRoleName(roleId),
                        instruction: task,
                        name: group.name || `阶段 ${gIndex+1}`
                    });
                });
            }
        });

    } else {
        const allRoles = getAllRolesOnStage();
        if (allRoles.length === 0) return alert("请先拖入角色或使用 AI 编排！");

        initialGoal = prompt("请输入任务目标 (AI 将自动规划流程)");
        if (!initialGoal) return;

        try {
            const plan = await generateExecutionPlan(initialGoal, allRoles);
            executionSteps = plan.steps;
            applyPlanToUI(plan);
        } catch (e) {
            return alert("规划失败: " + e.message);
        }
    }

    document.getElementById('run-status-text').textContent = '执行中...';
    document.getElementById('btn-run-all').disabled = true;
    document.getElementById('results-panel').style.display = 'flex';
    const resultContent = document.getElementById('results-content');
    resultContent.innerHTML = '';

    let previousOutput = initialGoal;

    for (const step of executionSteps) {
        const roleName = getRoleName(step.roleId);
        
        const logDiv = document.createElement('div');
        logDiv.className = 'result-item';
        logDiv.innerHTML = `<div class="result-header">▶️ 正在执行: ${roleName}</div><div class="result-content" style="color:#aaa;">思考中...</div>`;
        resultContent.appendChild(logDiv);
        resultContent.scrollTop = resultContent.scrollHeight;

        try {
            let prompt = step.instruction || "请处理上一步的输出";
            prompt += `\n\n【上一步输入】:\n${previousOutput}`;
            
            const result = await runAgent(step.roleId, prompt);
            
            if (result) {
                logDiv.innerHTML = `
                    <div class="result-header" style="color:#10b981">✅ ${roleName} 完成</div>
                    <div class="result-content">${result.replace(/\n/g, '<br>')}</div>
                `;
                previousOutput = result;
            } else {
                throw new Error("无返回内容");
            }
            
        } catch (e) {
            console.error(e);
            logDiv.innerHTML = `<div class="result-header" style="color:#ef4444">❌ ${roleName} 失败</div><div class="result-content">${e.message}</div>`;
            logDiv.classList.add('error');
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }

    document.getElementById('run-status-text').textContent = '执行完成';
    document.getElementById('btn-run-all').disabled = false;
    
    if (confirm("执行完毕！是否保存此工作流到仓库？")) {
    saveWorkflowToWarehouse();
    alert("✅ 已保存到仓库！");
    window.location.href = 'index.html';  // 或者跳转到仓库页面
}
}

/**
 * 停止工作流执行
 */
export function stopExecution() {
    log('停止执行工作流');
    document.getElementById('run-status-text').textContent = '已停止';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
}

/**
 * 切换结果面板显示
 */
export function toggleResultsPanel() {
    const panel = document.getElementById('results-panel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
}

/**
 * 自动编排工作流
 */
export async function autoOrchestrate(passedModelId) { 
    let allRolesOnStage = [];
    
    window.builderData.forEach(group => {
        if (Array.isArray(group.roles)) {
            group.roles.forEach(roleId => {
                const id = typeof roleId === 'object' ? roleId.id : roleId;
                const role = RolePartsLibrary.getRoleDetailsEnhanced(id);
                if (role) allRolesOnStage.push(role);
            });
        }
    });

    allRolesOnStage = [...new Map(allRolesOnStage.map(r => [r.id, r])).values()];

    if (allRolesOnStage.length < 2) {
        return alert("请至少拖入 2 个角色到组装台，AI 才能帮你安排工作！\n(现在的团队太单薄了)");
    }

    const goal = prompt(`指挥官已就位！\n检测到 ${allRolesOnStage.length} 名待命角色。\n\n请下达作战目标：`, "制作一个关于AI的科普视频");
    if (!goal) return;

    log("🧠 指挥官正在思考战略 (调用后台规划引擎)...");

    try {
        const plannerModelCode = passedModelId || 'deepseek-chat';

        // 替换原来的 fetch 代码
const planData = await alchemyAPI.orchestrate({
    goal: goal,
    availableRoles: allRolesOnStage.map(r => ({
        id: r.id,
        name: r.name,
        desc: r.description || r.tags.join(',')
    })),
    modelId: plannerModelCode
});

applyPlanToUI(planData);
        
        log(`✅ 战略规划完成！项目：${planData.workflow_name}`);
    } catch (e) {
        console.error(e);
        alert(`编排失败: ${e.message}\n请检查后台是否上架了策划模型 (gpt-4o / deepseek-chat)`);
    }
}

/**
 * 应用编排计划到UI
 */
export function applyPlanToUI(plan) {
    if (!plan || !plan.steps || !Array.isArray(plan.steps)) {
        return alert("AI 未生成有效的步骤列表");
    }

    const newGroups = plan.steps.map((step, index) => {
        const taskContent = step.task || step.instruction || step.description || step.content || "无具体指令";
        
        const safeTask = String(taskContent);
        const shortName = safeTask.length > 10 ? safeTask.substring(0, 10) + '...' : safeTask;

        const roleId = step.role_id;
        const roleName = step.role_name || `执行者${index}`;

        return {
            id: `g_auto_${index}`,
            name: `阶段 ${index+1}: ${shortName}`,
            roles: [roleId],
            tasks: { [roleId]: safeTask }
        };
    });
    
    window.builderData = newGroups;
    renderGroups();
}

/**
 * 生成执行计划
 */
export async function generateExecutionPlan(goal, roles) {
    log("🧠 指挥官正在制定作战计划...");
    
    const roleDescriptions = roles.map(r => ({
        id: r.id,
        name: r.name,
        desc: r.description
    }));

    const res = await fetch('http://localhost:3001/api/alchemy/plan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ goal, roles: roleDescriptions })
    });
    
    return await res.json();
}

/**
 * 运行单个Agent
 */
export async function runAgent(roleId, prompt) {
    console.log(`[RunAgent] ${roleId} 开始执行...`);
    
    const modelId = window.bindings.get(roleId) || 'deepseek-chat';
    
    const messages = [
        { role: 'system', content: `你是一个${getRoleName(roleId)}。` },
        { role: 'user', content: prompt }
    ];

    try {
        const response = await chatAPI.send(modelId, messages);
        return response.content || response.response;
        
    } catch (e) {
        console.error("Agent execution failed:", e);
        throw e;
    }
}

/**
 * 获取舞台上所有角色
 */
function getAllRolesOnStage() {
    return window.RolePartsLibrary ? window.RolePartsLibrary.userParts.getAll() : [];
}

/**
 * 保存工作流到首页
 */
function saveWorkflowToHomepage() {
    const workflowName = prompt("给这套工作流起个名字：", "今日新闻全自动流");
    if (!workflowName) return;

    const newWorkflow = {
        id: `wf_${Date.now()}`,
        name: workflowName,
        groups: window.builderData,
        bindings: Array.from(window.bindings.entries()),
        createdAt: new Date().toISOString()
    };

    const savedWorkflows = JSON.parse(localStorage.getItem('user_workflows') || '[]');
    savedWorkflows.push(newWorkflow);
    localStorage.setItem('user_workflows', JSON.stringify(savedWorkflows));

    alert(`✅ 已保存！\n请前往首页「功能中心 -> 工作流中心」查看并使用。`);
}

/**
 * 模拟角色执行
 */
export async function simulateRoleExecution(roleId, modelId) {
    const roleName = getRoleName(roleId);
    const hasAPI = window.apiConfigs ? window.apiConfigs.has(roleId) : false;
    
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

/**
 * 快捷操作
 */
window.quickAction = async function(roleId, promptTemplate) {
    console.log(`⚡ 触发快捷技能: ${roleId}`);
    
    const stage = document.getElementById('main-stage');
    
    if (stage && window.createCustomRoleWindow) {
        window.createCustomRoleWindow(roleId);
        
        const panel = document.getElementById(`${roleId}-panel`);
        const input = panel?.querySelector('textarea');
        
        if (input) {
            input.value = promptTemplate;
            input.focus();
        }
        
        if (!stage.contains(panel)) {
            stage.appendChild(panel);
            panel.style.display = 'flex';
            const empty = stage.querySelector('.empty-state');
            if(empty) empty.style.display = 'none';
        }
    } else {
        alert(`【技能预览】\n\n角色ID: ${roleId}\n指令模板: ${promptTemplate}\n\n(请在 Workbench 主页中使用此功能以执行)`);
    }
};





