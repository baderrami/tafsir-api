#!/usr/bin/env tsx
/**
 * Downloads all 10 hadith collections from fawazahmed0/hadith-api CDN,
 * restructures into clean JSON, outputs to scripts/output/hadith/.
 *
 * Usage:
 *   npx tsx scripts/generate-hadith.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const OUTPUT_DIR = join(SCRIPT_DIR, "output", "hadith");

const CDN_BASE =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

// ── Collection definitions ──────────────────────────────────────────────────

interface CollectionDef {
  id: string;
  name: string;
  nameAr: string;
  /** lang prefix → our output lang code */
  editions: Record<string, string>;
}

const COLLECTIONS: CollectionDef[] = [
  {
    id: "bukhari",
    name: "Sahih al-Bukhari",
    nameAr: "صحيح البخاري",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id", rus: "ru", tam: "ta",
    },
  },
  {
    id: "muslim",
    name: "Sahih Muslim",
    nameAr: "صحيح مسلم",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id", rus: "ru", tam: "ta",
    },
  },
  {
    id: "abudawud",
    name: "Sunan Abu Dawud",
    nameAr: "سنن أبي داود",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id", rus: "ru",
    },
  },
  {
    id: "tirmidhi",
    name: "Jami at-Tirmidhi",
    nameAr: "جامع الترمذي",
    editions: {
      ara: "ar", eng: "en", tur: "tr",
      urd: "ur", ben: "bn", ind: "id",
    },
  },
  {
    id: "nasai",
    name: "Sunan an-Nasa'i",
    nameAr: "سنن النسائي",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id",
    },
  },
  {
    id: "ibnmajah",
    name: "Sunan Ibn Majah",
    nameAr: "سنن ابن ماجه",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id",
    },
  },
  {
    id: "malik",
    name: "Muwatta Malik",
    nameAr: "موطأ مالك",
    editions: {
      ara: "ar", eng: "en", fra: "fr", tur: "tr",
      urd: "ur", ben: "bn", ind: "id",
    },
  },
  {
    id: "nawawi",
    name: "Forty Hadith an-Nawawi",
    nameAr: "الأربعون النووية",
    editions: { ara: "ar", eng: "en", fra: "fr", ben: "bn" },
  },
  {
    id: "qudsi",
    name: "Forty Hadith Qudsi",
    nameAr: "الأحاديث القدسية",
    editions: { ara: "ar", eng: "en", fra: "fr" },
  },
  {
    id: "dehlawi",
    name: "Forty Hadith Dehlawi",
    nameAr: "أربعون حديثاً للدهلوي",
    editions: { ara: "ar", eng: "en", fra: "fr" },
  },
];

// Arabic section names for Bukhari (API only returns English)
const BUKHARI_ARABIC_SECTIONS: Record<number, string> = {
  1: "بدء الوحي", 2: "الإيمان", 3: "العلم", 4: "الوضوء", 5: "الغسل",
  6: "الحيض", 7: "التيمم", 8: "الصلاة", 9: "مواقيت الصلاة", 10: "الأذان",
  11: "الجمعة", 12: "صلاة الخوف", 13: "العيدين", 14: "الوتر", 15: "الاستسقاء",
  16: "الكسوف", 17: "سجود القرآن", 18: "التقصير", 19: "التهجد",
  20: "فضل الصلاة في مسجد مكة والمدينة", 21: "العمل في الصلاة", 22: "السهو",
  23: "الجنائز", 24: "الزكاة", 25: "الحج", 26: "العمرة", 27: "المحصر",
  28: "جزاء الصيد", 29: "فضائل المدينة", 30: "الصوم", 31: "صلاة التراويح",
  32: "فضل ليلة القدر", 33: "الاعتكاف", 34: "البيوع", 35: "السلم", 36: "الشفعة",
  37: "الإجارة", 38: "الحوالة", 39: "الكفالة", 40: "الوكالة", 41: "المزارعة",
  42: "المساقاة", 43: "الاستقراض", 44: "الخصومات", 45: "اللقطة", 46: "المظالم",
  47: "الشركة", 48: "الرهن", 49: "العتق", 50: "المكاتب", 51: "الهبة",
  52: "الشهادات", 53: "الصلح", 54: "الشروط", 55: "الوصايا", 56: "الجهاد والسير",
  57: "الخمس", 58: "الجزية والموادعة", 59: "بدء الخلق", 60: "الأنبياء",
  61: "المناقب", 62: "فضائل الصحابة", 63: "مناقب الأنصار", 64: "المغازي",
  65: "التفسير", 66: "فضائل القرآن", 67: "النكاح", 68: "الطلاق", 69: "النفقات",
  70: "الأطعمة", 71: "العقيقة", 72: "الذبائح والصيد", 73: "الأضاحي",
  74: "الأشربة", 75: "المرضى", 76: "الطب", 77: "اللباس", 78: "الأدب",
  79: "الاستئذان", 80: "الدعوات", 81: "الرقاق", 82: "القدر",
  83: "الأيمان والنذور", 84: "كفارات الأيمان", 85: "الفرائض", 86: "الحدود",
  87: "الديات", 88: "المرتدين", 89: "الإكراه", 90: "الحيل", 91: "التعبير",
  92: "الفتن", 93: "الأحكام", 94: "التمني", 95: "أخبار الآحاد",
  96: "الاعتصام بالكتاب والسنة", 97: "التوحيد",
};

// ── Types from API ──────────────────────────────────────────────────────────

interface ApiEdition {
  metadata: {
    sections: Record<string, string>;
    section_details: Record<
      string,
      { hadithnumber_first: number; hadithnumber_last: number }
    >;
  };
  hadiths: {
    hadithnumber: number;
    text: string;
    reference: { book: number; hadith: number };
  }[];
}

// ── Output types ────────────────────────────────────────────────────────────

interface CollectionOut {
  id: string;
  name: string;
  nameAr: string;
  sections: number;
  hadiths: number;
  languages: string[];
}

interface SectionOut {
  number: number;
  name: string;
  nameAr: string;
  hadithCount: number;
}

interface SectionHadithsOut {
  section: number;
  name: string;
  nameAr: string;
  hadiths: { number: number; text: string }[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchEdition(
  langPrefix: string,
  collectionId: string,
): Promise<ApiEdition> {
  const edition = `${langPrefix}-${collectionId}`;
  const url = `${CDN_BASE}/${edition}.min.json`;
  const fallback = `${CDN_BASE}/${edition}.json`;

  let res = await fetch(url);
  if (!res.ok) res = await fetch(fallback);
  if (!res.ok) throw new Error(`Failed to fetch ${edition}: ${res.status}`);

  return res.json() as Promise<ApiEdition>;
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data));
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Generating hadith data...\n");
  ensureDir(OUTPUT_DIR);

  const collectionsOut: CollectionOut[] = [];

  for (const col of COLLECTIONS) {
    console.log(`\n📖 ${col.name} (${col.id})`);

    // 1. Fetch Arabic edition for section metadata + Arabic text
    console.log("  Fetching Arabic edition...");
    const araData = await fetchEdition("ara", col.id);
    const { sections: sectionNames, section_details } = araData.metadata;

    // Build section list
    const sectionNumbers = Object.keys(sectionNames)
      .map(Number)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    // Group Arabic hadiths by section
    const arabicBySection = new Map<
      number,
      { number: number; text: string }[]
    >();
    for (const h of araData.hadiths) {
      const book = h.reference.book;
      if (!arabicBySection.has(book)) arabicBySection.set(book, []);
      arabicBySection.get(book)!.push({
        number: h.hadithnumber,
        text: h.text,
      });
    }

    // Build sections.json
    const sectionsOut: SectionOut[] = sectionNumbers.map((n) => {
      const nameEn = sectionNames[String(n)] ?? `Section ${n}`;
      const nameAr =
        col.id === "bukhari"
          ? BUKHARI_ARABIC_SECTIONS[n] ?? ""
          : "";
      const detail = section_details[String(n)];
      const hadithCount = detail
        ? detail.hadithnumber_last - detail.hadithnumber_first + 1
        : arabicBySection.get(n)?.length ?? 0;
      return { number: n, name: nameEn, nameAr, hadithCount };
    });

    const colDir = join(OUTPUT_DIR, col.id);
    ensureDir(colDir);
    writeJson(join(colDir, "sections.json"), sectionsOut);
    console.log(`  ✓ sections.json (${sectionsOut.length} sections)`);

    // Write Arabic section files
    const arDir = join(colDir, "ar");
    ensureDir(arDir);
    for (const sec of sectionsOut) {
      const hadiths = arabicBySection.get(sec.number) ?? [];
      const out: SectionHadithsOut = {
        section: sec.number,
        name: sec.name,
        nameAr: sec.nameAr,
        hadiths,
      };
      writeJson(join(arDir, `${sec.number}.json`), out);
    }
    console.log(`  ✓ ar/ (${sectionsOut.length} files)`);

    // 2. Fetch each non-Arabic language
    const languages = ["ar"];
    const editionEntries = Object.entries(col.editions).filter(
      ([prefix]) => prefix !== "ara",
    );

    for (const [langPrefix, langCode] of editionEntries) {
      try {
        console.log(`  Fetching ${langPrefix}...`);
        const langData = await fetchEdition(langPrefix, col.id);

        // Group by section
        const langBySection = new Map<
          number,
          { number: number; text: string }[]
        >();
        for (const h of langData.hadiths) {
          const book = h.reference.book;
          if (!langBySection.has(book)) langBySection.set(book, []);
          langBySection.get(book)!.push({
            number: h.hadithnumber,
            text: h.text,
          });
        }

        const langDir = join(colDir, langCode);
        ensureDir(langDir);
        for (const sec of sectionsOut) {
          const hadiths = langBySection.get(sec.number) ?? [];
          const out: SectionHadithsOut = {
            section: sec.number,
            name: sec.name,
            nameAr: sec.nameAr,
            hadiths,
          };
          writeJson(join(langDir, `${sec.number}.json`), out);
        }
        languages.push(langCode);
        console.log(`  ✓ ${langCode}/ (${sectionsOut.length} files)`);
      } catch (err) {
        console.error(
          `  ✗ ${langPrefix}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    // Add to collections catalog
    collectionsOut.push({
      id: col.id,
      name: col.name,
      nameAr: col.nameAr,
      sections: sectionsOut.length,
      hadiths: araData.hadiths.length,
      languages,
    });
  }

  // Write collections.json
  writeJson(join(OUTPUT_DIR, "collections.json"), collectionsOut);
  console.log(
    `\n✅ Done! ${collectionsOut.length} collections → ${OUTPUT_DIR}`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
