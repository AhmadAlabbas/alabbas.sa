import { type Locale } from "./site";
export const editorial: Record<
  string,
  Record<Locale, { heading: string; body: string }[]>
> = {
  "real-estate": {
    en: [
      {
        heading: "Start with the asset, not the cycle",
        body: "Buildings are part of the economic fabric. Their value depends on the needs they serve, the people who use them and the durability of local demand. A long-term assessment starts with those fundamentals before considering a market narrative.",
      },
      {
        heading: "Underwrite the full picture",
        body: "Occupancy, tenant quality, operating costs and capital expenditure belong in the same analysis. Scenario testing can help reveal where an investment depends too heavily on a single assumption. Valuations and financing conditions can change materially.",
      },
      {
        heading: "A local perspective",
        body: "In Saudi Arabia, demographic shifts and changes in how people live and work provide context for research. These trends do not guarantee returns. Location-specific evidence, legal due diligence and disciplined entry pricing remain essential.",
      },
    ],
    ar: [
      {
        heading: "ابدأ بالأصل، لا بالدورة",
        body: "المباني جزء من النسيج الاقتصادي. تعتمد قيمتها على الاحتياجات التي تلبيها ومن يستخدمها واستدامة الطلب المحلي. يبدأ التقييم طويل الأجل بهذه الأسس قبل النظر إلى السرد السوقي.",
      },
      {
        heading: "قيّم الصورة كاملة",
        body: "الإشغال وجودة المستأجرين وتكاليف التشغيل والنفقات الرأسمالية عناصر مترابطة. يساعد اختبار السيناريوهات على كشف الاعتماد المفرط على افتراض واحد. وقد تتغير التقييمات وظروف التمويل بدرجة كبيرة.",
      },
      {
        heading: "منظور محلي",
        body: "توفر التحولات السكانية وتغير أنماط الحياة والعمل في المملكة سياقًا للبحث. هذه الاتجاهات لا تضمن العوائد. تظل الأدلة المحلية والعناية القانونية وتسعير الدخول المنضبط أساسية.",
      },
    ],
  },
  "patient-capital": {
    en: [
      {
        heading: "Time is an investment consideration",
        body: "Business development rarely follows a straight line. An investment horizon should reflect the operational changes required, rather than an arbitrary calendar. Investors must also consider their own need for access to capital.",
      },
      {
        heading: "Patience requires discipline",
        body: "A longer horizon is not a reason to overlook weak fundamentals. Clear milestones, aligned incentives and independent scrutiny help distinguish purposeful patience from delayed decision-making.",
      },
      {
        heading: "Understand the trade-offs",
        body: "Private investments may be difficult to sell and can carry significant valuation uncertainty. A patient approach needs a realistic assessment of liquidity, fees and the possibility of capital loss.",
      },
    ],
    ar: [
      {
        heading: "الزمن عامل استثماري",
        body: "نادرًا ما يتطور العمل في خط مستقيم. ينبغي أن يعكس الأفق الاستثماري التغيرات التشغيلية المطلوبة، لا جدولًا زمنيًا اعتباطيًا. وعلى المستثمرين أيضًا مراعاة احتياجاتهم للسيولة.",
      },
      {
        heading: "الصبر يحتاج إلى انضباط",
        body: "الأفق الأطول ليس مبررًا لتجاهل ضعف الأسس. تساعد المعالم الواضحة والحوافز المتوافقة والمراجعة المستقلة على التمييز بين الصبر الهادف وتأجيل القرارات.",
      },
      {
        heading: "افهم المفاضلات",
        body: "قد يصعب بيع الاستثمارات الخاصة وقد تنطوي تقييماتها على عدم يقين كبير. يحتاج النهج الصبور إلى تقييم واقعي للسيولة والرسوم واحتمال خسارة رأس المال.",
      },
    ],
  },
  risk: {
    en: [
      {
        heading: "Define the objective first",
        body: "Risk has meaning in relation to an objective. A portfolio designed to meet near-term obligations faces different constraints from one intended for a multi-decade horizon. Understanding those constraints helps set appropriate expectations.",
      },
      {
        heading: "Look beyond a single measure",
        body: "Volatility is only one lens. Liquidity, concentration, counterparty exposure and operational dependencies also matter. Different asset classes can respond to the same event in unexpected ways.",
      },
      {
        heading: "Keep the dialogue open",
        body: "A risk framework should be reviewed as objectives and conditions change. Transparent communication about uncertainty supports informed decisions. Diversification does not eliminate the possibility of loss.",
      },
    ],
    ar: [
      {
        heading: "حدد الهدف أولًا",
        body: "يتحدد معنى المخاطر بالنسبة إلى الهدف. تختلف قيود محفظة تلبي التزامات قريبة عن محفظة لأفق يمتد عقودًا. يساعد فهم هذه القيود على بناء توقعات مناسبة.",
      },
      {
        heading: "انظر إلى ما وراء المقياس الواحد",
        body: "التقلب أحد المنظورات فقط. السيولة والتركيز والتعرض للأطراف المقابلة والاعتماد التشغيلي عوامل مهمة أيضًا. قد تستجيب فئات الأصول للحدث نفسه بطرق غير متوقعة.",
      },
      {
        heading: "أبقِ الحوار مفتوحًا",
        body: "ينبغي مراجعة إطار المخاطر مع تغير الأهداف والظروف. يساعد التواصل الشفاف بشأن عدم اليقين على اتخاذ قرارات مدروسة. التنويع لا يلغي احتمال الخسارة.",
      },
    ],
  },
};
export const legalSections: Record<
  string,
  Record<Locale, { heading: string; body: string }[]>
> = {
  privacy: {
    en: [
      {
        heading: "Information you choose to share",
        body: "The enquiry form requests your name, email, optional organization, enquiry category and message. Submit only information needed to respond to your request. Do not include sensitive identity or financial documents.",
      },
      {
        heading: "Purpose and service providers",
        body: "Enquiry information is intended solely for responding to your request. Before enabling delivery, Alabbas must confirm the controller’s legal identity, processing basis, hosting and CRM providers, retention period and any international transfers under applicable Saudi data protection requirements.",
      },
      {
        heading: "Your rights and contact",
        body: "The procedure for access, correction, deletion and other applicable rights, and the responsible privacy contact, must be approved and published before launch. This draft is not a final privacy notice.",
      },
    ],
    ar: [
      {
        heading: "المعلومات التي تختار مشاركتها",
        body: "يطلب نموذج الاستفسار اسمك وبريدك الإلكتروني والمنظمة اختياريًا ونوع الاستفسار والرسالة. أرسل ما يلزم للرد فقط، ولا ترفق وثائق هوية أو معلومات مالية حساسة.",
      },
      {
        heading: "الغرض ومقدمو الخدمات",
        body: "تُستخدم بيانات الاستفسار لغرض الرد على طلبك. قبل تفعيل التسليم، يجب تأكيد الهوية القانونية لجهة التحكم وأساس المعالجة ومقدمي الاستضافة وإدارة العملاء وفترة الاحتفاظ وأي نقل دولي وفق المتطلبات السعودية لحماية البيانات.",
      },
      {
        heading: "حقوقك والتواصل",
        body: "يجب اعتماد ونشر إجراءات الوصول والتصحيح والحذف والحقوق الأخرى وبيانات مسؤول الخصوصية قبل الإطلاق. هذه المسودة ليست إشعار خصوصية نهائيًا.",
      },
    ],
  },
  terms: {
    en: [
      {
        heading: "Use of this website",
        body: "Content is provided for general information and does not constitute investment advice, an offer or a solicitation. Product terms and investor eligibility are established only through approved documentation.",
      },
      {
        heading: "Accuracy and third-party information",
        body: "Sample content and illustrative figures are clearly identified. No statement of actual performance, client relationships or licensing should be inferred from placeholders. Information may change and requires independent assessment.",
      },
      {
        heading: "Approval required",
        body: "The legal entity, intellectual property provisions, limitations of liability, governing law and dispute resolution terms require legal review before publication.",
      },
    ],
    ar: [
      {
        heading: "استخدام الموقع",
        body: "المحتوى للمعلومات العامة ولا يمثل نصيحة استثمارية أو عرضًا أو دعوة للاستثمار. تُحدد شروط المنتجات وأهلية المستثمرين من خلال الوثائق المعتمدة فقط.",
      },
      {
        heading: "الدقة ومعلومات الأطراف الأخرى",
        body: "يُشار بوضوح إلى المحتوى التجريبي والأرقام التوضيحية. لا ينبغي استنتاج أداء فعلي أو علاقات عملاء أو تراخيص من العناصر المؤقتة. قد تتغير المعلومات وتتطلب تقييمًا مستقلًا.",
      },
      {
        heading: "الاعتماد مطلوب",
        body: "تتطلب الهوية القانونية وأحكام الملكية الفكرية وحدود المسؤولية والقانون الحاكم وتسوية النزاعات مراجعة قانونية قبل النشر.",
      },
    ],
  },
  cookies: {
    en: [
      {
        heading: "Essential storage",
        body: "The site stores your cookie preference in local storage under alabbas-cookie-consent. This preference contains your selection, a version and a timestamp. It is not used for advertising or tracking.",
      },
      {
        heading: "Optional technologies",
        body: "No analytics, advertising pixels or optional tracking cookies are currently installed. Selecting optional cookies records a preference only. Any future tracking integration must honor that preference and be separately documented.",
      },
      {
        heading: "Changing your choice",
        body: "Use Cookie preferences in the footer to change your selection. You may also remove the saved preference through your browser’s site storage controls.",
      },
    ],
    ar: [
      {
        heading: "التخزين الأساسي",
        body: "يحفظ الموقع تفضيل ملفات الارتباط في التخزين المحلي باسم alabbas-cookie-consent. يتضمن الاختيار والإصدار والتوقيت، ولا يستخدم للإعلان أو التتبع.",
      },
      {
        heading: "التقنيات الاختيارية",
        body: "لا توجد حاليًا تحليلات أو وحدات إعلانية أو ملفات تتبع اختيارية. يسجّل اختيار الملفات الاختيارية تفضيلًا فقط. يجب أن يحترم أي تكامل مستقبلي هذا الاختيار وأن يُوثق بصورة منفصلة.",
      },
      {
        heading: "تغيير اختيارك",
        body: "استخدم تفضيلات ملفات الارتباط في التذييل لتغيير اختيارك. يمكنك أيضًا حذف التفضيل من إعدادات تخزين الموقع في متصفحك.",
      },
    ],
  },
  disclosures: {
    en: [
      {
        heading: "Regulatory status",
        body: "Saudi Capital Market Authority (CMA) authorization, legal entity name, license number, permitted activities and registered address: [TO BE CONFIRMED BY LEGAL]. This website makes no assertion that an authorization has been granted.",
      },
      {
        heading: "Investment risk",
        body: "Investing involves risk, including possible loss of principal. Past performance is not indicative of future results. Liquidity, market, credit and currency risks vary across strategies. No return or capital protection is guaranteed.",
      },
      {
        heading: "Illustrative material",
        body: "All figures, leadership profiles, scenarios and editorial items marked as sample or illustrative are placeholders. They are not company results, actual investments, named clients or verified track records.",
      },
      {
        heading: "Product availability",
        body: "No subscription, transaction or investment acceptance is available through this website. Any future offer is subject to applicable regulation, investor eligibility, suitability and approved offering documents.",
      },
    ],
    ar: [
      {
        heading: "الوضع التنظيمي",
        body: "ترخيص هيئة السوق المالية السعودية والاسم القانوني ورقم الترخيص والأنشطة المسموح بها والعنوان المسجل: [يُؤكد من المستشار القانوني]. لا يدعي الموقع منح أي ترخيص.",
      },
      {
        heading: "مخاطر الاستثمار",
        body: "ينطوي الاستثمار على مخاطر، بما فيها احتمال خسارة رأس المال. الأداء السابق ليس مؤشرًا على النتائج المستقبلية. تختلف مخاطر السيولة والسوق والائتمان والعملات عبر الاستراتيجيات. لا توجد ضمانات للعوائد أو حماية رأس المال.",
      },
      {
        heading: "المواد التوضيحية",
        body: "جميع الأرقام والملفات القيادية والسيناريوهات والمواد التحريرية المصنفة كتجريبية أو توضيحية مؤقتة. لا تمثل نتائج الشركة أو استثمارات فعلية أو عملاء محددين أو سجل أداء موثقًا.",
      },
      {
        heading: "توفر المنتجات",
        body: "لا يتيح الموقع الاشتراك أو المعاملات أو قبول الاستثمارات. يخضع أي عرض مستقبلي للأنظمة والأهلية والملاءمة ووثائق العرض المعتمدة.",
      },
    ],
  },
};
