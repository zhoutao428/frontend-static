// role-loader.js - 所有页面统一角色加载器
// 提供 window.loadRoles() 方法，返回合并后的角色列表

window.loadRoles = async function() {
    // 1. 读本地
    const local = JSON.parse(localStorage.getItem('user_templates') || '[]');
    
    // 2. 读云端
    let cloud = [];
    try {
        const { data } = await window.supabase.auth.getSession();
        const token = data.session?.access_token;
        
        if (token) {
            const res = await fetch('https://public-virid-chi.vercel.app/api/roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                cloud = data.map(r => ({
                    id: `cloud_${r.id}`,
                    name: r.name,
                    description: r.description,
                    icon: r.icon || 'fa-user',
                    bgClass: r.bg_class || 'role-dev',
                    type: 'cloud',
                    originalId: r.id
                }));
            }
        }
    } catch (e) {
        console.warn('云端加载失败', e);
    }
    
    // 3. 合并去重
    const seen = new Set();
    const merged = [];
    
    [...cloud, ...local].forEach(item => {
        if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
        }
    });
    
    return merged;
};
