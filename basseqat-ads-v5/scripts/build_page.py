#!/usr/bin/env python3
"""
Render basseqat-ads-v5/review.html from copy/copy-deck.json (sections b, c, d) and the
v4 copy deck (section a, re-shown unchanged), so the text the client approves is
byte-for-byte the text the ad will carry.

    python3 basseqat-ads-v5/scripts/build_page.py

Same page shell, CSS and feedback script as basseqat-ads-v4 (imported from its
build_page.py). Decisions and comments go to adApprovalFeedback/basseqat-ads-v5
(decisions carry only decision, name, updatedAt; the item key is the doc id):
  concept-a..concept-c, fix-c5, fix-c7, fix-c8, pmax-h-brochure, pmax-d-brochure,
  pmax-h-2021, pmax-images, post-phase1, post-downpayment, post-apartment, apply-all.
"""
import html
import importlib.util
import json
from pathlib import Path

WAVE = Path(__file__).resolve().parent.parent
V4 = WAVE.parent / "basseqat-ads-v4"
DECK = json.loads((WAVE / "copy" / "copy-deck.json").read_text(encoding="utf-8"))
SLUG = "basseqat-ads-v5"
EM_DASH = chr(0x2014)
E = html.escape

_spec = importlib.util.spec_from_file_location("v4page", V4 / "scripts" / "build_page.py")
v4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v4)


def show(s):
    """Escape for HTML; a live string's em dash is shown as an entity (the rendered page must hold none)."""
    return E(s).replace("{EMDASH}", "&#8212;")


def radios(item, labels=("موافق", "عايز تعديل", "مش موافق")):
    return v4.radios(item, labels)


def discuss(key, label):
    return v4.discuss(key, label)


def apply_edits(text, edits):
    after = text
    for old, new in edits:
        if after.count(old) != 1:
            raise SystemExit(f"edit not found exactly once: {old!r}")
        after = after.replace(old, new)
    return after


def marked(text, edits, side):
    """Return HTML of `text` (before or after) with each edited span highlighted."""
    out = show(text)
    for old, new in edits:
        span = old if side == "before" else new
        tag = "del" if side == "before" else "ins"
        out = out.replace(show(span), f"<{tag}>{show(span)}</{tag}>", 1)
    return out


# ---------- (a) the three v4 concepts, unchanged ----------
def section_a():
    cards = "".join(
        v4.concept_card(k, v4.DECK["concepts"][k]["onImage"]["headline"], v4.DECK["concepts"][k]["why"],
                        v4.DECK["concepts"][k]["photoNote"])
        for k in "abc")
    cards = (cards.replace('src="assets/preview/', 'src="../basseqat-ads-v4/assets/preview/')
                  .replace('href="assets/creatives/', 'href="../basseqat-ads-v4/assets/creatives/')
                  .replace("رأيكم في البديل ده؟", "تختاري البديل ده؟"))
    return f"""
<section id="sec-a">
  <h2 class="sec"><span class="secno">1</span> بديل إعلان الغربة</h2>
  <p class="intro">دي نفس التلات أفكار اللي بعتناهالكم يوم 8 نوفمبر، من غير أي تغيير. محتاجين منك تختاري واحدة (أو أكتر) علشان تحل محل إعلان «الغربة ليها آخر.. حضّرله»، لأن صورته معمولة بالذكاء الاصطناعي.</p>
  {cards}
</section>"""


# ---------- (b) text-only fixes on three live Meta ads ----------
def fb_card(img, text_html, headline_html, link_desc, ai=False):
    cap = '<figcaption class="ai">الصورة دي معمولة بالذكاء الاصطناعي، وهتتغير بالبديل اللي هتختاريه في الجزء 1</figcaption>' if ai else ""
    return f"""
<figure class="fb">
  <div class="fb-head"><img src="assets/logo-square.png" alt="" class="fb-av" /><div><b>باسقات</b><span>إعلان ممول</span></div></div>
  <div class="fb-text"><p>{text_html}</p></div>
  <img class="fb-img" src="{img}" alt="" loading="lazy" />
  <div class="fb-foot"><div><span class="fb-url">START.BASSEQAT.COM</span><b>{headline_html}</b><span class="fb-desc">{E(link_desc)}</span></div><span class="fb-cta">معرفة المزيد</span></div>
  {cap}
</figure>"""


LINK_DESC = "استثمار زراعي في نخيل المجدول .. أصل حقيقي، بنية تحتية قائمة، وشفافية كاملة"


def fix_card(f):
    b = f["before"]
    after_text = apply_edits(b["primaryText"], f["edits"])
    h_old, h_new = f["headlineEdit"]
    if b["headline"] != h_old:
        raise SystemExit(f"{f['key']}: headline edit does not match the live headline")
    before_html = marked(b["primaryText"], f["edits"], "before")
    after_html = marked(after_text, f["edits"], "after")
    img_note = ("<p class=\"src\"><b>الصورة:</b> معمولة بالذكاء الاصطناعي، فمش هنسيبها. "
                "الإعلان ده هيتغير ببديل من الجزء 1، ولحد ما ده يحصل نصلح الكلام بس.</p>") if f.get("imageIsAi") else \
               "<p class=\"src\"><b>الصورة:</b> زي ما هي، مفيش فيها أي تغيير.</p>"
    return f"""
<article class="card" id="{f['key']}">
  <header class="card-h"><span class="pill">إعلان شغال</span><h3 dir="ltr">{E(f['adName'])}</h3></header>
  {img_note}
  <div class="ba">
    <div><h4 class="lbl before-l">دلوقتي</h4>{fb_card(f['image'], before_html, f'<del>{show(h_old)}</del>', LINK_DESC, f.get('imageIsAi'))}</div>
    <div><h4 class="lbl after-l">بعد التعديل</h4>{fb_card(f['image'], after_html, f'<ins>{show(h_new)}</ins>', LINK_DESC, f.get('imageIsAi'))}</div>
  </div>
  <h4>اللي اتغير بس</h4>
  <ul class="ticks">{v4.li(f['why'])}</ul>
  <div class="decide"><h4>موافقة على التعديل ده؟</h4>{radios(f['key'])}</div>
  {discuss(f['key'], f['adName'])}
</article>"""


def section_b():
    cards = "".join(fix_card(f) for f in DECK["metaFixes"])
    return f"""
<section id="sec-b">
  <h2 class="sec"><span class="secno">2</span> تعديل الكلام بس في 3 إعلانات فيسبوك شغالة</h2>
  <p class="intro">الصورة زي ما هي. غيّرنا أقل حاجة ممكنة: «بروشور باسقات» بدل «دليل باسقات»، «من 2021» بدل «٦ سنين»، والسيوي بقى مذكور كخبرة بس. الكلام اللي اتشال باللون الأحمر، والجديد باللون الأخضر.</p>
  {cards}
  <aside class="note">{E(DECK['linkDescriptionNote'])}</aside>
</section>"""


# ---------- (c) Google PMax ----------
def section_c():
    p = DECK["pmax"]
    rows = []
    for t in p["text"]:
        if len(t["after"]) > t["limit"]:
            raise SystemExit(f"{t['key']}: {len(t['after'])} chars over Google's {t['limit']}")
        rows.append(f"""
<article class="card slim" id="{t['key']}">
  <header class="card-h"><span class="pill">{E(t['field'])}</span><h3>{E(t['groups'])}</h3></header>
  <div class="txtba">
    <div class="old"><span>دلوقتي</span><del>{E(t['before'])}</del></div>
    <div class="new"><span>بعد التعديل</span><ins>{E(t['after'])}</ins></div>
  </div>
  <div class="decide">{radios(t['key'])}</div>
  {discuss(t['key'], t['before'])}
</article>""")
    imgs = "".join(
        f'<figure class="gimg"><img src="assets/pmax/{i["id"]}.jpg" alt="" loading="lazy" />'
        f'<figcaption><b>{"ذكاء اصطناعي" if i["kind"] == "generated" else "تعديل أوتوماتيك من جوجل"}</b> {E(i["note"])}</figcaption></figure>'
        for i in p["images"])
    n_gen = sum(1 for i in p["images"] if i["kind"] == "generated")
    n_auto = len(p["images"]) - n_gen
    return f"""
<section id="sec-c">
  <h2 class="sec"><span class="secno">3</span> إعلانات جوجل (Performance Max)</h2>
  <p class="intro">في حملة جوجل لقينا 3 جمل محتاجة تتغير، و{n_gen + n_auto} صور مش بتاعتنا: {n_gen} معمولين بالذكاء الاصطناعي من جوجل نفسه، و{n_auto} نسخ جوجل عدّلها أوتوماتيك من تصميماتنا. جوجل مش بيسمح بتعديل جملة، فهنضيف الجملة الجديدة ونشيل القديمة.</p>
  {''.join(rows)}
  <article class="card" id="pmax-images">
    <header class="card-h"><span class="pill">صور</span><h3>نشيل الصور دي من الحملة</h3></header>
    <p class="why">باقي الصور (تصميماتنا اللي وافقتوا عليها قبل كده) فاضلة زي ما هي، فالحملة هتفضل شغالة عادي.</p>
    <div class="ggrid">{imgs}</div>
    <div class="decide"><h4>نشيل الصور دي؟</h4>{radios('pmax-images', ('أيوه شيلوها', 'عايزة أتكلم الأول', 'لأ سيبوها'))}</div>
    {discuss('pmax-images', 'صور جوجل')}
  </article>
</section>"""


# ---------- (d) Phase-1 posts ----------
def section_d():
    p = DECK["posts"]
    tags = (("1x1", "مربع 1:1"), ("4x5", "طولي 4:5"), ("9x16", "ستوري وريلز 9:16"))
    cards = []
    for it in p["items"]:
        cells = "".join(
            f'<a class="sz" href="{p["storage"]}{it["folder"]}/{it["full"][k]}" target="_blank" rel="noopener">'
            f'<img src="assets/posts/{it["file"]}-{k}.jpg" alt="{E(t)}" loading="lazy" /><span>{E(t)}</span></a>'
            for k, t in tags)
        cards.append(f"""
<article class="card" id="{it['key']}">
  <header class="card-h"><span class="pill">تصميم بوست</span><h3>{E(it['title'])}</h3></header>
  <div class="sizes">{cells}</div>
  <p class="hint">اضغط على أي مقاس تشوف الصورة بالحجم الكامل.</p>
  <dl class="fields"><dt>الكلام على الصورة</dt><dd>{E(it['onImage'])}</dd></dl>
  <div class="decide"><h4>{E(p['question'])}</h4>{radios(it['key'], ('أيوه ينفع', 'ينفع بعد تعديل', 'لأ'))}</div>
  {discuss(it['key'], it['title'])}
</article>""")
    return f"""
<section id="sec-d">
  <h2 class="sec"><span class="secno">4</span> تصميمات بوستات المرحلة الأولى</h2>
  <p class="intro">دي تصميماتنا للبوستات التلاتة الأولى، بكل المقاسات. سؤال واحد على كل واحد: {E(p['question'])} الصور فيها نخيلنا السيوي ومكتوب عليها كده، علشان محدش يفهم إنه المجدول الجديد.</p>
  {''.join(cards)}
</section>"""


def page():
    body = v4.page()
    head, rest = body.split("<body>", 1)
    tail = rest[rest.index('<div class="cmt-modal"'):]
    head = head.replace("<title>باسقات · بديل إعلان الغربة · v4</title>", "<title>باسقات · مراجعة الإعلانات · v5</title>")
    top = f"""<body>
<header class="top">
  <div class="wrap">
    <img src="assets/logo-landscape.png" alt="باسقات" class="logo" />
    <p class="eyebrow">مراجعة إعلانات فيسبوك وإنستجرام وجوجل · 15 نوفمبر 2026</p>
    <h1>مراجعة الإعلانات: 4 حاجات محتاجين رأيك فيها</h1>
    <p class="headline-promise">مفيش أي حاجة هتتغير في الإعلانات غير بعد موافقتك.</p>
    <nav class="toc"><a href="#sec-a">1. بديل إعلان الغربة</a><a href="#sec-b">2. تعديل كلام 3 إعلانات فيسبوك</a><a href="#sec-c">3. إعلانات جوجل</a><a href="#sec-d">4. بوستات المرحلة الأولى</a></nav>
  </div>
</header>
<main class="wrap">
  {section_a()}
  {section_b()}
  {section_c()}
  {section_d()}
  <section class="apply" id="apply">
    <h3>اللي هيحصل بعد ما توافقي</h3>
    <ul class="ticks">
      <li>هننفّذ بس الحاجات اللي اخترتي عليها «موافق»، وأي حاجة عليها «عايز تعديل» هنعدلها ونحطها هنا على نفس الرابط الأول.</li>
      <li>تعديل الكلام في فيسبوك بيخلي فيسبوك يراجع الإعلان تاني، وده بياخد عادة ساعات قليلة.</li>
      <li>البديل اللي هتختاريه لإعلان الغربة هيتحط في نفس مجموعة المصريين في الخليج، وأول ما يشتغل نوقف الإعلان القديم.</li>
      <li>مفيش أي حاجة هتتغير في الإعلانات غير بعد موافقتك.</li>
    </ul>
    <div class="apply-row">
      <button type="button" class="apply-cta approve" id="cta-approve-all" onclick="submitItemDecision('apply-all','approve','موافقة على اللي اخترته')">موافقة على اللي اخترته فوق</button>
      <button type="button" class="apply-cta hold" id="cta-hold-all" onclick="submitItemDecision('apply-all','hold','عايزين نتكلم الأول')">عايزين نتكلم الأول</button>
    </div>
    <p class="you-decided" id="you-decided"></p>
    {discuss('general', 'تعليق عام')}
  </section>
</main>
<footer class="foot"><div class="wrap">إعداد فريق Admireworks لباسقات · مفيش ولا صورة جديدة في الصفحة دي معمولة بالذكاء الاصطناعي</div></footer>
"""
    out = head + "<body>" + top[len("<body>"):] + "\n" + tail
    out = out.replace(f'DECK_SLUG: "{v4.SLUG}"', f'DECK_SLUG: "{SLUG}"')
    out = out.replace('NAME_KEY="basseqat-ads-v4-reviewer-name"', 'NAME_KEY="basseqat-ads-v5-reviewer-name"')
    out = out.replace('"موافقين على البدايل"', '"موافقة على اللي اخترته"')
    out = out.replace("</style>", EXTRA_CSS + "</style>", 1)
    if f'DECK_SLUG: "{SLUG}"' not in out or "basseqat-ads-v5-reviewer-name" not in out:
        raise SystemExit("feedback wiring not switched to v5")
    return out


EXTRA_CSS = """
.headline-promise{display:inline-block;background:var(--forest);color:var(--cream);padding:8px 16px;border-radius:12px;font-weight:700;margin:4px 0 12px}
.toc{display:flex;flex-wrap:wrap;gap:8px}.toc a{background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 12px;color:var(--forest);text-decoration:none;font-size:14px;font-weight:600}
.secno{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--terra);color:#fff;font-size:16px;margin-left:8px;vertical-align:middle}
.ba{display:grid;grid-template-columns:1fr;gap:16px}@media(min-width:860px){.ba{grid-template-columns:1fr 1fr}}
.lbl{margin:0 0 6px}.before-l{color:var(--red)}.after-l{color:var(--ok)}
del{background:#fbe3dd;color:var(--red);text-decoration:line-through}
ins{background:#ddf0e3;color:#1d5c37;text-decoration:none;font-weight:600}
.fb figcaption.ai{font-size:13px;color:var(--red);font-weight:600;padding:6px 12px}
.card.slim{padding:16px}
.txtba{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:700px){.txtba{grid-template-columns:1fr 1fr}}
.txtba div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--cream)}
.txtba span{display:block;font-size:12px;color:var(--faint);margin-bottom:4px}
.ggrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(min-width:860px){.ggrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.gimg{margin:0}.gimg img{border:1px solid var(--line);border-radius:8px;width:100%;height:auto}
.gimg figcaption{font-size:12px;color:var(--soft);line-height:1.6;margin-top:4px}.gimg figcaption b{display:block;color:var(--red)}
"""

if __name__ == "__main__":
    out = page()
    if EM_DASH in out:
        raise SystemExit("em dash in the rendered page")
    (WAVE / "review.html").write_text(out, encoding="utf-8")
    print(f"wrote review.html ({len(out.encode()) // 1024} KB)")
