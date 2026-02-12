// factory-bridge.js - 工厂与仓库的桥梁

// ============ 炼成后自动入库（已实现，补充提示）============
// 在原有的 startAIAlchemy 成功位置添加

// 找到这个位置：if (res.ok) { ... }
// 在后面追加：

/*
// 炼制成功提示
const goToWarehouse = confirm(
    `✅ 角色「${newRoleName}」炼制成功！\n\n已自动存入角色仓库。\n\n是否现在前往仓库查看？`
);

if (goToWarehouse) {
    window.location.href = 'role-manager.html?tab=roles';
}
*/

// ============ 手动将角色设为预制 ============
window.markAsPrebuild = async function(roleId) {
    if (!confirm('确定将该角色设为预制吗？\n预制角色所有人可见且不可删除。')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('user_token');
        const res = await fetch(`http://localhost:3001/api/roles/${roleId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                role_type: 'system',
                is_deletable: false
            })
        });
        
        if (res.ok) {
            alert('✅ 已设为预制角色，所有人可见');
        } else {
            throw new Error('操作失败');
        }
    } catch (error) {
        alert('设置失败，请检查权限');
    }
};

// ============ 一键导出所有自定义角色到仓库 ============
window.exportAllToWarehouse = async function() {
    if (!confirm('将当前所有自定义角色批量存入仓库？')) {
        return;
    }
    
    // 获取当前工厂的自定义角色
    const customRoles = window.RolePartsLibrary?.userParts?.getAll?.() || [];
    
    if (customRoles.length === 0) {
        alert('没有可导出的角色');
        return;
    }
    
    let success = 0;
    let failed = 0;
    
    for (const role of customRoles) {
        try {
            const token = localStorage.getItem('user_token');
            const res = await fetch(`http://localhost:3001/api/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: role.name,
                    description: role.description || '自定义角色',
                    expertise: role.tags || [],
                    role_type: 'user',
                    icon: role.icon || 'fa-user',
                    bg_class: role.bg_class || 'role-dev'
                })
            });
            
            if (res.ok) success++;
            else failed++;
        } catch (e) {
            failed++;
        }
    }
    
    alert(`✅ 导出完成\n成功: ${success} 个\n失败: ${failed} 个`);
};
