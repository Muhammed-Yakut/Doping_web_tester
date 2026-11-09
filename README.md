# 🚀 Doping Hafıza AI Autonomous Desktop & Web Test Runner
> **AI-Powered Autonomous Desktop & Web Test Runner (Electron + Playwright + Gemini 2.5 Flash)**

Senior Test Otomasyon Mimarı vizyonuyla inşa edilmiş; **Doping Hafıza** masaüstü (Electron) ve web platformlarını doğal dilde (Türkçe günlük konuşma ve mahalle/öğrenci jargonu dahil) verilen komutlarla otonom olarak test eden modern bir **Masaüstü Test Asistanı (GUI + Automation Engine)**.

---

## 📸 Temel Özellikler & Bento Grid Arayüzü

- **Dark Mode Odaklı Bento Grid Tasarımı:**
  - **Slate/Zinc 950 zemin:** Neon zümrüt yeşili (`#10b981`), amber uyarı (`#f59e0b`), crimson kırmızı (`#ef4444`) aksanlar.
  - **Header:** Bağlı cihaz durumu (`Electron: Connected`, `Latency: 18ms`, `Gemini Flash: Active`), Hızlı Profil Seçici (`İlkokul`, `Ortaokul / LGS`, `12. Sınıf / YKS`).
  - **Komut Paneli (Hero):** `CMD+K` odaklı doğal dil kutusu, Web Speech API sesli komut mikrofonu, hazır hızlı şablon chip'leri.
  - **Canlı Yürütme Akışı (Execution Timeline):** Sol panelde adım adım durum (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`), anlık süre ve video ilerlemesi.
  - **Canlı Ekran / DOM İzleyici (Live Feed):** Sağ panelde Playwright oturumundan anlık kare akışı ve hata anında hedef elementi çevreleyen **Kırmızı Neon Bounding Box** bindirmesi.
  - **Sistem Konsolu & Log Akışı:** Winston logger, Playwright aksiyonları ve Gemini JSON planını gösteren sözdizimi vurgulamalı daraltılabilir terminal.
  - **Makro Kısayol Paneli (Floating Widget):** Global kısayollar (`CMD+1` ile Hızlı Smoke Test, `CMD+2` ile Hata Snapshot).

---

## 🧠 Gemini 2.5 Flash & Akıllı Türkçe NLP Beyni

Kullanıcı dilediği serbest Türkçe ifadeyi veya öğrenci argosunu yazabilir:
> *"12. sınıf mat üslü sayılara gir, videoyu 2x yapıp 15 saniye izle, mini testi full salla, analiz ekranı çöküyor mu bak"*

Sistem, Google GenAI SDK (`gemini-2.5-flash`) veya dahili kural tabanlı zeki NLP motoruyla bunu katı `TestActionPlan` JSON şemasına dönüştürür:

```json
{
  "intent": "Doping Hafıza (HIGH_YKS) üzerinde Matematik - Üslü Sayılar modülünü aç, videoyu ve test adımlarını otonom yürüt.",
  "targetLevel": "HIGH_YKS",
  "steps": [
    {
      "id": "step_1",
      "action": "NAVIGATE_TO",
      "params": { "subject": "Matematik", "topic": "Üslü Sayılar" },
      "title": "Matematik - Üslü Sayılar Konusuna Git"
    },
    {
      "id": "step_2",
      "action": "VIDEO_CONTROL",
      "params": { "speed": 2.0, "durationSec": 15 },
      "title": "Videoyu 2x Hızında 15 Saniye Oynat"
    },
    {
      "id": "step_3",
      "action": "SOLVE_QUIZ",
      "params": { "quizStrategy": "RANDOM" },
      "title": "Mini Testi Çöz (Rastgele/Sallamasyon)"
    },
    {
      "id": "step_4",
      "action": "VERIFY_ELEMENT",
      "params": { "targetAssertion": "Analiz Paneli & Net Grafiği", "assertionType": "NOT_CRASHED" },
      "title": "Analiz Ekranı Çökme & Görünürlük Kontrolü"
    }
  ]
}
```

---

## 🛠️ Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji |
| :--- | :--- |
| **Ön Yüz (GUI / Dashboard)** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Zustand |
| **Otomasyon Motoru** | Playwright (Chromium Headless/Headed, `_electron` macOS `.app` bağlayıcı) |
| **Yapay Zeka Beyni** | `@google/genai` (`gemini-2.5-flash` Structured JSON Output) + Türkçe Slang NLP Engine |
| **Sunucu & İletişim** | Node.js v20, Express, WebSocket (Canlı log & ekran karesi akışı), Winston Logger |
| **Dahili Simülatör** | 1:1 High-Fidelity Doping Hafıza Web/Electron Simulator (HTML5 Video, Drag & Drop, Quiz, Analiz, Çökme Simülasyonu) |

---

## 🏃 Hızlı Başlangıç & Çalıştırma

### 1. Yerel Masaüstü Uygulaması Olarak Başlatma (Terminal / Tarayıcı Gerektirmez)
Arayüzü tarayıcı veya localhost olmadan doğrudan yerel masaüstü penceresi olarak açmak için:

```bash
npm run desktop
```
Bu komut istemci ve sunucuyu tek çatı altında derleyip yerel Electron penceresinde başlatır.

### 2. Bağımsız Yükleyici Paketleri Derleme (.dmg ve .exe)
Kullanıcıların çift tıklayarak yükleyebileceği bağımsız masaüstü yükleyicilerini oluşturmak için:

```bash
# macOS için DMG ve ZIP paketi üretir (release/ klasöründe):
npm run dist:mac

# Windows için NSIS Kurulum (.exe) ve Taşınabilir Portable (.exe) üretir:
npm run dist:win

# Her iki platformu tek seferde derlemek için:
npm run dist
```

Üretilen dosyalar `release/` dizinine kaydedilir:
- **macOS:** `release/Doping Test Studio-1.0.0-arm64.dmg`
- **Windows:** `release/Doping Test Studio Setup 1.0.0.exe` (Kurulum Sihirbazı)
- **Windows Portable:** `release/Doping Test Studio 1.0.0.exe` (Tek tıkla kurulumsuz çalışan exe)

### 3. Geliştirici Modunda (Web / HMR) Çalıştırma
```bash
# Backend sunucusu
npm run server

# Vite React Hot Reload
npm run client
```
Geliştirme arayüzü: **[http://localhost:5173](http://localhost:5173)**

### 4. Komut Satırından Uçtan Uca Doğrulama Testi
```bash
npm run test:cli
```

---

## 🎯 Hedef Uygulama Seçenekleri

Arayüzdeki **Ayarlar (Dişli İkonu)** veya API üzerinden hedef motoru değiştirebilirsiniz:
1. **1:1 Doping Hafıza Simülatörü (`SIMULATOR` - Varsayılan):**
   - Kullanıcı adı ve SMS OTP gerektirmeden Playwright ile %100 deterministik ve sıfır riskli test yapmayı sağlar.
2. **Yüklü Electron Uygulaması (`ELECTRON_APP`):**
   - Sisteminizde tespit edilen `/Applications/Doping Hafıza Desktop.app/Contents/MacOS/Doping Hafıza Desktop` bundle'ını Playwright `_electron` modülü ile başlatır.

---

## ⌨️ Klavye Kısayolları

- <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>: Doğal dil komut giriş kutusuna odaklan
- <kbd>⌘1</kbd> / <kbd>Ctrl+1</kbd>: Hızlı Smoke Testi başlat
- <kbd>⌘2</kbd> / <kbd>Ctrl+2</kbd>: Anlık hata ekranı ve Bounding Box yakala
