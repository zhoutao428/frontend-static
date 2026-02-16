// js/modules/workflow.js

// -----------------------------------------------------------------------------
// 1. 工作流执行核心
// -----------------------------------------------------------------------------
export async function executeWorkflow() {
    console.log("🚀 开始执行工作流...");
    
    if (!window.builderData || window.builderData.length === 0) {
        alert("组装台为空！请先拖入角色。");
        return;
    }

    // 显示结果面板
    toggleResultsPanel(true);
    const content = document.getElementById('results-content');
    if(content) content.innerHTML = '';

    // 遍历步骤执行
    let previousOutput = "无"; // 上一步的输出
    
    for (let i = 0; i < window.builderData.length; i++) {
        const group = window.builderData[i];
        const roleId = group.roles[0]; // 简化：假设每步一个角色
        const task = group.tasks[roleId] || "执行默认任务";
        
        // UI 反馈
        if(content) content.innerHTML += `<div class="log-item">▶️ 步骤 ${i+1}: ${group.name || '未命名'} (角色: ${roleId})</div>`;
        
        try {
            // 构造 Prompt
            const prompt = `【上一步输出】: ${previousOutput}\n【当前任务】: ${task}`;
            
            // 调用 runAgent
            const result = await runAgent(roleId, prompt);
            
            // 更新输出
            previousOutput = result;
            if(content) content.innerHTML += `<div class="log-item success">✅ 完成: ${result.substring(0, 50)}...</div>`;
            
        } catch (e) {
            console.error(e);
            if(content) content.innerHTML += `<div class="log-item error">❌ 失败: ${e.message}</div>`;
            break; // 出错停止
        }
    }
    
    console.log("✅ 工作流执行完毕");
}

export function stopExecution() {
    console.log("🛑 停止执行");
    // 这里需要配合 executeWorkflow 里的中断标志来实现，为简化暂只打日志
    alert("停止指令已发送");
}

// -----------------------------------------------------------------------------
// 2. 单角色执行 (runAgent) - 核心函数
// -----------------------------------------------------------------------------
export async function runAgent(roleId, prompt) {
    console.log(`🤖 RunAgent: ${roleId}`);
    
    // 1. 获取角色配置
    const role = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    if (!role) throw new Error("角色不存在");
    
    // 2. 获取 API 配置 (模型、Key等)
    const config = window.apiConfigs ? window.apiConfigs.get(roleId) : null;
    // 如果没有配置，使用默认
    const model = config?.model || 'gpt-3.5-turbo';
    
    // 3. 模拟调用 (这里应替换为真实的 API fetch)
    // ⚠️ 请务必确认这里是否有真实的 API 调用逻辑，如果有请粘贴
    return new Promise(resolve => setTimeout(() => {
        resolve(`[${role.name}] 的回复: 我收到了任务 "${prompt.substring(0, 10)}..."`);
    }, 1000));
}

// -----------------------------------------------------------------------------
// 3. AI 自动编排
// -----------------------------------------------------------------------------
export async function autoOrchestrate(modelId) {
    const goal = prompt("请输入任务目标 (AI自动规划):");
    if (!goal) return;
    
    console.log(`🧠 AI正在规划: ${goal}`);
    // ... 这里是您的自动编排逻辑 ...
    // ... 模拟生成一个计划 ...
    
    const plan = [
        { name: "分析需求", roles: ["user_1"], tasks: { "user_1": "分析用户输入" } },
        { name: "生成方案", roles: ["user_2"], tasks: { "user_2": "根据分析生成代码" } }
    ];
    
    // 应用到 UI
    window.builderData = plan;
    if (window.renderGroups) window.renderGroups();
}

export function toggleResultsPanel(show) {
    const panel = document.getElementById('results-panel');
    if (panel) {
        panel.style.display = show ? 'flex' : (panel.style.display === 'flex' ? 'none' : 'flex');
    }
}

// -----------------------------------------------------------------------------
// 4. 挂载到 Window
// -----------------------------------------------------------------------------
window.executeWorkflow = executeWorkflow;
window.stopExecution = stopExecution;
window.runAgent = runAgent;
window.autoOrchestrate = autoOrchestrate;
window.toggleResultsPanel = toggleResultsPanel;

