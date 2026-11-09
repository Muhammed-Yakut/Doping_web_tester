import { geminiPlanner } from './src/server/gemini.ts';
import { PlaywrightRunner } from './src/server/automation/PlaywrightRunner.ts';
import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCliVerification() {
  console.log('================================================================');
  console.log('🧪 DOPING HAFIZA AI TEST RUNNER - OTOMASYON DOĞRULAMA TESTİ');
  console.log('================================================================');

  // 1. Simülatör sunucusunu geçici başlat
  const app = express();
  app.use('/mock-target', express.static(path.resolve(__dirname, 'src/server/mock-target/public')));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3001, () => resolve()));
  console.log('✓ Mock Doping Hafıza Simülatörü 3001 portunda hazır.');

  // 2. Doğal dildeki kullanıcı komutunu Gemini Brain ile ayrıştır
  const rawPrompt = "12. sınıf mat üslü sayılara gir, videoyu 2x yapıp 15 saniye izle, mini testi full salla, analiz ekranı çöküyor mu bak";
  console.log(`\n[ADIM 1] Türkçe Komut: "${rawPrompt}"`);
  console.log('Gemini Brain / Akıllı Türkçe NLP ayrıştırılıyor...');

  const plan = await geminiPlanner.parsePrompt(rawPrompt);
  console.log('\n[ÜRETİLEN KATILIKTAKI TEST ACTION PLAN]:');
  console.log(JSON.stringify(plan, null, 2));

  // 3. Playwright Hands ile adım adım icra et
  console.log('\n[ADIM 2] Playwright Hands İcra Ediliyor...');
  const runner = new PlaywrightRunner((msg) => {
    if (msg.type === 'STEP_STARTED') {
      console.log(`▶ BAŞLADI: [${msg.payload.step.action}] ${msg.payload.step.title}`);
    } else if (msg.type === 'STEP_COMPLETED') {
      console.log(`✔ TAMAMLANDI: [${msg.payload.result.action}] (${msg.payload.result.durationMs}ms) - Durum: ${msg.payload.result.status}`);
    } else if (msg.type === 'STEP_UPDATED' && msg.payload.progress) {
      process.stdout.write(`   ⏳ Video: ${msg.payload.progress.currentSec}/${msg.payload.progress.totalSec} sn\r`);
    }
  });

  runner.setTargetMode('SIMULATOR');

  const startTime = Date.now();
  const results = await runner.executePlan(plan);
  const totalMs = Date.now() - startTime;

  console.log('\n================================================================');
  console.log(`🎉 TEST BAŞARIYLA TAMAMLANDI! Toplam Süre: ${(totalMs / 1000).toFixed(1)} sn`);
  console.log('Adım Sonuçları:');
  Object.values(results).forEach((r) => {
    console.log(`  - ${r.action} (${r.stepId}): ${r.status} [${r.durationMs}ms]`);
  });
  console.log('================================================================');

  await runner.close();
  server.close();
  process.exit(0);
}

runCliVerification().catch((err) => {
  console.error('Kritik test hatası:', err);
  process.exit(1);
});
