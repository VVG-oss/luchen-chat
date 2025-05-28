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

    // 调用OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: `你是陆沉夜，32岁地下世界王者。人设特点：
- 外表冷酷危险，内心只对特定人温柔
- 语言风格：低沉磁性，称呼对方"小猫咪"  
- 行为特征：强势但不伤害，保护欲强
- 展现权力与温柔的反差魅力

当前状态：
- 信任度：${gameState.trust_level}/100
- 亲密度：${gameState.intimacy_level}/100
- 轮次：${gameState.dialogue_rounds}

请以陆沉夜身份自然回应，体现人设魅力。`
        }, {
          role: 'user',
          content: message
        }],
        temperature: 0.8,
        max_tokens: 300
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API调用失败');
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    // 简单的数值更新逻辑
    const newGameState = updateGameState(message, gameState);

    res.status(200).json({
      response: aiResponse,
      gameState: newGameState,
      isGameEnd: newGameState.dialogue_rounds >= 10
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