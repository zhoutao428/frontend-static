// 角色映射和显示规则
import { ROLE_LIBRARY } from './role-library.js';

// 获取角色元数据（主函数） - 先声明简单版本
export function getRoleMetadata(roleId) {
    // 1. 直接匹配
    if (ROLE_LIBRARY[roleId]) {
        return { ...ROLE_LIBRARY[roleId] };
    }
    
    // 2. 合并角色模式匹配 (如 pm+ui)
    if (roleId.includes('+')) {
        return getMergedRoleMetadata(roleId);
    }
    
    // 3. 自定义角色模式匹配 (如 custom_xxx)
    if (roleId.startsWith('custom_')) {
        return getCustomRoleMetadata(roleId);
    }
    
    // 4. 默认角色（从后端动态添加的）
    return getDefaultRoleMetadata(roleId);
}

// 处理自定义角色
function getCustomRoleMetadata(roleId) {
    // 1. 检查用户自定义显示名称
    const customNames = JSON.parse(localStorage.getItem('custom_role_names') || '{}');
    const userCustomName = customNames[roleId];
    
    // 2. 如果有自定义名称，直接返回
    if (userCustomName) {
        return {
            id: roleId,
            name: userCustomName,
            displayName: userCustomName,
            icon: 'fas fa-user-cog',
            colorClass: 'role-idea',
            description: '用户自定义助手',
            category: 'custom',
            isCustom: true,
            canRename: true
        };
    }
    
    // 3. 原有逻辑
    const customName = roleId.replace('custom_', '');
    
    let inferredIcon = 'fas fa-user-cog';
    let inferredColor = 'role-idea';
    
    if (customName.includes('writer') || customName.includes('editor')) {
        inferredIcon = 'fas fa-pen';
        inferredColor = 'role-ui';
    } else if (customName.includes('coder') || customName.includes('developer')) {
        inferredIcon = 'fas fa-code';
        inferredColor = 'role-dev';
    } else if (customName.includes('analyst') || customName.includes('researcher')) {
        inferredIcon = 'fas fa-chart-bar';
        inferredColor = 'role-pm';
    }
    
    return {
        id: roleId,
        name: `自定义: ${customName}`,
        displayName: customName.replace(/_/g, ' '),
        icon: inferredIcon,
        colorClass: inferredColor,
        description: '用户自定义的AI助手',
        category: 'custom',
        isCustom: true
    };
}

// 处理合并角色
function getMergedRoleMetadata(mergedId) {
    const parts = mergedId.split('+');
    const baseRoleId = parts[0];
    const baseRole = getRoleMetadata(baseRoleId);
    
    // 构建合并角色名称
    const displayNames = parts.map(id => {
        const meta = getRoleMetadata(id);
        return meta?.displayName || id;
    });
    
    return {
        id: mergedId,
        name: `融合: ${displayNames.join(' + ')}`,
        displayName: `[融合] ${displayNames.join('+')}`,
        icon: 'fas fa-link',
        colorClass: baseRole?.colorClass || 'role-idea',
        description: `${displayNames.join(' 和 ')} 的融合协作模式`,
        category: 'merged',
        isMerged: true,
        mergedComponents: parts,
        temperature: 0.7 // 合并角色默认温度
    };
}

// 默认角色（用于动态添加的后端角色）
function getDefaultRoleMetadata(roleId) {
    // 根据角色ID猜测一些属性
    let guessedIcon = 'fas fa-user-tie';
    let guessedColor = 'role-idea';
    let guessedCategory = 'custom';
    
    if (roleId.includes('design') || roleId.includes('ui') || roleId.includes('ux')) {
        guessedIcon = 'fas fa-palette';
        guessedColor = 'role-ui';
        guessedCategory = 'design';
    } else if (roleId.includes('dev') || roleId.includes('code') || roleId.includes('eng')) {
        guessedIcon = 'fas fa-code';
        guessedColor = 'role-dev';
        guessedCategory = 'development';
    } else if (roleId.includes('pm') || roleId.includes('product') || roleId.includes('manage')) {
        guessedIcon = 'fas fa-tasks';
        guessedColor = 'role-pm';
        guessedCategory = 'management';
    } else if (roleId.includes('test') || roleId.includes('qa')) {
        guessedIcon = 'fas fa-vial';
        guessedColor = 'role-qa';
        guessedCategory = 'support';
    }
    
    return {
        id: roleId,
        name: roleId,
        displayName: roleId,
        icon: guessedIcon,
        colorClass: guessedColor,
        description: 'AI助手',
        category: guessedCategory
    };
}

// 获取角色图标（独立函数）
export function getRoleIcon(roleId) {
    const meta = getRoleMetadata(roleId);
    return meta.icon || 'fas fa-user-tie';
}

// 获取角色颜色类
export function getRoleColorClass(roleId) {
    const meta = getRoleMetadata(roleId);
    return meta.colorClass || 'role-idea';
}

// 获取角色显示名称
export function getRoleDisplayName(roleId) {
    const meta = getRoleMetadata(roleId);
    return meta.displayName || roleId;
}

// 检查是否为合并角色
export function isMergedRole(roleId) {
    return roleId.includes('+');
}

// 检查是否为自定义角色
export function isCustomRole(roleId) {
    return roleId.startsWith('custom_') || roleId === 'custom';
}

// 获取合并角色的组成部分
export function getMergedComponents(mergedId) {
    if (!isMergedRole(mergedId)) return [];
    return mergedId.split('+');
}

// 使函数全局可用（便于调试）
if (typeof window !== 'undefined') {
    window.getRoleMetadata = getRoleMetadata;
    window.getRoleDisplayName = getRoleDisplayName;
    window.getRoleIcon = getRoleIcon;
    window.getRoleColorClass = getRoleColorClass;
    window.isMergedRole = isMergedRole;
    window.isCustomRole = isCustomRole;
}