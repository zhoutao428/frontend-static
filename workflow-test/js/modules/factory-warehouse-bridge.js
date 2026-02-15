// 文件: factory-warehouse-bridge.js

export async function decorateRoleCardWithFactoryButton(card, roleId) {
    // 按钮对所有用户都可见，所以我们先创建它
    const existingBtn = card.querySelector('.factory-to-warehouse-btn');
    if (existingBtn) return;

    const btn = document.createElement('button');
    btn.className = 'factory-to-warehouse-btn';
    btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
    btn.title = '将此角色配置存入仓库';

    // 核心逻辑：点击时再判断用户身份，并执行不同操作
    btn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

        try {
            // 1. 获取用户身份
            const { data } = await window.supabase.auth.getSession();
            const userEmail = data.session?.user?.email;
            const token = data.session?.access_token;

            // 2. 获取完整的角色数据
            const roleData = window.RolePartsLibrary.getRoleDetailsEnhanced(roleId);
            if (!roleData) {
                throw new Error(`无法获取角色 [${roleId}] 的完整信息！`);
            }

            // 3. 智能判断：是管理员还是普通用户？
            if (userEmail === 'z17756037070@gmail.com') {
                // --- 管理员路径：上传到云端服务器 ---
                if (!token) throw new Error('管理员会话无效，请重新登录');
                
                console.log("👮‍♂️ 管理员操作：正在存入云端仓库...");
                const payload = {
                    name: roleData.name,
                    description: roleData.description || roleData.desc || '无描述',
                    expertise: roleData.expertise || roleData.tags || [],
                    icon: roleData.icon || 'fa-user',
                    bg_class: roleData.bg_class || 'role-dev',
                    prompt_template: roleData.prompt_template || "",
                    actions: roleData.actions || [],
                    capabilities: roleData.capabilities || { core: [] },
                    role_type: 'system', // 存入云端，标记为系统角色
                    is_deletable: false
                };

                const res = await fetch('https://public-virid-chi.vercel.app/api/roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || '云端保存失败');
                }
                showToast('✅ 角色已成功发布到云端仓库！', 'success');

            } else {
                // --- 普通用户路径：保存到本地仓库 ---
                console.log("👤 普通用户操作：正在存入本地仓库...");
                
                // 为了区分，我们给存入仓库的角色一个新的ID
                const roleForWarehouse = { ...roleData, id: `wh_${Date.now()}` };

                const savedWarehouseRoles = JSON.parse(localStorage.getItem('user_warehouse_roles') || '[]');
                savedWarehouseRoles.unshift(roleForWarehouse); // 放到最前面
                localStorage.setItem('user_warehouse_roles', JSON.stringify(savedWarehouseRoles));
                
                showToast('✅ 角色已存入您的本地仓库！');
            }

            btn.innerHTML = '<i class="fas fa-check"></i> 已存入';

        } catch (err) {
            console.error('存入仓库失败:', err);
            showToast('操作失败: ' + err.message, 'error');
            btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
        } finally {
            // 无论成功失败，2秒后恢复按钮状态
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
            }, 2000);
        }
    };

    card.appendChild(btn);
}

// 确保您的项目中有 showToast 函数，如果没有，可以用 alert 替代
function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}
