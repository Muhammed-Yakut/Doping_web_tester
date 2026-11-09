const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3001;

function isServerHealthy(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/settings`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await isServerHealthy(port);
    if (healthy) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function resolveServerPath() {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'dist-server/index.js'),
    path.join(__dirname, '../dist-server/index.js'),
    path.join(process.resourcesPath || '', 'dist-server/index.js'),
    path.join(process.resourcesPath || '', 'app.asar/dist-server/index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return candidates[0];
}

async function startBackendServer() {
  const alreadyRunning = await isServerHealthy(PORT);
  if (alreadyRunning) {
    console.log(`[Electron] Backend sunucusu zaten port ${PORT} üzerinde aktif.`);
    return;
  }

  const serverPath = resolveServerPath();
  console.log(`[Electron] Backend sunucusu başlatılıyor: ${serverPath}`);

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: PORT.toString(),
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(`[Server] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(`[Server Err] ${data}`);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[Electron] Backend sunucusu kapandı (kod: ${code}, sinyal: ${signal})`);
  });

  const ready = await waitForServer(PORT, 40);
  if (!ready) {
    console.error(`[Electron] Port ${PORT} üzerindeki backend sunucusuna bağlanılamadı.`);
  } else {
    console.log(`[Electron] Backend sunucusu başarıyla yanıt veriyor.`);
  }
}

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: 'Doping Test Studio',
            submenu: [
              { role: 'about', label: 'Doping Test Studio Hakkında' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Gizle' },
              { role: 'hideOthers', label: 'Diğerlerini Gizle' },
              { role: 'unhide', label: 'Tümünü Göster' },
              { type: 'separator' },
              { role: 'quit', label: 'Çıkış' },
            ],
          },
        ]
      : []),
    {
      label: 'Dosya',
      submenu: [isMac ? { role: 'close', label: 'Pencereyi Kapat' } : { role: 'quit', label: 'Çıkış' }],
    },
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo', label: 'Geri Al' },
        { role: 'redo', label: 'Yinele' },
        { type: 'separator' },
        { role: 'cut', label: 'Kes' },
        { role: 'copy', label: 'Kopyala' },
        { role: 'paste', label: 'Yapıştır' },
        { role: 'selectAll', label: 'Tümünü Seç' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { role: 'reload', label: 'Yenile' },
        { role: 'forceReload', label: 'Zorla Yenile' },
        { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Normal Boyut' },
        { role: 'zoomIn', label: 'Yakınlaştır' },
        { role: 'zoomOut', label: 'Uzaklaştır' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' },
      ],
    },
    {
      label: 'Pencere',
      submenu: [
        { role: 'minimize', label: 'Küçült' },
        { role: 'zoom', label: 'Büyüt' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front', label: 'Öne Getir' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close', label: 'Kapat' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#030712',
    title: 'Doping Test Studio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGINT');
      serverProcess = null;
    } catch (e) {
      console.error('[Electron] Sunucu durdurulurken hata oluştu:', e);
    }
  }
}

app.whenReady().then(async () => {
  setupMenu();
  await startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

app.on('before-quit', () => {
  cleanup();
});
