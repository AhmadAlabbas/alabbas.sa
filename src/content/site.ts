export type Locale = "en" | "ar";
export const locales = ["en", "ar"] as const;
export const paths = [
  "",
  "about",
  "solutions",
  "solutions/real-estate",
  "solutions/private-equity",
  "solutions/public-markets",
  "solutions/infrastructure",
  "solutions/alternatives",
  "clients",
  "clients/individuals",
  "clients/institutions",
  "clients/governments",
  "insights",
  "insights/real-estate",
  "insights/patient-capital",
  "insights/risk",
  "careers",
  "contact",
  "legal/privacy",
  "legal/terms",
  "legal/cookies",
  "legal/disclosures",
];
export const siteUrl = (process.env.SITE_URL || "https://alabbas.sa").replace(
  /\/$/,
  "",
);
export const capabilities = [
  {
    slug: "real-estate",
    en: "Real estate",
    ar: "العقارات",
    enText:
      "Real assets. Enduring value. A disciplined approach to the places where people live, work and connect.",
    arText:
      "أصول حقيقية وقيمة مستدامة. نهج منضبط للأماكن التي يعيش فيها الناس ويعملون ويتواصلون.",
    number: "01",
  },
  {
    slug: "private-equity",
    en: "Private equity",
    ar: "الملكية الخاصة",
    enText:
      "Partnering with businesses to support operational progress and sustainable growth.",
    arText: "شراكات مع الشركات لدعم التطور التشغيلي والنمو المستدام.",
    number: "02",
  },
  {
    slug: "public-markets",
    en: "Public markets",
    ar: "الأسواق العامة",
    enText:
      "Research-led portfolios with a clear understanding of liquidity, valuation and risk.",
    arText: "محافظ تستند إلى البحث وفهم واضح للسيولة والتقييم والمخاطر.",
    number: "03",
  },
  {
    slug: "infrastructure",
    en: "Infrastructure",
    ar: "البنية التحتية",
    enText:
      "Looking beyond the immediate horizon to the essential systems that enable economies.",
    arText: "نظرة بعيدة المدى إلى الأنظمة الأساسية التي تمكّن الاقتصادات.",
    number: "04",
  },
  {
    slug: "alternatives",
    en: "Alternatives",
    ar: "الاستثمارات البديلة",
    enText:
      "Complementary strategies evaluated for their role within the whole portfolio.",
    arText: "استراتيجيات مكملة تُقيّم وفق دورها في المحفظة ككل.",
    number: "05",
  },
];
export const audiences = [
  {
    slug: "individuals",
    en: "Individuals",
    ar: "الأفراد",
    enText:
      "A considered approach to your capital, your ambitions and the generations ahead.",
    arText: "نهج مدروس لرأس مالك وطموحاتك والأجيال القادمة.",
  },
  {
    slug: "institutions",
    en: "Institutions & organizations",
    ar: "المؤسسات والمنظمات",
    enText:
      "Investment frameworks aligned with your mandate, obligations and long-term objectives.",
    arText: "أطر استثمارية تتوافق مع تفويضك والتزاماتك وأهدافك طويلة الأجل.",
  },
  {
    slug: "governments",
    en: "Governments",
    ar: "الجهات الحكومية",
    enText:
      "A long-term perspective on capital stewardship and economic priorities.",
    arText: "منظور طويل الأجل لإدارة رأس المال والأولويات الاقتصادية.",
  },
];
export const articles = [
  {
    slug: "real-estate",
    category: "perspectives",
    date: "2026-09-15",
    en: "The long view on real assets",
    ar: "نظرة بعيدة المدى إلى الأصول الحقيقية",
    enText:
      "Why location, utility and disciplined underwriting remain central to real estate investing.",
    arText:
      "لماذا يظل الموقع والمنفعة والتقييم المنضبط ركائز الاستثمار العقاري.",
    read: 4,
  },
  {
    slug: "patient-capital",
    category: "research",
    date: "2026-09-08",
    en: "The case for patient capital",
    ar: "أهمية رأس المال الصبور",
    enText:
      "Connecting investment horizons with the realities of business growth.",
    arText: "ربط الآفاق الاستثمارية بواقع نمو الأعمال.",
    read: 3,
  },
  {
    slug: "risk",
    category: "news",
    date: "2026-08-25",
    en: "Risk as a starting point",
    ar: "المخاطر نقطة البداية",
    enText:
      "A portfolio perspective on resilience, liquidity and informed decision-making.",
    arText: "منظور للمحفظة يركز على المرونة والسيولة واتخاذ القرار المدروس.",
    read: 5,
  },
];
export const copy = {
  en: {
    skip: "Skip to content",
    menu: "Menu",
    close: "Close",
    contact: "Contact us",
    solutions: "Our solutions",
    about: "About Alabbas",
    clients: "Who we serve",
    insights: "Insights",
    careers: "Careers",
    discover: "Explore",
    all: "View all",
    home: "Home",
    back: "Back to insights",
    eyebrow: "ALABBAS · RIYADH, SAUDI ARABIA",
    hero: ["Investing for", "generations."],
    heroText:
      "A long-term perspective. A disciplined approach. We connect capital with opportunity across asset classes, with the future firmly in view.",
    philosophy: "Built on conviction.\nGuided by discipline.",
    philosophyText:
      "Capital carries responsibility. Our approach begins with understanding what matters to our clients, then brings rigorous research and considered judgment to every investment decision.",
    figures: "An illustrative perspective",
    sample: "Illustrative figures only · not company results",
    stats: [
      "Assets under management",
      "Years of experience",
      "Client relationships",
      "Investments",
    ],
    serveTitle: "Different ambitions.\nA shared perspective.",
    serveText:
      "From individual aspirations to institutional mandates, our approach starts with you.",
    capTitle: "Many opportunities.\nOne disciplined approach.",
    capText:
      "A connected view across asset classes. Explore the capabilities that shape our investment thinking.",
    latest: "Thinking beyond\nthe immediate.",
    latestText:
      "Perspectives on markets, capital and the forces shaping tomorrow.",
    sampleArticle: "Sample editorial content",
    trust: "A foundation of trust.",
    trustText:
      "A considered investment process needs clear accountability. Governance, risk awareness and transparency inform the way we work.",
    trustItems: [
      "Accountable governance",
      "Integrated risk management",
      "Transparent communication",
    ],
    trustDescriptions: [
      "Clear responsibilities and structured oversight throughout the investment process.",
      "Risk assessment from initial research through ongoing portfolio review.",
      "Relevant reporting and an open dialogue about objectives and outcomes.",
    ],
    cta: "Let’s consider\nwhat comes next.",
    ctaText:
      "Begin a conversation about your objectives and the role Alabbas could play.",
    risk: "Investing involves risk, including possible loss of principal. Past performance is not indicative of future results.",
    regulatory:
      "Saudi Capital Market Authority (CMA) authorization status and permitted activities: [TO BE CONFIRMED BY LEGAL]. No authorization or license is asserted by this website.",
    footerText: "A long-term perspective on capital.",
    company: "Company",
    investment: "Investment",
    legal: "Legal & disclosures",
    privacy: "Privacy policy",
    terms: "Terms of use",
    cookies: "Cookie policy",
    disclosures: "Regulatory disclosures",
    office: "Riyadh, Saudi Arabia",
    officeNote:
      "Office address and contact details pending business confirmation.",
    copyright: "Alabbas. All rights reserved.",
    review: "Pre-launch content · business and legal review required",
    cookieTitle: "Your privacy, considered.",
    cookieText:
      "This site uses essential storage to remember your cookie choice. Optional analytics are disabled and no advertising cookies are installed.",
    essential: "Essential only",
    accept: "Allow optional cookies",
    preferences: "Cookie preferences",
    aboutTitle: "A long-term mindset.\nA clear sense of purpose.",
    aboutText:
      "Alabbas is a Saudi investment and asset management firm focused on connecting capital with opportunity across asset classes.",
    mission: "Our mission",
    missionText:
      "To steward capital thoughtfully, align investment decisions with client objectives and pursue durable value.",
    vision: "Our vision",
    visionText:
      "To build lasting investment relationships grounded in discipline, transparency and a long-term perspective.",
    leadership: "People. Perspective.\nAccountability.",
    leadershipText:
      "Leadership biographies and appointments will be published after business approval.",
    values: ["Discipline", "Integrity", "Partnership", "Perspective"],
    valuesText: [
      "Research before conviction.",
      "Clarity in every relationship.",
      "Objectives understood together.",
      "Decisions made for the long term.",
    ],
    solutionTitle: "Capital, with\na considered direction.",
    approach: "Our approach",
    strategy: "Strategy & investment process",
    caseStudy: "Illustrative investment scenario",
    caseNote:
      "Hypothetical example only. Not an actual holding, offer or performance claim.",
    process: [
      "Understand the objective",
      "Research the opportunity",
      "Evaluate the downside",
      "Monitor and communicate",
    ],
    processText: [
      "Define the investment horizon, liquidity needs and constraints.",
      "Assess fundamentals, valuations and the relevant market context.",
      "Consider scenarios, concentration and the capacity to absorb loss.",
      "Review developments and maintain a clear reporting framework.",
    ],
    clientTitle: "Your objectives.\nOur starting point.",
    journey: "A considered path forward",
    clientProcess: [
      "An initial conversation",
      "A clear assessment",
      "A considered proposal",
      "Ongoing dialogue",
    ],
    clientProcessText: [
      "Discuss your objectives, time horizon and expectations.",
      "Review suitability, eligibility and documentation requirements.",
      "Explore potential solutions, risks, terms and fees.",
      "Agree reporting expectations and review objectives over time.",
    ],
    eligibility:
      "Any investment is subject to eligibility, suitability, applicable regulation and final documentation. Product availability and terms require business and legal approval.",
    insightsTitle: "Perspective\nfor the long term.",
    categories: ["All insights", "Perspectives", "Research", "News"],
    read: "min read",
    articleNote:
      "This sample article is general educational content, not investment advice or a published research report.",
    careersTitle: "Bring perspective.\nBuild something lasting.",
    careersText:
      "We value thoughtful people who ask good questions, bring rigor to their work and understand the responsibility that comes with managing capital.",
    roles: "Opportunities at Alabbas",
    noRoles: "No verified vacancies are currently published.",
    rolesNote:
      "Future opportunities will be listed here once approved. Do not submit sensitive personal information through the general enquiry form.",
    careersCTA: "Make a careers enquiry",
    contactTitle: "A conversation\nworth beginning.",
    contactText:
      "Tell us a little about your objectives. Our team can help direct your enquiry to the right conversation.",
    investor: "Investor relations",
    investorText:
      "For reporting and existing investor enquiries, select Investor Relations in the form.",
    map: "Riyadh · office location",
    mapNote: "Map placeholder. Exact office address pending confirmation.",
    formTitle: "Start a conversation",
    name: "Full name",
    email: "Email address",
    organization: "Organization (optional)",
    clientType: "Enquiry type",
    message: "Your message",
    consent:
      "I have read the privacy policy and consent to the processing of this enquiry.",
    submit: "Send enquiry",
    sending: "Sending…",
    required: "Required fields",
    select: "Select an enquiry type",
    formPrivacy:
      "Please do not include account numbers, identity documents or confidential financial information.",
    success: "Your enquiry was delivered. Thank you for getting in touch.",
    unavailable:
      "Enquiry delivery is not connected yet. Please try again once contact details are published.",
    error: "We could not send your enquiry. Check your details and try again.",
    legalLabel: "Draft policy · requires legal approval before launch",
    legalTitle: "Clear information.\nInformed decisions.",
    updated: "Draft updated",
  },
  ar: {
    skip: "انتقل إلى المحتوى",
    menu: "القائمة",
    close: "إغلاق",
    contact: "تواصل معنا",
    solutions: "حلولنا الاستثمارية",
    about: "عن العباس",
    clients: "من نخدم",
    insights: "رؤى",
    careers: "الوظائف",
    discover: "استكشف",
    all: "عرض الكل",
    home: "الرئيسية",
    back: "العودة إلى الرؤى",
    eyebrow: "العباس · الرياض، المملكة العربية السعودية",
    hero: ["نستثمر", "للأجيال."],
    heroText:
      "رؤية طويلة الأجل. ونهج منضبط. نربط رأس المال بالفرص عبر فئات الأصول، ونضع المستقبل في صميم قراراتنا.",
    philosophy: "قناعة راسخة.\nوانضباط يوجّهنا.",
    philosophyText:
      "إدارة رأس المال مسؤولية. يبدأ نهجنا بفهم ما يهم عملاءنا، ثم يوظّف البحث الدقيق والحكم المدروس في كل قرار استثماري.",
    figures: "صورة توضيحية",
    sample: "أرقام توضيحية فقط · لا تمثل نتائج الشركة",
    stats: [
      "الأصول تحت الإدارة",
      "سنوات الخبرة",
      "علاقات العملاء",
      "الاستثمارات",
    ],
    serveTitle: "طموحات متنوعة.\nورؤية مشتركة.",
    serveText: "من طموحات الأفراد إلى تفويضات المؤسسات، يبدأ نهجنا بك.",
    capTitle: "فرص متعددة.\nونهج واحد منضبط.",
    capText:
      "رؤية مترابطة عبر فئات الأصول. استكشف القدرات التي تشكّل تفكيرنا الاستثماري.",
    latest: "رؤى تتجاوز\nاللحظة الراهنة.",
    latestText: "وجهات نظر حول الأسواق ورأس المال والقوى التي تشكّل الغد.",
    sampleArticle: "محتوى تحريري تجريبي",
    trust: "الثقة أساس العلاقة.",
    trustText:
      "تحتاج العملية الاستثمارية المدروسة إلى مساءلة واضحة. الحوكمة والوعي بالمخاطر والشفافية توجه أسلوب عملنا.",
    trustItems: ["حوكمة مسؤولة", "إدارة متكاملة للمخاطر", "تواصل شفاف"],
    trustDescriptions: [
      "مسؤوليات واضحة ورقابة منظمة طوال العملية الاستثمارية.",
      "تقييم المخاطر من البحث الأولي إلى المراجعة المستمرة للمحفظة.",
      "تقارير ذات صلة وحوار مفتوح حول الأهداف والنتائج.",
    ],
    cta: "لنناقش\nخطوتك القادمة.",
    ctaText: "ابدأ حوارًا حول أهدافك والدور الذي يمكن أن تؤديه العباس.",
    risk: "ينطوي الاستثمار على مخاطر، بما في ذلك احتمال خسارة رأس المال. الأداء السابق ليس مؤشرًا على النتائج المستقبلية.",
    regulatory:
      "حالة الترخيص من هيئة السوق المالية السعودية والأنشطة المسموح بها: [يُؤكد من المستشار القانوني]. لا يدّعي هذا الموقع وجود ترخيص أو تصريح.",
    footerText: "رؤية طويلة الأجل لرأس المال.",
    company: "الشركة",
    investment: "الاستثمار",
    legal: "الشؤون القانونية والإفصاحات",
    privacy: "سياسة الخصوصية",
    terms: "شروط الاستخدام",
    cookies: "سياسة ملفات الارتباط",
    disclosures: "الإفصاحات التنظيمية",
    office: "الرياض، المملكة العربية السعودية",
    officeNote: "العنوان وبيانات التواصل بانتظار تأكيد الشركة.",
    copyright: "العباس. جميع الحقوق محفوظة.",
    review: "محتوى ما قبل الإطلاق · يتطلب مراجعة الشركة والمستشار القانوني",
    cookieTitle: "خصوصيتك محل اهتمام.",
    cookieText:
      "يستخدم الموقع تخزينًا أساسيًا لتذكّر تفضيلاتك. التحليلات الاختيارية معطلة ولا تُثبت ملفات ارتباط إعلانية.",
    essential: "الأساسية فقط",
    accept: "السماح بملفات اختيارية",
    preferences: "تفضيلات ملفات الارتباط",
    aboutTitle: "رؤية طويلة الأجل.\nوغاية واضحة.",
    aboutText:
      "العباس شركة سعودية للاستثمار وإدارة الأصول، تركز على ربط رأس المال بالفرص عبر فئات الأصول.",
    mission: "رسالتنا",
    missionText:
      "إدارة رأس المال بعناية، ومواءمة القرارات الاستثمارية مع أهداف العملاء، والسعي إلى قيمة مستدامة.",
    vision: "رؤيتنا",
    visionText:
      "بناء علاقات استثمارية دائمة تقوم على الانضباط والشفافية والرؤية طويلة الأجل.",
    leadership: "خبرات ورؤى.\nومسؤولية واضحة.",
    leadershipText:
      "ستُنشر السير المهنية والتعيينات القيادية بعد اعتماد الشركة.",
    values: ["الانضباط", "النزاهة", "الشراكة", "الرؤية"],
    valuesText: [
      "البحث يسبق القناعة.",
      "وضوح في كل علاقة.",
      "فهم مشترك للأهداف.",
      "قرارات للأجل الطويل.",
    ],
    solutionTitle: "رأس مال\nباتجاه مدروس.",
    approach: "نهجنا",
    strategy: "الاستراتيجية والعملية الاستثمارية",
    caseStudy: "سيناريو استثماري توضيحي",
    caseNote:
      "مثال افتراضي فقط. لا يمثل أصلًا فعليًا أو عرضًا أو ادعاءً بالأداء.",
    process: [
      "فهم الهدف",
      "دراسة الفرصة",
      "تقييم المخاطر",
      "المتابعة والتواصل",
    ],
    processText: [
      "تحديد الأفق الاستثماري واحتياجات السيولة والقيود.",
      "تقييم الأسس والتقييمات والسياق السوقي ذي الصلة.",
      "دراسة السيناريوهات والتركيز والقدرة على تحمل الخسائر.",
      "مراجعة المستجدات والحفاظ على إطار واضح للتقارير.",
    ],
    clientTitle: "أهدافك.\nنقطة انطلاقنا.",
    journey: "خطوات مدروسة للمضي قدمًا",
    clientProcess: ["حوار أولي", "تقييم واضح", "مقترح مدروس", "تواصل مستمر"],
    clientProcessText: [
      "مناقشة أهدافك وأفقك الزمني وتوقعاتك.",
      "مراجعة الملاءمة والأهلية ومتطلبات التوثيق.",
      "استكشاف الحلول المحتملة والمخاطر والشروط والرسوم.",
      "الاتفاق على التقارير ومراجعة الأهداف بمرور الوقت.",
    ],
    eligibility:
      "يخضع أي استثمار للأهلية والملاءمة والأنظمة السارية والوثائق النهائية. يتطلب توفر المنتجات وشروطها اعتماد الشركة والمستشار القانوني.",
    insightsTitle: "رؤية\nللأجل الطويل.",
    categories: ["جميع الرؤى", "وجهات نظر", "أبحاث", "أخبار"],
    read: "دقائق قراءة",
    articleNote:
      "هذا المقال التجريبي محتوى تعليمي عام، وليس نصيحة استثمارية أو تقريرًا بحثيًا منشورًا.",
    careersTitle: "أضف رؤيتك.\nوابنِ أثرًا دائمًا.",
    careersText:
      "نقدّر الأشخاص الذين يطرحون أسئلة مدروسة، ويؤدون عملهم بدقة، ويدركون المسؤولية المصاحبة لإدارة رأس المال.",
    roles: "الفرص في العباس",
    noRoles: "لا توجد شواغر معتمدة منشورة حاليًا.",
    rolesNote:
      "ستُدرج الفرص المستقبلية هنا بعد اعتمادها. لا ترسل معلومات شخصية حساسة عبر نموذج الاستفسار العام.",
    careersCTA: "استفسر عن الوظائف",
    contactTitle: "حوار\nيستحق البداية.",
    contactText:
      "شاركنا لمحة عن أهدافك. يمكن لفريقنا توجيه استفسارك إلى الحوار المناسب.",
    investor: "علاقات المستثمرين",
    investorText:
      "للاستفسارات المتعلقة بالتقارير والمستثمرين الحاليين، اختر علاقات المستثمرين في النموذج.",
    map: "الرياض · موقع المكتب",
    mapNote: "خريطة توضيحية. العنوان الدقيق بانتظار التأكيد.",
    formTitle: "ابدأ حوارًا",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    organization: "المنظمة (اختياري)",
    clientType: "نوع الاستفسار",
    message: "رسالتك",
    consent: "قرأت سياسة الخصوصية وأوافق على معالجة هذا الاستفسار.",
    submit: "إرسال الاستفسار",
    sending: "جارٍ الإرسال…",
    required: "حقول مطلوبة",
    select: "اختر نوع الاستفسار",
    formPrivacy:
      "يرجى عدم تضمين أرقام الحسابات أو وثائق الهوية أو المعلومات المالية السرية.",
    success: "تم تسليم استفسارك. شكرًا لتواصلك معنا.",
    unavailable:
      "خدمة تسليم الاستفسارات غير متصلة بعد. يرجى المحاولة بعد نشر بيانات التواصل.",
    error: "تعذّر إرسال استفسارك. تحقق من بياناتك وحاول مجددًا.",
    legalLabel: "مسودة سياسة · تتطلب اعتمادًا قانونيًا قبل الإطلاق",
    legalTitle: "معلومات واضحة.\nوقرارات مدروسة.",
    updated: "تحديث المسودة",
  },
};
export type Copy = typeof copy.en;
export function text(item: { en: string; ar: string }, locale: Locale) {
  return item[locale];
}
export function description(
  item: { enText: string; arText: string },
  locale: Locale,
) {
  return locale === "ar" ? item.arText : item.enText;
}
export function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    calendar: "gregory",
    timeZone: "Asia/Riyadh",
  }).format(new Date(date));
}
