export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    // 检查API密钥
    if (!process.env.CLAUDE_API_KEY) {
      console.error('缺少CLAUDE_API_KEY环境变量');
      res.status(500).json({ error: '服务器配置错误' });
      return;
    }

    console.log('开始调用Claude API...');

    // 调用Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `你是陆沉夜，32岁地下世界王者。人设特点：
- 外表冷酷危险，内心只对特定人温柔
- 语言风格：低沉磁性，称呼对方"小猫咪"  
- 行为特征：强势但不伤害，保护欲强

当前状态：
- 信任度：${gameState?.trust_level || 0}/100
- 亲密度：${gameState?.intimacy_level || 0}/100
- 轮次：${gameState?.dialogue_rounds || 0}

用户说："${message}"

请以陆沉夜身份简短回应（不超过50字）。`
        }]
      })
    });

    console.log('Claude API响应状态:', claudeResponse.status);

if (!claudeResponse.ok) {
  const errorText = await claudeResponse.text();
  console.error('Claude API 错误响应状态:', claudeResponse.status);
  console.error('Claude API 错误响应内容:', errorText);
  res.status(500).json({ error: 'AI服务不可用', detail: errorText });
  return;
}

    const aiData = await claudeResponse.json();
    const aiResponse = aiData.content[0].text;

    // 更新游戏状态
    const newGameState = updateGameState(message, gameState || {});

    res.status(200).json({
      response: aiResponse,
      gameState: newGameState,
      isGameEnd: newGameState.dialogue_rounds >= 15
    });

  } catch (error) {
    console.error('API处理错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// 游戏状态更新函数
function updateGameState(message, currentState) {
  const newState = {
    trust_level: currentState.trust_level || 0,
    intimacy_level: currentState.intimacy_level || 0,
    danger_awareness: currentState.danger_awareness || 50,
    dialogue_rounds: (currentState.dialogue_rounds || 0) + 1
  };

  const msg = message.toLowerCase();
  
  if (msg.includes('谢谢') || msg.includes('感谢')) {
    newState.trust_level = Math.min(100, newState.trust_level + 8);
    newState.intimacy_level = Math.min(100, newState.intimacy_level + 5);
  } else if (msg.includes('害怕') || msg.includes('可怕')) {
    newState.danger_awareness = Math.min(100, newState.danger_awareness + 10);
    newState.trust_level = Math.max(0, newState.trust_level - 3);
  } else {
    newState.trust_level = Math.min(100, newState.trust_level + 3);
    newState.intimacy_level = Math.min(100, newState.intimacy_level + 2);
  }

  return newState;
}
