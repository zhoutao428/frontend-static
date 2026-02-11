// Token使用量追踪器
// 记录每个角色的使用情况，处理合并角色的Token计算

const STORAGE_KEY = 'role_usage_stats';

// 使用记录结构
export class RoleUsageTracker {
    constructor() {
        this.usageStats = this.loadStats();
    }
    
    // 加载使用记录
    loadStats() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('加载角色使用记录失败:', e);
            return {};
        }
    }
    
    // 保存使用记录
    saveStats() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usageStats));
        } catch (e) {
            console.error('保存角色使用记录失败:', e);
        }
    }
    
    // 记录一次使用
    recordUsage(roleId, usageData) {
        if (!usageData || !usageData.total_tokens) return;
        
        // 初始化角色记录
        if (!this.usageStats[roleId]) {
            this.usageStats[roleId] = {
                totalTokens: 0,
                totalSessions: 0,
                lastUsed: new Date().toISOString(),
                sessions: []
            };
        }
        
        const stats = this.usageStats[roleId];
        
        // 更新统计
        stats.totalTokens += usageData.total_tokens;
        stats.totalSessions += 1;
        stats.lastUsed = new Date().toISOString();
        
        // 记录会话详情
        stats.sessions.push({
            timestamp: new Date().toISOString(),
            tokens: usageData.total_tokens,
            promptTokens: usageData.prompt_tokens || 0,
            completionTokens: usageData.completion_tokens || 0,
            model: usageData.model || 'unknown'
        });
        
        // 保持最近的100条记录
        if (stats.sessions.length > 100) {
            stats.sessions = stats.sessions.slice(-100);
        }
        
        this.saveStats();
        
        console.log(`📊 记录使用: ${roleId} +${usageData.total_tokens} tokens`);
        return stats;
    }
    
    // 获取角色使用统计
    getUsage(roleId) {
        return this.usageStats[roleId] || {
            totalTokens: 0,
            totalSessions: 0,
            lastUsed: null,
            sessions: []
        };
    }
    
    // 获取合并角色的使用统计（继承+新增）
    getMergedRoleUsage(mergedId) {
        if (!mergedId.includes('+')) {
            return this.getUsage(mergedId);
        }
        
        const components = mergedId.split('+');
        const mergedStats = {
            totalTokens: 0,
            totalSessions: 0,
            lastUsed: null,
            sessions: [],
            mergedComponents: components,
            componentStats: {}
        };
        
        // 累加各组成部分的使用量
        components.forEach(compId => {
            const compStats = this.getUsage(compId);
            mergedStats.totalTokens += compStats.totalTokens;
            mergedStats.totalSessions += compStats.totalSessions;
            
            // 记录组成部分详情
            mergedStats.componentStats[compId] = {
                totalTokens: compStats.totalTokens,
                totalSessions: compStats.totalSessions,
                lastUsed: compStats.lastUsed
            };
            
            // 合并sessions（可选，可能需要去重）
            mergedStats.sessions = mergedStats.sessions.concat(compStats.sessions);
        });
        
        // 合并角色自身的记录（如果有）
        const selfStats = this.getUsage(mergedId);
        if (selfStats.totalTokens > 0) {
            mergedStats.totalTokens += selfStats.totalTokens;
            mergedStats.totalSessions += selfStats.totalSessions;
            mergedStats.sessions = mergedStats.sessions.concat(selfStats.sessions);
            mergedStats.lastUsed = selfStats.lastUsed || mergedStats.lastUsed;
        }
        
        return mergedStats;
    }
    
    // 清除角色记录
    clearRoleUsage(roleId) {
        delete this.usageStats[roleId];
        this.saveStats();
    }
    
    // 获取所有角色统计
    getAllStats() {
        return { ...this.usageStats };
    }
    
    // 获取使用量排名
    getUsageRanking(limit = 10) {
        const entries = Object.entries(this.usageStats);
        entries.sort((a, b) => b[1].totalTokens - a[1].totalTokens);
        return entries.slice(0, limit).map(([id, stats]) => ({
            roleId: id,
            totalTokens: stats.totalTokens,
            totalSessions: stats.totalSessions,
            lastUsed: stats.lastUsed
        }));
    }
    
    // 格式化显示使用量
    formatTokenCount(tokens) {
        if (tokens < 1000) return `${tokens} tokens`;
        if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
        return `${(tokens / 1000000).toFixed(2)}M`;
    }
    
    // 获取角色使用量显示文本
    getUsageDisplayText(roleId) {
        const stats = roleId.includes('+') 
            ? this.getMergedRoleUsage(roleId)
            : this.getUsage(roleId);
        
        const tokenText = this.formatTokenCount(stats.totalTokens);
        
        if (stats.mergedComponents) {
            const compText = stats.mergedComponents.map(compId => {
                const compStats = this.getUsage(compId);
                return `${compId}: ${this.formatTokenCount(compStats.totalTokens)}`;
            }).join(' + ');
            
            return `${tokenText} (继承自: ${compText})`;
        }
        
        return `${tokenText} (${stats.totalSessions} 次使用)`;
    }
}

// 创建全局实例
const usageTracker = new RoleUsageTracker();

// 导出单例
export default usageTracker;