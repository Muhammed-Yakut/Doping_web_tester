import { Page, Locator } from 'playwright';
import { logger } from '../logger.ts';
import { PopupDismisser } from './PopupDismisser.ts';
import { AppKnowledgeBase } from '../knowledge/AppKnowledgeBase.ts';
import { TargetResolver } from '../../ai/TargetResolver.ts';
import { GraphNavigator, NavigationResult } from '../../automation/router/GraphNavigator.ts';

type RouteResult =
  | 'REAL_APP_SEARCH'
  | 'REAL_APP_LESSONS'
  | 'REAL_APP_MENU'
  | 'QUICK_CARD'
  | 'HIERARCHICAL'
  | 'HOME_RETURNED';

/**
 * SmartRouter v4 — Doping Hafıza Otonom Navigasyon Yöneticisi
 *
 * Yetenekler:
 *  1. Sol Menü Navigasyonu: Akıllı Değerlendirme Paneli, İstatistikler, Testler ve Denemeler, vb.
 *  2. Konu Arama & Derse Giriş: Arama çubuğu ➡️ Sonuç ➡️ Ünite ➡️ Yöntem Seç ➡️ İzle zinciri.
 *  3. Sınıf Seçimi: Ana Sayfa sağ üst menüsünden deterministik değişim.
 *  4. Temiz Zemin Garantisi: Her görevden önce Ana Sayfa (#/dashboard) sıfırlaması.
 */
export class SmartRouter {
  public static isRealApp(page: Page): boolean {
    const url = page.url();
    return url.includes('online-education-ui') || url.includes('dopingtech.net');
  }

  private static targetResolver: TargetResolver | null = null;
  private static graphNavigator: GraphNavigator | null = null;

  public static getTargetResolver(): TargetResolver {
    if (!SmartRouter.targetResolver) {
      SmartRouter.targetResolver = new TargetResolver();
    }
    return SmartRouter.targetResolver;
  }

  public static getGraphNavigator(): GraphNavigator {
    if (!SmartRouter.graphNavigator) {
      SmartRouter.graphNavigator = new GraphNavigator();
    }
    return SmartRouter.graphNavigator;
  }

  /**
   * Bulanık Arama (Fuse.js) ve State Machine (GraphNavigator) ile Kilitlenmeyen Akıllı Navigasyon
   */
  public static async navigateSmart(
    page: Page,
    query: string,
    preferredGrade?: string
  ): Promise<NavigationResult> {
    logger.info(`SmartRouter [navigateSmart]: Hedef aranıyor → "${query}" (${preferredGrade || 'sınıf serbest'})`);
    const resolver = SmartRouter.getTargetResolver();
    const navigator = SmartRouter.getGraphNavigator();

    const isBackQuery = query.toLowerCase().includes('geri') || query.toLowerCase().includes('dön') || query.toLowerCase().includes('çık');
    if (isBackQuery) {
      logger.info(`SmartRouter [navigateSmart]: Geri dönüş komutu algılandı ("${query}")...`);
      const targetLevel = query.toLowerCase().includes('ana sayfa') ? 'HOME' : 
                          query.toLowerCase().includes('ders') ? 'LESSONS' : 'PREVIOUS';
      const backOk = await navigator.navigateBack(page, targetLevel);
      return {
        success: backOk,
        totalSteps: 1,
        completedSteps: backOk ? 1 : 0,
        recoveryAttempts: 0,
        currentState: backOk ? 'SUCCESS' : 'FAILED',
        durationMs: 1500
      };
    }

    const resolved = await resolver.resolveTarget(query, preferredGrade);
    if (!resolved.success || !resolved.node) {
      throw new Error(`Hedef topoloji haritasında bulunamadı: "${query}"`);
    }

    logger.info(`SmartRouter [navigateSmart]: Eşleşen Düğüm → "${resolved.node.title}" [${resolved.node.nodeId}] (${resolved.method})`);
    return await navigator.navigate(page, resolved.node, { targetGrade: preferredGrade });
  }

  /**
   * Her görevin ve adımın başında temiz başlangıç noktasına (#/dashboard) döner.
   * Ekranda açık modal, pop-up, video oynatıcı, sınav ekranı veya drawer
   * ne olursa olsun güvenle kapatıp Ana Sayfa'ya (%100 temiz zemin) döner.
   */
  public static async goHome(page: Page): Promise<void> {
    if (!page || page.isClosed()) return;

    logger.info('SmartRouter [goHome]: Temiz başlangıç için Ana Sayfa\'ya dönülüyor...');

    const searchInput = page.locator('input.search-input').first();

    // 0. Aktif/Yarıda kalmış Test veya Sınavdan Güvenli Çıkış (Kullanıcı Kuralı: "Testi Bitir" seçilerek çıkılmalı)
    try {
      const isTestPage = page.url().includes('concept-v3-test-page');
      const isExamPage = page.url().includes('examinations-exam-page');
      const isLessonQuizOpen = isTestPage || await page.locator('.ReactModal__Content a.close-button, a.exit-button, a.end:has-text("Cevapla ve Bitir"), a.icon-button.end-test').first().isVisible({ timeout: 400 }).catch(() => false);

      if (isExamPage || isLessonQuizOpen || isTestPage) {
        logger.info('SmartRouter [goHome]: Aktif/yarıda kalmış test tespit edildi, "Testi Bitir" seçeneğiyle güvenle kapatılıyor...');

        if (isTestPage) {
          const endBtn = page.locator('a.icon-button.end-test:has-text("Testi Bitir"), a.end:has-text("Cevapla ve Bitir"), a:has-text("Testi Bitir")').first();
          if (await endBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await endBtn.click({ timeout: 1000 }).catch(() => endBtn.dispatchEvent('click'));
            await page.waitForTimeout(1000);
            const confirmBtn = page.locator('a.btn.btn-alert:has-text("Testi Bitir"), a.btn:has-text("Testi Yarıda Bırak"), button:has-text("Testi Bitir")').first();
            if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await confirmBtn.click({ timeout: 1000 }).catch(() => confirmBtn.dispatchEvent('click'));
              await page.waitForTimeout(1500);
            }
          }
        }

        // A) Tam deneme sınavı ekranındaysak
        if (isExamPage) {
          const exitBtn = page.locator('a.exit-button, button:has-text("Testi Bitir"), button:has-text("Sınavı Bitir")').first();
          if (await exitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await exitBtn.dispatchEvent('click');
            await page.waitForTimeout(800);

            // Onay modalında "Testi Bitir" veya "Evet" seç
            const confirmBtn = page.locator(
              '.modal button:has-text("Testi Bitir"), .modal a:has-text("Testi Bitir"), ' +
              '.popup-frame a:has-text("Testi Bitir"), .popup-frame button:has-text("Testi Bitir"), ' +
              'button:has-text("Testi Bitir"), a:has-text("Testi Bitir"), ' +
              'button:has-text("Sınavı Bitir"), a:has-text("Sınavı Bitir"), ' +
              'button:has-text("Evet"), button.swal2-confirm'
            ).last();

            if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await confirmBtn.dispatchEvent('click');
              await page.waitForTimeout(1500);
            }
          }
        }

        // B) Ders içi soru/quiz modalı açıksa
        if (isLessonQuizOpen) {
          // Önce varsa doğrudan "Cevapla ve Bitir" butonunu dene
          const endBtn = page.locator('a.end:has-text("Cevapla ve Bitir"), a:has-text("Cevapla ve Bitir"), button:has-text("Testi Bitir")').first();
          if (await endBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await endBtn.click({ timeout: 1000 }).catch(() => {});
            await page.waitForTimeout(1000);
          } else {
            // Modalın kapatma butonuna tıkla
            const modalClose = page.locator('.ReactModal__Content a.close-button, a.close-button').first();
            if (await modalClose.isVisible({ timeout: 500 }).catch(() => false)) {
              await modalClose.click({ timeout: 1000 }).catch(() => {});
              await page.waitForTimeout(800);

              // "Ayrılmadan önce kalan soruları tamamlamak ister misin? Tamamla / Ayrıl" modalında "Ayrıl" (testi bitirip çıkma) seç
              const leaveBtn = page.locator('a.btn.btn-alert:has-text("Ayrıl"), a:has-text("Ayrıl"), button:has-text("Ayrıl")').first();
              if (await leaveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await leaveBtn.click({ timeout: 1000 }).catch(() => {});
                await page.waitForTimeout(1000);
              }
            }
          }

          // Sonuç modalı çıktıysa "Kapat" tıkla
          const resClose = page.locator('a.start-exam:has-text("Kapat"), a:has-text("Kapat"), .popup-close').first();
          if (await resClose.isVisible({ timeout: 1000 }).catch(() => false)) {
            await resClose.click({ timeout: 1000 }).catch(() => {});
            await page.waitForTimeout(500);
          }
        }
      }
    } catch (testExitErr: any) {
      logger.warn(`SmartRouter [goHome]: Testten çıkış uyarısı: ${testExitErr.message}`);
    }

    // 1. Zaten temiz ana sayfadaysak ve arama çubuğu görünürse anında dön
    if (page.url().includes('#/dashboard') && await searchInput.isVisible({ timeout: 400 }).catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
      logger.info('SmartRouter [goHome]: Zaten temiz Ana Sayfa (#/dashboard) üzerindeyiz.');
      return;
    }

    // 2. Ekranda açık engel, dialog veya modal'ları temizle
    try {
      await page.keyboard.press('Escape').catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});

      // Sınav kapağı veya dialog kapatma (popup-close)
      const popupClose = page.locator('a.popup-close, .popup-close, [class*="popup-close"]').first();
      if (await popupClose.isVisible({ timeout: 300 }).catch(() => false)) {
        await popupClose.click().catch(() => {});
      }

      // Sol menüdeki "Ana Sayfa" linki tıkla
      const homeBtn = page.locator('a.link:has-text("Ana Sayfa"), nav a:has-text("Ana Sayfa"), aside a:has-text("Ana Sayfa")').first();
      if (await homeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await homeBtn.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    } catch {}

    // 3. SPA hash garantisi
    try {
      if (SmartRouter.isRealApp(page)) {
        await page.evaluate(() => {
          window.location.hash = '#/dashboard';
        });
        await page.waitForTimeout(600);
      }
    } catch {}

    // 4. Doğrulama: Ana Sayfa elemanı (arama çubuğu veya sınıf seçici) görünür mü?
    let isHomeReady = await searchInput.isVisible({ timeout: 1200 }).catch(() => false);

    // 5. Normal geçiş kilitlendiyse, doğrudan SPA URL reset ile sıfırla
    if (!isHomeReady && SmartRouter.isRealApp(page)) {
      logger.warn('SmartRouter [goHome]: Sayfa kilitli görünüyor, doğrudan dashboard URL reset yapılıyor...');
      try {
        await page.evaluate(() => {
          window.location.href = window.location.origin + window.location.pathname + '#/dashboard';
        });
        await page.waitForTimeout(1000);
        isHomeReady = await searchInput.isVisible({ timeout: 1500 }).catch(() => false);
        if (!isHomeReady) {
          await page.reload({ timeout: 8000, waitUntil: 'domcontentloaded' }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      } catch (err: any) {
        logger.warn(`SmartRouter [goHome]: Reload fallback uyarısı: ${err.message}`);
      }
    }

    await PopupDismisser.once(page).catch(() => {});
    logger.info('SmartRouter [goHome]: Ana Sayfa (#/dashboard) hazır.');
  }

  /**
   * Sol Menü Öğelerine Doğrudan Navigasyon (Akıllı Değerlendirme, İstatistikler, vb.)
   */
  public static async navigateToMenu(page: Page, menuName: string): Promise<boolean> {
    logger.info(`SmartRouter [Sol Menü]: "${menuName}" sayfasına gidiliyor...`);

    // Gerekirse önce ana sayfaya dön
    if (!page.url().includes('online-education-ui')) {
      await SmartRouter.goHome(page);
    }

    // ── Bire Bir Uygulamalar ve Alt Menüleri ──
    const m = menuName.toLowerCase().trim();

    if (m === 'çözücü' || m.includes('cozucu') || m === 'çözücüye git') {
      const solverLink = page.locator('a#three-p-solver, li.link-item a.link:has-text("Çözücü")').first();
      if (!await solverLink.isVisible().catch(() => false)) {
        const parentMenu = page.locator('a#three-p-apps-menu, li.link-item.express-apps a.link').first();
        if (await parentMenu.isVisible().catch(() => false)) await parentMenu.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      if (await solverLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await solverLink.dispatchEvent('click');
        await page.waitForTimeout(1000);
        logger.info('SmartRouter [Sol Menü]: "Çözücü" tıklandı.');
        return true;
      }
    }

    if (m === 'şimdi anladım' || m.includes('simdi anladim')) {
      const saLink = page.locator('a#three-p-sa, li.link-item a.link:has-text("Şimdi Anladım")').first();
      if (!await saLink.isVisible().catch(() => false)) {
        const parentMenu = page.locator('a#three-p-apps-menu, li.link-item.express-apps a.link').first();
        if (await parentMenu.isVisible().catch(() => false)) await parentMenu.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      if (await saLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saLink.dispatchEvent('click');
        await page.waitForTimeout(1000);
        logger.info('SmartRouter [Sol Menü]: "Şimdi Anladım" tıklandı.');
        return true;
      }
    }

    if (m === 'koçum yanımda' || m.includes('kocum yanimda')) {
      const kyLink = page.locator('a#three-p-ky, li.link-item a.link:has-text("Koçum Yanımda")').first();
      if (!await kyLink.isVisible().catch(() => false)) {
        const parentMenu = page.locator('a#three-p-apps-menu, li.link-item.express-apps a.link').first();
        if (await parentMenu.isVisible().catch(() => false)) await parentMenu.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      if (await kyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await kyLink.dispatchEvent('click');
        await page.waitForTimeout(1000);
        logger.info('SmartRouter [Sol Menü]: "Koçum Yanımda" tıklandı.');
        return true;
      }
    }

    if (m === 'bire bir uygulamalar' || m === 'bire bir' || m.includes('express-apps')) {
      const appsMenu = page.locator('a#three-p-apps-menu, li.link-item a.link:has-text("Bire Bir")').first();
      if (await appsMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await appsMenu.dispatchEvent('click');
        await page.waitForTimeout(1000);
        logger.info('SmartRouter [Sol Menü]: "Bire Bir Uygulamalar" tıklandı.');
        return true;
      }
    }

    // ── Panel İçi Alt Sekmeler ve Bölümler ──
    if (m === 'bireysel denemeler' || m === 'bireysel deneme') {
      return SmartRouter.navigateToExam(page, { subTab: 'Bireysel Denemeler' });
    }
    if (m === 'tarama testleri' || m === 'tarama testi') {
      return SmartRouter.navigateToExam(page, { subTab: 'Tarama Testleri' });
    }
    if (m.includes('geçmiş') || m.includes('çıkmış')) {
      const cur = await SmartRouter.getCurrentGrade(page);
      const isLise = cur.includes('12') || cur.includes('YKS') || cur.includes('11') || cur.includes('10') || cur.includes('9');
      return SmartRouter.navigateToExam(page, { subTab: isLise ? 'Geçmiş ÖSYM Sınavları' : 'Geçmiş MEB Sınavları' });
    }
    if (m === 'deneme kulübü' || m === 'canlı deneme') {
      return SmartRouter.navigateToExam(page, { subTab: 'Deneme Kulübü' });
    }
    if (m === 'strateji denemeleri' || m === 'mini deneme') {
      return SmartRouter.navigateToExam(page, { subTab: 'Strateji Denemeleri' });
    }

    // WAY Evreni alt bölümleri
    if (['görevlerim', 'startup lab', '21.yy', 'mission way', 'şövalye'].some(w => m.includes(w))) {
      return SmartRouter.navigateToWaySection(page, menuName);
    }

    // LGS Yolculuğum alt sekmeleri
    if (['ne kadar hazırım', 'sınav performansı'].some(l => m.includes(l))) {
      return SmartRouter.navigateToLgsJourneyTab(page, menuName);
    }

    // Hash kısayolları (Tüm sekmeler desteklenir)
    const hashShortcuts: Record<string, string> = {
      'ana sayfa': '#/dashboard',
      'dashboard': '#/dashboard',
      'dersler': '#/lessons',
      'testler ve denemeler': '#/examinations-v2',
      'denemeler': '#/examinations-v2',
      'testler': '#/examinations-v2',
      'way evreni': '#/dopi-future',
      'way': '#/dopi-future',
      'lgs yolculuğum': '#/lgs-dashboard/journey',
      'yks yolculuğum': '#/dopi-future',
      'yolculuğum': '#/lgs-dashboard/journey',
      'rehberlik videoları': '#/guidance-page',
      'rehberlik': '#/guidance-page',
      'istatistikler': '#/statistic-page-v2',
      'istatistik': '#/statistic-page-v2',
      'akıllı değerlendirme paneli': '#/smart-evaluator',
      'akıllı değerlendirme': '#/smart-evaluator',
      'değerlendirme paneli': '#/smart-evaluator',
      'yardım merkezi': '#/help-center',
      'yardım': '#/help-center',
      'canlı etkinlikler': '#/live-events',
      'canlı etkinlik': '#/live-events',
      'öğrencilerimizden dinleyin': '#/testimonial',
      'öğrenci görüşleri': '#/testimonial',
    };

    const targetHash = hashShortcuts[m];
    if (targetHash) {
      try {
        await page.evaluate((h) => { window.location.hash = h; }, targetHash);
        await page.waitForTimeout(1500);
        await PopupDismisser.once(page);
        logger.info(`SmartRouter [Sol Menü]: "${menuName}" sayfasına hash ile ulaşıldı (${targetHash}).`);
        return true;
      } catch {}
    }

    // Sol menü linkine tıkla (Fiziksel locator garantisi)
    try {
      const link = page.locator(
        `li.link-item a.link:has-text("${menuName}"), a.link:has-text("${menuName}"), aside a:has-text("${menuName}")`
      ).first();
      await link.scrollIntoViewIfNeeded().catch(() => {});
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await page.waitForTimeout(1500);
        await PopupDismisser.once(page);
        logger.info(`SmartRouter [Sol Menü]: "${menuName}" menü öğesine tıklandı.`);
        return true;
      }
    } catch (err: any) {
      logger.warn(`SmartRouter [Sol Menü]: Menü tıklama hatası: ${err.message}`);
    }

    return false;
  }

  /**
   * Testler ve Denemeler paneli içinde alt sekme gezinmesi ve test başlatma:
   *  - Alt sekme geçişi: Tarama Testleri, Bireysel Denemeler, Geçmiş MEB/ÖSYM Sınavları, Deneme Kulübü, Strateji Denemeleri
   *  - Test kartı bulma ve başlatma: 'Sınava Başla' / 'Testi Çöz' / 'Teste Devam Et' / 'Sonucu İncele'
   */
  public static async navigateToExam(
    page: Page,
    options: { testName?: string; subTab?: string; grade?: string }
  ): Promise<boolean> {
    const { testName, subTab, grade } = options;
    logger.info(`SmartRouter [Test Navigasyonu]: subTab="${subTab || 'Genel'}", test="${testName || 'Genel'}", grade="${grade || 'Otomatik'}"`);

    // Sınıf değişimi gerekiyorsa önce değiştir
    if (grade) {
      const curGrade = await SmartRouter.getCurrentGrade(page);
      if (curGrade.toLowerCase() !== grade.toLowerCase()) {
        await SmartRouter.changeGrade(page, grade);
      }
    }

    // Testler ve Denemeler sayfasına git
    const onExamPage = page.url().includes('examinations-v2');
    if (!onExamPage) {
      await SmartRouter.navigateToMenu(page, 'Testler ve Denemeler');
      await page.waitForTimeout(1500);
    }

    // 1. Alt Sekmeye Tıkla (Bireysel Denemeler, Tarama Testleri, Geçmiş Sınavlar...)
    if (subTab) {
      try {
        const subTabLocator = page.locator(
          `li.menu-item:has-text("${subTab}"), a.item-link:has-text("${subTab}"), li.menu-item a:has-text("${subTab}")`
        ).first();
        if (await subTabLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info(`SmartRouter [Test Navigasyonu]: Alt sekme "${subTab}" seçiliyor...`);
          await subTabLocator.click();
          await page.waitForTimeout(1500);
        }
      } catch (err: any) {
        logger.warn(`SmartRouter [Test Navigasyonu]: Alt sekme tıklama uyarısı: ${err.message}`);
      }
    }

    // 2. Belirli bir test adı istendiyse kartı bul ve butona tıkla
    if (testName && testName.trim()) {
      logger.info(`SmartRouter [Test Navigasyonu]: "${testName}" testi aranıyor...`);
      try {
        const testItem = page.locator(
          `li.exam-toggle-list-item:has-text("${testName}"), [class*="exam"]:has-text("${testName}"), .exam-name:has-text("${testName}")`
        ).first();

        await testItem.scrollIntoViewIfNeeded().catch(() => {});

        if (await testItem.isVisible({ timeout: 3000 }).catch(() => false)) {
          logger.info(`SmartRouter [Test Navigasyonu]: "${testName}" kartı bulundu, aksiyon butonu aranıyor...`);
          const actionBtn = testItem.locator(
            'a.action-button, button.action-button, .exam-status-wrapper a, .exam-status-wrapper button, button, a'
          ).first();

          if (await actionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await actionBtn.click({ force: true });
            await page.waitForTimeout(2000);
            logger.info(`SmartRouter [Test Navigasyonu ✓]: "${testName}" aksiyon butonu tıklandı.`);
            return true;
          } else {
            await testItem.click({ force: true });
            await page.waitForTimeout(2000);
            logger.info(`SmartRouter [Test Navigasyonu ✓]: "${testName}" kartına tıklandı.`);
            return true;
          }
        } else {
          logger.warn(`SmartRouter [Test Navigasyonu]: "${testName}" kartı listede bulunamadı.`);
        }
      } catch (examErr: any) {
        logger.error(`SmartRouter [Test Navigasyonu]: Test tıklama hatası: ${examErr.message}`);
      }
    }

    return true;
  }

  /**
   * WAY Evreni paneli içinde alt bölümlere gezinme:
   *  - Görevlerim, WAY Startup Lab, 21.yy Dersleri, Mission WAY, Şövalye Takımı
   */
  public static async navigateToWaySection(page: Page, sectionName: string): Promise<boolean> {
    logger.info(`SmartRouter [WAY Evreni]: "${sectionName}" bölümüne gidiliyor...`);

    const onWayPage = page.url().includes('dopi-future');
    if (!onWayPage) {
      await SmartRouter.navigateToMenu(page, 'WAY Evreni');
      await page.waitForTimeout(2000);
    }

    try {
      const sectionCard = page.locator(
        `.way-card:has-text("${sectionName}"), [class*="way-card"]:has-text("${sectionName}"), .card:has-text("${sectionName}")`
      ).first();

      await sectionCard.scrollIntoViewIfNeeded().catch(() => {});

      if (await sectionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        logger.info(`SmartRouter [WAY Evreni]: "${sectionName}" kartı bulundu, açılıyor...`);
        const seeAll = sectionCard.locator('a:has-text("Tümünü Gör"), button:has-text("Tümünü Gör"), a, button').first();
        if (await seeAll.isVisible({ timeout: 1500 }).catch(() => false)) {
          await seeAll.click();
        } else {
          await sectionCard.click();
        }
        await page.waitForTimeout(2000);
        logger.info(`SmartRouter [WAY Evreni ✓]: "${sectionName}" bölümü açıldı.`);
        return true;
      }
    } catch (err: any) {
      logger.warn(`SmartRouter [WAY Evreni]: Bölüm açma hatası: ${err.message}`);
    }

    return false;
  }

  /**
   * Lgs Yolculuğum paneli içinde alt sekmelere gezinme (8. Sınıf):
   *  - Dersler, LGS'ye Ne Kadar Hazırım?, Sınav Performansı
   */
  public static async navigateToLgsJourneyTab(page: Page, tabName: string): Promise<boolean> {
    logger.info(`SmartRouter [LGS Yolculuğum]: "${tabName}" sekmesine gidiliyor...`);

    const curGrade = await SmartRouter.getCurrentGrade(page);
    if (curGrade !== '8. Sınıf') {
      await SmartRouter.changeGrade(page, '8. Sınıf');
    }

    const onJourney = page.url().includes('lgs-dashboard/journey');
    if (!onJourney) {
      await SmartRouter.navigateToMenu(page, 'Lgs Yolculuğum');
      await page.waitForTimeout(2000);
    }

    try {
      const tabBtn = page.locator(
        `button.lgs-journey-page__tab-btn:has-text("${tabName}"), button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`
      ).first();

      if (await tabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(1500);
        logger.info(`SmartRouter [LGS Yolculuğum ✓]: "${tabName}" sekmesi tıklandı.`);
        return true;
      }
    } catch (err: any) {
      logger.warn(`SmartRouter [LGS Yolculuğum]: Sekme tıklama hatası: ${err.message}`);
    }

    return false;
  }

  // Kullanıcının özellikle hariç tutulmasını istediği yasaklı seviyeler
  private static readonly FORBIDDEN_LEVELS = [
    '1. Sınıf', '2. Sınıf', '3. Sınıf',
    '1.sınıf', '2.sınıf', '3.sınıf',
    '1. sınıf', '2. sınıf', '3. sınıf',
    '1 sınıf', '2 sınıf', '3 sınıf',
    '2 Yaş', '3 Yaş', '4 Yaş',
    '2 yaş', '3 yaş', '4 yaş',
    '2 yas', '3 yas', '4 yas',
  ];

  /**
   * Sağ üstteki sınıf açılır menüsünden hedef sınıfı seçer.
   */
  public static async changeGrade(
    page: Page,
    targetGradeOrLevel: string = '8. Sınıf'
  ): Promise<boolean> {
    const isRealApp = SmartRouter.isRealApp(page);
    if (!isRealApp) {
      logger.info(`SmartRouter [Simülatör]: Seviye "${targetGradeOrLevel}" olarak simüle edildi.`);
      return true;
    }

    const normalizedTarget = SmartRouter.normalizeGradeName(targetGradeOrLevel);
    logger.info(`SmartRouter [changeGrade]: Sınıf değiştirme hedefi → "${normalizedTarget}"`);

    // Yasaklı sınıf kontrolü (1, 2, 3. Sınıf ve 2, 3, 4 Yaş hariç tutulmuştur)
    const isForbidden = SmartRouter.FORBIDDEN_LEVELS.some(
      f => normalizedTarget.toLowerCase().trim() === f.toLowerCase().trim() ||
           targetGradeOrLevel.toLowerCase().trim() === f.toLowerCase().trim()
    );
    if (isForbidden) {
      logger.warn(`SmartRouter [changeGrade]: "${normalizedTarget}" yasaklı sınıflar (1, 2, 3. sınıf veya 2, 3, 4 yaş) kapsamındadır. Geçiş kesinlikle engellendi.`);
      return false;
    }

    // Sınıf seçimi daima ana sayfadadır
    await SmartRouter.goHome(page);
    await PopupDismisser.once(page);

    try {
      const selectBtn = page.locator('nav.select-menu.grade a.select, .grade-selection-options a.select').first();
      await selectBtn.waitFor({ state: 'visible', timeout: 5000 });

      const currentText = (await selectBtn.innerText()).trim();
      logger.info(`SmartRouter [changeGrade]: Mevcut seçili sınıf: "${currentText}"`);

      // Tam eşleşme kontrolü (12. Sınıf ile 2. Sınıf çakışmasını engeller)
      if (currentText.toLowerCase() === normalizedTarget.toLowerCase()) {
        logger.info(`SmartRouter [changeGrade]: Zaten "${normalizedTarget}" seçili.`);
        return true;
      }

      await selectBtn.click();
      await page.waitForTimeout(500);

      const optionLocator = page.locator(
        `.grade-selection-options ul li a:has-text("${normalizedTarget}"), .grade-selection-options a:has-text("${normalizedTarget}")`
      ).first();

      await optionLocator.scrollIntoViewIfNeeded().catch(() => {});

      if (await optionLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await optionLocator.click();
        logger.info(`SmartRouter [changeGrade]: "${normalizedTarget}" seçeneğine tıklandı.`);
      } else {
        const textFallback = page.getByText(normalizedTarget, { exact: true }).first();
        await textFallback.scrollIntoViewIfNeeded().catch(() => {});
        if (await textFallback.isVisible({ timeout: 2000 }).catch(() => false)) {
          await textFallback.click();
          logger.info(`SmartRouter [changeGrade]: getByText ile "${normalizedTarget}" tıklandı.`);
        } else {
          logger.warn(`SmartRouter [changeGrade]: "${normalizedTarget}" seçeneği bulunamadı!`);
          await page.keyboard.press('Escape').catch(() => {});
          return false;
        }
      }

      await page.waitForTimeout(1500);
      await PopupDismisser.once(page);

      const updatedText = (await selectBtn.innerText().catch(() => '')).trim();
      logger.info(`SmartRouter [changeGrade]: Başarılı! Yeni aktif sınıf: "${updatedText}"`);
      return true;
    } catch (err: any) {
      logger.error(`SmartRouter [changeGrade]: Hata: ${err.message}`);
      await page.keyboard.press('Escape').catch(() => {});
      return false;
    }
  }

  public static normalizeGradeName(input: string): string {
    const raw = input.trim();
    const lower = raw.toLowerCase();

    // 1. Önce YKS 2028 kontrolü
    if (lower.includes('2028') || lower.includes('yks 2028')) {
      return 'YKS 2028';
    }

    // 2. Sayısal sınıf tespiti
    const match = raw.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 12) {
        return `${num}. Sınıf`;
      }
    }

    if (lower.includes('ortaokul') || lower.includes('lgs') || lower.includes('middle')) {
      return '8. Sınıf';
    }
    if (lower.includes('lise') || lower.includes('yks') || lower.includes('ayt') || lower.includes('tyt') || lower.includes('high')) {
      return '12. Sınıf';
    }
    if (lower.includes('ilkokul') || lower.includes('primary')) {
      return '4. Sınıf';
    }

    return raw.includes('Sınıf') ? raw : `${raw}. Sınıf`;
  }

  public static async getCurrentGrade(page: Page): Promise<string> {
    try {
      const selectBtn = page.locator('nav.select-menu.grade a.select, .grade-selection-options a.select').first();
      if (await selectBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
        const text = (await selectBtn.innerText()).trim();
        if (text) return SmartRouter.normalizeGradeName(text);
      }
    } catch {}
    return '12. Sınıf';
  }

  /**
   * Ders ve Konu hedefine gider.
   * KB (AppKnowledgeBase) tabanlı akıllı yönlendirme desteği vardır:
   * Belirsiz konu/ders adı verildiğinde KB fuzzy match ile tam yolu bulur.
   */
  public static async navigateToTopic(
    page: Page,
    subject?: string,
    topic?: string,
    menu?: string,
    currentGrade?: string
  ): Promise<{ routeUsed: RouteResult; durationMs: number }> {
    const start = Date.now();
    const isRealApp = SmartRouter.isRealApp(page);

    // Otomatik aktif sınıf tespiti
    if (!currentGrade && isRealApp) {
      currentGrade = await SmartRouter.getCurrentGrade(page);
    }

    // ── 1. Sol Menü İstendiyse Doğrudan Menüye Git ──
    if (menu && menu.trim().length > 0 && !subject && !topic) {
      const success = await SmartRouter.navigateToMenu(page, menu);
      if (success) {
        return { routeUsed: 'REAL_APP_MENU', durationMs: Date.now() - start };
      }
    }

    // ── 1.5. KB (AppKnowledgeBase) Fuzzy Yönlendirmesi ──
    // Yalnızca belirli bir alt konu/test adı varsa KB fuzzy yönlendirmesi yap;
    // Eğer kullanıcı yalnızca dersi söylediyse (örn: subject='Matematik', topic=undefined),
    // doğrudan Dersler -> Kart -> Derse Başla akışını kullan.
    const isYaziliRoute = /yaz[ıi]l[ıi]|prova/i.test(subject || '') || (topic ? /yaz[ıi]l[ıi]|prova/i.test(topic) : false);
    const isSubjectOnly = !topic || topic.trim().length === 0 || topic.toLowerCase().includes('başla') || 
      (subject ? (topic.toLowerCase() === subject.toLowerCase() || subject.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(subject.toLowerCase())) : false);
    const kbQuery = (!isYaziliRoute && !isSubjectOnly && topic) || '';
    if (kbQuery.trim() && isRealApp) {
      const kbResult = AppKnowledgeBase.findAny(kbQuery, currentGrade);
      if (kbResult) {
        if (kbResult.type === 'lesson') {
          const { lessonCard, unit, topics: kbTopics, grade: kbGrade } = kbResult.entry;
          logger.info(`SmartRouter [KB]: "${kbQuery}" → ${kbGrade} / ${lessonCard} / ${unit}`);

          // Sınıf farklıysa önce değiştir
          if (currentGrade && kbGrade !== currentGrade) {
            await SmartRouter.changeGrade(page, kbGrade);
          }

          // Ana sayfaya dön, KB bilgileriyle ilerle
          await SmartRouter.goHome(page);
          await PopupDismisser.once(page);

          // Önce arama çubuğuyla ünite adını ara (Maksimum 2 deneme ve Safe Node Kurtarması)
          const resolvedSearch = unit;
          let unitOpened = false;
          let searchAttempt = 0;
          const maxSearchAttempts = 2;

          while (!unitOpened && searchAttempt < maxSearchAttempts) {
            searchAttempt++;
            try {
              const searchInput = page.locator('input.search-input, input[placeholder*="Ders, ünite"]').first();
              if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`SmartRouter [KB→Arama]: "${resolvedSearch}" aranıyor (Deneme ${searchAttempt}/${maxSearchAttempts})...`);
                await searchInput.click();
                await searchInput.fill(resolvedSearch);
                await page.waitForTimeout(1500);

                const resultItem = page.locator(`a.item:has-text("${resolvedSearch}"), div.info:has-text("${resolvedSearch}"), a.item`).first();
                if (await resultItem.isVisible({ timeout: 3000 }).catch(() => false)) {
                  await resultItem.click();
                  await page.waitForTimeout(2500);
                  unitOpened = true;
                } else {
                  // İlk sonucu al
                  const firstResult = page.locator('a.item').first();
                  if (await firstResult.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await firstResult.click();
                    await page.waitForTimeout(2500);
                    unitOpened = true;
                  } else {
                    await page.keyboard.press('Escape').catch(() => {});
                  }
                }
              }
            } catch (kbSearchErr: any) {
              logger.warn(`SmartRouter [KB]: Arama denemesi ${searchAttempt} başarısız: ${kbSearchErr.message}`);
              if (searchAttempt < maxSearchAttempts) {
                logger.info('SmartRouter [Kurtarma]: Güvenli düğüme (Dashboard) sıfırlanıp arama tekrar deneniyor...');
                await SmartRouter.goHome(page);
                await PopupDismisser.once(page);
              }
            }
          }

          // Ünite ekranı açıldıysa alt konu listesinden tıkla
          if (page.url().includes('concept-v3-main')) {
            const firstTopic = kbTopics[0];
            const topicLink = page.locator(
              firstTopic
                ? `li.unit-list-item:has-text("${firstTopic}"), a.unit-list-item-link:has-text("${firstTopic}"), div.list-item a.item-link:has-text("${firstTopic}"), a.item-link`
                : 'li.unit-list-item a.unit-list-item-link, li.unit-list-item, a.item-link'
            ).first();

            if (await topicLink.isVisible({ timeout: 2500 }).catch(() => false)) {
              logger.info(`SmartRouter [KB→Konu]: Konu/ünite maddesine tıklanıyor...`);
              await topicLink.click();
              await page.waitForTimeout(2500);
            }
          }

          // Yöntem seç butonu
          const chooseBtn = page.locator('a.choose-btn, .choose-btn, a:has-text("Konu Anlatım Yöntemini Seç")').first();
          if (await chooseBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await chooseBtn.click();
            await page.waitForTimeout(1500);
          }

          // Eğer video izleme isteniyorsa İzle / Baştan Başla / Devam Et butonuna tıkla;
          // Eğer test çözülecekse video başlatma, sayfa materyal ekranında kalsın (selectTopicMaterial ile teste geçilecek)
          const isTestTarget = kbQuery.toLowerCase().includes('test') || kbQuery.toLowerCase().includes('soru') || kbQuery.toLowerCase().includes('pekiştirme');
          if (isTestTarget) {
            await SmartRouter.selectTopicMaterial(page, kbQuery, true);
          } else {
            const playBtn = page.locator(
              'a.solve-again-btn, button.solve-again-btn, ' +
              'a:has-text("Baştan Başla"), button:has-text("Baştan Başla"), ' +
              'a.watch-again-btn, a:has-text("Devam Et"), ' +
              'button:has-text("İzle"), a:has-text("İzle")'
            ).first();
            if (await playBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              logger.info('SmartRouter [KB]: Video başlatma butonu tıklandı.');
              await playBtn.click();
              await page.waitForTimeout(2000);
            }
          }

          logger.info(`SmartRouter [KB ✓]: Ulaşıldı — ${kbGrade} / ${lessonCard} / ${unit}`);
          return { routeUsed: 'REAL_APP_SEARCH', durationMs: Date.now() - start };
        }
        // Test türü için: Testler ve Denemeler paneli içi navigasyonu çalıştır
        if (kbResult.type === 'test') {
          const { grade: kbGrade, subTab, testName } = kbResult.entry;
          logger.info(`SmartRouter [KB→Test]: "${kbQuery}" → ${kbGrade} / ${subTab} / ${testName}`);
          if (currentGrade && kbGrade !== currentGrade) {
            await SmartRouter.changeGrade(page, kbGrade);
          }
          await SmartRouter.goHome(page);
          const success = await SmartRouter.navigateToExam(page, { subTab, testName, grade: kbGrade });
          return { routeUsed: success ? 'REAL_APP_MENU' : 'REAL_APP_LESSONS', durationMs: Date.now() - start };
        }
      }
    }

    // ── 1.6. WAY Evreni & LGS Yolculuğum Alt Bölüm Fuzzy Arama ──
    const wayMatch = AppKnowledgeBase.findWaySection(kbQuery);
    if (wayMatch && isRealApp) {
      await SmartRouter.goHome(page);
      const success = await SmartRouter.navigateToWaySection(page, wayMatch.title);
      return { routeUsed: 'REAL_APP_MENU', durationMs: Date.now() - start };
    }

    const lgsMatch = AppKnowledgeBase.findLgsJourneyTab(kbQuery);
    if (lgsMatch && isRealApp) {
      await SmartRouter.goHome(page);
      const success = await SmartRouter.navigateToLgsJourneyTab(page, lgsMatch.tabName);
      return { routeUsed: 'REAL_APP_MENU', durationMs: Date.now() - start };
    }

    // ── 2. Konu veya Ders Araması ──
    logger.info(`SmartRouter: Navigasyon -> Ders: "${subject || 'Genel'}", Konu: "${topic || 'Genel'}"`);

    await SmartRouter.goHome(page);
    await PopupDismisser.once(page);

    if (isRealApp) {
      // ── B) "DERSLER" MENÜSÜNDEN DERS KARTINA GİRİŞ FONKSİYONU ──
      const runLessonsMenu = async (): Promise<boolean> => {
        try {
          const finalSubject = subject || 'Matematik';
          const isYaziliTarget = /yaz[ıi]l[ıi]|prova/i.test(finalSubject) || (topic ? /yaz[ıi]l[ıi]|prova/i.test(topic) : false);
          logger.info(`SmartRouter [Dersler Menüsü]: "${finalSubject}" kartı aranıyor (Yazılı Provası: ${isYaziliTarget})...`);

          // 1. Gerekirse Dersler (#/lessons) sayfasına git
          if (!page.url().includes('lessons') && !page.url().includes('concept-v3')) {
            const derslerLink = page.locator('a.link:has-text("Dersler"), nav a:has-text("Dersler")').first();
            if (await derslerLink.isVisible({ timeout: 2000 }).catch(() => false)) {
              await derslerLink.click();
            } else {
              await page.evaluate(() => { window.location.hash = '#/lessons'; });
            }
            await page.waitForTimeout(1500);
            await PopupDismisser.once(page);
          }

          // 2. 8-11. sınıflarda Sayısal sekmesi Sözel dersleri gizlediği için "Tüm Dersler" sekmesine geç
          try {
            const allLessonsTab = page.locator('a.tab-link:has-text("Tüm Dersler")').first();
            if (await allLessonsTab.isVisible({ timeout: 1200 }).catch(() => false)) {
              const isActive = await allLessonsTab.evaluate(el => el.classList.contains('active')).catch(() => false);
              if (!isActive) {
                logger.info('SmartRouter [Dersler Menüsü]: "Tüm Dersler" sekmesine tıklanıyor...');
                await allLessonsTab.click({ timeout: 1500, force: true }).catch(() => {});
                await page.waitForTimeout(800);
                await PopupDismisser.once(page);
              }
            }
          } catch {}

          // 3. Ders kartını bul ve tıkla (Standart Ders vs. Yazılı Provaları ayrımı)
          let lessonCard: Locator;
          if (isYaziliTarget) {
            lessonCard = page.locator('a.box:has-text("Yazılı Provaları"), a.box:has-text("Yazılı")').first();
          } else {
            // Standart ders kartını ara; kesinlikle Yazılı Provaları kartını seçme
            lessonCard = page.locator(
              `a.box:has-text("${finalSubject}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı")), ` +
              `div.lesson-list a.box:has-text("${finalSubject}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı")), ` +
              `.lesson-card:has-text("${finalSubject}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı"))`
            ).first();

            // Eğer tam ders adıyla bulunamadıysa temel branş anahtarıyla dene (örn: "Matematik", "Türkçe", "Fizik")
            if (!await lessonCard.isVisible({ timeout: 1500 }).catch(() => false)) {
              const disciplines = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce', 'Din Kültürü'];
              for (const disc of disciplines) {
                if (finalSubject.toLowerCase().includes(disc.toLowerCase()) || disc.toLowerCase().includes(finalSubject.toLowerCase())) {
                  const fallbackCard = page.locator(
                    `a.box:has-text("${disc}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı"))`
                  ).first();
                  if (await fallbackCard.isVisible({ timeout: 1000 }).catch(() => false)) {
                    lessonCard = fallbackCard;
                    break;
                  }
                }
              }
            }
          }

          if (await lessonCard.isVisible({ timeout: 4000 }).catch(() => false)) {
            const cardText = (await lessonCard.innerText().catch(() => '')).replace(/\s+/g, ' ');
            logger.info(`SmartRouter [Dersler Menüsü]: Ders kartı bulundu ("${cardText}"). Tıklanıyor...`);
            await lessonCard.scrollIntoViewIfNeeded().catch(() => {});
            try {
              await lessonCard.click({ timeout: 2500 });
            } catch {
              await lessonCard.dispatchEvent('click');
            }
            await page.waitForTimeout(1500);
            await PopupDismisser.once(page);

            // 4. "Derse Başla" butonuna bas ve dersin içine gir!
            const startLessonBtn = page.locator(
              'a.start-lesson-button, .start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla"), a:has-text("Kaldığın Yerden Devam Et"), a:has-text("Devam Et")'
            ).first();

            if (await startLessonBtn.isVisible({ timeout: 3500 }).catch(() => false)) {
              logger.info('SmartRouter [Dersler Menüsü]: "Derse Başla" butonuna tıklandı.');
              try {
                await startLessonBtn.click({ timeout: 2500 });
              } catch {
                await startLessonBtn.dispatchEvent('click');
              }
              await page.waitForURL(url => url.href.includes('concept-v3'), { timeout: 6000 }).catch(() => {});
              await page.waitForTimeout(2000);
              if (page.url().includes('splash')) {
                await page.waitForURL(url => url.href.includes('concept-v3-main') || !url.href.includes('splash'), { timeout: 6000 }).catch(() => {});
                await page.waitForTimeout(1500);
              }
              await PopupDismisser.once(page);
            } else {
              logger.warn('SmartRouter [Dersler Menüsü]: "Derse Başla" butonu hemen algılanamadı, ek bekleme yapılıyor...');
              await page.waitForTimeout(1200);
              if (await startLessonBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
                await startLessonBtn.dispatchEvent('click');
                await page.waitForURL(url => url.href.includes('concept-v3'), { timeout: 6000 }).catch(() => {});
                await page.waitForTimeout(2000);
                if (page.url().includes('splash')) {
                  await page.waitForURL(url => url.href.includes('concept-v3-main') || !url.href.includes('splash'), { timeout: 6000 }).catch(() => {});
                  await page.waitForTimeout(1500);
                }
              }
            }

            // 5. Eğer Yazılı Provaları içindeysek ve belirli bir branş istendiyse (örn: "Matematik" veya "Türkçe") sağ panelden ilgili dersi seç
            if (isYaziliTarget && page.url().includes('concept-v3')) {
              const subDisciplines = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce', 'Din Kültürü'];
              for (const disc of subDisciplines) {
                if (finalSubject.toLowerCase().includes(disc.toLowerCase()) || (topic && topic.toLowerCase().includes(disc.toLowerCase()))) {
                  const subItem = page.locator(`.unit-container .right-content li:has-text("${disc}"), .right-content li:has-text("${disc}")`).first();
                  if (await subItem.isVisible({ timeout: 1500 }).catch(() => false)) {
                    logger.info(`SmartRouter [Yazılı Provaları]: İlgili ders konusu seçiliyor: "${disc}"...`);
                    await subItem.click().catch(() => subItem.dispatchEvent('click'));
                    await page.waitForTimeout(1000);
                    break;
                  }
                }
              }
            }

            return true;
          }
        } catch (lessonErr: any) {
          logger.error(`SmartRouter [Dersler Menüsü]: Hata: ${lessonErr.message}`);
        }
        return false;
      };

      // Eğer doğrudan dersin kendisi isteniyorsa (konu belirtilmemişse veya 'Derse Başla' denmişse) doğrudan Dersler menüsü akışını çalıştır
      if (isSubjectOnly || menu === 'Dersler' || (topic && topic.toLowerCase().includes('başla'))) {
        const ok = await runLessonsMenu();
        if (ok) {
          return { routeUsed: 'REAL_APP_LESSONS', durationMs: Date.now() - start };
        }
      }

      // ── A) ARAMA ÇUBUĞU İLE KONUYA GİRİŞ ──
      const searchTarget = topic || subject;
      if (searchTarget && searchTarget.trim().length > 0) {
        try {
          const searchInput = page.locator('input.search-input, input[placeholder*="Ders, ünite"]').first();
          if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            logger.info(`SmartRouter [Arama]: "${searchTarget}" aranıyor...`);
            await searchInput.click();
            await searchInput.fill(searchTarget);
            await page.waitForTimeout(1500);

            // Arama sonucundaki a.item veya satırı bul
            const resultItem = page.locator(
              `a.item:has-text("${searchTarget}"), div.info:has-text("${searchTarget}"), a.item`
            ).first();

            if (await resultItem.isVisible({ timeout: 3000 }).catch(() => false)) {
              logger.info(`SmartRouter [Arama]: Sonuç bulundu, "${searchTarget}" açılıyor...`);
              await resultItem.click();
              await page.waitForTimeout(2500);

              // ── ÜNİTE EKRANI GELDİYSE ALT KONUYA TIKLA ──
              if (page.url().includes('concept-v3-main')) {
                logger.info('SmartRouter: Ünite ekranı açıldı, alt konuya tıklanıyor...');
                const subtopic = page.locator(
                  'div.list-item a.item-link, a.item-link, div:has-text("Tanımı ve Özellikleri"), div.list-item'
                ).first();
                if (await subtopic.isVisible({ timeout: 2000 }).catch(() => false)) {
                  await subtopic.click();
                  await page.waitForTimeout(2500);
                }
              }

              // ── "KONU ANLATIM YÖNTEMİNİ SEÇ" POPUP'I GELDİYSE ONAYLA ──
              const chooseBtn = page.locator('a.choose-btn, .choose-btn, a:has-text("Konu Anlatım Yöntemini Seç")').first();
              if (await chooseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info('SmartRouter: "Konu Anlatım Yöntemini Seç" butonu tıklandı.');
                await chooseBtn.click();
                await page.waitForTimeout(2000);
              }

              // Eğer test isteniyorsa materyallerden konu testini seç, video isteniyorsa İzle'ye bas
              const isTestRequested = searchTarget && (
                searchTarget.toLowerCase().includes('test') || 
                searchTarget.toLowerCase().includes('soru') || 
                searchTarget.toLowerCase().includes('pekiştirme') ||
                searchTarget.toLowerCase().includes('çıkmış')
              );

              if (isTestRequested) {
                await SmartRouter.selectTopicMaterial(page, searchTarget, true);
              } else {
                // ── "İZLE" BUTONU VARSA TIKLA ──
                const izleBtn = page.locator('button:has-text("İzle"), a:has-text("İzle")').first();
                if (await izleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                  logger.info('SmartRouter: "İzle" butonu tıklandı, video başlatılıyor...');
                  await izleBtn.click();
                  await page.waitForTimeout(2000);
                }
              }

              logger.info(`SmartRouter [Arama ✓]: Ulaşıldı (URL: ${page.url()})`);
              return { routeUsed: 'REAL_APP_SEARCH', durationMs: Date.now() - start };
            } else {
              logger.warn(`SmartRouter [Arama]: "${searchTarget}" için arama sonucu çıkmadı, ESC ile kapatılıyor.`);
              await page.keyboard.press('Escape').catch(() => {});
            }
          }
        } catch (searchErr: any) {
          logger.warn(`SmartRouter [Arama]: Arama hatası (${searchErr.message}), Dersler menüsüne geçiliyor.`);
        }
      }

      // Arama başarısız olduysa veya sonuç çıkmadıysa Dersler menüsü akışını dene
      const lessonsOk = await runLessonsMenu();
      if (lessonsOk) {
        return { routeUsed: 'REAL_APP_LESSONS', durationMs: Date.now() - start };
      }

      return { routeUsed: 'REAL_APP_LESSONS', durationMs: Date.now() - start };
    }

    // ── C) SİMÜLATÖR MODU ──
    try {
      const quickButton = page.locator('#btn-quick-start-uslu').or(page.locator('button:has-text("Dersi Başlat")')).first();
      if (await quickButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await quickButton.click();
        await page.waitForTimeout(500);
        return { routeUsed: 'QUICK_CARD', durationMs: Date.now() - start };
      }

      const subjectMenu = page.locator('#sidebar-subject-mat').or(page.getByText(subject || 'Matematik')).first();
      if (await subjectMenu.isVisible({ timeout: 1500 }).catch(() => false)) {
        await subjectMenu.click();
        await page.waitForTimeout(300);
      }

      const topicItem = page.locator('#hierarchical-topic-uslu').first();
      await topicItem.click();
      await page.waitForTimeout(500);

      return { routeUsed: 'HIERARCHICAL', durationMs: Date.now() - start };
    } catch (simErr: any) {
      throw new Error(`Simülatör navigasyon hatası: ${simErr.message}`);
    }
  }

  /**
   * concept-v3-material-page ekranında "Konu İçerikleri" listesinden istenen materyali seçer.
   * Özellikle en sondaki Konu Testleri ("Konu Testi", "Pekiştirme Testi", "Çıkmış Sorular") için
   * .custom-scrollbar konteynerini aşağı kaydırır, testi tıklar, "Ayrılmak istediğine emin misin?"
   * modal onayını ("Devam Et") verir ve ana ekrandaki "Teste Başla" / "Testi Baştan Çöz" butonuna basar.
   */
  public static async selectTopicMaterial(
    page: Page,
    materialName?: string,
    isTest: boolean = true
  ): Promise<boolean> {
    try {
      if (!page.url().includes('concept-v3-material-page')) {
        return false;
      }

      logger.info(`SmartRouter: "Konu İçerikleri" altından materyal seçiliyor: "${materialName || (isTest ? 'En Sondaki Konu Testi' : 'Materyal')}"...`);

      // 1. .custom-scrollbar konteynerini bul ve aşağı kaydır
      await page.evaluate(() => {
        const sc = document.querySelector('.custom-scrollbar, .subject-contents, [class*="scrollbar"]');
        if (sc) {
          sc.scrollTop = sc.scrollHeight;
        }
      }).catch(() => {});
      await page.waitForTimeout(600);

      // 2. İstenen linki ara
      let targetLink = materialName && materialName !== 'Konu Testi'
        ? page.locator(`a.item-link:has-text("${materialName}"), [class*="item-link"]:has-text("${materialName}")`).first()
        : null;

      if (!targetLink || !(await targetLink.isVisible({ timeout: 1200 }).catch(() => false))) {
        // En sondaki konu testlerini (.last() ile) hedefle
        targetLink = page.locator(
          'a.item-link:has-text("Konu Testi"), ' +
          'a.item-link:has-text("Pekiştirme Testi"), ' +
          'a.item-link:has-text("Çıkmış Sorular"), ' +
          'a.item-link:has-text("Kazanım Testi"), ' +
          'a.item-link:has-text("Tarama Testi"), ' +
          'a.item-link:has-text("Ustalık Testi"), ' +
          'a.item-link:has-text("Isınma Testi"), ' +
          'a.item-link:has-text("Testi")'
        ).last();
      }

      if (await targetLink.isVisible({ timeout: 2500 }).catch(() => false)) {
        const linkTxt = (await targetLink.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        logger.info(`SmartRouter [Konu İçerikleri]: "${linkTxt}" seçildi.`);
        await targetLink.scrollIntoViewIfNeeded().catch(() => {});
        try {
          await targetLink.click({ timeout: 2000 });
        } catch {
          await targetLink.dispatchEvent('click');
        }
        await page.waitForTimeout(1500);

        // 3. "Ayrılmak istediğine emin misin?" modal uyarısı çıkarsa "Devam Et" onayla
        const modalAlert = page.locator('a.btn-alert:has-text("Devam Et"), a:has-text("Devam Et"), button:has-text("Devam Et")').first();
        if (await modalAlert.isVisible({ timeout: 1500 }).catch(() => false)) {
          logger.info('SmartRouter [Konu İçerikleri]: "Ayrılmak istediğine emin misin?" modalı onaylandı (Devam Et).');
          await modalAlert.click().catch(() => modalAlert.dispatchEvent('click'));
          await page.waitForTimeout(1500);
        }

        // 4. Test başlatma butonu görünüyorsa bas ("Teste Başla" / "Tekrar Çöz" / "Teste Devam Et" / "Testi Baştan Çöz")
        if (isTest) {
          const startBtn = page.locator(
            'a.btn.review-btn, button.review-btn, a:has-text("Teste Başla"), button:has-text("Teste Başla"), ' +
            'a.btn.solve-again-btn, button.solve-again-btn, a:has-text("Tekrar Çöz"), button:has-text("Tekrar Çöz"), ' +
            'a:has-text("Testi Baştan Çöz"), button:has-text("Testi Baştan Çöz"), ' +
            'a.btn.watch-again-btn, button.watch-again-btn, a:has-text("Teste Devam Et"), button:has-text("Teste Devam Et"), ' +
            'a:has-text("Kaldığın Yerden Devam Et"), button:has-text("Kaldığın Yerden Devam Et"), ' +
            'a.answer-btn:has-text("Soruları Çöz"), a:has-text("Soruları Çöz"), ' +
            'a:has-text("Video Sorularını Çöz"), button:has-text("Video Sorularını Çöz")'
          ).first();

          if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            const btnTxt = (await startBtn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
            logger.info(`SmartRouter [Konu İçerikleri]: "${btnTxt}" butonuna basılarak test başlatılıyor...`);
            try {
              await startBtn.click({ timeout: 2500 });
            } catch {
              await startBtn.dispatchEvent('click');
            }
            await page.waitForTimeout(1500);
            await page.waitForURL((url) => url.href.includes('concept-v3-test-page'), { timeout: 4000 }).catch(() => {});
            logger.info(`SmartRouter [Konu İçerikleri ✓]: Test ekranı açıldı (${page.url()}).`);
          } else {
            logger.warn('SmartRouter [Konu İçerikleri]: Test başlatma butonu (Teste Başla / Tekrar Çöz) henüz görünür değil.');
          }
        }

        return true;
      } else {
        logger.warn('SmartRouter [Konu İçerikleri]: Konu testi bağlantısı bulunamadı.');
      }
    } catch (err: any) {
      logger.warn(`SmartRouter [Konu İçerikleri]: Materyal seçimi hatası: ${err.message}`);
    }
    return false;
  }

  public static async changeLevel(
    page: Page,
    targetLevel: 'PRIMARY' | 'MIDDLE_LGS' | 'HIGH_YKS' | string
  ): Promise<boolean> {
    return SmartRouter.changeGrade(page, targetLevel);
  }
}
