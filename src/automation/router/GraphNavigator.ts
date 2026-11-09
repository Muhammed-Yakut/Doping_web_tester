import { Page, Locator } from 'playwright';
import { logger } from '../../server/logger.ts';
import { SmartRouter } from '../../server/automation/SmartRouter.ts';
import { PopupDismisser } from '../../server/automation/PopupDismisser.ts';
import { PathStep, SearchableNode } from '../../shared/types/topology.ts';

export type NavigatorState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'EXECUTING_STEP'
  | 'WAITING_FOR_ELEMENT'
  | 'ACTION_COMPLETED'
  | 'EMERGENCY_RECOVERY'
  | 'SUCCESS'
  | 'FAILED';

export interface NavigationResult {
  success: boolean;
  finalUrl?: string;
  totalSteps: number;
  completedSteps: number;
  failedStep?: PathStep;
  failedStepIndex?: number;
  error?: string;
  recoveryAttempts: number;
  currentState: NavigatorState;
  durationMs: number;
}

export class GraphNavigator {
  private state: NavigatorState = 'IDLE';
  private maxStepRetries: number = 2;
  private defaultTimeoutMs: number = 5000;

  public getState(): NavigatorState {
    return this.state;
  }

  /**
   * Bir SearchableNode veya PathStep[] rotasını deterministik olarak yürütür.
   */
  public async navigate(
    page: Page,
    target: SearchableNode | PathStep[],
    options?: { targetGrade?: string; timeoutMs?: number }
  ): Promise<NavigationResult> {
    const startTime = Date.now();
    this.state = 'INITIALIZING';

    const pathSequence: PathStep[] = Array.isArray(target) ? target : target.pathSequence;
    const targetGrade = options?.targetGrade || (!Array.isArray(target) ? target.gradeName : undefined);
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;

    logger.info(`🧭 GraphNavigator: Rota başlatılıyor (${pathSequence.length} adım)...`);

    // Sınıf Kontrolü ve Geçiş
    if (targetGrade) {
      try {
        const curGrade = await SmartRouter.getCurrentGrade(page);
        if (curGrade !== targetGrade) {
          logger.info(`GraphNavigator: Hedef sınıf "${targetGrade}" seçiliyor (Mevcut: "${curGrade}")...`);
          await SmartRouter.changeGrade(page, targetGrade);
          await page.waitForTimeout(1000);
        }
      } catch (err: any) {
        logger.warn(`GraphNavigator: Sınıf geçiş uyarısı: ${err.message}`);
      }
    }

    let recoveryCount = 0;
    let completedSteps = 0;

    // Rota Adımlarını Döngüyle İcra Et
    for (let stepIndex = 0; stepIndex < pathSequence.length; stepIndex++) {
      const step = pathSequence[stepIndex];
      this.state = 'EXECUTING_STEP';

      let stepSucceeded = false;
      let attempt = 0;

      while (!stepSucceeded && attempt <= this.maxStepRetries) {
        attempt++;
        try {
          logger.info(`GraphNavigator [Adım ${stepIndex + 1}/${pathSequence.length}] [Deneme ${attempt}]: ${step.action} -> "${step.target}"`);

          // Pop-up temizliği
          await PopupDismisser.once(page).catch(() => {});

          // Adımı İcra Et
          await this.executeStep(page, step, timeoutMs);
          stepSucceeded = true;
          completedSteps++;
          this.state = 'ACTION_COMPLETED';
          await page.waitForTimeout(700);
        } catch (stepErr: any) {
          logger.warn(`GraphNavigator: [Adım ${stepIndex + 1}: "${step.target}"] başarısız: ${stepErr.message}`);

          if (attempt <= this.maxStepRetries) {
            // Kurtarma Modu (Emergency Recovery / Breadcrumb Reset)
            this.state = 'EMERGENCY_RECOVERY';
            recoveryCount++;
            logger.info(`⚠️ GraphNavigator [Kurtarma Modu]: Safe Node (#/dashboard) noktasına sıfırlanıyor (Deneme ${attempt}/${this.maxStepRetries})...`);

            await this.recoverToSafeNode(page);

            // Güvenli noktaya döndükten sonra rotayı baştan bu adıma kadar tekrar yürüt
            const catchUpSuccess = await this.replayStepsUpTo(page, pathSequence, stepIndex, timeoutMs);
            if (!catchUpSuccess) {
              logger.warn(`GraphNavigator [Kurtarma]: Ara adımlar yeniden oynatılırken takıldı.`);
            }
          } else {
            // Maksimum deneme tükendi, sistemi kilitlemeden kontrollü başarısızlık raporla
            this.state = 'FAILED';
            const errorMsg = `Rota tıkandı: [${step.target}] bulunamadı`;
            logger.error(`❌ GraphNavigator: ${errorMsg}`);

            return {
              success: false,
              finalUrl: page.url(),
              totalSteps: pathSequence.length,
              completedSteps,
              failedStep: step,
              failedStepIndex: stepIndex,
              error: errorMsg,
              recoveryAttempts: recoveryCount,
              currentState: 'FAILED',
              durationMs: Date.now() - startTime
            };
          }
        }
      }
    }

    this.state = 'SUCCESS';
    logger.info(`✅ GraphNavigator: Rota başarıyla tamamlandı! (${completedSteps}/${pathSequence.length} adım)`);

    return {
      success: true,
      finalUrl: page.url(),
      totalSteps: pathSequence.length,
      completedSteps,
      recoveryAttempts: recoveryCount,
      currentState: 'SUCCESS',
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Tek bir rota adımını icra eder
   */
  private async executeStep(page: Page, step: PathStep, timeoutMs: number): Promise<void> {
    this.state = 'WAITING_FOR_ELEMENT';
    const locator = await this.findActionableLocator(page, step, timeoutMs);

    if (!locator) {
      throw new Error(`Hedef eleman bulunamadı: "${step.target}"`);
    }

    switch (step.action) {
      case 'CLICK': {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        try {
          await locator.click({ timeout: 3500 });
        } catch (clickErr) {
          // JS dispatch click fallback (örneğin overlay veya animasyon varsa)
          logger.info(`GraphNavigator: Normal click engellendi, dispatchEvent('click') deneniyor...`);
          await locator.dispatchEvent('click');
        }

        // A) Eğer ders kartına tıklandıysa ve "Derse Başla" butonu belirdiyse tıkla
        try {
          const startLessonBtn = page.locator(
            'a.start-lesson-button, .start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla"), a:has-text("Kaldığın Yerden Devam Et"), a:has-text("Devam Et")'
          ).first();
          if (await startLessonBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
            logger.info('GraphNavigator: "Derse Başla" butonu algılandı, tıklanıyor...');
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
          }
        } catch {}

        // B) Eğer "Konu Anlatım Yöntemini Seç" modalı belirdiyse onayla
        try {
          const chooseBtn = page.locator('a.choose-btn, .choose-btn, a:has-text("Konu Anlatım Yöntemini Seç")').first();
          if (await chooseBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
            logger.info('GraphNavigator: "Konu Anlatım Yöntemini Seç" butonu algılandı, tıklanıyor...');
            await chooseBtn.click().catch(() => {});
            await page.waitForTimeout(1500);
          }
        } catch {}

        // C) Eğer video materyal sayfasındaysak ve video kapağında "Baştan Başla", "Devam Et" veya "İzle" butonu varsa tıkla
        if (page.url().includes('concept-v3-material-page')) {
          try {
            const coverPlayBtn = page.locator('a.solve-again-btn, a.watch-again-btn, button:has-text("İzle"), a:has-text("İzle")').first();
            if (await coverPlayBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              logger.info('GraphNavigator: Video başlatma butonu algılandı, tıklanıyor...');
              await coverPlayBtn.click().catch(() => {});
              await page.waitForTimeout(1500);
            }
          } catch {}
        }

        // D) Eğer tıklama sonrası sınav kapağı (.examinations-cover-wrapper) açıldıysa otomatik "Testi Başlat" tıkla
        try {
          const examStartCover = page.locator('a.start-button, .start-button, button:has-text("Testi Başlat"), a:has-text("Testi Başlat")').first();
          if (await examStartCover.isVisible({ timeout: 1200 }).catch(() => false)) {
            logger.info('GraphNavigator: Sınav kapağı algılandı, "Testi Başlat" tıklanıyor...');
            await examStartCover.dispatchEvent('click').catch(() => {});
            await page.waitForTimeout(1500);
          }
        } catch {}

        break;
      }

      case 'BACK': {
        const goBackBtn = page.locator('.go-back-button, a.go-back-button, button.go-back-button, [class*="go-back"]').first();
        if (await goBackBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info('GraphNavigator: [BACK] .go-back-button tıklanıyor...');
          try {
            await goBackBtn.click({ timeout: 2500 });
          } catch {
            await goBackBtn.dispatchEvent('click');
          }
          await page.waitForTimeout(1500);
        } else {
          logger.info('GraphNavigator: [BACK] Geri butonu görünür değil, Dersler paneline dönülüyor...');
          await SmartRouter.navigateToMenu(page, 'Dersler');
        }
        break;
      }

      case 'NAVIGATE': {
        logger.info(`GraphNavigator: [NAVIGATE] Hedef menüye gidiliyor: "${step.target}"...`);
        await SmartRouter.navigateToMenu(page, step.target);
        await page.waitForTimeout(1000);
        break;
      }

      case 'GRADE': {
        logger.info(`GraphNavigator: [GRADE] Sınıf seçimi: "${step.target}"...`);
        await SmartRouter.changeGrade(page, step.target);
        await page.waitForTimeout(1000);
        break;
      }

      case 'URL': {
        logger.info(`GraphNavigator: [URL] Hash URL yönlendirmesi: "${step.target}"...`);
        await page.evaluate((targetHash) => { window.location.hash = targetHash; }, step.target);
        await page.waitForTimeout(1000);
        break;
      }

      case 'SCROLL': {
        await locator.scrollIntoViewIfNeeded();
        break;
      }

      case 'WAIT': {
        await page.waitForTimeout(step.timeoutMs || 1000);
        break;
      }

      case 'HOVER': {
        await locator.hover({ timeout: 3500 });
        break;
      }

      case 'TYPE': {
        await locator.fill(step.value || '');
        break;
      }

      default:
        await locator.click({ timeout: 3500 });
    }
  }

  /**
   * Hedef elemanı bulmak için çoklu seçici stratejisi (Selector, Role, Text, Container Filter)
   */
  private async findActionableLocator(page: Page, step: PathStep, timeoutMs: number): Promise<Locator | null> {
    // 1. Doğrudan selector varsa
    if (step.selector) {
      try {
        const directLoc = page.locator(step.selector).first();
        if (await directLoc.isVisible({ timeout: 1500 }).catch(() => false)) {
          return directLoc;
        }
      } catch {}
    }

    const target = step.target.trim();

    // 1.5. Eğer hedef "Derse Başla" ise ve zaten concept ekranına geçildiyse adım başarıyla tamamlanmıştır
    if (target.toLowerCase().includes('başla') || target.toLowerCase().includes('derse')) {
      if (page.url().includes('concept-v3')) {
        logger.info('GraphNavigator: "Derse Başla" adımı zaten tamamlanmış (concept-v3 ekranındayız).');
        return page.locator('body').first();
      }
    }

    // 2. Özel bilinen SPA panel rotaları
    if (target.toLowerCase() === 'dersler') {
      const lessonsLink = page.locator('a.link:has-text("Dersler"), nav a:has-text("Dersler"), a[href*="lessons"]').first();
      if (await lessonsLink.isVisible({ timeout: 1000 }).catch(() => false)) return lessonsLink;
      // SPA evaluate fallback
      await page.evaluate(() => { window.location.hash = '#/lessons'; });
      await page.waitForTimeout(800);
      return page.locator('body').first();
    }

    if (target.toLowerCase().includes('testler ve denemeler') || target.toLowerCase() === 'denemeler') {
      const examLink = page.locator('a.link:has-text("Testler"), nav a:has-text("Testler"), a[href*="examinations"]').first();
      if (await examLink.isVisible({ timeout: 1000 }).catch(() => false)) return examLink;
      await page.evaluate(() => { window.location.hash = '#/examinations-v2'; });
      await page.waitForTimeout(800);
      return page.locator('body').first();
    }

    if (target.toLowerCase() === 'way evreni') {
      const wayLink = page.locator('a.link:has-text("WAY"), nav a:has-text("WAY"), a[href*="dopi-future"]').first();
      if (await wayLink.isVisible({ timeout: 1000 }).catch(() => false)) return wayLink;
      await page.evaluate(() => { window.location.hash = '#/dopi-future'; });
      await page.waitForTimeout(800);
      return page.locator('body').first();
    }

    if (target.toLowerCase().includes('lgs yolculuğum')) {
      const journeyLink = page.locator('a.link:has-text("Lgs"), nav a:has-text("Lgs"), a[href*="lgs-dashboard"]').first();
      if (await journeyLink.isVisible({ timeout: 1000 }).catch(() => false)) return journeyLink;
      await page.evaluate(() => { window.location.hash = '#/lgs-dashboard/journey'; });
      await page.waitForTimeout(800);
      return page.locator('body').first();
    }

    // 2.5. Eğer #/lessons sayfasındaysak
    if (page.url().includes('lessons')) {
      // 8-11. sınıflarda Sayısal sekmesi Sözel dersleri gizleyebildiği için gerekirse "Tüm Dersler" sekmesine geç
      try {
        const allLessonsTab = page.locator('a.tab-link:has-text("Tüm Dersler")').first();
        if (await allLessonsTab.isVisible({ timeout: 400 }).catch(() => false)) {
          const isActive = await allLessonsTab.evaluate(el => el.classList.contains('active')).catch(() => false);
          if (!isActive) {
            const isTargetVisible = await page.locator(`a.box:has-text("${target}")`).first().isVisible({ timeout: 300 }).catch(() => false);
            if (!isTargetVisible) {
              logger.info('GraphNavigator: Hedef aktif sekmede görünmüyor. "Tüm Dersler" sekmesine tıklanıyor...');
              await allLessonsTab.click({ timeout: 1500, force: true }).catch(() => {});
              await page.waitForTimeout(600);
            }
          }
        }
      } catch {}

      // "Derse Başla" butonu açıksa
      const startBtn = page.locator(
        'a.start-lesson-button, .start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla"), a:has-text("Kaldığın Yerden Devam Et")'
      ).first();
      if (await startBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        if (target.toLowerCase().includes('başla') || target.toLowerCase().includes('derse')) {
          return startBtn;
        }
        // Eğer aranan hedef doğrudan bir ders kutusu (a.box) değilse, ünite/konuya erişebilmek için önce derse gir
        const isBoxVisible = await page.locator(`a.box:has-text("${target}")`).first().isVisible({ timeout: 400 }).catch(() => false);
        if (!isBoxVisible && !target.toLowerCase().includes('dersler')) {
          logger.info('GraphNavigator: Ders kartı açık ama derse girilmemiş. Otomatik "Derse Başla" tıklanıyor...');
          try {
            await startBtn.click({ timeout: 2500 });
          } catch {
            await startBtn.dispatchEvent('click');
          }
          await page.waitForURL(url => url.href.includes('concept-v3'), { timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(2000);
          if (page.url().includes('splash')) {
            await page.waitForURL(url => url.href.includes('concept-v3-main') || !url.href.includes('splash'), { timeout: 6000 }).catch(() => {});
            await page.waitForTimeout(1500);
          }
        }
      }
    }

    // 3. Buton, Link ve Ünite Eşleşmeleri (Standart Ders vs. Yazılı Provaları filtreli)
    const isYaziliTarget = /yaz[ıi]l[ıi]|prova/i.test(target);
    const candidateLocators = [
      page.getByRole('button', { name: target }).first(),
      page.getByRole('link', { name: target }).first(),
      page.locator(`button:has-text("${target}")`).first(),
      page.locator(`a:has-text("${target}")`).first(),
      page.locator('a.start-lesson-button, .start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla")').first(),
      page.locator(`li.unit-list-item:has-text("${target}"), a.unit-list-item-link:has-text("${target}"), [class*="unit-list-item"]:has-text("${target}")`).first(),
      page.locator(`span.unit-name:has-text("${target}"), [class*="unit-name"]:has-text("${target}")`).first(),
      page.locator(`a.item-link:has-text("${target}"), div.list-item:has-text("${target}")`).first(),
      page.locator(`a.solve-again-btn:has-text("${target}"), a.watch-again-btn:has-text("${target}")`).first(),
      page.locator(`li.exam-toggle-list-item:has-text("${target}") button, li.exam-toggle-list-item:has-text("${target}") a`).first(),
      page.locator(`.way-card:has-text("${target}") a, .way-card:has-text("${target}") button`).first(),
      page.locator(`button.lgs-journey-page__tab-btn:has-text("${target}")`).first(),
      isYaziliTarget
        ? page.locator('div.lesson-list a.box:has-text("Yazılı Provaları"), a.box:has-text("Yazılı Provaları"), a.box:has-text("Yazılı")').first()
        : page.locator(`div.lesson-list a.box:has-text("${target}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı"))`).first(),
      isYaziliTarget
        ? page.locator('a.box:has-text("Yazılı Provaları"), a.box:has-text("Yazılı")').first()
        : page.locator(`a.box:has-text("${target}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı"))`).first(),
      page.getByText(target, { exact: false }).first(),
    ];

    for (const loc of candidateLocators) {
      try {
        if (await loc.isVisible({ timeout: Math.min(timeoutMs, 2000) }).catch(() => false)) {
          return loc;
        }
      } catch {}
    }

    // 3.5. Kök Kelime (Stem / Prefix) Eşleşmesi (Örn: "Üslü Sayılar" -> "Üslü İfadeler")
    const words = target.split(/\s+/).filter(w => w.length >= 3);
    if (words.length > 0) {
      const stem = words[0];
      const stemLocators = [
        page.locator(`li.unit-list-item:has-text("${stem}")`).first(),
        page.locator(`a.unit-list-item-link:has-text("${stem}")`).first(),
        page.locator(`span.unit-name:has-text("${stem}")`).first(),
        page.locator(`a.item-link:has-text("${stem}")`).first(),
        page.locator(`div.list-item:has-text("${stem}")`).first(),
        isYaziliTarget
          ? page.locator('a.box:has-text("Yazılı Provaları"), a.box:has-text("Yazılı")').first()
          : page.locator(`a.box:has-text("${stem}"):not(:has-text("Yazılı Provaları")):not(:has-text("Yazılı"))`).first(),
        page.locator(`a:has-text("${stem}")`).first(),
      ];
      for (const loc of stemLocators) {
        try {
          if (await loc.isVisible({ timeout: 1000 }).catch(() => false)) {
            logger.info(`GraphNavigator [Kök Eşleşme ✓]: "${target}" için "${stem}" eşleşti.`);
            return loc;
          }
        } catch {}
      }
    }

    // 4. Akıllı Arama Çubuğu Fallback (Hedef ekranda doğrudan görünmüyorsa search-input ile ara)
    try {
      const searchInput = page.locator('input.search-input, input[placeholder*="Ders, ünite"]').first();
      if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.info(`GraphNavigator [Arama Fallback]: "${target}" aranıyor...`);
        await searchInput.click();
        await searchInput.fill(target);
        await page.waitForTimeout(1200);

        const searchMatch = page.locator(`a.item:has-text("${target}"), div.info:has-text("${target}"), a.item`).first();
        if (await searchMatch.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info(`GraphNavigator [Arama Fallback ✓]: "${target}" arama sonucu bulundu.`);
          return searchMatch;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Kurtarma Modu (Emergency Recovery): Sayfayı son bilinen güvenli düğüme (#/dashboard) sıfırlar
   */
  private async recoverToSafeNode(page: Page): Promise<void> {
    try {
      await PopupDismisser.once(page).catch(() => {});

      // 1. Üst veya sol menüdeki "Ana Sayfa" butonunu dene
      const homeLink = page.locator('a.link:has-text("Ana Sayfa"), nav a:has-text("Ana Sayfa")').first();
      if (await homeLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await homeLink.click();
        await page.waitForTimeout(1000);
      } else {
        // 2. SPA Hash sıfırlaması
        await SmartRouter.goHome(page);
      }

      await PopupDismisser.once(page).catch(() => {});
    } catch (err: any) {
      logger.warn(`GraphNavigator: Kurtarma sırasında hata: ${err.message}`);
    }
  }

  /**
   * Safe Node sıfırlaması sonrasında, hedeflenen adıma kadar olan ara adımları tekrar yürütür
   */
  private async replayStepsUpTo(page: Page, pathSequence: PathStep[], targetIndex: number, timeoutMs: number): Promise<boolean> {
    if (targetIndex <= 0) return true;

    logger.info(`GraphNavigator [Replay]: 1. adımdan ${targetIndex}. adıma kadar ara adımlar yeniden yürütülüyor...`);
    for (let i = 0; i < targetIndex; i++) {
      try {
        const step = pathSequence[i];
        await this.executeStep(page, step, timeoutMs);
        await page.waitForTimeout(500);
      } catch (replayErr: any) {
        logger.warn(`GraphNavigator [Replay]: ${i + 1}. adım tekrarlanırken hata: ${replayErr.message}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Sayfadan bir önceki seviyeye veya Dersler paneline güvenli geri dönüş yürütür (Geri Yolu)
   */
  public async navigateBack(page: Page, targetLevel: 'PREVIOUS' | 'LESSONS' | 'HOME' = 'PREVIOUS'): Promise<boolean> {
    try {
      const currentUrl = page.url();
      logger.info(`GraphNavigator [navigateBack]: Geri dönüş başlatılıyor (Mevcut URL: ${currentUrl})...`);

      if (targetLevel === 'HOME') {
        await SmartRouter.goHome(page);
        return true;
      }

      if (targetLevel === 'LESSONS' || currentUrl.includes('concept-v3-main')) {
        return await SmartRouter.navigateToMenu(page, 'Dersler');
      }

      if (currentUrl.includes('concept-v3-material-page')) {
        const goBackBtn = page.locator('.go-back-button, a.go-back-button, button.go-back-button, [class*="go-back"]').first();
        if (await goBackBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          logger.info('GraphNavigator [navigateBack]: .go-back-button tıklandı.');
          try {
            await goBackBtn.click({ timeout: 2500 });
          } catch {
            await goBackBtn.dispatchEvent('click');
          }
          await page.waitForTimeout(1500);
          return true;
        }
      }

      // Genel fallback
      return await SmartRouter.navigateToMenu(page, 'Dersler');
    } catch (err: any) {
      logger.warn(`GraphNavigator [navigateBack]: Geri dönüş hatası: ${err.message}`);
      return false;
    }
  }
}
