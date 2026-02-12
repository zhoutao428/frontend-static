// frontend/login.js - 修复重复声明版

const SUPABASE_URL = 'https://uispjsahipixbocvfdrg.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_qgH5KWfpLwYRpdCDmdVoTQ_6tAl3pG9';

// 1. 安全初始化 Supabase
let supabaseClient = null;

if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase SDK 未加载！请检查 HTML head 中的 script 标签。");
    // 为了防止下面报错，给个空对象兜底，但功能肯定是用不了的
    supabaseClient = { auth: { signInWithPassword: () => Promise.reject("SDK未加载"), signUp: () => Promise.reject("SDK未加载") } };
}
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) return showToast('请输入邮箱和密码', 'warning');
    
    showLoading(true);
    
    try {
        // 1. 在前端登录 Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // 2. 存本地 Token (给前端逻辑用)
        localStorage.setItem('user_token', data.session.access_token);
        localStorage.setItem('user_email', data.user.email);
        localStorage.setItem('user_id', data.user.id);

        showToast('登录成功！正在同步...', 'success');

        // 3. ⚠️ 关键步骤：通知后台种 Cookie
        try {
            // ✅ 确保这里是你绿色的新域名
            await fetch('https://public-virid-chi.vercel.app/api/auth/cookie', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 👈 必须有，允许跨域带 Cookie
                // ✅ 修改点：直接传整个 session 对象
                body: JSON.stringify({
                    session: data.session 
                })
            });
            console.log("后台 Session 同步成功");
        } catch (e) {
            console.warn("后台同步失败:", e);
        }

        // 4. 跳转回主页
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);

    } catch (error) {
        console.error('登录错误:', error);
        let msg = error.message;
        if (msg.includes('Invalid login')) msg = '账号或密码错误';
        showToast(msg, 'error');
    } finally {
        showLoading(false);
    }
}

// 3. 注册函数
async function handleRegister(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    showLoading(true);
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        showToast('注册成功！已自动登录', 'success');
        
        if (data.session) {
            localStorage.setItem('user_token', data.session.access_token);
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
            showToast('请前往邮箱验证 (如果后台没关验证的话)', 'info');
        }

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ========== UI 逻辑 (保持不变) ==========

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.form').forEach(form => form.classList.remove('active'));
    if (tabName === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
    resetForms();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleIcon = input.parentElement.querySelector('.password-toggle i');
    if (input.type === 'password') {
        input.type = 'text';
        toggleIcon.className = 'far fa-eye-slash';
    } else {
        input.type = 'password';
        toggleIcon.className = 'far fa-eye';
    }
}

function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), duration);
}

function resetForms() {
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
}

function checkPasswordStrength(password) {
    const bar = document.querySelector('.strength-bar');
    const text = document.querySelector('.strength-text');
    if (!bar || !text) return;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const levels = [{ w: '25%', c: '#ef4444', t: '很弱' }, { w: '25%', c: '#ef4444', t: '很弱' }, { w: '50%', c: '#f59e0b', t: '中等' }, { w: '50%', c: '#f59e0b', t: '中等' }, { w: '75%', c: '#10b981', t: '强' }, { w: '100%', c: '#059669', t: '很强' }];
    const lvl = levels[strength] || levels[0];
    bar.style.width = lvl.w;
    bar.style.backgroundColor = lvl.c;
    text.textContent = `密码强度：${lvl.t}`;
}

function goToConfig() { window.location.href = 'config.html'; }
function skipToMain() { if (confirm('跳过登录将无法保存数据，确定吗？')) window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    const pwdInput = document.getElementById('register-password');
    if (pwdInput) pwdInput.addEventListener('input', function() { checkPasswordStrength(this.value); });
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') { e.preventDefault(); switchTab('login'); }
        if (e.ctrlKey && e.key === 'r') { e.preventDefault(); switchTab('register'); }
    });
});



