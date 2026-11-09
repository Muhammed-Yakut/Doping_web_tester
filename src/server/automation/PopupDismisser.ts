import { Page } from 'playwright';
import { logger } from '../logger.ts';

/**
 * PopupDismisser — Görev yürütümü sırasında ortaya çıkan tüm modal,
 * drawer, bildirim, duyuru banner'ı, pop-up ve dialog engellerini otomatik kapatır.
 */
export class PopupDismisser {
  private static readonly DISMISS_SELECTORS = [
    // Doping Hafıza'ya özel buton ve kapatıcılar (Sol menü ve sidebar ASLA hedeflenmez)
    '.close-button',
    'button.close-button',
    '[class*="modal"] .close-button',
    '[class*="popup"] .close-button',
    '[class*="drawer"] .close-button',
    'i.icon-close',
    'i.icon-times',
    'i.icon-x',
    '.modal-close',
    '.btn-close',
    '[class*="popup"] [class*="close"]',
    '[class*="modal"] [class*="close"]',
    '[class*="dialog"] [class*="close"]',

    // Modal / Dialog içi onay ve kapatma butonları (Tam metin eşleşmesi)
    '[class*="modal"] button:text-is("Kapat")',
    '[class*="modal"] button:text-is("Tamam")',
    '[class*="modal"] button:text-is("Anladım")',
    '[class*="popup"] button:text-is("Anladım")',
    '[class*="dialog"] button:text-is("Anladım")',
    'button:text-is("Anladım")',
    'button:text-is("Kapat")',
    'button:text-is("Tamam")',
    'button:text-is("Devam Et")',
    'a.btn-alert:has-text("Devam Et")',
    'a:text-is("Devam Et")',
    'a.btn:text-is("Devam Et")',
    '[class*="modal"] a:has-text("Devam Et")',
    '[class*="popup"] a:has-text("Devam Et")',
    'a:text-is("Tamam")',
    'a:text-is("Kapat")',
    'a:text-is("Anladım")',
    'a:text-is("Geç")',
    'a:text-is("Atla")',
    'button:text-is("Geç")',
    'button:text-is("Atla")',
    'button:text-is("Daha Sonra")',
    'button:text-is("Şimdi Değil")',

    // Standart dialog butonları
    '[aria-label="Kapat"]',
    '[aria-label="Close"]',
    '[class*="modal"] button:text-is("Close")',
    '[class*="modal"] button:text-is("OK")',

    // Toast / Bildirim
    '[class*="toast"] button',
    '[class*="alert"] button[class*="close"]',
    '[class*="notification"] button',
  ];

  private static readonly OVERLAY_SELECTORS = [
    '.modal-backdrop',
    '[class*="modal-backdrop"]',
    '[class*="backdrop"]:not([class*="video"])',
  ];

  /**
   * Sayfayı bir kez tarar, bulduğu pop-up ve modal'ları temizler.
   */
  public static async once(page: Page): Promise<number> {
    if (!page || page.isClosed()) return 0;
    let dismissed = 0;

    for (const sel of PopupDismisser.DISMISS_SELECTORS) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 150 }).catch(() => false)) {
          // Sol menüyü, arama çubuğunu, sınav kapağını (.popup-frame) ve sınav ekranını ASLA kapatma
          const isProtected = await el.evaluate((node) => {
            const parentModal = node.closest('.modal, [class*="modal"], [class*="dialog"]');
            const modalText = parentModal?.textContent || '';
            if (
              modalText.includes('Sınava Başla') ||
              modalText.includes('Baştan Çöz') ||
              modalText.includes('Testi İncele') ||
              modalText.includes('Sınavı Bitir') ||
              modalText.includes('Testi Bitir')
            ) {
              return true;
            }

            return !!node.closest(
              '.sidebar, aside, nav, [class*="nav-wrapper"], .link, [class*="profile"], ' +
              '.search-wrapper, .search-box, [class*="search"], [class*="exam-content"], ' +
              '.grade-selection-options, [class*="grade"], ' +
              '.popup-frame, .examinations-cover-wrapper, [class*="examinations"], [class*="exam-page"], .popup-frame-inner, [class*="cover"]'
            );
          }).catch(() => false);

          if (isProtected) continue;

          await el.click({ timeout: 600, force: true }).catch(() => {});
          await page.waitForTimeout(100);
          logger.info(`PopupDismisser: Engel temizlendi (${sel})`);
          dismissed++;
        }
      } catch {
        // Devam et
      }
    }

    // Overlay backdrop varsa
    for (const sel of PopupDismisser.OVERLAY_SELECTORS) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 150 }).catch(() => false)) {
          await el.click({ force: true, timeout: 600 }).catch(() => {});
          await page.waitForTimeout(100);
          logger.info(`PopupDismisser: Backdrop tıklandı (${sel})`);
          dismissed++;
        }
      } catch {
        // Devam et
      }
    }

    if (dismissed > 0) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(100);
    }

    return dismissed;
  }

  /**
   * Arka plan bekçisi
   */
  public static watch(page: Page, intervalMs = 1200): () => void {
    logger.info('PopupDismisser: Pop-up bekçisi aktif.');
    const timer = setInterval(async () => {
      if (!page || page.isClosed()) {
        clearInterval(timer);
        return;
      }
      await PopupDismisser.once(page).catch(() => {});
    }, intervalMs);

    return () => {
      clearInterval(timer);
      logger.info('PopupDismisser: Pop-up bekçisi durduruldu.');
    };
  }

  /**
   * Native dialog'ları (alert/confirm/prompt) otomatik onayla
   */
  public static installDialogHandler(page: Page): void {
    page.on('dialog', async (dialog) => {
      logger.info(`PopupDismisser: Native dialog tespit edildi (${dialog.type()}): "${dialog.message()}" → Onaylandı`);
      await dialog.accept().catch(() => {});
    });
  }
}
