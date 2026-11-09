import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildCompleteTopology() {
  const topology = {
    updatedAt: new Date().toISOString(),
    gradeLevels: {
      HIGH_YKS: {
        gradeName: "12. Sınıf",
        subjects: [
          {
            id: "matematik_ayt",
            title: "Matematik (AYT)",
            selector: "a.box:has-text('Matematik'), button:has-text('Matematik (AYT)')",
            aliases: ["ayt mat", "12 mat", "matematik", "lise matematik", "mat ayt"],
            keywords: ["ayt", "matematik", "sayısal", "fonksiyon", "türev", "integral", "üslü"],
            topics: [
              {
                id: "uslu_sayilar_ayt",
                title: "Üslü Sayılar",
                selector: "div[data-topic='uslu-sayilar'], a:has-text('Üslü Sayılar')",
                aliases: ["üslü sayılar", "uslu sayilar", "üslü ifadeler"],
                keywords: ["üs", "kuvvet", "üslü denklem", "taban"],
                items: [
                  {
                    id: "uslu_sayilar_v1",
                    title: "Üslü Sayılarda Temel Kurallar",
                    type: "VIDEO",
                    aliases: ["üslü kurallar videosu", "üslü sayılar video"],
                    keywords: ["temel kurallar", "video", "konu anlatımı", "üs kuralları"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü Sayılar", selector: "a:has-text('Üslü Sayılar')" },
                      { action: "CLICK", target: "Üslü Sayılarda Temel Kurallar", selector: "a:has-text('Üslü Sayılarda Temel Kurallar'), button:has-text('İzle')" }
                    ]
                  },
                  {
                    id: "uslu_sayilar_t1",
                    title: "Üslü Sayılar Pekiştirme Testi 1",
                    type: "TEST",
                    aliases: ["üslü 1. test", "üslü 1. pekiştirme", "üslü sayılar test 1"],
                    keywords: ["pekiştirme", "test 1", "soru çözümü"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü Sayılar", selector: "a:has-text('Üslü Sayılar')" },
                      { action: "CLICK", target: "Pekiştirme Testi 1", selector: "a:has-text('Pekiştirme Testi 1'), button:has-text('Testi Çöz')" }
                    ]
                  },
                  {
                    id: "uslu_sayilar_t2",
                    title: "Üslü Sayılar Pekiştirme Testi 2",
                    type: "TEST",
                    aliases: ["üslü 2. test", "üslü 2. pekiştirme", "üslü sayılar test 2"],
                    keywords: ["pekiştirme", "test 2"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü Sayılar", selector: "a:has-text('Üslü Sayılar')" },
                      { action: "CLICK", target: "Pekiştirme Testi 2", selector: "a:has-text('Pekiştirme Testi 2'), button:has-text('Testi Çöz')" }
                    ]
                  },
                  {
                    id: "uslu_sayilar_t3",
                    title: "Üslü Sayılar Pekiştirme Testi 3",
                    type: "TEST",
                    aliases: ["üslü 3. test", "üslü sayılarda 3. pekiştirme", "üslü 3. pekiştirme", "üslü test 3"],
                    keywords: ["pekiştirme testi 3", "3. pekiştirme", "üslü 3"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü Sayılar", selector: "a:has-text('Üslü Sayılar')" },
                      { action: "CLICK", target: "Pekiştirme Testi 3", selector: "a:has-text('Pekiştirme Testi 3'), button:has-text('Testi Çöz')" }
                    ]
                  },
                  {
                    id: "mat_12_son_test",
                    title: "12. Sınıf Matematik Ünite Değerlendirme Son Test",
                    type: "TEST",
                    aliases: ["12 mat son test", "12. sınıf mat son test", "matematik son test", "son test"],
                    keywords: ["son test", "değerlendirme", "ünite sonu", "12 mat"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü Sayılar", selector: "a:has-text('Üslü Sayılar')" },
                      { action: "CLICK", target: "Ünite Değerlendirme Son Test", selector: "a:has-text('Son Test'), button:has-text('Testi Çöz')" }
                    ]
                  }
                ]
              },
              {
                id: "fonksiyonlar_ayt",
                title: "Fonksiyonlar ve Grafikler",
                selector: "div[data-topic='fonksiyonlar'], a:has-text('Fonksiyonlar')",
                aliases: ["fonksiyonlar", "fonksiyon grafikleri", "grafikler"],
                keywords: ["fonksiyon", "grafik", "parabol", "tanım kümesi", "görüntü kümesi"],
                items: [
                  {
                    id: "fonksiyon_grafikleri_video",
                    title: "Fonksiyon Grafikleri Videosu",
                    type: "VIDEO",
                    aliases: ["fonksiyon grafikleri videosu", "fonksiyon grafik video", "grafikler videosu"],
                    keywords: ["grafik", "video", "anlatım", "fonksiyon çizimi"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Fonksiyonlar ve Grafikler", selector: "a:has-text('Fonksiyonlar')" },
                      { action: "CLICK", target: "Fonksiyon Grafikleri", selector: "a:has-text('Fonksiyon Grafikleri'), button:has-text('İzle')" }
                    ]
                  },
                  {
                    id: "fonksiyonlar_t1",
                    title: "Fonksiyon Grafikleri Pekiştirme Testi",
                    type: "TEST",
                    aliases: ["fonksiyon grafik test", "fonksiyon pekiştirme"],
                    keywords: ["test", "grafik testi"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Fonksiyonlar ve Grafikler", selector: "a:has-text('Fonksiyonlar')" },
                      { action: "CLICK", target: "Pekiştirme Testi", selector: "a:has-text('Pekiştirme Testi'), button:has-text('Testi Çöz')" }
                    ]
                  }
                ]
              },
              {
                id: "turev_ayt",
                title: "Türev",
                selector: "a:has-text('Türev')",
                aliases: ["türev", "turev", "türev alma"],
                keywords: ["türev", "teğet", "ekstremum"],
                items: [
                  {
                    id: "turev_v1",
                    title: "Türev Alma Kuralları Videosu",
                    type: "VIDEO",
                    aliases: ["türev video", "türev alma kuralları"],
                    keywords: ["türev kuralları", "video"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Türev", selector: "a:has-text('Türev')" },
                      { action: "CLICK", target: "Türev Alma Kuralları", selector: "a:has-text('Türev Alma Kuralları'), button:has-text('İzle')" }
                    ]
                  },
                  {
                    id: "turev_t1",
                    title: "Türev Pekiştirme Testi 1",
                    type: "TEST",
                    aliases: ["türev test 1", "türev pekiştirme"],
                    keywords: ["türev testi"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik (AYT)", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Türev", selector: "a:has-text('Türev')" },
                      { action: "CLICK", target: "Pekiştirme Testi 1", selector: "a:has-text('Pekiştirme Testi 1'), button:has-text('Testi Çöz')" }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "yks_denemeler",
            title: "YKS Denemeleri ve Sınavlar",
            selector: "a.link:has-text('Testler ve Denemeler')",
            aliases: ["denemeler", "sınavlar", "testler ve denemeler", "ayt deneme", "tyt deneme"],
            keywords: ["deneme", "tyt", "ayt", "ösym", "tarama"],
            topics: [
              {
                id: "bireysel_denemeler_yks",
                title: "Bireysel Denemeler",
                selector: "li.menu-item:has-text('Bireysel Denemeler')",
                aliases: ["yks bireysel denemeler", "ayt bireysel", "tyt bireysel"],
                keywords: ["bireysel", "deneme sınavı"],
                items: [
                  {
                    id: "tyt_1_deneme",
                    title: "TYT 1.Deneme",
                    type: "TEST",
                    aliases: ["tyt 1", "tyt 1. deneme", "tyt ilk deneme"],
                    keywords: ["tyt", "1. deneme", "bireysel"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "TYT 1.Deneme", selector: "li.exam-toggle-list-item:has-text('TYT 1.Deneme') button, li.exam-toggle-list-item:has-text('TYT 1.Deneme') a" }
                    ]
                  },
                  {
                    id: "ayt_sayisal_1_deneme",
                    title: "AYT Sayısal 1.Deneme",
                    type: "TEST",
                    aliases: ["ayt sayısal 1", "ayt mat fen 1. deneme"],
                    keywords: ["ayt", "sayısal", "1. deneme"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "AYT Sayısal 1.Deneme", selector: "li.exam-toggle-list-item:has-text('AYT Sayısal 1.Deneme') button" }
                    ]
                  }
                ]
              },
              {
                id: "tarama_testleri_yks",
                title: "Tarama Testleri",
                selector: "li.menu-item:has-text('Tarama Testleri')",
                aliases: ["yks tarama testleri", "ayt tarama"],
                keywords: ["tarama", "ünite tarama"],
                items: [
                  {
                    id: "mat_tarama_yks_1",
                    title: "12. Sınıf Matematik Tarama Testi 1",
                    type: "TEST",
                    aliases: ["12 mat tarama 1", "matematik tarama 1"],
                    keywords: ["tarama", "matematik", "1"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Tarama Testleri", selector: "li.menu-item:has-text('Tarama Testleri')" },
                      { action: "CLICK", target: "12. Sınıf Matematik Tarama Testi 1", selector: "li.exam-toggle-list-item:has-text('Matematik') button" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      MIDDLE_LGS: {
        gradeName: "8. Sınıf",
        subjects: [
          {
            id: "lgs_matematik",
            title: "Doping Reflekslerle Matematik",
            selector: "a.box:has-text('Matematik'), div.box:has-text('Matematik')",
            aliases: ["lgs matematik", "8 mat", "matematik", "lgs mat"],
            keywords: ["matematik", "lgs", "üslü", "çarpanlar", "kareköklü", "olasılık"],
            topics: [
              {
                id: "lgs_uslu_ifadeler",
                title: "Üslü İfadeler",
                selector: "a:has-text('Üslü İfadeler'), div.unit-item:has-text('Üslü')",
                aliases: ["üslü sayılar", "uslu sayilar", "üslü ifadeler", "üs"],
                keywords: ["üslü", "üs", "tam sayı kuvveti", "ondalık gösterim"],
                items: [
                  {
                    id: "lgs_uslu_v1",
                    title: "Tam Sayıların Tam Sayı Kuvvetleri Videosu",
                    type: "VIDEO",
                    aliases: ["üslü sayılar video", "tam sayı kuvvetleri videosu"],
                    keywords: ["video", "anlatım", "tam sayı kuvveti"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü İfadeler", selector: "a:has-text('Üslü İfadeler')" },
                      { action: "CLICK", target: "Tam Sayıların Tam Sayı Kuvvetleri", selector: "button:has-text('İzle'), a:has-text('Kuvvetleri')" }
                    ]
                  },
                  {
                    id: "lgs_uslu_t1",
                    title: "Üslü İfadeler Pekiştirme Testi 1",
                    type: "TEST",
                    aliases: ["üslü 1. test", "üslü test 1", "üslü 1. pekiştirme"],
                    keywords: ["test", "pekiştirme 1", "soru"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü İfadeler", selector: "a:has-text('Üslü İfadeler')" },
                      { action: "CLICK", target: "Pekiştirme Testi 1", selector: "button:has-text('Testi Çöz'), a:has-text('Pekiştirme Testi 1')" }
                    ]
                  },
                  {
                    id: "lgs_uslu_t2",
                    title: "Üslü İfadeler Pekiştirme Testi 2",
                    type: "TEST",
                    aliases: ["üslü 2. test", "üslü test 2", "üslü 2. pekiştirme"],
                    keywords: ["test", "pekiştirme 2"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü İfadeler", selector: "a:has-text('Üslü İfadeler')" },
                      { action: "CLICK", target: "Pekiştirme Testi 2", selector: "button:has-text('Testi Çöz'), a:has-text('Pekiştirme Testi 2')" }
                    ]
                  },
                  {
                    id: "lgs_uslu_t3",
                    title: "Üslü İfadeler Pekiştirme Testi 3",
                    type: "TEST",
                    aliases: ["üslü sayılarda 3. pekiştirme", "üslü 3. pekiştirme", "üslü test 3"],
                    keywords: ["3. pekiştirme", "test 3", "üslü 3"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Üslü İfadeler", selector: "a:has-text('Üslü İfadeler')" },
                      { action: "CLICK", target: "Pekiştirme Testi 3", selector: "button:has-text('Testi Çöz'), a:has-text('Pekiştirme Testi 3')" }
                    ]
                  }
                ]
              },
              {
                id: "lgs_carpanlar_katlar",
                title: "Çarpanlar ve Katlar",
                selector: "a:has-text('Çarpanlar ve Katlar')",
                aliases: ["çarpanlar katlar", "ebob ekok", "çarpanlar"],
                keywords: ["çarpan", "kat", "ebob", "ekok", "asal sayı"],
                items: [
                  {
                    id: "lgs_carpanlar_v1",
                    title: "Pozitif Tam Sayıların Çarpanları Videosu",
                    type: "VIDEO",
                    aliases: ["çarpanlar video", "ebob ekok videosu"],
                    keywords: ["video", "pozitif çarpan"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Çarpanlar ve Katlar", selector: "a:has-text('Çarpanlar ve Katlar')" },
                      { action: "CLICK", target: "Pozitif Tam Sayıların Çarpanları", selector: "button:has-text('İzle')" }
                    ]
                  },
                  {
                    id: "lgs_carpanlar_t1",
                    title: "Çarpanlar ve Katlar Pekiştirme Testi 1",
                    type: "TEST",
                    aliases: ["çarpanlar test 1", "ebob ekok testi"],
                    keywords: ["test", "çarpan testi"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Çarpanlar ve Katlar", selector: "a:has-text('Çarpanlar ve Katlar')" },
                      { action: "CLICK", target: "Pekiştirme Testi 1", selector: "button:has-text('Testi Çöz')" }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "lgs_denemeler_panel",
            title: "LGS Denemeleri ve Testler",
            selector: "a.link:has-text('Testler ve Denemeler')",
            aliases: ["lgs deneme", "lgs sınavlar", "testler ve denemeler", "deneme sınavları"],
            keywords: ["lgs deneme", "deneme çöz", "sınav", "deneme"],
            topics: [
              {
                id: "lgs_bireysel_denemeler",
                title: "Bireysel Denemeler",
                selector: "li.menu-item:has-text('Bireysel Denemeler')",
                aliases: ["bireysel denemeler", "lgs deneme listesi"],
                keywords: ["deneme", "lgs 1", "lgs 2", "lgs 3", "lgs 4", "lgs 5", "turbo"],
                items: [
                  {
                    id: "lgs_1_deneme",
                    title: "LGS 1.Deneme",
                    type: "TEST",
                    aliases: ["lgs 1", "lgs 1. deneme", "1. lgs denemesi"],
                    keywords: ["1. deneme", "lgs 1"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS 1.Deneme", selector: "li.exam-toggle-list-item:has-text('LGS 1.Deneme') button, li.exam-toggle-list-item:has-text('LGS 1.Deneme') a" }
                    ]
                  },
                  {
                    id: "lgs_2_deneme",
                    title: "LGS 2.Deneme",
                    type: "TEST",
                    aliases: ["lgs 2", "lgs 2. deneme", "2. lgs denemesi"],
                    keywords: ["2. deneme", "lgs 2"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS 2.Deneme", selector: "li.exam-toggle-list-item:has-text('LGS 2.Deneme') button, li.exam-toggle-list-item:has-text('LGS 2.Deneme') a" }
                    ]
                  },
                  {
                    id: "lgs_3_deneme",
                    title: "LGS 3.Deneme",
                    type: "TEST",
                    aliases: ["lgs 3", "lgs 3. deneme", "lgs 3. deneme çöz", "3. deneme"],
                    keywords: ["3. deneme", "lgs 3", "deneme çöz"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS 3.Deneme", selector: "li.exam-toggle-list-item:has-text('LGS 3.Deneme') button, li.exam-toggle-list-item:has-text('LGS 3.Deneme') a" }
                    ]
                  },
                  {
                    id: "lgs_4_deneme",
                    title: "LGS 4.Deneme",
                    type: "TEST",
                    aliases: ["lgs 4", "lgs 4. deneme", "4. lgs denemesi"],
                    keywords: ["4. deneme", "lgs 4"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS 4.Deneme", selector: "li.exam-toggle-list-item:has-text('LGS 4.Deneme') button, li.exam-toggle-list-item:has-text('LGS 4.Deneme') a" }
                    ]
                  },
                  {
                    id: "lgs_5_deneme",
                    title: "LGS 5.Deneme",
                    type: "TEST",
                    aliases: ["lgs 5", "lgs 5. deneme", "5. lgs denemesi"],
                    keywords: ["5. deneme", "lgs 5"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS 5.Deneme", selector: "li.exam-toggle-list-item:has-text('LGS 5.Deneme') button, li.exam-toggle-list-item:has-text('LGS 5.Deneme') a" }
                    ]
                  },
                  {
                    id: "lgs_turbo_seviye",
                    title: "LGS TURBO Seviye Tespit Sınavı",
                    type: "TEST",
                    aliases: ["turbo seviye", "seviye tespit", "lgs turbo", "turbo sınav"],
                    keywords: ["turbo", "seviye tespit"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Bireysel Denemeler", selector: "li.menu-item:has-text('Bireysel Denemeler')" },
                      { action: "CLICK", target: "LGS TURBO Seviye Tespit Sınavı", selector: "li.exam-toggle-list-item:has-text('TURBO') button" }
                    ]
                  }
                ]
              },
              {
                id: "lgs_tarama_testleri",
                title: "Tarama Testleri",
                selector: "li.menu-item:has-text('Tarama Testleri')",
                aliases: ["tarama testleri", "tarama", "ünite tarama"],
                keywords: ["tarama", "konu tarama", "matematik tarama", "türkçe tarama", "fen tarama"],
                items: [
                  {
                    id: "lgs_tarama_mat_1",
                    title: "8. Sınıf Matematik Tarama Testi 1",
                    type: "TEST",
                    aliases: ["mat tarama 1", "matematik tarama 1", "lgs mat tarama"],
                    keywords: ["matematik", "tarama 1"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Tarama Testleri", selector: "li.menu-item:has-text('Tarama Testleri')" },
                      { action: "CLICK", target: "8. Sınıf Matematik Tarama Testi 1", selector: "li.exam-toggle-list-item:has-text('Matematik') button" }
                    ]
                  },
                  {
                    id: "lgs_tarama_fen_1",
                    title: "8. Sınıf Fen Bilimleri Tarama Testi 1",
                    type: "TEST",
                    aliases: ["fen tarama 1", "fen bilimleri tarama 1"],
                    keywords: ["fen", "tarama 1"],
                    pathSequence: [
                      { action: "CLICK", target: "Testler ve Denemeler", selector: "a.link:has-text('Testler ve Denemeler')" },
                      { action: "CLICK", target: "Tarama Testleri", selector: "li.menu-item:has-text('Tarama Testleri')" },
                      { action: "CLICK", target: "8. Sınıf Fen Bilimleri Tarama Testi 1", selector: "li.exam-toggle-list-item:has-text('Fen Bilimleri') button" }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "way_evreni_panel",
            title: "WAY Evreni",
            selector: "a.link:has-text('WAY Evreni')",
            aliases: ["way evreni", "way", "dopi future"],
            keywords: ["way", "startup lab", "mission way", "şövalye", "görevlerim", "21.yy"],
            topics: [
              {
                id: "way_sections",
                title: "WAY Modülleri",
                selector: "div.way-card",
                aliases: ["way modülleri", "way kartları"],
                keywords: ["way", "lab", "görev"],
                items: [
                  {
                    id: "way_startup_lab",
                    title: "WAY Startup Lab",
                    type: "INTERACTIVE",
                    aliases: ["way startup lab'a git", "way startup lab", "startup lab", "startup"],
                    keywords: ["startup lab", "girişimcilik", "way"],
                    pathSequence: [
                      { action: "CLICK", target: "WAY Evreni", selector: "a.link:has-text('WAY Evreni')" },
                      { action: "CLICK", target: "WAY Startup Lab", selector: ".way-card:has-text('WAY Startup Lab') a, .way-card:has-text('Startup Lab') button" }
                    ]
                  },
                  {
                    id: "way_gorevlerim",
                    title: "Görevlerim",
                    type: "INTERACTIVE",
                    aliases: ["way görevlerim", "görevlerim", "way görevler"],
                    keywords: ["görev", "görevlerim", "way"],
                    pathSequence: [
                      { action: "CLICK", target: "WAY Evreni", selector: "a.link:has-text('WAY Evreni')" },
                      { action: "CLICK", target: "Görevlerim", selector: ".way-card:has-text('Görevlerim') a, .way-card:has-text('Görevlerim') button" }
                    ]
                  },
                  {
                    id: "way_21_yy_dersleri",
                    title: "21.yy Dersleri",
                    type: "VIDEO",
                    aliases: ["21.yy dersleri", "yirmi bir dersleri", "21 yüzyıl"],
                    keywords: ["21.yy", "yüzyıl", "beceriler"],
                    pathSequence: [
                      { action: "CLICK", target: "WAY Evreni", selector: "a.link:has-text('WAY Evreni')" },
                      { action: "CLICK", target: "21.yy Dersleri", selector: ".way-card:has-text('21.yy Dersleri') a" }
                    ]
                  },
                  {
                    id: "way_mission",
                    title: "Mission WAY",
                    type: "INTERACTIVE",
                    aliases: ["mission way", "way görev"],
                    keywords: ["mission", "uzay"],
                    pathSequence: [
                      { action: "CLICK", target: "WAY Evreni", selector: "a.link:has-text('WAY Evreni')" },
                      { action: "CLICK", target: "Mission WAY", selector: ".way-card:has-text('Mission WAY') a" }
                    ]
                  },
                  {
                    id: "way_sovalye_takimi",
                    title: "Şövalye Takımı",
                    type: "INTERACTIVE",
                    aliases: ["şövalye takımı", "sovalye takimi"],
                    keywords: ["şövalye", "takım"],
                    pathSequence: [
                      { action: "CLICK", target: "WAY Evreni", selector: "a.link:has-text('WAY Evreni')" },
                      { action: "CLICK", target: "Şövalye Takımı", selector: ".way-card:has-text('Şövalye Takımı') a" }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "lgs_yolculugum_panel",
            title: "LGS Yolculuğum",
            selector: "a.link:has-text('Lgs Yolculuğum'), a.link:has-text('LGS Yolculuğum')",
            aliases: ["lgs yolculuğum", "yolculuğum", "lgs journey"],
            keywords: ["lgs yolculuğum", "hazırım", "performans", "hedef"],
            topics: [
              {
                id: "lgs_journey_tabs",
                title: "LGS Yolculuğum Sekmeleri",
                selector: "button.lgs-journey-page__tab-btn",
                aliases: ["yolculuğum sekmeleri"],
                keywords: ["sekme", "hazırlık"],
                items: [
                  {
                    id: "lgs_journey_ne_kadar_hazirim",
                    title: "LGS'ye Ne Kadar Hazırım?",
                    type: "TAB",
                    aliases: ["lgs'ye ne kadar hazırım", "lgs ye ne kadar hazirim", "ne kadar hazırım sekmesini aç"],
                    keywords: ["ne kadar hazırım", "hazırlık", "durum"],
                    pathSequence: [
                      { action: "CLICK", target: "Lgs Yolculuğum", selector: "a.link:has-text('Lgs Yolculuğum')" },
                      { action: "CLICK", target: "LGS'ye Ne Kadar Hazırım?", selector: "button.lgs-journey-page__tab-btn:has-text('LGS\\'ye Ne Kadar Hazırım?')" }
                    ]
                  },
                  {
                    id: "lgs_journey_dersler",
                    title: "Dersler (LGS Yolculuğum)",
                    type: "TAB",
                    aliases: ["lgs yolculuğum dersler", "lgs derslerim sekmesi"],
                    keywords: ["dersler", "lgs yolculuk"],
                    pathSequence: [
                      { action: "CLICK", target: "Lgs Yolculuğum", selector: "a.link:has-text('Lgs Yolculuğum')" },
                      { action: "CLICK", target: "Dersler", selector: "button.lgs-journey-page__tab-btn:has-text('Dersler')" }
                    ]
                  },
                  {
                    id: "lgs_journey_sinav_performansi",
                    title: "Sınav Performansı",
                    type: "TAB",
                    aliases: ["sınav performansı", "lgs performans", "deneme analizi"],
                    keywords: ["performans", "sınav grafiği", "netler"],
                    pathSequence: [
                      { action: "CLICK", target: "Lgs Yolculuğum", selector: "a.link:has-text('Lgs Yolculuğum')" },
                      { action: "CLICK", target: "Sınav Performansı", selector: "button.lgs-journey-page__tab-btn:has-text('Sınav Performansı')" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      PRIMARY: {
        gradeName: "4. Sınıf",
        subjects: [
          {
            id: "primary_matematik",
            title: "4. Sınıf Matematik",
            selector: "a.box:has-text('Matematik')",
            aliases: ["4 mat", "4. sınıf matematik", "ilkokul matematik"],
            keywords: ["ilkokul", "matematik", "4. sınıf", "doğal sayılar", "kesirler"],
            topics: [
              {
                id: "primary_dogal_sayilar",
                title: "Doğal Sayılar",
                selector: "a:has-text('Doğal Sayılar')",
                aliases: ["doğal sayılar", "sayılar", "dört işlem"],
                keywords: ["doğal sayı", "basamak", "bölük"],
                items: [
                  {
                    id: "primary_dogal_sayilar_v1",
                    title: "4, 5 ve 6 Basamaklı Doğal Sayılar Videosu",
                    type: "VIDEO",
                    aliases: ["basamaklı sayılar video", "doğal sayılar videosu"],
                    keywords: ["video", "basamak"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "4. Sınıf Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Doğal Sayılar", selector: "a:has-text('Doğal Sayılar')" },
                      { action: "CLICK", target: "4, 5 ve 6 Basamaklı Doğal Sayılar", selector: "button:has-text('İzle')" }
                    ]
                  },
                  {
                    id: "primary_dogal_sayilar_t1",
                    title: "Doğal Sayılar Pekiştirme Testi 1",
                    type: "TEST",
                    aliases: ["doğal sayılar test 1", "4 mat pekiştirme 1"],
                    keywords: ["test", "pekiştirme"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "4. Sınıf Matematik", selector: "a.box:has-text('Matematik')" },
                      { action: "CLICK", target: "Doğal Sayılar", selector: "a:has-text('Doğal Sayılar')" },
                      { action: "CLICK", target: "Pekiştirme Testi 1", selector: "button:has-text('Testi Çöz')" }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "primary_fen",
            title: "4. Sınıf Fen Bilimleri",
            selector: "a.box:has-text('Fen Bilimleri')",
            aliases: ["4 fen", "ilkokul fen"],
            keywords: ["fen", "yer kabuğu", "dünya", "besinler"],
            topics: [
              {
                id: "primary_yer_kabugu",
                title: "Yer Kabuğu ve Dünyamızın Hareketleri",
                selector: "a:has-text('Yer Kabuğu')",
                aliases: ["yer kabuğu", "dünyanın hareketleri"],
                keywords: ["yer kabuğu", "kayaç", "maden", "fosil"],
                items: [
                  {
                    id: "primary_yer_kabugu_v1",
                    title: "Kayaçlar ve Mineraller Videosu",
                    type: "VIDEO",
                    aliases: ["kayaçlar video", "yer kabuğu videosu"],
                    keywords: ["video", "kayaç", "mineral"],
                    pathSequence: [
                      { action: "CLICK", target: "Dersler", selector: "a.link:has-text('Dersler')" },
                      { action: "CLICK", target: "4. Sınıf Fen Bilimleri", selector: "a.box:has-text('Fen Bilimleri')" },
                      { action: "CLICK", target: "Yer Kabuğu ve Dünyamızın Hareketleri", selector: "a:has-text('Yer Kabuğu')" },
                      { action: "CLICK", target: "Kayaçlar ve Mineraller", selector: "button:has-text('İzle')" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  };

  const outPath = path.resolve(__dirname, 'app_topology.json');
  fs.writeFileSync(outPath, JSON.stringify(topology, null, 2), 'utf-8');
  console.log(`[seedTopology] Başarıyla oluşturuldu: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  return topology;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seedTopology')) {
  buildCompleteTopology();
}
