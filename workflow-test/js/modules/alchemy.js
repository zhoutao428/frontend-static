// js/modules/alchemy.js
import { chatAPI, alchemyAPI } from '../api.js';
import { log, parseJSONSafe, getRoleName, getModelName } from './utils.js';
import { renderPartsGrid, renderGroups } from './ui.js';

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
    
    const roleMaterial = materials.find(m => m.type === 'role');
    const modelMaterial = materials.find(m => m.type === 'model');

    if (roleMaterial && modelMaterial) {
        console.log('✅ 原料齐备，正在构造 Mock DOM...');

        // === 辅助工具：提取纯字符串 ===
        const extractString = (val) => {
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val !== null) {
                // 尝试取常见字段
                return val.name || val.title || val.innerText || "未知";
            }
            return String(val || "");
        };

        // === 构造 Role Mock ===
        // 有时候 id 也是对象，解包一下
        const realRoleData = roleMaterial.id?.id ? roleMaterial.id : roleMaterial;
        const roleNameStr = extractString(realRoleData.name || realRoleData.id?.name);

        const mockRoleEl = {
            dataset: { id: realRoleData.id || "unknown_role" },
            getAttribute: () => realRoleData.id || "unknown_role",
            querySelector: (sel) => {
                // 模拟 .part-name
                if (sel.includes('name')) return { innerText: roleNameStr };
                // 模拟 .part-icon i
                if (sel.includes('icon') || sel.includes('i')) return { 
                    className: extractString(realRoleData.icon || "fa-user") 
                };
                // 兜底
                return { innerText: "" }; 
            }
        };

        // === 构造 Model Mock ===
        const realModelData = modelMaterial.id?.id ? modelMaterial.id : modelMaterial;
        const modelNameStr = extractString(realModelData.name || modelMaterial.name);

        const mockModelEl = {
            dataset: { id: realModelData.id || "unknown_model" },
            getAttribute: () => realModelData.id || "unknown_model",
            querySelector: (sel) => {
                // 🛠️ 暴力修复：不管 name 是啥，先转成字符串
                if (sel.includes('name')) {
                    const rawName = realModelData.name;
                    const safeName = (typeof rawName === 'object') ? (rawName.innerText || "AI模型") : rawName;
                    return { innerText: String(safeName), trim: () => String(safeName).trim() };
                }
                return { innerText: "" };
            }
        };

        // 调用主函数
        startAIAlchemy(mockRoleEl, mockModelEl).catch(e => console.error("❌ 启动失败:", e));
    }
}
// ============ 2. 启动炼丹 (主流程) ============
// js/alchemy.js - startAIAlchemy (原生修复版)

export async function startAIAlchemy(roleItem, modelItem) {
    console.log('炼丹参数:', { roleItem, modelItem });

    // 1. 提取ID (保持你原来的通用逻辑)
    let roleId = roleItem;
    if (typeof roleId === 'object') roleId = roleId.id || roleId.data?.id || roleItem.dataset?.id;
    
    let modelId = modelItem;
    if (typeof modelId === 'object') modelId = modelId.id || modelId.data?.id || modelItem.dataset?.id;

    // 2. 获取名称 (尝试多种方式，防止报错)
    const getSafeName = (item) => {
        if (!item) return "未知";
        if (typeof item === 'string') return "未知"; // 只有ID没法取名
        return item.name || item.querySelector?.('.part-name')?.innerText.trim() || "未知";
    };
    
    // 优先用全局工具函数，没有就兜底
    const roleName = window.getRoleName ? window.getRoleName(roleId) : getSafeName(roleItem);
    const modelName = window.getModelName ? window.getModelName(modelId) : getSafeName(modelItem);

    log(`🔥 检查炼丹条件: ${roleName} + ${modelName}`);

    // 3. 检查模型配置 (保持原样)
    const isCloudModel = typeof modelId === 'string' && !modelId.startsWith('custom_');
    const modelConfig = window.modelAPIConfigs ? window.modelAPIConfigs.get(modelId) : null;

    if (!isCloudModel && (!modelConfig || !modelConfig.endpoint)) {
        log(`❌ 失败：模型 [${modelName}] 未配置API地址`);
        alert(`请先为 [${modelName}] 配置API地址`);
        if (window.alchemyState) {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
        }
        if (window.updateFurnaceDisplay) updateFurnaceDisplay();
        return;
    }

    log(`✅ 炼丹条件满足，开始炼制...`);

    // 4. 启动动画 (加了安全检查，无论你用新版还是旧版动画都能跑)
    if (window.AlchemyAnimation) {
        try {
            const roleData = { name: roleName, icon: 'fa-user' };
            const modelData = { name: modelName, id: modelId };
            
            // 自动识别方法名
            if (typeof window.AlchemyAnimation.startAlchemy === 'function') {
                window.AlchemyAnimation.startAlchemy(roleData, modelData);
            } else if (typeof window.AlchemyAnimation.start === 'function') {
                window.AlchemyAnimation.start(roleData, modelData);
            }
        } catch (e) {
            console.warn('动画启动微瑕:', e);
        }
    }

    // 5. 锁定状态
    if (window.alchemyState) window.alchemyState.isProcessing = true;
    if (window.updateFurnaceDisplay) updateFurnaceDisplay();

    try {
        // 6. 获取原始角色数据 (🛡️ 这里修复了你的报错！)
        let rawRole = null;

        // A. 尝试从增强接口获取
        if (window.RolePartsLibrary && typeof RolePartsLibrary.getRoleDetailsEnhanced === 'function') {
            try { rawRole = RolePartsLibrary.getRoleDetailsEnhanced(roleId); } catch(e){}
        }

        // B. 尝试从 userParts 获取 (修复了 .find 报错)
        if (!rawRole && typeof roleId === 'string' && roleId.startsWith('user_')) {
            // 关键修复：加了问号检查，防止 userParts 未定义
            if (window.RolePartsLibrary && window.RolePartsLibrary.userParts && typeof window.RolePartsLibrary.userParts.find === 'function') {
                rawRole = RolePartsLibrary.userParts.find(roleId);
            }
        }

        // C. 兜底数据 (防止 rawRole 为空导致后面崩)
        if (!rawRole) {
            rawRole = { name: roleName, id: roleId, tags: [], description: "", icon: "fa-user" };
        }

        // 7. 调用真实API
        log(`🤖 调用AI API进行角色增强...`);
        const enhancedData = await callRealAIForEnhancement(rawRole, modelId);
        
        if (!enhancedData) throw new Error("AI未返回有效数据");
        console.log("【调试】AI返回的数据:", enhancedData);

        // 8. 组装新角色
        const newRoleName = enhancedData.name || `${roleName} (增强版)`;
        const newRole = {
            name: newRoleName,
            description: enhancedData.description || `由 ${modelName} 增强`,
            icon: rawRole.icon || 'fa-robot',
            bg_class: 'role-ai',
            expertise: enhancedData.tags || enhancedData.expertise || [], // 兼容不同字段
            prompt_template: enhancedData.prompt || enhancedData.system_prompt || "",
            actions: enhancedData.actions || [],
            capabilities: enhancedData.capabilities || { core: [] }, // 补全字段
            role_type: 'user',
            is_deletable: true,
            created_at: new Date().toISOString()
        };

        // ============================================
        // 👇 这里是你要求的：管理员存云端 / 用户存本地逻辑 👇
        // ============================================
        
        let userEmail = '';
        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            userEmail = data.session?.user?.email;
            token = data.session?.access_token;
        }

        console.log(`👤 结算身份: ${userEmail}`);

        // 分支 A: 管理员
        if (userEmail === 'z17756037070@gmail.com') {
            if (confirm(`👑 管理员操作\n\n是否发布到官方云端仓库？\n(取消则存入本地)`)) {
                try {
                    // 存云端
                    const cloudRole = { ...newRole, role_type: 'system', is_deletable: false };
                    
                    const res = await fetch(`${API_BASE}/api/roles`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(cloudRole)
                    });
                    
                    if (!res.ok) throw new Error("云端上传失败");
                    const savedRole = await res.json();
                    showToast(`🎉 [官方] 角色已发布！`);
                } catch(e) {
                    alert("发布失败: " + e.message);
                    saveToLocal(newRole); // 失败兜底
                }
            } else {
                saveToLocal(newRole); // 管理员手动选本地
            }
        } 
        // 分支 B: 普通用户
        else {
            saveToLocal(newRole);
        }

        // 9. 成功收尾
        log(`✅ 炼丹成功！新角色 [${newRoleName}] 已生成`);

        if (window.AlchemyAnimation && window.AlchemyAnimation.finish) {
            window.AlchemyAnimation.finish();
        }

        // 10. 清理现场 (不再刷新页面，只重置数据)
        setTimeout(() => {
            if (window.alchemyState) {
                window.alchemyState.materials = [];
                window.alchemyState.isProcessing = false;
                if(window.updateFurnaceDisplay) window.updateFurnaceDisplay();
            }
        }, 2000);

    } catch (error) {
        console.error(error);
        log(`❌ 炼丹失败: ${error.message}`);
        
        if (window.AlchemyAnimation && window.AlchemyAnimation.showError) {
            window.AlchemyAnimation.showError(error.message);
        }
        
        // 重置状态
        if (window.alchemyState) {
            window.alchemyState.materials = [];
            window.alchemyState.isProcessing = false;
            if(window.updateFurnaceDisplay) updateFurnaceDisplay();
        }
    }
}

function saveToLocal(role) {
    // 1. 生成本地 ID (如果还没有)
    if (!role.id || !role.id.startsWith('local_')) {
        role.id = `local_${Date.now()}`;
    }
    
    role.is_local = true;
    role.role_type = 'user'; // 标记为用户自制
    role.is_deletable = true; // 允许删除

    // 2. 存入 LocalStorage
    let localRoles = [];
    try {
        localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
    } catch(e) { localRoles = []; }

    // 把新角色插到最前面
    localRoles.unshift(role);
    localStorage.setItem('user_templates', JSON.stringify(localRoles));
    
    console.log(`✅ [Save] 角色 ${role.name} 已保存到本地`);

    // 3. 核心：立即刷新左侧列表 UI
    // 尝试调用各种可能的刷新方法 (兼容不同版本代码)
    if (window.RolePartsLibrary) {
        // 如果有 loadUserRoles 方法 (新版)
        if (typeof window.RolePartsLibrary.loadUserRoles === 'function') {
            window.RolePartsLibrary.loadUserRoles();
        } 
        // 如果没有，尝试直接添加到 userParts (旧版)
        else if (window.RolePartsLibrary.userParts && window.RolePartsLibrary.userParts.add) {
            window.RolePartsLibrary.userParts.add(role);
            if (window.RolePartsLibrary.userParts.render) {
                window.RolePartsLibrary.userParts.render();
            }
        }
    }
    
    // 如果有全局刷新函数
    if (typeof window.renderPartsGrid === 'function') {
        window.renderPartsGrid();
    }

    // 4. 提示用户
    showToast(`🎉 炼制完成！角色 [${role.name}] 已加入左侧列表`);
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
            console.log("🦙 正在调用本地模型:", modelConfig.model);
            
            // 构造更强的 System Prompt，强制 JSON
            const systemPrompt = "你是一个JSON生成器。只返回纯JSON，不要包含Markdown标记，不要包含任何解释性文字。";
            
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelConfig.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: simplePrompt }
                    ],
                    stream: false,
                    format: "json" // 👈 关键！Ollama 新版支持强制 JSON 模式
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`本地模型连接失败 (${response.status}): ${errText}`);
            }

            const data = await response.json();
            
            // 兼容性提取
            let content = data.message?.content || data.response; // Ollama 有时候用 response 字段
            
            if (!content) throw new Error("Ollama 返回内容为空");

            console.log("🦙 原始返回:", content);

            // 清洗 Markdown (以防万一)
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            enhancedData = JSON.parse(content); // 这里的 parseJSONSafe 改回 JSON.parse，因为我们已经清洗了

        } catch (err) {
            console.error("❌ 本地炼丹失败:", err);
            // 失败后不应该 throw，而是应该让它降级去用“白板数据”或者提示用户
            // 如果 throw，整个流程就断了
            alert(`本地模型调用失败: ${err.message}，将使用基础模板。`);
            
            // 兜底数据
            enhancedData = {
                name: roleName,
                description: "本地模型生成失败，这是默认描述。",
                expertise: ["基础能力"],
                tone: "默认",
                prompt: "你是一个助手。"
            };
        }


    // --- 分支 B: 云端模型 (走 Next.js 后台) ---
    }else {
        log(`🤖 请求云端炼丹 (Prompt 受保护)...`);
        try {
            // 👇 调试代码：打印 modelId 的详细信息
            console.log('🔥【炼丹调试】roleName:', roleInfo.name);
            console.log('🔥【炼丹调试】原始modelId:', modelId, '类型:', typeof modelId);
            console.log('🔥【炼丹调试】转换后modelId:', typeof modelId === 'string' ? parseInt(modelId, 10) : modelId);
            
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
// ============ 5. Toast 工具 ============
function showToast(msg, type='info') {
    if (window.showToast) {
        window.showToast(msg, type);
    } else {
        alert(msg);
    }
}
export function resetFurnace() {
    window.alchemyState.materials = [];
    window.alchemyState.isProcessing = false;
    updateFurnaceDisplay();
}

export async function executeWorkflow() {
    log('🚀 开始执行工作流...');
    
    // 1. 检查是否已有编排数据
    const hasData = window.builderData && window.builderData.length > 0 && window.builderData[0].roles.length > 0;
    
    // 2. 准备步骤列表 (Steps)
    let executionSteps = [];
    let initialGoal = "";

    if (hasData) {
        // === 分支 A: 按现有布局执行 (你现在的场景) ===
        // 如果用户已经把角色摆好了(或者AI已经编排好了)，直接跑
        log("📋 检测到现有编排，正在按序执行...");
        initialGoal = prompt("请输入本次执行的具体内容 (例如: 关于DeepSeek的新闻)", "默认任务");
        if (!initialGoal) return;

        // 把 builderData 拍平成一个执行队列
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
        // === 分支 B: 从零开始 (如果桌面是空的) ===
        const allRoles = getAllRolesOnStage(); // 需确保有此辅助函数，或直接用 RolePartsLibrary.userParts.getAll()
        if (allRoles.length === 0) return alert("请先拖入角色或使用 AI 编排！");

        initialGoal = prompt("请输入任务目标 (AI 将自动规划流程)");
        if (!initialGoal) return;

        try {
            const plan = await generateExecutionPlan(initialGoal, allRoles);
            executionSteps = plan.steps; // 使用 AI 生成的步骤
            applyPlanToUI(plan);         // 同时更新界面
        } catch (e) {
            return alert("规划失败: " + e.message);
        }
    }

    // 3. 初始化 UI
    document.getElementById('run-status-text').textContent = '执行中...';
    document.getElementById('btn-run-all').disabled = true;
    document.getElementById('results-panel').style.display = 'flex';
    const resultContent = document.getElementById('results-content');
    resultContent.innerHTML = ''; // 清空旧日志

    // 4. 开始循环执行 (The Loop)
    let context = { goal: initialGoal }; 
    let previousOutput = initialGoal; // 接力棒初始值

    for (const step of executionSteps) {
        const roleName = getRoleName(step.roleId);
        
        // UI 显示正在执行
        const logDiv = document.createElement('div');
        logDiv.className = 'result-item';
        logDiv.innerHTML = `<div class="result-header">▶️ 正在执行: ${roleName}</div><div class="result-content" style="color:#aaa;">思考中...</div>`;
        resultContent.appendChild(logDiv);
        resultContent.scrollTop = resultContent.scrollHeight;

        try {
            // 构造 Prompt
            let prompt = step.instruction || "请处理上一步的输出";
            prompt += `\n\n【上一步输入】:\n${previousOutput}`;
            
            // 真实调用 (复用 runAgent)
            const result = await window.runAgent(step.roleId, prompt);
            
            // 更新结果
            if (result) {
                logDiv.innerHTML = `
                    <div class="result-header" style="color:#10b981">✅ ${roleName} 完成</div>
                    <div class="result-content">${result.replace(/\n/g, '<br>')}</div>
                `;
                previousOutput = result; // 传递接力棒
            } else {
                throw new Error("无返回内容");
            }
            
        } catch (e) {
            console.error(e);
            logDiv.innerHTML = `<div class="result-header" style="color:#ef4444">❌ ${roleName} 失败</div><div class="result-content">${e.message}</div>`;
            logDiv.classList.add('error');
        }
        
        // 稍微停顿，避免请求过快
        await new Promise(r => setTimeout(r, 1000));
    }

    // 5. 结束
    document.getElementById('run-status-text').textContent = '执行完成';
    document.getElementById('btn-run-all').disabled = false;
    
    // 6. 保存询问
    if (confirm("执行完毕！是否保存此工作流到首页？")) {
        // ... (调用 saveWorkflowToHomepage)
    }
}

// 辅助函数 (如果没有定义的话)
function getAllRolesOnStage() {
    // 简单返回所有自定义角色
    return window.RolePartsLibrary.userParts.getAll();
}
// 保存到首页的逻辑
function saveWorkflowToHomepage() {
    const workflowName = prompt("给这套工作流起个名字：", "今日新闻全自动流");
    if (!workflowName) return;

    // 1. 打包数据
    const newWorkflow = {
        id: `wf_${Date.now()}`,
        name: workflowName,
        groups: window.builderData, // 当前的分组配置
        bindings: Array.from(window.bindings.entries()), // 角色与模型的绑定关系
        createdAt: new Date().toISOString()
    };

    // 2. 存入 LocalStorage (首页会去读)
    const savedWorkflows = JSON.parse(localStorage.getItem('user_workflows') || '[]');
    savedWorkflows.push(newWorkflow);
    localStorage.setItem('user_workflows', JSON.stringify(savedWorkflows));

    // 3. 提示
    alert(`✅ 已保存！\n请前往首页「功能中心 -> 工作流中心」查看并使用。`);
    
    // 可选：直接跳转
    // window.location.href = 'index.html';
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
export async function autoOrchestrate(passedModelId) { 
   // 1. 收集桌面上所有角色 (从 builderData 里找)
    let allRolesOnStage = [];
    
    // 遍历所有分组，把里面的角色都挖出来
    window.builderData.forEach(group => {
        if (Array.isArray(group.roles)) {
            group.roles.forEach(roleId => {
                // 兼容对象或字符串ID
                const id = typeof roleId === 'object' ? roleId.id : roleId;
                const role = RolePartsLibrary.getRoleDetailsEnhanced(id);
                if (role) allRolesOnStage.push(role);
            });
        }
    });

    // 去重 (防止同一个角色被统计多次)
    allRolesOnStage = [...new Map(allRolesOnStage.map(r => [r.id, r])).values()];

    if (allRolesOnStage.length < 2) {
        return alert("请至少拖入 2 个角色到组装台，AI 才能帮你安排工作！\n(现在的团队太单薄了)");
    }

    // 2. 询问目标
    const goal = prompt(`指挥官已就位！\n检测到 ${allRolesOnStage.length} 名待命角色。\n\n请下达作战目标：`, "制作一个关于AI的科普视频");
    if (!goal) return;

    log("🧠 指挥官正在思考战略 (调用后台规划引擎)...");

    try {
        // 3. 调用后台 (使用指定模型 Code，防止 ID 变动)
        // 建议用 'gpt-4o' 或 'deepseek-chat'，取决于你后台上架了谁
        const plannerModelCode = passedModelId || 'deepseek-chat';

        const res = await fetch('http://localhost:3001/api/alchemy/orchestrate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                goal: goal,
                availableRoles: allRolesOnStage.map(r => ({
                    id: r.id,
                    name: r.name,
                    desc: r.description || r.tags.join(',')
                })), // 只传必要信息，省 Token
                modelId: plannerModelCode
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `服务器错误 ${res.status}`);
        }

        const plan = await res.json();
        
        // 4. 应用计划
        applyPlanToUI(plan);
        
        log(`✅ 战略规划完成！项目：${plan.workflow_name}`);

    } catch (e) {
        console.error(e);
        alert(`编排失败: ${e.message}\n请检查后台是否上架了策划模型 (gpt-4o / deepseek-chat)`);
    }
}

export function applyPlanToUI(plan) {
    if (!plan || !plan.steps || !Array.isArray(plan.steps)) {
        return alert("AI 未生成有效的步骤列表");
    }

    const newGroups = plan.steps.map((step, index) => {
        // ⚠️ 核心修复：兼容各种字段名
        const taskContent = step.task || step.instruction || step.description || step.content || "无具体指令";
        
        // 安全截取 (防止非字符串报错)
        const safeTask = String(taskContent);
        const shortName = safeTask.length > 10 ? safeTask.substring(0, 10) + '...' : safeTask;

        // 自动任命逻辑...
        const roleId = step.role_id;
        const roleName = step.role_name || `执行者${index}`;
        
        // 如果是临时ID (AI生成的)，尝试在现有角色里找，或者新建
        // ... (保持你原有的 create 逻辑) ...

        return {
            id: `g_auto_${index}`,
            name: `阶段 ${index+1}: ${shortName}`,
            roles: [roleId],
            tasks: { [roleId]: safeTask } // 存入任务
        };
    });
    
    window.builderData = newGroups;
    renderGroups();
}

export async function generateExecutionPlan(goal, roles) {
    log("🧠 指挥官正在制定作战计划...");
    
    // 把桌面上的角色信息发给后台
    const roleDescriptions = roles.map(r => ({
        id: r.id,
        name: r.name,
        desc: r.description
    }));

    // 调用后台的新接口 (稍后我们去写这个接口)
    const res = await fetch('http://localhost:3001/api/alchemy/plan', {
        method: 'POST',
        body: JSON.stringify({ goal, roles: roleDescriptions })
    });
    
    return await res.json(); // 返回计划步骤数组
}
export async function runAgent(roleId, prompt) {
    console.log(`[RunAgent] ${roleId} 开始执行...`);
    
    // 1. 确定模型
    // 优先用绑定模型，没有就用 DeepSeek
    const modelId = window.bindings.get(roleId) || 'deepseek-chat';
    
    // 2. 构造消息
    const messages = [
        { role: 'system', content: `你是一个${getRoleName(roleId)}。` },
        { role: 'user', content: prompt }
    ];

    try {
        // 3. 调用 API
        const response = await chatAPI.send(modelId, messages);
        return response.content || response.response;
        
    } catch (e) {
        console.error("Agent execution failed:", e);
        throw e;
    }

}
// 放在 alchemy.js 最底部
function saveToLocal(role) {
    role.id = `local_${Date.now()}`;
    role.is_local = true;
    
    let localRoles = [];
    try {
        localRoles = JSON.parse(localStorage.getItem('user_templates') || '[]');
    } catch(e) {}
    
    localRoles.unshift(role);
    localStorage.setItem('user_templates', JSON.stringify(localRoles));
    
    // 尝试刷新左侧栏 (兼容旧代码)
    if (window.renderPartsGrid) window.renderPartsGrid();
    else if (window.RolePartsLibrary && window.RolePartsLibrary.userParts && window.RolePartsLibrary.userParts.init) {
        // 如果有 init 方法，重新跑一次
        window.RolePartsLibrary.userParts.init(); 
    }
    
    showToast(`✅ 角色 [${role.name}] 已存入本地`);
}

















