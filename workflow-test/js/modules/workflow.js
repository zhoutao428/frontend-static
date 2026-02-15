// js/workflow.js
import { chatAPI } from '../api.js';
import { log, getRoleName } from './utils.js';
import { renderGroups } from './ui.js';

/**
 * 执行完整的工作流
 */
export async function executeWorkflow() {
    console.log('🚀 开始执行工作流...');
    
    // 检查 window.builderData 是否存在且有有效数据
    const hasData = window.builderData && window.builderData.length > 0 && window.builderData.some(group => group.roles.length > 0);
    
    let executionSteps = [];
    let initialGoal = "";

    if (hasData) {
        console.log("📋 检测到现有编排，正在按序执行...");
        initialGoal = prompt("请输入本次执行的具体任务内容 (例如: 写一篇关于AI在医疗领域应用的文章)", "默认任务");
        if (!initialGoal) {
            console.log("用户取消执行。");
            return;
        }

        window.builderData.forEach((group, gIndex) => {
            if (Array.isArray(group.roles)) {
                group.roles.forEach(roleId => {
                    // 确保 task 是一个字符串
                    const task = (group.tasks && typeof group.tasks[roleId] === 'string') ? group.tasks[roleId] : `执行步骤 ${gIndex + 1}`;
                    executionSteps.push({
                        roleId: roleId,
                        roleName: window.getRoleName ? window.getRoleName(roleId) : '未知角色',
                        instruction: task,
                        name: group.name || `阶段 ${gIndex + 1}`
                    });
                });
            }
        });

    } else {
        // 如果没有预设流程，则进入AI自动规划模式
        console.log("🤖 未检测到编排，将启动AI自动规划...");
        const allRoles = window.RolePartsLibrary ? window.RolePartsLibrary.getAllParts() : [];
        if (allRoles.length === 0) {
            alert("请先将角色从左侧仓库拖入组装台！");
            return;
        }

        initialGoal = prompt("请输入最终任务目标 (AI将为您自动规划流程)", "制作一个关于AI的科普视频");
        if (!initialGoal) {
            console.log("用户取消执行。");
            return;
        }

        try {
            const plan = await generateExecutionPlan(initialGoal, allRoles);
            if (!plan || !plan.steps) throw new Error("AI未能生成有效的执行计划。");
            executionSteps = plan.steps;
            applyPlanToUI(plan); // 将AI规划的流程应用到UI上
        } catch (e) {
            alert("AI流程规划失败: " + e.message);
            return;
        }
    }

    // --- 开始执行流程 ---
    const runButton = document.getElementById('btn-run-all');
    const stopButton = document.getElementById('btn-stop');
    const statusText = document.getElementById('run-status-text');
    const resultsPanel = document.getElementById('results-panel');
    const resultContent = document.getElementById('results-content');
    
    statusText.textContent = '执行中...';
    runButton.disabled = true;
    stopButton.disabled = false;
    resultsPanel.style.display = 'flex';
    resultContent.innerHTML = '';

    let previousOutput = initialGoal; // 初始输入为用户的总目标

    for (const step of executionSteps) {
        const roleName = window.getRoleName ? window.getRoleName(step.roleId) : '未知角色';
        
        const logDiv = document.createElement('div');
        logDiv.className = 'result-item';
        logDiv.innerHTML = `<div class="result-header">▶️ 正在执行: <strong>${roleName}</strong></div><div class="result-content" style="color:#aaa;"><i>思考中...</i></div>`;
        resultContent.appendChild(logDiv);
        resultContent.scrollTop = resultContent.scrollHeight; // 自动滚动到底部

        try {
            // 构造传递给当前角色的完整指令
            let currentPrompt = `【总任务目标】: ${initialGoal}\n\n【当前步骤指令】: ${step.instruction}\n\n【上一步的输出内容，请基于此进行处理】:\n${previousOutput}`;
            
            const result = await runAgent(step.roleId, currentPrompt);
            
            if (result) {
                logDiv.innerHTML = `
                    <div class="result-header" style="color:#10b981">✅ <strong>${roleName}</strong> - 完成</div>
                    <div class="result-content">${result.replace(/\n/g, '<br>')}</div>
                `;
                previousOutput = result; // 将当前输出作为下一步的输入
            } else {
                throw new Error("角色未返回任何内容");
            }
            
        } catch (e) {
            console.error(e);
            logDiv.innerHTML = `<div class="result-header" style="color:#ef4444">❌ <strong>${roleName}</strong> - 失败</div><div class="result-content">${e.message}</div>`;
            logDiv.classList.add('error');
            statusText.textContent = '执行出错';
            runButton.disabled = false;
            stopButton.disabled = true;
            return; // 出错后停止整个工作流
        }
        
        await new Promise(r => setTimeout(r, 500)); // 每个步骤之间短暂延时
    }

    statusText.textContent = '执行完成';
    runButton.disabled = false;
    stopButton.disabled = true;
    
    if (confirm("工作流执行完毕！\n是否将此流程保存到您的「工作流中心」？")) {
        saveWorkflowToHomepage();
    }
}

/**
 * 停止工作流执行 (一个简单的标志位实现)
 */
export function stopExecution() {
    console.log('🛑 用户请求停止执行工作流');
    document.getElementById('run-status-text').textContent = '已停止';
    document.getElementById('btn-run-all').disabled = false;
    document.getElementById('btn-stop').disabled = true;
    // 注意: 一个健壮的实现需要一个全局中断标志，在 executeWorkflow 的循环中进行检查
}

/**
 * 使用 AI 自动编排工作流
 */
export async function autoOrchestrate(passedModelId) { 
    // 获取当前在组装台上的所有角色
    let allRolesOnStage = [];
    if (window.builderData && Array.isArray(window.builderData)) {
        window.builderData.forEach(group => {
            if (Array.isArray(group.roles)) {
                group.roles.forEach(roleId => {
                    const role = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
                    if (role) allRolesOnStage.push(role);
                });
            }
        });
    }
    // 去重
    allRolesOnStage = [...new Map(allRolesOnStage.map(r => [r.id, r])).values()];

    if (allRolesOnStage.length < 2) {
        alert("AI编排至少需要 2 个不同的角色在组装台上！");
        return;
    }

    const goal = prompt(`检测到 ${allRolesOnStage.length} 名待命角色。\n\n请下达您的最终作战目标：`, "制作一个关于AI的科普视频，并发布到社交媒体");
    if (!goal) return;

    console.log("🧠 指挥官正在思考战略...");
    window.showToast("🧠 AI指挥官正在规划中...", "info");

    try {
        const plannerModelCode = passedModelId || 'deepseek-chat'; // 默认的规划模型
        const res = await fetch('https://public-virid-chi.vercel.app/api/alchemy/orchestrate', { // 注意：这是您项目中的API地址
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                goal: goal,
                availableRoles: allRolesOnStage.map(r => ({
                    id: r.id,
                    name: r.name,
                    desc: r.description || (Array.isArray(r.tags) ? r.tags.join(',') : '')
                })),
                modelId: plannerModelCode
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `服务器错误 ${res.status}`);
        }

        const plan = await res.json();
        applyPlanToUI(plan);
        console.log(`✅ 战略规划完成！项目：${plan.workflow_name}`);
        window.showToast(`✅ 战略规划完成！`, 'success');

    } catch (e) {
        console.error(e);
        alert(`AI编排失败: ${e.message}`);
    }
}

/**
 * 将 AI 生成的计划应用到 UI
 */
function applyPlanToUI(plan) {
    if (!plan || !plan.steps || !Array.isArray(plan.steps)) {
        alert("AI 未生成有效的步骤列表，请检查API返回。");
        return;
    }
    const newGroups = plan.steps.map((step, index) => {
        const taskContent = step.task || step.instruction || "无具体指令";
        const roleId = step.role_id;
        
        return {
            id: `g_auto_${Date.now()}_${index}`,
            name: `阶段 ${index + 1}: ${step.name || taskContent.substring(0, 15)}`,
            roles: [roleId],
            tasks: { [roleId]: taskContent }
        };
    });
    
    window.builderData = newGroups;
    if(window.renderGroups) window.renderGroups();
}

/**
 * 调用后端生成执行计划 (此函数可能是 autoOrchestrate 的一部分，根据您的后端设计保留)
 */
async function generateExecutionPlan(goal, roles) {
    console.log("🧠 指挥官正在制定作战计划...");
    const roleDescriptions = roles.map(r => ({
        id: r.id,
        name: r.name,
        desc: r.description
    }));

    // 假设您的后端有一个专门用于规划的端点
    const res = await fetch('https://public-virid-chi.vercel.app/api/alchemy/plan', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ goal, roles: roleDescriptions })
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "规划API请求失败");
    }
    return await res.json();
}

/**
 * 执行单个 Agent (角色)
 */
async function runAgent(roleId, prompt) {
    console.log(`[RunAgent] 角色 ${roleId} 开始执行任务...`);
    
    // 获取该角色绑定的模型ID，如果没有则使用默认模型
    const modelId = (window.bindings && window.bindings.get(roleId)) || 'deepseek-chat';
    const roleDetails = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    
    // 使用角色的 system_prompt 作为系统消息
    const systemPrompt = roleDetails?.prompt_template || `你是一个专业的 ${roleDetails?.name || '助手'}。`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ];

    try {
        // 假设 chatAPI 在全局可用或已导入
        const response = await window.chatAPI.send(modelId, messages);
        return response.content || response.response;
    } catch (e) {
        console.error("Agent execution failed:", e);
        throw e; // 将错误向上抛出，让 executeWorkflow 捕获并处理
    }
}

/**
 * 保存当前工作流到首页（本地存储）
 */
function saveWorkflowToHomepage() {
    const workflowName = prompt("给这套工作流起个名字：", "自动化新闻稿生成流程");
    if (!workflowName) return;

    const newWorkflow = {
        id: `wf_${Date.now()}`,
        name: workflowName,
        groups: window.builderData,
        bindings: window.bindings ? Array.from(window.bindings.entries()) : [],
        createdAt: new Date().toISOString()
    };

    const savedWorkflows = JSON.parse(localStorage.getItem('user_workflows') || '[]');
    savedWorkflows.unshift(newWorkflow); // 新的放最前面
    localStorage.setItem('user_workflows', JSON.stringify(savedWorkflows));

    alert(`✅ 工作流 [${workflowName}] 已保存！\n请前往首页「功能中心 -> 工作流中心」查看并使用。`);
}

/**
 * 切换结果面板的显示/隐藏
 */
export function toggleResultsPanel() {
    const panel = document.getElementById('results-panel');
    if(panel) {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    }
}
