export interface ScriptTemplate {
  id: string;
  title: string;
  category: string;
  badge: string;
  recommendedVoiceId: number;
  text: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'welcome',
    title: 'خوش آمدید (Welcome Greeting)',
    category: 'General',
    badge: 'تعارف',
    recommendedVoiceId: 0,
    text: 'السلام علیکم! ورلڈ اے آئی وائس اسٹوڈیو میں خوش آمدید۔ یہاں آپ اردو اور دیگر زبانوں میں کاپی رائٹ فری وائس با آسانی تیار کر سکتے ہیں۔',
  },
  {
    id: 'youtube-tech',
    title: 'یوٹیوب شارٹس انٹرو (YouTube Hook)',
    category: 'YouTube',
    badge: 'وائرل',
    recommendedVoiceId: 2,
    text: 'کیا آپ جانتے ہیں کہ 2026 میں مصنوعی ذہانت کس طرح دنیا کو بدل رہی ہے؟ اس ویڈیو کو آخر تک لازمی دیکھیں کیونکہ آج کا انکشاف آپ کے ہوش اڑا دے گا!',
  },
  {
    id: 'breaking-news',
    title: 'بریکنگ نیوز بلیٹن (Breaking News)',
    category: 'News',
    badge: 'نیوز',
    recommendedVoiceId: 0,
    text: 'ناظرین کرام! بریکنگ نیوز سے آپ کو آگاہ کرتے چلیں، پاکستان میں جدید ٹیکنالوجی اور ڈیجیٹل اسکلز کے شعبے میں تاریخ ساز پیش رفت سامنے آئی ہے۔ تفصیلات کے مطابق نوجوانوں کو بین الاقوامی سطح پر روزگار کے بے شمار مواقع میسر آئیں گے۔',
  },
  {
    id: 'story-kids',
    title: 'بچوں کی کہانی (Kids Story / Kahani)',
    category: 'Kids',
    badge: 'کہانی',
    recommendedVoiceId: 4,
    text: 'ایک دفعہ کا ذکر ہے کہ ایک گھنے جنگل میں ایک چھوٹا سا خرگوش رہتا تھا۔ وہ بہت ہوشیار تھا اور سب جانوروں کی مدد کرتا تھا۔ ایک دن جنگل میں ایک تیز ہوا چلی...',
  },
  {
    id: 'girl-poem',
    title: 'پیاری فاطمہ کی باتیں (Sweet Child Girl)',
    category: 'Kids',
    badge: 'بچی',
    recommendedVoiceId: 5,
    text: 'امی جان! مجھے سکول کا کام بہت جلدی ختم کرنا ہے، کیونکہ شام کو ہم نے پارک جانا ہے اور جھولے لینے ہیں! جلدی کریں نا پلیز!',
  },
  {
    id: 'female-narrator',
    title: 'دستویزی فیچر (Documentary Narration)',
    category: 'Narration',
    badge: 'ڈاکومنٹری',
    recommendedVoiceId: 1,
    text: 'شمالی علاقہ جات کے دلکش پہاڑ اور بہتے ہوئے جھرنے فطرت کا ایک ایسا شاہکار ہیں جو انسان کو حیرت زدہ کر دیتے ہیں۔ آئیے دریافت کرتے ہیں پاکستان کے ان حسین و جمیل نظاروں کو۔',
  },
  {
    id: 'english-business',
    title: 'Pakistani English Pitch (Business / Ad)',
    category: 'English',
    badge: 'English',
    recommendedVoiceId: 2,
    text: 'Hello everyone! Welcome to Pakistan AI Voice Studio. Experience hyper-realistic, studio-grade voices designed specifically for your content creation, podcasts, and digital campaigns.',
  },
  {
    id: 'motivational',
    title: 'حوصلہ افزائی و خود اعتمادی (Motivational)',
    category: 'Motivation',
    badge: 'حوصلہ',
    recommendedVoiceId: 0,
    text: 'زندگی میں کبھی بھی ہمت نہ ہاریں۔ یاد رکھیں کہ ہر رات کے بعد ایک روشن صبح ضرور طلوع ہوتی ہے۔ محنت کریں اور اپنے خوابوں کو حقیقت کا روپ دیں۔',
  },
];
