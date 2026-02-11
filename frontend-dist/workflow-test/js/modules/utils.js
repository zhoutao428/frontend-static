// js/modules/utils.js

// ========== 调试管理器 ==========
export class DebugManager {
    constructor() {
        this.container = document.getElementById('debug-float-container');
        this.handle = document.getElementById('debug-handle');
        this.badge = document.getElementById('debug-badge');
        this.debugCount = document.getElementById('debug-count');
        this.debugLog = document.getElementById('debug-log');
        this.pinBtn = document.querySelector('.debug-pin');
        
        this.messageCount = 0;
        this.isDragging = false;
        this.isPinned = false;
        this.isVisible = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        this.initDragEvents();
        this.initClickEvents();
        this.initAutoHide();
        this.log('调试系统已初始化');
    }
    
    initDragEvents() {
        if(!this.handle) return;
        this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        this.handle.addEventListener('touchstart', (e) => { e.preventDefault(); this.startDrag(e.touches[0]); });
        document.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches[0]) this.onDrag(e.touches[0]); });
        document.addEventListener('touchend', () => this.stopDrag());
    }
    
    initClickEvents() {
        if(!this.handle) return;
        this.handle.addEventListener('click', (e) => { if (!this.isDragging) this.togglePanel(); });
        const panel = this.container.querySelector('.debug-panel');
        if(panel) panel.addEventListener('click', (e) => { e.stopPropagation(); });
    }
    
    initAutoHide() {
        this.container.addEventListener('mouseleave', (e) => { if (!this.isPinned && !this.isDragging) this.hidePanel(); });
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.handle.classList.add('dragging');
        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        if (!this.isPinned) this.showPanel();
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
        this.container.style.right = 'auto';
        this.container.style.bottom = 'auto';
        this.constrainToWindow();
    }
    
    stopDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handle.classList.remove('dragging');
        this.applyEdgeSnap();
    }
    
    constrainToWindow() {
        const rect = this.container.getBoundingClientRect();
        const containerRect = this.container.parentElement.getBoundingClientRect();
        const minX = 0;
        const maxX = containerRect.width - rect.width;
        const minY = 0;
        const maxY = containerRect.height - rect.height;
        let left = parseInt(this.container.style.left);
        let top = parseInt(this.container.style.top);
        if (left < minX) this.container.style.left = minX + 'px';
        if (left > maxX) this.container.style.left = maxX + 'px';
        if (top < minY) this.container.style.top = minY + 'px';
        if (top > maxY) this.container.style.top = maxY + 'px';
    }
    
    applyEdgeSnap() {
        const rect = this.container.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const snapThreshold = 50;
        this.container.classList.remove('left-edge', 'right-edge', 'top-edge', 'bottom-edge');
        if (rect.left < snapThreshold) {
            this.container.classList.add('left-edge');
            this.container.style.left = '10px';
        } else if (windowWidth - rect.right < snapThreshold) {
            this.container.classList.add('right-edge');
            this.container.style.right = '10px';
            this.container.style.left = 'auto';
        }
        if (rect.top < snapThreshold + 60) {
            this.container.classList.add('top-edge');
            this.container.style.top = '70px';
        } else if (windowHeight - rect.bottom < snapThreshold) {
            this.container.classList.add('bottom-edge');
            this.container.style.bottom = '20px';
            this.container.style.top = 'auto';
        }
    }
    
    togglePanel() {
        if (this.isVisible) this.hidePanel();
        else this.showPanel();
    }
    
    showPanel() {
        this.isVisible = true;
        this.container.classList.add('pinned');
        this.isPinned = true;
        if(this.pinBtn) this.pinBtn.classList.add('pinned');
    }
    
    hidePanel() {
        if (!this.isPinned) {
            this.isVisible = false;
            this.container.classList.remove('pinned');
        }
    }
    
    togglePinDebugPanel() {
        this.isPinned = !this.isPinned;
        this.container.classList.toggle('pinned', this.isPinned);
        if(this.pinBtn) this.pinBtn.classList.toggle('pinned', this.isPinned);
        if (!this.isPinned && !this.isDragging) this.hidePanel();
    }
    
    log(message) {
        if(!this.debugLog) {
            console.log(message);
            return;
        }
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${time}] ${message}`;
        this.debugLog.appendChild(logEntry);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
        this.messageCount++;
        this.updateCounters();
        if (message.toLowerCase().includes('error') || message.includes('错误') || message.includes('失败')) {
            if (!this.isVisible) this.showPanel();
        }
    }
    
    clearDebugLog(e) {
        if (e) e.stopPropagation();
        if (confirm('确定要清空调试日志吗？')) {
            this.debugLog.innerHTML = '';
            this.messageCount = 0;
            this.updateCounters();
            this.log('调试日志已清空');
        }
    }
    
    updateCounters() {
        if(this.badge) this.badge.textContent = this.messageCount > 0 ? this.messageCount : '';
        if(this.debugCount) this.debugCount.textContent = `(${this.messageCount})`;
    }
}

// ========== 全局单例与导出 ==========
let debugManagerInstance = null;

// 确保在页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!debugManagerInstance) debugManagerInstance = new DebugManager();
});

export function log(message) {
    if (!debugManagerInstance) debugManagerInstance = new DebugManager();
    debugManagerInstance.log(message);
}

export function toggleDebugPanel() { if (debugManagerInstance) debugManagerInstance.togglePanel(); }
export function togglePinDebugPanel() { if (debugManagerInstance) debugManagerInstance.togglePinDebugPanel(); }
export function clearDebugLog(e) { if (debugManagerInstance) debugManagerInstance.clearDebugLog(e); }

// ========== 通用辅助函数 ==========

export function getRoleName(id) {
    // 1. 尝试从 RolePartsLibrary 查找 (最准确)
    if (window.RolePartsLibrary) {
        const role = window.RolePartsLibrary.getRoleDetailsEnhanced(id);
        if (role) return role.name;
    }
    
    // 2. 尝试从全局缓存查找
    if (window.roleNames && window.roleNames[id]) return window.roleNames[id];
    
    // 3. 兜底：如果是预设 ID，返回中文
    if (id === 'frontend_expert') return '前端专家';
    if (id === 'product_manager') return '产品经理';
    
    // 4. 最后的倔强：返回 ID 本身
    return id;
}

export function getModelName(id) {
    if (window.modelAPIConfigs && window.modelAPIConfigs.get(id)) return window.modelAPIConfigs.get(id).displayName;
    if (id === 'gpt4') return 'GPT-4';
    if (id === 'deepseek-chat') return 'DeepSeek V3';
    // 兼容旧数据
    return window.modelNames?.[id] || id;
}

export function getModelColor(id) {
    if (window.modelColors && window.modelColors[id]) return window.modelColors[id];
    if (id.includes('deepseek')) return '#8b5cf6';
    if (id.includes('gpt')) return '#10b981';
    return '#94a3b8';
}

export function parseJSONSafe(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) {
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlock) { try { return JSON.parse(codeBlock[1]); } catch(e){} }
        const jsonBlock = text.match(/\{[\s\S]*\}/);
        if (jsonBlock) { try { return JSON.parse(jsonBlock[0]); } catch(e){} }
        return null;
    }
}
