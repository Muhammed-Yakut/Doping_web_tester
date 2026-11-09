import { Page } from 'playwright';
import { QuizStrategy } from '../../types/index.ts';
import { logger } from '../logger.ts';
import { QuizDetector } from '../../automation/QuizDetector.ts';
import { SmartRouter } from './SmartRouter.ts';

export interface QuizOptions {
  leaveHalfway?: boolean;
  questionCount?: number | 'ALL';
  maxQuestions?: number;
}

export class QuizHandler {
  /**
   * Soru / Test / Deneme Çözücü:
   * Hem video içi mini quizleri hem de tam deneme sınavlarını (examinations-v2 & examinations-exam-page-v2)
   * ve ders içi konu testlerini (#/concept-v3-material-page & #/concept-v3-test-page)
   * otomatik başlatır, seçenekleri stratejiye göre işaretler ve testi tamamlar veya yarıda bırakır.
   */
  public static async solveQuiz(
    page: Page,
    strategy: QuizStrategy = "RANDOM",
    options?: QuizOptions
  ): Promise<{ questionsAnswered: number; strategyUsed: QuizStrategy }> {
    logger.info(`QuizHandler: Test/Deneme çözümü başlatılıyor -> Strateji: ${strategy}, Soru Sayısı: ${options?.questionCount || 1}, Yarıda Bırak: ${!!options?.leaveHalfway}`);

    // 0. Simülatör Modu Kontrolü
    const simRadio = page.locator('#quiz-options input[type="radio"]').first();
    if (await simRadio.isVisible({ timeout: 500 }).catch(() => false)) {
      return QuizHandler.solveSimulatorQuiz(page, strategy);
    }

    // 1. QuizDetector ile DOM üzerinde test ve ekran tipi tespiti
    const quizType = await QuizDetector.detect(page);
    logger.info(`QuizHandler: QuizDetector tipi tespit etti: ${quizType}`);

    const currentUrl = page.url();

    // ── DURUM A: Deneme veya Büyük Sınav (MOCK_EXAM) ──
    const isExamContext = quizType === 'MOCK_EXAM' ||
                          currentUrl.includes('examinations') || 
                          await page.locator('.examinations-cover-wrapper, li.exam-toggle-list-item').first().isVisible({ timeout: 800 }).catch(() => false);

    if (isExamContext) {
      return QuizHandler.solveExamination(page, strategy, options);
    }

    // ── DURUM B: Ders İçi Video Soru Ekranı / Konu Testi (#/concept-v3-material-page & #/concept-v3-test-page) ──
    return QuizHandler.solveLessonQuiz(page, strategy, options);
  }

  /**
   * Tam Deneme Sınavı & Tarama Testi Çözücü (#/examinations-exam-page-v2)
   */
  private static async solveExamination(
    page: Page,
    strategy: QuizStrategy,
    options?: QuizOptions
  ): Promise<{ questionsAnswered: number; strategyUsed: QuizStrategy }> {
    const isLeaveHalfway = !!options?.leaveHalfway;
    logger.info(`QuizHandler [Deneme/Tarama]: Sınav ekranı çözücüsü devrede... Yarıda Bırak: ${isLeaveHalfway}`);

    // 1. Eğer sınav kapağı (.examinations-cover-wrapper) açıksa "Testi Başlat" / "Sınavı Başlat" tıkla
    const startCoverBtn = page.locator('a.start-button, .start-button, button:has-text("Testi Başlat"), a:has-text("Testi Başlat"), button:has-text("Sınavı Başlat")').first();
    if (await startCoverBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      logger.info('QuizHandler [Deneme]: Sınav kapağındaki "Testi Başlat" butonuna tıklanıyor...');
      await startCoverBtn.dispatchEvent('click');
      await page.waitForTimeout(2500);
    }

    // 2. Eğer hala sınav listesindeysek (#/examinations-v2), başlatılmamış testi veya seçili testi tıkla
    if (!page.url().includes('examinations-exam-page') && !page.url().includes('examinations-result')) {
      // Önce çözülebilir (Testi Çöz / Sınava Başla / Teste Devam Et) butonunu ara
      let activeTestBtn = page.locator(
        'li.exam-toggle-list-item a.action-button:has-text("Testi Çöz"), ' +
        'li.exam-toggle-list-item a.action-button:has-text("Sınava Başla"), ' +
        'li.exam-toggle-list-item a.action-button:has-text("Teste Devam Et"), ' +
        'a.action-button:has-text("Testi Çöz"), ' +
        'a.action-button:has-text("Sınava Başla")'
      ).first();

      if (!await activeTestBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        activeTestBtn = page.locator('li.exam-toggle-list-item a.action-button, a.action-button').first();
      }

      if (await activeTestBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        const btnText = (await activeTestBtn.innerText().catch(() => '')).trim();
        logger.info(`QuizHandler [Deneme]: Sınav butonu tıklandı: "${btnText}"`);
        await activeTestBtn.dispatchEvent('click');
        await page.waitForTimeout(1500);

        // Kapağın açılmasını bekle ve başlat
        if (await startCoverBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          await startCoverBtn.dispatchEvent('click');
          await page.waitForTimeout(2500);
        }
      }
    }

    // 3. Eğer sonuç ekranındaysak (sınav daha önce tamamlanmış), "Testi Baştan Çöz" veya "Testi İncele" diyerek soru ekranına gir
    if (page.url().includes('examinations-result')) {
      logger.info('QuizHandler [Deneme]: Test sonuç ekranında (#/examinations-result-v2), baştan çöz veya incele ile sorulara geçiliyor...');

      // A) Öncelik: "Testi Baştan Çöz" butonunu tıkla ve onay modalını geç
      const againBtn = page.locator('a.again-test-btn, button:has-text("Testi Baştan Çöz"), a:has-text("Testi Baştan Çöz"), [class*="again"]').first();
      if (await againBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        logger.info('QuizHandler [Deneme]: "Testi Baştan Çöz" butonu bulundu ve tıklandı.');
        await againBtn.click({ force: true });
        await page.waitForTimeout(1000);

        // Açılan onay modalındaki "Sınava Başla" veya "Evet" butonuna tıkla
        const confirmBtn = page.locator(
          'a.start-button, button.start-button, ' +
          'a:has-text("Sınava Başla"), button:has-text("Sınava Başla"), ' +
          '.modal button:has-text("Sınava Başla"), .modal a:has-text("Sınava Başla"), ' +
          '.modal button:has-text("Evet"), button.swal2-confirm'
        ).first();
        if (await confirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          logger.info('QuizHandler [Deneme]: Baştan çöz onay modalında "Sınava Başla" tıklandı.');
          await confirmBtn.click({ force: true });
          await page.waitForTimeout(2000);
          await page.waitForURL((url) => url.href.includes('examinations-exam-page'), { timeout: 4000 }).catch(() => {});
        }
      }

      // B) Eğer hala soru ekranına geçmediyse "Testi İncele" butonuna basarak gir
      if (!page.url().includes('examinations-exam-page')) {
        const reviewBtn = page.locator('a.review-test-btn, button:has-text("Testi İncele"), a:has-text("Testi İncele")').first();
        if (await reviewBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          logger.info('QuizHandler [Deneme]: "Testi İncele" butonu tıklandı.');
          await reviewBtn.click({ force: true });
          await page.waitForTimeout(2000);
          await page.waitForURL((url) => url.href.includes('examinations-exam-page'), { timeout: 4000 }).catch(() => {});
        }
      }
    }

    // 4. Eğer hala sınav listesindeysek ve sınav tamamlanmış görünüyorsa "Sonucu İncele" ile geç
    if (!page.url().includes('examinations-exam-page')) {
      const reviewLink = page.locator('a.action-button:has-text("Sonucu İncele"), a:has-text("Sonucu İncele")').first();
      if (await reviewLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.info('QuizHandler [Deneme]: Tamamlanmış sınav bağlantısı tıklandı ("Sonucu İncele")...');
        await reviewLink.click({ force: true });
        await page.waitForTimeout(2500);

        // Sonuç ekranına ulaşıldıktan sonra baştan çöz veya incele
        const againBtn = page.locator('a.again-test-btn, button:has-text("Testi Baştan Çöz"), a:has-text("Testi Baştan Çöz")').first();
        if (await againBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await againBtn.click({ force: true });
          await page.waitForTimeout(1000);
          const confirmBtn = page.locator(
            'a.start-button, button.start-button, ' +
            'a:has-text("Sınava Başla"), button:has-text("Sınava Başla"), ' +
            '.modal button:has-text("Sınava Başla"), .modal button:has-text("Evet")'
          ).first();
          if (await confirmBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
            await confirmBtn.click({ force: true });
            await page.waitForTimeout(2000);
            await page.waitForURL((url) => url.href.includes('examinations-exam-page'), { timeout: 4000 }).catch(() => {});
          }
        }

        if (!page.url().includes('examinations-exam-page')) {
          const reviewBtn = page.locator('a.review-test-btn, button:has-text("Testi İncele"), a:has-text("Testi İncele")').first();
          if (await reviewBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            await reviewBtn.click({ force: true });
            await page.waitForTimeout(2000);
            await page.waitForURL((url) => url.href.includes('examinations-exam-page'), { timeout: 4000 }).catch(() => {});
          }
        }
      }
    }

    // 5. Sınav Soru Çözüm Ekranı (#/examinations-exam-page-v2) Doğrulaması
    let onExamPage = page.url().includes('examinations-exam-page') || 
                     await page.locator('.option-wrapper, a.exit-button, a.next').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (!onExamPage) {
      // Bir kez daha kontrol et: sayfadaki start-button'ı veya incele butonunu tıkla
      const lastTryStart = page.locator('a.start-button, button.start-button, a:has-text("Sınava Başla"), a.review-test-btn').first();
      if (await lastTryStart.isVisible({ timeout: 1500 }).catch(() => false)) {
        logger.info('QuizHandler [Deneme]: Son kontrol ile sınav başlatma butonu tıklandı...');
        await lastTryStart.click({ force: true });
        await page.waitForTimeout(2500);
        onExamPage = page.url().includes('examinations-exam-page') || 
                     await page.locator('.option-wrapper, a.exit-button, a.next').first().isVisible({ timeout: 3000 }).catch(() => false);
      }
    }

    if (!onExamPage) {
      logger.warn('QuizHandler [Deneme]: Soru çözüm ekranı yüklenemedi!');
      throw new Error('Sınav soru ekranına giriş yapılamadı veya çözülecek aktif bir deneme bulunamadı.');
    }

    logger.info('QuizHandler [Deneme]: Sınav soruları çözülüyor...');
    let questionsAnswered = 0;
    const maxQuestions = 5; // Belirtilen soru sayısı kadar çözüp bitir

    for (let q = 0; q < maxQuestions; q++) {
      // Aktif sorunun seçeneklerini bul (.option-wrapper .option-item veya .radio)
      const currentQuestionOptions = page.locator('.option-wrapper .option-item, .option-wrapper .radio, .option-item');
      const optCount = await currentQuestionOptions.count().catch(() => 0);

      if (optCount > 0 && strategy !== 'LEAVE_EMPTY') {
        const pickIdx = strategy === 'ALL_WRONG' ? Math.min(1, optCount - 1) : 
                        strategy === 'ALL_CORRECT' ? 0 : 
                        Math.floor(Math.random() * Math.min(optCount, 4));

        try {
          await currentQuestionOptions.nth(pickIdx).dispatchEvent('click');
          questionsAnswered++;
          logger.info(`QuizHandler [Deneme - Soru ${q + 1}]: Seçenek #${pickIdx + 1} işaretlendi.`);
        } catch (e: any) {
          logger.warn(`QuizHandler: Seçenek işaretleme hatası: ${e.message}`);
        }
        await page.waitForTimeout(600);
      }

      // Son soru değilse "Sonraki Soru" butonuna tıkla
      if (q < maxQuestions - 1) {
        const nextBtn = page.locator('a.next:has-text("Sonraki Soru"), a.next, button:has-text("Sonraki")').first();
        if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          const isNextDisabled = await nextBtn.evaluate((el: HTMLElement) => el.classList.contains('disabled')).catch(() => false);
          if (isNextDisabled) {
            logger.info('QuizHandler [Deneme]: Son soruya ulaşıldı.');
            break;
          }
          await nextBtn.dispatchEvent('click');
          await page.waitForTimeout(800);
        } else {
          break;
        }
      }
    }

    // 4. Testi Bitir Butonuna Tıkla ve QuizDetector ile "Sınavı sonlandırmak istediğinize emin misiniz?" modalını onayla
    logger.info(`QuizHandler [Deneme]: ${questionsAnswered} soru işaretlendi. MOCK_EXAM bitirme ve onay modalı yönetiliyor...`);
    const modalHandled = await QuizDetector.handleMockExamFinishModal(page);

    if (!modalHandled) {
      const finishBtn = page.locator('a.exit-button:has-text("Testi Bitir"), a.exit-button:has-text("Sınavı Bitir"), button:has-text("Testi Bitir"), a.exit-button').first();
      if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await finishBtn.dispatchEvent('click');
        await page.waitForTimeout(1000);

        // Onay dialogu: Mutlaka "Testi Bitir" / "Sınavı Bitir" / "Evet" butonunu seç
        const confirmDialogBtn = page.locator(
          '.modal button:has-text("Testi Bitir"), .modal a:has-text("Testi Bitir"), ' +
          '.popup-frame a:has-text("Testi Bitir"), .popup-frame button:has-text("Testi Bitir"), ' +
          'button:has-text("Testi Bitir"), a:has-text("Testi Bitir"), ' +
          'button:has-text("Sınavı Bitir"), a:has-text("Sınavı Bitir"), ' +
          '.modal button:has-text("Evet"), button:has-text("Evet"), button.swal2-confirm'
        ).last();

        if (await confirmDialogBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
          await confirmDialogBtn.dispatchEvent('click');
          await page.waitForTimeout(2000);
          logger.info('QuizHandler [Deneme]: Sınav bitirme dialogunda "Testi Bitir" onaylandı.');
        }
      }
    }

    if (questionsAnswered === 0 && strategy !== 'LEAVE_EMPTY') {
      logger.warn('QuizHandler [Deneme]: Hiç soru işaretlenemedi!');
      throw new Error('Sınavda soru işaretlenemedi veya seçenekler bulunamadı.');
    }

    logger.info(`QuizHandler [Deneme]: Başarıyla tamamlandı! Toplam çözülen: ${questionsAnswered}`);
    return {
      questionsAnswered,
      strategyUsed: strategy
    };
  }

  /**
   * Ders İçi Video Soru / Konu / Pekiştirme Testi Çözücü (#/concept-v3-material-page & #/concept-v3-test-page)
   * Kullanıcı kuralı:
   *  - Sadece "çöz" deniyorsa 1 soru çözüp testi bitirir.
   *  - Soru sayısı belirtildiyse (örn: 3 soru çöz) o sayıda çözer.
   *  - "Tüm soruları çöz" / "Bütün soruları çöz" dendiğinde sonuna kadar tüm soruları çözer.
   *  - "Yarıda bırak" dendiğinde "Testi Yarıda Bırak" seçeneğiyle çıkar.
   */
  private static async solveLessonQuiz(
    page: Page,
    strategy: QuizStrategy,
    options?: QuizOptions
  ): Promise<{ questionsAnswered: number; strategyUsed: QuizStrategy }> {
    const isLeaveHalfway = !!options?.leaveHalfway;
    logger.info(`QuizHandler [Ders İçi Test]: Ders içi test çözücüsü devrede... Strateji: ${strategy}, Soru Sayısı: ${options?.questionCount || 1}, Yarıda Bırak: ${isLeaveHalfway}`);

    // 0. Soru / Test ekranında olup olmadığımızı kontrol et (#/concept-v3-test-page)
    let isAlreadyInQuiz = page.url().includes('concept-v3-test-page');

    if (!isAlreadyInQuiz) {
      // 1. Eğer material-page üzerindeysek ve teste henüz girilmediyse:
      const directStartBtn = page.locator(
        'a.btn.review-btn, button.review-btn, a:has-text("Teste Başla"), button:has-text("Teste Başla"), ' +
        'a.btn.solve-again-btn, button.solve-again-btn, a:has-text("Tekrar Çöz"), button:has-text("Tekrar Çöz"), ' +
        'a:has-text("Testi Baştan Çöz"), button:has-text("Testi Baştan Çöz"), ' +
        'a.btn.watch-again-btn, button.watch-again-btn, a:has-text("Teste Devam Et"), button:has-text("Teste Devam Et"), ' +
        'a:has-text("Kaldığın Yerden Devam Et"), button:has-text("Kaldığın Yerden Devam Et"), ' +
        'a.answer-btn:has-text("Soruları Çöz"), a:has-text("Soruları Çöz"), ' +
        'a:has-text("Video Sorularını Çöz"), button:has-text("Video Sorularını Çöz")'
      ).first();

      if (await directStartBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        const btnTxt = (await directStartBtn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        logger.info(`QuizHandler [Ders Testi]: Ekranda doğrudan görünen "${btnTxt}" butonuna tıklanarak test başlatılıyor...`);
        try {
          await directStartBtn.click({ timeout: 2000 });
        } catch {
          await directStartBtn.dispatchEvent('click');
        }
        await page.waitForTimeout(1500);
        await page.waitForURL((url) => url.href.includes('concept-v3-test-page'), { timeout: 4000 }).catch(() => {});
      } else if (page.url().includes('concept-v3-material-page')) {
        logger.info('QuizHandler [Ders Testi]: Konu İçerikleri listesinden test seçilip başlatılıyor...');
        await SmartRouter.selectTopicMaterial(page, 'Konu Testi', true);
        await page.waitForTimeout(1500);
        await page.waitForURL((url) => url.href.includes('concept-v3-test-page'), { timeout: 4000 }).catch(() => {});
      }

      isAlreadyInQuiz = page.url().includes('concept-v3-test-page');
    }

    if (isAlreadyInQuiz) {
      logger.info('QuizHandler [Ders Testi]: Soru ekranı (#/concept-v3-test-page) hazır, sorular çözülüyor.');
    } else {
      logger.warn('QuizHandler [Ders Testi]: Test ekranına (#/concept-v3-test-page) geçiş yapılamadı, mevcut ekran üzerinde deneniyor.');
    }

    // 2. Hedeflenen soru sayısı kuralı:
    //  - questionCount === 'ALL' -> 100 (son soruya kadar)
    //  - questionCount === number -> belirtilen sayı
    //  - varsayılan ("çöz") -> 1 soru
    let targetCount: number;
    if (options?.questionCount === 'ALL') {
      targetCount = 100;
    } else if (typeof options?.questionCount === 'number' && options.questionCount > 0) {
      targetCount = options.questionCount;
    } else if (typeof options?.maxQuestions === 'number' && options.maxQuestions > 0) {
      targetCount = options.maxQuestions;
    } else {
      targetCount = 1; // Kullanıcı kuralı: "çöz deniyorsa 1 soru çözüp testi bitirsin"
    }

    logger.info(`QuizHandler [Ders Testi]: Hedeflenen soru sayısı: ${options?.questionCount === 'ALL' ? 'TÜM SORULAR' : targetCount}`);
    let questionsAnswered = 0;

    for (let q = 0; q < targetCount; q++) {
      // Seçenekleri bul: .option-wrapper .option-item (sorunun kendi seçenekleri)
      let currentOptions = page.locator('.option-wrapper .option-item');
      let optCount = await currentOptions.count().catch(() => 0);

      if (optCount === 0) {
        currentOptions = page.locator('.options .option-item, .radio, .option-item');
        optCount = await currentOptions.count().catch(() => 0);
      }

      // Seçenek tıkla
      if (optCount > 0 && strategy !== 'LEAVE_EMPTY') {
        const pickIdx = strategy === 'ALL_WRONG' ? Math.min(1, optCount - 1) : 
                        strategy === 'ALL_CORRECT' ? 0 : 
                        Math.floor(Math.random() * Math.min(optCount, 5));

        try {
          const optToClick = currentOptions.nth(pickIdx);
          await optToClick.scrollIntoViewIfNeeded().catch(() => {});
          await optToClick.click({ timeout: 1500 });
          questionsAnswered++;
          logger.info(`QuizHandler [Ders Testi - Soru ${q + 1}/${options?.questionCount === 'ALL' ? 'TÜM' : targetCount}]: Seçenek #${pickIdx + 1} tıklandı.`);
        } catch {
          await currentOptions.nth(pickIdx).dispatchEvent('click').catch(() => {});
          questionsAnswered++;
          logger.info(`QuizHandler [Ders Testi - Soru ${q + 1}/${options?.questionCount === 'ALL' ? 'TÜM' : targetCount}]: Seçenek #${pickIdx + 1} dispatchEvent ile tıklandı.`);
        }
        await page.waitForTimeout(600);
      }

      // Hedeflenen soru sayısına ulaşıldıysa ve 'ALL' değilse soru döngüsünü bitir
      if (options?.questionCount !== 'ALL' && questionsAnswered >= targetCount) {
        logger.info(`QuizHandler [Ders Testi]: İstenen soru sayısına (${targetCount}) ulaşıldı, test bitiriliyor...`);
        break;
      }

      // Sonraki soruya geç:
      // "Sonraki Soru" butonu varsa ve disabled değilse tıkla
      const nextBtn = page.locator('a.next:not(.disabled):has-text("Sonraki Soru"), a.next:not(.disabled)').first();
      if (await nextBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
        logger.info('QuizHandler [Ders Testi]: "Sonraki Soru" butonuna tıklanıyor...');
        try {
          await nextBtn.click({ timeout: 1500 });
        } catch {
          await nextBtn.dispatchEvent('click');
        }
        await page.waitForTimeout(800);
      } else {
        logger.info('QuizHandler [Ders Testi]: Son soruya ulaşıldı (Sonraki Soru butonu yok veya disabled).');
        break;
      }
    }

    // ── Testi Bitir & Onay Modalı Yönetimi ──
    logger.info(`QuizHandler [Ders Testi]: ${questionsAnswered} soru işaretlendi. Çıkış/Bitirme adımı yürütülüyor...`);

    // 1. Testi Bitir butonuna bas:
    // Header'daki "Testi Bitir" (a.icon-button.end-test) veya alttaki "Cevapla ve Bitir" (a.end)
    const endTriggerBtn = page.locator(
      'a.icon-button.end-test:has-text("Testi Bitir"), ' +
      'a.end:has-text("Cevapla ve Bitir"), ' +
      'a:has-text("Testi Bitir"), ' +
      'button:has-text("Testi Bitir"), ' +
      'a.end, a.icon-button.end-test'
    ).first();

    if (await endTriggerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const triggerText = (await endTriggerBtn.innerText().catch(() => '')).trim();
      logger.info(`QuizHandler [Ders Testi]: "${triggerText || 'Testi Bitir'}" butonuna basılıyor...`);
      try {
        await endTriggerBtn.click({ timeout: 1500 });
      } catch {
        await endTriggerBtn.dispatchEvent('click');
      }
      await page.waitForTimeout(1500);
    }

    // 2. Onay Modalı ("Testi Tamamladın mı?"):
    // İki seçenek vardır:
    // A) Yarıda Bırakma: a.btn.btn-gray:has-text("Testi Yarıda Bırak")
    // B) Testi Tamamlama: a.btn.btn-alert:has-text("Testi Bitir")
    if (isLeaveHalfway) {
      logger.info('QuizHandler [Ders Testi]: Onay modalında "Testi Yarıda Bırak" seçiliyor...');
      const leaveBtn = page.locator(
        'a.btn:has-text("Testi Yarıda Bırak"), ' +
        'button:has-text("Testi Yarıda Bırak"), ' +
        'a:has-text("Testi Yarıda Bırak"), ' +
        'a.btn.btn-gray'
      ).first();

      if (await leaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        try {
          await leaveBtn.click({ timeout: 1500 });
        } catch {
          await leaveBtn.dispatchEvent('click');
        }
        await page.waitForTimeout(2000);
        logger.info('QuizHandler [Ders Testi ✓]: "Testi Yarıda Bırak" tıklandı ve testten güvenle çıkıldı.');
      }
    } else {
      logger.info('QuizHandler [Ders Testi]: Onay modalında "Testi Bitir" seçiliyor...');
      const confirmFinishBtn = page.locator(
        'a.btn.btn-alert:has-text("Testi Bitir"), ' +
        'a.btn-alert:has-text("Testi Bitir"), ' +
        'button:has-text("Testi Bitir"), ' +
        'a:text-is("Testi Bitir"), ' +
        '.modal a.btn-alert'
      ).first();

      if (await confirmFinishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        try {
          await confirmFinishBtn.click({ timeout: 1500 });
        } catch {
          await confirmFinishBtn.dispatchEvent('click');
        }
        await page.waitForTimeout(2500);
        logger.info('QuizHandler [Ders Testi ✓]: Onay modalında "Testi Bitir" onaylandı ve test sonuçlandırıldı.');
      }
    }

    // 3. Eğer sonuç ekranında / modalında "Kapat" veya benzeri varsa temizle
    const resultCloseBtn = page.locator(
      'a.start-exam:has-text("Kapat"), a:has-text("Kapat"), ' +
      'button:has-text("Kapat"), .popup-close, a.close-button'
    ).first();
    if (await resultCloseBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await resultCloseBtn.click({ timeout: 1000 }).catch(() => resultCloseBtn.dispatchEvent('click'));
      await page.waitForTimeout(500);
    }

    logger.info(`QuizHandler [Ders Testi]: İşlem tamamlandı. Toplam işaretlenen soru: ${questionsAnswered}`);
    return {
      questionsAnswered,
      strategyUsed: strategy,
    };
  }

  private static async solveSimulatorQuiz(page: Page, strategy: QuizStrategy): Promise<any> {
    if (strategy !== 'LEAVE_EMPTY') {
      const options = ['A', 'B', 'C', 'D'];
      const opt = strategy === 'ALL_CORRECT' ? 'A' : strategy === 'ALL_WRONG' ? 'B' : options[Math.floor(Math.random() * options.length)];
      await page.locator(`#radio-opt-${opt}`).first().click().catch(() => {});
    }
    const submitBtn = page.locator('#btn-submit-quiz').first();
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitBtn.click().catch(() => {});
    }
    return { questionsAnswered: 1, strategyUsed: strategy };
  }
}
