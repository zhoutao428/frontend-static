// frontend/js/workflow-engine.js

/**
 * WorkflowEngine: 通用工作流执行引擎
 * 不依赖 DOM，只负责逻辑调度。
 */
export class WorkflowEngine {
    constructor(apiBridge) {
        this.api = apiBridge;
        this.status = 'idle'; // idle, running, paused
        this.context = { history: [], input: '' };
        this.listeners = { log: [], update: [], error: [] };
        this.currentTask = null;
    }

    // 事件订阅
    on(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }

    emit(event, data) {
        if (this.listeners[event]) this.listeners[event].forEach(fn => fn(data));
    }

    // 启动/继续
    async run(task) {
        this.currentTask = task;
        this.status = 'running';
        this.context.input = task.initialInput || '';
        
        // 恢复上下文 (如果是暂停后继续)
        if (task.results && task.results.length > 0) {
            this.context.history = [...task.results];
        }

        this.emit('log', `[Engine] 🚀 引擎启动: ${task.tpl.name}`);

        try {
            // 从 currentStep 开始执行
            for (let i = task.currentStep; i < task.tpl.steps.length; i++) {
                
                // 1. 暂停检查
                if (this.status === 'paused') {
                    this.emit('log', `[Engine] ⏸️ 暂停在步骤 ${i+1}`);
                    return; 
                }
                if (this.status === 'idle') return; // 被终止

                const stepDef = task.tpl.steps[i];
                const stepName = typeof stepDef === 'string' ? stepDef : stepDef.name;
                const roleId = typeof stepDef === 'string' ? 'idea' : (stepDef.role || 'idea');

                // 2. 更新状态
                task.currentStep = i;
                task.progress = Math.round((i / task.tpl.steps.length) * 100);
                task.status = 'running';
                this.emit('update', task);

                // 3. 构造 Prompt
                let prompt = this._buildPrompt(stepDef, stepName);
                this.emit('log', `[Agent: ${roleId}] 正在执行: ${stepName}...`);

                // 4. 调用 API (真实异步)
                const startTime = Date.now();
                let result = "";
                
                try {
                    // 调用 API Bridge
                    result = await this.api.callAgent(roleId, prompt);
                } catch (err) {
                    this.emit('log', `[Error] ❌ API调用失败: ${err.message}`);
                    // 简单重试逻辑或跳过
                    result = `(执行失败: ${err.message})`;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                
                // 5. 保存结果
                task.results = task.results || [];
                task.results[i] = result;
                this.context.history.push(result);
                task.tokenCost += (prompt.length + result.length); // 简易计费

                this.emit('log', `[Agent] ✅ 完成 (${duration}s)`);
                this.emit('update', task);

                // 冷却
                await new Promise(r => setTimeout(r, 800));
            }

            // 完成
            task.status = 'completed';
            task.progress = 100;
            this.emit('log', `[Engine] 🎉 任务全部完成`);
            this.emit('update', task);
            this.status = 'idle';

        } catch (e) {
            console.error(e);
            this.emit('error', e);
        }
    }

    pause() {
        this.status = 'paused';
    }

    stop() {
        this.status = 'idle';
    }

    // 内部：Prompt 构造器
    _buildPrompt(stepDef, stepName) {
        // 如果模板里定义了 prompt 模板
        if (typeof stepDef === 'object' && stepDef.prompt) {
            let p = stepDef.prompt;
            p = p.replace('{input}', this.context.input);
            const last = this.context.history[this.context.history.length - 1] || '';
            p = p.replace('{prev}', last);
            return p;
        }

        // 默认构造
        let p = `【核心目标】：${this.context.input}\n`;
        p += `【当前步骤】：${stepName}\n`;
        if (this.context.history.length > 0) {
            const last = this.context.history[this.context.history.length - 1];
            p += `【上一步产出】：\n${last.substring(0, 1000)}...\n`;
        }
        return p;
    }
}
