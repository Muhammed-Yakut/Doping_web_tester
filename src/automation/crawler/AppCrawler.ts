import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../server/logger.ts';
import { SmartRouter } from '../../server/automation/SmartRouter.ts';
import { PopupDismisser } from '../../server/automation/PopupDismisser.ts';
import {
  AppTopology,
  GradeLevelData,
  TopologySubject,
  TopologyTopic,
  TopologyItem,
  TopologyItemType,
  PathStep
} from '../../shared/types/topology.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CrawlerConfig {
  cdpUrl?: string;
  outputPath?: string;
  gradesToCrawl?: string[];
  maxTopicsPerSubject?: number;
  deepItems?: boolean;
}

export class AppCrawler {
  private cdpUrl: string;
  private outputPath: string;
  private gradesToCrawl: string[];
  private maxTopicsPerSubject: number;
  private deepItems: boolean;

  // Yasaklı Sınıf Koruması (1, 2, 3. Sınıf ve 2, 3, 4 Yaş KESİNLİKLE YASAKTIR)
  private static readonly FORBIDDEN_LEVELS = [
    '1. Sınıf', '2. Sınıf', '3. Sınıf',
    '1.sınıf', '2.sınıf', '3.sınıf',
    '1. sınıf', '2. sınıf', '3. sınıf',
    '2 Yaş', '3 Yaş', '4 Yaş',
    '2 yaş', '3 yaş', '4 yaş',
  ];

  // Desteklenen tüm resmi sınıflar
  public static readonly ALL_SUPPORTED_GRADES = [
    '4. Sınıf',
    '5. Sınıf',
    '6. Sınıf',
    '7. Sınıf',
    '8. Sınıf',
    '9. Sınıf',
    '10. Sınıf',
    '11. Sınıf',
    '12. Sınıf',
    'YKS 2028'
  ];

  constructor(config?: CrawlerConfig) {
    this.cdpUrl = config?.cdpUrl || 'http://localhost:9222';
    this.outputPath = config?.outputPath || path.resolve(__dirname, '../../shared/data/app_topology.json');
    this.gradesToCrawl = config?.gradesToCrawl || AppCrawler.ALL_SUPPORTED_GRADES;
    this.maxTopicsPerSubject = config?.maxTopicsPerSubject || 20;
    this.deepItems = config?.deepItems ?? true;
  }

  /**
   * Mevcut JSON topolojisini okur; yoksa şablon döner.
   */
  public loadExistingTopology(): AppTopology {
    try {
      if (fs.existsSync(this.outputPath)) {
        const raw = fs.readFileSync(this.outputPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err: any) {
      logger.warn(`AppCrawler: Mevcut topoloji okunamadı, yenisi oluşturulacak: ${err.message}`);
    }

    return {
      updatedAt: new Date().toISOString(),
      gradeLevels: {}
    };
  }

  /**
   * Verilen sınıfın yasaklı olup olmadığını denetler.
   * (1, 2, 3. Sınıf ve 2, 3, 4 Yaş KESİNLİKLE YASAKTIR. 11 ve 12. Sınıf ise serbesttir)
   */
  public isGradeForbidden(grade: string): boolean {
    const norm = grade.toLowerCase().trim();
    return AppCrawler.FORBIDDEN_LEVELS.some(f => {
      const fNorm = f.toLowerCase().trim();
      if (norm === fNorm) return true;
      // \D veya kelime sınırı kontrolü: "11. Sınıf" içindeki "1. Sınıf" alt dizgisini yanlışlıkla engellemez
      const escaped = fNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\D)${escaped}($|\\D)`);
      return regex.test(norm);
    });
  }

  /**
   * Sınıf adına göre topoloji seviye anahtarını döner
   */
  public getLevelKeyForGrade(grade: string): string {
    const g = grade.toLowerCase().replace(/\s+/g, '');
    if (g.includes('4') || g.includes('ilkokul')) return 'GRADE_4';
    if (g.includes('5')) return 'GRADE_5';
    if (g.includes('6')) return 'GRADE_6';
    if (g.includes('7')) return 'GRADE_7';
    if (g.includes('8') || g.includes('lgs') || g.includes('ortaokul')) return 'MIDDLE_LGS';
    if (g.includes('9')) return 'GRADE_9';
    if (g.includes('10')) return 'GRADE_10';
    if (g.includes('11')) return 'GRADE_11';
    if (g.includes('12') || g.includes('yks')) return 'HIGH_YKS';
    if (g.includes('2028')) return 'YKS_2028';
    return grade.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }

  /**
   * Otonom Tarama Motorunu çalıştırır.
   */
  public async crawl(existingPage?: Page): Promise<AppTopology> {
    logger.info('🚀 AppCrawler: Bütün Sınıflar İçin İleri/Geri Ders Yolları Haritalaması Başlatılıyor...');
    const topology = this.loadExistingTopology();

    let page = existingPage;
    let browser: any = null;

    if (!page) {
      logger.info(`AppCrawler: CDP bağlantısı kuruluyor (${this.cdpUrl})...`);
      browser = await chromium.connectOverCDP(this.cdpUrl);
      const ctx = browser.contexts()[0];
      page = ctx.pages().find((p: Page) => p.url().includes('online-education-ui')) || ctx.pages()[0];
    }

    if (!page) {
      throw new Error('AppCrawler: Doping Hafıza sayfası bulunamadı!');
    }

    try {
      for (const grade of this.gradesToCrawl) {
        if (this.isGradeForbidden(grade)) {
          logger.warn(`AppCrawler: "${grade}" yasaklı sınıflar arasında. Tarama atlanıyor.`);
          continue;
        }

        const levelKey = this.getLevelKeyForGrade(grade);
        logger.info(`\n========================================`);
        logger.info(`🔍 AppCrawler: Sınıf Taranıyor: ${grade} [${levelKey}]`);
        logger.info(`========================================`);

        // 1. İlgili Sınıfa Geç
        const switchSuccess = await SmartRouter.changeGrade(page, grade);
        if (!switchSuccess) {
          logger.warn(`AppCrawler: "${grade}" profiline geçilemedi, sonraki sınıfa geçiliyor.`);
          continue;
        }

        await page.waitForTimeout(1500);
        await PopupDismisser.once(page);

        // Seviye objesini hazırla
        if (!topology.gradeLevels[levelKey]) {
          topology.gradeLevels[levelKey] = {
            gradeName: grade,
            subjects: []
          };
        }
        const levelData = topology.gradeLevels[levelKey]!;

        // 2. Dersler Paneli: Kartlar, Derse Başla, Üniteler, Konular, Videolar ve Testler (İleri/Geri Bütün Yollar)
        await this.crawlLessons(page, grade, levelData);

        // 3. Testler ve Denemeler Paneli Tarama (#/examinations-v2)
        await this.crawlExaminations(page, grade, levelData);

        // 4. WAY Evreni Modülleri Tarama (#/dopi-future)
        await this.crawlWayUniverse(page, grade, levelData);

        // 5. LGS Yolculuğum Paneli (Yalnızca 8. Sınıf / LGS için)
        if (levelKey === 'MIDDLE_LGS') {
          await this.crawlLgsJourney(page, levelData);
        }

        // Ana Sayfaya güvenli dönüş
        await SmartRouter.goHome(page);
        await page.waitForTimeout(1000);

        // Her sınıf bitiminde topolojiyi diskteki dosyaya anlık kaydet
        topology.updatedAt = new Date().toISOString();
        fs.writeFileSync(this.outputPath, JSON.stringify(topology, null, 2), 'utf-8');
        logger.info(`💾 AppCrawler: [${grade}] topolojiye anlık kaydedildi.`);
      }

      logger.info(`\n✅ AppCrawler: Bütün sınıfların ders haritalaması başarıyla tamamlandı!`);
      logger.info(`📁 Topoloji Dosyası: ${this.outputPath} (${fs.statSync(this.outputPath).size} bytes)`);

      return topology;
    } finally {
      if (browser && !existingPage) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Dersler (#/lessons) paneli: ders kartları, üniteler, konular ve video/test içeriklerini ileri/geri rotalarıyla tarar
   */
  private async crawlLessons(page: Page, grade: string, levelData: GradeLevelData) {
    logger.info(`AppCrawler [${grade}]: Dersler (#/lessons) taranıyor...`);
    await SmartRouter.navigateToMenu(page, 'Dersler');
    await page.waitForTimeout(2000);
    await PopupDismisser.once(page);

    // 1. Eğer sekmeler varsa "Tüm Dersler" sekmesine tıkla
    try {
      const allLessonsTab = page.locator('a.tab-link:has-text("Tüm Dersler")').first();
      if (await allLessonsTab.isVisible({ timeout: 1500 }).catch(() => false)) {
        logger.info(`AppCrawler [${grade}]: "Tüm Dersler" sekmesine tıklandı.`);
        await allLessonsTab.click({ timeout: 1500, force: true }).catch(() => {});
        await page.waitForTimeout(1000);
        await PopupDismisser.once(page);
      }
    } catch {}

    // 2. Mevcut Ders Kartlarını Algıla (Kartların DOM'a yüklenmesini bekle)
    await page.waitForSelector('div.lesson-list a.box, .lesson-card, a.box', { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);

    const lessonCards = await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('div.lesson-list a.box, .lesson-card, a.box'));
      return boxes.map((box, index) => {
        const headerEl = box.querySelector('h6.box-header, .box-header, h6, .top h6, .title, strong');
        const cleanHeader = (headerEl?.textContent || '').trim().replace(/\s+/g, ' ');
        const rawText = (box.textContent || '').trim().replace(/\s+/g, ' ');
        const firstLine = rawText.split('\n')[0].trim();
        const title = cleanHeader.length > 2 ? cleanHeader : (firstLine.length > 2 ? firstLine : rawText.slice(0, 50));
        return {
          index,
          title,
          rawText,
          selector: `div.lesson-list a.box:nth-of-type(${index + 1})`
        };
      }).filter(c => c.title.length > 2 && !c.title.toLowerCase().includes('başla'));
    });

    logger.info(`AppCrawler [${grade}]: ${lessonCards.length} ders kartı tespit edildi.`);

    for (let cardIdx = 0; cardIdx < lessonCards.length; cardIdx++) {
      const card = lessonCards[cardIdx];
      logger.info(`\n  📖 [${grade}] Ders İnceleniyor [${cardIdx + 1}/${lessonCards.length}]: "${card.title}"`);

      let subject = levelData.subjects.find(s => s.title.toLowerCase() === card.title.toLowerCase() || card.title.toLowerCase().includes(s.title.toLowerCase()));

      const subjectId = card.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const subjectForwardPath: PathStep[] = [
        { action: 'GRADE', target: grade },
        { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
        { action: 'CLICK', target: card.title, selector: `a.box:has-text("${card.title}")` },
        { action: 'CLICK', target: 'Derse Başla', selector: 'a.start-lesson-button:has-text("Derse Başla"), a.start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla")' }
      ];
      const subjectReturnPath: PathStep[] = [
        { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
        { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
      ];

      if (!subject) {
        subject = {
          id: subjectId,
          title: card.title,
          selector: `a.box:has-text("${card.title}")`,
          aliases: [card.title.toLowerCase()],
          keywords: card.title.toLowerCase().split(' '),
          pathSequence: subjectForwardPath,
          returnSequence: subjectReturnPath,
          topics: []
        };
        levelData.subjects.push(subject);
      } else {
        subject.pathSequence = subjectForwardPath;
        subject.returnSequence = subjectReturnPath;
      }

      // 3. Ders Kartına Tıkla ve "Derse Başla" ile dersin içine gir (#/concept-v3-main)
      try {
        await SmartRouter.navigateToMenu(page, 'Dersler');
        await page.waitForTimeout(1000);

        let cardLocator = page.locator(`a.box:has-text("${card.title}"), div.lesson-list a.box:has-text("${card.title}")`).first();
        if (!await cardLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
          const allTab = page.locator('a.tab-link:has-text("Tüm Dersler")').first();
          if (await allTab.isVisible({ timeout: 1000 }).catch(() => false)) {
            await allTab.click({ timeout: 1000, force: true }).catch(() => {});
          }
          await page.waitForTimeout(1000);
        }

        if (!await cardLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
          cardLocator = page.locator(`div.lesson-list a.box:nth-of-type(${card.index + 1}), a.box:nth-of-type(${card.index + 1})`).first();
        }

        if (await cardLocator.isVisible({ timeout: 2500 }).catch(() => false)) {
          await cardLocator.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => {});
          await cardLocator.click({ timeout: 1500, force: true }).catch(() => cardLocator.dispatchEvent('click'));
          await page.waitForTimeout(1200);

          const startLessonBtn = page.locator(
            'a.start-lesson-button, .start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla"), a:has-text("Kaldığın Yerden Devam Et"), a:has-text("Devam Et")'
          ).first();

          if (await startLessonBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
            await startLessonBtn.click({ timeout: 1500, force: true }).catch(() => startLessonBtn.dispatchEvent('click'));
            await page.waitForTimeout(2500);
          }
        }

        // 4. Eğer concept-v3 ekranına ulaştıysak ünite ve konuları tara
        if (page.url().includes('concept-v3')) {
          await this.crawlConceptUnitsAndTopics(page, grade, card.title, subject);
        }

        // 5. Ders bittiğinde Dersler sayfasına güvenli geri dönüş
        await SmartRouter.navigateToMenu(page, 'Dersler');
        await page.waitForTimeout(1200);
      } catch (subErr: any) {
        logger.warn(`AppCrawler: "${card.title}" taranırken hata: ${subErr.message}`);
        await SmartRouter.navigateToMenu(page, 'Dersler').catch(() => {});
      }
    }
  }

  /**
   * Concept-v3 ekranında (#/concept-v3-main) tüm üniteleri ve konuları (ileri/geri rotalarıyla) tarar
   */
  private async crawlConceptUnitsAndTopics(page: Page, grade: string, subjectTitle: string, subject: TopologySubject) {
    logger.info(`AppCrawler [${grade} -> ${subjectTitle}]: Üniteler ve Konular taranıyor...`);
    await PopupDismisser.once(page).catch(() => {});
    await page.waitForTimeout(1000);

    // Sol paneldeki üniteleri oku
    const units = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.unit-container .left-content ul.unit-list li.unit-list-item'));
      return items.map((el, idx) => {
        const num = el.querySelector('.unit-number')?.textContent?.trim() || '';
        const name = el.querySelector('.unit-name')?.textContent?.trim() || '';
        const title = `${num} ${name}`.trim() || (el.textContent || '').trim().replace(/\s+/g, ' ');
        return {
          index: idx,
          number: num,
          name: name || title,
          title,
          selector: `.unit-container .left-content ul.unit-list li.unit-list-item:nth-of-type(${idx + 1})`
        };
      }).filter(u => u.title.length > 1);
    });

    logger.info(`AppCrawler [${subjectTitle}]: ${units.length} ünite tespit edildi.`);

    const unitsToIterate = units.length > 0 ? units : [{ index: 0, number: '1', name: 'Genel', title: 'Genel', selector: '' }];

    for (const unit of unitsToIterate) {
      if (unit.selector) {
        try {
          const unitLoc = page.locator(unit.selector).first();
          if (await unitLoc.isVisible({ timeout: 1000 }).catch(() => false)) {
            await unitLoc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => {});
            await unitLoc.click({ timeout: 1500, force: true }).catch(() => unitLoc.dispatchEvent('click'));
            await page.waitForTimeout(600);
          }
        } catch {}
      }

      // Sağ paneldeki konuları oku
      const topics = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.unit-container .right-content ul.unit-list li.unit-list-item'));
        return items.map((el, idx) => {
          const num = el.querySelector('.unit-number')?.textContent?.trim() || `${idx + 1}`;
          const name = el.querySelector('.unit-name')?.textContent?.trim() || '';
          const detail = el.querySelector('.unit-detail')?.textContent?.trim() || '';
          const title = name || (el.textContent || '').trim().replace(/\s+/g, ' ');
          return {
            index: idx,
            number: num,
            name: title,
            detail,
            selector: `.unit-container .right-content ul.unit-list li.unit-list-item:nth-of-type(${idx + 1})`
          };
        }).filter(t => t.name.length > 1);
      });

      logger.info(`AppCrawler [${subjectTitle} -> ${unit.title}]: ${topics.length} konu tespit edildi.`);

      for (const topicData of topics) {
        const topicId = `${subject.id}_${topicData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        let topic = subject.topics.find(t => t.title.toLowerCase() === topicData.name.toLowerCase() || t.id === topicId);

        const topicForwardPath: PathStep[] = [
          { action: 'GRADE', target: grade },
          { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
          { action: 'CLICK', target: subjectTitle, selector: `a.box:has-text("${subjectTitle}")` },
          { action: 'CLICK', target: 'Derse Başla', selector: 'a.start-lesson-button:has-text("Derse Başla"), a.start-lesson-button' },
          ...(unit.selector ? [{ action: 'CLICK' as const, target: unit.title, selector: unit.selector }] : []),
          { action: 'CLICK', target: topicData.name, selector: topicData.selector }
        ];

        const topicReturnPath: PathStep[] = [
          { action: 'BACK', target: 'Konu Listesi', selector: '.go-back-button' },
          { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
          { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
        ];

        if (!topic) {
          topic = {
            id: topicId,
            title: topicData.name,
            selector: topicData.selector,
            unitId: `${subject.id}_u${unit.index}`,
            unitTitle: unit.title,
            aliases: [topicData.name.toLowerCase(), `${topicData.name.toLowerCase()} konusu`],
            keywords: topicData.name.toLowerCase().split(' '),
            pathSequence: topicForwardPath,
            returnSequence: topicReturnPath,
            items: []
          };
          subject.topics.push(topic);
        } else {
          topic.unitTitle = unit.title;
          topic.pathSequence = topicForwardPath;
          topic.returnSequence = topicReturnPath;
        }

        // Eğer deepItems aktifse konunun içine girip video ve testleri tara
        if (this.deepItems && topics.indexOf(topicData) < 2) {
          await this.crawlTopicMaterials(page, grade, subjectTitle, unit.title, topic);
        }
      }
    }
  }

  /**
   * Konu materyal sayfasına (#/concept-v3-material-page) girip video ve testleri tarar, ardından .go-back-button ile geri döner
   */
  private async crawlTopicMaterials(page: Page, grade: string, subjectTitle: string, unitTitle: string, topic: TopologyTopic) {
    try {
      const topicLoc = page.locator(topic.selector || `.unit-container .right-content ul.unit-list li.unit-list-item:has-text("${topic.title}")`).first();
      if (!await topicLoc.isVisible({ timeout: 1500 }).catch(() => false)) return;

      await topicLoc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => {});
      await topicLoc.click({ timeout: 1500, force: true }).catch(() => topicLoc.dispatchEvent('click'));
      await page.waitForTimeout(2000);

      // Konu Anlatım Yöntemini Seç modalı
      const chooseBtn = page.locator('a.choose-btn, .choose-btn, a:has-text("Konu Anlatım Yöntemini Seç"), button:has-text("Konu Anlatım Yöntemini Seç")').first();
      if (await chooseBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
        await chooseBtn.click({ timeout: 1500, force: true }).catch(() => {});
        await page.waitForTimeout(1500);
      }

      if (page.url().includes('concept-v3-material-page')) {
        const materialItems = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('button, a'));
          return els.map((el, idx) => {
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
            const isVideoOrTest = (text.includes('dk') || text.includes('Soru') || text.includes('Testi')) &&
                                  !text.includes('Refleks') && !text.includes('Yöntem');
            return {
              index: idx,
              title: text.split('\n')[0].trim(),
              fullText: text,
              isVideoOrTest
            };
          }).filter(x => x.isVideoOrTest && x.title.length > 2 && x.title.length < 80);
        });

        logger.info(`AppCrawler [${topic.title}]: ${materialItems.length} video/test öğesi listelendi.`);

        for (const mat of materialItems) {
          const isTest = mat.fullText.toLowerCase().includes('test') || mat.fullText.toLowerCase().includes('soru');
          const itemType: TopologyItemType = isTest ? 'TEST' : 'VIDEO';
          const itemId = `${topic.id}_${mat.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

          const existingItem = topic.items.find(i => i.title.toLowerCase() === mat.title.toLowerCase());
          const itemForwardPath: PathStep[] = [
            ...(topic.pathSequence || []),
            { action: 'CLICK', target: mat.title, selector: `button:has-text("${mat.title}"), a:has-text("${mat.title}")` }
          ];
          const itemReturnPath: PathStep[] = [
            { action: 'BACK', target: 'Konu Listesi', selector: '.go-back-button' },
            { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
            { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
          ];

          if (!existingItem) {
            topic.items.push({
              id: itemId,
              title: mat.title,
              type: itemType,
              unitTitle,
              aliases: [mat.title.toLowerCase()],
              keywords: mat.title.toLowerCase().split(' '),
              pathSequence: itemForwardPath,
              returnSequence: itemReturnPath,
              metadata: { rawText: mat.fullText }
            });
          }
        }

        // Geri Dönüş: .go-back-button ile concept-v3-main'e dön
        const goBackBtn = page.locator('.go-back-button, a.go-back-button, button.go-back-button, [class*="go-back"]').first();
        if (await goBackBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await goBackBtn.click({ timeout: 1500, force: true }).catch(() => goBackBtn.dispatchEvent('click'));
          await page.waitForTimeout(1500);
        }
      }
    } catch (matErr: any) {
      logger.warn(`AppCrawler: Materyal tarama uyarısı: ${matErr.message}`);
      const goBackBtn = page.locator('.go-back-button, [class*="go-back"]').first();
      if (await goBackBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await goBackBtn.click({ timeout: 1500, force: true }).catch(() => {});
      }
    }
  }

  /**
   * Testler ve Denemeler (#/examinations-v2) alt sekmelerini ve sınav kartlarını tarar
   */
  private async crawlExaminations(page: Page, grade: string, levelData: GradeLevelData) {
    logger.info(`AppCrawler [${grade}]: Testler ve Denemeler (#/examinations-v2) taranıyor...`);
    await SmartRouter.navigateToMenu(page, 'Testler ve Denemeler');
    await page.waitForTimeout(2000);
    await PopupDismisser.once(page);

    let examSubject = levelData.subjects.find(s => s.id.includes('deneme') || s.title.includes('Deneme') || s.title.includes('Sınav'));
    if (!examSubject) {
      examSubject = {
        id: `${grade.toLowerCase().replace(/[^a-z0-9]/g, '_')}_denemeler`,
        title: `${grade} Denemeleri ve Testler`,
        selector: 'a.link:has-text("Testler ve Denemeler")',
        aliases: ['denemeler', 'sınavlar', 'testler ve denemeler'],
        keywords: ['deneme', 'sınav', 'test', 'tarama'],
        pathSequence: [
          { action: 'GRADE', target: grade },
          { action: 'NAVIGATE', target: 'Testler ve Denemeler', selector: 'a.link:has-text("Testler ve Denemeler")' }
        ],
        returnSequence: [
          { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
        ],
        topics: []
      };
      levelData.subjects.push(examSubject);
    }

    const subTabs = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li.menu-item, .menu-item'));
      const known = [
        'Bireysel Denemeler',
        'Tarama Testleri',
        'Geçmiş MEB Sınavları',
        'Geçmiş ÖSYM Sınavları',
        'Deneme Kulübü',
        'Strateji Denemeleri'
      ];

      return items.map(it => {
        const text = (it.textContent || '').trim().replace(/\s+/g, ' ');
        const matched = known.find(k => text.toLowerCase().startsWith(k.toLowerCase()));
        return matched || text.split(/\n/)[0].trim();
      }).filter(t => t.length > 2 && t.length < 50);
    });

    const uniqueSubTabs = Array.from(new Set(subTabs));
    logger.info(`AppCrawler [${grade}]: ${uniqueSubTabs.length} sınav alt sekmesi bulundu: ${uniqueSubTabs.join(', ')}`);

    for (const subTabName of uniqueSubTabs) {
      try {
        const subTabLocator = page.locator(`li.menu-item:has-text("${subTabName}")`).first();
        if (await subTabLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
          await subTabLocator.click({ timeout: 1500, force: true }).catch(() => {});
          await page.waitForTimeout(1500);

          const exams = await page.evaluate(() => {
            const listItems = Array.from(document.querySelectorAll('li.exam-toggle-list-item'));
            return listItems.map(it => {
              const name = it.querySelector('.exam-name')?.textContent?.trim() || '';
              const summary = it.querySelector('.exam-summary')?.textContent?.trim() || '';
              const btn = it.querySelector('.exam-status-wrapper')?.textContent?.trim() || '';
              return { name, summary, btn };
            }).filter(e => e.name.length > 2);
          });

          let topic = examSubject.topics.find(t => t.title.toLowerCase() === subTabName.toLowerCase());
          if (!topic) {
            topic = {
              id: `${subTabName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              title: subTabName,
              selector: `li.menu-item:has-text("${subTabName}")`,
              aliases: [subTabName.toLowerCase()],
              keywords: subTabName.toLowerCase().split(' '),
              pathSequence: [
                { action: 'GRADE', target: grade },
                { action: 'NAVIGATE', target: 'Testler ve Denemeler', selector: 'a.link:has-text("Testler ve Denemeler")' },
                { action: 'CLICK', target: subTabName, selector: `li.menu-item:has-text("${subTabName}")` }
              ],
              returnSequence: [
                { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
              ],
              items: []
            };
            examSubject.topics.push(topic);
          }

          for (const exam of exams) {
            const existingItem = topic.items.find(i => i.title.toLowerCase() === exam.name.toLowerCase());
            if (!existingItem) {
              const itemId = `${topic.id}_${exam.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
              const newItem: TopologyItem = {
                id: itemId,
                title: exam.name,
                type: 'TEST',
                aliases: [exam.name.toLowerCase()],
                keywords: exam.name.toLowerCase().split(' '),
                pathSequence: [
                  { action: 'GRADE', target: grade },
                  { action: 'NAVIGATE', target: 'Testler ve Denemeler', selector: 'a.link:has-text("Testler ve Denemeler")' },
                  { action: 'CLICK', target: subTabName, selector: `li.menu-item:has-text("${subTabName}")` },
                  { action: 'CLICK', target: exam.name, selector: `li.exam-toggle-list-item:has-text("${exam.name}") button, li.exam-toggle-list-item:has-text("${exam.name}") a` }
                ],
                returnSequence: [
                  { action: 'NAVIGATE', target: 'Testler ve Denemeler', selector: 'a.link:has-text("Testler ve Denemeler")' },
                  { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
                ],
                metadata: { summary: exam.summary, buttonText: exam.btn }
              };
              topic.items.push(newItem);
            }
          }
        }
      } catch (err: any) {
        logger.warn(`AppCrawler: ${subTabName} sekmesi taranırken hata: ${err.message}`);
      }
    }
  }

  /**
   * WAY Evreni modüllerini (#/dopi-future) tarar
   */
  private async crawlWayUniverse(page: Page, grade: string, levelData: GradeLevelData) {
    logger.info(`AppCrawler [${grade}]: WAY Evreni (#/dopi-future) taranıyor...`);
    await SmartRouter.navigateToMenu(page, 'WAY Evreni');
    await page.waitForTimeout(2000);
    await PopupDismisser.once(page);

    let waySubject = levelData.subjects.find(s => s.id === 'way_evreni_panel' || s.title.includes('WAY'));
    if (!waySubject) {
      waySubject = {
        id: 'way_evreni_panel',
        title: 'WAY Evreni',
        selector: 'a.link:has-text("WAY Evreni")',
        aliases: ['way', 'way evreni', 'dopi future'],
        keywords: ['way', 'future', 'beceri'],
        pathSequence: [
          { action: 'GRADE', target: grade },
          { action: 'NAVIGATE', target: 'WAY Evreni', selector: 'a.link:has-text("WAY Evreni")' }
        ],
        returnSequence: [
          { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
        ],
        topics: [
          {
            id: 'way_sections',
            title: 'WAY Modülleri',
            selector: 'div.way-card',
            aliases: ['way modülleri', 'way bölümleri'],
            keywords: ['way', 'modül'],
            items: []
          }
        ]
      };
      levelData.subjects.push(waySubject);
    }

    const wayCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.way-card, [class*="way-card"]'));
      return cards.map(c => {
        const title = c.querySelector('.way-card-title, .title, h1, h2, h3, h4, h5, h6')?.textContent?.trim() || '';
        const desc = c.querySelector('.way-card-desc, p')?.textContent?.trim() || '';
        return { title, desc };
      }).filter(c => c.title.length > 2);
    });

    const topic = waySubject.topics[0];
    for (const card of wayCards) {
      const existing = topic.items.find(i => i.title.toLowerCase() === card.title.toLowerCase());
      if (!existing) {
        topic.items.push({
          id: `way_${card.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          title: card.title,
          type: 'INTERACTIVE',
          aliases: [card.title.toLowerCase(), `${card.title.toLowerCase()}'a git`],
          keywords: card.title.toLowerCase().split(' '),
          pathSequence: [
            { action: 'GRADE', target: grade },
            { action: 'NAVIGATE', target: 'WAY Evreni', selector: 'a.link:has-text("WAY Evreni")' },
            { action: 'CLICK', target: card.title, selector: `.way-card:has-text("${card.title}") a, .way-card:has-text("${card.title}") button` }
          ],
          returnSequence: [
            { action: 'NAVIGATE', target: 'WAY Evreni', selector: 'a.link:has-text("WAY Evreni")' },
            { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
          ],
          metadata: { desc: card.desc }
        });
      }
    }
  }

  /**
   * LGS Yolculuğum (#/lgs-dashboard/journey) sekmelerini tarar
   */
  private async crawlLgsJourney(page: Page, levelData: GradeLevelData) {
    logger.info('AppCrawler [8. Sınıf]: LGS Yolculuğum (#/lgs-dashboard/journey) taranıyor...');
    await SmartRouter.navigateToMenu(page, 'Lgs Yolculuğum');
    await page.waitForTimeout(2500);
    await PopupDismisser.once(page);

    let journeySubject = levelData.subjects.find(s => s.id === 'lgs_yolculugum_panel');
    if (!journeySubject) {
      journeySubject = {
        id: 'lgs_yolculugum_panel',
        title: 'LGS Yolculuğum',
        selector: 'a.link:has-text("Lgs Yolculuğum")',
        aliases: ['lgs yolculuğum', 'yolculuğum'],
        keywords: ['lgs yolculuk', 'hedef', 'hazırlık'],
        pathSequence: [
          { action: 'GRADE', target: '8. Sınıf' },
          { action: 'NAVIGATE', target: 'Lgs Yolculuğum', selector: 'a.link:has-text("Lgs Yolculuğum")' }
        ],
        returnSequence: [
          { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
        ],
        topics: [
          {
            id: 'lgs_journey_tabs',
            title: 'LGS Yolculuğum Sekmeleri',
            selector: 'button.lgs-journey-page__tab-btn',
            aliases: ['yolculuğum sekmeleri'],
            keywords: ['sekme'],
            items: []
          }
        ]
      };
      levelData.subjects.push(journeySubject);
    }

    const tabs = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button.lgs-journey-page__tab-btn, [role="tab"]'));
      return btns.map(b => (b.textContent || '').trim().replace(/\s+/g, ' ')).filter(t => t.length > 2);
    });

    const topic = journeySubject.topics[0];
    for (const tab of tabs) {
      const existing = topic.items.find(i => i.title.toLowerCase() === tab.toLowerCase());
      if (!existing) {
        topic.items.push({
          id: `lgs_tab_${tab.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          title: tab,
          type: 'TAB',
          aliases: [tab.toLowerCase(), `${tab.toLowerCase()} sekmesi`],
          keywords: tab.toLowerCase().split(' '),
          pathSequence: [
            { action: 'GRADE', target: '8. Sınıf' },
            { action: 'NAVIGATE', target: 'Lgs Yolculuğum', selector: 'a.link:has-text("Lgs Yolculuğum")' },
            { action: 'CLICK', target: tab, selector: `button.lgs-journey-page__tab-btn:has-text("${tab}")` }
          ],
          returnSequence: [
            { action: 'NAVIGATE', target: 'Lgs Yolculuğum', selector: 'a.link:has-text("Lgs Yolculuğum")' },
            { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
          ]
        });
      }
    }
  }
}

// CLI desteği
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('AppCrawler')) {
  const crawler = new AppCrawler();
  crawler.crawl().catch((err) => {
    console.error('Crawler Hatası:', err);
    process.exit(1);
  });
}
