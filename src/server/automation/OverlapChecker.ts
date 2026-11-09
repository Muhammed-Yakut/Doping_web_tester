import { Locator, Page } from 'playwright';
import { logger } from '../logger.ts';

export interface OverlapCheckResult {
  isActionable: boolean;
  isObscured: boolean;
  overlappingElement?: string;
  box: { x: number; y: number; width: number; height: number } | null;
}

export class OverlapChecker {
  /**
   * Element Actionability & Overlap (Görsel Çakışma) Denetleyicisi
   */
  public static async checkActionability(page: Page, locator: Locator): Promise<OverlapCheckResult> {
    const box = await locator.boundingBox();
    if (!box) {
      return { isActionable: false, isObscured: true, box: null };
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const evalResult = await page.evaluate(
      ({ x, y }) => {
        const topEl = document.elementFromPoint(x, y);
        if (!topEl) return { obscured: true, topTag: 'none' };

        return {
          obscured: false,
          topTag: `${topEl.tagName.toLowerCase()}${topEl.id ? '#' + topEl.id : ''}${topEl.className ? '.' + String(topEl.className).split(' ')[0] : ''}`,
        };
      },
      { x: centerX, y: centerY }
    );

    const isActionable = !evalResult.obscured;
    if (!isActionable) {
      logger.warn(`OverlapChecker: Element (${centerX}, ${centerY}) noktasında başka bir katman tarafından engelleniyor: ${evalResult.topTag}`);
    }

    return {
      isActionable,
      isObscured: evalResult.obscured,
      overlappingElement: evalResult.topTag,
      box,
    };
  }
}
