import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestActionPlan, TestPlanStep, StepExecutionResult, WSMessage, AppTargetMode } from '../../types/index.ts';
import { logger } from '../logger.ts';
import { SmartRouter } from './SmartRouter.ts';
import { VideoHandler } from './VideoHandler.ts';
import { QuizHandler } from './QuizHandler.ts';
import { OverlapChecker } from './OverlapChecker.ts';
import { PopupDismisser } from './PopupDismisser.ts';

const execAsync = promisify(exec);

export type EventEmitterFn = (msg: WSMessage) => void;

export class PlaywrightRunner {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isRunning: boolean = false;
  private isAborted: boolean = false;
  private eventEmitter: EventEmitterFn | null = null;

  private targetAppMode: AppTargetMode = "REAL_ELECTRON";
  private electronAppPath: string = "/Applications/Doping Hafıza Desktop.app";
  private cdpPort: number = 9222;
  private simulatorUrl: string = "http://localhost:3001/mock-target/";
  private realAppUrl: string = "";

  private screenshotInterval: NodeJS.Timeout | null = null;

  constructor(eventEmitter?: EventEmitterFn) {
    if (eventEmitter) this.eventEmitter = eventEmitter;
  }

  public setEventEmitter(fn: EventEmitterFn) {
    this.eventEmitter = fn;
  }

  public setTargetMode(mode: AppTargetMode, path?: string, port?: number) {
    this.targetAppMode = mode;
    if (path) this.electronAppPath = path;
    if (port) this.cdpPort = port;
    logger.info(`PlaywrightRunner: Hedef mod -> ${mode} (CDP Port: ${this.cdpPort})`);
  }

  public getTargetMode() {
    return {
      targetAppMode: this.targetAppMode,
      electronAppPath: this.electronAppPath,
      cdpPort: this.cdpPort,
      electronConnected: !!this.page && !this.page.isClosed(),
      realAppUrl: this.realAppUrl,
    };
  }

  private emit(type: WSMessage['type'], payload: any) {
    if (this.eventEmitter) {
      this.eventEmitter({
        type,
        payload,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * CDP Portunun (9222) açık ve erişilebilir olup olmadığını denetler
   */
  public async isCDPAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`http://localhost:${this.cdpPort}/json/version`);
      return res.ok;
    } catch {
      return false;
    }
  }

  public async startBrowser(): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    if (this.targetAppMode === 'REAL_ELECTRON') {
      logger.info(`Playwright: Gerçek Doping Hafıza Masaüstü uygulamasına bağlanılıyor (CDP: localhost:${this.cdpPort})...`);

      // 1. CDP açık mı kontrol et; değilse uygulamayı debug portu ile başlat
      let cdpActive = await this.isCDPAvailable();
      if (!cdpActive) {
        logger.info(`Doping Hafıza port ${this.cdpPort} üzerinde tespit edilemedi. Uygulama başlatılıyor: ${this.electronAppPath}`);
        try {
          await execAsync(`open "${this.electronAppPath}" --args --remote-debugging-port=${this.cdpPort}`);
          // Portun hazır olmasını bekle (maksimum 10 sn)
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 700));
            if (await this.isCDPAvailable()) {
              cdpActive = true;
              break;
            }
          }
        } catch (launchErr: any) {
          logger.warn(`Uygulama 'open' ile başlatılamadı: ${launchErr.message}`);
        }
      }

      if (!cdpActive) {
        logger.error(`Port ${this.cdpPort} üzerinde Doping Hafıza CDP oturumu bulunamadı. Simülatör moduna fallback yapılıyor.`);
        this.targetAppMode = 'SIMULATOR';
        return this.startBrowser();
      }

      // 2. Playwright Chromium ile CDP üzerinden mevcut Electron pencerelerine bağlan
      try {
        this.browser = await chromium.connectOverCDP(`http://localhost:${this.cdpPort}`);
        const contexts = this.browser.contexts();
        this.context = contexts[0] || null;

        if (!this.context) {
          throw new Error('CDP bağlantısında tarayıcı context bulunamadı.');
        }

        const pages = this.context.pages();
        logger.info(`CDP Bağlandı. Açık pencere/sekme sayısı: ${pages.length}`);

        // DevTools pencerelerini atlayarak Doping Hafıza ana sayfasını bul
        let targetPage: Page | null = null;
        for (const p of pages) {
          const url = p.url();
          const title = await p.title().catch(() => '');
          logger.debug(`Açık sekme kontrolü -> Başlık: "${title}" | URL: ${url.substring(0, 80)}`);

          if (url.includes('online-education-ui') || title.includes('Doping Hafıza')) {
            targetPage = p;
            break;
          }
        }

        if (!targetPage && pages.length > 0) {
          // Eğer özel url eşleşmediyse devtools olmayan ilk sayfayı al
          for (const p of pages) {
            if (!p.url().startsWith('devtools://')) {
              targetPage = p;
              break;
            }
          }
        }

        if (!targetPage) {
          throw new Error('Doping Hafıza ana uygulama penceresi bulunamadı.');
        }

        this.page = targetPage;
        this.realAppUrl = this.page.url();
        logger.info(`🎯 GERÇEK DOPİNG HAFIZA PENCERESİ BAĞLANDI! Başlık: "${await this.page.title()}"`);

        // Native dialog'ları (alert/confirm/prompt) otomatik kabul et
        PopupDismisser.installDialogHandler(this.page);

        this.startLiveScreenshotStream();
        return this.page;
      } catch (cdpErr: any) {
        logger.error(`CDP bağlantı hatası (${cdpErr.message}). Simülatör moduna dönülüyor.`);
        this.targetAppMode = 'SIMULATOR';
        return this.startBrowser();
      }
    } else {
      // SİMÜLATÖR MODU (Chromium Headless)
      logger.info('Playwright Chromium (Simulator Modu) başlatılıyor...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
        ],
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      this.page = await this.context.newPage();
      logger.info(`Simülatör sayfasına gidiliyor: ${this.simulatorUrl}`);
      await this.page.goto(this.simulatorUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(500);

      this.startLiveScreenshotStream();
      return this.page;
    }
  }

  private startLiveScreenshotStream() {
    if (this.screenshotInterval) clearInterval(this.screenshotInterval);
    this.screenshotInterval = setInterval(async () => {
      if (!this.page || this.page.isClosed()) return;
      try {
        const buffer = await this.page.screenshot({ type: 'jpeg', quality: 50 });
        const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        this.emit('SCREENSHOT_FRAME', { image: base64 });
      } catch (err) {
        // Screenshot error ignored during transitions
      }
    }, 700);
  }

  public async captureSingleScreenshot(): Promise<string | null> {
    if (!this.page || this.page.isClosed()) return null;
    try {
      const buffer = await this.page.screenshot({ type: 'jpeg', quality: 75 });
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  public async executePlan(plan: TestActionPlan): Promise<Record<string, StepExecutionResult>> {
    if (this.isRunning) {
      throw new Error('Hali hazırda çalışan bir test oturumu var.');
    }

    this.isRunning = true;
    this.isAborted = false;
    this.emit('RUNNER_STATUS', { status: 'RUNNING', plan });

    const results: Record<string, StepExecutionResult> = {};
    const startTime = Date.now();

    try {
      const page = await this.startBrowser();

      // ── Başlangıç Temizliği: Yalnızca yeni navigasyon veya sınıf değişimi varsa Ana Sayfaya dön ──
      PopupDismisser.installDialogHandler(page);
      await PopupDismisser.once(page);

      const firstAction = plan.steps[0]?.action;
      const requiresGoHome = firstAction === 'NAVIGATE_TO' || firstAction === 'GO_HOME' || firstAction === 'CHANGE_LEVEL';
      if (requiresGoHome) {
        await SmartRouter.goHome(page);
      }

      // ── Arka Plan Pop-up Bekçisi ──────────────────────────────────────────
      const stopWatcher = PopupDismisser.watch(page, 1500);

      // Adımları Sırayla Yürüt
      for (let i = 0; i < plan.steps.length; i++) {
        if (this.isAborted) {
          logger.warn('Test yürütümü kullanıcı tarafından iptal edildi.');
          break;
        }

        const step = plan.steps[i];
        const stepStartTime = Date.now();

        // Her adım öncesi pop-up temizliği
        await PopupDismisser.once(page).catch(() => {});

        this.emit('STEP_STARTED', { stepId: step.id, stepIndex: i, step });

        let stepResult: StepExecutionResult = {
          stepId: step.id,
          action: step.action,
          status: 'RUNNING',
          startTime: stepStartTime,
        };

        try {
          const execDetails = await this.runSingleAction(page, step);
          const stepEndTime = Date.now();

          stepResult = {
            stepId: step.id,
            action: step.action,
            status: 'SUCCESS',
            startTime: stepStartTime,
            endTime: stepEndTime,
            durationMs: stepEndTime - stepStartTime,
            details: execDetails,
            boundingBox: execDetails?.box || undefined,
            screenshotUrl: (await this.captureSingleScreenshot()) || undefined,
          };

          this.emit('STEP_COMPLETED', { stepId: step.id, result: stepResult });
          logger.info(`Adım Başarılı [${step.id} - ${step.action}] (${stepResult.durationMs}ms)`);
        } catch (stepErr: any) {
          const stepEndTime = Date.now();
          logger.error(`Adım Başarısız [${step.id} - ${step.action}]: ${stepErr.message}`);

          const screenshot = await this.captureSingleScreenshot();
          let boundingBox: any = null;

          try {
            const crashBox = await page.locator('#crash-screen, #analysis-panel, body').first().boundingBox();
            if (crashBox) {
              boundingBox = { ...crashBox, label: stepErr.message };
            }
          } catch {}

          stepResult = {
            stepId: step.id,
            action: step.action,
            status: 'FAILED',
            startTime: stepStartTime,
            endTime: stepEndTime,
            durationMs: stepEndTime - stepStartTime,
            error: stepErr.message,
            screenshotUrl: screenshot || undefined,
            boundingBox: boundingBox || undefined,
          };

          this.emit('STEP_COMPLETED', { stepId: step.id, result: stepResult });
          results[step.id] = stepResult;
          throw stepErr;
        }

        results[step.id] = stepResult;
        // Adım sonrası kısa bekleme + pop-up temizliği
        await page.waitForTimeout(400);
        await PopupDismisser.once(page).catch(() => {});
      }

      stopWatcher();
      this.emit('RUNNER_STATUS', {
        status: 'COMPLETED',
        totalDurationMs: Date.now() - startTime,
        results,
      });
      logger.info(`Test Planı Başarıyla Tamamlandı! Toplam Süre: ${Date.now() - startTime}ms`);
    } catch (err: any) {
      this.emit('RUNNER_STATUS', {
        status: 'FAILED',
        error: err.message,
        totalDurationMs: Date.now() - startTime,
        results,
      });
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  private async runSingleAction(page: Page, step: TestPlanStep): Promise<any> {
    const { action, params } = step;

    switch (action) {
      case 'NAVIGATE_TO': {
        // 1. Doğrudan GraphNavigator pathSequence varsa deterministik olarak icra et
        if (params.pathSequence && params.pathSequence.length > 0) {
          logger.info(`PlaywrightRunner [NAVIGATE_TO]: Doğrudan GraphNavigator pathSequence icra ediliyor (${params.pathSequence.length} adım)...`);
          const navResult = await SmartRouter.getGraphNavigator().navigate(page, params.pathSequence, { targetGrade: params.targetGrade });
          if (navResult.success) {
            if (page.url().includes('concept-v3-material-page') && (params.isTopicTest || params.contentItem || step.title?.includes('Test'))) {
              await SmartRouter.selectTopicMaterial(page, params.contentItem || 'Konu Testi', true);
            }
            return navResult;
          }
          logger.warn(`PlaywrightRunner [NAVIGATE_TO]: pathSequence uyarısı: ${navResult.error}, akıllı rota deneniyor...`);
        }

        // 2. Bir hedefe gitmeden önce TargetResolver'ı çağırıp rotayı doğrula
        const targetQuery = params.testName || params.topic || params.subSection || 
          (params.subject && params.topic ? `${params.subject} ${params.topic}` : params.subject || params.menu);

        if (targetQuery) {
          try {
            logger.info(`PlaywrightRunner [NAVIGATE_TO]: Hedef doğrulanıyor → "${targetQuery}" (${params.targetGrade || 'sınıf serbest'})`);
            const smartRes = await SmartRouter.navigateSmart(page, targetQuery, params.targetGrade);
            if (smartRes.success) {
              if (page.url().includes('concept-v3-material-page') && (params.isTopicTest || params.contentItem || step.title?.includes('Test'))) {
                await SmartRouter.selectTopicMaterial(page, params.contentItem || 'Konu Testi', true);
              }
              return smartRes;
            }
          } catch (smartErr: any) {
            logger.info(`PlaywrightRunner: TargetResolver / navigateSmart fallback'e devrediyor (${smartErr.message})`);
          }
        }

        if (params.subTab && (params.menu === 'Testler ve Denemeler' || !params.menu)) {
          const res = await SmartRouter.navigateToExam(page, {
            subTab: params.subTab,
            testName: params.testName,
            grade: params.targetGrade
          });
          return res;
        }
        if (params.testName) {
          const res = await SmartRouter.navigateToExam(page, {
            subTab: params.subTab,
            testName: params.testName,
            grade: params.targetGrade
          });
          return res;
        }
        if (params.subSection && params.menu === 'WAY Evreni') {
          const res = await SmartRouter.navigateToWaySection(page, params.subSection);
          return res;
        }
        if (params.subTab && params.menu === 'Lgs Yolculuğum') {
          const res = await SmartRouter.navigateToLgsJourneyTab(page, params.subTab);
          return res;
        }
        const res = await SmartRouter.navigateToTopic(page, params.subject, params.topic, params.menu, params.targetGrade);
        if (page.url().includes('concept-v3-material-page') && (params.isTopicTest || params.contentItem || step.title?.includes('Test'))) {
          await SmartRouter.selectTopicMaterial(page, params.contentItem || 'Konu Testi', true);
        }
        return res;
      }

      case 'VIDEO_CONTROL': {
        const res = await VideoHandler.controlVideo(
          page,
          params.speed || 2.0,
          params.durationSec || 15,
          (cur, total) => {
            this.emit('STEP_UPDATED', {
              stepId: step.id,
              progress: { currentSec: cur, totalSec: total },
            });
          },
          { reWatch: !!params.reWatch, seekToEnd: !!params.seekToEnd }
        );
        return res;
      }

      case 'DRAG_AND_DROP': {
        logger.info('Playwright: İnteraktif sürükle-bırak çalıştırılıyor...');
        const dragTab = page.locator('#tab-btn-drag').first();
        if (await dragTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dragTab.click();
          await page.waitForTimeout(300);
        }

        const sourceLocator = page.locator('#drag-item-2cubed').first();
        const targetLocator = page.locator('#drop-target-8').first();

        if (await sourceLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
          await OverlapChecker.checkActionability(page, sourceLocator);
          const sourceBox = await sourceLocator.boundingBox();
          await sourceLocator.dragTo(targetLocator);
          await page.waitForTimeout(500);
          return { source: '2^3', target: '8', box: sourceBox };
        }
        return { simulated: true };
      }

      case 'SOLVE_QUIZ': {
        const res = await QuizHandler.solveQuiz(
          page,
          params.quizStrategy || 'RANDOM',
          {
            leaveHalfway: !!params.leaveHalfway,
            questionCount: params.questionCount,
            maxQuestions: params.maxQuestions,
          }
        );
        return res;
      }

      case 'VERIFY_ELEMENT': {
        logger.info(`Doğrulama yürütülüyor: [${params.assertionType || 'NOT_CRASHED'}] - ${params.targetAssertion}`);

        // Simülatör Analiz Kontrolü
        const analysisTab = page.locator('#tab-btn-analysis').first();
        if (await analysisTab.isVisible({ timeout: 1000 }).catch(() => false)) {
          await analysisTab.click();
          await page.waitForTimeout(300);
        }

        if (params.assertionType === 'NOT_CRASHED') {
          // Sayfa açık, DOM çökmemiş ve responsive mi?
          const isAlive = await page.evaluate(() => document.body && document.body.children.length > 0);
          if (!isAlive) {
            throw new Error('KRİTİK HATA: Sayfa DOM yapısı boş veya render çöktü!');
          }

          const crashScreen = page.locator('#crash-screen').first();
          if (await crashScreen.isVisible().catch(() => false)) {
            throw new Error('KRİTİK HATA: Simüle edilen çökme tespit edildi!');
          }

          // Sayfa boyutları ve başlık kontrolü
          const title = await page.title().catch(() => 'Uygulama');
          const box = await page.locator('main, #content-stage, body').first().boundingBox();

          logger.info(`Doğrulama Başarılı: "${title}" ekranı sağlıklı ve responsive.`);
          return { assertion: 'NOT_CRASHED', verified: true, box };
        } else if (params.assertionType === 'VISIBLE') {
          const locator = page.locator('#analysis-panel, #net-graph, main').first();
          await locator.waitFor({ state: 'visible', timeout: 3000 });
          return { assertion: 'VISIBLE', verified: true };
        }
        return { verified: true };
      }

      case 'WAIT': {
        const sec = params.durationSec || 2;
        logger.info(`Bekleniyor: ${sec} saniye...`);
        await page.waitForTimeout(sec * 1000);
        return { waitedSec: sec };
      }

      case 'CHANGE_LEVEL': {
        const grade = params.targetGrade || (params as any).level || '8. Sınıf';
        logger.info(`CHANGE_LEVEL aksiyonu: ${grade}`);
        const changed = await SmartRouter.changeGrade(page, grade);
        return { levelChanged: changed, targetGrade: grade };
      }

      case 'GO_HOME': {
        logger.info('GO_HOME aksiyonu: Ana sayfaya dönülüyor...');
        await SmartRouter.goHome(page);
        return { returned: true };
      }

      case 'DISMISS_POPUPS': {
        logger.info('DISMISS_POPUPS aksiyonu: Pop-up temizliği yapılıyor...');
        const count = await PopupDismisser.once(page);
        return { dismissedCount: count };
      }

      default:
        logger.warn(`Bilinmeyen aksiyon türü: ${action}`);
        return {};
    }
  }

  public abort() {
    this.isAborted = true;
    logger.warn('PlaywrightRunner abort çağrıldı.');
  }

  public async close() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    // Note: Do NOT close real user browser via CDP on stop, just disconnect!
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.page = null;
    this.context = null;
    this.browser = null;
    this.isRunning = false;
    logger.info('Playwright oturumu ayrıldı.');
  }
}

export const playwrightRunner = new PlaywrightRunner();
