const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DOCS_DIR = __dirname;
const AGENTS_DIR = path.join(__dirname, '..', '..', '..', 'wall-c', 'agents'); // adjust as needed

// Agent config (same as before)
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
      const sessionsPath = path.join(AGENTS_DIR, 'wall-g', 'agent', 'wall-c', 'agents', agent, 'sessions'); // this path is complex, better compute from actual location
      // Since we are inside /wall-c/docs/api, the relative path to agents is ../../agents/agent/wall-c/agents? Actually: /Users/wall-g/.openclaw/agents/wall-c/agents? No
      // Let's compute absolute path directly:
      const absAgentsDir = '/Users/wall-g/.openclaw/agents';
      const sessionsPath2 = path.join(absAgentsDir, agent, 'sessions');
      
      let sessionCount = 0;
      if (fs.existsSync(sessionsPath2)) {
        sessionCount = fs.readdirSync(sessionsPath2).filter(f => f.endsWith('.jsonl')).length;
      }

      // Token estimation from session metadata (first line)
      let totalTokens = 0, tokenSources = 0;
      if (fs.existsSync(sessionsPath2)) {
        const sessionFiles = fs.readdirSync(sessionsPath2)
          .filter(f => f.endsWith('.jsonl'))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 5);
        for (const file of sessionFiles) {
          try {
            const filePath = path.join(sessionsPath2, file);
            const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
            if (firstLine) {
              const meta = JSON.parse(firstLine);
              if (meta.totalTokens) {
                totalTokens += meta.totalTokens;
                tokenSources++;
              }
            }
          } catch (e) {}
        }
      }
      const avgTokens = tokenSources > 0 ? Math.round(totalTokens / tokenSources) : 0;
      const tokenPercent = config.contextLimit > 0 ? Math.round((avgTokens / config.contextLimit) * 100) : 0;
      
      const isActive = sessionCount > 0;
      const isHighLoad = tokenPercent > 70;
      let statusText = isActive ? (isHighLoad ? '高负载' : '忙碌') : '空闲';
      
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

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(getAgentStatus(), null, 2));
  } else {
    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(DOCS_DIR, '..', filePath);
    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.setHeader('Content-Type', mime[ext] || 'text/plain');
      res.end(data);
    });
  }
});

server.listen(PORT, () => {
  console.log(`🎯 Cyberpunk Dashboard running at http://localhost:${PORT}/`);
  console.log(`📊 API: http://localhost:${PORT}/api/status`);
});
