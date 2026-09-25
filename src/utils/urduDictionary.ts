/**
 * High-quality offline Urdu transliteration and translation dictionary for Urdu Bazar Lahore
 * Provides zero-failure, instant Urdu translation even when Gemini API hits quota limits (429).
 */

const COMMON_NAMES: Record<string, string> = {
  muhammad: 'محمد',
  mohammad: 'محمد',
  mohammed: 'محمد',
  md: 'محمد',
  ahmed: 'احمد',
  ahmad: 'احمد',
  ali: 'علی',
  hassan: 'حسن',
  hasan: 'حسن',
  hussain: 'حسین',
  usman: 'عثمان',
  osman: 'عثمان',
  bilal: 'بلال',
  tariq: 'طارق',
  kashif: 'کاشف',
  asim: 'عاصم',
  nadeem: 'ندیم',
  asghar: 'اصغر',
  rasheed: 'رشید',
  rashid: 'رشید',
  sheikh: 'شیخ',
  sh: 'شیخ',
  choudhary: 'چوہدری',
  chaudhary: 'چوہدری',
  ch: 'چوہدری',
  malik: 'ملک',
  khan: 'خان',
  qureshi: 'قریشی',
  syed: 'سید',
  shah: 'شاہ',
  butt: 'بٹ',
  bhatti: 'بھٹی',
  mian: 'میاں',
  raza: 'رضا',
  zia: 'ضیاء',
  farooq: 'فاروق',
  umar: 'عمر',
  omer: 'عمر',
  abubakar: 'ابوبکر',
  salman: 'سلمان',
  irfan: 'عرفان',
  kamran: 'کامران',
  adnan: 'عدنان',
  waqas: 'وقاص',
  imran: 'عمران',
  arshad: 'ارشد',
  akram: 'اکرم',
  iqbal: 'اقبال',
  sajid: 'ساجد',
  mahmood: 'محمود',
  mehmood: 'محمود',
  hafeez: 'حفیظ',
  hafiz: 'حافظ',
  haji: 'حاجی',
  abdul: 'عبدال',
  rehman: 'رحمٰن',
  rahim: 'رحیم',
  sattar: 'ستار',
  ghani: 'غنی',
  kareem: 'کریم',
  shabbir: 'شبیر',
  shahid: 'شاہد',
  zahid: 'زاہد',
  saeed: 'سعید',
  nawaz: 'نواز',
  babar: 'بابر',
  zubair: 'زبیر',
  yasir: 'یاسر',
  burhan: 'برہان',
  faizan: 'فیضان',
  rizwan: 'رضوان',
  hamza: 'حمزہ',
};

const COMMON_TERMS: Record<string, string> = {
  // Business and shop types
  book: 'بک',
  books: 'کتب',
  depot: 'ڈپو',
  centre: 'سنٹر',
  center: 'سنٹر',
  publications: 'پبلی کیشنز',
  publishers: 'پبلشرز',
  publishing: 'پبلشنگ',
  house: 'ہاؤس',
  store: 'سٹور',
  press: 'پریس',
  stationers: 'سٹیشنرز',
  stationery: 'سٹیشنری',
  company: 'کمپنی',
  co: 'کمپنی',
  traders: 'ٹریڈرز',
  trading: 'ٹریڈنگ',
  agency: 'ایجنسی',
  agencies: 'ایجنسیز',
  corner: 'کارنر',
  point: 'پوائنٹ',
  kitab: 'کتاب',
  khana: 'خانہ',
  maktaba: 'مکتبہ',
  dar: 'دار',
  darussalam: 'دارالسلام',
  ilm: 'علم',
  ilmi: 'علمی',
  caravan: 'کاروان',
  sang: 'سنگ',
  meel: 'میل',
  ferozsons: 'فروز سنز',
  aziz: 'عزیز',
  azizia: 'عزیزیہ',
  national: 'نیشنل',
  pakistan: 'پاکستان',
  lahore: 'لاہور',
  punjab: 'پنجاب',
  urdu: 'اردو',
  bazar: 'بازار',
  bazaar: 'بازار',
  market: 'مارکیٹ',
  plaza: 'پلازہ',
  chowk: 'چوک',
  road: 'روڈ',
  street: 'گلی',
  lane: 'کوچہ',
  shop: 'دکان نمبر',
  no: '',
  num: '',
  number: '',
  floor: 'منزل',
  first: 'پہلی',
  second: 'دوسری',
  ground: 'گراؤنڈ',
  basement: 'بیسمنٹ',
  near: 'نزد',
  opposite: 'بالمقابل',
  opp: 'بالمقابل',
  gate: 'گیٹ',
  paisa: 'پیسہ',
  akhbar: 'اخبار',
  lower: 'لوئر',
  mall: 'مال',
  anarkali: 'انارکلی',
  gpo: 'جی پی او',
};

// Extended phonetic mapping for words not found in common dictionary
const PHONETIC_MAP: Record<string, string> = {
  b: 'ب', p: 'پ', t: 'ت', j: 'ج', ch: 'چ', h: 'ح', kh: 'خ',
  d: 'د', r: 'ر', z: 'ز', s: 'س', sh: 'ش', f: 'ف', q: 'ق',
  k: 'ک', g: 'گ', l: 'ل', m: 'م', n: 'ن', w: 'و', v: 'و',
  y: 'ی', a: 'ا', e: 'ے', i: 'ی', o: 'و', u: 'و',
};

export function transliterateEnglishToUrdu(text: string): string {
  if (!text || !text.trim()) return '';

  const clean = text.trim();
  const tokens = clean.split(/(\s+|[-_.,/()#]+)/);

  const translatedTokens = tokens.map((token) => {
    if (!token || !token.trim()) return token;
    const lower = token.toLowerCase();

    // Check direct word in dictionary
    if (COMMON_NAMES[lower]) {
      return COMMON_NAMES[lower];
    }
    if (COMMON_TERMS[lower]) {
      return COMMON_TERMS[lower];
    }
    // Digits
    if (/^\d+$/.test(token)) {
      return token;
    }
    // Punctuation
    if (/^[-_.,/()#:]+$/.test(token)) {
      return token;
    }

    // Heuristic phonetic transliteration for unmapped English words
    let result = '';
    let i = 0;
    const word = lower;
    while (i < word.length) {
      if (i + 1 < word.length && PHONETIC_MAP[word.slice(i, i + 2)]) {
        result += PHONETIC_MAP[word.slice(i, i + 2)];
        i += 2;
      } else if (PHONETIC_MAP[word[i]]) {
        result += PHONETIC_MAP[word[i]];
        i++;
      } else {
        result += word[i];
        i++;
      }
    }
    return result || token;
  });

  return translatedTokens.join('').replace(/\s+/g, ' ').trim();
}
