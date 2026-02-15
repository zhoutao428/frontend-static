// js/modules/factory-warehouse-bridge.js

import { RolePartsLibrary } from './role-parts-library.js';

export async function decorateRoleCardWithFactoryButton(card, roleId) {
    const existingBtn = card.querySelector('.factory-to-warehouse-btn');
    if (existingBtn) return;

    // 获取角色信息
    const roleData = RolePartsLibrary.getRoleDetailsEnhanced(roleId);
    if (!roleData) return;

    // 💡 只有 "临时角色" (is_temp) 或者 "本地仓库角色" 才显示按钮
    // 系统角色不需要存
    if (roleData.role_type === 'system') return;

    // 根据状态显示不同按钮文字
    const isTemp = roleData.is_temp;
    const btnText = isTemp ? '<i class="fas fa-save"></i> 存入仓库' : '<i class="fas fa-cloud-upload-alt"></i> 发布云端';
    const btnTitle = isTemp ? '将此临时角色永久保存到本地仓库' : '将此角色发布到公共云端 (仅管理员)';

    const btn = document.createElement('button');
    btn.className = 'factory-to-warehouse-btn';
    btn.innerHTML = btnText;
    btn.title = btnTitle;
    
    // 如果是临时角色，给个醒目的样式
    if (isTemp) {
        btn.style.backgroundColor = '#f59e0b'; // 橙色
        btn.style.color = '#fff';
    }

    btn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

        try {
            // 1. 如果是临时角色 -> 存入本地仓库
            if (isTemp) {
                const success = RolePartsLibrary.userParts.create(roleData);
                if (success) {
                    // 入库成功后，从临时列表移除
                    RolePartsLibrary.tempManager.remove(roleId);
                    window.showToast('✅ 已保存到本地仓库！', 'success');
                } else {
                    throw new Error("保存失败，仓库中可能已存在。");
                }
            } 
            // 2. 如果已经是本地角色 -> 尝试发布到云端 (您的原逻辑)
            else {
                // 只有管理员才能发布
                const { data } = await window.supabase.auth.getSession();
                const userEmail = data.session?.user?.email;
                
                if (userEmail === 'z17756037070@gmail.com') { // 您的管理员邮箱
                    // ... 执行上传逻辑 (您可以复用之前的 fetch 代码) ...
                    window.showToast('✅ (模拟) 已发布到云端！', 'success');
                } else {
                    window.showToast('⚠️ 您没有发布权限，角色已在本地仓库安全保存。', 'info');
                }
            }
        } catch (err) {
            console.error('操作失败:', err);
            window.showToast('❌ ' + err.message, 'error');
        } finally {
            // 刷新列表
            RolePartsLibrary.renderAll();
        }
    };

    card.appendChild(btn);
}
