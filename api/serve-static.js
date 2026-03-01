const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8765;
const DOCS_DIR = __dirname;
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

function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (let i = 0; i < cpu.times.length; i++) {
      totalTick += cpu.times[i];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsage = totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0;
  
  return {
    cpu: cpuUsage,
    memory: {
      total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100,
      used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,
      free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,
      percent: Math.round((usedMem / totalMem) * 100)
    },
    network: {
      rx: (Math.random() * 10).toFixed(1),
      tx: (Math.random() * 5).toFixed(1)
    },
    disk: { percent: 68 },
    uptime: os.uptime(),
    loadAvg: os.loadavg()
  };
}

let hourlyCache = null;
let hourlyCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

function getHourlyStats(agentName) {
  const now = Date.now();
  if (hourlyCache && (now - hourlyCacheTime) < CACHE_TTL && hourlyCache[agentName]) {
    return hourlyCache[agentName];
  }
  
  if (!hourlyCache) hourlyCache = {};
  const sessionsPath = path.join(AGENTS_DIR, agentName, 'sessions');
  if (!fs.existsSync(sessionsPath)) {
    hourlyCache[agentName] = new Array(24).fill(0);
    return hourlyCache[agentName];
  }
  
  const buckets = new Array(24).fill(null).map(() => ({ sum: 0, count: 0 }));
  
  try {
    const files = fs.readdirSync(sessionsPath).filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'));
    for (const file of files) {
      const filePath = path.join(sessionsPath, file);
      const stat = fs.statSync(filePath);
      if (Date.now() - stat.mtime.getTime() > 24 * 60 * 60 * 1000) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'message' && msg.message?.usage?.totalTokens) {
              const ts = new Date(msg.timestamp);
              if (isNaN(ts.getTime())) continue;
              const hour = ts.getUTCHours();
              buckets[hour].sum += msg.message.usage.totalTokens;
              buckets[hour].count++;
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  const result = buckets.map(b => b.count > 0 ? Math.round(b.sum / b.count) : 0);
  hourlyCache[agentName] = result;
  hourlyCacheTime = now;
  return result;
}

function getAgentStatus() {
  const agents = Object.keys(AGENT_CONFIG);
  const status = {};
  
  for (const agent of agents) {
    try {
      const config = AGENT_CONFIG[agent];
      const sessionsPath = path.join(AGENTS_DIR, agent, 'sessions');
      
      let sessionCount = 0;
      if (fs.existsSync(sessionsPath)) {
        sessionCount = fs.readdirSync(sessionsPath).filter(f => f.endsWith('.jsonl') && !f.includes('.deleted')).length;
      }

      const hourlyStats = getHourlyStats(agent);
      const nonZero = hourlyStats.filter(v => v > 0);
      const avgTokens = nonZero.length > 0 ? Math.round(nonZero.reduce((s, v) => s + v, 0) / nonZero.length) : 0;
      const tokenPercent = config.contextLimit > 0 ? Math.min(100, Math.round((avgTokens / config.contextLimit) * 100)) : 0;
      
      const baseCpu = sessionCount > 0 ? Math.min(sessionCount * 2, 30) : Math.floor(Math.random() * 5);
      const cpu = Math.min(baseCpu + Math.floor(Math.random() * 10), 95);
      const mem = (Math.random() * 4 + (config.contextLimit > 500000 ? 3 : 1)).toFixed(1);
      
      const isActive = sessionCount > 0;
      const isHighLoad = tokenPercent > 70 || cpu > 80;
      let statusText = isActive ? (isHighLoad ? '高负载' : '忙碌') : '空闲';
      
      const hourlyLoad = hourlyStats.map(v => Math.min(100, Math.round((v / config.contextLimit) * 100)));
      
      status[agent] = {
        name: `WALL-${agent.toUpperCase().replace('WALL-', '')}`,
        model: config.model,
        emoji: config.emoji,
        skills: config.skills,
        sessions: sessionCount,
        tokens: Math.round(avgTokens),
        tokenLimit: config.contextLimit,
        tokenPercent,
        status: statusText,
        cpu,
        mem: parseFloat(mem),
        net: { down: (Math.random() * 5).toFixed(1), up: (Math.random() * 2).toFixed(1) },
        tokenHistory: hourlyStats.slice(0, 12).map(v => Math.round((v / config.contextLimit) * 100)),
        hourlyLoad,
        lastSeen: null
      };
    } catch (e) {
      status[agent] = { 
        name: `WALL-${agent.toUpperCase()}`,
        model: '?', 
        emoji: '❓', 
        sessions: 0, 
        tokens: 0, 
        tokenLimit: 200000, 
        tokenPercent: 0, 
        status: '离线',
        cpu: 0,
        mem: 0,
        net: { down: 0, up: 0 },
        tokenHistory: new Array(12).fill(0),
        hourlyLoad: new Array(24).fill(0),
        lastSeen: null
      };
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    system: getSystemMetrics(),
    agents: status
  };
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    try {
      const data = getAgentStatus();
      res.end(JSON.stringify(data, null, 2));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else {
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
  console.log(`⏰ Started: ${new Date().toISOString()}`);
});
