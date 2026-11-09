import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, '../docs/images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Artifact directory
const artifactDir = '/Users/muhammedyakut/.gemini/antigravity/brain/05c7072f-15f8-4183-9d8f-65b7742645ea';
const artifactImagesDir = path.join(artifactDir, 'images');
if (!fs.existsSync(artifactImagesDir)) {
  fs.mkdirSync(artifactImagesDir, { recursive: true });
}

const diagrams = [
  {
    name: 'sekil_1_target_resolver',
    code: `flowchart TD
    classDef inputNode fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef nlpNode fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef branchNode fill:#d97706,stroke:#b45309,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef geminiNode fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef outNode fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;

    RAW["📥 Serbest Türkçe Doğal Dil Komutu"]:::inputNode
    NORM["🧹 Metin Ön İşleme & İfade/Kısaltma Normalizasyonu"]:::nlpNode
    FUSE["🔍 Fuse.js ile Doping Hafıza Topolojisinde Bulanık Arama"]:::nlpNode
    
    CHECK{"Hedef Eşleşme Güveni Yüksek mi?"}:::branchNode
    
    DIRECT["✅ Doğrudan Aday Düğümün Seçilmesi"]:::outNode
    GEMINI_FIX["🧠 Gemini Anlam Belirsizliği Giderici (Disambiguation)"]:::geminiNode
    
    JSON_OUT["📄 Katı Şemalı Eylem Planı (TestActionPlan JSON)"]:::outNode

    RAW --> NORM
    NORM --> FUSE
    FUSE --> CHECK
    
    CHECK -->|Skor >= %80| DIRECT
    CHECK -->|Skor < %80 veya Çift Anlam| GEMINI_FIX
    
    GEMINI_FIX --> DIRECT
    DIRECT --> JSON_OUT`
  },
  {
    name: 'sekil_2_quiz_handler',
    code: `flowchart TD
    classDef startNode fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef detectNode fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef stratNode fill:#d97706,stroke:#b45309,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;
    classDef execNode fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff,font-size:14px,font-weight:bold;

    START["🎯 Test Çözme Adımı Tetiklendi (SOLVE_QUIZ)"]:::startNode
    DETECT["🔎 QuizDetector: DOM & URL Tip Analizi"]:::detectNode
    
    SIM_MOD["Simülatör Mini Quiz Ekranı"]:::detectNode
    EXAM_MOD["Tam Deneme Sınavı (examinations-v2)"]:::detectNode
    LESSON_MOD["Ders İçi Konu Testi (concept-v3)"]:::detectNode

    STRATEGY{"Kullanıcı Stratejisi Nedir?"}:::stratNode

    ACT_RANDOM["🎲 Rastgele Şık İşaretleme (Sallama Modu)"]:::execNode
    ACT_CORRECT["🎯 Doğru Şıkkı Bulup İşaretleme"]:::execNode
    ACT_EMPTY["⚪ Boş Bırakarak Soruyu Geçme"]:::execNode
    
    FINISH["🏁 Testi Bitir veya Yarıda Bırak Butonuna Bas"]:::execNode

    START --> DETECT
    DETECT -->|Simülatör URL| SIM_MOD
    DETECT -->|Deneme Ekranı| EXAM_MOD
    DETECT -->|Konu Sonu| LESSON_MOD

    SIM_MOD --> STRATEGY
    EXAM_MOD --> STRATEGY
    LESSON_MOD --> STRATEGY

    STRATEGY -->|RANDOM| ACT_RANDOM
    STRATEGY -->|ALL_CORRECT| ACT_CORRECT
    STRATEGY -->|LEAVE_EMPTY| ACT_EMPTY

    ACT_RANDOM --> FINISH
    ACT_CORRECT --> FINISH
    ACT_EMPTY --> FINISH`
  },
  {
    name: 'sekil_3_sistem_mimarisi',
    code: `flowchart TD
    classDef client fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff,font-size:15px,font-weight:bold;
    classDef server fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff,font-size:15px,font-weight:bold;
    classDef ai fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#ffffff,font-size:15px,font-weight:bold;
    classDef engine fill:#059669,stroke:#047857,stroke-width:2px,color:#ffffff,font-size:15px,font-weight:bold;
    classDef target fill:#d97706,stroke:#b45309,stroke-width:2px,color:#ffffff,font-size:15px,font-weight:bold;

    subgraph S1 ["1. SUNUM KATMANI (REACT 19 / BENTO GRID)"]
        UI_CMD["🖥️ Doğal Dil & Sesli Komut Paneli"]:::client
        UI_VIEW["📊 Canlı Ekran & Yürütme Zaman Çizelgesi"]:::client
    end

    subgraph S2 ["2. SUNUCU & İLETİŞİM (NODE.JS / EXPRESS / WS)"]
        API_GATEWAY["⚡ Express REST API Uç Noktaları"]:::server
        WS_HUB["🔄 WebSocket Canlı Olay Dağıtıcısı"]:::server
    end

    subgraph S3 ["3. YAPAY ZEKA & PLANLAMA (GEMINI 2.5 & FUZZY)"]
        GEMINI["🧠 Gemini 2.5 Flash Yapılandırılmış Planlayıcı"]:::ai
        RESOLVER["🎯 TargetResolver (Fuse.js & Müfredat Ağacı)"]:::ai
    end

    subgraph S4 ["4. TEST YÜRÜTME MOTORU (PLAYWRIGHT ENGINE)"]
        RUNNER["⚙️ PlaywrightRunner (Ana Yürütücü)"]:::engine
        NAV["🧭 GraphNavigator (FSM Navigasyon)"]:::engine
        HANDLERS["🎮 Eylem Yöneticileri (Quiz, Video, Pop-up)"]:::engine
    end

    subgraph S5 ["5. HEDEF ÇALIŞMA ORTAMI"]
        ELECTRON["💻 Gerçek Electron Desktop (CDP :9222)"]:::target
        SIMULATOR["🌐 1:1 Doping Hafıza Web Simülatörü"]:::target
    end

    UI_CMD -->|HTTP POST /api/run| API_GATEWAY
    API_GATEWAY -->|Serbest Metin| GEMINI
    GEMINI <-->|Müfredat & Aday Düğüm Eşleme| RESOLVER
    GEMINI -->|Deterministik Test Planı JSON| RUNNER

    RUNNER -->|Durum Makinesi Geçişleri| NAV
    NAV -->|Doğrulanmış DOM Eylemi| HANDLERS
    
    HANDLERS -->|Chrome DevTools Protocol| ELECTRON
    HANDLERS -->|Doğrudan Web Otomasyonu| SIMULATOR

    HANDLERS -.->|Anlık Ekran Karesi & Bounding Box| WS_HUB
    RUNNER -.->|Adım Başarı / Hata Metrikleri| WS_HUB
    WS_HUB -.->|Canlı Telemetri Akışı| UI_VIEW`
  },
  {
    name: 'sekil_4_sequence_diagram',
    code: `sequenceDiagram
    autonumber
    actor U as 👤 Test Mühendisi
    participant UI as 🖥️ React Dashboard
    participant API as ⚡ Express & WebSocket
    participant AI as 🧠 Gemini & TargetResolver
    participant RUN as ⚙️ Playwright Runner
    participant APP as 🎯 Hedef Uygulama

    U->>UI: Türkçe Komut Girişi ("12. Sınıf Mat video izle, testi çöz")
    UI->>API: POST /api/run { prompt }
    API->>AI: Doğal Dil Ayrıştırma & Topoloji Eşleme
    AI->>AI: Fuse.js Bulanık Arama + Şema Doğrulama
    AI-->>API: TestActionPlan (JSON Adım Listesi)
    
    API->>UI: WS: PLAN_GENERATED (Plan Arayüze Çizilir)
    API->>RUN: executePlan(plan)
    
    loop Her Bir Test Adımı İçin (Sıralı İcra)
        RUN->>UI: WS: STEP_STARTED (Adım Başladı Bildirimi)
        RUN->>APP: GraphNavigator / QuizHandler / VideoHandler
        APP-->>RUN: Sayfa Render & DOM Yanıtı
        RUN->>UI: WS: SCREENSHOT_STREAM (Canlı Ekran Görüntüsü)
        RUN->>UI: WS: STEP_COMPLETED (Süre ve Başarı Durumu)
    end

    RUN-->>API: Tüm Adımlar Tamamlandı (Başarı Raporu)
    API->>UI: WS: RUN_COMPLETED (Metrikler & Yeşil Onay)
    UI-->>U: Canlı Zaman Çizelgesinde Rapor Sunumu`
  },
  {
    name: 'sekil_5_fsm_state_diagram',
    code: `stateDiagram-v2
    classDef startState fill:#0284c7,stroke:#0369a1,color:#ffffff,font-size:14px,font-weight:bold;
    classDef runState fill:#6366f1,stroke:#4f46e5,color:#ffffff,font-size:14px,font-weight:bold;
    classDef okState fill:#059669,stroke:#047857,color:#ffffff,font-size:14px,font-weight:bold;
    classDef errorState fill:#e11d48,stroke:#be123c,color:#ffffff,font-size:14px,font-weight:bold;

    [*] --> IDLE
    
    IDLE --> INITIALIZING: Yeni Test Planı Alındı
    INITIALIZING --> EXECUTING_STEP: Temiz Zemin (#/dashboard) Sağlandı
    
    EXECUTING_STEP --> WAITING_FOR_ELEMENT: DOM Elemanına Tıklama / Arama
    WAITING_FOR_ELEMENT --> ACTION_COMPLETED: Eleman Görünür Oldu & İşlem Yapıldı
    
    ACTION_COMPLETED --> EXECUTING_STEP: Sıradaki Adıma Geç (Adım Var)
    ACTION_COMPLETED --> SUCCESS: Tüm Adımlar Başarıyla Bitti
    
    WAITING_FOR_ELEMENT --> EMERGENCY_RECOVERY: Zaman Aşımı / Kilitlenme / Modal Engeli
    EMERGENCY_RECOVERY --> EXECUTING_STEP: Pop-up Kapatıldı & Sayfa Sıfırlandı (Yeniden Dene)
    EMERGENCY_RECOVERY --> FAILED: Maksimum Telafi Sayısı (Max Retry = 2) Aşıldı
    
    SUCCESS --> [*]
    FAILED --> [*]

    class IDLE,INITIALIZING startState;
    class EXECUTING_STEP,WAITING_FOR_ELEMENT,ACTION_COMPLETED runState;
    class SUCCESS okState;
    class EMERGENCY_RECOVERY,FAILED errorState;`
  }
];

async function generateImages() {
  console.log('🚀 Diyagramlar render ediliyor...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2, // 2x crisp HD resolution for crystal-clear document printing
  });
  const page = await context.newPage();

  for (const diag of diagrams) {
    console.log(`📸 Render ediliyor: ${diag.name}...`);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            display: inline-block;
          }
          #container {
            display: inline-block;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            padding: 24px;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div class="mermaid">
            ${diag.code}
          </div>
        </div>
        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: { useMaxWidth: false, htmlLabels: true },
            sequence: { useMaxWidth: false, showSequenceNumbers: true },
            state: { useMaxWidth: false }
          });
        </script>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    // Wait for mermaid SVG to be generated
    await page.waitForSelector('.mermaid svg', { timeout: 15000 });
    
    // Give it 500ms for final layout render
    await page.waitForTimeout(600);

    const container = page.locator('#container');
    const pngPath = path.join(outputDir, `${diag.name}.png`);
    await container.screenshot({ path: pngPath });

    // Also copy to artifact images dir
    const artifactPngPath = path.join(artifactImagesDir, `${diag.name}.png`);
    fs.copyFileSync(pngPath, artifactPngPath);

    console.log(`✅ Kaydedildi: ${pngPath}`);
  }

  await browser.close();
  console.log('🎉 Tüm diyagramlar başarıyla PNG resim dosyası olarak kaydedildi!');
}

generateImages().catch(err => {
  console.error('Hata:', err);
  process.exit(1);
});
