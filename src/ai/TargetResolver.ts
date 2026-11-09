import Fuse from 'fuse.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../server/logger.ts';
import {
  AppTopology,
  SearchableNode,
  TopologyItem,
  TopologyTopic,
  TopologySubject,
  GradeLevelData,
  PathStep
} from '../shared/types/topology.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TargetResolveResult {
  success: boolean;
  node?: SearchableNode;
  confidence: number;
  method: 'EXACT_MATCH' | 'FUZZY_TOP' | 'GEMINI_DISAMBIGUATION' | 'HEURISTIC_FALLBACK';
  alternatives?: SearchableNode[];
  error?: string;
}

export interface AcademicDiscipline {
  key: string;
  display: string;
  patterns: RegExp[];
  aliases: string[];
}

export const ACADEMIC_DISCIPLINES: AcademicDiscipline[] = [
  {
    key: 'matematik',
    display: 'Matematik',
    patterns: [/(?:^|\W)(matematik|mat|geometri|geo)(?:$|\W)/i],
    aliases: ['matematik', 'mat', 'geometri', 'matematik dersi', 'mat dersi']
  },
  {
    key: 'turkce',
    display: 'Türkçe',
    patterns: [/(?:^|\W)(turkce|türkçe|edebiyat|turk dili|türk dili|dil ve anlatim|dil ve anlatım)(?:$|\W)/i],
    aliases: ['türkçe', 'turkce', 'edebiyat', 'türk dili', 'türkçe dersi']
  },
  {
    key: 'fen',
    display: 'Fen Bilimleri',
    patterns: [/(?:^|\W)(fen|fen bilimleri)(?:$|\W)/i],
    aliases: ['fen bilimleri', 'fen', 'fen dersi']
  },
  {
    key: 'fizik',
    display: 'Fizik',
    patterns: [/(?:^|\W)(fizik)(?:$|\W)/i],
    aliases: ['fizik', 'fizik dersi']
  },
  {
    key: 'kimya',
    display: 'Kimya',
    patterns: [/(?:^|\W)(kimya)(?:$|\W)/i],
    aliases: ['kimya', 'kimya dersi']
  },
  {
    key: 'biyoloji',
    display: 'Biyoloji',
    patterns: [/(?:^|\W)(biyoloji|biyo)(?:$|\W)/i],
    aliases: ['biyoloji', 'biyo', 'biyoloji dersi']
  },
  {
    key: 'tarih',
    display: 'Tarih',
    patterns: [/(?:^|\W)(tarih|inkilap|inkılap|t\.c\. inkilap|t\.c\. inkılap)(?:$|\W)/i],
    aliases: ['tarih', 't.c. inkılap tarihi ve atatürkçülük', 'inkılap tarihi', 'tarih dersi']
  },
  {
    key: 'cografya',
    display: 'Coğrafya',
    patterns: [/(?:^|\W)(cografya|coğrafya)(?:$|\W)/i],
    aliases: ['coğrafya', 'cografya', 'coğrafya dersi']
  },
  {
    key: 'felsefe',
    display: 'Felsefe',
    patterns: [/(?:^|\W)(felsefe|mantik|mantık|psikoloji|sosyoloji)(?:$|\W)/i],
    aliases: ['felsefe', 'mantık', 'psikoloji', 'sosyoloji', 'felsefe dersi']
  },
  {
    key: 'ingilizce',
    display: 'İngilizce',
    patterns: [/(?:^|\W)(ingilizce|english)(?:$|\W)/i],
    aliases: ['ingilizce', 'english', 'ingilizce dersi']
  },
  {
    key: 'din',
    display: 'Din Kültürü ve Ahlak Bilgisi',
    patterns: [/(?:^|\W)(din|din kulturu|din kültürü)(?:$|\W)/i],
    aliases: ['din kültürü ve ahlak bilgisi', 'din kültürü', 'din dersi']
  },
  {
    key: 'almanca',
    display: 'Almanca',
    patterns: [/(?:^|\W)(almanca|german)(?:$|\W)/i],
    aliases: ['almanca', 'almanca dersi']
  }
];

export class TargetResolver {
  private static instance: TargetResolver | null = null;
  public static getInstance(): TargetResolver {
    if (!TargetResolver.instance) {
      TargetResolver.instance = new TargetResolver();
    }
    return TargetResolver.instance;
  }

  public static async resolve(query: string, preferredGrade?: string): Promise<TargetResolveResult> {
    return TargetResolver.getInstance().resolveTarget(query, preferredGrade);
  }

  private topologyPath: string;
  private topology: AppTopology | null = null;
  private nodes: SearchableNode[] = [];
  private fuse: Fuse<SearchableNode> | null = null;
  private genAI: GoogleGenAI | null = null;
  private geminiModel: string = 'gemini-2.5-flash';

  constructor(topologyPath?: string, apiKey?: string) {
    const possiblePaths = [
      topologyPath,
      path.resolve(__dirname, '../shared/data/app_topology.json'),
      path.resolve(__dirname, '../src/shared/data/app_topology.json'),
      path.resolve(__dirname, './shared/data/app_topology.json'),
      path.resolve(process.cwd(), 'src/shared/data/app_topology.json'),
      path.resolve((process as any).resourcesPath || '', 'src/shared/data/app_topology.json'),
      path.resolve((process as any).resourcesPath || '', 'app_topology.json'),
    ].filter(Boolean) as string[];

    this.topologyPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.genAI = new GoogleGenAI({ apiKey: key });
      } catch (err: any) {
        logger.warn(`TargetResolver: Gemini AI istemcisi başlatılamadı: ${err.message}`);
      }
    }
    this.loadTopology();
  }

  public getNodesCount(): number {
    return this.nodes.length;
  }

  public getAllNodes(): SearchableNode[] {
    return this.nodes;
  }

  public setApiKey(apiKey: string): void {
    const key = apiKey.trim();
    if (key) {
      try {
        this.genAI = new GoogleGenAI({ apiKey: key });
        logger.info('TargetResolver: Gemini AI istemcisi güncellendi.');
      } catch (err: any) {
        logger.warn(`TargetResolver: Gemini istemci başlatma hatası: ${err.message}`);
        this.genAI = null;
      }
    } else {
      this.genAI = null;
    }
  }

  /**
   * Kullanıcı niyetini (Yazılı provası, kamp, sınav, video, test) Türkçe karakter normalizasyonu ile ayrıştırır.
   */
  public detectIntent(query: string) {
    const qNorm = this.normalizeQuery(query);

    const isYaziliQuery =
      qNorm.includes('yazili') ||
      qNorm.includes('prova') ||
      /(?:^|\W)(yazili|prova|provalari|provalar|provas|yazililar|yazilisi|yaziliya|donem)(?:$|\W)/i.test(qNorm);

    const isKampQuery =
      qNorm.includes('kamp') ||
      /(?:^|\W)(kamp|kampi|kamplar|kamplari|tatil)(?:$|\W)/i.test(qNorm);

    const isExamQuery =
      qNorm.includes('deneme') ||
      qNorm.includes('tarama') ||
      /(?:^|\W)(deneme|denemesi|tarama)(?:$|\W)/i.test(qNorm);

    const isTestOrQuizQuery =
      qNorm.includes('test') ||
      qNorm.includes('coz') ||
      qNorm.includes('soru') ||
      /(?:^|\W)(test|testi|testler|soru|sorular|pekistirme|quiz|coz)(?:$|\W)/i.test(qNorm);

    const isVideoQuery =
      qNorm.includes('video') ||
      qNorm.includes('izle') ||
      /(?:^|\W)(video|videolar|videosu|izle|dinle|anlatim)(?:$|\W)/i.test(qNorm);

    const detectedDiscipline = ACADEMIC_DISCIPLINES.find(d => 
      d.patterns.some(p => p.test(qNorm)) || qNorm.includes(d.key)
    );

    const gradeMatch = qNorm.match(/(\d+)\.?\s*sinif|yks\s*2028|lgs/i);
    const detectedGrade = gradeMatch ? gradeMatch[0] : undefined;

    return {
      isYaziliQuery,
      isKampQuery,
      isExamQuery,
      isTestOrQuizQuery,
      isVideoQuery,
      detectedDiscipline,
      detectedGrade
    };
  }

  /**
   * Gemini'ye gerçek topoloji bağlamı sağlamak için sorguya en yakın aday düğümleri döner
   */
  public findTopCandidates(query: string, preferredGrade?: string, limit: number = 8): SearchableNode[] {
    if (!query || query.trim().length === 0) return [];
    if (!this.fuse || this.nodes.length === 0) this.loadTopology();
    if (!this.fuse) return [];

    const trimmed = query.trim();
    const intent = this.detectIntent(trimmed);
    const targetGradeNorm = intent.detectedGrade || preferredGrade || '';
    const candidates: SearchableNode[] = [];

    const matchesGrade = (node: SearchableNode, gradeNorm: string): boolean => {
      if (!gradeNorm) return true;
      const nG = this.normalizeQuery(node.gradeName);
      const nL = this.normalizeQuery(node.levelKey);
      const gNorm = this.normalizeQuery(gradeNorm);

      const num = gNorm.match(/\d+/)?.[0];
      if (num) {
        const nodeNum = nG.match(/\d+/)?.[0] || nL.match(/\d+/)?.[0];
        if (nodeNum && nodeNum === num) return true;
      }
      if ((gNorm.includes('lgs') || gNorm.includes('ortaokul')) && (nG.includes('lgs') || nL.includes('lgs') || nG.includes('8') || nL.includes('middle'))) return true;
      if ((gNorm.includes('yks') || gNorm.includes('tyt') || gNorm.includes('ayt')) && (nG.includes('yks') || nL.includes('yks') || nG.includes('12') || nL.includes('high') || nG.includes('2028'))) return true;

      return nG.includes(gNorm) || nL.includes(gNorm);
    };

    // 0. Deterministik Birincil Adaylar (Standart Ders vs. Yazılı Provaları Ayrımı)
    if (intent.isYaziliQuery) {
      if (intent.detectedDiscipline) {
        const yaziliDiscipline = this.nodes.find(n =>
          n.bundleType === 'YAZILI_PROVALARI' &&
          n.isBundleSubItem &&
          n.discipline === intent.detectedDiscipline!.key &&
          matchesGrade(n, targetGradeNorm)
        );
        if (yaziliDiscipline && !candidates.some(c => c.nodeId === yaziliDiscipline.nodeId)) {
          candidates.push(yaziliDiscipline);
        }
      }

      const yaziliCard = this.nodes.find(n =>
        n.bundleType === 'YAZILI_PROVALARI' &&
        !n.isBundleSubItem &&
        matchesGrade(n, targetGradeNorm)
      );
      if (yaziliCard && !candidates.some(c => c.nodeId === yaziliCard.nodeId)) {
        candidates.push(yaziliCard);
      }
    } else if (intent.detectedDiscipline && !intent.isKampQuery && !intent.isExamQuery) {
      const primarySubject = this.nodes.find(n =>
        n.isPrimarySubject &&
        n.discipline === intent.detectedDiscipline!.key &&
        matchesGrade(n, targetGradeNorm)
      );
      if (primarySubject && !candidates.some(c => c.nodeId === primarySubject.nodeId)) {
        candidates.push(primarySubject);
      }
    }

    // 1. Tam Cümle / Takma Ad Eşleşmesi
    const trimmedLower = trimmed.toLowerCase();
    const exactMatches = this.nodes.filter(n => {
      if (!intent.isYaziliQuery && (n.bundleType === 'YAZILI_PROVALARI' || n.isBundleSubItem)) {
        return false;
      }
      if (intent.isYaziliQuery && n.bundleType !== 'YAZILI_PROVALARI') {
        return false;
      }
      return (
        n.title.toLowerCase() === trimmedLower ||
        n.aliases.some(a => a.toLowerCase() === trimmedLower)
      );
    });

    if (exactMatches.length > 0) {
      exactMatches.sort((a, b) => {
        const aMatch = matchesGrade(a, targetGradeNorm);
        const bMatch = matchesGrade(b, targetGradeNorm);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
      for (const m of exactMatches) {
        if (!candidates.some(c => c.nodeId === m.nodeId)) {
          candidates.push(m);
        }
        if (candidates.length >= 4) break;
      }
    }

    // 2. Fuse.js Ağırlıklı Arama
    const fuseResults = this.fuse.search(trimmed);
    let ranked = fuseResults.map(r => {
      let score = r.score ?? 1.0;
      const node = r.item;

      // Yazılı vs. Ders filtre cezaları
      if (!intent.isYaziliQuery && (node.bundleType === 'YAZILI_PROVALARI' || node.isBundleSubItem || node.subjectTitle.toLowerCase().includes('yazılı'))) {
        score += 2.0;
      }
      if (intent.isYaziliQuery && node.bundleType !== 'YAZILI_PROVALARI') {
        score += 2.0;
      }
      if (!intent.isKampQuery && (node.bundleType === 'KAMP' || node.subjectTitle.toLowerCase().includes('kamp'))) {
        score += 0.8;
      }
      if (!intent.isExamQuery && (node.subjectTitle.toLowerCase().includes('deneme') || node.nodeId.includes('tarama'))) {
        score += 0.8;
      }

      // Branş eşleşme bonusu / cezası
      if (intent.detectedDiscipline) {
        if (node.discipline === intent.detectedDiscipline.key || node.subjectTitle.toLowerCase().includes(intent.detectedDiscipline.display.toLowerCase())) {
          score -= 0.4;
        } else if (node.discipline && node.discipline !== intent.detectedDiscipline.key) {
          score += 1.0;
        }
      }

      return { node, score };
    });

    if (targetGradeNorm) {
      ranked = ranked.sort((a, b) => {
        const aGradeMatch = matchesGrade(a.node, targetGradeNorm);
        const bGradeMatch = matchesGrade(b.node, targetGradeNorm);
        if (aGradeMatch && !bGradeMatch) return -1;
        if (!aGradeMatch && bGradeMatch) return 1;
        return a.score - b.score;
      });
    } else {
      ranked.sort((a, b) => a.score - b.score);
    }

    for (const r of ranked) {
      if (!candidates.some(c => c.nodeId === r.node.nodeId)) {
        candidates.push(r.node);
      }
      if (candidates.length >= limit) break;
    }

    return candidates;
  }

  /**
   * Topoloji JSON dosyasını yükler ve Fuse.js indeksini hazırlar
   */
  public loadTopology(): void {
    try {
      if (!fs.existsSync(this.topologyPath)) {
        logger.warn(`TargetResolver: Topoloji dosyası bulunamadı: ${this.topologyPath}`);
        return;
      }

      const content = fs.readFileSync(this.topologyPath, 'utf-8');
      this.topology = JSON.parse(content);
      this.flattenNodes();
      this.initFuse();
      logger.info(`TargetResolver: ${this.nodes.length} adet aranabilir düğüm indekslendi.`);
    } catch (err: any) {
      logger.error(`TargetResolver: Topoloji yükleme hatası: ${err.message}`);
    }
  }

  /**
   * Hiyerarşik topoloji ağacını tek boyutlu aranabilir düğümlere dönüştürür.
   * Standart akademik dersler ile Yazılı Provaları gibi paket sekmeleri titizlikle ayrıştırır.
   */
  private flattenNodes(): void {
    this.nodes = [];
    if (!this.topology?.gradeLevels) return;

    for (const [levelKey, levelData] of Object.entries(this.topology.gradeLevels)) {
      if (!levelData) continue;
      const gradeName = levelData.gradeName || levelKey;
      const gradeNumMatch = gradeName.match(/\d+/);
      const gradeNum = gradeNumMatch ? gradeNumMatch[0] : '';

      for (const subject of levelData.subjects) {
        const subTitleLower = subject.title.toLowerCase();
        const isYaziliBundle = subTitleLower.includes('yazılı provaları') || subTitleLower.includes('yazili provalari') || subTitleLower.includes('yazılı');
        const isKampBundle = subTitleLower.includes('kamp') || subTitleLower.includes('tatil');
        const isExamsBundle = subTitleLower.includes('denemeler') || subTitleLower.includes('testler') || subject.id.includes('deneme');
        const isBundle = isYaziliBundle || isKampBundle || isExamsBundle;

        const subjectPath: PathStep[] = (subject.pathSequence && subject.pathSequence.length > 0)
          ? subject.pathSequence
          : [
              { action: 'CLICK', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
              { action: 'CLICK', target: subject.title, selector: subject.selector || `a.box:has-text("${subject.title}")` },
              { action: 'CLICK', target: 'Derse Başla', selector: 'a.start-lesson-button:has-text("Derse Başla"), a.start-lesson-button, a:has-text("Derse Başla"), button:has-text("Derse Başla")' }
            ];

        // 1. Subject Düğümü Oluşturma
        if (isYaziliBundle) {
          // Yazılı Provaları Ana Kartı
          const yaziliAliases = Array.from(new Set([
            'yazılı provaları',
            'yazılı prova',
            'yazılılar',
            'yazılı',
            'yazili',
            'yazili provalari',
            'yazılı sınavı',
            'yazılı sınavları',
            `${gradeName.toLowerCase()} yazılı provaları`,
            `${gradeName.toLowerCase()} yazılı`,
            `${gradeNum}. sınıf yazılı provaları`,
            `${gradeNum}. sınıf yazılı`,
            `${gradeNum} yazılı provaları`,
            `${gradeNum} yazılı`,
            subject.title.toLowerCase(),
            ...(subject.aliases || []).map(a => a.toLowerCase())
          ]));

          this.nodes.push({
            nodeId: subject.id,
            title: subject.title,
            type: 'PANEL',
            levelKey,
            gradeName,
            subjectId: subject.id,
            subjectTitle: subject.title,
            pathSequence: subjectPath,
            returnSequence: subject.returnSequence,
            selector: subject.selector,
            aliases: yaziliAliases,
            keywords: ['yazılı', 'prova', 'provaları', 'sınav', ...subject.title.toLowerCase().split(' ')].filter(w => w.length > 2),
            isBundle: true,
            bundleType: 'YAZILI_PROVALARI'
          });
        } else {
          // Standart Akademik Ders veya Kamp Kartı
          const matchedDiscipline = ACADEMIC_DISCIPLINES.find(d => 
            d.patterns.some(p => p.test(subject.title))
          );

          let primaryAliases = (subject.aliases || []).map(a => a.toLowerCase());
          if (matchedDiscipline && !isBundle) {
            const dName = matchedDiscipline.display.toLowerCase();
            const dKey = matchedDiscipline.key;
            primaryAliases.push(
              dName,
              `${dName} dersi`,
              `${gradeName.toLowerCase()} ${dName}`,
              `${gradeNum}. sınıf ${dName}`,
              `${gradeNum} ${dName}`,
              `${gradeNum} ${dKey}`,
              subject.title.toLowerCase()
            );
            if (matchedDiscipline.aliases) {
              for (const al of matchedDiscipline.aliases) {
                primaryAliases.push(al, `${gradeName.toLowerCase()} ${al}`, `${gradeNum} ${al}`);
              }
            }
          }
          primaryAliases = Array.from(new Set(primaryAliases));

          this.nodes.push({
            nodeId: subject.id,
            title: subject.title,
            type: 'PANEL',
            levelKey,
            gradeName,
            subjectId: subject.id,
            subjectTitle: subject.title,
            pathSequence: subjectPath,
            returnSequence: subject.returnSequence,
            selector: subject.selector,
            aliases: primaryAliases,
            keywords: [
              ...(matchedDiscipline ? [matchedDiscipline.key, matchedDiscipline.display.toLowerCase()] : []),
              ...subject.title.toLowerCase().split(' ')
            ].filter(w => w.length > 2),
            isBundle,
            bundleType: isKampBundle ? 'KAMP' : (isExamsBundle ? 'EXAMS' : undefined),
            isPrimarySubject: !isBundle && !!matchedDiscipline,
            discipline: matchedDiscipline?.key
          });
        }

        // 2. Üniteleri İndeksle
        const unitMap = new Map<string, { unitTitle: string; unitId?: string; selector?: string }>();
        for (const topic of subject.topics) {
          if (topic.unitTitle && topic.unitTitle.length > 1 && !unitMap.has(topic.unitTitle)) {
            const stepSelector = topic.pathSequence?.find(s => s.target === topic.unitTitle)?.selector;
            unitMap.set(topic.unitTitle, {
              unitTitle: topic.unitTitle,
              unitId: topic.unitId,
              selector: stepSelector
            });
          }
        }

        for (const [uTitle, uInfo] of unitMap.entries()) {
          const cleanName = uTitle.replace(/^\d+[\.\s\u00a0]*Ünite\s*/i, '').trim();
          if (cleanName.length > 1) {
            const unitForwardPath: PathStep[] = [
              { action: 'GRADE', target: gradeName },
              { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
              { action: 'CLICK', target: subject.title, selector: subject.selector || `a.box:has-text("${subject.title}")` },
              { action: 'CLICK', target: 'Derse Başla', selector: 'a.start-lesson-button:has-text("Derse Başla"), a.start-lesson-button' },
              { action: 'CLICK', target: uTitle, selector: uInfo.selector || `li.unit-list-item:has-text("${cleanName}")` }
            ];
            const unitReturnPath: PathStep[] = [
              { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
              { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
            ];

            const unitAliases = isYaziliBundle
              ? [
                  `${cleanName.toLowerCase()}`,
                  `${gradeName.toLowerCase()} ${cleanName.toLowerCase()}`,
                  `${cleanName.toLowerCase()} provaları`,
                  `${cleanName.toLowerCase()} provası`
                ]
              : [
                  cleanName.toLowerCase(),
                  uTitle.toLowerCase(),
                  `${cleanName.toLowerCase()} ünitesi`,
                  `${cleanName.toLowerCase()} konusu`,
                  `${subject.title.toLowerCase()} ${cleanName.toLowerCase()}`
                ];

            this.nodes.push({
              nodeId: `${subject.id}_u_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
              title: cleanName,
              type: 'TAB',
              levelKey,
              gradeName,
              subjectId: subject.id,
              subjectTitle: subject.title,
              unitId: uInfo.unitId,
              unitTitle: uTitle,
              pathSequence: unitForwardPath,
              returnSequence: unitReturnPath,
              selector: uInfo.selector,
              aliases: unitAliases.filter(Boolean),
              keywords: [
                ...cleanName.toLowerCase().split(' '),
                ...subject.title.toLowerCase().split(' ')
              ].filter(w => w.length > 2),
              isBundle,
              bundleType: isYaziliBundle ? 'YAZILI_PROVALARI' : undefined,
              isBundleSubItem: isBundle
            });
          }
        }

        // 3. Konuları İndeksle
        for (const topic of subject.topics) {
          const topicPath: PathStep[] = (topic.pathSequence && topic.pathSequence.length > 0)
            ? topic.pathSequence
            : [
                { action: 'GRADE', target: gradeName },
                { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
                { action: 'CLICK', target: subject.title, selector: subject.selector || `a.box:has-text("${subject.title}")` },
                { action: 'CLICK', target: 'Derse Başla', selector: 'a.start-lesson-button:has-text("Derse Başla"), a.start-lesson-button' },
                ...(topic.unitTitle ? [{ action: 'CLICK' as const, target: topic.unitTitle, selector: `li.unit-list-item:has-text("${topic.unitTitle}")` }] : []),
                { action: 'CLICK' as const, target: topic.title, selector: topic.selector || `li.topic-list-item:has-text("${topic.title}")` }
              ];

          const topicReturn: PathStep[] = topic.returnSequence || subject.returnSequence || [
            { action: 'NAVIGATE', target: 'Dersler', selector: 'a.link:has-text("Dersler")' },
            { action: 'NAVIGATE', target: 'Ana Sayfa', selector: 'a.link:has-text("Ana Sayfa")' }
          ];

          let topicAliases: string[] = [];
          let topicDiscipline: string | undefined = undefined;

          if (isYaziliBundle) {
            // Yazılı Provaları altındaki ders konusu (örn: "Matematik" veya "Türkçe")
            const cleanUnit = (topic.unitTitle || '').replace(/^\d+[\.\s\u00a0]*Ünite\s*/i, '').trim();
            const matchedTopicDiscipline = ACADEMIC_DISCIPLINES.find(d => 
              d.patterns.some(p => p.test(topic.title)) || topic.title.toLowerCase().includes(d.key)
            );
            topicDiscipline = matchedTopicDiscipline?.key;

            topicAliases = [
              `${topic.title.toLowerCase()} yazılı provası`,
              `${topic.title.toLowerCase()} yazılısı`,
              `${topic.title.toLowerCase()} yazılı`,
              `${topic.title.toLowerCase()} yazili`,
              `yazılı provası ${topic.title.toLowerCase()}`,
              `yazılı provaları ${topic.title.toLowerCase()}`,
              `yazılı ${topic.title.toLowerCase()}`,
              `${gradeName.toLowerCase()} ${topic.title.toLowerCase()} yazılı provası`,
              `${gradeName.toLowerCase()} ${topic.title.toLowerCase()} yazılısı`,
              `${gradeNum}. sınıf ${topic.title.toLowerCase()} yazılı provası`,
              `${gradeNum} ${topic.title.toLowerCase()} yazılı provası`,
              `${gradeNum} ${topic.title.toLowerCase()} yazılısı`,
              `${cleanUnit.toLowerCase()} ${topic.title.toLowerCase()}`,
              `${topic.title.toLowerCase()} ${cleanUnit.toLowerCase()}`
            ];
          } else {
            // Standart ders konusu
            topicAliases = [
              topic.title.toLowerCase(),
              `${topic.title.toLowerCase()} konusu`,
              `${subject.title.toLowerCase()} ${topic.title.toLowerCase()}`,
              ...(topic.aliases || []).map(a => a.toLowerCase())
            ];
          }

          this.nodes.push({
            nodeId: topic.id,
            title: isYaziliBundle ? `${topic.title} (${topic.unitTitle || 'Yazılı Provası'})` : topic.title,
            type: 'TAB',
            levelKey,
            gradeName,
            subjectId: subject.id,
            subjectTitle: subject.title,
            unitId: topic.unitId,
            unitTitle: topic.unitTitle,
            topicId: topic.id,
            topicTitle: topic.title,
            pathSequence: topicPath,
            returnSequence: topicReturn,
            selector: topic.selector,
            aliases: topicAliases,
            keywords: isYaziliBundle
              ? ['yazılı', 'prova', topic.title.toLowerCase(), ...topic.title.toLowerCase().split(' ')]
              : (topic.keywords || []),
            isBundle,
            bundleType: isYaziliBundle ? 'YAZILI_PROVALARI' : undefined,
            isBundleSubItem: isBundle,
            discipline: topicDiscipline
          });

          // 4. Materyalleri İndeksle (Video, Test vb.)
          for (const item of topic.items) {
            const itemPath: PathStep[] = (item.pathSequence && item.pathSequence.length > 0)
              ? item.pathSequence
              : [
                  ...topicPath,
                  { action: 'CLICK' as const, target: item.title, selector: item.selector || `a:has-text("${item.title}")` }
                ];

            let itemAliases = (item.aliases || []).map(a => a.toLowerCase());
            if (isYaziliBundle) {
              itemAliases.push(
                item.title.toLowerCase(),
                `${topic.title.toLowerCase()} yazılı provası testi`,
                `${topic.title.toLowerCase()} yazılı provası çöz`,
                `${topic.title.toLowerCase()} yazılı testi`
              );
            }

            this.nodes.push({
              nodeId: item.id,
              title: item.title,
              type: item.type,
              levelKey,
              gradeName,
              subjectId: subject.id,
              subjectTitle: subject.title,
              unitId: item.unitId || topic.unitId,
              unitTitle: item.unitTitle || topic.unitTitle,
              topicId: topic.id,
              topicTitle: topic.title,
              pathSequence: itemPath,
              returnSequence: item.returnSequence || topicReturn,
              selector: item.selector,
              urlState: item.urlState,
              aliases: itemAliases,
              keywords: item.keywords || [],
              isBundle,
              bundleType: isYaziliBundle ? 'YAZILI_PROVALARI' : undefined,
              isBundleSubItem: isBundle,
              discipline: topicDiscipline
            });
          }

          // Konu İçerikleri altındaki en sondaki Konu Testi düğümü
          if (!isYaziliBundle) {
            const hasExistingTest = topic.items.some(i => i.type === 'TEST' || i.title.toLowerCase().includes('test'));
            if (!hasExistingTest) {
              const cleanTopic = topic.title.replace(/^\d+[\.\s\u00a0]*/, '').trim();
              const topicTestPath: PathStep[] = [
                ...topicPath,
                { action: 'CLICK', target: `${cleanTopic} Konu Testi`, selector: 'a.item-link:has-text("Konu Testi"), a.item-link:has-text("Testi"), a.item-link:has-text("Pekiştirme"), a.item-link:has-text("Çıkmış")' }
              ];

              this.nodes.push({
                nodeId: `${topic.id}_konu_testi`,
                title: `${cleanTopic} Konu Testi`,
                type: 'TEST',
                levelKey,
                gradeName,
                subjectId: subject.id,
                subjectTitle: subject.title,
                unitId: topic.unitId,
                unitTitle: topic.unitTitle,
                topicId: topic.id,
                topicTitle: topic.title,
                pathSequence: topicTestPath,
                returnSequence: topicReturn,
                selector: 'a.item-link:has-text("Konu Testi"), a.item-link:has-text("Testi")',
                aliases: [
                  'konu testi',
                  'konu testleri',
                  'pekiştirme testi',
                  'çıkmış sorular',
                  'konu içerikleri testi',
                  `${cleanTopic.toLowerCase()} konu testi`,
                  `${cleanTopic.toLowerCase()} testi`,
                  `${cleanTopic.toLowerCase()} pekiştirme testi`,
                  `${cleanTopic.toLowerCase()} çıkmış sorular`,
                  `${cleanTopic.toLowerCase()} test çöz`,
                  `${subject.title.toLowerCase()} ${cleanTopic.toLowerCase()} testi`,
                  `${cleanTopic.toLowerCase()} konu içerikleri testi`
                ],
                keywords: [
                  'konu',
                  'test',
                  'testi',
                  'pekiştirme',
                  'içerik',
                  'içerikleri',
                  'soru',
                  ...cleanTopic.toLowerCase().split(' ')
                ].filter(w => w.length > 2),
                isBundle: false,
                isBundleSubItem: false
              });
            }
          }
        }
      }
    }
  }

  /**
   * Fuse.js ağırlıklı indeksini yapılandırır
   */
  private initFuse(): void {
    this.fuse = new Fuse(this.nodes, {
      keys: [
        { name: 'title', weight: 0.35 },
        { name: 'aliases', weight: 0.25 },
        { name: 'keywords', weight: 0.18 },
        { name: 'unitTitle', weight: 0.12 },
        { name: 'subjectTitle', weight: 0.06 },
        { name: 'topicTitle', weight: 0.04 },
      ],
      includeScore: true,
      shouldSort: true,
      threshold: 0.6,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }

  /**
   * Türkçe karakter ve arama metni normalizasyonu
   */
  private normalizeQuery(q: string): string {
    return q
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .trim();
  }

  /**
   * Kullanıcının serbest metin isteğini topolojideki tekil hedefe (nodeId) çözer.
   *
   * @param query Kullanıcı metni (Örn: "12 mat son test", "6. sınıf matematik", "6. sınıf matematik yazılı provası")
   * @param preferredGrade Tercih edilen sınıf/seviye (örn: "12. Sınıf", "8. Sınıf", "HIGH_YKS")
   */
  public async resolveTarget(query: string, preferredGrade?: string): Promise<TargetResolveResult> {
    if (!query || query.trim().length === 0) {
      return { success: false, confidence: 0, method: 'HEURISTIC_FALLBACK', error: 'Boş sorgu.' };
    }

    if (!this.fuse || this.nodes.length === 0) {
      this.loadTopology();
      if (!this.fuse || this.nodes.length === 0) {
        return { success: false, confidence: 0, method: 'HEURISTIC_FALLBACK', error: 'Topoloji grafı yüklenemedi.' };
      }
    }

    const trimmed = query.trim();
    logger.info(`TargetResolver: Hedef aranıyor: "${trimmed}" (Tercih edilen sınıf: ${preferredGrade || 'Belirtilmedi'})`);

    const intent = this.detectIntent(trimmed);
    const targetGradeNorm = intent.detectedGrade || preferredGrade || '';

    const matchesGrade = (node: SearchableNode, gradeNorm: string): boolean => {
      if (!gradeNorm) return true;
      const nG = this.normalizeQuery(node.gradeName);
      const nL = this.normalizeQuery(node.levelKey);
      const gNorm = this.normalizeQuery(gradeNorm);

      const num = gNorm.match(/\d+/)?.[0];
      if (num) {
        const nodeNum = nG.match(/\d+/)?.[0] || nL.match(/\d+/)?.[0];
        if (nodeNum && nodeNum === num) return true;
      }
      if ((gNorm.includes('lgs') || gNorm.includes('ortaokul')) && (nG.includes('lgs') || nL.includes('lgs') || nG.includes('8') || nL.includes('middle'))) return true;
      if ((gNorm.includes('yks') || gNorm.includes('tyt') || gNorm.includes('ayt')) && (nG.includes('yks') || nL.includes('yks') || nG.includes('12') || nL.includes('high') || nG.includes('2028'))) return true;

      return nG.includes(gNorm) || nL.includes(gNorm);
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. DETERMINISTIK HEDEF ÇÖZÜMLEME (DERSLER VS. YAZILI PROVALARI AYRIMI)
    // ─────────────────────────────────────────────────────────────────────────────

    // A) YAZILI PROVALARI İSTEĞİ: Kullanıcı açıkça "yazılı", "prova", "yazılısı" dediyse
    if (intent.isYaziliQuery) {
      logger.info(`TargetResolver [Niyet]: Yazılı Provaları isteği tespit edildi.`);

      if (intent.detectedDiscipline) {
        // Belirli bir dersin yazılısı istendi (örn: "6. sınıf matematik yazılı provası", "fizik yazılısı")
        const yaziliDisciplineCandidate = this.nodes.find(n => 
          n.bundleType === 'YAZILI_PROVALARI' &&
          n.isBundleSubItem &&
          n.discipline === intent.detectedDiscipline!.key &&
          matchesGrade(n, targetGradeNorm)
        ) || this.nodes.find(n => 
          n.bundleType === 'YAZILI_PROVALARI' &&
          n.isBundleSubItem &&
          matchesGrade(n, targetGradeNorm) &&
          (n.title.toLowerCase().includes(intent.detectedDiscipline!.display.toLowerCase()) || 
           n.topicTitle?.toLowerCase().includes(intent.detectedDiscipline!.display.toLowerCase()) ||
           n.aliases.some(a => a.includes(intent.detectedDiscipline!.display.toLowerCase())))
        );

        if (yaziliDisciplineCandidate) {
          logger.info(`TargetResolver [Yazılı Dersi Eşleşmesi ✓]: "${yaziliDisciplineCandidate.title}" [${yaziliDisciplineCandidate.nodeId}]`);
          return {
            success: true,
            node: yaziliDisciplineCandidate,
            confidence: 0.98,
            method: 'EXACT_MATCH'
          };
        }
      }

      // Genel Yazılı Provaları kartı istendi (örn: "yazılı provaları", "6. sınıf yazılı provaları")
      const yaziliCardCandidate = this.nodes.find(n =>
        n.bundleType === 'YAZILI_PROVALARI' &&
        !n.isBundleSubItem &&
        matchesGrade(n, targetGradeNorm)
      );

      if (yaziliCardCandidate) {
        logger.info(`TargetResolver [Yazılı Ana Kartı Eşleşmesi ✓]: "${yaziliCardCandidate.title}" [${yaziliCardCandidate.nodeId}]`);
        return {
          success: true,
          node: yaziliCardCandidate,
          confidence: 1.0,
          method: 'EXACT_MATCH'
        };
      }
    }

    // B) STANDART AKADEMİK DERS İSTEĞİ: Kullanıcı normal bir ders istediyse (yazılı/kamp/deneme istemediyse)
    if (intent.detectedDiscipline && !intent.isYaziliQuery && !intent.isKampQuery && !intent.isExamQuery) {
      // Birincil ders kartını bul (örn: 6. Sınıf Reflekslerle Matematik, LGS Türkçe, 10. Sınıf Serüvenlerle Fizik)
      const primarySubjectNode = this.nodes.find(n => 
        n.isPrimarySubject && 
        n.discipline === intent.detectedDiscipline!.key &&
        matchesGrade(n, targetGradeNorm)
      );

      // Kullanıcı yalnızca dersin kendisini mi istedi? (Özel konu adı veya test/video istemediyse)
      const remainingTokens = trimmed
        .replace(/(?:\d+)\.?\s*s[ıi]n[ıi]f|yks\s*2028|lgs/gi, '')
        .replace(intent.detectedDiscipline.patterns[0], '')
        .replace(/\b(dersi|dersine|dersini|gir|aç|git|başla|seç|konusu)\b/gi, '')
        .trim();

      if (primarySubjectNode && remainingTokens.length < 3 && !intent.isTestOrQuizQuery && !intent.isVideoQuery) {
        logger.info(`TargetResolver [Standart Ders Eşleşmesi ✓]: "${primarySubjectNode.title}" [${primarySubjectNode.nodeId}]`);
        return {
          success: true,
          node: primarySubjectNode,
          confidence: 1.0,
          method: 'EXACT_MATCH'
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. TAM METİN & ALIAS EŞLEŞMESİ (Tam Başlık veya Takma Ad)
    // ─────────────────────────────────────────────────────────────────────────────
    const exactMatch = this.nodes.find(n => {
      if (!intent.isYaziliQuery && (n.bundleType === 'YAZILI_PROVALARI' || n.isBundleSubItem)) return false;
      if (intent.isYaziliQuery && n.bundleType !== 'YAZILI_PROVALARI') return false;

      if (!matchesGrade(n, targetGradeNorm)) {
        return false;
      }

      return (
        n.title.toLowerCase() === trimmed.toLowerCase() ||
        n.aliases.some(a => a.toLowerCase() === trimmed.toLowerCase())
      );
    });

    if (exactMatch) {
      logger.info(`TargetResolver [Tam Eşleşme ✓]: "${exactMatch.title}" [${exactMatch.nodeId}]`);
      return {
        success: true,
        node: exactMatch,
        confidence: 1.0,
        method: 'EXACT_MATCH'
      };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. FUSE.JS AĞIRLIKLI BULANIK ARAMA & NİYET CEZALARI
    // ─────────────────────────────────────────────────────────────────────────────
    const searchResults = this.fuse.search(trimmed);

    if (searchResults.length === 0) {
      logger.warn(`TargetResolver: Bulanık aramada hiçbir aday bulunamadı: "${trimmed}"`);
      return {
        success: false,
        confidence: 0,
        method: 'HEURISTIC_FALLBACK',
        error: `Hedef haritada bulunamadı: "${trimmed}"`
      };
    }

    let ranked = searchResults.map(r => {
      let score = r.score ?? 1.0;
      const node = r.item;

      if (!intent.isYaziliQuery && (node.bundleType === 'YAZILI_PROVALARI' || node.isBundleSubItem || node.subjectTitle.toLowerCase().includes('yazılı'))) {
        score += 1.5;
      }
      if (intent.isYaziliQuery && node.bundleType !== 'YAZILI_PROVALARI') {
        score += 1.5;
      }
      if (!intent.isKampQuery && (node.bundleType === 'KAMP' || node.subjectTitle.toLowerCase().includes('kamp'))) {
        score += 0.8;
      }
      if (!intent.isExamQuery && (node.subjectTitle.toLowerCase().includes('deneme') || node.nodeId.includes('tarama'))) {
        score += 0.8;
      }

      if (targetGradeNorm) {
        if (matchesGrade(node, targetGradeNorm)) {
          score -= 0.20;
        } else {
          score += 0.30;
        }
      }

      if (intent.detectedDiscipline) {
        if (node.discipline === intent.detectedDiscipline.key || node.subjectTitle.toLowerCase().includes(intent.detectedDiscipline.display.toLowerCase())) {
          score -= 0.15;
        }
      }

      return { node, score };
    });

    ranked.sort((a, b) => a.score - b.score);

    const topCandidate = ranked[0];
    const confidence = Math.max(0, 1 - topCandidate.score);
    logger.info(`TargetResolver [Fuse En İyi Aday]: "${topCandidate.node.title}" (Skor: ${topCandidate.score.toFixed(3)}, Benzerlik: %${(confidence * 100).toFixed(1)})`);

    const runnerUp = ranked[1];
    const isDominant = !runnerUp || (runnerUp.score - topCandidate.score > 0.15);

    if (topCandidate.score <= 0.25 && isDominant) {
      return {
        success: true,
        node: topCandidate.node,
        confidence,
        method: 'FUZZY_TOP',
        alternatives: ranked.slice(1, 4).map(r => r.node)
      };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. EŞLEŞME İKİLEMİNDE GEMİNİ / HEURİSTİK TEKİLLEŞTİRME
    // ─────────────────────────────────────────────────────────────────────────────
    const topCandidates = ranked.slice(0, 3).map(r => r.node);
    logger.info(`TargetResolver: Eşleşme ikilemi mevcut (${topCandidates.length} olası aday). Tekilleştirme çalıştırılıyor...`);

    if (this.genAI) {
      try {
        const disambiguatedNode = await this.disambiguateWithGemini(trimmed, topCandidates);
        if (disambiguatedNode) {
          logger.info(`TargetResolver [Gemini Tekilleştirme ✓]: "${disambiguatedNode.title}" [${disambiguatedNode.nodeId}]`);
          return {
            success: true,
            node: disambiguatedNode,
            confidence: 0.95,
            method: 'GEMINI_DISAMBIGUATION',
            alternatives: topCandidates.filter(c => c.nodeId !== disambiguatedNode.nodeId)
          };
        }
      } catch (geminiErr: any) {
        logger.warn(`TargetResolver: Gemini tekilleştirme çağrısı başarısız oldu: ${geminiErr.message}`);
      }
    }

    const heuristicMatch = this.disambiguateHeuristically(trimmed, topCandidates);
    logger.info(`TargetResolver [Heuristik Tekilleştirme ✓]: "${heuristicMatch.title}" [${heuristicMatch.nodeId}]`);

    return {
      success: true,
      node: heuristicMatch,
      confidence: 0.85,
      method: 'HEURISTIC_FALLBACK',
      alternatives: topCandidates.filter(c => c.nodeId !== heuristicMatch.nodeId)
    };
  }

  /**
   * Gemini API'ye başvurarak kullanıcının niyetini 3 aday arasından tekil bir hedefe indirger.
   */
  private async disambiguateWithGemini(query: string, candidates: SearchableNode[]): Promise<SearchableNode | null> {
    if (!this.genAI) return null;

    const candidateListStr = candidates.map((c, i) => 
      `${i + 1}. ID: "${c.nodeId}" | Başlık: "${c.title}" | Ders: "${c.subjectTitle}" | Konu: "${c.topicTitle || '-'}" | Tür: ${c.type} | Sınıf: ${c.gradeName}`
    ).join('\n');

    const prompt = `
Kullanıcı Doping Hafıza uygulamasında şu hedefi arıyor:
Kullanıcı Metni: "${query}"

Aday Seçenekler:
${candidateListStr}

GÖREV:
Kullanıcının niyetine en uygun tek bir adayı seç.
ÖNEMLİ KURAL:
- Kullanıcı normal bir ders istediyse (örn: "matematik", "türkçe", "fizik"), ASLA "Yazılı Provaları" veya "Kamp" altındaki bir adayı seçme!
- Yalnızca kullanıcı açıkça "yazılı" veya "prova" dediyse "Yazılı Provaları" seçeneğini seç.

Cevap olarak YALNIZCA seçilen adayın ID değerini yaz (Örn: "${candidates[0].nodeId}").
Başka hiçbir açıklama veya metin ekleme.
`.trim();

    const response = await this.genAI.models.generateContent({
      model: this.geminiModel,
      contents: prompt,
    });

    const output = (response.text || '').trim().replace(/["'`]/g, '');
    const matched = candidates.find(c => c.nodeId === output || output.includes(c.nodeId));
    return matched || null;
  }

  /**
   * Gemini API yoksa veya yanıt vermezse takılıp kalmamak için kural tabanlı tekilleştirme.
   */
  private disambiguateHeuristically(query: string, candidates: SearchableNode[]): SearchableNode {
    const q = this.normalizeQuery(query);
    const intent = this.detectIntent(query);

    if (intent.isTestOrQuizQuery) {
      const testMatch = candidates.find(c => c.type === 'TEST');
      if (testMatch) return testMatch;
    }

    if (intent.isVideoQuery) {
      const videoMatch = candidates.find(c => c.type === 'VIDEO');
      if (videoMatch) return videoMatch;
    }

    if (!intent.isTestOrQuizQuery && !intent.isVideoQuery) {
      const nonTestMatch = candidates.find(c => c.type === 'PANEL' || c.type === 'TAB');
      if (nonTestMatch) return nonTestMatch;
    }

    const numberMatch = q.match(/(\d+)/);
    if (numberMatch) {
      const num = numberMatch[1];
      const matchWithNum = candidates.find(c => c.title.includes(num) || c.aliases.some(a => a.includes(num)));
      if (matchWithNum) return matchWithNum;
    }

    if (q.includes('son')) {
      const sonMatch = candidates.find(c => c.title.toLowerCase().includes('son') || c.nodeId.includes('son'));
      if (sonMatch) return sonMatch;
    }

    return candidates[0];
  }
}
