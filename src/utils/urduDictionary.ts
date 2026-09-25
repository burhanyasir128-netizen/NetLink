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

export function transliterateEnglishToUrdu(text: string): string {
  if (!text || !text.trim()) return '';

  const clean = text.trim();
  const words = clean.split(/(\s+|[-_.,/()#]+)/);

  const translatedWords = words.map((token) => {
    const lower = token.toLowerCase();
    if (COMMON_NAMES[lower]) {
      return COMMON_NAMES[lower];
    }
    if (COMMON_TERMS[lower]) {
      return COMMON_TERMS[lower];
    }
    // Digits conversion to Urdu
    if (/^\d+$/.test(token)) {
      return token; // keep numbers readable or Urdu
    }
    return token;
  });

  return translatedWords.join('').replace(/\s+/g, ' ').trim();
}
