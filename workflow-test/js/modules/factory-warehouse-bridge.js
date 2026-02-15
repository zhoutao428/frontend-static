// js/modules/factory-warehouse-bridge.js

function decorateRoleCardWithFactoryButton(card, roleId) {
    const existingBtn = card.querySelector('.factory-to-warehouse-btn');
    if (existingBtn) return;

    // 获取角色
    const roleData = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    if (!roleData) return;

    // 如果是系统角色，不显示按钮
    if (roleData.role_type === 'system') return;

    // 判断状态
    const isTemp = roleData.is_temp;
    
    // 按钮样式
    const btn = document.createElement('button');
    btn.className = 'factory-to-warehouse-btn';
    btn.innerHTML = isTemp ? '<i class="fas fa-save"></i> 保存' : '<i class="fas fa-check"></i> 已保存';
    
    // 如果已经是正式角色，禁用按钮
    if (!isTemp) {
        btn.disabled = true;
        btn.style.opacity = 0.5;
    } else {
        btn.style.backgroundColor = '#f59e0b'; // 橙色提醒保存
    }

    btn.onclick = async (e) => {
        e.stopPropagation();

        // 💡 核心逻辑：转正
        // 把数据写入 LocalStorage
        const success = window.RolePartsLibrary.userParts.create(roleData);
        
        if (success) {
            // 从临时区移除 (防止重复显示)
            window.RolePartsLibrary.tempManager.remove(roleId);
            
            if (window.showToast) window.showToast('✅ 已正式存入仓库！', 'success');
        } else {
            alert("保存失败");
        }
    };

    card.appendChild(btn);
}

// ⚠️ 手动挂载
window.decorateRoleCardWithFactoryButton = decorateRoleCardWithFactoryButton;

