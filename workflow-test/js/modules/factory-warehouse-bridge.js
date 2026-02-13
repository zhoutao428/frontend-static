// factory-warehouse-bridge.js
// 功能：工厂侧边栏每张卡片加一个【存入仓库】按钮

(function() {
    // 等待页面加载完成
    setTimeout(() => {
        // 给所有现有卡片加按钮
        addWarehouseButtons();
        
        // 监听新卡片添加（MutationObserver）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList?.contains('part-card')) {
                        addButtonToCard(node);
                    }
                });
            });
        });
        
        observer.observe(document.getElementById('parts-grid'), {
            childList: true,
            subtree: false
        });
    }, 1000);
    
    // 给所有卡片加按钮
    function addWarehouseButtons() {
        document.querySelectorAll('.part-card').forEach(addButtonToCard);
    }
    
    // 单张卡片加按钮
    function addButtonToCard(card) {
        // 避免重复添加
        if (card.querySelector('.btn-warehouse-save')) return;
        
        // 获取角色信息
        const roleName = card.querySelector('.part-name')?.textContent || '未知角色';
        const roleId = card.dataset.roleId || `card_${Date.now()}`;
        
        // 创建按钮
        const btn = document.createElement('button');
        btn.className = 'btn-warehouse-save';
        btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
        btn.style.cssText = `
            background: #10b981;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11px;
            margin-left: 8px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = '#059669';
        btn.onmouseout = () => btn.style.background = '#10b981';
        
        // 点击存入仓库
        btn.onclick = async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
            
            try {
                // 获取角色详细信息
                let roleData = null;
                if (window.RolePartsLibrary) {
                    roleData = RolePartsLibrary.userParts?.find(roleId) || 
                              RolePartsLibrary.getRoleDetails?.(roleId);
                }
                
                const { data } = await window.supabase.auth.getSession();
                const token = data.session?.access_token;
                if (!token) {
                    alert('请先登录');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
                    return;
                }
                
                const res = await fetch('https://public-virid-chi.vercel.app/api/roles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: roleData?.name || roleName,
                        description: roleData?.description || '由工厂生成的角色',
                        expertise: roleData?.tags || roleData?.expertise || [],
                        icon: roleData?.icon || 'fa-user',
                        bg_class: roleData?.bg_class || 'role-dev',
                        role_type: 'user',
                        is_deletable: true
                    })
                });
                
                if (res.ok) {
                    btn.innerHTML = '<i class="fas fa-check"></i> 已存入';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
                        btn.disabled = false;
                    }, 2000);
                } else {
                    throw new Error('保存失败');
                }
            } catch (e) {
                console.error(e);
                alert('保存失败，请重试');
                btn.innerHTML = '<i class="fas fa-archive"></i> 存入仓库';
                btn.disabled = false;
            }
        };
        
        // 插入到卡片操作区
        const actions = card.querySelector('.part-actions');
        if (actions) {
            actions.appendChild(btn);
        } else {
            // 如果没有操作区，自己建一个
            const div = document.createElement('div');
            div.className = 'part-actions';
            div.style.cssText = 'display:flex; gap:8px; margin-top:8px;';
            div.appendChild(btn);
            card.appendChild(div);
        }
    }
})();



