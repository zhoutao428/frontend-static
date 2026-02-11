// ========== 炼丹炉动画系统 v2.0 ==========
// 独立文件，不污染现有代码
// 效果：卡片转动 + 骰子辅助动画

class AlchemyAnimationManager {
    constructor() {
        this.container = null;
        this.roleCard = null;
        this.modelCard = null;
        this.dice = null;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        console.log('🎬 炼丹动画系统初始化...');
        
        // 创建动画容器
        this.container = document.getElementById('alchemy-animation-container');
        if (!this.container) {
            this.container = this.createContainer();
        }
        
        console.log('✅ 炼丹动画系统已就绪');
    }
    
        createContainer() {
        const container = document.createElement('div');
        container.id = 'alchemy-animation-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 500px;
            z-index: 99999; /* 确保最高 */
            display: none;
            justify-content: center;
            align-items: center;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            border: 1px solid rgba(255,255,255,0.1);
        `;

        
        // 添加动画内容
        container.innerHTML = `
            <div class="alchemy-animation-content" style="
                text-align: center;
                color: white;
                padding: 20px;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <!-- 标题 -->
                <div id="alchemy-title" style="
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #fbbf24;
                    font-family: 'Microsoft YaHei', sans-serif;
                    text-shadow: 0 2px 10px rgba(251, 191, 36, 0.3);
                ">🧪 AI 炼丹炉</div>
                
                <!-- 主要动画区域 -->
                <div style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 40px;
                    margin-bottom: 25px;
                    flex-wrap: wrap;
                ">
                    <!-- 左侧：角色卡片 -->
                    <div id="role-card" class="floating-card" style="...">
                          <div id="role-icon" style="
                                  margin-bottom: 10px;
                                  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  width: 60px;
                                  height: 60px;
                                  font-size: 36px;
                                  color: white;
                               ">
                            <div id="role-icon" style="
                                font-size: 36px;
                                margin-bottom: 10px;
                                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                            ">👤</div>
                            <div id="role-name" style="
                                font-size: 14px;
                                font-weight: 600;
                                text-align: center;
                                padding: 0 10px;
                                color: white;
                                max-width: 100%;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">角色</div>
                            <div id="role-tags" style="
                                font-size: 10px;
                                opacity: 0.9;
                                margin-top: 8px;
                                padding: 2px 8px;
                                background: rgba(255,255,255,0.15);
                                border-radius: 10px;
                            ">待定义</div>
                        </div>
                        <div class="card-label" style="
                            position: absolute;
                            bottom: -25px;
                            left: 50%;
                            transform: translateX(-50%);
                            font-size: 12px;
                            color: #cbd5e1;
                            white-space: nowrap;
                        ">角色卡片</div>
                    </div>
                    
                    <!-- 中间：加号和骰子 -->
                    <div style="position: relative;">
                        <div id="plus-sign" style="
                            font-size: 32px;
                            color: #fbbf24;
                            margin: 10px 0;
                            text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
                        ">+</div>
                        
                        <!-- 骰子容器 -->
                        <div id="dice-container" style="
                            width: 60px;
                            height: 60px;
                            margin: 15px auto 0;
                            perspective: 600px;
                            position: relative;
                        ">
                            <!-- 3D骰子将通过JS创建 -->
                        </div>
                        <div style="
                            font-size: 11px;
                            color: #94a3b8;
                            margin-top: 5px;
                        ">命运骰子</div>
                    </div>
                    
                    <!-- 右侧：模型卡片 -->
<div id="model-card" class="floating-card" style="...">
    <div id="model-icon" style="
        margin-bottom: 10px;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        font-size: 36px;
        color: white;
    ">
                            <div id="model-icon" style="
                                font-size: 36px;
                                margin-bottom: 10px;
                                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
                            ">🤖</div>
                            <div id="model-name" style="
                                font-size: 14px;
                                font-weight: 600;
                                text-align: center;
                                padding: 0 10px;
                                color: white;
                                max-width: 100%;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            ">AI模型</div>
                            <div id="model-provider" style="
                                font-size: 10px;
                                opacity: 0.9;
                                margin-top: 8px;
                                padding: 2px 8px;
                                background: rgba(255,255,255,0.15);
                                border-radius: 10px;
                            ">智能引擎</div>
                        </div>
                        <div class="card-label" style="
                            position: absolute;
                            bottom: -25px;
                            left: 50%;
                            transform: translateX(-50%);
                            font-size: 12px;
                            color: #cbd5e1;
                            white-space: nowrap;
                        ">模型卡片</div>
                    </div>
                </div>
                
                <!-- 合成箭头 -->
                <div id="merge-arrow" style="
                    font-size: 24px;
                    color: #10b981;
                    margin: 10px 0;
                    opacity: 0;
                    transform: translateY(10px);
                ">↓ 融合中 ↓</div>
                
                <!-- 合成结果预览 -->
                <div id="result-preview" style="
                    width: 140px;
                    height: 80px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(139, 92, 246, 0.2));
                    border: 2px dashed rgba(16, 185, 129, 0.4);
                    border-radius: 10px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-top: 10px;
                    opacity: 0;
                    transform: scale(0.9);
                ">
                    <div style="text-align: center; color: #cbd5e1;">
                        <div style="font-size: 12px; margin-bottom: 4px;">即将生成</div>
                        <div id="result-name" style="font-size: 14px; font-weight: bold; color: #10b981;">新角色</div>
                    </div>
                </div>
                
                <!-- 状态和进度 -->
                <div style="margin-top: 30px; width: 100%; max-width: 400px;">
                    <div id="alchemy-status" style="
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #fbbf24;
                        text-align: center;
                    ">准备开始...</div>
                    
                    <div id="alchemy-progress" style="
                        width: 100%;
                        height: 6px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 3px;
                        margin: 10px 0;
                        overflow: hidden;
                        position: relative;
                    ">
                        <div id="progress-bar" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #8b5cf6, #3b82f6, #10b981);
                            border-radius: 3px;
                            transition: width 0.5s ease;
                            position: relative;
                            overflow: hidden;
                        ">
                            <div style="
                                position: absolute;
                                top: 0;
                                left: -100%;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                                animation: progressShine 2s infinite;
                            "></div>
                        </div>
                    </div>
                    
                    <div id="alchemy-message" style="
                        font-size: 13px;
                        color: #cbd5e1;
                        text-align: center;
                        margin-top: 8px;
                        min-height: 20px;
                    "></div>
                </div>
                
                <!-- 粒子容器 -->
                <div id="particle-container" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: -1;
                "></div>
            </div>
        `;
        
        // 直接添加到body
        document.body.appendChild(container);
        
        // 添加CSS动画样式
        this.addAnimationStyles();
        
        // 保存元素引用
        this.roleCard = document.getElementById('role-card');
        this.modelCard = document.getElementById('model-card');
        
        return container;
    }
    
    addAnimationStyles() {
        if (document.getElementById('alchemy-animation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'alchemy-animation-styles-v2'; // 改这里
        style.textContent = `
            @keyframes cardFloat {
                0%, 100% { transform: translateY(0) rotateY(0deg); }
                25% { transform: translateY(-10px) rotateY(10deg); }
                75% { transform: translateY(-5px) rotateY(-10deg); }
            }
            
            @keyframes cardPulse {
                0%, 100% { 
                    box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
                }
                50% { 
                    box-shadow: 0 15px 40px rgba(139, 92, 246, 0.7);
                }
            }
            
            @keyframes diceSpin {
                0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
                100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(180deg); }
            }
            
            @keyframes progressShine {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            @keyframes particleFloat {
                0% {
                    transform: translate(0, 0) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--tx, 50px), var(--ty, -50px)) scale(1.5);
                    opacity: 0;
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes alchemyShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
            
            .floating-card {
                animation: cardFloat 3s ease-in-out infinite, cardPulse 2s ease-in-out infinite alternate;
            }
            
            #alchemy-animation-container {
                animation: fadeInUp 0.5s ease-out;
            }
            
            .alchemy-particle {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                z-index: 1001;
                animation: particleFloat 1.5s ease-out forwards;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 新增方法：定位到炼丹炉
    positionToFurnace() {
        if (!this.container) return;
        
        const dropHint = document.getElementById('drop-hint');
        if (!dropHint) {
            // 如果没有找到炼丹炉，居中显示
            this.container.style.top = '50%';
            this.container.style.left = '50%';
            this.container.style.transform = 'translate(-50%, -50%)';
            this.container.style.width = '600px';
            this.container.style.height = '500px';
            return;
        }
        
        // 获取炼丹炉位置和大小
        const rect = dropHint.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // 计算动画容器尺寸
        const containerWidth = Math.min(600, viewportWidth * 0.8);
        const containerHeight = Math.min(500, viewportHeight * 0.7);
        
        // 计算位置：在炼丹炉上方显示
        let top = rect.top - containerHeight - 20;
        
        // 如果上方空间不足，显示在炼丹炉下方
        if (top < 20) {
            top = rect.bottom + 20;
        }
        
        // 计算水平居中位置
        let left = rect.left + (rect.width - containerWidth) / 2;
        
        // 确保不超出视口边界
        left = Math.max(20, Math.min(left, viewportWidth - containerWidth - 20));
        
        // 设置位置和尺寸
        this.container.style.top = `${top}px`;
        this.container.style.left = `${left}px`;
        this.container.style.width = `${containerWidth}px`;
        this.container.style.height = `${containerHeight}px`;
        this.container.style.transform = 'none';
    }
    
    create3DDice() {
        const diceContainer = document.getElementById('dice-container');
        if (!diceContainer) return;
        
        diceContainer.innerHTML = '';
        
        // 创建3D骰子
        const dice = document.createElement('div');
        dice.id = 'alchemy-dice';
        dice.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            animation: diceSpin 3s linear infinite;
        `;
        
        // 骰子的6个面
        const faces = [
            { value: '⚡', transform: 'rotateY(0deg) translateZ(30px)', color: '#fbbf24' },    // 前
            { value: '✨', transform: 'rotateY(180deg) translateZ(30px)', color: '#8b5cf6' }, // 后
            { value: '🔮', transform: 'rotateY(90deg) translateZ(30px)', color: '#10b981' },  // 右
            { value: '💎', transform: 'rotateY(-90deg) translateZ(30px)', color: '#ec4899' }, // 左
            { value: '🎲', transform: 'rotateX(90deg) translateZ(30px)', color: '#3b82f6' },  // 上
            { value: '⚗️', transform: 'rotateX(-90deg) translateZ(30px)', color: '#ef4444' }  // 下
        ];
        
        faces.forEach((face, index) => {
            const faceDiv = document.createElement('div');
            faceDiv.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                background: ${face.color};
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 20px;
                backface-visibility: hidden;
                transform: ${face.transform};
                box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
            `;
            faceDiv.textContent = face.value;
            dice.appendChild(faceDiv);
        });
        
        diceContainer.appendChild(dice);
        this.dice = dice;
    }
    
    startAlchemy(roleData, modelData) {
        if (this.isAnimating) {
            console.log('动画正在运行中，跳过');
            return;
        }
        
        this.isAnimating = true;
        
        // 显示动画容器
        this.container.style.display = 'flex';
        
        // 设置卡片内容
        this.setCardContent(roleData, modelData);
        
        // 创建骰子
        this.create3DDice();
        
        // 重置状态
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('alchemy-status').textContent = '🔥 炼丹开始！';
        document.getElementById('alchemy-message').textContent = '正在初始化炼制程序...';
        
        console.log('🎬 开始炼丹动画');
        
        // 清空粒子容器
        const particleContainer = document.getElementById('particle-container');
        if (particleContainer) particleContainer.innerHTML = '';
        
        // 开始动画序列
        this.animateProcess();
    }
    
    setCardContent(roleData, modelData) {
    // 设置角色卡片
    const roleName = document.getElementById('role-name');
    const roleIcon = document.getElementById('role-icon');
    const roleTags = document.getElementById('role-tags');
    
    if (roleName) roleName.textContent = roleData.name || '自定义角色';
    
    // 修复：根据角色数据动态设置图标
    if (roleIcon) {
        // 解析图标数据
        let iconToShow = '👤'; // 默认
        
        if (roleData.icon) {
            // 如果是Font Awesome图标类
            if (roleData.icon.startsWith('fa-')) {
                roleIcon.innerHTML = `<i class="fas ${roleData.icon}"></i>`;
                roleIcon.style.fontSize = '24px'; // 调整大小
            } 
            // 如果是Emoji
            else if (roleData.icon.match(/\p{Emoji}/u)) {
                roleIcon.textContent = roleData.icon;
                roleIcon.style.fontSize = '36px'; // Emoji较大
            }
            // 如果是纯文本图标
            else {
                roleIcon.textContent = roleData.icon;
                roleIcon.style.fontSize = '24px';
            }
        } else {
            roleIcon.textContent = iconToShow;
        }
    }
    
    if (roleTags) {
        const tagText = Array.isArray(roleData.tags) ? roleData.tags.join(' · ') : (roleData.tags || '待定义');
        roleTags.textContent = tagText.length > 20 ? tagText.substring(0, 20) + '...' : tagText;
    }
    
    // 设置模型卡片
    const modelName = document.getElementById('model-name');
    const modelIcon = document.getElementById('model-icon');
    const modelProvider = document.getElementById('model-provider');
    
    if (modelName) modelName.textContent = modelData.name || modelData.id || 'AI模型';
    
    // 修复：根据模型类型动态设置图标
    if (modelIcon) {
        let modelIconToShow = '🤖'; // 默认
        
        // 根据模型类型选择图标
        const modelId = (modelData.id || '').toLowerCase();
        if (modelId.includes('gpt')) {
            modelIconToShow = '🧠';
        } else if (modelId.includes('deepseek')) {
            modelIconToShow = '🚀';
        } else if (modelId.includes('claude')) {
            modelIconToShow = '🦋';
        } else if (modelId.includes('gemini')) {
            modelIconToShow = '💎';
        }
        
        modelIcon.textContent = modelIconToShow;
        modelIcon.style.fontSize = '36px';
    }
    
    if (modelProvider) {
        modelProvider.textContent = this.getProviderName(modelData.id);
    }
    
    // 设置结果预览
    const resultName = document.getElementById('result-name');
    if (resultName) {
        const enhancedName = `${roleData.name || '角色'}(${this.getModelShortName(modelData.id)}版)`;
        resultName.textContent = enhancedName;
    }
}
    
    getProviderName(modelId) {
        if (modelId.includes('gpt')) return 'OpenAI';
        if (modelId.includes('deepseek')) return 'DeepSeek';
        if (modelId.includes('claude')) return 'Anthropic';
        return 'AI引擎';
    }
    
    getModelShortName(modelId) {
        if (modelId.includes('gpt4')) return 'GPT-4';
        if (modelId.includes('gpt35')) return 'GPT-3.5';
        if (modelId.includes('deepseek')) return 'DeepSeek';
        return 'AI';
    }
    
    animateProcess() {
        const steps = [
            { 
                message: '正在解析角色特质...', 
                progress: 20,
                action: () => this.highlightCard('role')
            },
            { 
                message: '加载AI模型能力...', 
                progress: 40,
                action: () => this.highlightCard('model')
            },
            { 
                message: '融合智能与创意...', 
                progress: 60,
                action: () => this.showMergeAnimation()
            },
            { 
                message: '优化专业结构...', 
                progress: 80,
                action: () => this.spinDiceFaster()
            },
            { 
                message: '生成最终角色画像...', 
                progress: 95,
                action: () => this.showResultPreview()
            },
            { 
                message: '炼制完成！', 
                progress: 100,
                action: () => this.showCompletion()
            }
        ];
        
        let stepIndex = 0;
        
        const playNextStep = () => {
            if (!this.isAnimating) return;
            
            if (stepIndex >= steps.length) {
                return;
            }
            
            const step = steps[stepIndex];
            
            // 更新消息和进度
            document.getElementById('alchemy-message').textContent = step.message;
            document.getElementById('progress-bar').style.width = `${step.progress}%`;
            
            // 执行动作
            if (step.action) step.action();
            
            // 添加粒子效果
            this.createParticles(2);
            
            stepIndex++;
            
            // 设置下一步延时
            const delay = stepIndex === steps.length - 1 ? 2000 : 1500;
            setTimeout(playNextStep, delay);
        };
        
        playNextStep();
    }
    
    highlightCard(cardType) {
        const card = cardType === 'role' ? this.roleCard : this.modelCard;
        if (!card) return;
        
        // 高亮效果
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = 'cardFloat 3s ease-in-out infinite, cardPulse 0.5s ease-in-out 3 alternate';
            card.style.boxShadow = `0 15px 40px ${cardType === 'role' ? 'rgba(139, 92, 246, 0.8)' : 'rgba(59, 130, 246, 0.8)'}`;
        }, 10);
        
        // 添加闪光效果
        this.createParticles(3, card.getBoundingClientRect());
    }
    
    showMergeAnimation() {
        const arrow = document.getElementById('merge-arrow');
        if (arrow) {
            arrow.style.opacity = '1';
            arrow.style.transform = 'translateY(0)';
            arrow.style.transition = 'all 0.5s ease';
            
            // 闪烁效果
            let count = 0;
            const blink = () => {
                if (count >= 6) return;
                arrow.style.opacity = arrow.style.opacity === '1' ? '0.3' : '1';
                count++;
                setTimeout(blink, 300);
            };
            blink();
        }
    }
    
    spinDiceFaster() {
        if (this.dice) {
            this.dice.style.animation = 'diceSpin 1s linear infinite';
        }
    }
    
    showResultPreview() {
        const preview = document.getElementById('result-preview');
        if (preview) {
            preview.style.opacity = '1';
            preview.style.transform = 'scale(1)';
            preview.style.transition = 'all 0.8s ease';
            
            // 边框闪烁
            preview.style.borderColor = 'rgba(16, 185, 129, 0.8)';
            setTimeout(() => {
                preview.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }, 500);
        }
    }
    
    createParticles(count = 2, aroundRect = null) {
        const particleContainer = document.getElementById('particle-container');
        if (!particleContainer) return;
        
        const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'alchemy-particle';
                
                // 随机属性
                const size = Math.random() * 8 + 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                let x, y;
                if (aroundRect) {
                    // 在指定元素周围生成
                    x = aroundRect.left + Math.random() * aroundRect.width;
                    y = aroundRect.top + Math.random() * aroundRect.height;
                } else {
                    // 在容器内随机生成
                    x = Math.random() * this.container.offsetWidth;
                    y = Math.random() * this.container.offsetHeight;
                }
                
                particle.style.cssText = `
                    width: ${size}px;
                    height: ${size}px;
                    background: ${color};
                    left: ${x}px;
                    top: ${y}px;
                    --tx: ${(Math.random() - 0.5) * 120}px;
                    --ty: ${(Math.random() - 0.5) * 120}px;
                    box-shadow: 0 0 ${size * 3}px ${color};
                `;
                
                particleContainer.appendChild(particle);
                
                // 动画结束后移除
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 1500);
            }, i * 150);
        }
    }
    
    showCompletion() {
        // 停止骰子旋转
        if (this.dice) {
            this.dice.style.animation = 'diceSpin 2s ease-out';
        }
        
        // 最终状态
        document.getElementById('alchemy-status').textContent = '🎉 炼制成功！';
        document.getElementById('alchemy-message').textContent = '新角色已生成，请查看左侧零件库';
        
        // 最终粒子爆发
        this.createParticles(15);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.hideAnimation();
        }, 3000);
    }
    
    hideAnimation() {
        this.isAnimating = false;
        this.container.style.display = 'none';
        
        // 重置状态
        document.getElementById('progress-bar').style.width = '0%';
        
        // 隐藏额外元素
        const arrow = document.getElementById('merge-arrow');
        const preview = document.getElementById('result-preview');
        if (arrow) {
            arrow.style.opacity = '0';
            arrow.style.transform = 'translateY(10px)';
        }
        if (preview) {
            preview.style.opacity = '0';
            preview.style.transform = 'scale(0.9)';
        }
        
        console.log('📦 炼丹动画隐藏');
    }
    
    showError(message) {
        this.isAnimating = false;
        
        // 更新状态为错误
        document.getElementById('alchemy-status').textContent = '❌ 炼制失败';
        document.getElementById('alchemy-message').textContent = message || '未知错误';
        document.getElementById('progress-bar').style.background = '#ef4444';
        document.getElementById('progress-bar').style.width = '100%';
        
        // 错误震动效果
        this.container.style.animation = 'alchemyShake 0.5s ease-in-out';
        
        // 创建红色粒子
        this.createParticles(8);
        
        // 3秒后隐藏
        setTimeout(() => {
            this.container.style.animation = '';
            this.hideAnimation();
        }, 3000);
    }
    
    // 测试方法
    testAnimation() {
        console.log('🧪 测试炼丹动画...');
        
        const testRoleData = {
            name: '导演',
            icon: '🎬',
            tags: ['影视创作']
        };
        
        const testModelData = {
            id: 'gpt4',
            name: 'GPT-4'
        };
        
        this.startAlchemy(testRoleData, testModelData);
    }
}

// 创建全局实例
window.AlchemyAnimation = new AlchemyAnimationManager();

// 导出测试函数
window.testAlchemyAnimation = () => {
    window.AlchemyAnimation.testAnimation();
};

console.log('🎬 Alchemy Animation System v2.0 Loaded');