// js/alchemy-animation.js - Next Gen 炼丹动画

class AlchemyAnimationManager {
    constructor() {
        this.container = null;
        this.isAnimating = false;
        this.statusEl = null;
        this.init();
    }

    init() {
        console.log('🎬 Cyberpunk Alchemy System Initialized');
        this.injectStyles();
        this.createContainer();
    }

    // 1. 注入酷炫样式
    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #alchemy-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(10, 10, 15, 0.9);
                backdrop-filter: blur(15px);
                z-index: 9999;
                display: none; flex-direction: column;
                justify-content: center; align-items: center;
                opacity: 0; transition: opacity 0.5s;
            }
            #alchemy-overlay.active { display: flex; opacity: 1; }

            /* 炼丹炉核心 */
            .furnace-core {
                position: relative; width: 200px; height: 200px;
                border-radius: 50%;
                background: radial-gradient(circle, #6366f1 0%, #1e1b4b 70%);
                box-shadow: 0 0 50px rgba(99, 102, 241, 0.5);
                display: flex; justify-content: center; align-items: center;
                animation: pulse 2s infinite ease-in-out;
            }
            
            /* 旋转光环 */
            .furnace-ring {
                position: absolute; width: 100%; height: 100%;
                border: 2px solid transparent;
                border-top-color: #a5b4fc;
                border-radius: 50%;
                animation: spin 3s linear infinite;
            }
            .furnace-ring::before {
                content: ''; position: absolute; inset: -10px;
                border: 2px solid transparent;
                border-left-color: #818cf8;
                border-radius: 50%;
                animation: spin 5s linear infinite reverse;
            }

            /* 中心图标 */
            .core-icon {
                font-size: 60px; color: white;
                filter: drop-shadow(0 0 10px white);
                animation: float 3s ease-in-out infinite;
            }

            /* 状态文字 */
            .alchemy-status {
                margin-top: 40px; font-family: 'JetBrains Mono', monospace;
                font-size: 18px; color: #e0e7ff;
                text-shadow: 0 0 10px #6366f1;
                min-height: 24px;
            }
            .alchemy-status::after { content: '_'; animation: blink 1s infinite; }

            /* 粒子动画 */
            @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 50px rgba(99, 102, 241, 0.5); } 50% { transform: scale(1.1); box-shadow: 0 0 80px rgba(99, 102, 241, 0.8); } }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'alchemy-overlay';
        this.container.innerHTML = `
            <div class="furnace-core">
                <div class="furnace-ring"></div>
                <i class="fas fa-bolt core-icon"></i>
            </div>
            <div class="alchemy-status">SYSTEM INITIALIZING...</div>
        `;
        document.body.appendChild(this.container);
        this.statusEl = this.container.querySelector('.alchemy-status');
    }

    // ✅ 启动动画
    startAlchemy(roleData, modelData) {
        this.isAnimating = true;
        this.container.classList.add('active');
        this.setStatus(`正在融合 [${roleData.name}] 与 [${modelData.name}]...`);
        
        // 模拟数据流效果
        this.startDataStream();
    }

    // ✅ 更新状态文字
    setStatus(text) {
        if (this.statusEl) this.statusEl.innerText = text;
    }

    // ✅ 模拟数据流 (增加科技感)
    startDataStream() {
        const texts = [
            "正在解析 Prompt 结构...",
            "提取思维链特征...",
            "注入知识图谱...",
            "优化 System Prompt...",
            "正在生成卡片..."
        ];
        let i = 0;
        this.streamInterval = setInterval(() => {
            if (i < texts.length) {
                // 如果当前显示的是"正在接入..."这种重要状态，就不覆盖
                if (!this.statusEl.innerText.includes("接入")) {
                    this.setStatus(texts[i]);
                }
                i++;
            } else {
                i = 0; // 循环播放
            }
        }, 800); // 每800ms换一句话
    }

    // ✅ 结束动画
    finish() {
        if (this.streamInterval) clearInterval(this.streamInterval);
        this.setStatus("✅ 炼制成功！");
        
        setTimeout(() => {
            this.container.classList.remove('active');
            this.isAnimating = false;
        }, 1000); // 1秒后消失
    }

    // ✅ 显示错误
    showError(msg) {
        if (this.streamInterval) clearInterval(this.streamInterval);
        this.setStatus("❌ " + msg);
        const icon = this.container.querySelector('.core-icon');
        if (icon) {
            icon.className = "fas fa-exclamation-triangle core-icon";
            icon.style.color = "#ef4444";
        }
        
        setTimeout(() => {
            this.container.classList.remove('active');
            this.isAnimating = false;
        }, 3000);
    }
}

// 挂载到全局
window.AlchemyAnimation = new AlchemyAnimationManager();
