// ui-utils.js
export function updateAllWindowTags(selectElement) {
    if (!selectElement || selectElement.selectedIndex < 0) return;
    const text = selectElement.options[selectElement.selectedIndex].text;
    const cleanName = text.split('(')[0].trim();

    const tags = document.querySelectorAll('.window-card .model-tag');
    tags.forEach(tag => {
        tag.textContent = cleanName;
        tag.title = `当前模型: ${cleanName}`;
        tag.style.transition = 'color 0.3s';
        tag.style.color = '#4ade80';
        setTimeout(() => tag.style.color = '', 500);
    });
}

export function createSectionTitle(text) {
    const div = document.createElement('div');
    div.className = 'group-title';
    div.style.cssText = "margin-top:15px; margin-bottom:8px; opacity:0.6; font-size:11px;";
    div.textContent = text;
    return div;
}

export function showAnnouncementBar(text, type = 'info') {
    const colors = { info: '#2563eb', warning: '#f59e0b', success: '#10b981' };
    const bar = document.createElement('div');
    bar.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; z-index: 10000; background-color: ${colors[type]||colors.info}; color: white; padding: 8px 16px; text-align: center; font-size: 14px; font-weight: 500; display: flex; justify-content: center; animation: slideDown 0.5s ease-out;`;
    bar.innerHTML = `<span style="flex:1">📢 ${text}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;">&times;</button>`;
    document.body.appendChild(bar);
    
    if (!document.getElementById('announcement-style')) {
        const style = document.createElement('style');
        style.id = 'announcement-style';
        style.innerHTML = `@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }`;
        document.head.appendChild(style);
    }
}

export function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
}

export function handleCopy(id) {
    const el = document.getElementById(id);
    if(el) navigator.clipboard.writeText(el.innerText).then(()=>logToConsole('已复制', 'success'));
}

export function handleDownload(id, role) {
    const el = document.getElementById(id);
    if(!el) return;
    const blob = new Blob([el.innerText], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${role}.txt`;
    a.click();
}