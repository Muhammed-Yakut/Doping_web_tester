/**
 * AppKnowledgeBase — Doping Hafıza Tam İçerik Haritası
 *
 * Tüm geçerli sınıflar (4–12, YKS 2028) için:
 *  - Ders kartları (lessonCard)
 *  - Ünite isimleri (unit)
 *  - Konular (topics)
 *  - Testler ve Denemeler
 *  - Fuzzy arama desteği
 *
 * Kullanıcı "üslü sayılara git", "mat testi", "paragraf" gibi belirsiz
 * komutlar verdiğinde sistem bu haritayı kullanarak tam yolu bulur.
 */

export interface LessonEntry {
  grade: string;        // "8. Sınıf"
  lessonCard: string;   // "Doping Reflekslerle Matematik"
  unit: string;         // "Üslü Sayılar"
  topics: string[];     // ["Üslü Sayıların Tanımı", ...]
  keywords: string[];   // kısa/alternatif isimler
}

export type ExamSubTab =
  | 'Bireysel Denemeler'
  | 'Tarama Testleri'
  | 'Geçmiş MEB Sınavları'
  | 'Geçmiş ÖSYM Sınavları'
  | 'Deneme Kulübü'
  | 'Strateji Denemeleri';

export interface TestEntry {
  grade: string;
  category: string;     // "LGS Denemeleri", "TYT Denemesi", ...
  subTab: ExamSubTab;   // Hangi sol alt sekmenin altında yer aldığı
  testName: string;     // "LGS 1.Deneme", "LGS TURBO Seviye Tespit Sınavı", ...
  keywords: string[];
}

export interface WaySectionEntry {
  title: string;
  keywords: string[];
}

export interface LgsJourneyTabEntry {
  tabName: string;
  keywords: string[];
}

// ─── YARDIMCI: Türkçe karakter normalize ───────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Token kesişim skoru (0–1 arası float)
function tokenScore(query: string, target: string): number {
  const qTokens = new Set(normalize(query).split(' ').filter(t => t.length > 2 || /\d/.test(t)));
  const tTokens = normalize(target).split(' ').filter(t => t.length > 2 || /\d/.test(t));
  if (qTokens.size === 0 || tTokens.length === 0) return 0;
  let matches = 0;
  for (const t of tTokens) {
    for (const q of qTokens) {
      if (t === q) {
        matches += /\d/.test(t) ? 2 : 1;
        break;
      } else if (t.includes(q) || q.includes(t)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(qTokens.size, tTokens.length);
}

// ─── TÜM DERSLERİN İÇERİK HARİTASI ─────────────────────────────────────────

export const LESSON_DB: LessonEntry[] = [
  // ═══════════════════════════════════════════════════════════
  // 4. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '4. Sınıf', lessonCard: 'Matematik',
    unit: 'Doğal Sayılar', topics: ['Büyük Sayılar', 'Sayıları Yuvarlama', 'Sayı Örüntüleri'],
    keywords: ['matematik', 'mat', 'doga sayilar', 'dört sinif']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Matematik',
    unit: 'Dört İşlem', topics: ['Toplama ve Çıkarma', 'Çarpma', 'Bölme'],
    keywords: ['dort islem', 'toplama', 'carpma', 'bolme']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Matematik',
    unit: 'Kesirler', topics: ['Kesir Nedir?', 'Basit Kesirler', 'Kesirlerle İşlemler'],
    keywords: ['kesir', 'kesirler']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Matematik',
    unit: 'Uzunluk ve Alan Ölçme', topics: ['Uzunluk Birimleri', 'Alan Ölçme'],
    keywords: ['uzunluk', 'alan olcme']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Matematik',
    unit: 'Zaman Ölçme', topics: ['Saat', 'Takvim', 'Zaman Hesaplama'],
    keywords: ['zaman', 'saat', 'takvim']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Türkçe',
    unit: 'Sözcükte Anlam', topics: ['Eş Anlamlı Sözcükler', 'Zıt Anlamlı Sözcükler', 'Çok Anlamlı Sözcükler'],
    keywords: ['turkce', 'sozcuk', 'anlam']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Türkçe',
    unit: 'Cümlede Anlam', topics: ['Neden-Sonuç', 'Karşılaştırma', 'Öznel-Nesnel'],
    keywords: ['cumlede anlam', 'cumle']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Fen Bilimleri',
    unit: 'Vücudumuz Bilmecesini Çözelim', topics: ['Vücut Sistemleri', 'Duyu Organları'],
    keywords: ['fen', 'vucut', 'fen bilimleri']
  },
  {
    grade: '4. Sınıf', lessonCard: 'Sosyal Bilgiler',
    unit: 'Haklarımı Öğreniyorum', topics: ['Temel Haklar', 'Ödevler ve Sorumluluklar'],
    keywords: ['sosyal bilgiler', 'sosyal', 'haklar']
  },

  // ═══════════════════════════════════════════════════════════
  // 5. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '5. Sınıf', lessonCard: 'Matematik',
    unit: 'Doğal Sayılar', topics: ['Üslü Sayılar', 'Asal Sayılar', 'OBEB OKEK'],
    keywords: ['matematik', 'mat', 'uslu', 'asal']
  },
  {
    grade: '5. Sınıf', lessonCard: 'Matematik',
    unit: 'Kesirler', topics: ['Kesirlerle Çarpma', 'Kesirlerle Bölme', 'Ondalık Gösterim'],
    keywords: ['kesir', 'ondalik']
  },
  {
    grade: '5. Sınıf', lessonCard: 'Matematik',
    unit: 'Veri Analizi', topics: ['Ortalama', 'Çizgi Grafiği', 'Sütun Grafiği'],
    keywords: ['veri analizi', 'grafik', 'ortalama']
  },
  {
    grade: '5. Sınıf', lessonCard: 'Türkçe',
    unit: 'Sözcükte Anlam', topics: ['Eş Anlamlı', 'Karşıt Anlamlı', 'Mecaz Anlam'],
    keywords: ['turkce', 'sozcuk anlam', 'mecaz']
  },
  {
    grade: '5. Sınıf', lessonCard: 'Fen Bilimleri',
    unit: 'Madde ve Isı', topics: ['Hal Değişimi', 'Isı İletkenliği', 'Genleşme'],
    keywords: ['fen', 'madde', 'isi', 'hal degisimi']
  },

  // ═══════════════════════════════════════════════════════════
  // 6. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '6. Sınıf', lessonCard: 'Matematik',
    unit: 'Tam Sayılar', topics: ['Tam Sayılarla Toplama', 'Tam Sayılarla Çarpma', 'Mutlak Değer'],
    keywords: ['tam sayi', 'negatif sayi', 'mutlak deger']
  },
  {
    grade: '6. Sınıf', lessonCard: 'Matematik',
    unit: 'Kesirler', topics: ['Rasyonel Sayılar', 'Kesirlerle İşlemler'],
    keywords: ['kesir', 'rasyonel']
  },
  {
    grade: '6. Sınıf', lessonCard: 'Matematik',
    unit: 'Oran ve Orantı', topics: ['Oran', 'Oranlı Dağılım', 'Yüzde Hesapları'],
    keywords: ['oran', 'orantı', 'yuzde']
  },
  {
    grade: '6. Sınıf', lessonCard: 'Matematik',
    unit: 'Cebir', topics: ['Değişken ve Sabit', 'Denklem Kurma', 'Birinci Dereceden Denklem'],
    keywords: ['cebir', 'denklem', 'degisken']
  },
  {
    grade: '6. Sınıf', lessonCard: 'Türkçe',
    unit: 'Sözcük Türleri', topics: ['İsimler', 'Sıfatlar', 'Zarflar', 'Fiiller'],
    keywords: ['turkce', 'sozcuk turu', 'isim', 'fiil']
  },
  {
    grade: '6. Sınıf', lessonCard: 'Fen Bilimleri',
    unit: 'Vücudumuzdaki Sistemler', topics: ['Sindirim Sistemi', 'Dolaşım Sistemi', 'Solunum Sistemi'],
    keywords: ['fen', 'sindirim', 'dolasim', 'solunum', 'sistem']
  },

  // ═══════════════════════════════════════════════════════════
  // 7. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '7. Sınıf', lessonCard: 'Matematik',
    unit: 'Üslü İfadeler', topics: ['Üslü Sayıların Özellikleri', 'Üslü İfadelerle İşlemler', 'Bilimsel Gösterim'],
    keywords: ['uslu ifade', 'uslu sayi', 'bilimsel gosterim', 'us']
  },
  {
    grade: '7. Sınıf', lessonCard: 'Matematik',
    unit: 'Rasyonel Sayılar', topics: ['Rasyonel Sayı Nedir?', 'Rasyonel Sayılarla İşlemler'],
    keywords: ['rasyonel', 'kesir islemleri']
  },
  {
    grade: '7. Sınıf', lessonCard: 'Matematik',
    unit: 'Cebir', topics: ['Cebirsel İfadeler', 'Denklem Çözme', 'Eşitsizlikler'],
    keywords: ['cebir', 'cebirsel ifade', 'esitsizlik']
  },
  {
    grade: '7. Sınıf', lessonCard: 'Matematik',
    unit: 'Veri Analizi', topics: ['Mod, Medyan, Aritmetik Ortalama', 'Çizgi Grafiği'],
    keywords: ['mod medyan', 'ortalama', 'istatistik']
  },
  {
    grade: '7. Sınıf', lessonCard: 'Türkçe',
    unit: 'Paragraf', topics: ['Paragraf Taktikleri', 'Ana Düşünce', 'Yardımcı Düşünce'],
    keywords: ['turkce', 'paragraf', 'ana dusunce', 'metin anlama']
  },
  {
    grade: '7. Sınıf', lessonCard: 'Fen Bilimleri',
    unit: 'Kuvvet ve Enerji', topics: ['Kuvvet Türleri', 'Enerji Dönüşümü', 'Basit Makineler'],
    keywords: ['fen', 'kuvvet', 'enerji', 'makine']
  },
  {
    grade: '7. Sınıf', lessonCard: 'İngilizce',
    unit: 'Daily Routines', topics: ['Present Simple', 'Time Expressions', 'Adverbs of Frequency'],
    keywords: ['ingilizce', 'english', 'present simple', 'daily']
  },

  // ═══════════════════════════════════════════════════════════
  // 8. SINIF — LGS
  // ═══════════════════════════════════════════════════════════
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Üslü Sayılar', topics: ['Üslü Sayıların Tanımı ve Özellikleri', 'Üslü Sayılarla İşlemler', 'Çok Basamaklı Üslü İfadeler'],
    keywords: ['lgs mat', 'matematik', 'uslu sayi', 'us', 'kare', 'kup']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Köklü Sayılar', topics: ['Karekök', 'Küpkök', 'Köklü İfadelerle İşlemler'],
    keywords: ['koklu sayi', 'karekök', 'kok']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Çarpanlar ve Katlar', topics: ['Çarpanlara Ayırma', 'OBEB ve OKEK', 'Ortak Çarpan'],
    keywords: ['carpanlar', 'katlar', 'obeb', 'okek', 'carpanlara ayirma']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Veri Analizi', topics: ['Merkezi Eğilim Ölçüleri', 'Çizgi Grafiği', 'Olasılık'],
    keywords: ['veri analizi', 'olasılık', 'grafik', 'mod medyan']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Denklemler', topics: ['Birinci Dereceden Denklem', 'Denklem Sistemleri', 'Sözel Denklem'],
    keywords: ['denklem', 'birinci derece', 'sozel problem']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Üçgenler', topics: ['Üçgenlerde Açılar', 'Üçgen Eşitsizliği', 'Benzer Üçgenler'],
    keywords: ['ucgen', 'geometri', 'ac', 'benzer']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Eşlik ve Benzerlik', topics: ['Eşlik Dönüşümleri', 'Benzerlik Oranı'],
    keywords: ['eslik', 'benzerlik', 'donusum']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Dönüşüm Geometrisi', topics: ['Yansıma', 'Öteleme', 'Dönme'],
    keywords: ['donusum geometri', 'yansima', 'oteleme', 'donme']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Matematik',
    unit: 'Katı Cisimler', topics: ['Silindir', 'Koni', 'Küre', 'Hacim Hesaplama'],
    keywords: ['kati cisim', 'silindir', 'koni', 'kure', 'hacim']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Sözcükte Anlam', topics: ['Mecaz Anlam', 'Deyim', 'Atasözü', 'Somut-Soyut Anlam'],
    keywords: ['turkce lgs', 'sozcuk anlam', 'mecaz', 'deyim', 'atasoz']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Cümlede Anlam', topics: ['Neden-Sonuç İlişkisi', 'Amaç-Sonuç', 'Öznel-Nesnel'],
    keywords: ['cumlede anlam', 'neden sonuc', 'oznel nesnel']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Yardımcı Düşünce', 'Paragraf Yapısı'],
    keywords: ['paragraf', 'metin anlama', 'ana dusunce']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Sözcük Türleri', topics: ['Fiil', 'İsim', 'Sıfat', 'Zamir', 'Zarf'],
    keywords: ['sozcuk turu', 'fiil', 'isim', 'sifat']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Cümle Bilgisi', topics: ['Cümle Öğeleri', 'Yüklem Türleri', 'Cümle Türleri'],
    keywords: ['cumle bilgisi', 'cumle ogeleri', 'yuklem']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Türkçe',
    unit: 'Yazım Kuralları', topics: ['Büyük Harf', 'Noktalama İşaretleri', 'Birleşik Sözcükler'],
    keywords: ['yazim kurallari', 'noktalama', 'imla']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Fen Bilimleri',
    unit: 'DNA ve Genetik Kod', topics: ['DNA Yapısı', 'Genetik Kod', 'Mutasyon'],
    keywords: ['fen lgs', 'dna', 'genetik']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Fen Bilimleri',
    unit: 'Basit Makineler', topics: ['Kaldıraç', 'Palanga', 'Çark-Dingil', 'Sarmal'],
    keywords: ['basit makine', 'kaldırac', 'palanga']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Fen Bilimleri',
    unit: 'Madde ve Endüstri', topics: ['Polimer', 'Kompozit', 'Nanoteknoloji', 'Biyomedikal'],
    keywords: ['madde endustri', 'polimer', 'nano']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Fen Bilimleri',
    unit: 'Basınç', topics: ['Katılarda Basınç', 'Sıvılarda Basınç', 'Gazlarda Basınç'],
    keywords: ['basin', 'sivi basin', 'gaz basin']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle Fen Bilimleri',
    unit: 'Mevsimler ve İklim', topics: ['Mevsimler', 'İklim Türleri', 'Küresel Isınma'],
    keywords: ['mevsim', 'iklim', 'global isinma']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle İnkılap Tarihi',
    unit: 'Bir Kahraman Doğuyor', topics: ['Atatürk\'ün Hayatı', 'İstiklal Savaşı', 'TBMM\'nin Açılışı'],
    keywords: ['inkılap tarihi', 'inkilap', 'ataturk', 'kurtulus savasi']
  },
  {
    grade: '8. Sınıf', lessonCard: 'LGS Reflekslerle İngilizce',
    unit: 'Friendship', topics: ['Describing People', 'Making Friends', 'Relationships'],
    keywords: ['ingilizce lgs', 'english', 'friendship', 'arkadas']
  },

  // ═══════════════════════════════════════════════════════════
  // 9. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '9. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Temel Kavramlar', topics: ['Sayı Kümeleri', 'Üslü Sayılar', 'Köklü Sayılar', 'Mutlak Değer'],
    keywords: ['tyt mat', 'matematik', 'temel kavram', 'sayi kumeleri']
  },
  {
    grade: '9. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Mantık', topics: ['Önermeler', 'Bağlaçlar', 'Doğruluk Tablosu'],
    keywords: ['mantik', 'onerme', 'bagla']
  },
  {
    grade: '9. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Kümeler', topics: ['Küme Kavramı', 'Küme İşlemleri', 'Kartezyen Çarpım'],
    keywords: ['kume', 'kume islemleri', 'kartezyen']
  },
  {
    grade: '9. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Fonksiyonlar', topics: ['Fonksiyon Kavramı', 'Fonksiyon Türleri', 'Bileşke Fonksiyon', 'Ters Fonksiyon'],
    keywords: ['fonksiyon', 'bileske fonksiyon', 'ters fonksiyon', 'fonksiyonlar']
  },
  {
    grade: '9. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Sözcükte Anlam', topics: ['Eş Anlamlı', 'Zıt Anlamlı', 'Mecaz', 'Deyim'],
    keywords: ['tyt turkce', 'turkce', 'sozcuk anlam']
  },
  {
    grade: '9. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Başlık Bulma', 'Paragraf Tamamlama'],
    keywords: ['paragraf', 'metin anlama']
  },
  {
    grade: '9. Sınıf', lessonCard: 'Fizik',
    unit: 'Kuvvet ve Hareket', topics: ['Newton Yasaları', 'Sürtünme Kuvveti', 'Serbest Düşme'],
    keywords: ['fizik', 'kuvvet hareket', 'newton']
  },
  {
    grade: '9. Sınıf', lessonCard: 'Kimya',
    unit: 'Maddenin Yapısı ve Özellikleri', topics: ['Atomun Yapısı', 'Periyodik Cetvel'],
    keywords: ['kimya', 'atom', 'periyodik cetvel']
  },
  {
    grade: '9. Sınıf', lessonCard: 'Biyoloji',
    unit: 'Yaşam Bilimi', topics: ['Hücrenin Yapısı', 'Canlıların Sınıflandırılması'],
    keywords: ['biyoloji', 'hucre', 'canlı']
  },

  // ═══════════════════════════════════════════════════════════
  // 10. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '10. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Üslü ve Köklü Sayılar', topics: ['Üslü Sayılar', 'Köklü İfadeler', 'Bilimsel Gösterim'],
    keywords: ['tyt mat', 'matematik', 'uslu koklu']
  },
  {
    grade: '10. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Polinomlar', topics: ['Polinom Nedir?', 'Polinom İşlemleri', 'Çarpanlara Ayırma'],
    keywords: ['polinom', 'carpanlara ayirma']
  },
  {
    grade: '10. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'İkinci Dereceden Denklemler', topics: ['Denklem Çözme', 'Diskriminant', 'Köklerin Özellikleri'],
    keywords: ['ikinci derece', 'denklem', 'diskriminant', 'karesel']
  },
  {
    grade: '10. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Paragraf Tamamlama', 'Boşluk Doldurma'],
    keywords: ['paragraf', 'tyt turkce']
  },
  {
    grade: '10. Sınıf', lessonCard: 'Fizik',
    unit: 'Elektrik', topics: ['Elektrik Yükü', 'Ohm Yasası', 'Devreler'],
    keywords: ['fizik', 'elektrik', 'ohm', 'devre']
  },
  {
    grade: '10. Sınıf', lessonCard: 'Kimya',
    unit: 'Kimyasal Bağlar', topics: ['İyonik Bağ', 'Kovalent Bağ', 'Metalik Bağ'],
    keywords: ['kimya', 'kimyasal bag', 'iyonik', 'kovalent']
  },

  // ═══════════════════════════════════════════════════════════
  // 11. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '11. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Logaritma', topics: ['Logaritmanın Tanımı', 'Logaritma Kuralları', 'Logaritmik Denklemler'],
    keywords: ['tyt mat', 'logaritma', 'log']
  },
  {
    grade: '11. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Trigonometri', topics: ['Trigonometrik Oranlar', 'Trigonometrik Denklemler', 'Sinüs-Kosinüs'],
    keywords: ['trigonometri', 'sinus', 'kosin', 'tanjant']
  },
  {
    grade: '11. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Olasılık', topics: ['Temel Sayma', 'Permütasyon', 'Kombinasyon', 'Olasılık Hesapları'],
    keywords: ['olasilik', 'permutasyon', 'kombinasyon', 'sayma']
  },
  {
    grade: '11. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'Türev', topics: ['Türevin Tanımı', 'Türev Kuralları', 'Zincir Kuralı', 'Türev Uygulamaları'],
    keywords: ['ayt mat', 'turev', 'diferansiyel']
  },
  {
    grade: '11. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'İntegral', topics: ['Belirsiz İntegral', 'Belirli İntegral', 'Alan Hesabı'],
    keywords: ['integral', 'alan hesabi', 'belirsiz integral']
  },
  {
    grade: '11. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Paragraf Türleri', 'Metin Yorumlama'],
    keywords: ['tyt turkce', 'paragraf']
  },
  {
    grade: '11. Sınıf', lessonCard: 'Fizik',
    unit: 'Çembersel Hareket ve Kütle Çekimi', topics: ['Çembersel Hareket', 'Kepler Yasaları', 'Gravitasyon'],
    keywords: ['fizik', 'cembersel hareket', 'kepler', 'gravitasyon']
  },
  {
    grade: '11. Sınıf', lessonCard: 'Kimya',
    unit: 'Kimyasal Hesaplamalar', topics: ['Mol Kavramı', 'Stokiyometri', 'Çözelti Konsantrasyonu'],
    keywords: ['kimya', 'mol', 'stokiyometri', 'cozelt']
  },

  // ═══════════════════════════════════════════════════════════
  // 12. SINIF
  // ═══════════════════════════════════════════════════════════
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Üslü ve Köklü Sayılar', topics: ['Üslü Sayılar Özellikleri', 'Köklü İfadeler', 'Basitleştirme'],
    keywords: ['tyt mat', 'matematik', 'uslu sayi', 'us', 'koklu']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Mantık', topics: ['Önermeler', 'Bağlaçlar', 'Doğruluk Tablosu', 'Kontrapozitif'],
    keywords: ['mantik', 'onerme', 'bagla']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Kümeler', topics: ['Küme İşlemleri', 'Kartezyen Çarpım', 'Venn Şeması'],
    keywords: ['kume', 'venn', 'kartezyen']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Denklem ve Eşitsizlikler', topics: ['Birinci Derece Denklem', 'İkinci Dereceden', 'Mutlak Değer Denklemi'],
    keywords: ['denklem', 'esitsizlik', 'mutlak deger']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Fonksiyonlar', topics: ['Fonksiyon Kavramı', 'Bileşke Fonksiyon', 'Ters Fonksiyon', 'Fonksiyon Grafikleri'],
    keywords: ['fonksiyon', 'bileske fonksiyon', 'ters fonksiyon', 'fonksiyonlar']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Üçgenler ve Trigonometri', topics: ['Trigonometrik Oranlar', 'Sinüs Kosinüs Teoremleri'],
    keywords: ['ucgen', 'trigonometri', 'sinus', 'kosin']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Analitik Geometri', topics: ['Doğrunun Denklemi', 'Çemberin Denklemi', 'Parabol'],
    keywords: ['analitik geometri', 'dogrunun denklemi', 'cember', 'parabol']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Matematik',
    unit: 'Olasılık ve İstatistik', topics: ['Permütasyon', 'Kombinasyon', 'Olasılık', 'Veri Yorumlama'],
    keywords: ['olasilik', 'istatistik', 'permutasyon', 'kombinasyon']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'Türev', topics: ['Türevin Tanımı', 'Türev Kuralları', 'Uygulamalı Türev Problemleri'],
    keywords: ['ayt mat', 'turev']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'İntegral', topics: ['Belirsiz İntegral', 'Belirli İntegral', 'Alan-Hacim Hesabı'],
    keywords: ['integral', 'alan hesabi']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'Diziler', topics: ['Aritmetik Dizi', 'Geometrik Dizi', 'Dizi Toplamları'],
    keywords: ['dizi', 'aritmetik dizi', 'geometrik dizi']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Matematik',
    unit: 'Kompleks Sayılar', topics: ['Kompleks Sayı Tanımı', 'İşlemler', 'Kutupsal Gösterim'],
    keywords: ['kompleks sayi', 'karmasik sayi']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Sözcükte Anlam', topics: ['Mecaz Anlam', 'Deyim', 'Atasözü', 'Terim-Jargon'],
    keywords: ['tyt turkce', 'turkce', 'sozcuk anlam', 'mecaz deyim']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Paragraf Tamamlama', 'Metin Türleri'],
    keywords: ['paragraf', 'metin anlama', 'baslik']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Türkçe',
    unit: 'Dil Bilgisi', topics: ['Sözcük Türleri', 'Cümle Öğeleri', 'Fiil Çekimleri'],
    keywords: ['dil bilgisi', 'sozcuk turu', 'cumle']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Edebiyat',
    unit: 'Yazılı Provaları', topics: ['Yazılı Prova 1', 'Yazılı Prova 2', 'Yazılı Prova 3'],
    keywords: ['ayt edebiyat', 'edebiyat', 'yazili prova', 'yazili']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Edebiyat',
    unit: 'Tanzimat Dönemi', topics: ['Tanzimat Şiiri', 'Tanzimat Romanı', 'Önemli Şahsiyetler'],
    keywords: ['tanzimat', 'edebiyat tarihi']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Edebiyat',
    unit: 'Servet-i Fünun', topics: ['Servet-i Fünun Şiiri', 'Servet-i Fünun Nesri'],
    keywords: ['servet ifunun', 'servetifunun', 'edebiyat']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Fizik',
    unit: 'Kuvvet ve Hareket', topics: ['Newton Yasaları', 'Sürtünme', 'Dairesel Hareket'],
    keywords: ['fizik', 'kuvvet', 'hareket', 'newton']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Fizik',
    unit: 'Elektromanyetizma', topics: ['Manyetik Alan', 'Elektromanyetik İndüksiyon', 'Transformatör'],
    keywords: ['ayt fizik', 'elektromanyetizma', 'manyetik']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Kimya',
    unit: 'Atom ve Periyodik Sistem', topics: ['Atom Modelleri', 'Periyodik Cetvel', 'Elektron Dizilimi'],
    keywords: ['kimya', 'atom', 'periyodik sistem']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Kimya',
    unit: 'Kimyasal Denge', topics: ['Denge Sabiti', 'Le Chatelier İlkesi', 'Çözünürlük Dengesi'],
    keywords: ['ayt kimya', 'kimyasal denge', 'le chatelier']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Biyoloji',
    unit: 'Hücre Bölünmesi', topics: ['Mitoz', 'Mayoz', 'Embriyo Gelişimi'],
    keywords: ['biyoloji', 'mitoz', 'mayoz', 'hucre bolunmesi']
  },
  {
    grade: '12. Sınıf', lessonCard: 'AYT Biyoloji',
    unit: 'Kalıtım', topics: ['Mendel Kalıtımı', 'Kan Grupları', 'Genetik Hastalıklar'],
    keywords: ['ayt biyoloji', 'kalitim', 'mendel', 'genetik']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Tarih',
    unit: 'Osmanlı Tarihi', topics: ['Kuruluş Dönemi', 'Yükseliş Dönemi', 'Duraklama-Gerileme'],
    keywords: ['tarih', 'osmanli', 'tyt tarih']
  },
  {
    grade: '12. Sınıf', lessonCard: 'TYT Coğrafya',
    unit: 'İklim ve Bitki Örtüsü', topics: ['İklim Tipleri', 'Bitki Örtüsü', 'Türkiye İklimi'],
    keywords: ['cografya', 'iklim', 'bitki ortusu']
  },

  // ═══════════════════════════════════════════════════════════
  // YKS 2028
  // ═══════════════════════════════════════════════════════════
  {
    grade: 'YKS 2028', lessonCard: 'TYT Matematik',
    unit: 'Temel Kavramlar', topics: ['Sayı Kümeleri', 'Üslü Sayılar', 'Köklü Sayılar'],
    keywords: ['yks 2028', 'tyt mat', 'matematik', 'temel']
  },
  {
    grade: 'YKS 2028', lessonCard: 'TYT Matematik',
    unit: 'Mantık', topics: ['Önermeler', 'Çıkarım Kuralları', 'Doğruluk Tablosu'],
    keywords: ['mantik', '2028']
  },
  {
    grade: 'YKS 2028', lessonCard: 'AYT Matematik',
    unit: 'Türev ve İntegral', topics: ['Türev', 'İntegral', 'Diferansiyel Denklemler'],
    keywords: ['yks 2028 mat', 'ayt mat', 'turev integral']
  },
  {
    grade: 'YKS 2028', lessonCard: 'TYT Türkçe',
    unit: 'Paragraf', topics: ['Ana Düşünce', 'Paragraf Tamamlama', 'Basit/Karmaşık Paragraf'],
    keywords: ['yks 2028 turkce', 'paragraf', '2028 turkce']
  },
  {
    grade: 'YKS 2028', lessonCard: 'AYT Fizik',
    unit: 'Modern Fizik', topics: ['Fotoelektrik Olay', 'Dalga-Tanecik İkilemi', 'Nükleer Fizik'],
    keywords: ['yks fizik', 'modern fizik', '2028 fizik']
  },
];

// ─── TEST VE DENEME LİSTESİ (TÜM SINIFLAR & GERÇEK SEKMELER) ───────────────────
export const TEST_DB: TestEntry[] = [
  // ═══════════════════════════════════════════════════════════
  // 8. SINIF (LGS)
  // ═══════════════════════════════════════════════════════════
  // Bireysel Denemeler
  { grade: '8. Sınıf', category: 'Seviye Tespit', subTab: 'Bireysel Denemeler', testName: 'LGS TURBO Seviye Tespit Sınavı', keywords: ['turbo', 'seviye tespit', 'lgs seviye tespit', 'turbo lgs', 'sts', 'lgs deneme', 'deneme', 'deneme coz'] },
  { grade: '8. Sınıf', category: 'Seviye Tespit', subTab: 'Bireysel Denemeler', testName: 'LGS Seviye Tespit Sınavı', keywords: ['seviye tespit', 'lgs seviye', 'sts'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 1.Deneme', keywords: ['lgs 1', '1 deneme', 'ilk deneme', 'lgs 1 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 2.Deneme', keywords: ['lgs 2', '2 deneme', 'lgs 2 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 3.Deneme', keywords: ['lgs 3', '3 deneme', 'lgs 3 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 4.Deneme', keywords: ['lgs 4', '4 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 5.Deneme', keywords: ['lgs 5', '5 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 6.Deneme', keywords: ['lgs 6', '6 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 7.Deneme', keywords: ['lgs 7', '7 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 8.Deneme', keywords: ['lgs 8', '8 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 9.Deneme', keywords: ['lgs 9', '9 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 10.Deneme', keywords: ['lgs 10', '10 deneme'] },
  { grade: '8. Sınıf', category: 'LGS Denemeleri', subTab: 'Bireysel Denemeler', testName: 'LGS 11.Deneme', keywords: ['lgs 11', '11 deneme'] },
  // Tarama Testleri
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Asal Sayılar ve Tam Bölenler-Konu Testi 1', keywords: ['asal sayilar', 'tam bolenler', 'matematik tarama', 'mat testi'] },
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Asal Sayılar ve Tam Bölenler-Konu Testi 2', keywords: ['asal sayilar 2', 'tam bolenler 2'] },
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Asal Sayılar ve Tam Bölenler-Konu Testi 3', keywords: ['asal sayilar 3'] },
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Asal Sayılar ve Tam Bölenler-Konu Testi 4', keywords: ['tarama testi', 'tarama', 'tarama coz', 'asal sayilar 4', 'konu testi'] },
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Pozitif Tam Sayıların Çarpanları ve Asal Sayılar - Isınma Testi', keywords: ['isinma testi', 'carpanlar testi', 'pozitif tam sayilar'] },
  { grade: '8. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'Pozitif Tam Sayıların Çarpanları ve Asal Sayılar - Pekiştirme Testi 1', keywords: ['pekistirme testi', 'carpanlar pekistirme'] },
  // Geçmiş MEB Sınavları
  { grade: '8. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş MEB Sınavları', testName: 'LGS 2026', keywords: ['lgs 2026', '2026 lgs', 'gecmis meb', 'cikmis lgs'] },
  { grade: '8. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş MEB Sınavları', testName: 'LGS 2025', keywords: ['lgs 2025', '2025 lgs', 'cikmis lgs'] },
  { grade: '8. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş MEB Sınavları', testName: 'LGS 2024', keywords: ['lgs 2024', '2024 lgs', 'cikmis lgs'] },
  { grade: '8. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş MEB Sınavları', testName: 'LGS 2023', keywords: ['lgs 2023', '2023 lgs', 'cikmis lgs'] },
  // Deneme Kulübü
  { grade: '8. Sınıf', category: 'Canlı Denemeler', subTab: 'Deneme Kulübü', testName: 'Doping Hafıza Canlı Denemeleri', keywords: ['canli deneme', 'deneme kulubu', 'turkiye geneli'] },
  // Strateji Denemeleri
  { grade: '8. Sınıf', category: 'Strateji', subTab: 'Strateji Denemeleri', testName: 'Her Alanda Mini Denemeler', keywords: ['mini deneme', 'strateji denemesi', 'zaman yonetimi'] },

  // ═══════════════════════════════════════════════════════════
  // 12. SINIF (YKS)
  // ═══════════════════════════════════════════════════════════
  // Bireysel Denemeler
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 1', keywords: ['ayt mat deneme', 'brans denemesi', 'ayt mat 1', 'ayt deneme', 'mat deneme'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 2', keywords: ['ayt mat 2', 'ayt mat deneme 2'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 3', keywords: ['ayt mat 3', 'ayt mat deneme 3'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 4', keywords: ['ayt mat 4', 'ayt mat deneme 4'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 5', keywords: ['ayt mat 5', 'ayt mat deneme 5'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 6', keywords: ['ayt mat 6', 'ayt mat deneme 6'] },
  { grade: '12. Sınıf', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'AYT Matematik Branş Denemesi 7', keywords: ['ayt mat 7', 'ayt mat deneme 7'] },
  { grade: '12. Sınıf', category: 'TYT Denemeleri', subTab: 'Bireysel Denemeler', testName: 'TYT Tam Deneme 1', keywords: ['tyt deneme', 'tyt tam deneme 1', 'tyt testi', 'tyt 1'] },
  { grade: '12. Sınıf', category: 'TYT Denemeleri', subTab: 'Bireysel Denemeler', testName: 'TYT Tam Deneme 2', keywords: ['tyt deneme 2', 'tyt tam deneme 2', 'tyt 2'] },
  // Tarama Testleri
  { grade: '12. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'TYT Mat Üslü Sayılar Tarama Testi', keywords: ['uslu test', 'tyt mat test', 'tarama testi'] },
  { grade: '12. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'AYT Mat Türev Tarama Testi', keywords: ['turev testi', 'ayt mat tarama'] },
  { grade: '12. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: 'TYT Türkçe Paragraf Tarama Testi', keywords: ['paragraf testi', 'turkce tarama'] },
  // Geçmiş ÖSYM Sınavları
  { grade: '12. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş ÖSYM Sınavları', testName: '2024 TYT Çıkmış Sınavı', keywords: ['2024 tyt', 'cikmis tyt', 'osym tyt 2024', 'cikmis sinavlar'] },
  { grade: '12. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş ÖSYM Sınavları', testName: '2024 AYT Çıkmış Sınavı', keywords: ['2024 ayt', 'cikmis ayt', 'osym ayt 2024'] },
  { grade: '12. Sınıf', category: 'Geçmiş Sınavlar', subTab: 'Geçmiş ÖSYM Sınavları', testName: '2023 TYT Çıkmış Sınavı', keywords: ['2023 tyt', 'cikmis tyt 2023'] },
  // Deneme Kulübü
  { grade: '12. Sınıf', category: 'Canlı Denemeler', subTab: 'Deneme Kulübü', testName: 'Doping Hafıza Canlı YKS Denemesi', keywords: ['yks canli deneme', 'turkiye geneli tyt', 'canli deneme'] },
  // Strateji Denemeleri
  { grade: '12. Sınıf', category: 'Strateji', subTab: 'Strateji Denemeleri', testName: 'Her Alanda Mini Denemeler', keywords: ['mini deneme', 'tyt zaman yonetimi', 'hiz denemesi'] },

  // ═══════════════════════════════════════════════════════════
  // YKS 2028
  // ═══════════════════════════════════════════════════════════
  { grade: 'YKS 2028', category: 'Branş Denemeleri', subTab: 'Bireysel Denemeler', testName: 'YKS 2028 Seviye Tespit Sınavı', keywords: ['2028 deneme', 'yks 2028 deneme', '2028 seviye tespit'] },
  { grade: 'YKS 2028', category: 'TYT Denemeleri', subTab: 'Bireysel Denemeler', testName: 'YKS 2028 TYT Denemesi 1', keywords: ['2028 tyt', 'yks 2028 tyt 1'] },

  // ═══════════════════════════════════════════════════════════
  // 4, 5, 6, 7, 9, 10, 11. SINIFLAR
  // ═══════════════════════════════════════════════════════════
  { grade: '4. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '4. Sınıf Seviye Tespit Sınavı', keywords: ['4 sinif deneme', 'seviye tespit'] },
  { grade: '4. Sınıf', category: 'Konu Testleri', subTab: 'Tarama Testleri', testName: '4. Sınıf Matematik Tarama Testi', keywords: ['4 mat test', 'tarama'] },
  { grade: '5. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '5. Sınıf Seviye Tespit Sınavı', keywords: ['5 sinif deneme', 'seviye tespit'] },
  { grade: '6. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '6. Sınıf Seviye Tespit Sınavı', keywords: ['6 sinif deneme', 'seviye tespit'] },
  { grade: '7. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '7. Sınıf Seviye Tespit Sınavı', keywords: ['7 sinif deneme', 'seviye tespit'] },
  { grade: '9. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '9. Sınıf Seviye Belirleme Sınavı', keywords: ['9 sinif deneme', 'lise seviye tespit'] },
  { grade: '10. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '10. Sınıf Seviye Belirleme Sınavı', keywords: ['10 sinif deneme', 'lise seviye tespit'] },
  { grade: '11. Sınıf', category: 'Genel Değerlendirme', subTab: 'Bireysel Denemeler', testName: '11. Sınıf Seviye Belirleme Sınavı', keywords: ['11 sinif deneme', 'tyt hazirlik denemesi'] },
];

// ─── WAY EVRENİ ALT BÖLÜMLERİ ────────────────────────────────────────────────
export const WAY_SECTIONS: WaySectionEntry[] = [
  { title: 'Görevlerim', keywords: ['gorev', 'gorevlerim', 'gunluk gorev', 'odev', 'sen kimsin'] },
  { title: 'WAY Startup Lab', keywords: ['startup', 'startup lab', 'proje', 'lab', 'girisim', 'girisimcilik'] },
  { title: '21.yy Dersleri', keywords: ['21.yy', '21 yy dersleri', 'gelecek dersleri', 'beceri'] },
  { title: 'Mission WAY', keywords: ['mission', 'mission way', 'gorev way', 'misyon'] },
  { title: 'Şövalye Takımı', keywords: ['sovalye', 'takim', 'sovalye takimi', 'klan', 'ekip'] },
];

// ─── LGS YOLCULUĞUM ALT SEKMELERİ (8. Sınıf) ──────────────────────────────────
export const LGS_JOURNEY_TABS: LgsJourneyTabEntry[] = [
  { tabName: 'Dersler', keywords: ['lgs dersler', 'ders ozeti', 'yolculuğum dersler', 'lgs derslerim'] },
  { tabName: "LGS'ye Ne Kadar Hazırım?", keywords: ['ne kadar hazirim', 'hazirlik', 'durum', 'lgs durum', 'hazir'] },
  { tabName: 'Sınav Performansı', keywords: ['sinav performansi', 'performans', 'grafik', 'netler', 'net'] },
];

// ─── AppKnowledgeBase SINIFI ─────────────────────────────────────────────────
export class AppKnowledgeBase {
  static readonly lessons: LessonEntry[] = LESSON_DB;
  static readonly tests: TestEntry[] = TEST_DB;
  static readonly waySections: WaySectionEntry[] = WAY_SECTIONS;
  static readonly lgsJourneyTabs: LgsJourneyTabEntry[] = LGS_JOURNEY_TABS;

  /**
   * WAY Evreni bölümü fuzzy araması.
   */
  static findWaySection(query: string): WaySectionEntry | null {
    const q = normalize(query);
    if (!q) return null;
    for (const sec of AppKnowledgeBase.waySections) {
      if (normalize(sec.title).includes(q) || q.includes(normalize(sec.title))) return sec;
      for (const kw of sec.keywords) {
        if (q.includes(normalize(kw))) return sec;
      }
    }
    return null;
  }

  /**
   * Lgs Yolculuğum sekmesi fuzzy araması.
   */
  static findLgsJourneyTab(query: string): LgsJourneyTabEntry | null {
    const q = normalize(query);
    if (!q) return null;
    for (const tab of AppKnowledgeBase.lgsJourneyTabs) {
      if (normalize(tab.tabName).includes(q) || q.includes(normalize(tab.tabName))) return tab;
      for (const kw of tab.keywords) {
        if (q.includes(normalize(kw))) return tab;
      }
    }
    return null;
  }

  /**
   * Ders/konu fuzzy araması.
   * @param query Kullanıcının yazdığı belirsiz metin (örn: "üslü sayılar", "mat")
   * @param grade Belirli sınıf (örn: "8. Sınıf"), verilmezse tüm sınıflarda arar
   * @returns En iyi eşleşen LessonEntry veya null
   */
  static findLesson(query: string, grade?: string): LessonEntry | null {
    const q = normalize(query);
    if (!q) return null;

    let candidates = grade
      ? AppKnowledgeBase.lessons.filter(l => normalize(l.grade) === normalize(grade))
      : AppKnowledgeBase.lessons;

    if (candidates.length === 0) candidates = AppKnowledgeBase.lessons;

    let best: LessonEntry | null = null;
    let bestScore = 0;

    for (const entry of candidates) {
      let score = 0;
      // Ünite adına göre skora
      score = Math.max(score, tokenScore(q, entry.unit) * 2);
      // Ders kartına göre
      score = Math.max(score, tokenScore(q, entry.lessonCard));
      // Konu isimlerine göre
      for (const topic of entry.topics) {
        score = Math.max(score, tokenScore(q, topic) * 1.5);
      }
      // Keyword listesine göre
      for (const kw of entry.keywords) {
        const nkw = normalize(kw);
        if (nkw.length <= 2) continue; // Çok kısa keyword — yanlış eşleşmeye yol açar
        if (nkw.includes(q) || q.includes(nkw)) {
          score = Math.max(score, 0.8);
        }
        score = Math.max(score, tokenScore(q, kw) * 1.2);
      }

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    // Belirli sınıfta eşleşme bulunamadıysa tüm sınıflarda ara
    if (bestScore < 0.3) {
      if (grade) {
        return AppKnowledgeBase.findLesson(query);
      }
      return null;
    }
    return best;
  }

  /**
   * Test fuzzy araması.
   * @param query Kullanıcının yazdığı belirsiz metin (örn: "lgs mat testi")
   * @param grade Belirli sınıf, verilmezse tüm sınıflarda arar
   */
  static findTest(query: string, grade?: string): TestEntry | null {
    const q = normalize(query);
    if (!q) return null;

    let candidates = grade
      ? AppKnowledgeBase.tests.filter(t => normalize(t.grade) === normalize(grade))
      : AppKnowledgeBase.tests;

    if (candidates.length === 0) candidates = AppKnowledgeBase.tests;

    let best: TestEntry | null = null;
    let bestScore = 0;

    for (const entry of candidates) {
      let score = 0;
      score = Math.max(score, tokenScore(q, entry.testName) * 2);
      score = Math.max(score, tokenScore(q, entry.category));
      score = Math.max(score, tokenScore(q, entry.subTab) * 1.5);
      for (const kw of entry.keywords) {
        const nkw = normalize(kw);
        if (nkw.length <= 2) continue;
        if (nkw.includes(q) || q.includes(nkw)) {
          score = Math.max(score, 0.8);
        }
        score = Math.max(score, tokenScore(q, kw) * 1.2);
      }

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    // Belirli sınıfta eşleşme bulunamadıysa tüm sınıflarda ara
    if (bestScore < 0.3) {
      if (grade) {
        return AppKnowledgeBase.findTest(query);
      }
      return null;
    }
    return best;
  }

  /**
   * Hem ders/konu hem test arar, en uygun sonucu döner.
   * { type: 'lesson', entry } veya { type: 'test', entry } veya null
   */
  static findAny(query: string, grade?: string): { type: 'lesson', entry: LessonEntry } | { type: 'test', entry: TestEntry } | null {
    const lesson = AppKnowledgeBase.findLesson(query, grade);
    const test = AppKnowledgeBase.findTest(query, grade);

    if (!lesson && !test) return null;
    if (lesson && !test) return { type: 'lesson', entry: lesson };
    if (!lesson && test) return { type: 'test', entry: test };

    // İkisi de varsa — açıkça deneme/büyük sınav araması mı, ders/konu (ve ders içi test) araması mı?
    const q = normalize(query);
    const isExamIntent = q.includes('deneme') || q.includes('seviye tespit') || q.includes('sts') ||
                         q.includes('cikmis sinav') || q.includes('osym') || q.includes('meb sinav') ||
                         q.includes('testler ve denemeler');
    if (isExamIntent && test) return { type: 'test', entry: test! };
    return { type: 'lesson', entry: lesson! };
  }

  /**
   * Belirli bir ünite adından konuya tam eşleşme
   */
  static findTopicInUnit(unitQuery: string, grade?: string): string | null {
    const entry = AppKnowledgeBase.findLesson(unitQuery, grade);
    if (!entry || entry.topics.length === 0) return null;
    return entry.topics[0]; // İlk konuyu döner
  }

  /**
   * Öz döküm: konsola KB özeti
   */
  static summarize(): string {
    const gradeCount: Record<string, number> = {};
    for (const l of AppKnowledgeBase.lessons) {
      gradeCount[l.grade] = (gradeCount[l.grade] || 0) + 1;
    }
    const lines = [`AppKnowledgeBase — ${AppKnowledgeBase.lessons.length} ünite, ${AppKnowledgeBase.tests.length} test`];
    for (const [g, c] of Object.entries(gradeCount)) {
      lines.push(`  ${g}: ${c} ünite`);
    }
    return lines.join('\n');
  }
}
