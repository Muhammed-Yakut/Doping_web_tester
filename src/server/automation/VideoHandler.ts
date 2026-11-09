import { Page } from 'playwright';
import { logger } from '../logger.ts';

export class VideoHandler {
  /**
   * Video Kontrolörü: Oynatma hızı, zaman takibi, interaktif duraklama denetimi.
   * Doping Hafıza VideoJS ve HTML5 Video API ile tam entegre çalışır.
   */
  /**
   * Sayfadaki veya herhangi bir alt iframe içindeki aktif <video> elementini bulur.
   */
  public static async findVideoTarget(page: Page): Promise<{ frame: Page | any; hasVideo: boolean } | null> {
    // 1. Ana sayfada ara
    const hasMainVideo = await page.evaluate(() => !!document.querySelector('video')).catch(() => false);
    if (hasMainVideo) {
      return { frame: page, hasVideo: true };
    }

    // 2. Alt iframe'lerde ara (H5P / Dopingtech Components iframe'leri)
    for (const f of page.frames()) {
      try {
        const hasFrameVideo = await f.evaluate(() => !!document.querySelector('video')).catch(() => false);
        if (hasFrameVideo) {
          return { frame: f, hasVideo: true };
        }
      } catch {}
    }

    return null;
  }

  /**
   * Video Kontrolörü: Oynatma hızı, zaman takibi, interaktif duraklama denetimi.
   * Doping Hafıza VideoJS ve HTML5 Video API ile tam entegre çalışır.
   */
  public static async controlVideo(
    page: Page,
    speed: number = 2.0,
    durationSec: number = 15,
    onProgress?: (elapsedSec: number, totalSec: number) => void,
    options?: { reWatch?: boolean; seekToEnd?: boolean }
  ): Promise<{ initialSpeed: number; finalSpeed: number; actualDurationSec: number }> {
    logger.info(`VideoHandler: Video kontrolleri başlatılıyor -> Hedef Hız: ${speed}x, İzleme Süresi: ${durationSec}s${options?.reWatch ? ' (Tekrar/Baştan İzleme Modu)' : ''}${options?.seekToEnd ? ' (Videoyu Tamamla / Son 2 Saniyeye Sar Modu)' : ''}`);

    // 1. "Konu Anlatım Yöntemini Seç" modalı açıksa onayla
    const chooseBtn = page.locator('a.choose-btn, .choose-btn, a:has-text("Konu Anlatım Yöntemini Seç")').first();
    if (await chooseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await chooseBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // 2. Video daha önce izlenmişse kapakta "Baştan Başla" veya "Devam Et" butonları bulunur
    // Öncelik: "Baştan Başla" (özellikle tekrar izleme veya sıfırdan izleme için)
    const restartBtn = page.locator(
      'a.solve-again-btn, button.solve-again-btn, ' +
      'a:has-text("Baştan Başla"), button:has-text("Baştan Başla"), ' +
      'a:has-text("Tekrar İzle"), button:has-text("Tekrar İzle"), ' +
      '.vjs-replay-button, button.vjs-replay-button'
    ).first();

    const continueBtn = page.locator(
      'a.watch-again-btn, button.watch-again-btn, ' +
      'a:has-text("Devam Et"), button:has-text("Devam Et")'
    ).first();

    const izleBtn = page.locator('button:has-text("İzle"), a:has-text("İzle")').first();

    if (options?.reWatch && await restartBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
      logger.info('VideoHandler: "Baştan Başla" / "Tekrar İzle" butonu tıklandı.');
      await restartBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    } else if (await restartBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      logger.info('VideoHandler: Tamamlanmış/izlenmiş video için "Baştan Başla" butonu tıklandı.');
      await restartBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    } else if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      logger.info('VideoHandler: Yarım kalan video için "Devam Et" butonu tıklandı.');
      await continueBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    } else if (await izleBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await izleBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
      logger.info('VideoHandler: "İzle" butonu tıklandı.');
    }

    // 3. VideoJS büyük oynat butonu (.vjs-big-play-button) varsa tıkla
    const bigPlayBtn = page.locator('.vjs-big-play-button, button.vjs-big-play-button').first();
    if (await bigPlayBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bigPlayBtn.click().catch(() => {});
      await page.waitForTimeout(500);
      logger.info('VideoHandler: VideoJS büyük oynat butonu tıklandı.');
    }

    // 4. HTML5 <video> elementini bul (Ana sayfa veya alt iframe'lerde)
    let videoTarget = await VideoHandler.findVideoTarget(page);
    if (!videoTarget) {
      // 3-4 saniye videonun yüklenmesini bekle
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(500);
        videoTarget = await VideoHandler.findVideoTarget(page);
        if (videoTarget) break;
      }
    }

    const targetFrame = videoTarget ? videoTarget.frame : page;
    const hasVideo = !!videoTarget;

    // ── ÖZEL MOD: Videoyu Tamamla / Son 2 Saniyeye Sar ──
    if (options?.seekToEnd && hasVideo) {
      logger.info('VideoHandler: [seekToEnd] Modu devrede: Video son 2 saniyeye sarılıyor...');

      // Süre bilgisinin yüklenmesini bekle (duration > 0)
      for (let w = 0; w < 8; w++) {
        const hasDur = await targetFrame.evaluate(() => {
          const v = document.querySelector('video');
          return v && !isNaN(v.duration) && v.duration > 0;
        }).catch(() => false);
        if (hasDur) break;
        await page.waitForTimeout(500);
      }

      const seekInfo = await targetFrame.evaluate((s: number) => {
        const vid = document.querySelector('video');
        if (!vid) return null;

        const dur = (vid.duration && !isNaN(vid.duration) && vid.duration > 0) ? vid.duration : 10;
        const target = Math.max(0, dur - 2);
        vid.currentTime = target;
        vid.playbackRate = s;
        if (vid.paused) {
          vid.play().catch(() => {});
        }
        return { duration: dur, targetTime: target, currentTime: vid.currentTime };
      }, speed).catch(() => null);

      if (seekInfo) {
        logger.info(`VideoHandler: Video son 2 saniyeye sarıldı -> Hedef: ${seekInfo.targetTime.toFixed(1)}s / Toplam: ${seekInfo.duration.toFixed(1)}s`);
      }

      // Son 2 saniyenin oynatılmasını ve videonun tamamlanmasını bekle (Maksimum 5 saniye)
      for (let sec = 1; sec <= 5; sec++) {
        await page.waitForTimeout(1000);
        if (onProgress) {
          onProgress(sec, 2);
        }

        const state = await targetFrame.evaluate(() => {
          const vid = document.querySelector('video');
          const isEnded = vid ? (vid.ended || vid.currentTime >= (vid.duration || 1) - 0.2) : true;
          const hasQuestionModal = !!document.querySelector('.question-wrapper, .ReactModal__Content .option-item, .interactive-question, .option-item');
          return { isEnded, hasQuestionModal };
        }).catch(() => ({ isEnded: true, hasQuestionModal: false }));

        if (state.isEnded || state.hasQuestionModal) {
          logger.info(`VideoHandler: Video tamamlanma / soru tetikleme noktasına ulaştı (${sec}. saniye).`);
          break;
        }
      }

      await page.waitForTimeout(1000);
      logger.info('VideoHandler: Video son 2 saniyeden oynatılarak başarıyla tamamlandı.');
      return {
        initialSpeed: 1.0,
        finalSpeed: speed,
        actualDurationSec: 2,
      };
    }

    // Normal oynatma modu
    if (hasVideo) {
      logger.info('VideoHandler: DOM üzerinde HTML5 <video> elementi tespit edildi.');
      await targetFrame.evaluate((s: number) => {
        const vid = document.querySelector('video');
        if (vid) {
          if (vid.ended || vid.currentTime >= (vid.duration || 10) - 1.5) {
            vid.currentTime = 0;
          }
          vid.playbackRate = s;
          if (vid.paused) {
            vid.play().catch(() => {});
          }
        }
      }, speed);
      logger.info(`VideoHandler: HTML5 Video API ile playbackRate=${speed}x ve play() tetiklendi.`);
    } else {
      logger.warn('VideoHandler: <video> elementi DOM üzerinde bulunamadı, süre izleme moduna geçiliyor.');
    }

    // 5. İstenen Süre Boyunca İzleme Döngüsü
    const startTime = Date.now();
    const targetMs = durationSec * 1000;
    const intervalMs = 1000;

    let elapsedMs = 0;
    while (elapsedMs < targetMs) {
      const stepWait = Math.min(intervalMs, targetMs - elapsedMs);
      await page.waitForTimeout(stepWait);
      elapsedMs = Date.now() - startTime;

      const currentSec = Math.min(durationSec, Math.round(elapsedMs / 1000));
      if (onProgress) {
        onProgress(currentSec, durationSec);
      }
      logger.debug(`VideoHandler: Video izleniyor [${currentSec}/${durationSec} sn] - ${speed}x`);
    }

    logger.info(`VideoHandler: Video ${speed}x hızında ${durationSec} saniye başarıyla izlendi.`);
    return {
      initialSpeed: 1.0,
      finalSpeed: speed,
      actualDurationSec: durationSec,
    };
  }
}
