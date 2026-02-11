// js/modules/state.js
import { log } from './utils.js';

export function initState() {
    if (!window.bindings) window.bindings = new Map();
    if (!window.apiConfigs) window.apiConfigs = new Map();
    if (!window.modelAPIConfigs) window.modelAPIConfigs = new Map();
    if (!window.builderData) window.builderData = [];
    if (!window.draggedItem) window.draggedItem = null;
    if (!window.draggedType) window.draggedType = null;
    if (!window.roleNames) window.roleNames = {};
    if (!window.modelNames) window.modelNames = {};
    if (!window.modelColors) window.modelColors = {};
}

export function loadTestData() {
    window.builderData = [
        { id: 'g1', name: '规划阶段', roles: [] },
        { id: 'g2', name: '执行阶段', roles: [] }
    ];
    window.bindings.set('frontend_expert', 'deepseek_v3');
    window.bindings.set('data_analyst', 'gpt4');
    loadTestApiConfigs();
}

function loadTestApiConfigs() {
    const testConfigs = {
        'frontend_expert': { type: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat', temperature: 0.8, systemPrompt: '你是一个资深前端开发专家...' },
        'data_analyst': { type: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4-turbo', temperature: 0.7, systemPrompt: '你是一个数据分析专家...' }
    };
    Object.keys(testConfigs).forEach(roleId => {
        window.apiConfigs.set(roleId, testConfigs[roleId]);
    });
}

export function loadAllAPIConfigs() {
    const saved = localStorage.getItem('workflow_api_configs_all');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.roles) Object.keys(parsed.roles).forEach(id => window.apiConfigs.set(id, parsed.roles[id]));
            if (parsed.models) {
                Object.keys(parsed.models).forEach(id => window.modelAPIConfigs.set(id, parsed.models[id]));
            }
            log(`已从本地恢复配置`);
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

export function saveAllAPIConfigs() {
    const allConfigs = {
        roles: Object.fromEntries(window.apiConfigs.entries()),
        models: Object.fromEntries(window.modelAPIConfigs.entries())
    };
    localStorage.setItem('workflow_api_configs_all', JSON.stringify(allConfigs));
}

export function resetAll() {
    if (confirm('确定要重置所有数据吗？这将清除所有工作流和绑定。')) {
        window.builderData = [{ id: 'g1', name: '新工作流', roles: [] }];
        window.bindings.clear();
        window.apiConfigs.clear();
        // 重新渲染将在 main.js 或 UI 模块调用
        location.reload(); // 简单粗暴刷新重置
    }
}

export function exportConfig() {
    const workflowName = document.getElementById('workflow-name')?.value || 'workflow';
    const config = {
        workflow: { name: workflowName, groups: window.builderData, bindings: Array.from(window.bindings.entries()) },
        apiConfigs: Array.from(window.apiConfigs.entries()).map(([roleId, config]) => {
            const safeConfig = { ...config };
            if (safeConfig.apiKey) safeConfig.apiKey = '***MASKED***';
            return [roleId, safeConfig];
        }),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${workflowName}-config.json`);
    linkElement.click();
    log('配置已导出');
}
