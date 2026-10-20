#!/usr/bin/env node
// Generate basseqat-meta-ads-v2/index.html (22 cards: 14 new + 8 v1 survivors).
// Decisions: adApprovalFeedback/basseqat-meta-ads-v2/decisions/{itemKey} with
// payload EXACTLY { decision, name, updatedAt } (itemKey is the doc id, never a field).
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PROV = {
  real: { label: "من أرض الواقع", cls: "prov-real" },
  comp: { label: "الشخص حقيقي · الخلفية مولّدة بالذكاء الاصطناعي", cls: "prov-comp" },
  ai: { label: "مشهد مولّد بالذكاء الاصطناعي", cls: "prov-ai" },
  design: { label: "تصميم جرافيك", cls: "prov-design" },
  designReal: { label: "تصميم + صور من أرض الواقع", cls: "prov-real" },
};

const NEW_CARDS = [
  {
    key: "concept1", eyebrow: "تصميم 1 · كلمة رئيس مجلس الإدارة · لكل الشخصيات",
    title: "مشروع وراه راجل باسمه وصورته",
    img: "assets/after/concept1-founder-quote.png", prov: "real",
    why: "شخصية المؤسس أقوى ورقة ثقة عندنا، ولسه ماستخدمناهاش في الحساب خالص.",
    primary: "قبل ما باسقات تبقى مشروع مفتوح للمشاركة، كانت قرار شخصي. خالد ناصر الدين، رئيس مجلس إدارة باسقات، قعد سنين في الاستثمار الزراعي، وشاف مشاريع كتير ورفضها. لما جه يختار الأرض دي، نزلها بنفسه: شاف التربة، والمياه، والآبار، والمستندات، وبعدين حط اسمه عليها. علشان كده إحنا مش بنستخبى ورا شركة من غير وش. اللي بيقولك تعالى شوف، راجل معروف، بيقابل الناس، وبيرد بنفسه. عايز تعرف المشروع من الأول للآخر؟ حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "خالد ناصر الدين بيتكلم عن اللي شافه بنفسه",
  },
  {
    key: "concept2", eyebrow: "تصميم 2 · الفحص قبل المشاركة · للمستثمر الجاد",
    title: "الفحص حصل قبل ما نسألك تشارك",
    img: "assets/after/concept2-due-diligence.png", prov: "comp",
    why: "بيجاوب على سؤال «إيه الضمان؟» بقصة الفحص الحقيقية بدل الوعود.",
    primary: "أنا خالد ناصر الدين، رئيس مجلس إدارة باسقات. تمن سنين في الاستثمار الزراعي علموني حاجة واحدة: الورق بيستحمل أي كلام، الأرض هي اللي بتقول الحقيقة. علشان كده قبل ما أختار مشروع باسقات، فحصت بنفسي التربة والمياه والآبار والبنية التحتية، وراجعت المستندات ورقة ورقة. ورفضت قبلها مشاريع شكلها كان حلو على الورق. المشروع اللي هتشوفه النهارده هو اللي عدى من الفحص ده. وانت كمان من حقك تفحص: تشوف الأرض، والتقارير، وتسأل اللي انت عايزه. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "تربة، مياه، آبار، مستندات: كله اتفحص الأول",
  },
  {
    key: "concept3", eyebrow: "تصميم 3 · حاجة باسمك · لباني الإرث",
    title: "اللي تبنيه في بلدك بيفضل",
    img: "assets/after/concept3-owner-land.png", prov: "comp",
    why: "زاوية الإرث اللي نجحت في الجولة الأولى، بس بإخراج أوسع وأدفأ.",
    primary: "في حاجات بتشتريها وبتخلص، وفي حاجات بتبنيها وبتفضل. النخلة من النوع التاني: بتتزرع مرة، وبتفضل تنتج عشرات السنين. علشان كده ناس كتير شغالة بره بتدور على أصل زراعي في مصر، مش على حاجة سريعة. باسقات مشروع نخيل مجدول شغال في الفرافرة من 6 سنين، بإدارة كاملة من فريق متخصص. انت بتشارك، وبتتابع بالتقارير، وتيجي تزور لما تحب. ومع الوقت، اللي شاركت فيه بيبقى حاجة ليها اسم ومكان، تقدر توريها لعيالك. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "مشروع نخيل بإدارة كاملة، وانت متابع من مكانك",
  },
  {
    key: "concept4", eyebrow: "تصميم 4 · الباب المفتوح · للمتردد الحذر",
    title: "المزرعة مفتوحة لأي حد عايز يتأكد",
    img: "assets/after/concept4-open-gate.png", prov: "ai",
    why: "بيرسم فكرة البراند الأساسية حرفيا: الباب مفتوح، تعالى شوف قبل ما تقرر.",
    primary: "أسهل حاجة تسمع كلام حلو. أصعب حاجة تلاقي حد يقولك: تعالى شوف بنفسك. في باسقات الباب مفتوح: تيجي تزور المزرعة في الفرافرة، تمشي وسط النخيل، تشوف الري والطاقة الشمسية شغالين، وتقعد مع الفريق وتسأل اللي انت عايزه. ولو مش قادر تيجي دلوقتي، في جولة مصورة من أرض الواقع توصلك لحد مكانك. إحنا بنفهّمك، مش بنبيعك. والقرار في الآخر قرارك. حمّل دليل باسقات، أو ابدأ محادثة ورتب زيارتك.",
    linkdesc: "زيارة حقيقية أو جولة مصورة، قبل أي قرار",
  },
  {
    key: "concept5", eyebrow: "تصميم 5 · البنية اتعملت الأول · للمستثمر الجاد",
    title: "البنية اتعملت الأول، وبعدين فتحنا باب المشاركة",
    img: "assets/after/concept5-infra-checklist.png", prov: "designReal",
    why: "امتداد مباشر لأنجح إعلان في الحساب (أقل تكلفة عميل محتمل)، بشكل أوضح وأسرع في القراءة.",
    primary: "في مشاريع بتجمع فلوس علشان تبدأ تجهز. وفي مشاريع جهزت الأول، وبعدين فتحت باب المشاركة. باسقات من النوع التاني. قبل ما نسأل حد يشارك: الآبار اتحفرت، وشبكة الري اتركبت، ومحطة الطاقة الشمسية اشتغلت، والنخيل اتزرع وبقاله 6 سنين متابعة، موسم ورا موسم. الترتيب ده مش تفصيلة صغيرة. ده الفرق بين إنك تستنى وعود، وبين إنك تشوف حاجة موجودة قدامك. كل بند من دول ليه توثيق تقدر تطلبه وتراجعه. حمّل دليل باسقات وشوف البنية التحتية بالتفصيل، أو ابدأ محادثة واسأل.",
    linkdesc: "مش وعود على ورق، حاجات موجودة تقدر تشوفها",
  },
  {
    key: "concept6", eyebrow: "تصميم 6 · ورق ولا أرض · لكل الشخصيات",
    title: "في فرق بين مشروع بيتحكي وبين مشروع بيتشاف",
    img: "assets/after/concept6-paper-vs-land.png", prov: "designReal",
    why: "بيحول زاوية «الكلام سهل» لصورة واحدة واضحة توقف التمرير.",
    primary: "الاتنين بيقولوا نفس الكلام: أرض، ونخيل، ومستقبل. الفرق بيبان لما تقول: طب وريني. ساعتها المشروع اللي على الورق بيبتدي يلف ويدور، والمشروع الشغال بيقولك تعالى بكرة. باسقات من أول يوم بتشتغل بالطريقة دي: أرض في الفرافرة شغالة من 6 سنين، ري وطاقة شمسية شغالين، ونخيل مجدول بيتتابع كل موسم. مش مطلوب منك تصدق، مطلوب منك تشوف وتسأل وتتأكد. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب وقول وريني.",
    linkdesc: "قبل ما تقرر، اعرف انت بتبص على أنهي نوع",
  },
  {
    key: "concept7", eyebrow: "تصميم 7 · توثيق ميداني · للمستثمر الجاد",
    title: "المشروع اللي بيقولك تعالى صوّر بنفسك",
    img: "assets/after/concept7-editorial-farafra.png", prov: "real",
    why: "شكل تحريري وثائقي مختلف عن كل إعلانات المنافسين، والصورة حقيقية من فوق الأرض.",
    primary: "اللقطة دي من فوق أرض باسقات في الفرافرة. اللي بتشوفه مش تصميم ولا رسمة للمستقبل: صفوف نخيل مجدول مزروعة من سنين، وشبكة ري شغالة، وبنية تحتية موجودة فعلا. إحنا بننشر لقطات زي دي باستمرار، علشان ده أسهل رد على أي سؤال: المشروع موجود فعلا ولا لأ؟ ولو اللقطات مش كفاية بالنسبالك، تعالى شوف بنفسك، أو اطلب جولة مصورة كاملة. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "لقطة من فوق لمشروع شغال من 6 سنين",
  },
  {
    key: "concept8", eyebrow: "تصميم 8 · سنين الغربة · للمغترب في الخليج",
    title: "يوم ما ترجع مصر، يا ريت ترجع لحاجة باسمك",
    img: "assets/after/concept8-departure.png", prov: "ai",
    why: "إعلانات المغتربين الثابتة أضعف نقطة في الحساب، ودي أول صورة بتكلم إحساس الغربة نفسه.",
    primary: "سنين بتعدي في الشغل والسفر، وكل مرة بترجع فيها مصر بتسأل نفسك نفس السؤال: أنا بنيت هنا إيه؟ العقار غالي ومحتاج متابعة، والدهب بيقعد في الدرج، والفلوس في البنك التضخم بياكل منها. في اختيار تاني ناس كتير مش واخدة بالها منه: مشاركة في مشروع نخيل مجدول شغال في الفرافرة من 6 سنين، بإدارة كاملة وتقارير بتوصلك وانت في مكانك. من غير ما تحتاج تيجي، ومن غير ما حد يستعجلك. افهم الأول وبعدين قرر: حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "مشروع نخيل شغال، بتتابعه من مكانك في الخليج",
  },
  {
    key: "concept9", eyebrow: "تصميم 9 · سؤال وجواب · للمغترب وباني الإرث",
    title: "الأسئلة اللي بتوصلنا كل يوم، بنجاوب عليها قدام الكل",
    img: "assets/after/concept9-whatsapp-card.png", prov: "design",
    why: "شكل محادثة طبيعي بيكسر شكل الإعلانات، والسؤال ده حرفيا أكتر سؤال بيوصلنا من الخليج.",
    primary: "ده سؤال حقيقي من الأسئلة اللي بتوصلنا كل يوم من ناس شغالة في الخليج. والإجابة ثابتة: المتابعة اليومية مش عليك. فريق باسقات في الفرافرة بيدير الزراعة والري والصيانة والحصاد، وانت بيوصلك توثيق منتظم لكل اللي بيحصل. ولما تحب تتأكد بعينك، تيجي تزور، أو نبعتلك جولة مصورة. مفيش سؤال بنعدي منه. اسأل اللي انت عايزه. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب دلوقتي.",
    linkdesc: "اسأل نفس السؤال على الواتساب وهنجاوبك بنفس الوضوح",
  },
  {
    key: "concept10", eyebrow: "تصميم 10 · التحويل والأصل · للمغترب المدخر",
    title: "مش كل اللي بتبعته لازم يتصرف",
    img: "assets/after/concept10-remittance-asset.png", prov: "designReal",
    why: "بيمسك أصدق جملة في كلام عملائنا: «من كل اللي اتحول، إيه اللي لسه موجود؟»",
    primary: "من أول يوم في الغربة وانت بتحوّل: للبيت، للأهل، للمصاريف. وده طبيعي ومطلوب. بس بعد سنين، في سؤال بييجي لوحده: من كل اللي اتحوّل، إيه اللي لسه موجود؟ في ناس بدأت تاخد جزء صغير من تحويلاتها وتحطه في حاجة بتفضل: مشاركة في مشروع نخيل مجدول شغال في الفرافرة، بإدارة كاملة وتوثيق مستمر. مش لازم تقرر النهارده ولا تتسرع. بالعكس: اقرا، واسأل، وافهم الأول. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "جزء صغير ممكن يتحول لأصل زراعي باسمك",
  },
  {
    key: "concept11", eyebrow: "تصميم 11 · التخطيط للمعاش · بفلترة واضحة",
    title: "مشروع طويل النفس، مش دخل سريع",
    img: "assets/after/concept11-pension.png", prov: "real",
    why: "إعلانات المعاش بتجيب أعلى نسبة ضغط في الحساب لكن أضعف عملاء جادين. التصميم ده بيفلتر من أول سطر.",
    primary: "خلينا نكون واضحين من الأول: باسقات مشروع زراعي طويل الأجل. النخيل بياخد وقته، والدخل بيبدأ بعد سنين مش من أول شهر. علشان كده هو مش مناسب لحد بيدور على مكسب سريع. إنما لو انت اشتغلت سنين طويلة، ومعاك مبلغ محوّش، وبتفكر إزاي تحوله لأصل ليه اسم ومكان تعتمد عليه في سنين المعاش، ساعتها الكلام ده يستاهل منك نص ساعة تفهمه. مشروع نخيل مجدول شغال من 6 سنين في الفرافرة، بإدارة كاملة وتوثيق تقدر تراجعه بنفسك. حمّل دليل باسقات واقراه على مهلك، أو ابدأ محادثة واسأل.",
    linkdesc: "لو بتخطط لسنين المعاش من دلوقتي، ده ليك",
  },
  {
    key: "concept12", eyebrow: "تصميم 12 · المنتج نفسه · للمتردد الحذر",
    title: "التمرة اللي العالم بيدور عليها، بتطلع من مصر",
    img: "assets/after/concept12-medjool-macro.png", prov: "ai",
    notice: "قرار مطلوب: صورة التمر دي مولّدة بالذكاء الاصطناعي (الشارة موضحة للشفافية). لو تفضلوا نستخدم صورة تمر حقيقية من المزرعة بدلها، علّموا «اعمل نسخة تانية» واكتبوا في التعليق، وهنستبدلها قبل ما تروح للعميل.",
    why: "المنتج الفاخر نفسه عمره ما ظهر في إعلان ثابت. صورة شهية بتوقف التمرير وبتفتح قصة المشروع.",
    primary: "المجدول من أغلى وأشهر أنواع التمور في العالم، والطلب عليه ثابت من سنين، في مصر وبره. اللي ناس كتير مش عارفاه إن في مزارع مصرية بقت بتنتجه بجودة عالية، ومنها مزرعة باسقات في الفرافرة: نخيل مزروع من 6 سنين، بيتتابع موسم ورا موسم، وكل مرحلة موثقة من الزراعة للحصاد. وإن المشروع ده مفتوح للمشاركة، مش مقفول على أصحابه. لو حابب تفهم صورة المشروع الكاملة: حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "نخيل مجدول من 6 سنين، وكل مرحلة موثقة",
  },
  {
    key: "concept13", eyebrow: "تصميم 13 · رقم حقيقي · لكل الشخصيات",
    title: "رقم بنقوله زي ما هو، من غير زعيق",
    img: "assets/after/concept13-milestone.png", prov: "design",
    notice: "⏳ مستنيين الرقم الحقيقي من خالد: نسبة الحجز الحالية في المرحلة الأولى. التصميم والنص هيتحدثوا بالرقم المؤكد قبل أي نشر، ومن غيره مش هينزل.",
    why: "أرخص إعلان جاب عملاء في تاريخ الحساب كان رقم حجز حقيقي. رجعناه من غير أي استعجال أو ضغط.",
    primary: "من يوم ما فتحنا باب المشاركة في المرحلة الأولى، الحجز وصل {NN}%. بنقول الرقم ده لسبب واحد: ناس كتير بتسأل هل في حد فعلا شارك ولا لسه. الإجابة أهي، بالأرقام. ومش هنقولك إلحق قبل ما يخلص، ولا هنستعجلك. المشروع زراعي وطويل الأجل، والقرار فيه محتاج فهم مش سرعة. اللي بنقترحه: حمّل دليل باسقات، اقرا على مهلك، واسأل كل اللي عايز تسأله على الواتساب. ولو المرحلة الأولى كملت قبل ما تقرر، هنقولك ده برضه زي ما هو.",
    linkdesc: "ولسه في مساحات متاحة، والتفاصيل في دليل باسقات",
  },
  {
    key: "concept14", eyebrow: "تصميم 14 · سؤال واحد · للمغترب المدخر",
    title: "الفلوس الواقفة بتقل قيمتها",
    img: "assets/after/concept14-plain-hook.png", prov: "design",
    why: "أبسط شكل ممكن: سؤال واحد بخط كبير. الشكل ده بيكسر ضجيج الإعلانات المزدحمة.",
    primary: "مفيش حد محتاج يشرحلك التضخم، انت شايفه في كل حاجة بتشتريها. السؤال المهم: تعمل إيه في اللي حوشته؟ في ناس اختارت تحط جزء منه في أصل زراعي: مشاركة في مشروع نخيل مجدول شغال من 6 سنين في الفرافرة، بإدارة كاملة وتوثيق مستمر. إحنا مش بنقولك دي الإجابة الوحيدة، وبنقولها بصراحة: المشروع طويل الأجل، ومش مناسب للي مستعجل. بس لو بتدور على حاجة تتبني بهدوء، يستاهل تقرا عنه. حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "في بديل هادي وطويل الأجل، افهمه الأول",
  },
];

const V1_BASE = "../basseqat-meta-ads-v1/assets/after";
const V1_CARDS = [
  {
    key: "v1-concept1", eyebrow: "من الجولة الأولى · تصميم 1 · سلطة المؤسس",
    title: "خالد ناصر الدين: تعالى تشوف مش تسمع",
    ab: [
      { src: `${V1_BASE}/concept1-founder-golden-hour-A.png`, tag: "A" },
      { src: `${V1_BASE}/concept1-founder-golden-hour-B.png`, tag: "B · مشهد تاني" },
    ], prov: "real",
    primary: "أنا خالد ناصر الدين، رئيس مجلس إدارة باسقات. تمن سنين وأنا شغال في الاستثمار الزراعي، ورفضت مشاريع كتير قبل ما أختار الأرض دي بنفسي. فحصت التربة، المياه، الآبار، البنية التحتية، والمستندات بإيدي. مش هقعدلك أقول أرقام وأوعدك بيها، ده مش أسلوبنا في باسقات. اللي هعمله إني أوريك الأرض. أوريك النخيل اللي اتزرع من ست سنين. أوريك العمليات يوم بيوم. وبعد كده، القرار يبقى قرارك. عايز تبدأ؟ حمّل دليل باسقات، أو ابدأنا نتكلم على الواتساب.",
    linkdesc: "رئيس مجلس إدارة باسقات بيوريك الأرض بنفسه",
  },
  {
    key: "v1-concept2", eyebrow: "من الجولة الأولى · تصميم 2 · إثبات العملية",
    title: "مش كل مشروع تقدر تشوفه بعينك.. ده تقدر",
    ab: [
      { src: `${V1_BASE}/concept2-founder-medjool-cluster-A.png`, tag: "A" },
      { src: `${V1_BASE}/concept2-founder-medjool-cluster-B.png`, tag: "B · مشهد تاني" },
    ], prov: "real",
    primary: "كل اللي شفتهم بيوعدوا بأرقام، وبعدين بيختفوا. باسقات مش هتوعدك بحاجة. اللي هتعمله إنها توريك المشروع، وتسيبك تقرر. النخيل اللي في الصورة دي مش رسمة ولا رندر، ده نخيل مجدول حقيقي، مزروع من ست سنين، وشايفينه بأعيننا كل موسم. لو عندك سؤال زي: شفنا كتير ناس اتنصبوا، أو عايز أشوف بعينيا الأول، إحنا فاهمينك. مفيش حاجة هتاخد كلامنا فيها، كل حاجة تقدر تتأكد منها بنفسك. حمّل دليل باسقات، أو ابدأ محادثة واسأل أي سؤال بيريحك.",
    linkdesc: "مفيش وعود فاضية، في نخيل تقدر تلمسه",
  },
  {
    key: "v1-concept3", eyebrow: "من الجولة الأولى · تصميم 3 · أصل في بلدك",
    title: "أصل في مصر يفضل لعيالك من بعدك",
    ab: [
      { src: `${V1_BASE}/concept3-founder-owner-land-A.png`, tag: "A" },
      { src: `${V1_BASE}/concept3-founder-owner-land-B.png`, tag: "B · مشهد تاني" },
    ], prov: "real",
    primary: "وانت شغال بره من سنين طويلة، في سؤال بيرجعلك كل شوية: لو حصل حاجة، هعرف أتابع الأرض وأنا مش في مصر؟ في باسقات، إحنا مانديرش عليك المشروع، إحنا نديره بالكامل. وانت بس بتتابع بالتقارير، وتزور لما تحب. اللي بتبنيه هنا مش استثمار وخلاص، ده أصل بيفضل باسمك في بلدك، وممكن يفضل لعيالك من بعدك. باسقات مشروع نخيل حقيقي في الفرافرة، بإدارة كاملة من غير ما تحتاج تكون موجود يوميا. حمّل دليل باسقات واعرف تفاصيل الإدارة والمتابعة، أو ابدأ محادثة على الواتساب.",
    linkdesc: "مش عايز تديره وانت مسافر؟ إحنا بندير كل حاجة",
  },
  {
    key: "v1-concept4", eyebrow: "من الجولة الأولى · تصميم 4 · عمليات حقيقية",
    title: "مش أرض فاضية.. أرض بتشتغل من سنين",
    img: `${V1_BASE}/concept4-aerial-farm.png`, prov: "real",
    primary: "لما تشوف الأرض من فوق كده، بتعرف حاجة صعب تعرفها من الكلام: فيه شغل حقيقي، ولا لسه كل حاجة على الورق؟ باسقات أرض شغالة بقالها سنين، مش مشروع لسه هيتزرع. شبكة ري كاملة، محطة طاقة شمسية، وآلاف من نخيل المجدول مزروعة ومتابعة موسم ورا موسم. مفيش وعود عن مستقبل بعيد، في بنية تحتية موجودة دلوقتي، تقدر تشوفها وتتأكد منها. عايز تعرف تفاصيل الأرض والري والطاقة؟ حمّل دليل باسقات، أو ابدأ محادثة واسأل.",
    linkdesc: "ري، طاقة شمسية، ونخيل مزروع، شوف بعينك من فوق",
  },
  {
    key: "v1-concept5", eyebrow: "من الجولة الأولى · تصميم 5 · المنتج",
    title: "التمرة دي طلعت من أرض اسمها معروف",
    img: `${V1_BASE}/concept5-medjool-product.png`, prov: "real",
    primary: "مجدول من أرقى أنواع التمور في العالم، ودلوقتي بيتزرع على أرض مصرية في الفرافرة. مش بنسألك تصدق كلام، بنقولك تعالى شوف النخلة اللي طالعة منها التمرة دي، من يوم ما اتزرعت لحد دلوقتي. كل خطوة موثقة: الزراعة، الري، المتابعة الموسمية، لحد الحصاد. عايز تفهم إزاي مشروع زي ده بيتحول لأصل تقدر تملك فيه نصيب؟ حمّل دليل باسقات، أو ابدأ محادثة على الواتساب.",
    linkdesc: "مجدول مصري، من مزرعة تقدر تزورها",
  },
  {
    key: "v1-concept6", eyebrow: "من الجولة الأولى · تصميم 6 · البنية التحتية",
    title: "ري وطاقة شمسية شغالين دلوقتي، مش لسه هيتجهزوا",
    img: `${V1_BASE}/concept6-irrigation-solar.png`, prov: "real",
    primary: "استثمار زراعي كلمة سهلة يقولها أي حد. اللي مش سهل إنه يكون عنده بنية تحتية شغالة تقدر تشوفها. في باسقات فيه شبكة ري كاملة، ومحطة طاقة شمسية بتشغل جزء من عمليات المزرعة، ومفيش حاجة من ده لسه على الورق. كل حاجة شغالة دلوقتي، وبتتابع وبتتصلح وبتتطور كل موسم. ده الفرق بين مشروع بيقولك هنجهز، ومشروع بيقولك اتجهزنا وشغالين. عايز تشوف تفاصيل البنية التحتية؟ حمّل دليل باسقات، أو ابدأ محادثة واسأل أي سؤال.",
    linkdesc: "البنية التحتية اللي بتفرق بين مشروع حقيقي وكلام",
  },
  {
    key: "v1-concept7", eyebrow: "من الجولة الأولى · تصميم 7 · كسر الأسطورة",
    title: "اللي يقولك مضمون، اسأل نفسك ليه",
    img: `${V1_BASE}/concept7-trust-card.png`, prov: "designReal",
    primary: "كل اللي سمعناهم بيقولوا «عائد كبير» و«فرصة ماتفوتش»، بيختفوا بعد فترة، وبيسيبوا وراهم ناس مصدقة كلام مبني على مفيش. باسقات عملت حاجة مختلفة من الأول: من غير وعود، بس بتوري المشروع زي ما هو. الأرض، النخيل، الري، الطاقة، والتوثيق، كله قدامك تشوفه قبل ما تقرر أي حاجة. القرار مش لازم يتبني على الانبهار بكلام حلو، لازم يتبني على إنك شايف اللي بتشتري فيه فعلا. حمّل دليل باسقات وشوف بنفسك، أو ابدأ محادثة على الواتساب واسأل أي سؤال.",
    linkdesc: "باسقات مش بتوعدك بأرقام، بتوريك المشروع",
  },
  {
    key: "v1-concept8", eyebrow: "من الجولة الأولى · تصميم 8 · قلق الفلوس",
    title: "بتشتغل بره من سنين، وفلوسك واقفة مكانها؟",
    img: `${V1_BASE}/concept8-anxiety-card.png`, prov: "designReal",
    primary: "كل يوم بيعدي وانت شغال في الغربة، وفلوسك اللي حوشتها بتقف مكانها. التضخم بياخد منها شوية شوية، والبنك مش بيحميها من ده. فيه طريقة تانية: مشروع نخيل مجدول حقيقي في مصر، بعمليات موثقة تقدر تتابعها، مش مجرد أرقام على شاشة. مش بنقولك استثمر دلوقتي، بنقولك افهم الأول، وبعدين قرر. حمّل دليل باسقات تعرف التفاصيل، أو ابدأ محادثة على الواتساب وإحنا نجاوبك على أي سؤال.",
    linkdesc: "فيه طريقة تانية غير إنك تسيبها في البنك",
  },
];

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

function cardHtml(c) {
  const prov = PROV[c.prov];
  const imgBlock = c.ab
    ? `<div class="ab-grid">${c.ab.map(x => `
    <div class="ab-cell"><img src="${x.src}" alt="${esc(c.title)}"><span class="ab-tag">${x.tag}</span></div>`).join("")}
  </div>
  <div class="ab-pick">
    <span class="ap-label">تفضلوا:</span>
    <label class="ap-radio accept-tone" data-item="${c.key}-pick" data-decision="A"><input type="radio" name="${c.key}-pick">نسخة A</label>
    <label class="ap-radio accept-tone" data-item="${c.key}-pick" data-decision="B"><input type="radio" name="${c.key}-pick">نسخة B</label>
  </div>`
    : `<img class="img-single" src="${c.img}" alt="${esc(c.title)}">`;
  const notice = c.notice ? `<div class="notice">${esc(c.notice)}</div>` : "";
  const why = c.why ? `<p class="why">💡 ليه التصميم ده: ${esc(c.why)}</p>` : "";
  return `
<article class="card" id="${c.key}">
  <div class="eyebrow">${esc(c.eyebrow)}</div>
  <h2>${esc(c.title)}</h2>
  <span class="prov-chip ${prov.cls}">${prov.label}</span>
  ${imgBlock}
  ${notice}
  ${why}
  <div class="copy-block">
    <p class="cf-label">النص الأساسي</p>
    <p class="cf-value">${esc(c.primary)}</p>
    <p class="cf-label">وصف الرابط</p>
    <p class="cf-value">${esc(c.linkdesc)}</p>
    <span class="cta-badge">تعرف أكتر</span>
  </div>
  <div class="approval-row">
    <span class="ap-label">قرارك:</span>
    <label class="ap-radio accept-tone" data-item="${c.key}" data-decision="approve"><input type="radio" name="${c.key}">✓ موافق</label>
    <label class="ap-radio regen-tone" data-item="${c.key}" data-decision="regenerate"><input type="radio" name="${c.key}">↻ اعمل نسخة تانية</label>
    <label class="ap-radio hold-tone" data-item="${c.key}" data-decision="hold"><input type="radio" name="${c.key}">⏸ توقف وعلّق</label>
  </div>
  <div class="section-discuss">
    <div class="discuss-header"><h4>تعليق على التصميم ده</h4>
      <button class="discuss-btn" onclick="openCmtModal('${c.key}','${esc(c.eyebrow)}')">💬 أضف تعليق</button>
    </div>
    <div class="cmt-list" data-cmt-list="${c.key}"></div>
  </div>
</article>`;
}

const css = `
@font-face{font-family:"Madani Arabic";src:url("../basseqat-meta-ads-v1/assets/fonts/MadaniArabic-Regular.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Madani Arabic";src:url("../basseqat-meta-ads-v1/assets/fonts/MadaniArabic-SemiBold.woff2") format("woff2");font-weight:600;font-style:normal;font-display:swap}
@font-face{font-family:"Madani Arabic";src:url("../basseqat-meta-ads-v1/assets/fonts/MadaniArabic-Bold.woff2") format("woff2");font-weight:700;font-style:normal;font-display:swap}
:root{--forest:#175734;--terracotta:#BF7955;--cream:#FFF8EF;--ink:#22301f;--muted:#6b6255;--line:#e7ddcc;--card:#ffffff;--good:#175734;--warn:#BF7955;--hold:#8a8375}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--ink);font-family:"Madani Arabic","Segoe UI",Tahoma,sans-serif;line-height:1.7}
.wrap{max-width:980px;margin:0 auto;padding:0 20px 110px}
header.top{padding:36px 0 26px;border-bottom:1px solid var(--line);margin-bottom:24px}
header.top img{height:52px;display:block;margin-bottom:22px}
header.top h1{font-size:25px;font-weight:700;color:var(--forest);margin:0 0 10px}
header.top p{font-size:15px;color:var(--muted);margin:0 0 8px;max-width:760px}
.howto{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:18px;font-size:14px;color:var(--ink)}
.howto strong{color:var(--forest)}
details.strategy{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 20px;margin-bottom:30px;font-size:14px}
details.strategy summary{cursor:pointer;font-weight:700;color:var(--forest);font-size:14.5px}
details.strategy ul{margin:12px 0 4px;padding-right:20px}
details.strategy li{margin-bottom:8px}
.sec-title{font-size:18px;font-weight:700;color:var(--forest);margin:34px 0 16px;padding-top:10px;border-top:2px solid var(--line)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:26px;box-shadow:0 2px 10px rgba(23,87,52,.05)}
.card .eyebrow{font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--terracotta);margin-bottom:6px}
.card h2{font-size:19px;font-weight:700;color:var(--forest);margin:0 0 10px}
.prov-chip{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 12px;margin-bottom:12px}
.prov-real{background:#e8f2ea;color:var(--forest);border:1px solid #bcd8c4}
.prov-comp{background:#fdf1e8;color:#9a5a36;border:1px solid #ecd3bd}
.prov-ai{background:#f3efe7;color:#7a6f5c;border:1px solid #ddd3bf}
.prov-design{background:#eef1f6;color:#41546e;border:1px solid #ccd6e4}
.img-single{width:100%;border-radius:10px;display:block;margin-bottom:14px}
.ab-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px}
.ab-cell{text-align:center}
.ab-cell img{width:100%;border-radius:10px;display:block}
.ab-tag{display:inline-block;font-size:12px;font-weight:700;color:#fff;background:var(--forest);border-radius:999px;padding:4px 12px;margin:10px 0 0}
.ab-pick{display:flex;gap:10px;justify-content:center;margin:14px 0 6px;flex-wrap:wrap}
.ab-pick .ap-radio{font-size:13px}
.notice{background:#fff7e0;border:1px solid #e8d79a;color:#7a5d1a;border-radius:10px;padding:12px 16px;font-size:13.5px;margin:4px 0 12px}
.why{font-size:13px;color:var(--muted);background:var(--cream);border-right:3px solid var(--terracotta);border-radius:6px;padding:8px 12px;margin:4px 0 14px}
.copy-block{background:var(--cream);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0 18px;font-size:14.5px}
.copy-block .cf-label{font-size:11px;font-weight:700;letter-spacing:.03em;color:var(--terracotta);margin:0 0 4px}
.copy-block .cf-value{margin:0 0 12px;color:var(--ink)}
.copy-block .cf-value:last-child{margin-bottom:0}
.copy-block .cta-badge{display:inline-block;background:var(--forest);color:#fff;font-size:12.5px;font-weight:700;border-radius:8px;padding:6px 12px}
.approval-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding-top:14px;border-top:1px dashed var(--line);margin-top:4px}
.ap-label{font-size:13px;color:var(--muted);font-weight:600;margin-left:6px}
.ap-radio{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;border:1.5px solid var(--line);font-size:13.5px;cursor:pointer;background:#fff;transition:.15s}
.ap-radio input{display:none}
.ap-radio:hover{border-color:var(--forest)}
.ap-radio.selected.accept-tone{background:var(--good);color:#fff;border-color:var(--good)}
.ap-radio.selected.regen-tone{background:var(--warn);color:#fff;border-color:var(--warn)}
.ap-radio.selected.hold-tone{background:var(--hold);color:#fff;border-color:var(--hold)}
.section-discuss{margin-top:14px}
.discuss-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.discuss-header h4{margin:0;font-size:13.5px;color:var(--muted);font-weight:600}
.discuss-btn{background:transparent;border:1.5px solid var(--line);border-radius:999px;padding:8px 14px;font-size:13px;color:var(--ink);cursor:pointer;font-family:inherit}
.discuss-btn:hover{border-color:var(--terracotta);color:var(--terracotta)}
.cmt-list{margin-top:10px}
.cmt-item{position:relative;background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:10px 40px 10px 14px;margin-bottom:8px;font-size:13.5px}
.cmt-author{display:block;font-weight:700;color:var(--forest);font-size:12.5px;margin-bottom:2px}
.cmt-time{display:block;color:var(--muted);font-size:11px;margin-top:4px}
.cmt-del{position:absolute;left:8px;top:8px;background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;line-height:1}
footer.bottom{text-align:center;padding-top:20px;color:var(--muted);font-size:13px}
.cmt-modal{position:fixed;inset:0;background:rgba(23,20,10,.55);display:none;align-items:center;justify-content:center;z-index:2000;padding:16px}
.cmt-modal.open{display:flex}
.cmt-modal-body{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.25)}
.cmt-modal-body h3{margin:0 0 6px;font-size:17px;color:var(--forest)}
.cmt-modal-body .ctx{font-size:12px;color:var(--muted);margin-bottom:14px;padding:8px 10px;background:var(--cream);border-radius:6px;border-right:3px solid var(--terracotta)}
.cmt-modal-body label{display:block;font-size:12px;color:var(--ink);margin-bottom:6px;font-weight:600}
.cmt-modal-body input[type=text],.cmt-modal-body textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:10px 12px;color:var(--ink);font-size:14px;font-family:inherit;margin-bottom:14px;box-sizing:border-box;background:var(--cream)}
.cmt-modal-body textarea{min-height:90px;resize:vertical}
.cmt-modal-body input[type=text]:focus,.cmt-modal-body textarea:focus{outline:none;border-color:var(--forest)}
.cmt-modal-actions{display:flex;gap:10px;justify-content:flex-start}
.cmt-modal-actions button{padding:10px 18px;border-radius:8px;border:none;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit}
.cmt-modal-actions .save{background:var(--forest);color:#fff}
.cmt-modal-actions .cancel{background:transparent;color:var(--muted);border:1px solid var(--line)}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--forest);color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;opacity:0;pointer-events:none;transition:.25s;z-index:3000}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:640px){header.top h1{font-size:20px}.card{padding:16px}.ab-grid{grid-template-columns:1fr}.approval-row{flex-direction:column;align-items:stretch}}
`;

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>باسقات: مراجعة تصاميم إعلانات ميتا · الجولة التانية</title>
<meta name="description" content="Basseqat Meta static-creative round v2: 14 new performance-grounded concepts + the 8 round-one concepts, approval + comments.">
<style>${css}</style>
</head>
<body>
<div class="wrap">

<header class="top">
  <img src="../basseqat-meta-ads-v1/assets/logo-primary.png" alt="باسقات">
  <h1>مراجعة تصاميم إعلانات ميتا · الجولة التانية (22 تصميم)</h1>
  <p>بنينا الجولة دي على نتايج الحملات الشغالة فعلا: شفنا أنهي إعلانات جابت عملاء بجد وبكام, وفين الفجوات, وبعدين صممنا 14 فكرة جديدة بتكمل من حيث ما نجح. ومعاهم تصاميم الجولة الأولى الـ 8 علشان المراجعة كلها تبقى في صفحة واحدة.</p>
  <p><strong>عن الصور:</strong> كل تصميم عليه شارة بتقول مصدر الصورة بالظبط. صورة خالد شخصيا حقيقية 100% في كل التصاميم ومستحيل تتعمل بالذكاء الاصطناعي. الخلفيات والمشاهد في بعض التصاميم متولدة بالذكاء الاصطناعي بس معمولة علشان تطابق شكل المزرعة الحقيقية.</p>
</header>

<div class="howto">
  <strong>إزاي تراجعوا:</strong> شوفوا كل تصميم (الصورة + الكوبي)، واختاروا "موافق" أو "اعمل نسخة تانية" أو "توقف وعلّق" تحت كل تصميم.
  في تصاميم الجولة الأولى اللي فيها نسختين (A و B)، اختاروا كمان أنهي نسخة. لو حابين توضحوا حاجة، دوسوا "أضف تعليق".
</div>

<details class="strategy">
  <summary>📊 ليه الأفكار دي بالذات؟ (ملخص نتايج الحملات)</summary>
  <ul>
    <li><strong>أنجح إعلان في الحساب كان تصميم ثابت</strong> بزاوية "الكلام سهل.. تعالى شوف بعينك" مع تعديد البنية التحتية. علشان كده في 3 تصاميم جديدة بتاخد نفس الزاوية بأشكال أقوى بصريا (5, 6, 7).</li>
    <li><strong>إعلانات المغتربين الثابتة كانت أضعف نقطة</strong> (تكلفة العميل المحتمل 3 أضعاف مصر). علشان كده في 3 تصاميم مخصوص ليهم (8, 9, 10).</li>
    <li><strong>إعلانات المعاش بتجيب أعلى ضغط وأقل عملاء جادين</strong>: التصميم 11 بيحل ده بفلترة واضحة من أول سطر.</li>
    <li><strong>أرخص إعلان في تاريخ الحساب كان رقم حجز حقيقي</strong> بس وقتها كان بأسلوب استعجال مش مناسب للبراند. التصميم 13 بيرجع الفكرة من غير أي ضغط, ومستني الرقم المؤكد.</li>
    <li><strong>شخصية المؤسس عمرها ما اتستخدمت في الحساب</strong> رغم إنها أقوى ورقة ثقة: التصاميم 1-4.</li>
  </ul>
</details>

<div class="sec-title">التصاميم الجديدة (14)</div>
${NEW_CARDS.map(cardHtml).join("\n")}

<div class="sec-title">تصاميم الجولة الأولى (8)</div>
${V1_CARDS.map(cardHtml).join("\n")}

<footer class="bottom">
  بمجرد ما توافقوا على التصاميم، بنجهز مقاسات الستوري (9:16) للتصاميم المعتمدة وبعدين ننزلها في الحساب.
</footer>

</div>

<!-- COMMENT MODAL -->
<div class="cmt-modal" id="cmt-modal" role="dialog" aria-modal="true">
  <div class="cmt-modal-body">
    <h3 id="cmt-modal-title">أضف تعليقك</h3>
    <div class="ctx" id="cmt-modal-ctx">على: </div>
    <div id="cmt-name-row" style="display:none">
      <label for="cmt-name-input">اسمك</label>
      <input type="text" id="cmt-name-input" placeholder="مثال: خالد ناصر الدين">
    </div>
    <label for="cmt-text-input">التعليق</label>
    <textarea id="cmt-text-input" maxlength="4900" placeholder="رأيك في التصميم ده..."></textarea>
    <div class="cmt-modal-actions">
      <button class="save" onclick="submitComment()">حفظ التعليق</button>
      <button class="cancel" onclick="closeCmtModal()">إلغاء</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
const app = initializeApp({
  apiKey: "AIzaSyBQk7osdbUb2hLoFrirVKhHadZ1mi9x_5I",
  authDomain: "admireworks---internal-os.firebaseapp.com",
  projectId: "admireworks---internal-os",
  storageBucket: "admireworks---internal-os.firebasestorage.app",
  messagingSenderId: "712573851224",
  appId: "1:712573851224:web:33541df018b7f51d8b1c2d"
});
const db = getFirestore(app);
const DECK_SLUG = "basseqat-meta-ads-v2";
window.AW_FB = { db, DECK_SLUG, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp };
window.dispatchEvent(new Event("aw-fb-ready"));
</script>

<script>
let fbReady = false;
let toastTimer = null;
const stateDecisions = {};
const stateComments = {};
const NAME_KEY = "basseqat-meta-ads-v2-reviewer-name";

function getName(){ return localStorage.getItem(NAME_KEY) || localStorage.getItem("basseqat-meta-ads-v1-reviewer-name") || ""; }
function setName(n){ localStorage.setItem(NAME_KEY, n); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c])); }

window.addEventListener("aw-fb-ready", () => { fbReady = true; initSync(); });

function initSync(){
  const fb = window.AW_FB;
  if (!fb) return;
  const decRef = fb.collection(fb.db, "adApprovalFeedback", fb.DECK_SLUG, "decisions");
  fb.onSnapshot(decRef, snap => {
    Object.keys(stateDecisions).forEach(k => delete stateDecisions[k]);
    snap.forEach(d => { stateDecisions[d.id] = d.data(); });
    renderApRadioState();
  }, err => console.error("decisions onSnapshot:", err));

  const cmtRef = fb.collection(fb.db, "adApprovalFeedback", fb.DECK_SLUG, "comments");
  fb.onSnapshot(fb.query(cmtRef, fb.orderBy("createdAt", "asc")), snap => {
    Object.keys(stateComments).forEach(k => delete stateComments[k]);
    snap.forEach(d => {
      const data = d.data();
      const sid = data.sectionId;
      if (!stateComments[sid]) stateComments[sid] = [];
      stateComments[sid].push({ id: d.id, ...data });
    });
    document.querySelectorAll("[data-cmt-list]").forEach(el => renderComments(el.dataset.cmtList));
  }, err => console.error("comments onSnapshot:", err));
}

async function submitItemDecision(itemKey, decision, label){
  if (!fbReady) { showToast("لسه بنتصل، جرب تاني بعد لحظة."); return; }
  let name = getName();
  if (!name) {
    name = (prompt("اسمك (هيتسجّل مرة واحدة):") || "").trim();
    if (!name) { showToast("من فضلك اكتب اسمك."); return; }
    setName(name);
  }
  const fb = window.AW_FB;
  try {
    await fb.setDoc(
      fb.doc(fb.db, "adApprovalFeedback", fb.DECK_SLUG, "decisions", itemKey),
      { decision, name, updatedAt: fb.serverTimestamp() }
    );
    showToast("اتسجل قرارك: " + label);
  } catch (e) {
    console.error("submitItemDecision", e);
    showToast("حصل خطأ في الحفظ: " + (e.message || "غير معروف"));
  }
}
window.submitItemDecision = submitItemDecision;

function attachAllRadios(){
  document.querySelectorAll(".ap-radio").forEach(label => {
    label.addEventListener("click", async (e) => {
      e.preventDefault();
      const item = label.dataset.item;
      const decision = label.dataset.decision;
      const labelTextEl = label.cloneNode(true);
      labelTextEl.querySelectorAll("input").forEach(n => n.remove());
      const labelText = labelTextEl.textContent.trim();
      document.querySelectorAll('.ap-radio[data-item="' + CSS.escape(item) + '"]').forEach(r => r.classList.remove("selected"));
      label.classList.add("selected");
      await submitItemDecision(item, decision, labelText);
    });
  });
}
document.addEventListener("DOMContentLoaded", attachAllRadios);

function renderApRadioState(){
  document.querySelectorAll(".ap-radio").forEach(r => r.classList.remove("selected"));
  Object.entries(stateDecisions).forEach(([itemKey, data]) => {
    const sel = '.ap-radio[data-item="' + CSS.escape(itemKey) + '"][data-decision="' + CSS.escape(data.decision) + '"]';
    document.querySelectorAll(sel).forEach(r => r.classList.add("selected"));
  });
}

let activeCmtSection = null;
let activeCmtLabel = "";
function openCmtModal(sectionKey, label){
  activeCmtSection = sectionKey;
  activeCmtLabel = label;
  const modal = document.getElementById("cmt-modal");
  const nameRow = document.getElementById("cmt-name-row");
  const nameInput = document.getElementById("cmt-name-input");
  const textInput = document.getElementById("cmt-text-input");
  const ctx = document.getElementById("cmt-modal-ctx");
  ctx.textContent = "على: " + label;
  const existing = getName();
  if (existing) { nameRow.style.display = "none"; }
  else { nameRow.style.display = "block"; nameInput.value = ""; setTimeout(() => nameInput.focus(), 50); }
  textInput.value = "";
  if (existing) setTimeout(() => textInput.focus(), 50);
  modal.classList.add("open");
}
function closeCmtModal(){
  document.getElementById("cmt-modal").classList.remove("open");
  activeCmtSection = null;
}
async function submitComment(){
  const nameInput = document.getElementById("cmt-name-input");
  const textInput = document.getElementById("cmt-text-input");
  let name = getName();
  if (!name) {
    name = (nameInput.value || "").trim();
    if (!name) { nameInput.focus(); showToast("اكتب اسمك من فضلك."); return; }
    setName(name);
  }
  const text = (textInput.value || "").trim();
  if (!text) { textInput.focus(); showToast("التعليق فاضي."); return; }
  if (!fbReady) { showToast("لسه بنتصل، جرب تاني."); return; }
  const fb = window.AW_FB;
  try {
    await fb.addDoc(
      fb.collection(fb.db, "adApprovalFeedback", fb.DECK_SLUG, "comments"),
      { sectionId: activeCmtSection, sectionLabel: activeCmtLabel, name, text, createdAt: fb.serverTimestamp() }
    );
    closeCmtModal();
    showToast("اتسجل التعليق.");
  } catch (e) {
    console.error("submitComment", e);
    showToast("حصل خطأ في الحفظ: " + (e.message || "تأكد من الاتصال"));
  }
}
function renderComments(sectionKey){
  const el = document.querySelector('[data-cmt-list="' + sectionKey + '"]');
  if (!el) return;
  const comments = stateComments[sectionKey] || [];
  if (comments.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = comments.map(c => {
    const t = c.createdAt && c.createdAt.toDate ? c.createdAt.toDate() : (c.createdAt instanceof Date ? c.createdAt : new Date());
    const ts = t.toLocaleString("ar-EG", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"short" });
    const isMine = c.name === getName();
    const delBtn = isMine ? '<button class="cmt-del" onclick="deleteCommentById(\\'' + c.id + '\\')" title="حذف">×</button>' : '';
    return '<div class="cmt-item">' + delBtn + '<span class="cmt-author">' + escapeHtml(c.name) + '</span>' + escapeHtml(c.text) + '<span class="cmt-time">' + ts + '</span></div>';
  }).join("");
}
async function deleteCommentById(commentId){
  if (!confirm("تحذف التعليق ده؟")) return;
  if (!fbReady) return;
  const fb = window.AW_FB;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "adApprovalFeedback", fb.DECK_SLUG, "comments", commentId));
    showToast("اتحذف.");
  } catch(e){ showToast("الحذف فشل."); }
}
window.openCmtModal = openCmtModal;
window.closeCmtModal = closeCmtModal;
window.submitComment = submitComment;
window.deleteCommentById = deleteCommentById;

function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

document.getElementById("cmt-modal").addEventListener("click", e => { if (e.target.id === "cmt-modal") closeCmtModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeCmtModal(); });
</script>

</body>
</html>
`;

writeFileSync(resolve(ROOT, "index.html"), html);
console.log("wrote index.html", html.length, "bytes,", NEW_CARDS.length + V1_CARDS.length, "cards");
