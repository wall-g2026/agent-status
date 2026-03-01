const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const AGENTS_DIR = '/Users/wall-g/.openclaw/agents';

const AGENT_CONFIG = {
  'wall-g': { model: 'Step 3.5', contextLimit: 1000000, emoji: '🦞', skills: ['Feishu', 'Discord', 'Memory'] },
  'wall-c': { model: 'Step 3.5', contextLimit: 1000000, emoji: '💻', skills: ['Feishu', 'Code', 'Tools'] },
  'wall-e': { model: 'MiniMax-M2.5', contextLimit: 200000, emoji: '🔔', skills: ['Exec', 'Monitor', 'Cron'] },
  'wall-r': { model: 'MiniMax-M2.5', contextLimit: 200000, emoji: '🤖', skills: ['Reminders', 'Response'] },
  'wall-a': { model: 'MiniMax-M2.5', contextLimit: 200000, emoji: '🟣', skills: ['Apple'] },
  'wall-b': { model: 'MiniMax-M2.5', contextLimit: 200000, emoji: '🔴', skills: ['Bot'] },
  'wall-p': { model: 'MiniMax-M2.5', contextLimit: 200000, emoji: '💜', skills: ['Project'] },
  'wall-x': { model: 'Step 3.5', contextLimit: 1000000, emoji: '🟡', skills: ['Chat'] }
};

function getAgentStatus() {
  const agents = Object.keys(AGENT_CONFIG);
  const status = {};
  
  for (const agent of agents) {
    try {
      const config = AGENT_CONFIG[agent];
      const sessionsPath = path.join(AGENTS_DIR, agent, 'sessions');
      
      // Count sessions
      let sessionCount = 0;
      if (fs.existsSync(sessionsPath)) {
        const files = fs.readdirSync(sessionsPath).filter(f => f.endsWith('.jsonl'));
        sessionCount = files.length;
      }

      // Get token usage from session metadata (first line of each jsonl)
      let totalTokens = 0;
      let tokenSources = 0;
      let maxTokens = 0;
      
      if (fs.existsSync(sessionsPath)) {
        const sessionFiles = fs.readdirSync(sessionsPath)
          .filter(f => f.endsWith('.jsonl'))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 10); // last 10 sessions
        
        for (const file of sessionFiles) {
          try {
            const filePath = path.join(sessionsPath, file);
            const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
            if (firstLine) {
              const meta = JSON.parse(firstLine);
              if (meta.totalTokens) {
                totalTokens += meta.totalTokens;
                maxTokens = Math.max(maxTokens, meta.totalTokens);
                tokenSources++;
              }
            }
          } catch (e) {}
        }
      }
      
      const avgTokens = tokenSources > 0 ? Math.round(totalTokens / tokenSources) : 0;
      const tokenPercent = config.contextLimit > 0 ? Math.round((avgTokens / config.contextLimit) * 100) : 0;
      
      // Determine status
      const isActive = sessionCount > 0;
      const isHighLoad = tokenPercent > 70 || maxTokens > config.contextLimit * 0.9;
      let statusText = isActive ? (isHighLoad ? '高负载' : '忙碌') : '空闲';
      if (!isActive && tokenSources > 0) statusText = '待机';
      
      status[agent] = {
        name: `WALL-${agent.toUpperCase().replace('WALL-', '')}`,
        model: config.model,
        emoji: config.emoji,
        skills: config.skills,
        sessions: sessionCount,
        tokens: avgTokens,
        tokenLimit: config.contextLimit,
        tokenPercent,
        status: statusText
      };
    } catch (e) {
      status[agent] = { name: `WALL-${agent.toUpperCase()}`, model: '?', emoji: '❓', sessions: 0, tokens: 0, tokenLimit: 200000, tokenPercent: 0, status: '离线' };
    }
  }
  return status;
}

function generateHTML() {
  const status = getAgentStatus();
  const statusJson = JSON.stringify(status);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WALL Team 监控面板</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; background: radial-gradient(ellipse at 20% 20%, rgba(120, 0, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0, 200, 255, 0.15) 0%, transparent 50%), linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); font-family: 'Noto Sans SC', sans-serif; padding: 20px; overflow-x: hidden; }
    body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 10% 20%, rgba(255, 0, 150, 0.1) 0%, transparent 20%), radial-gradient(circle at 90% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 20%); pointer-events: none; z-index: 0; }
    .container { max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; }
    .header { text-align: center; margin-bottom: 30px; }
    .title { font-family: 'Orbitron', sans-serif; font-size: 2.2rem; font-weight: 900; background: linear-gradient(90deg, #ff6b9d, #c44cff, #6bffff, #ff6b9d); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradientShift 3s ease infinite; letter-spacing: 3px; margin-bottom: 5px; }
    @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
    .subtitle { color: #8892b0; font-size: 0.9rem; }
    .time-display { text-align: center; margin-bottom: 25px; }
    .time { font-family: 'Orbitron', sans-serif; font-size: 1.6rem; color: #00ffff; text-shadow: 0 0 20px rgba(0, 255, 255, 0.7); }
    .date { color: #8892b0; font-size: 0.85rem; margin-top: 3px; }
    .agents-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 30px; }
    @media (max-width: 1100px) { .agents-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 900px) { .agents-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .agents-grid { grid-template-columns: 1fr; } }
    
    .agent-card { background: rgba(255, 255, 255, 0.03); border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: all 0.3s ease; border: 2px solid transparent; }
    .agent-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c1), var(--c2)); }
    .agent-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0, 0, 0, 0.35); }
    .agent-card.wall-g { --c1: #ff6b9d; --c2: #c44cff; }
    .agent-card.wall-c { --c1: #00ffff; --c2: #0099ff; }
    .agent-card.wall-e { --c1: #76ff03; --c2: #00e676; }
    .agent-card.wall-r { --c1: #ffab00; --c2: #ff6d00; }
    .agent-card.wall-a { --c1: #e040fb; --c2: #7c4dff; }
    .agent-card.wall-b { --c1: #ff5252; --c2: #ff1744; }
    .agent-card.wall-p { --c1: #40c4ff; --c2: #00b0ff; }
    .agent-card.wall-x { --c1: #b388ff; --c2: #8c9eff; }
    .agent-card.active { border-color: var(--c1); }
    
    .status-light { position: absolute; top: 12px; right: 12px; width: 10px; height: 10px; border-radius: 50%; background: #444; }
    .status-light.active { background: #00ff88; box-shadow: 0 0 12px #00ff88; animation: blink 1.5s infinite; }
    .status-light.busy { background: #ff6b9d; box-shadow: 0 0 12px #ff6b9d; animation: blink 1s infinite; }
    .status-light.highload { background: #ff5252; box-shadow: 0 0 12px #ff5252;animation: blink 0.5s infinite; }
    
    .avatar-container { display: flex; justify-content: center; margin-bottom: 12px; }
    .avatar { width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; animation: avatarPulse 2s ease-in-out infinite; }
    @keyframes avatarPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .agent-card.wall-g .avatar { background: linear-gradient(135deg, #ff6b9d, #c44cff); }
    .agent-card.wall-c .avatar { background: linear-gradient(135deg, #00ffff, #0099ff); }
    .agent-card.wall-e .avatar { background: linear-gradient(135deg, #76ff03, #00e676); }
    .agent-card.wall-r .avatar { background: linear-gradient(135deg, #ffab00, #ff6d00); }
    .agent-card.wall-a .avatar { background: linear-gradient(135deg, #e040fb, #7c4dff); }
    .agent-card.wall-b .avatar { background: linear-gradient(135deg, #ff5252, #ff1744); }
    .agent-card.wall-p .avatar { background: linear-gradient(135deg, #40c4ff, #00b0ff); }
    .agent-card.wall-x .avatar { background: linear-gradient(135deg, #b388ff, #8c9eff); }
    
    .agent-name { text-align: center; font-family: 'Orbitron', sans-serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: #fff; }
    .agent-role { text-align: center; font-size: 0.75rem; color: #8892b0; margin-bottom: 12px; }
    
    .status-bar { background: rgba(0, 0, 0, 0.25); border-radius: 10px; padding: 12px; margin-bottom: 8px; }
    .status-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.8rem; }
    .status-item:last-child { margin-bottom: 0; }
    .status-label { color: #8892b0; }
    .status-value { color: #fff; font-weight: 600; }
    .status-value.model { color: var(--c1); }
    .status-value.tokens { color: #00ffff; font-family: 'Orbitron', sans-serif; }
    .status-value.percent { font-size: 1rem; }
    
    .token-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 6px; overflow: hidden; }
    .token-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--c1), var(--c2)); transition: width 0.5s ease; }
    
    .skills-container { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; justify-content: center; }
    .skill-badge { font-size: 0.65rem; padding: 3px 8px; background: rgba(255,255,255,0.08); border-radius: 10px; color: #8892b0; }
    
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 25px; }
    .stat-box { background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 18px; text-align: center; border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; }
    .stat-box:hover { transform: translateY(-3px); background: rgba(255,255,255,0.05); }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #00ffff; font-family: 'Orbitron', sans-serif; }
    .stat-label { color: #8892b0; font-size: 0.8rem; margin-top: 5px; }
    .activity-log { background: rgba(255,255,255,0.02); border-radius: 12px; padding: 15px; margin-top: 20px; }
    .log-title { color: #8892b0; font-size: 0.85rem; margin-bottom: 10px; }
    .log-container { max-height: 150px; overflow-y: auto; }
    .log-entry { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.8rem; }
    .log-time { color: #8892b0; min-width: 45px; }
    .log-agent { font-weight: 600; }
    .log-message { color: #ccc; }
    .refresh-info { text-align: center; color: #8892b0; font-size: 0.75rem; margin-top: 15px; opacity: 0.7; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 2px; }
    ::-webkit-scrollbar-thumb { background: #c44cff; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">✦ WALL TEAM MONITOR ✦</h1>
      <p class="subtitle">8 Agents Real-time Status Dashboard</p>
    </div>
    <div class="time-display">
      <div class="time" id="clock">--:--:--</div>
      <div class="date" id="date">Loading...</div>
    </div>
    
    <div class="agents-grid" id="agents-grid">Loading agents...</div>
    
    <div class="stats-row" id="stats-row"></div>
    
    <div class="activity-log">
      <h4 class="log-title">📋 Activity Log</h4>
      <div class="log-container" id="log-container"></div>
    </div>
    
    <div class="refresh-info" id="refresh-info">🔄 Refreshing every 10s</div>
  </div>

  <script>
    let statusData = ${statusJson};
    
    function render() {
      const grid = document.getElementById('agents-grid');
      const stats = document.getElementById('stats-row');
      
      let html = '';
      let totalSessions = 0, busyCount = 0, highLoadCount = 0, totalAvgTokens = 0, agentsMonitored = 0;
      
      for (const [key, agent] of Object.entries(statusData)) {
        totalSessions += agent.sessions;
        totalAvgTokens += agent.tokens || 0;
        agentsMonitored++;
        if (agent.status === '忙碌') busyCount++;
        else if (agent.status === '高负载') { busyCount++; highLoadCount++; }
        
        const tokenColor = agent.tokenPercent > 80 ? '#ff5252' : agent.tokenPercent > 50 ? '#ffab00' : '#00ffff';
        const tokenBarWidth = Math.min(agent.tokenPercent, 100);
        
        html += \`
          <div class="agent-card \${key} \${agent.status !== '空闲' ? 'active' : ''}">
            <div class="status-light \${agent.status === '空闲' ? 'idle' : agent.status === '高负载' ? 'highload' : 'busy'}"></div>
            <div class="avatar-container">
              <div class="avatar">\${agent.emoji || '🤖'}</div>
            </div>
            <h2 class="agent-name">\${agent.name}</h2>
            <p class="agent-role">Active Sessions: \${agent.sessions}</p>
            
            <div class="status-bar">
              <div class="status-item">
                <span class="status-label">状态</span>
                <span class="status-value" style="color:\${agent.status === '高负载' ? '#ff5252' : agent.status === '离线' ? '#666' : '#00ff88'}">\${agent.status}</span>
              </div>
              <div class="status-item">
                <span class="status-label">模型</span>
                <span class="status-value model">\${agent.model}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Token</span>
                <span class="status-value tokens">\${agent.tokens?.toLocaleString() || 0} / \${agent.tokenLimit?.toLocaleString() || 200000}</span>
              </div>
              <div class="token-bar">
                <div class="token-fill" style="width:\${tokenBarWidth}%"></div>
              </div>
              <div class="status-item" style="margin-top:6px;">
                <span class="status-label">使用率</span>
                <span class="status-value percent" style="color:\${tokenColor}">\${agent.tokenPercent}%</span>
              </div>
            </div>
            
            <div class="skills-container">
              \${(agent.skills || []).map(s => \`<span class="skill-badge">\${s}</span>\`).join('')}
            </div>
          </div>
        \`;
      }
      
      grid.innerHTML = html;
      const avgTokenUsage = agentsMonitored > 0 ? Math.round(totalAvgTokens / agentsMonitored) : 0;
      const avgPercent = agentsMonitored > 0 ? Math.round((avgTokenUsage / 200000) * 100) : 0;
      
      stats.innerHTML = \`
        <div class="stat-box"><div class="stat-value">\${totalSessions}</div><div class="stat-label">Total Sessions</div></div>
        <div class="stat-box"><div class="stat-value">\${busyCount}</div><div class="stat-label">Active Agents</div></div>
        <div class="stat-box"><div class="stat-value" style="color:\${highLoadCount > 0 ? '#ff5252' : '#00ffff'}">\${highLoadCount}</div><div class="stat-label">High Load</div></div>
        <div class="stat-box"><div class="stat-value">\${avgPercent}%</div><div class="stat-label">Avg Token Usage</div></div>
      \`;
      
      const now = new Date();
      const logTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('log-container').innerHTML = \`
        <div class="log-entry">
          <span class="log-time">\${logTime}</span>
          <span class="log-agent" style="color:#00ffff">WALL-C</span>
          <span class="log-message">Monitor updated • \${Object.keys(statusData).length} agents online</span>
        </div>
      \`;
    }
    
    function updateClock() {
      const now = new Date('Asia/Shanghai');
      const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
      const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      document.getElementById('clock').textContent = timeStr;
      document.getElementById('date').textContent = dateStr;
      document.getElementById('refresh-info').textContent = '🔄 Last update: ' + now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + ' • Auto-refresh 10s';
    }
    
    async function refresh() {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        statusData = await res.json();
        render();
        updateClock();
      } catch (e) {
        console.error('Refresh failed:', e);
        document.getElementById('refresh-info').textContent = '⚠️ Connection error – retrying...';
      }
    }
    
    render();
    updateClock();
    setInterval(refresh, 10000);
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(getAgentStatus(), null, 2));
  } else if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(generateHTML());
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🎯 WALL Team Monitor v2 running at http://localhost:${PORT}/`);
  console.log(`📊 API: http://localhost:${PORT}/api/status`);
});
