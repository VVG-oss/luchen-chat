export default async function handler(req, res) {
  // 设置CORS，允许跨域访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: '只支持POST请求' });
    return;
  }

  try {
    const { message, gameState } = req.body;
    
    if (!message) {
      res.status(400).json({ error: '消息不能为空' });
      return;
    }

    // 调用Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `你是陆沉夜，32岁地下世界王者。人设特点：
- 外表冷酷危险，内心只对特定人温柔
- 语言风格：低沉磁性，称呼对方"小猫咪"  
- 行为特征：强势但不伤害，保护欲强
- 展现权力与温柔的反差魅力

当前状态：
- 信任度：${gameState.trust_level}/100
- 亲密度：${gameState.intimacy_level}/100
- 轮次：${gameState.dialogue_rounds}

用户说："${message}"

请以陆沉夜身份自然回应，体现人设魅力。回应要简洁有力，不超过100字。`
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json();
      console.error('Claude API错误:', errorData);
      throw new Error('Claude API调用失败');
    }

    const aiData = await claudeResponse.json();
    const aiResponse = aiData.content[0].text;

    // 简单的数值更新逻辑
    const newGameState = updateGameState(message, gameState);

    res.status(200).json({
      response: aiResponse,
      gameState: newGameState,
      isGameEnd: newGameState.dialogue_rounds >= 15
    });

  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}

// 简化的数值更新函数
function updateGameState(message, currentState) {
  const newState = { ...currentState };
  newState.dialogue_rounds += 1;

  // 根据用户消息内容更新数值
  const msg = message.toLowerCase();
  
  if (msg.includes('谢谢') || msg.includes('感谢')) {
    newState.trust_level = Math.min(100, newState.trust_level + 8);
    newState.intimacy_level = Math.min(100, newState.intimacy_level + 5);
  } else if (msg.includes('害怕') || msg.includes('可怕')) {
    newState.danger_awareness = Math.min(100, newState.danger_awareness + 10);
    newState.trust_level = Math.max(0, newState.trust_level - 3);
  } else if (msg.includes('为什么') || msg.includes('你是谁')) {
    newState.trust_level = Math.min(100, newState.trust_level + 5);
    newState.intimacy_level = Math.min(100, newState.intimacy_level + 3);
  } else {
    newState.trust_level = Math.min(100, newState.trust_level + 3);
    newState.intimacy_level = Math.min(100, newState.intimacy_level + 2);
  }

  return newState;
}
