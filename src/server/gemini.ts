import { GoogleGenAI, Type, Schema } from '@google/genai';
import { TestActionPlan, TargetLevel, TestPlanStep, ActionType, StepParams } from '../types/index.ts';
import { logger } from './logger.ts';
import { AppKnowledgeBase } from './knowledge/AppKnowledgeBase.ts';
import { TargetResolver } from '../ai/TargetResolver.ts';
import { SearchableNode, PathStep } from '../shared/types/topology.ts';

const ACTION_PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      description: "Kullanıcının yapmak istediği işin anlaşılır Türkçe özeti",
    },
    targetLevel: {
      type: Type.STRING,
      enum: ["PRIMARY", "MIDDLE_LGS", "HIGH_YKS"],
      description: "Doping Hafıza eğitim seviyesi (İlkokul, Ortaokul/LGS, Lise/YKS)",
    },
    steps: {
      type: Type.ARRAY,
      description: "Doping Hafıza hiyerarşisine ve Playwright çalışma sırasına tam uygun sıralı test adımları",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Benzersiz adım kimliği (örn: step_1)" },
          action: {
            type: Type.STRING,
            enum: [
              "CHANGE_LEVEL",
              "GO_HOME",
              "DISMISS_POPUPS",
              "NAVIGATE_TO",
              "VIDEO_CONTROL",
              "SOLVE_QUIZ",
              "DRAG_AND_DROP",
              "VERIFY_ELEMENT",
              "WAIT",
            ],
            description: "Çalıştırılacak Playwright aksiyon türü",
          },
          title: { type: Type.STRING, description: "Kullanıcıya gösterilecek adım başlığı" },
          description: { type: Type.STRING, description: "Adımın ayrıntılı açıklaması" },
          params: {
            type: Type.OBJECT,
            properties: {
              menu: { type: Type.STRING, description: "Sol menü başlığı (örn: Dersler, Testler ve Denemeler, WAY Evreni, Lgs Yolculuğum)" },
              targetGrade: { type: Type.STRING, description: "Seçilecek tam sınıf (örn: 8. Sınıf, 12. Sınıf, 4. Sınıf, YKS 2028)" },
              subject: { type: Type.STRING, description: "Ders adı (örn: AYT Kampı, Matematik, Fen Bilimleri)" },
              unitTitle: { type: Type.STRING, description: "Ünite başlığı (örn: 1. Ünite AYT Matematik, 1. Ünite Çarpanlar ve Katlar)" },
              topic: { type: Type.STRING, description: "Konu veya test başlığı (örn: Trigonometri, Parabol, Üslü Sayılar)" },
              testName: { type: Type.STRING, description: "Sınav veya deneme adı (örn: LGS 1. Deneme, Bireysel Denemeler)" },
              subTab: { type: Type.STRING, description: "Sınav alt sekmesi (örn: Bireysel Denemeler, Tarama Testleri)" },
              contentItem: { type: Type.STRING, description: "Konu İçerikleri altındaki spesifik video veya test adı (örn: Konu Testi, Pekiştirme Testi, Çıkmış Sorular)" },
              isTopicTest: { type: Type.BOOLEAN, description: "Konu İçerikleri altındaki konu testine/sorularına gidileceği" },
              leaveHalfway: { type: Type.BOOLEAN, description: "Testi yarıda bırakıp 'Testi Yarıda Bırak' modal butonuyla çıkma" },
              questionCount: { type: Type.STRING, description: "Çözülecek soru sayısı (örn: '1', '3', '5') veya tüm sorular için 'ALL'. Kullanıcı özel sayı belirtmediyse varsayılan '1'dir." },
              targetNodeId: { type: Type.STRING, description: "Hedef topoloji düğüm ID'si" },
              speed: { type: Type.NUMBER, description: "Video oynatma hızı (örn: 1.25, 1.5, 2.0)" },
              durationSec: { type: Type.NUMBER, description: "Videoyu izleme veya bekleme süresi saniye cinsinden" },
              reWatch: { type: Type.BOOLEAN, description: "Videoyu baştan/tekrar izleme" },
              seekToEnd: { type: Type.BOOLEAN, description: "Videoyu son 2 saniyeye sararak tamamlama / soru modunu tetikleme" },
              quizStrategy: {
                type: Type.STRING,
                enum: ["RANDOM", "ALL_CORRECT", "LEAVE_EMPTY", "ALL_WRONG"],
                description: "Test/quiz çözme taktiği",
              },
              reSolve: { type: Type.BOOLEAN, description: "Önceden çözülmüş testi baştan/tekrar çözme" },
              dragSource: { type: Type.STRING, description: "Sürüklenecek eleman tanımı/etiketi" },
              dropTarget: { type: Type.STRING, description: "Bırakılacak hedef kutusu/alanı" },
              targetAssertion: { type: Type.STRING, description: "Doğrulanacak element/ekran" },
              assertionType: {
                type: Type.STRING,
                enum: ["VISIBLE", "HIDDEN", "NOT_CRASHED"],
                description: "Doğrulama kriteri",
              },
            },
          },
        },
        required: ["id", "action", "params"],
      },
    },
  },
  required: ["intent", "targetLevel", "steps"],
};

const SYSTEM_PROMPT = `
Sen Doping Hafıza Masaüstü (Electron) ve Playwright Test Otomasyonu için Baş Rota Planlayıcısı ve AI Mimarısın.
Görevin: Kullanıcının söylediği serbest metni (günlük konuşma, devrik cümleler, takma isimler, eksik ifadeler) analiz edip Doping Hafıza uygulamasının GERÇEK HİYERARŞİSİNE uygun olarak sıralamak ve Playwright'ın anlayıp harfiyen icra edeceği deterministik bir aksiyon planına (TestActionPlan) dönüştürmektir.

DOPİNG HAFIZA UYGULAMASINDA HİYERARŞİK SIRALAMA KURALLARI:
1. Sınıf Seçimi (CHANGE_LEVEL):
   - Eğer kullanıcı belirli bir sınıf/seviye belirttiyse veya hedefin sınıfı belliyse (örn: "8. Sınıf", "12. Sınıf", "4. Sınıf", "YKS 2028"):
     İlk adımda mutlaka CHANGE_LEVEL ekle (params: { targetGrade: "...", level: "..." }).
   - KESİNLİKLE YASAKLI SINIFLAR: 1, 2, 3. Sınıf ve 2, 3, 4 Yaş (Bu sınıflara ASLA geçiş planı üretme, hata fırlatılır).
2. Temiz Başlangıç (GO_HOME):
   - Kullanıcı "ana sayfaya dön" dediğinde veya açık modal / arayüz kalıntılarını temizlemek gerektiğinde GO_HOME adımı ekle.
3. Menü & Ders Navigasyonu (NAVIGATE_TO):
   - Doping Hafıza'da dersler ve içerikler hiyerarşik yapıdadır:
     * Sol Menü ("Dersler") ➡️ Ders Kartı (örn: "AYT Kampı", "LGS Reflekslerle Matematik") ➡️ "Derse Başla" Butonu ➡️ Sol Paneldeki Ünite (örn: "1. Ünite AYT Matematik") ➡️ Sağ Paneldeki Konu (örn: "Trigonometri")
     * Testler ve Denemeler paneli: Sol Menü ("Testler ve Denemeler") ➡️ Alt Sekme ("Bireysel Denemeler" / "Tarama Testleri") ➡️ Sınav Kartı
     * WAY Evreni: Sol Menü ("WAY Evreni") ➡️ Alt Bölüm Kartı (örn: "WAY Startup Lab")
   - NAVIGATE_TO adımının "params" parametrelerini eksiksiz doldur:
     menu, targetGrade, subject, unitTitle, topic, testName, subTab, contentItem, isTopicTest, targetNodeId.
   - SANA SAĞLANAN ADAY DÜĞÜMLER LİSTESİNDEN (candidates) KULLANICININ İSTEDİĞİNE EN UYGUN ADAYIN ID'SİNİ (targetNodeId) MUTLAKA EKLE!

DERSLER PANELİ VE YAZILI PROVALARI KESİN AYRIMI:
- Standart Ders İstekleri: Kullanıcı bir ders adı söylediğinde (örn: "6. sınıf matematik", "8. sınıf türkçe", "10. sınıf fizik", "ayt kimya", "biyoloji", "lgs matematik"):
  * Hedef KESİNLİKLE 'Yazılı Provaları' DEĞİLDİR!
  * Daima doğrudan bağımsız akademik ders kartını seç (örn: '6. Sınıf Reflekslerle Matematik', 'LGS Türkçe', '10. Sınıf Serüvenlerle Fizik').
  * 'subject' parametresine ASLA 'Yazılı Provaları' yazma!
- Yazılı Provaları İstekleri: YALNIZCA kullanıcı açıkça 'yazılı', 'yazılı provası', 'yazılısı' gibi kelimeler kullandığında (örn: '6. sınıf matematik yazılı provası', 'yazılı provaları', '10. sınıf fizik yazılısı'):
  * Hedef 'Yazılı Provaları'dır.
  * 'subject': "Yazılı Provaları", alt ders istendiyse 'topic': "Matematik" / "Fizik" vs. olmalıdır.

DERS İÇİ KONU TESTLERİ ("Konu İçerikleri" Başlığı Altındaki Testler):
- Kullanıcı "konu testi", "konu testleri", "pekiştirme testi", "konu içeriklerindeki test", "en sondaki test", "çıkmış sorular", "konu testi 1" gibi ifadeler kullandığında:
  * Bu KESİNLİKLE "Testler ve Denemeler" paneli DEĞİLDİR!
  * Bu, dersin konusuna girildikten sonra ekrandaki "Konu İçerikleri" listesinin en altındaki konu testidir!
  * NAVIGATE_TO adımına mutlaka: { menu: "Dersler", subject: "...", topic: "...", contentItem: "Konu Testi", isTopicTest: true } ekle.
  * Ardından SOLVE_QUIZ adımını ekle.
  * ASLA "Testler ve Denemeler" sayfasına yönlendirme!
4. Video Aksiyonu (VIDEO_CONTROL):
   - Kullanıcı video izlemek, hızlandırmak veya bitirmek istediğinde ekle:
     * speed: 1.25, 1.5 veya 2.0 (varsayılan: 2.0)
     * durationSec: izleme süresi
     * seekToEnd: true (kullanıcı "videoyu tamamla", "videoyu bitir", "sonuna sar", "soruları çöz" dediyse videoyu son 2 saniyeye sararak soru modunu açmak için)
     * reWatch: true (eğer önceden izlenmiş bir video baştan izlenmek isteniyorsa)
5. Test Çözme ve Soru Sayısı Kuralları (SOLVE_QUIZ):
   - Kural 1: Kullanıcı yalnızca "testi çöz", "konu testini çöz", "soruları çöz", "çöz" dediyse (özel soru sayısı veya tümü belirtilmediyse):
     * questionCount: 1 (Varsayılan olarak 1 soru çözüp ardından onay modalında 'Testi Bitir' seçerek testi bitirir!)
   - Kural 2: Kullanıcı belirli bir soru sayısı belirttiyse (örn: "3 soru çöz", "5 soru yap", "2 soru cevapla"):
     * questionCount: belirtilen sayı (örn: 3, 5, 2)
   - Kural 3: Kullanıcı "tüm soruları çöz", "bütün soruları çöz", "hepsini çöz", "testi bitir" dediyse:
     * questionCount: "ALL" (Testteki tüm soruları sonuna kadar çözer ve ardından testi bitirir!)
   - Kural 4: Kullanıcı "yarıda bırak", "yarım bırak", "yarıda kes", "testten çık" dediyse:
     * leaveHalfway: true (İstenen veya 1 soru çözüp açılan onay modalında 'Testi Yarıda Bırak' seçeneğiyle güvenle ayrılır!)
   - quizStrategy: "ALL_CORRECT" (varsayılan), "RANDOM", "ALL_WRONG", "LEAVE_EMPTY"
   - reSolve: true (önceden çözülmüş bir test baştan çözülmek isteniyorsa)
6. Doğrulama (VERIFY_ELEMENT):
   - Kullanıcı analiz ekranını, çökme durumunu veya sonuçları kontrol etmek istediğinde ekle (assertionType: "NOT_CRASHED" | "VISIBLE").

ÖRNEK DÖNÜŞÜMLER:
- Örnek 1: "12. sınıf AYT matematikte trigonometri konusundaki pekiştirme testini çöz"
  Adımlar:
  1. CHANGE_LEVEL { targetGrade: "12. Sınıf", level: "HIGH_YKS" }
  2. NAVIGATE_TO { menu: "Dersler", subject: "AYT Kampı", unitTitle: "1. Ünite AYT Matematik", topic: "Trigonometri", targetGrade: "12. Sınıf", targetNodeId: "<aday id>" }
  3. SOLVE_QUIZ { quizStrategy: "ALL_CORRECT", reSolve: false }
  4. VERIFY_ELEMENT { targetAssertion: "Analiz Paneli & Ekran Sağlığı", assertionType: "NOT_CRASHED" }

- Örnek 2: "8. sınıf çarpanlar ve katlar videosunu 2 kat hızla izle ve tamamla"
  Adımlar:
  1. CHANGE_LEVEL { targetGrade: "8. Sınıf", level: "MIDDLE_LGS" }
  2. NAVIGATE_TO { menu: "Dersler", subject: "LGS Reflekslerle Matematik", topic: "Çarpanlar ve Katlar", targetGrade: "8. Sınıf", targetNodeId: "<aday id>" }
  3. VIDEO_CONTROL { speed: 2.0, durationSec: 2, seekToEnd: true }
  4. VERIFY_ELEMENT { targetAssertion: "Video Oynatıcı", assertionType: "VISIBLE" }

- Örnek 3: "lgs deneme sınavı çöz"
  Adımlar:
  1. CHANGE_LEVEL { targetGrade: "8. Sınıf", level: "MIDDLE_LGS" }
  2. NAVIGATE_TO { menu: "Testler ve Denemeler", subTab: "Bireysel Denemeler", testName: "LGS Denemesi", targetGrade: "8. Sınıf" }
  3. SOLVE_QUIZ { quizStrategy: "RANDOM", reSolve: false }
  4. VERIFY_ELEMENT { targetAssertion: "Sınav Sonuç ve Analiz", assertionType: "NOT_CRASHED" }
`.trim();

export class GeminiPlanner {
  private client: GoogleGenAI | null = null;
  private apiKey: string = '';

  constructor(apiKey?: string) {
    this.setApiKey(apiKey || process.env.GEMINI_API_KEY || '');
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        TargetResolver.getInstance().setApiKey(this.apiKey);
        logger.info('Gemini GenAI client başarıyla başlatıldı ve TargetResolver ile senkronize edildi.');
      } catch (err: any) {
        logger.error(`Gemini GenAI client başlatma hatası: ${err.message}`);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public hasApiKey(): boolean {
    return !!this.apiKey && !!this.client;
  }

  public async parsePrompt(prompt: string): Promise<TestActionPlan> {
    logger.info(`Test komutu ayrıştırılıyor: "${prompt}"`);

    // 0. Yasaklı Sınıf Koruması (1, 2, 3. Sınıf ve 2, 3, 4 Yaş Kesinlikle Yasaktır)
    const p = prompt.toLowerCase().trim();
    const forbiddenMatches = p.match(/(?<!\d)(?:[1-3])\.?\s*sınıf|(?<!\d)(?:[2-4])\s*yaş/);
    if (forbiddenMatches) {
      logger.warn(`GeminiPlanner: Kullanıcı yasaklı sınıf (${forbiddenMatches[0]}) belirtti. Bu sınıflara geçiş yapılmaz.`);
      throw new Error(`Yasaklı sınıf/seviye (${forbiddenMatches[0]}): 1, 2, 3. sınıf ve 2, 3, 4 yaş kesinlikle desteklenmemektedir.`);
    }

    // Hedef Sınıf Tespiti
    let detectedGrade: string | undefined;
    if (p.includes("yks 2028") || p.includes("2028")) {
      detectedGrade = "YKS 2028";
    } else {
      const gradeMatch = p.match(/(\d+)\.?\s*sınıf/);
      if (gradeMatch) {
        const num = parseInt(gradeMatch[1], 10);
        if (num >= 4 && num <= 12) detectedGrade = `${num}. Sınıf`;
      } else if (p.includes("lgs") || p.includes("ortaokul")) {
        detectedGrade = "8. Sınıf";
      } else if (p.includes("yks") || p.includes("ayt") || p.includes("tyt") || p.includes("lise")) {
        detectedGrade = "12. Sınıf";
      } else if (p.includes("ilkokul")) {
        detectedGrade = "4. Sınıf";
      }
    }

    // 1. Topolojiden En Olası Hedef Adaylarını Çek (4.000+ düğüm içinden RAG desteği)
    const candidates = TargetResolver.getInstance().findTopCandidates(prompt, detectedGrade, 8);

    // 2. Gemini API aktifse LLM ile Doping Hafıza hiyerarşisinde tam sıralama yap
    if (this.client) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

      const candidateContext = candidates.length > 0
        ? `DOPİNG HAFIZA VERİTABANINDAN (app_topology.json) TESPİT EDİLEN EN OLASI ADAY DÜĞÜMLER:\n` +
          candidates.map((c, idx) => 
            `[Aday ${idx + 1}] ID: "${c.nodeId}" | Sınıf: "${c.gradeName}" | Ders: "${c.subjectTitle}" | Ünite: "${c.unitTitle || '-'}" | Başlık: "${c.title}" | Tür: ${c.type}`
          ).join('\n')
        : 'Özel bir ders/konu düğümü tespit edilemedi; sol menü veya deneme paneli yönlendirmesini değerlendir.';

      const userContent = `
KULLANICI EMRİ: "${prompt}"
${detectedGrade ? `KULLANICININ İSTEDİĞİ SINIF: "${detectedGrade}"` : ''}

${candidateContext}

GÖREV:
1. Kullanıcının niyetini (ders, konu, video, test veya menü isteği) tam olarak anla.
2. Yukarıdaki adaylardan kullanıcının kastettiği en doğru hedefi seç.
3. Doping Hafıza'nın gerçek sıralama hiyerarşisine (` + '`[Sınıf Seçimi: CHANGE_LEVEL] ➡️ [Sol Menü: NAVIGATE_TO] ➡️ [Ders & Konu: NAVIGATE_TO] ➡️ [Aksiyon: VIDEO_CONTROL / SOLVE_QUIZ] ➡️ [Doğrulama: VERIFY_ELEMENT]`' + `) uygun deterministik Playwright JSON aksiyon planı üret.
`.trim();

      for (const modelName of modelsToTry) {
        try {
          const response = await this.client.models.generateContent({
            model: modelName,
            contents: userContent,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              responseSchema: ACTION_PLAN_SCHEMA,
              temperature: 0.1,
            },
          });

          const text = response.text?.trim() || '{}';
          const parsed = JSON.parse(text) as TestActionPlan;
          logger.info(`Gemini (${modelName}) Doping Hafıza hiyerarşisinde plan oluşturdu (${parsed.steps?.length || 0} adım): ${parsed.intent}`);
          return this.enrichAndNormalizePlan(parsed, prompt, candidates);
        } catch (err: any) {
          logger.warn(`Gemini API (${modelName}) çağrısı başarısız oldu (${err.message}).`);
        }
      }
    }

    // 3. Fallback: Deterministik Akıllı Dahili Türkçe NLP & Topoloji Ayrıştırıcı
    const fallbackPlan = this.fallbackNLPParse(prompt);
    return this.enrichAndNormalizePlan(fallbackPlan, prompt, candidates);
  }

  /**
   * Gemini'nin veya dahili çözücünün ürettiği planı doğrular, topoloji grafındaki tam pathSequence ve returnSequence ile zenginleştirir.
   */
  private enrichAndNormalizePlan(plan: TestActionPlan, prompt: string, candidates: SearchableNode[]): TestActionPlan {
    if (!plan.steps || !Array.isArray(plan.steps)) plan.steps = [];
    if (!plan.intent) plan.intent = prompt;
    if (!plan.targetLevel) plan.targetLevel = "HIGH_YKS";

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step.id) step.id = `step_${i + 1}`;

      if (step.action === 'NAVIGATE_TO') {
        // Eğer Testler ve Denemeler sayfasıysa veya alt sekmesi belirtilmişse ve ders aranmıyorsa ders adayıyla ezme!
        if (step.params.menu && step.params.menu !== 'Dersler' && !step.params.topic && !step.params.subject) {
          continue;
        }

        const targetId = step.params.targetNodeId;
        const matchedCandidate = (targetId && candidates.find(c => c.nodeId === targetId)) ||
          candidates.find(c => 
            (step.params.topic && (c.title.toLowerCase().includes(step.params.topic.toLowerCase()) || step.params.topic.toLowerCase().includes(c.title.toLowerCase()))) ||
            (step.params.unitTitle && c.unitTitle?.toLowerCase().includes(step.params.unitTitle.toLowerCase())) ||
            (step.params.subject && c.subjectTitle?.toLowerCase().includes(step.params.subject.toLowerCase()))
          ) || (step.params.topic ? candidates[0] : undefined);

        if (matchedCandidate && matchedCandidate.pathSequence) {
          step.params.targetNodeId = matchedCandidate.nodeId;
          step.params.pathSequence = matchedCandidate.pathSequence;
          step.params.returnSequence = matchedCandidate.returnSequence;
          step.params.targetGrade = step.params.targetGrade || matchedCandidate.gradeName;
          step.params.subject = step.params.subject || matchedCandidate.subjectTitle || matchedCandidate.title;
          step.params.unitTitle = step.params.unitTitle || matchedCandidate.unitTitle;
          if (!matchedCandidate.isPrimarySubject && (!matchedCandidate.isBundle || matchedCandidate.isBundleSubItem)) {
            step.params.topic = step.params.topic || matchedCandidate.title;
          } else {
            step.params.topic = undefined;
          }

          if (!step.title) {
            step.title = matchedCandidate.unitTitle 
              ? `${matchedCandidate.subjectTitle} › ${matchedCandidate.unitTitle} › ${matchedCandidate.title}`
              : `${matchedCandidate.subjectTitle || matchedCandidate.title} Navigasyonu`;
          }
          if (!step.description) {
            step.description = `Doping Hafıza Rotası: [${matchedCandidate.gradeName}] ${matchedCandidate.pathSequence.map(s => s.target).join(' ➡️ ')}`;
          }
        }

        // Eğer konu testi isteniyorsa ve pathSequence son adımı henüz konu testi değilse ekle
        if (step.params.isTopicTest && step.params.pathSequence && step.params.pathSequence.length > 0) {
          const lastStep = step.params.pathSequence[step.params.pathSequence.length - 1];
          if (!lastStep.target.toLowerCase().includes('test')) {
            step.params.pathSequence.push({
              action: 'CLICK',
              target: step.params.contentItem || 'Konu Testi',
              selector: 'a.item-link:has-text("Konu Testi"), a.item-link:has-text("Testi"), a.item-link:has-text("Pekiştirme"), a.item-link:has-text("Çıkmış")'
            });
          }
        }
      }

      if (step.action === 'SOLVE_QUIZ') {
        const p = prompt.toLowerCase();
        const isAll = p.includes("tüm soru") || p.includes("tum soru") || p.includes("bütün soru") || p.includes("butun soru") || p.includes("hepsini çöz") || p.includes("hepsini coz") || p.includes("tümünü çöz") || p.includes("tumunu coz") || p.includes("bütün soruları") || p.includes("tüm soruları") || step.params.questionCount === 'ALL';
        const countMatch = p.match(/(\d+)\s*(?:tane\s*)?(?:adet\s*)?soru/i);

        if (isAll) {
          step.params.questionCount = 'ALL';
        } else if (countMatch) {
          step.params.questionCount = parseInt(countMatch[1], 10);
        } else if (step.params.questionCount && step.params.questionCount !== 'ALL') {
          const parsed = parseInt(String(step.params.questionCount), 10);
          step.params.questionCount = !isNaN(parsed) && parsed > 0 ? parsed : 1;
        } else {
          step.params.questionCount = 1; // Kullanıcı kuralı: "çöz deniyorsa 1 soru çözüp testi bitirsin"
        }
      }
    }

    return plan;
  }

  /**
   * Dinamik, İsteğe Duyarlı Türkçe NLP Ayrıştırıcı
   * Kullanıcının emrini tam olarak anlayıp YALNIZCA istenen adımları üretir.
   */
  public fallbackNLPParse(rawPrompt: string): TestActionPlan {
    const p = rawPrompt.toLowerCase().trim();

    // ── 1. Sınıf ve Seviye Analizi ──
    let targetGrade: string | undefined;
    let targetLevel: TargetLevel = "HIGH_YKS";

    // Yasaklı sınıflar kontrolü (1, 2, 3. sınıf ve 2, 3, 4 yaş kesinlikle hariç, 11 veya 12 gibi sayıları bozmaz)
    const forbiddenMatches = p.match(/(?<!\d)(?:[1-3])\.?\s*sınıf|(?<!\d)(?:[2-4])\s*yaş/);
    if (forbiddenMatches) {
      logger.warn(`GeminiPlanner: Kullanıcı yasaklı sınıf (${forbiddenMatches[0]}) belirtti. Bu sınıflara geçiş yapılmaz.`);
      throw new Error(`Yasaklı sınıf/seviye (${forbiddenMatches[0]}): 1, 2, 3. sınıf ve 2, 3, 4 yaş kesinlikle desteklenmemektedir.`);
    } else if (p.includes("yks 2028") || p.includes("2028")) {
      targetGrade = "YKS 2028";
      targetLevel = "HIGH_YKS";
    } else {
      const gradeMatch = p.match(/(\d+)\.?\s*sınıf/);
      if (gradeMatch) {
        const num = parseInt(gradeMatch[1], 10);
        if (num >= 4 && num <= 12) {
          targetGrade = `${num}. Sınıf`;
          targetLevel = num <= 4 ? "PRIMARY" : num <= 8 ? "MIDDLE_LGS" : "HIGH_YKS";
        }
      } else if (p.includes("ortaokul") || p.includes("lgs")) {
        targetGrade = "8. Sınıf";
        targetLevel = "MIDDLE_LGS";
      } else if (p.includes("lise") || p.includes("yks") || p.includes("ayt") || p.includes("tyt")) {
        targetGrade = "12. Sınıf";
        targetLevel = "HIGH_YKS";
      } else if (p.includes("ilkokul")) {
        targetGrade = "4. Sınıf";
        targetLevel = "PRIMARY";
      }
    }

    const steps: TestPlanStep[] = [];
    let stepCount = 1;

    // Sınıf değiştirme komutu var mı?
    const isExplicitGradeChange = !!targetGrade && (
      p.includes("geç") || p.includes("yap") || p.includes("değiştir") ||
      p.includes("seç") || p.includes("sınıf") || p.includes("ortaokul") ||
      p.includes("lise") || p.includes("ilkokul") || p.includes("2028")
    );

    if (isExplicitGradeChange && targetGrade) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "CHANGE_LEVEL",
        params: {
          targetGrade,
          level: targetLevel,
        },
        title: `Sınıfı "${targetGrade}" Olarak Değiştir`,
        description: `Sağ üstteki sınıf menüsünden "${targetGrade}" seçeneğini seçer.`,
      });
    }

    // ── 2. Panel İçi Alt Bölüm, Test ve Menü Tespiti ──
    let handled = false;
    let targetMenu: string | undefined;

    // A) Belirli bir Deneme / Büyük Sınav mı isteniyor?
    // DİKKAT: Kullanıcı günlük kullanımda "test", "test çöz", "soruları çöz", "üslü sayılar testi", "matematik testi"
    // dediğinde bu KESİNLİKLE DERS İÇİ TESTTİR (#/concept-v3-material-page).
    // Testler ve Denemeler paneline (#/examinations-v2) YALNIZCA kullanıcı açıkça "deneme", "lgs deneme",
    // "ayt deneme", "tyt deneme", "branş denemesi", "seviye tespit", "sts", "turbo deneme", "çıkmış sınav",
    // "deneme kulübü" veya menü adı "testler ve denemeler" dediğinde gidilmelidir!
    const isTopicTestQuery =
      p.includes("konu test") ||
      p.includes("pekiştirme") ||
      p.includes("ısınma test") ||
      p.includes("ustalık test") ||
      p.includes("kazanım test") ||
      p.includes("çıkmış soru") ||
      p.includes("içerik") ||
      p.includes("içerikleri") ||
      p.includes("en son test") ||
      p.includes("son test") ||
      (p.includes("test") && (
        p.includes("matematik") || p.includes("türkçe") || p.includes("fen") || 
        p.includes("fizik") || p.includes("kimya") || p.includes("biyoloji") || 
        p.includes("üslü") || p.includes("köklü") || p.includes("parabol") || 
        p.includes("fonksiyon") || p.includes("polinom") || p.includes("trigonometri") ||
        p.includes("çarpanlar") || p.includes("ünite") || p.includes("konu")
      ));

    const isExplicitExamQuery =
      !isTopicTestQuery &&
      (p.includes("deneme") ||
       p.includes("seviye tespit") ||
       p.includes("seviye belirleme") ||
       p.includes("sts") ||
       p.includes("turbo") ||
       p.includes("ösym") ||
       p.includes("meb sınavı") ||
       p.includes("testler ve denemeler") ||
       p.includes("bireysel denemeler") ||
       (p.includes("tarama test") && (p.includes("sekme") || p.includes("menü") || p.includes("bölüm")))) &&
      !p.includes("ders içi") &&
      !p.includes("video soru") &&
      !p.includes("konu anlatım") &&
      !p.includes("soruları çöz");

    const isMenuOnlyTestlerVeDenemeler = 
      p === "testler ve denemeler" || 
      p === "testler ve denemeler sayfası" || 
      p === "testler ve denemeler sayfasına git" ||
      p === "testler ve denemeler menüsü" ||
      p === "testler ve denemelere git";

    if (isMenuOnlyTestlerVeDenemeler) {
      handled = true;
      targetMenu = "Testler ve Denemeler";
      steps.push({
        id: `step_${stepCount++}`,
        action: "NAVIGATE_TO",
        params: {
          menu: "Testler ve Denemeler",
        },
        title: `"Testler ve Denemeler" Sayfasına Git`,
        description: `Sol menü üzerinden "Testler ve Denemeler" sayfasına gider.`,
      });
    } else if (isExplicitExamQuery) {
      const testMatch = AppKnowledgeBase.findTest(rawPrompt, targetGrade);
      if (testMatch) {
        handled = true;
        targetMenu = "Testler ve Denemeler";
        if (!targetGrade) targetGrade = testMatch.grade;
        logger.info(`GeminiPlanner [KB→Deneme]: "${rawPrompt}" → [${testMatch.grade}] ${testMatch.subTab} › "${testMatch.testName}"`);
        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            menu: "Testler ve Denemeler",
            subTab: testMatch.subTab,
            testName: testMatch.testName,
            targetGrade: testMatch.grade,
          },
          title: `"${testMatch.testName}" Sınavına Git (${testMatch.subTab})`,
          description: `Testler ve Denemeler › ${testMatch.subTab} sekmesinden "${testMatch.testName}" sınavını açar.`,
        });
      }
    }

    // B) WAY Evreni alt bölümü mü isteniyor?
    if (!handled) {
      const wayMatch = AppKnowledgeBase.findWaySection(rawPrompt);
      if (wayMatch) {
        handled = true;
        targetMenu = "WAY Evreni";
        logger.info(`GeminiPlanner [KB→WAY]: "${rawPrompt}" → WAY Evreni › "${wayMatch.title}"`);
        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            menu: "WAY Evreni",
            subSection: wayMatch.title,
          },
          title: `WAY Evreni › "${wayMatch.title}" Bölümüne Git`,
          description: `WAY Evreni panelinden "${wayMatch.title}" alt kartını açar.`,
        });
      }
    }

    // C) LGS Yolculuğum alt sekmesi mi isteniyor?
    if (!handled) {
      const isLgsExplicit = p.includes("lgs") || p.includes("yolculuğum") || p.includes("yolculugum");
      const lgsMatch = isLgsExplicit ? AppKnowledgeBase.findLgsJourneyTab(rawPrompt) : null;
      if (lgsMatch) {
        handled = true;
        targetMenu = "Lgs Yolculuğum";
        logger.info(`GeminiPlanner [KB→LGS Yolculuğum]: "${rawPrompt}" → Lgs Yolculuğum › "${lgsMatch.tabName}"`);
        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            menu: "Lgs Yolculuğum",
            subTab: lgsMatch.tabName,
            targetGrade: "8. Sınıf",
          },
          title: `LGS Yolculuğum › "${lgsMatch.tabName}" Sekmesine Git`,
          description: `LGS Yolculuğum panelinden "${lgsMatch.tabName}" sekmesini açar.`,
        });
      }
    }

    // D) Genel Sol Menü Tespiti (Özel alt bölüm bulunamadıysa)
    if (!handled) {
      if (p.includes("akıllı değerlendirme") || p.includes("değerlendirme paneli")) {
        targetMenu = "Akıllı Değerlendirme Paneli";
      } else if (p.includes("istatistik") || p.includes("istastistik")) {
        targetMenu = "İstatistikler";
      } else if (p.includes("testler ve denemeler") || p.includes("denemeler") || p.includes("deneme") || p.includes("sınavlar")) {
        targetMenu = "Testler ve Denemeler";
      } else if (p.includes("rehberlik")) {
        targetMenu = "Rehberlik Videoları";
      } else if (p.includes("lgs yolculuğum") || p.includes("yolculuğum")) {
        targetMenu = "Lgs Yolculuğum";
      } else if (p.includes("way") || p.includes("way evreni")) {
        targetMenu = "WAY Evreni";
      } else if (p.includes("canlı etkinlik")) {
        targetMenu = "Canlı Etkinlikler";
      } else if (p.includes("öğrencilerimizden dinleyin") || p.includes("öğrenci görüş") || p.includes("öğrenci yorum")) {
        targetMenu = "Öğrencilerimizden Dinleyin";
      } else if (p.includes("çözücü") || p.includes("cozucu")) {
        targetMenu = "Çözücü";
      } else if (p.includes("şimdi anladım") || p.includes("simdi anladim")) {
        targetMenu = "Şimdi Anladım";
      } else if (p.includes("koçum yanımda") || p.includes("kocum yanimda")) {
        targetMenu = "Koçum Yanımda";
      } else if (p.includes("bire bir") || p.includes("birebir")) {
        targetMenu = "Bire Bir Uygulamalar";
      } else if (p.includes("yardım")) {
        targetMenu = "Yardım Merkezi";
      } else if (p.includes("dersler") && !p.includes("mat") && !p.includes("türkçe") && !p.includes("fen")) {
        targetMenu = "Dersler";
      }

      if (targetMenu) {
        handled = true;
        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            menu: targetMenu,
          },
          title: `"${targetMenu}" Sayfasına Git`,
          description: `Sol menü üzerinden "${targetMenu}" sayfasına gider.`,
        });
      }
    }

    // Açıkça Ana Sayfa isteniyor mu?
    if (p.includes("ana sayfa") || p.includes("başa dön") || p.includes("dashboard")) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "GO_HOME",
        params: {},
        title: "Ana Sayfaya Dön",
        description: "Temiz zemin için Ana Sayfa (#/dashboard) ekranına gider.",
      });
    }

    // Açıkça Pop-up kapatma isteniyor mu?
    if (p.includes("pop-up") || p.includes("popup") || p.includes("modal kapat") || p.includes("engelleri temizle")) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "DISMISS_POPUPS",
        params: {},
        title: "Pop-up ve Modalları Kapat",
        description: "Ekrandaki bildirim ve modal pencerelerini temizler.",
      });
    }

    // ── 3. Ders ve Konu Analizi (KB tabanlı) ──
    if (!handled) {
      // Doğrudan "derse başla" veya "derse gir" komutu
      if (p === "derse başla" || p === "derse basla" || p.includes("derse başla") || p.includes("derse basla") || p === "derse gir" || p === "derse tıkla" || p === "derse tikla") {
        handled = true;
        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            topic: "Derse Başla",
          },
          title: '"Derse Başla" Butonuna Tıkla',
          description: 'Ders kartındaki "Derse Başla" butonuna basarak dersin içine girer.',
        });
      }
    }

    // Doğrudan testten çıkma veya yarıda bırakma komutu mu? (örn: "testi yarıda bırak", "testten çık", "yarıda bırak")
    const isOnlyExitOrHalfway = (
      p.includes("yarıda bırak") ||
      p.includes("yarım bırak") ||
      p.includes("yarıda kes") ||
      p.includes("yarım kes") ||
      p.includes("testten çık") ||
      p.includes("yarıda çık") ||
      p.includes("yarım çık") ||
      (p.includes("bırak") && (p.includes("test") || p.includes("soru")))
    ) && !p.includes("git") && !p.includes("gir") && !p.includes("başla") && !p.includes("aç") &&
      !['mat', 'geometri', 'türkçe', 'turkce', 'edebiyat', 'fen', 'fizik', 'kimya', 'biyoloji', 'sayı', 'parabol', 'fonksiyon', 'ünite', 'unite'].some(w => p.includes(w));

    if (isOnlyExitOrHalfway) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "SOLVE_QUIZ",
        params: {
          quizStrategy: "RANDOM",
          leaveHalfway: true,
        },
        title: "Testi Yarıda Bırak (Testi Yarıda Bırak)",
        description: "Aktif test ekranındaki 'Testi Bitir' butonuna tıklar ve onay modalında 'Testi Yarıda Bırak' butonunu seçerek güvenle ayrılır.",
      });
      return {
        intent: `Kullanıcı Emri: "${rawPrompt}"`,
        targetLevel,
        steps,
      };
    }

    // Topoloji grafından en olası adayları çek (5.000+ düğüm içinden RAG)
    const topTopologyCandidates = TargetResolver.getInstance().findTopCandidates(rawPrompt, targetGrade, 3);
    const bestCandidate = topTopologyCandidates.length > 0 ? topTopologyCandidates[0] : null;

    // Ders/Konu analizi için açık bir ders veya konu adı geçiyor mu ya da topolojide bir eşleşme var mı?
    const hasExplicitLessonMention = [
      'mat', 'geometri', 'türkçe', 'turkce', 'edebiyat', 'fen', 'fizik', 'kimya', 'biyoloji',
      'tarih', 'coğrafya', 'cografya', 'felsefe', 'ingilizce', 'english', 'din', 'inkılap', 'inkilap',
      'ünite', 'unite', 'konu', 'kamp'
    ].some(w => p.includes(w)) || (p.includes("ders") && !p.includes("derse başla") && !p.includes("derse gir")) || !!bestCandidate;

    if (!handled && hasExplicitLessonMention) {
      let subject: string | undefined;
      let topic: string | undefined;
      let unitTitle: string | undefined;
      let pathSequence: PathStep[] | undefined;
      let returnSequence: PathStep[] | undefined;
      let targetNodeId: string | undefined;
      let selector: string | undefined;

      if (bestCandidate) {
        if (bestCandidate.isPrimarySubject || (bestCandidate.isBundle && !bestCandidate.isBundleSubItem)) {
          subject = bestCandidate.title;
          topic = undefined;
          unitTitle = undefined;
        } else if (bestCandidate.isBundleSubItem) {
          subject = bestCandidate.subjectTitle || "Yazılı Provaları";
          topic = bestCandidate.title;
          unitTitle = bestCandidate.unitTitle;
        } else {
          subject = bestCandidate.subjectTitle || bestCandidate.title;
          topic = bestCandidate.title;
          unitTitle = bestCandidate.unitTitle;
        }
        pathSequence = bestCandidate.pathSequence;
        returnSequence = bestCandidate.returnSequence;
        targetNodeId = bestCandidate.nodeId;
        selector = bestCandidate.selector;
        if (!targetGrade && bestCandidate.gradeName) {
          targetGrade = bestCandidate.gradeName;
        }
        logger.info(`GeminiPlanner [Topoloji]: "${rawPrompt}" → [${bestCandidate.gradeName}] ${subject} › ${unitTitle || '-'} › ${topic || '-'} (${pathSequence?.length || 0} adımlı rota)`);
      } else {
        // Önce KB fuzzy arama ile çöz
        const kbLesson = AppKnowledgeBase.findLesson(rawPrompt, targetGrade);

        if (kbLesson) {
          subject = kbLesson.lessonCard
            .replace(/^(TYT|AYT|LGS Reflekslerle|LGS Serüvenlerle)\s*/i, '')
            .trim();

          const u = kbLesson.unit.toLowerCase();
          const hasTopicInPrompt = p.includes(u) ||
            (kbLesson.topics && kbLesson.topics.some(t => p.includes(t.toLowerCase()))) ||
            p.includes("konu") || p.includes("ünite") || p.includes("unite");

          if (hasTopicInPrompt) {
            topic = kbLesson.unit;
            logger.info(`GeminiPlanner [KB]: "${rawPrompt}" → Ders: "${subject}", Konu: "${topic}" (${kbLesson.grade})`);
          } else {
            logger.info(`GeminiPlanner [KB]: "${rawPrompt}" → Doğrudan Ders Kartı: "${subject}" (${kbLesson.grade})`);
          }

          if (!targetGrade) {
            targetGrade = kbLesson.grade;
          }
        } else {
          const isYazili = p.includes("yazılı") || p.includes("yazili") || p.includes("prova");
          if (isYazili) {
            subject = "Yazılı Provaları";
          } else {
            if (p.includes("mat") || p.includes("geometri")) subject = "Matematik";
            else if (p.includes("türkçe") || p.includes("edebiyat")) subject = "Türkçe";
            else if (p.includes("fen") || p.includes("fen bilimleri")) subject = "Fen Bilimleri";
            else if (p.includes("fizik")) subject = "Fizik";
            else if (p.includes("kimya")) subject = "Kimya";
            else if (p.includes("biyoloji")) subject = "Biyoloji";
            else if (p.includes("tarih")) subject = "Tarih";
            else if (p.includes("coğrafya") || p.includes("cografya")) subject = "Coğrafya";
            else if (p.includes("felsefe")) subject = "Felsefe";
            else if (p.includes("ingilizce") || p.includes("english")) subject = "İngilizce";
          }

          if (p.includes("üslü sayılar") || p.includes("üslü") || p.includes("uslu")) topic = "Üslü Sayılar";
          else if (p.includes("köklü sayılar") || p.includes("köklü") || p.includes("koklu")) topic = "Köklü Sayılar";
          else if (p.includes("çarpanlar ve katlar") || p.includes("çarpanlara ayırma")) topic = "Çarpanlar ve Katlar";
          else if (p.includes("fonksiyonlar") || p.includes("fonksiyon")) topic = "Fonksiyonlar";
          else if (p.includes("paragraf")) topic = "Paragraf";
          else if (p.includes("sözcükte anlam") || p.includes("sozcuk anlam")) topic = "Sözcükte Anlam";
          else if (p.includes("cümlede anlam") || p.includes("cumlede anlam")) topic = "Cümlede Anlam";
          else if (p.includes("kuvvet") || p.includes("hareket")) topic = "Kuvvet ve Hareket";
          else if (p.includes("yazılı prova") || p.includes("yazili prova")) topic = "Yazılı Provaları";
          else if (p.includes("logaritma") || p.includes("log")) topic = "Logaritma";
          else if (p.includes("türev") || p.includes("turev")) topic = "Türev";
          else if (p.includes("integral")) topic = "İntegral";
          else if (p.includes("olasılık") || p.includes("olasilik")) topic = "Olasılık";
          else if (p.includes("trigonometri") || p.includes("sinüs") || p.includes("kosinüs")) topic = "Trigonometri";
          else if (p.includes("denklem")) topic = "Denklemler";
          else if (p.includes("küme") || p.includes("kume")) topic = "Kümeler";
          else if (p.includes("mantık") || p.includes("mantik")) topic = "Mantık";
          else if (p.includes("veri analizi") || p.includes("istatistik")) topic = "Veri Analizi";
          else if (p.includes("dizi") || p.includes("seri")) topic = "Diziler";
          else if (p.includes("atom") || p.includes("periyodik")) topic = "Atom ve Periyodik Sistem";
          else if (p.includes("hücre") || p.includes("hucre")) topic = "Hücre";
          else if (p.includes("genetik") || p.includes("dna")) topic = "DNA ve Genetik Kod";
        }
      }

      // Kullanıcı doğrudan "test çöz", "soruları çöz" demiş ancak ders belirtmemişse varsayılan olarak Matematik'e git
      if (!subject && !topic && (p.includes("test") || p.includes("soru") || p.includes("quiz"))) {
        subject = "Matematik";
      }

      if (subject || topic) {
        const finalSubject = subject || "Matematik";

        // Kullanıcı konu içeriklerindeki bir testi mi istiyor?
        const isTopicTest = isTopicTestQuery || (p.includes("test") && !p.includes("deneme"));

        let contentItem: string | undefined;
        if (isTopicTest) {
          if (p.includes("pekiştirme")) contentItem = "Pekiştirme Testi";
          else if (p.includes("çıkmış")) contentItem = "Çıkmış Sorular";
          else if (p.includes("ısınma")) contentItem = "Isınma Testi";
          else if (p.includes("ustalık")) contentItem = "Ustalık Testi";
          else if (p.includes("kazanım")) contentItem = "Kazanım Testi";
          else contentItem = "Konu Testi";
        }

        // Eğer isTopicTest ise ve pathSequence varsa, en sona konu testi tıklama adımını ekle
        let finalPathSequence = pathSequence;
        if (isTopicTest && pathSequence && pathSequence.length > 0) {
          finalPathSequence = [
            ...pathSequence,
            { action: 'CLICK', target: contentItem || 'Konu Testi', selector: 'a.item-link:has-text("Konu Testi"), a.item-link:has-text("Testi")' }
          ];
        }

        steps.push({
          id: `step_${stepCount++}`,
          action: "NAVIGATE_TO",
          params: {
            menu: "Dersler",
            subject: finalSubject,
            unitTitle,
            topic,
            targetGrade,
            targetNodeId,
            pathSequence: finalPathSequence,
            returnSequence,
            selector,
            contentItem,
            isTopicTest: isTopicTest || undefined,
          },
          title: isTopicTest
            ? (unitTitle && topic
                ? `${finalSubject} › ${unitTitle} › ${topic} › ${contentItem || 'Konu Testi'}`
                : `${finalSubject} › ${topic} › ${contentItem || 'Konu Testi'}`)
            : (unitTitle && topic
                ? `${finalSubject} › ${unitTitle} › ${topic}`
                : topic
                ? `${finalSubject} › ${topic} Modülüne Git`
                : `"${finalSubject}" Dersine Gir`),
          description: isTopicTest
            ? `Ders içindeki "${topic}" konusuna girer ve 'Konu İçerikleri' altındaki en sondaki ${contentItem || 'Konu Testi'} bağlantısına tıklar.`
            : (pathSequence && pathSequence.length > 0
              ? `Doping Hafıza Rotası: [${targetGrade || 'Seviye'}] ${pathSequence.map(s => s.target).join(' ➡️ ')}`
              : (topic
                ? `KB yönlendirmesi: ${finalSubject} / ${topic} içeriğine gider.`
                : `Dersler sayfasından "${finalSubject}" kartına tıklar ve "Derse Başla" butonuna basarak dersin içine girer.`)),
        });
        handled = true;
      }
    }

    // ── 4. Video Kontrolü ──
    const isSeekToEnd = p.includes("tamamla") ||
                        p.includes("video soru") ||
                        p.includes("videodaki soru") ||
                        p.includes("videoyu bitir") ||
                        p.includes("son iki saniye") ||
                        p.includes("son 2 saniye") ||
                        p.includes("sona sar") ||
                        p.includes("sonuna sar") ||
                        p.includes("ileri sar");

    const isReWatch = p.includes("tekrar izle") || p.includes("baştan izle") || p.includes("tekrar oynat") || p.includes("baştan oynat") || p.includes("tekrar video");
    const hasVideoIntent = isSeekToEnd || isReWatch || p.includes("video") || p.includes("izle") || p.includes("2x") || p.includes("1.5x") || p.includes("oynat") || p.includes("hızlandır");

    if (hasVideoIntent) {
      let speed = 1.0;
      if (p.includes("2x") || p.includes("iki kat") || p.includes("2 kat")) speed = 2.0;
      else if (p.includes("1.5x") || p.includes("1,5x")) speed = 1.5;
      else if (p.includes("1.25x")) speed = 1.25;

      let durationSec = isSeekToEnd ? 2 : 15;
      const durationMatch = p.match(/(\d+)\s*(saniye|sn|second)/);
      if (durationMatch && !isSeekToEnd) {
        durationSec = parseInt(durationMatch[1], 10);
      }

      steps.push({
        id: `step_${stepCount++}`,
        action: "VIDEO_CONTROL",
        params: {
          speed,
          durationSec,
          reWatch: isReWatch,
          seekToEnd: isSeekToEnd,
        },
        title: isSeekToEnd
          ? "Videoyu Son 2 Saniyeye Sar ve Tamamla"
          : isReWatch
          ? `Videoyu Baştan/Tekrar ${speed}x Hızında ${durationSec} Saniye Oynat`
          : `Videoyu ${speed}x Hızında ${durationSec} Saniye Oynat`,
        description: isSeekToEnd
          ? "Video oynatıcısını son 2 saniyeye sararak videonun hızla tamamlanmasını ve video sorularının tetiklenmesini sağlar."
          : `Video elementini bulur, gerekiyorsa 'Baştan Başla' butonuna tıklar, hızı ${speed}x yapar ve ${durationSec} saniye izler.`,
      });
    }

    // ── 5. Drag and Drop ──
    if (p.includes("sürükle") || p.includes("eşleştir") || p.includes("drag")) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "DRAG_AND_DROP",
        params: {
          dragSource: "2^3 Kartı",
          dropTarget: "8 Hedef Kutusu",
        },
        title: "İnteraktif Alıştırma: Kartları Eşleştir",
        description: "Alıştırma kartını sürükleyip doğru kutuya bırakır.",
      });
    }

    // ── 6. Test / Quiz / Deneme Çözme ve Yarıda Bırakma ──
    const isReSolve = p.includes("tekrar çöz") || p.includes("baştan çöz") || p.includes("tekrar basla") || p.includes("baştan başla") || p.includes("tekrar yap") || p.includes("tekrar dene");
    const isLeaveHalfway = p.includes("yarıda bırak") ||
                          p.includes("yarım bırak") ||
                          p.includes("yarıda kes") ||
                          p.includes("yarım kes") ||
                          p.includes("testten çık") ||
                          p.includes("yarıda çık") ||
                          p.includes("yarım çık") ||
                          (p.includes("bırak") && (p.includes("test") || p.includes("soru")));

    const isVideoQuestionRequest = p.includes("video soru") || p.includes("videodaki soru") || (p.includes("video") && (p.includes("soru") || p.includes("soruları")));
    const wantsToSolve = isReSolve || isLeaveHalfway || p.includes("çöz") || p.includes("coz") || p.includes("salla") ||
                         p.includes("quiz") ||
                         (p.includes("bitir") && (p.includes("test") || p.includes("sınav") || p.includes("deneme"))) ||
                         (p.includes("deneme") && (p.includes("çöz") || p.includes("coz") || p.includes("başla") || p.includes("gir")));
    const isMenuOnlyRequest = p.includes("testler ve denemeler") && !p.includes("çöz") && !p.includes("coz") && !p.includes("yap") && !p.includes("başla") && !p.includes("gir");
    const hasTestSolveIntent = isVideoQuestionRequest || isLeaveHalfway || (
      (p.includes("test") || p.includes("soru")) && 
      !isMenuOnlyRequest &&
      (p.includes("çöz") || p.includes("coz") || p.includes("salla") || p.includes("yap") || p.includes("başla") || p.includes("gir") || p.includes("testi") || p.endsWith("test") || p.includes("soruları") || p.includes("bırak"))
    );

    if (!isMenuOnlyRequest && (wantsToSolve || hasTestSolveIntent)) {
      let quizStrategy: "RANDOM" | "ALL_CORRECT" | "LEAVE_EMPTY" | "ALL_WRONG" = "RANDOM";
      if (p.includes("doğru") || p.includes("full çek") || p.includes("full doğru")) {
        quizStrategy = "ALL_CORRECT";
      } else if (p.includes("boş bırak") || p.includes("pas geç")) {
        quizStrategy = "LEAVE_EMPTY";
      } else if (p.includes("yanlış") || p.includes("sıfır çek")) {
        quizStrategy = "ALL_WRONG";
      } else {
        quizStrategy = "RANDOM";
      }

      // Soru sayısı tespiti:
      // Kural 1: "çöz" deniyorsa 1 soru çözüp bitirsin
      // Kural 2: Soru sayısı belirtildiyse o sayıda çözsün (örn: "3 soru çöz", "5 soru çöz")
      // Kural 3: "tüm soruları çöz" / "bütün soruları çöz" / "hepsini çöz" dendiği zaman tüm soruları çözsün
      const isAllQuestions = p.includes("tüm soru") || 
                            p.includes("tum soru") ||
                            p.includes("bütün soru") ||
                            p.includes("butun soru") ||
                            p.includes("hepsini çöz") ||
                            p.includes("hepsini coz") ||
                            p.includes("tümünü çöz") ||
                            p.includes("tumunu coz") ||
                            p.includes("bütün soruları") ||
                            p.includes("tüm soruları");

      const countMatch = p.match(/(\d+)\s*(?:tane\s*)?(?:adet\s*)?soru/i);
      let questionCount: number | 'ALL' = 1;

      if (isAllQuestions) {
        questionCount = 'ALL';
      } else if (countMatch) {
        questionCount = parseInt(countMatch[1], 10);
      }

      steps.push({
        id: `step_${stepCount++}`,
        action: "SOLVE_QUIZ",
        params: {
          quizStrategy,
          reSolve: isReSolve,
          questionCount,
          leaveHalfway: isLeaveHalfway || undefined,
        },
        title: isLeaveHalfway
          ? `Testi Yarıda Bırak (${questionCount === 'ALL' ? 'Tüm Sorular' : `${questionCount} Soru`})`
          : isReSolve
          ? `Testi Baştan/Tekrar Çöz (${questionCount === 'ALL' ? 'Tüm Sorular' : `${questionCount} Soru`})`
          : `Testi Çöz (${questionCount === 'ALL' ? 'Tüm Sorular' : `${questionCount} Soru`})`,
        description: isLeaveHalfway
          ? `${questionCount === 'ALL' ? 'Soruları' : `${questionCount} soru`} yanıtlar ve ardından 'Testi Bitir' butonuna basarak onay modalında 'Testi Yarıda Bırak' seçeneğiyle ayrılır.`
          : `${questionCount === 'ALL' ? 'Testteki tüm soruları' : `${questionCount} soruyu`} '${quizStrategy}' taktiğiyle işaretler ve onay modalında 'Testi Bitir' seçerek testi tamamlar.`,
      });
    }

    // ── 7. Doğrulama ve Çökme Kontrolü ──
    if (p.includes("çök") || p.includes("analiz et") || p.includes("hata var mı") || p.includes("kontrol et") || p.includes("doğrula") || p.includes("patla")) {
      const assertionTarget = targetMenu ? targetMenu : "Analiz Paneli & Ekran Sağlığı";
      steps.push({
        id: `step_${stepCount++}`,
        action: "VERIFY_ELEMENT",
        params: {
          targetAssertion: assertionTarget,
          assertionType: "NOT_CRASHED",
        },
        title: `"${assertionTarget}" Görünürlük & Çökme Kontrolü`,
        description: "Ekranın DOM'da sağlıklı render edildiğini doğrular.",
      });
    }

    // Hiçbir aksiyon eşleşmediyse en azından ana sayfayı aç
    if (steps.length === 0) {
      steps.push({
        id: `step_${stepCount++}`,
        action: "GO_HOME",
        params: {},
        title: "Ana Sayfaya Git",
        description: "Ana Sayfa ekranını açar.",
      });
    }

    const intent = `Kullanıcı Emri: "${rawPrompt}" (${targetGrade || targetLevel})`;

    return {
      intent,
      targetLevel,
      steps,
    };
  }
}

export const geminiPlanner = new GeminiPlanner();
