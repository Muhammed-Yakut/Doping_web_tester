import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { logger } from './logger.ts';
import { geminiPlanner } from './gemini.ts';
import { TargetResolver } from '../ai/TargetResolver.ts';
import { playwrightRunner } from './automation/PlaywrightRunner.ts';
import { WSMessage, TestActionPlan } from '../types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findExistingDir(candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates.find(c => Boolean(c)) || '';
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve Mock Doping Hafıza Simulator Static App
const mockPublicDir = findExistingDir([
  path.resolve(__dirname, 'mock-target/public'),
  path.resolve(__dirname, '../src/server/mock-target/public'),
  path.resolve(process.cwd(), 'src/server/mock-target/public'),
  path.resolve((process as any).resourcesPath || '', 'src/server/mock-target/public'),
  path.resolve((process as any).resourcesPath || '', 'mock-target/public')
]);
app.use('/mock-target', express.static(mockPublicDir));

// Serve React GUI Client (dist)
const clientDistDir = findExistingDir([
  path.resolve(__dirname, '../src/client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'src/client/dist'),
  path.resolve((process as any).resourcesPath || '', 'src/client/dist'),
  path.resolve((process as any).resourcesPath || '', 'client/dist')
]);
app.use(express.static(clientDistDir));

// HTTP Server & WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

function broadcast(msg: WSMessage) {
  const jsonStr = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  }
}

// Hook Winston logger to WebSocket
logger.setBroadcaster((logEntry) => {
  broadcast({
    type: 'LOG',
    payload: logEntry,
    timestamp: Date.now(),
  });
});

// Hook Playwright Runner events to WebSocket
playwrightRunner.setEventEmitter((msg) => {
  broadcast(msg);
});

wss.on('connection', async (ws) => {
  clients.add(ws);
  logger.info(`Yeni UI istemcisi bağlandı. Aktif bağlantı sayısı: ${clients.size}`);

  const isRealActive = await playwrightRunner.isCDPAvailable();

  // Send current state and recent logs to newly connected client
  ws.send(
    JSON.stringify({
      type: 'INIT_STATE',
      payload: {
        recentLogs: logger.getRecentLogs(),
        targetMode: playwrightRunner.getTargetMode(),
        isRealCDPActive: isRealActive,
        hasApiKey: geminiPlanner.hasApiKey(),
      },
      timestamp: Date.now(),
    })
  );

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now(), clientSentTime: data.timestamp }));
      }
    } catch {}
  });

  ws.on('close', () => {
    clients.delete(ws);
    logger.info(`UI istemci bağlantısı kapandı. Kalan: ${clients.size}`);
  });
});

// --- REST Endpoints ---

// 1. Natural Language Parse into Strict JSON
app.post('/api/parse', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt parametresi zorunludur.' });
    }
    const plan = await geminiPlanner.parsePrompt(prompt);
    broadcast({
      type: 'PLAN_GENERATED',
      payload: plan,
      timestamp: Date.now(),
    });
    return res.json(plan);
  } catch (err: any) {
    logger.error(`Ayrıştırma hatası: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// 2. Run Test Plan (or parse + run)
app.post('/api/run', async (req, res) => {
  try {
    let { plan, prompt, targetMode } = req.body;
    if (targetMode) {
      playwrightRunner.setTargetMode(targetMode);
    }
    if (!plan && prompt) {
      plan = await geminiPlanner.parsePrompt(prompt);
    }
    if (!plan) {
      return res.status(400).json({ error: 'Plan veya prompt parametresi zorunludur.' });
    }

    res.json({ message: 'Test yürütümü başlatıldı.', plan });

    playwrightRunner.executePlan(plan).catch((err) => {
      logger.error(`Test icra hatası: ${err.message}`);
    });
  } catch (err: any) {
    logger.error(`Yürütme tetikleme hatası: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Stop / Abort current run
app.post('/api/stop', (req, res) => {
  playwrightRunner.abort();
  return res.json({ message: 'Durdurma sinyali gönderildi.' });
});

// 4. System Status & Config
app.get('/api/status', async (req, res) => {
  const targetInfo = playwrightRunner.getTargetMode();
  const isRealActive = await playwrightRunner.isCDPAvailable();
  return res.json({
    ...targetInfo,
    isRealCDPActive: isRealActive,
    hasApiKey: geminiPlanner.hasApiKey(),
    connectedClients: clients.size,
  });
});

// 5. Connect to Real Electron App Now
app.post('/api/connect-real', async (req, res) => {
  try {
    playwrightRunner.setTargetMode('REAL_ELECTRON');
    const page = await playwrightRunner.startBrowser();
    const title = await page.title();
    const url = page.url();
    return res.json({
      success: true,
      message: 'Gerçek Doping Hafıza Masaüstü uygulamasına bağlanıldı.',
      title,
      url,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Update Config (API Key, Mode, Electron Path)
app.post('/api/config', (req, res) => {
  const { apiKey, targetAppMode, electronAppPath, cdpPort } = req.body;
  if (apiKey !== undefined) {
    geminiPlanner.setApiKey(apiKey);
    TargetResolver.getInstance().setApiKey(apiKey);
  }
  if (targetAppMode) {
    playwrightRunner.setTargetMode(targetAppMode, electronAppPath, cdpPort);
  }
  return res.json({
    message: 'Ayarlar güncellendi.',
    ...playwrightRunner.getTargetMode(),
    hasApiKey: geminiPlanner.hasApiKey(),
  });
});

// 7. Macro Shortcuts (CMD+1, CMD+2)
app.post('/api/macro', async (req, res) => {
  const { action } = req.body;
  logger.info(`Makro çalıştırıldı: ${action}`);

  if (action === 'SEED_MOCK_DATA') {
    const defaultPrompt = "12. sınıf mat üslü sayılara gir, videoyu 2x yapıp 15 saniye izle, mini testi full salla, analiz ekranı çöküyor mu bak";
    const plan = await geminiPlanner.parsePrompt(defaultPrompt);
    playwrightRunner.executePlan(plan).catch(() => {});
    return res.json({ message: 'Hızlı Smoke Test makrosu başlatıldı.', plan });
  } else if (action === 'TRIGGER_BUG_SNAPSHOT') {
    const screenshot = await playwrightRunner.captureSingleScreenshot();
    broadcast({
      type: 'BOUNDING_BOX',
      payload: {
        x: 100,
        y: 100,
        width: 300,
        height: 150,
        label: 'Makro Hata Anlık Görüntüsü',
      },
      timestamp: Date.now(),
    });
    return res.json({ message: 'Hata anlık görüntüsü yakalandı.', screenshot });
  }

  return res.status(400).json({ error: 'Bilinmeyen makro aksiyonu' });
});

// SPA Fallback for React Router / Client
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/mock-target') || req.path.startsWith('/ws')) {
    return next();
  }
  const indexPath = path.resolve(clientDistDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Doping Test Studio Client build not found. Please run: npm run build');
});

server.listen(port, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 Doping Hafıza Test Otomasyon Sunucusu Başlatıldı`);
  logger.info(`📍 REST & WS Adresi: http://localhost:${port}`);
  logger.info(`🎯 Dahili Simülatör: http://localhost:${port}/mock-target/`);
  logger.info(`⚡ Hedef Mod: REAL_ELECTRON (CDP Port: 9222)`);
  logger.info(`=======================================================`);
});
