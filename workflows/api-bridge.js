// 复用现有API配置，但独立调用
export const WorkflowAPI = {
    async callAgent(role, prompt) {
        const token = localStorage.getItem('user_token');
        if (!token) throw new Error('请先登录');
        
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                prompt: prompt,
                role: role
            })
        });
        
        if (!response.ok) {
            throw new Error(`API错误: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    }
};