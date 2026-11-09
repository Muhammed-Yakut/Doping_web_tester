import { Page } from 'playwright';
import { logger } from '../server/logger.ts';

export type QuizType =
  | 'MOCK_EXAM'
  | 'INTERACTIVE_IN_VIDEO'
  | 'GAMIFIED_ACTIVITY'
  | 'TOPIC_TEST'
  | 'UNKNOWN';

export interface QuizDetectionDetails {
  type: QuizType;
  indicators: string[];
  hasTimer: boolean;
  hasVideo: boolean;
  hasDragDrop: boolean;
  hasOptions: boolean;
}

/**
 * QuizDetector — DOM Üzerinde Hızlı Ekran Tipi ve Sınav/Test Ayrımı Yöneticisi
 * 
 * Sorumlulukları:
 *  1. DOM üzerinde hızlı bir kontrol yaparak ekran tipini tespit eder:
 *     - Kronometre/sayaç (.timer, countdown) veya "Sınavı Bitir" varsa: MOCK_EXAM
 *     - Video açıkken soru çıktıysa: INTERACTIVE_IN_VIDEO
 *     - Sürükle-bırak elemanı varsa: GAMIFIED_ACTIVITY
 *     - Normal şıklar varsa: TOPIC_TEST
 *  2. Test MOCK_EXAM ise, sınav bitiminde ekrana düşen "Sınavı sonlandırmak istediğinize emin misiniz?"
 *     modal onayını Playwright ile otomatik tıklar ve analiz/sonuç ekranına geçişi sağlar.
 */
export class QuizDetector {
  /**
   * DOM üzerinde hızlı bir kontrol yaparak test tipini tespit eder.
   */
  public static async detect(page: Page): Promise<QuizType> {
    const details = await QuizDetector.inspect(page);
    logger.info(`QuizDetector [Tespit]: Ekran Tipi → ${details.type} (${details.indicators.join(', ')})`);
    return details.type;
  }

  /**
   * Ekrandaki tüm göstergeleri (timer, video, drag-drop, şıklar) detaylı denetler.
   */
  public static async inspect(page: Page): Promise<QuizDetectionDetails> {
    if (!page || page.isClosed()) {
      return {
        type: 'UNKNOWN',
        indicators: ['page_closed'],
        hasTimer: false,
        hasVideo: false,
        hasDragDrop: false,
        hasOptions: false,
      };
    }

    try {
      const evaluation = await page.evaluate(() => {
        const url = window.location.href;
        const indicators: string[] = [];

        // 1. Sürükle-Bırak Eleman Kontrolü (Gamified Activity)
        const hasDrag = !!(
          document.querySelector('[draggable="true"]') ||
          document.querySelector('#tab-btn-drag') ||
          document.querySelector('#drag-item-2cubed') ||
          document.querySelector('.drag-item, [class*="drag-"], [class*="drop-target"]') ||
          document.querySelector('[data-role="draggable"]')
        );
        if (hasDrag) indicators.push('drag_drop_detected');

        // 2. Video Oynatıcı Kontrolü
        const videoEl = document.querySelector('video, .video-js, .vjs-tech, [class*="video-player"]');
        const hasVideo = !!videoEl && (
          (videoEl as HTMLVideoElement).duration > 0 ||
          videoEl.clientWidth > 0 ||
          document.querySelector('.video-container, .vjs-poster') !== null
        );
        if (hasVideo) indicators.push('video_detected');

        // 3. Kronometre / Sayaç Kontrolü (.timer, countdown)
        const timerEl = document.querySelector(
          '.timer, .countdown, [class*="timer"], [class*="countdown"], ' +
          '.exam-timer, .time-left, [data-testid="timer"]'
        );
        const hasTimer = !!timerEl && (timerEl.textContent || '').trim().length > 0;
        if (hasTimer) indicators.push(`timer_found: ${(timerEl?.textContent || '').trim()}`);

        // 4. "Sınavı Bitir" / "Sınavı Sonlandır" Kontrolü
        const allButtonsAndLinks = Array.from(document.querySelectorAll('a, button'));
        const hasSinaviBitir = allButtonsAndLinks.some(el => {
          const t = (el.textContent || '').trim();
          return t.includes('Sınavı Bitir') || t.includes('Sınavı Sonlandır');
        });
        if (hasSinaviBitir) indicators.push('sinavi_bitir_button_found');

        // URL Kontrolü (Denemeler Paneli)
        const isExamUrl = url.includes('examinations') || url.includes('exam-page');
        if (isExamUrl) indicators.push('examinations_url');

        // 5. Normal Şıklar Kontrolü
        const optionEls = document.querySelectorAll(
          '.option-item, .option-wrapper .option-item, .radio, div[class*="option-item"], ' +
          '#quiz-options input[type="radio"], [class*="quiz-option"]'
        );
        const hasOptions = optionEls.length > 0;
        if (hasOptions) indicators.push(`options_count_${optionEls.length}`);

        // ── Karar Mantığı (Decision Logic) ──

        // A) Sürükle-Bırak varsa -> GAMIFIED_ACTIVITY
        if (hasDrag && !hasOptions) {
          return {
            type: 'GAMIFIED_ACTIVITY' as const,
            indicators,
            hasTimer,
            hasVideo,
            hasDragDrop: hasDrag,
            hasOptions,
          };
        }

        // B) Kronometre / sayaç veya "Sınavı Bitir" veya deneme sınavı url'i varsa -> MOCK_EXAM
        if (hasTimer || hasSinaviBitir || (isExamUrl && hasOptions)) {
          return {
            type: 'MOCK_EXAM' as const,
            indicators,
            hasTimer,
            hasVideo,
            hasDragDrop: hasDrag,
            hasOptions,
          };
        }

        // C) Video açıkken soru çıktıysa -> INTERACTIVE_IN_VIDEO
        if (hasVideo && hasOptions) {
          return {
            type: 'INTERACTIVE_IN_VIDEO' as const,
            indicators,
            hasTimer,
            hasVideo,
            hasDragDrop: hasDrag,
            hasOptions,
          };
        }

        // D) Normal şıklar varsa -> TOPIC_TEST
        if (hasOptions) {
          return {
            type: 'TOPIC_TEST' as const,
            indicators,
            hasTimer,
            hasVideo,
            hasDragDrop: hasDrag,
            hasOptions,
          };
        }

        if (hasDrag) {
          return {
            type: 'GAMIFIED_ACTIVITY' as const,
            indicators,
            hasTimer,
            hasVideo,
            hasDragDrop: true,
            hasOptions: false,
          };
        }

        return {
          type: 'UNKNOWN' as const,
          indicators,
          hasTimer,
          hasVideo,
          hasDragDrop: false,
          hasOptions: false,
        };
      });

      return evaluation;
    } catch (err: any) {
      logger.warn(`QuizDetector: DOM inceleme hatası: ${err.message}`);
      return {
        type: 'UNKNOWN',
        indicators: [`error: ${err.message}`],
        hasTimer: false,
        hasVideo: false,
        hasDragDrop: false,
        hasOptions: false,
      };
    }
  }

  /**
   * Test MOCK_EXAM ise, sınav bitiminde ekrana düşen "Sınavı sonlandırmak istediğinize emin misiniz?"
   * modal onayını Playwright ile otomatik tıklar ve analiz/sonuç ekranına geçer.
   */
  public static async handleMockExamFinishModal(page: Page): Promise<boolean> {
    logger.info('QuizDetector [MOCK_EXAM]: Sınav bitirme ve onay modalı yönetimi devrede...');

    // 1. "Sınavı Bitir" veya "Testi Bitir" butonunu bulup tıkla
    const exitBtn = page.locator(
      'a.exit-button:has-text("Sınavı Bitir"), button:has-text("Sınavı Bitir"), ' +
      'a.exit-button:has-text("Testi Bitir"), button:has-text("Testi Bitir"), ' +
      'a.exit-button, button.exit-button'
    ).first();

    if (await exitBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      logger.info('QuizDetector [MOCK_EXAM]: "Sınavı Bitir" butonuna tıklandı.');
      await exitBtn.dispatchEvent('click');
      await page.waitForTimeout(1000);
    }

    // 2. Ekrana düşen onay modalı:
    // "Sınavı sonlandırmak istediğinize emin misiniz?" / "Sınavı bitirmek istediğinize emin misiniz?"
    const confirmModalBtn = page.locator(
      '.modal button:has-text("Sınavı Bitir"), .modal a:has-text("Sınavı Bitir"), ' +
      '.modal button:has-text("Testi Bitir"), .modal a:has-text("Testi Bitir"), ' +
      '.modal button:has-text("Sonlandır"), .modal a:has-text("Sonlandır"), ' +
      '.popup-frame a:has-text("Testi Bitir"), .popup-frame button:has-text("Testi Bitir"), ' +
      'button:has-text("Sınavı Bitir"), a:has-text("Sınavı Bitir"), ' +
      'button:has-text("Testi Bitir"), a:has-text("Testi Bitir"), ' +
      '.modal button:has-text("Evet"), button:has-text("Evet"), button.swal2-confirm'
    ).last();

    if (await confirmModalBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      logger.info('QuizDetector [MOCK_EXAM]: "Sınavı sonlandırmak istediğinize emin misiniz?" modal onayı onaylandı.');
      try {
        await confirmModalBtn.click({ timeout: 1500 });
      } catch {
        await confirmModalBtn.dispatchEvent('click');
      }
      await page.waitForTimeout(1500);
    }

    // 3. Analiz / Sonuç ekranına geçişi bekle ve doğrula (#/examinations-result veya analiz paneli)
    try {
      await page.waitForURL((url) => {
        const u = (url.href + (url.hash || '')).toLowerCase();
        return u.includes('result') || u.includes('analiz') || u.includes('examinations');
      }, { timeout: 4000 }).catch(() => {});

      const currentHash = await page.evaluate(() => window.location.hash).catch(() => '');
      logger.info(`QuizDetector [MOCK_EXAM]: Analiz/Sonuç ekranına başarıyla geçildi. URL: ${page.url()} | Hash: "${currentHash}"`);
      return true;
    } catch {
      return false;
    }
  }
}
