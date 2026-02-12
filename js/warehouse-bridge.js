// warehouse-bridge.js - 首页与仓库的桥梁

// ============ 清理工作台 ============
window.clearWorkspace = function() {
    sessionStorage.removeItem('workspace_temp_roles');
    if (window.renderSidebar) {
        // 重新加载原始模板
        window.initSystemData?.();
        window.renderSidebar?.();
    }
    showToast('🧹 工作台已清空');
};

// ============ 从仓库取用（供仓库页面调用）============
window.takeRoleFromWarehouse = function(role) {
    // 这个函数会被 warehouse.js 调用
    // 实际逻辑已在 warehouse.js 中实现
    console.log('角色已取用:', role.name);
};

// ============ 提示工具 ============
function showToast(message) {
    let toast = document.querySelector('.workspace-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'workspace-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #10b981;
            border-radius: 8px;
            padding: 10px 20px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}
