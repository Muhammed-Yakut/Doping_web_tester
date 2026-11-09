#!/usr/bin/env tsx
/**
 * Autonomous App Discovery & Topology Crawler CLI
 * 
 * Playwright kullanarak bütün sınıflardaki (4-12 ve YKS 2028) Dersler,
 * üniteler, konular, videolar ve testleri ileri/geri bütün yollarıyla tarar
 * ve src/shared/data/app_topology.json içine kaydeder.
 * 
 * Kullanım:
 *   npm run crawler
 *   tsx scripts/run-crawler.ts --all
 *   tsx scripts/run-crawler.ts --grade="11. Sınıf"
 *   tsx scripts/run-crawler.ts --fast
 */

import { AppCrawler } from '../src/automation/crawler/AppCrawler.ts';
import { logger } from '../src/server/logger.ts';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const cdpPort = process.env.CDP_PORT || '9222';
  const cdpUrl = process.env.CDP_URL || `http://localhost:${cdpPort}`;
  const outputPath = path.resolve(__dirname, '../src/shared/data/app_topology.json');

  let gradesToCrawl = AppCrawler.ALL_SUPPORTED_GRADES;
  let deepItems = true;

  // CLI argümanları kontrolü
  for (const arg of args) {
    if (arg.startsWith('--grades=')) {
      gradesToCrawl = arg.replace('--grades=', '').replace(/['"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--grade=')) {
      const g = arg.replace('--grade=', '').replace(/['"]/g, '').trim();
      gradesToCrawl = [g];
    } else if (arg === '--fast') {
      deepItems = false;
    } else if (arg === '--deep') {
      deepItems = true;
    } else if (arg === '--all') {
      gradesToCrawl = AppCrawler.ALL_SUPPORTED_GRADES;
    } else if (arg.includes('Sınıf') || arg.includes('YKS')) {
      gradesToCrawl = [arg.replace(/['"]/g, '').trim()];
    }
  }

  console.log('=======================================================');
  console.log('🤖 Doping Hafıza Otonom Topoloji & Rota Tarayıcısı (Crawler)');
  console.log(`📍 Hedef CDP Adresi: ${cdpUrl}`);
  console.log(`📁 Çıktı Dosyası: ${outputPath}`);
  console.log(`🎯 Taranacak Sınıflar (${gradesToCrawl.length}): ${gradesToCrawl.join(', ')}`);
  console.log(`🔍 Derin İçerik Taraması: ${deepItems ? 'AÇIK (Video ve Testler)' : 'HIZLI (Ünite ve Konular)'}`);
  console.log('=======================================================\n');

  try {
    const crawler = new AppCrawler({
      cdpUrl,
      outputPath,
      gradesToCrawl,
      deepItems,
      maxTopicsPerSubject: 25
    });

    const startTime = Date.now();
    const topology = await crawler.crawl();
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n=======================================================');
    console.log(`🎉 Bütün Yollar Başarıyla Ezberlendi & Kaydedildi! (Süre: ${durationSec}s)`);
    console.log(`📅 Güncelleme Tarihi: ${topology.updatedAt}`);
    
    for (const [levelKey, levelData] of Object.entries(topology.gradeLevels)) {
      if (!levelData) continue;
      const subjectCount = levelData.subjects.length;
      const topicCount = levelData.subjects.reduce((acc, s) => acc + s.topics.length, 0);
      const itemCount = levelData.subjects.reduce((acc, s) => 
        acc + s.topics.reduce((tAcc, t) => tAcc + t.items.length, 0), 0);
      console.log(`   - [${levelKey}] ${levelData.gradeName}: ${subjectCount} ders, ${topicCount} ünite/konu, ${itemCount} materyal`);
    }
    console.log('=======================================================');
    process.exit(0);
  } catch (err: any) {
    logger.error(`Crawler CLI Hatası: ${err.message}`);
    console.error(`\n❌ Tarama Hatası: ${err.message}`);
    console.error('İpucu: Doping Hafıza masaüstü uygulamasının açık ve CDP (port: 9222) modunda olduğundan emin olun.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Beklenmeyen Hata:', err);
  process.exit(1);
});
