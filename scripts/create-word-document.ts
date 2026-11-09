import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  HeightRule
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.resolve(__dirname, '../docs/images');

function readImg(filename: string): Buffer {
  return fs.readFileSync(path.join(imagesDir, filename));
}

function p(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 120, line: 360 }, // 1.5 line spacing
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24, // 12pt
        color: '111827',
      }),
    ],
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 32, // 16pt
        bold: true,
        color: '0f172a',
      }),
    ],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 28, // 14pt
        bold: true,
        color: '1e293b',
      }),
    ],
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24, // 12pt
        bold: true,
        color: '334155',
      }),
    ],
  });
}

function imageFigure(imgBuffer: Buffer, width: number, height: number, caption: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 100 },
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: {
            width,
            height,
          },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 240 },
      children: [
        new TextRun({
          text: caption,
          font: 'Times New Roman',
          size: 20, // 10pt
          italics: true,
          color: '475569',
        }),
      ],
    }),
  ];
}

const tableData = [
  ['TypeScript', '5.7.3', 'Dil & Tip Güvenliği', 'Tüm mimaride katı tip denetimi ve ortak veri modellerinin sağlanması'],
  ['Node.js', '20.x', 'Çalışma Zamanı', 'Asenkron I/O süreçleri, yerel süreç yönetimi ve sunucu altyapısı'],
  ['Google Gemini 2.5 Flash', '2.32.0', 'Yapay Zeka / NLP', 'Doğal dildeki Türkçe komutların yapılandırılmış JSON test planına dönüştürülmesi'],
  ['Fuse.js', '7.5.0', 'Bulanık Arama', 'Müfredat başlıklarının ve kullanıcı girdilerinin toleranslı metin eşlemesi'],
  ['Playwright', '1.50.1', 'Test Otomasyonu', 'Web ve macOS Electron uygulamalarının programatik kontrolü ve CDP entegrasyonu'],
  ['Express.js', '4.21.2', 'Web Sunucusu', 'REST API uç noktalarının ve statik varlıkların sunulması'],
  ['WebSocket (ws)', '8.18.0', 'Gerçek Zamanlı İletişim', 'Canlı ekran kareleri, telemetri ve adım durumlarının anlık yayını'],
  ['Winston', '3.17.0', 'Loglama', 'Yapılandırılmış sistem günlüklerinin toplanması ve canlı dağıtımı'],
  ['React', '19.0.0', 'Ön Yüz Kütüphanesi', 'Bento Grid mimarisine sahip reaktif kullanıcı panelinin oluşturulması'],
  ['Vite', '6.1.0', 'Derleme Aracı', 'Ön yüz paketleme, optimizasyon ve geliştirme ortamı derlemesi'],
  ['Tailwind CSS', '4.3.4', 'Stil ve Tasarım', 'Modern koyu tema arayüzü ve modüler ızgara yerleşimlerinin biçimlendirilmesi'],
  ['Zustand', '5.0.3', 'Durum Yönetimi', 'Gerçek zamanlı telemetri ve koşum verilerinin istemci tarafında merkezi yönetimi'],
];

function createSummaryTable(): Table {
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };

  const headerRow = new TableRow({
    children: ['Teknoloji / Kütüphane', 'Sürüm', 'Kategori', 'Temel Görevi ve Rolü'].map((title, idx) =>
      new TableCell({
        shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
        borders: cellBorder,
        width: {
          size: idx === 0 ? 25 : idx === 1 ? 12 : idx === 2 ? 23 : 40,
          type: WidthType.PERCENTAGE,
        },
        children: [
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({
                text: title,
                font: 'Times New Roman',
                bold: true,
                size: 20, // 10pt
                color: '0F172A',
              }),
            ],
          }),
        ],
      })
    ),
  });

  const dataRows = tableData.map((row, rIdx) =>
    new TableRow({
      children: row.map((cellText, idx) =>
        new TableCell({
          shading: rIdx % 2 === 1 ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
          borders: cellBorder,
          children: [
            new Paragraph({
              spacing: { before: 80, after: 80 },
              children: [
                new TextRun({
                  text: cellText,
                  font: 'Times New Roman',
                  bold: idx === 0,
                  size: 19, // ~9.5pt
                  color: '1E293B',
                }),
              ],
            }),
          ],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

async function buildDocx() {
  console.log('📄 Word belgesi (.docx) hazırlanıyor...');

  const img1 = readImg('sekil_1_target_resolver.png');
  const img2 = readImg('sekil_2_quiz_handler.png');
  const img3 = readImg('sekil_3_sistem_mimarisi.png');
  const img4 = readImg('sekil_4_sequence_diagram.png');
  const img5 = readImg('sekil_5_fsm_state_diagram.png');

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Document Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'DOPİNG HAFIZA AI OTONOM TEST ASİSTANI',
                font: 'Times New Roman',
                size: 36, // 18pt
                bold: true,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({
                text: '(DOPING WEB & DESKTOP TESTER)',
                font: 'Times New Roman',
                size: 28, // 14pt
                bold: true,
                color: '3B82F6',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: 'STAJ RAPORU TEKNİK DOKÜMANTASYONU',
                font: 'Times New Roman',
                size: 24, // 12pt
                color: '64748B',
              }),
            ],
          }),

          // SECTION 1
          h1('1. PROJENİN TANIMI VE YAPILAN İŞİN TANIMI'),

          h2('1.1. Projenin Tanımı'),
          h3('1.1.1. Projeye Genel Bakış'),
          p(
            'Doping Hafıza AI Otonom Masaüstü ve Web Test Asistanı (Doping Web & Desktop Tester); Doping Hafıza eğitim ekosisteminde yer alan masaüstü (Electron) ve web uygulamalarının kalite güvence (QA) ile regresyon testi süreçlerini otonomlaştırmak üzere geliştirilmiş yeni nesil bir yapay zeka destekli test otomasyon stüdyosudur. Geleneksel test otomasyon araçlarının statik seçicilere (XPath, CSS selector) ve katı kod bloklarına olan bağımlılığını ortadan kaldırmayı hedefleyen bu sistem; doğal dil işleme yeteneklerini ve üretken yapay zeka modellerini tarayıcı otomasyon motorlarıyla birleştiren modern bir yazılım mimarisi sunmaktadır. Sistem, teknik derinliği olmayan test uzmanlarının veya ürün yöneticilerinin Türkçe günlük konuşma diliyle verdikleri serbest yönergeleri deterministik test eylemlerine dönüştürerek ilgili senaryoları uçtan uca yürütmektedir.'
          ),

          h3('1.1.2. Çözülen Problem ve İhtiyaç Analizi'),
          p(
            'Eğitim teknolojileri alanındaki platformlarda sık güncellenen dinamik müfredat içerikleri, video oynatıcılar, etkileşimli sürükle-bırak aktiviteleri, konu testleri ve Türkiye geneli deneme sınavları gibi çok katmanlı bileşenler yer almaktadır. Bu karmaşık yapı, arayüzdeki en ufak bir DOM değişikliğinde geleneksel test senaryolarının kırılarak geçersiz kalmasına ve ilkokul düzeyinden lise son sınıfa kadar uzanan binlerce konunun regresyon testlerinin manuel yürütülmesine yol açmaktadır. Söz konusu durum yüksek zaman ve iş gücü maliyetine sebep olmaktadır. Geliştirilen proje; kendi kendini onarabilen (self-healing) navigasyon motoru, çoklu test çözümleme stratejileri ve hem gerçek macOS Electron uygulamasına (CDP protokolü üzerinden) hem de dahili simülatöre bağlanabilen hibrit mimarisiyle bu zorlukları ortadan kaldırmayı başarmıştır.'
          ),

          h2('1.2. Yapılan İşin Tanımı (Staj Kapsamında Gerçekleştirilen Görevler)'),
          h3('1.2.1. Gereksinim Analizi ve Topoloji Modellemesi'),
          p(
            'Staj sürecinin ilk aşamasında Doping Hafıza uygulamasının ekran mimarisi ve eğitim topolojisi ayrıntılı biçimde analiz edilmiştir. Kullanıcının sınıf seviyesini seçmesinden sol menüye, oradan ders kartına, üniteye, konuya ve nihayetinde video veya test içeriğine uzanan derin hiyerarşik yapı incelenerek sisteme özel bir Uygulama Topolojisi (AppTopology) veri modeli çıkarılmıştır. Dördüncü sınıftan on ikinci sınıfa ve YKS/LGS hazırlık gruplarına kadar uzanan tüm akademik kademelerdeki ders, ünite ve deneme sınavı başlıklarını içeren bellek içi deterministik bir bilgi tabanı (AppKnowledgeBase) oluşturulmuş; uygulamanın DOM ağacını otonom şekilde tarayan bir tarayıcı modülü (AppCrawler) kurgulanmıştır.'
          ),

          h3('1.2.2. Doğal Dil ve Yapay Zeka Planlama Katmanının Geliştirilmesi'),
          p(
            'Kullanıcılardan gelen serbest metinli Türkçe test taleplerini ayrıştırmak için Google GenAI SDK ve Gemini 2.5 Flash modeli sisteme entegre edilmiştir. Yapay zekanın yapılandırılmış JSON çıktısı (Structured JSON Output) üretmesi sağlanarak rastgele metin üretimi engellenmiş, çıktılar katı bir eylem planı şemasına bağlanmıştır. Kullanıcı komutlarında geçen ders ve konu isimlerinin imla hatalarından ya da kısaltmalardan etkilenmeden doğru müfredat düğümüyle eşleştirilmesi amacıyla Fuse.js tabanlı bulanık arama (fuzzy search) ve Gemini destekli anlam belirsizliği giderici (TargetResolver) geliştirilmiştir. API anahtarının bulunmadığı veya ağ kesintisi yaşanan durumlar için ise sistemin çalışmasını sürdürmesini sağlayan kural tabanlı yerel bir Türkçe doğal dil işleme motoru devreye alınmıştır.'
          ),
          ...imageFigure(
            img1,
            340,
            523,
            'Şekil 1: Doğal Dilden Hedef Çözümlemeye ve JSON Eylem Planına Dönüşüm Hattı (TargetResolver Pipeline)'
          ),

          h3('1.2.3. Otonom Test Yürütme Motorunun Geliştirilmesi'),
          p(
            'Playwright kütüphanesi temel alınarak geliştirilen yürütme motorunda, klasik statik tıklamalar yerine durum makinesi prensibiyle çalışan SmartRouter ve GraphNavigator bileşenleri kodlanmıştır. Ekrandaki test türünü DOM yapısı üzerinden otomatik olarak ayırt eden QuizDetector ve bu testleri rastgele, tamamı doğru veya boş bırakma gibi stratejilerle çözen QuizHandler modülü sisteme eklenmiştir. HTML5 video oynatıcılarını kontrol eden, oynatma hızını artıran veya videoyu son saniyelere sararak soru ekranını tetikleyen VideoHandler geliştirilmiştir. Ayrıca açılışta beliren kampanya modallarını temizleyen PopupDismisser ve arayüz elemanlarının üst üste binip binmediğini denetleyen OverlapChecker modülleri sisteme kazandırılmıştır.'
          ),
          ...imageFigure(
            img2,
            520,
            431,
            'Şekil 2: QuizDetector ve QuizHandler Çok Modlu Soru Çözme Karar Ağacı'
          ),

          h3('1.2.4. Hibrit Hedef Ortam Desteği ve Simülatör Entegrasyonu'),
          p(
            'Sistem; kullanıcı adı, şifre ve SMS doğrulama kodu gibi dış faktörlere bağımlı kalmadan %100 deterministik testler gerçekleştirebilmek amacıyla uygulamanın birebir arayüz davranışlarını sergileyen 1:1 Doping Hafıza Web Simülatörünü bünyesinde barındırmaktadır. Bununla birlikte, gerçek masaüstü deneyimini doğrulamak amacıyla macOS üzerinde çalışan Electron uygulamasına Chrome DevTools Protocol (CDP - port 9222) üzerinden uzaktan bağlanabilen çift modlu bir yapı kurulmuştur.'
          ),

          h3('1.2.5. Modern Web Kontrol Paneli ve Canlı Telemetri Geliştirilmesi'),
          p(
            'Test adımlarının ve sistem metriklerinin görsel olarak izlenebilmesi amacıyla React 19, TypeScript ve Tailwind CSS v4 kullanılarak modern bir Bento Grid arayüzü inşa edilmiştir. Playwright motorundan alınan anlık ekran görüntüleri, Winston logları ve adım durumları WebSocket bağlantısı üzerinden gecikmesiz olarak ön yüze aktarılmıştır. Arayüze Web Speech API üzerinden sesli Türkçe komut verme yeteneği ile hata durumunda ilgili DOM elemanını kırmızı neon çerçeve (Bounding Box) ile işaretleyen akıllı görselleştirme katmanı entegre edilmiştir.'
          ),

          // SECTION 2
          h1('2. KULLANILAN TEKNOLOJİLER VE SİSTEM MİMARİSİ'),

          h2('2.1. Genel Mimari Değerlendirmesi'),
          p(
            'Doping Hafıza Otonom Test Asistanı projesinde tercih edilen teknoloji yığını; modern test otomasyonu mühendisliğinin gerektirdiği yüksek performans, asenkron süreç yönetimi, tip güvenliği ve gerçek zamanlı telemetri ihtiyaçları doğrultusunda belirlenmiştir. Geleneksel test otomasyon sistemlerinin statik ve kırılgan yapısını aşmak amacıyla, sunucu ve istemci katmanlarının tamamında uçtan uca TypeScript dili kullanılarak katı tip denetimi sağlanmıştır. Sistemin temel felsefesi; kullanıcıdan gelen doğal dil komutlarının üretken yapay zeka aracılığıyla deterministik bir eylem planına dönüştürülmesi, bu planın bir durum makinesi rehberliğinde tarayıcı motoruna iletilmesi ve elde edilen canlı ekran çıktıları ile telemetri verilerinin WebSocket üzerinden kullanıcı paneline anlık olarak yansıtılması esasına dayanır. Proje; dil ve çalışma zamanı, yapay zeka katmanı, test otomasyon motoru, arka yüz altyapısı ve modern kullanıcı arayüzü olmak üzere birbirine gevşek bağlı fakat senkronize çalışan modüler kategoriler halinde inşa edilmiştir.'
          ),

          h2('2.2. Kategorilerine Göre Kullanılan Teknolojiler'),
          h3('2.2.1. Programlama Dili ve Çalışma Zamanı Mimarisi'),
          p(
            'Projenin tüm katmanlarında tip güvenliğini garanti altına almak, arayüz ve veri modelleri arasındaki tutarsızlıkları derleme aşamasında yakalamak amacıyla TypeScript (v5.7) tercih edilmiştir. Geliştirilen topoloji modelleri, test eylem şemaları ve telemetri veri tipleri ortak tanımlanarak çalışma zamanı hataları en aza indirilmiştir. Asenkron I/O süreçlerinin, ağ soketlerinin ve yerel işletim sistemi işlemlerinin yüksek verimlilikle yürütülmesi için Node.js (v20) çalışma zamanı ortamı kullanılmıştır. Geliştirme ve yürütme süreçlerinde TypeScript dosyalarının önceden ayrı bir derleme adımına ihtiyaç duymadan doğrudan ECMAScript modül standartlarında çalıştırılabilmesi için tsx derleme aracı sisteme entegre edilmiştir.'
          ),

          h3('2.2.2. Yapay Zeka ve Doğal Dil Çözümleme Katmanı'),
          p(
            'Kullanıcıların Türkçe serbest ifadelerle veya günlük konuşma diliyle verdikleri test komutlarını yapılandırılmış eylemlere dönüştürmek amacıyla Google GenAI SDK aracılığıyla Gemini 2.5 Flash modeli sisteme dahil edilmiştir. Modelin serbest metin yerine katı bir veri yapısı üretmesini garanti altına almak için yapılandırılmış şema doğrulaması (Structured JSON Output) uygulanmıştır. Kullanıcı komutlarında yer alan ders, ünite ve konu adlarının imla hatalarından veya eksik kullanımlardan etkilenmeden sistem topolojisiyle eşleştirilebilmesi amacıyla Fuse.js kütüphanesinden yararlanılarak ağırlıklı bir bulanık arama (fuzzy search) algoritması geliştirilmiştir. Olası internet kesintilerinde veya API kotası aşımlarında sistemin işlevselliğini sürdürebilmesi için regex ve kural tabanlı yerel bir Türkçe doğal dil işleme motoru yedek mekanizma olarak konumlandırılmıştır.'
          ),

          h3('2.2.3. Otonom Test ve Tarayıcı Yürütme Motoru'),
          p(
            'Uygulama arayüzünün programatik olarak kontrol edilmesi ve kullanıcı etkileşimlerinin simüle edilmesi amacıyla endüstri standardı olan Playwright (v1.50) kütüphanesi seçilmiştir. Playwright, Chromium tabanlı tarayıcı süreçlerini doğrudan yönetmenin yanı sıra, hedef masaüstü uygulamasının içine gömülü çalıştığı durumlarda Chrome DevTools Protocol (CDP) üzerinden 9222 numaralı yerel porta bağlanarak Electron uygulamasını doğrudan yönetme kabiliyetine sahiptir. Navigasyon süreçlerinde kilitlenmeleri önlemek, sayfa geçişlerini doğrulamak ve arayüz pop-up pencerelerini otomatik bertaraf etmek amacıyla bir sonlu durum makinesi (FSM) mimarisi kurgulanmıştır. Ek olarak, video oynatma kontrolleri, sürükle-bırak işlemleri, sınav şıklarının dinamik işaretlenmesi ve DOM elemanlarının ekranda çakışma durumlarının tespiti için özel tarayıcı bağlamı fonksiyonları geliştirilmiştir.'
          ),

          h3('2.2.4. Sunucu Altyapısı ve Gerçek Zamanlı İletişim'),
          p(
            'Sistemin dış dünya ile haberleşmesini sağlayan arka yüz mimarisi, hafifliği ve geniş ara yazılım (middleware) ekosistemi sebebiyle Express.js (v4.21) üzerine kurulmuştur. RESTful mimaride hazırlanan servis uç noktaları test başlatma, plan ayrıştırma, sistem yapılandırması ve makro tetikleme görevlerini yürütmektedir. Test yürütümü esnasında tarayıcıdan alınan anlık ekran görüntüleri, adım geçişleri ve metriklerin milisaniyeler düzeyinde kullanıcı ekranına aktarılması amacıyla ws (WebSocket) kütüphanesi üzerinden çift yönlü bir olay yayınlama hattı kurulmuştur. Sistemin ürettiği tüm aksiyon, hata ve telemetri kayıtları ise yapılandırılmış JSON formatında Winston (v3.17) loglama kütüphanesi ile toplanarak hem konsola hem de WebSocket üzerinden ön yüze senkronize edilmektedir.'
          ),

          h3('2.2.5. Kullanıcı Arayüzü ve Durum Yönetimi'),
          p(
            'Test mühendislerinin ve operatörlerin sistemi yönettiği kontrol paneli, modern bileşen yapısı ve optimize edilmiş eşzamanlı render yetenekleri sebebiyle React 19 ile geliştirilmiştir. Projenin derleme ve sıcak modül yenileme süreçleri yüksek hızlı Vite (v6.1) aracıyla yapılandırılmıştır. Bento Grid tasarım desenini temel alan koyu temalı arayüzün şekillendirilmesinde Tailwind CSS (v4.3) kullanılmış, görsel hiyerarşi ve ergonomi optimize edilmiştir. WebSocket üzerinden sürekli akan anlık ekran kareleri, terminal çıktıları ve adım durumlarının merkezi bir noktada performans kaybı yaşanmadan yönetilmesi için minimal ve reaktif yapısıyla öne çıkan Zustand (v5.0) durum yönetim kütüphanesi tercih edilmiştir. Kullanıcıların sesli komut verebilmesi için tarayıcının yerel Web Speech API arayüzü sisteme entegre edilmiştir.'
          ),

          h2('2.3. Kullanılan Teknolojiler Özeti'),
          createSummaryTable(),

          h2('2.4. Sistem Mimarisi ve Veri Akış Şeması'),
          p(
            'Aşağıdaki mimari akış şemasında sistemin sunum, sunucu, yapay zeka planlama, otomasyon yürütme ve hedef çalışma ortamı arasındaki doğrusal bağlantılar gösterilmektedir:'
          ),
          ...imageFigure(
            img3,
            580,
            275,
            'Şekil 3: Doping Hafıza Otonom Test Asistanı Katmanlı Sistem Mimarisi ve Veri Akışı'
          ),

          p(
            'Sistemdeki sürecin zamana bağlı işleyişi ve bileşenler arası asenkron mesajlaşma sıralaması ise aşağıdaki etkileşim diyagramında detaylandırılmıştır:'
          ),
          ...imageFigure(
            img4,
            580,
            269,
            'Şekil 4: Doğal Dil Komutunun Test Koşumuna Dönüştürülme Sıralama Diyagramı (Sequence Diagram)'
          ),

          // SECTION 3
          h1('3. HİYERARŞİK NAVİGASYON VE DURUM MAKİNESİ (FSM) MİMARİSİ'),
          p(
            'Doping Hafıza platformunun kurumsal içerik yapısı, derinlemesine iç içe geçmiş hiyerarşik bir ağaç düzenine sahiptir. Geleneksel otomasyon betiklerinin bu tip hiyerarşik yapılarda yaşadığı en büyük sorun; ara katman yüklemelerinin gecikmesi, internet bağlantı dalgalanmaları veya beklenmeyen modalların açılması durumunda test senaryosunun kırılarak durmasıdır. Bu problemin çözümü amacıyla sistemde resmi bir hiyerarşik navigasyon modeli ve sonlu durum makinesi (Finite State Machine) kurgulanmıştır. Uygulama hiyerarşisi temel olarak kullanıcının aktif sınıf düzeyinin doğrulanması, sol navigasyon menüsü üzerinden ana akademik alanın seçilmesi, ilgili derse ait müfredat kartının bulunması, ünite başlığının odaklanması, konu sekmesinin açılması ve son olarak ilgili video ya da değerlendirme sınavının tetiklenmesi aşamalarından meydana gelir.'
          ),
          p(
            'GraphNavigator bileşeni bu aşamaları doğrudan sıralı komutlar şeklinde çalıştırmak yerine kontrollü durum geçişleri üzerinden icra eder. Süreç, sistemin boşta olduğu ilk durum ile başlar; yürütme talebi geldiğinde başlatma durumuna geçilir. Ardından sırasıyla adım icrası, hedef elementin DOM üzerinde görünür olmasının beklenmesi ve eylemin tamamlanması durumları işletilir. Eğer beklenmeyen bir sistem hatası, sayfa kilitlenmesi veya örtüşen bir arayüz bildirimiyle karşılaşılırsa sistem doğrudan başarısızlığa düşmek yerine acil kurtarma durumunu devreye alır. Acil kurtarma aşamasında açık pencereler kapatılır, hedef URL doğrulanır ve sayfa güvenli bir önceki duruma sıfırlanarak adım yeniden denenir. Tüm adımların başarıyla tamamlanması durumunda ise başarılı sonuca ulaşılarak oturum sonlandırılır. Bu mimari yaklaşım, uygulamanın dinamik ve değişken arayüz şartlarında dahi testlerin kesintiye uğramadan kendi kendini onararak (self-healing) başarıyla tamamlanmasını sağlamaktadır.'
          ),
          ...imageFigure(
            img5,
            520,
            410,
            'Şekil 5: GraphNavigator Sonlu Durum Makinesi (FSM) ve Kendi Kendini Onarma (Self-Healing) Döngüsü'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, '../STAJ_RAPORU.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Word belgesi başarıyla oluşturuldu: ${outPath}`);
}

buildDocx().catch((err) => {
  console.error('Word oluşturma hatası:', err);
  process.exit(1);
});
