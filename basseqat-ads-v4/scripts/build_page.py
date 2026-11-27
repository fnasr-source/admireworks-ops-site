#!/usr/bin/env python3
"""
Render basseqat-ads-v4/review.html (the client review page; index.html is the redirect stub to its link) from copy/copy-deck.json, so
the ad text the client approves is byte-for-byte the text the ad will carry.

    python3 basseqat-ads-v4/scripts/build_page.py

Decisions and comments go to adApprovalFeedback/basseqat-ads-v4 (decisions carry only
decision, name, updatedAt; the item key is the doc id).
"""
import html
import json
from pathlib import Path

WAVE = Path(__file__).resolve().parent.parent
DECK = json.loads((WAVE / "copy" / "copy-deck.json").read_text(encoding="utf-8"))
SLUG = "basseqat-ads-v4"
EM_DASH = chr(0x2014)
E = html.escape

C8_STATS = {  # Meta insights for ad 52553091092472, 27 Oct to 2 Nov 2026, read 3 Nov (aw-ads meta_insights)
    "spend": "8,269", "leads": "34", "ctr": "6%", "reach": "34,361",
}


def paras(lines):
    return "".join(f"<p>{E(s)}</p>" for s in lines)


def li(items):
    return "".join(f"<li>{E(s)}</li>" for s in items)


def radios(item, labels=("موافق", "عايز تعديل", "مش موافق")):
    vals = ("approve", "changes", "reject")
    tones = ("accept-tone", "hold-tone", "reject-tone")
    return '<div class="ap-row">' + "".join(
        f'<label class="ap-radio {t}" data-item="{item}" data-decision="{v}"><input type="radio" name="{item}" />{E(l)}</label>'
        for v, t, l in zip(vals, tones, labels)) + "</div>"


def discuss(key, label):
    return (f'<div class="section-discuss"><button type="button" class="cmt-btn" onclick="openCmtModal(\'{key}\', \'{E(label)}\')">'
            f'اكتب تعليق</button><div class="cmt-list" data-cmt-list="{key}"></div></div>')


def mock(key, c, ratio="4x5"):
    m = c["meta"]
    return f"""
<figure class="fb">
  <div class="fb-head"><img src="assets/logo-square.png" alt="" class="fb-av" /><div><b>باسقات</b><span>إعلان ممول</span></div></div>
  <div class="fb-text">{paras(m['primaryText'])}</div>
  <img class="fb-img" src="assets/preview/{key}-{ratio}.jpg" alt="{E(c['onImage']['headline'])}" loading="lazy" />
  <div class="fb-foot"><div><span class="fb-url">START.BASSEQAT.COM</span><b>{E(m['headline'])}</b><span class="fb-desc">{E(m['linkDescription'])}</span></div><span class="fb-cta">معرفة المزيد</span></div>
</figure>"""


def sizes(key):
    tags = (("1x1", "مربع 1:1"), ("4x5", "طولي 4:5"), ("9x16", "ستوري وريلز 9:16"))
    cells = "".join(
        f'<a class="sz" href="assets/creatives/{key}-{k}.png" target="_blank" rel="noopener"><img src="assets/preview/{key}-{k}.jpg" alt="{E(t)}" loading="lazy" /><span>{E(t)}</span></a>'
        for k, t in tags)
    return f'<div class="sizes">{cells}</div><p class="hint">اضغط على أي مقاس تشوف الصورة بالحجم الكامل.</p>'


def fields(c):
    m = c["meta"]
    return f"""
<dl class="fields">
  <dt>الكلام على الصورة</dt><dd>{E(' / '.join([v for k, v in c['onImage'].items() if isinstance(v, str) and k != 'caption']))}</dd>
  <dt>العنوان تحت الصورة</dt><dd>{E(m['headline'])}</dd>
  <dt>السطر اللي تحته</dt><dd>{E(m['linkDescription'])}</dd>
  <dt>الزرار</dt><dd>معرفة المزيد</dd>
  <dt>بيودّي على</dt><dd dir="ltr">{E(c['destination'])}</dd>
</dl>"""


def concept_card(key, title, why, photo_note, extra=""):
    c = DECK["concepts"][key]
    changed = c.get("changedFromC8") or c.get("changedFromLive")
    changed_html = f'<h4>اللي اتغير عن الإعلان القديم</h4><ul class="ticks">{li(changed)}</ul>' if changed else ""
    return f"""
<article class="card" id="concept-{key}">
  <header class="card-h"><span class="pill">البديل {E({'a': 'الأول', 'b': 'التاني', 'c': 'التالت'}[key])}</span><h3>{E(title)}</h3></header>
  <p class="why">{E(why)}</p>
  <div class="two">
    <div>{mock(key, c)}</div>
    <div>
      {sizes(key)}
      <p class="src"><b>الصورة:</b> {E(photo_note)}</p>
      {fields(c)}
      {changed_html}
      {extra}
    </div>
  </div>
  <div class="decide"><h4>رأيكم في البديل ده؟</h4>{radios('concept-' + key)}</div>
  {discuss('concept-' + key, title)}
</article>"""


def page():
    cards = "".join(
        concept_card(k, DECK["concepts"][k]["onImage"]["headline"], DECK["concepts"][k]["why"], DECK["concepts"][k]["photoNote"])
        for k in "abc")
    c8 = f"""
<section class="card now" id="now">
  <header class="card-h"><span class="pill grey">الإعلان الحالي</span><h3>«الغربة ليها آخر.. حضّرله»</h3></header>
  <div class="two">
    <div><figure class="before"><img src="assets/before/c8-departure-live.jpg" alt="صورة الإعلان الحالي" /><figcaption>الصورة دي معمولة بالذكاء الاصطناعي</figcaption></figure></div>
    <div>
      <ul class="ticks">
        <li>زي ما طلبتي يوم 5 نوفمبر، الإعلان ده فاضل شغال بنفس الميزانية لحد ما توافقوا على بديل.</li>
        <li>أول ما البديل يشتغل، نوقفه.</li>
      </ul>
    </div>
  </div>
</section>"""
    body = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<meta name="referrer" content="no-referrer" />
<title>باسقات · بديل إعلان الغربة · v4</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>{CSS}</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <img src="assets/logo-landscape.png" alt="باسقات" class="logo" />
    <p class="eyebrow">مراجعة إعلانات فيسبوك وإنستجرام · 8 نوفمبر 2026</p>
    <h1>بديل لإعلان «الغربة ليها آخر.. حضّرله»</h1>
    <p class="lede">زي ما طلبتي يوم 5 نوفمبر: تصميم جديد للإعلان عن الغربة، بأشخاص حقيقيين مش معمولين بالذكاء الاصطناعي، وشكلهم مصريين عايشين برة. عملنالكم 3 أفكار بصور اتصورت فعلاً، والأشخاص فيها ضهرهم للكاميرا أو مش ظاهرين، علشان محدش يتعرف عليه وهو مش موافق.</p>
    <p class="lede">التلاتة لنفس الجمهور (المصريين في الخليج) ونفس الصفحة، والإعلان الحالي فاضل شغال لحد ما تختاروا.</p>
    <p class="deadline">اختاروا اللي يعجبكم، أو أكتر من واحد</p>
  </div>
</header>
<main class="wrap">
  {c8}
  <h2 class="sec">التلات أفكار الجديدة</h2>
  {cards}
  <aside class="note"><b>اقتراحنا:</b> نشغّل الأفكار اللي توافقوا عليها مع بعض في نفس المجموعة، وفيسبوك هيوري الأحسن فيهم أكتر.</aside>
  <section class="apply" id="apply">
    <h3>اللي هيحصل بعد ما توافقوا</h3>
    <ul class="ticks">
      <li>الإعلانات اللي توافقوا عليها هتتحط في نفس مجموعة المصريين في الخليج، بنفس الجمهور ونفس الصفحة.</li>
      <li>أول ما يبدأ يشتغل، نوقف الإعلان القديم.</li>
      <li>هنقفل خاصية فيسبوك اللي بتعدّل الصور أوتوماتيك، علشان الصورة تفضل زي ما هي.</li>
      <li>لو طلبتوا تعديل، هنحط النسخة الجديدة هنا على نفس الرابط قبل ما نغيّر أي حاجة.</li>
      <li>من غير موافقتكم مفيش حاجة هتتغير في الإعلانات.</li>
    </ul>
    <div class="apply-row">
      <button type="button" class="apply-cta approve" id="cta-approve-all" onclick="submitItemDecision('apply-all','approve','موافقين على البدايل')">موافقين على البدايل للإعلان ده</button>
      <button type="button" class="apply-cta hold" id="cta-hold-all" onclick="submitItemDecision('apply-all','hold','عايزين نتكلم الأول')">عايزين نتكلم الأول</button>
    </div>
    <p class="you-decided" id="you-decided"></p>
    {discuss('general', 'تعليق عام')}
  </section>
</main>
<footer class="foot"><div class="wrap">إعداد فريق Admireworks لباسقات · كل الأشخاص والأماكن في الصور دي اتصوروا فعلاً، ومفيش ولا صورة معمولة بالذكاء الاصطناعي</div></footer>

<div class="cmt-modal" id="cmt-modal" role="dialog" aria-modal="true" aria-labelledby="cmt-modal-title">
  <div class="cmt-modal-card">
    <h3 id="cmt-modal-title">اكتب تعليقك</h3>
    <p class="ctx" id="cmt-modal-ctx"></p>
    <div class="cmt-row" id="cmt-name-row"><label for="cmt-name-input">اسمك (بيتسجّل مرة واحدة على الجهاز ده)</label><input type="text" id="cmt-name-input" /></div>
    <div class="cmt-row"><label for="cmt-text-input">التعليق</label><textarea id="cmt-text-input" placeholder="اكتب اللي عايز تقوله أو تعدّله"></textarea></div>
    <div class="cmt-actions"><button type="button" class="cmt-submit" onclick="submitComment()">إرسال</button><button type="button" class="cmt-cancel" onclick="closeCmtModal()">إلغاء</button></div>
  </div>
</div>
<div class="toast" id="toast"></div>

<script type="module">
import {{ initializeApp }} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {{ getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp }}
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
const app = initializeApp({{
  apiKey: "AIzaSyBQk7osdbUb2hLoFrirVKhHadZ1mi9x_5I",
  authDomain: "admireworks---internal-os.firebaseapp.com",
  projectId: "admireworks---internal-os",
  storageBucket: "admireworks---internal-os.firebasestorage.app",
  messagingSenderId: "712573851224",
  appId: "1:712573851224:web:33541df018b7f51d8b1c2d"
}});
const db = getFirestore(app);
window.AW_FB = {{ db, DECK_SLUG: "{SLUG}", collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp }};
window.dispatchEvent(new Event("aw-fb-ready"));
</script>
<script>{JS}</script>
</body>
</html>
"""
    return body


CSS = """
:root{--forest:#175734;--forest-d:#0f3f25;--terra:#BF7955;--cream:#FFF8EF;--tint:#FBF3E5;--ink:#222C26;--soft:#5b5b5b;--faint:#8a8a8a;--line:#E2D6C7;--ok:#2f7a4e;--amber:#b7791f;--red:#a8402c;--bg:#ffffff;
--font:"IBM Plex Sans Arabic","Segoe UI",system-ui,sans-serif;--r:14px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--tint);color:var(--ink);font-family:var(--font);font-size:16px;line-height:1.75}
img{max-width:100%;display:block}
.wrap{max-width:1040px;margin:0 auto;padding:0 16px}
.top{background:var(--cream);border-bottom:1px solid var(--line);padding:28px 0 24px}
.logo{height:46px;width:auto;margin-bottom:14px}
.eyebrow{color:var(--terra);font-weight:600;margin:0 0 4px;font-size:14px}
h1{color:var(--forest);font-size:clamp(24px,5vw,34px);line-height:1.35;margin:0 0 12px}
.lede{margin:0 0 10px;max-width:760px}
.deadline{display:inline-block;background:var(--forest);color:var(--cream);padding:6px 14px;border-radius:999px;font-weight:600;font-size:14px;margin:8px 0 0}
.sec{color:var(--forest);font-size:22px;margin:36px 0 12px}
.intro{margin:0 0 14px;color:var(--soft)}
.card{background:var(--bg);border:1px solid var(--line);border-radius:var(--r);padding:20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(23,87,52,.06)}
.card-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px}
.card-h h3{margin:0;font-size:20px;color:var(--forest);line-height:1.4}
.pill{background:var(--terra);color:#fff;border-radius:999px;padding:2px 12px;font-size:13px;font-weight:600}
.pill.grey{background:#7a7068}
.why{margin:4px 0 16px;color:var(--soft)}
.two{display:grid;grid-template-columns:1fr;gap:20px}
@media(min-width:860px){.two{grid-template-columns:minmax(0,420px) minmax(0,1fr)}}
.fb{margin:0;background:#fff;border:1px solid #dddfe2;border-radius:10px;overflow:hidden;max-width:420px}
.fb-head{display:flex;gap:10px;align-items:center;padding:10px 12px}
.fb-av{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);object-fit:cover;background:var(--cream)}
.fb-head b{display:block;font-size:14px;line-height:1.3}.fb-head span{font-size:12px;color:var(--faint)}
.fb-text{padding:0 12px 8px;font-size:14px;line-height:1.7}.fb-text p{margin:0 0 8px}
.fb-img{width:100%;height:auto}
.fb-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#f0f2f5;padding:10px 12px}
.fb-foot div{min-width:0}.fb-url{display:block;font-size:11px;color:var(--faint);direction:ltr;text-align:right}
.fb-foot b{display:block;font-size:14px;line-height:1.4}.fb-desc{display:block;font-size:12px;color:var(--soft);line-height:1.5}
.fb-cta{flex:none;background:#e4e6eb;border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600}
.sizes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end}
.sz{display:block;text-decoration:none;color:var(--soft);font-size:12px;text-align:center}
.sz img{border:1px solid var(--line);border-radius:8px;margin:0 auto 4px;width:100%;height:auto}
.hint{font-size:13px;color:var(--faint);margin:6px 0 12px}
.src{font-size:14px;background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 12px}
.fields{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:4px 14px;font-size:14px;margin:0 0 12px}
.fields dt{color:var(--faint)}.fields dd{margin:0;overflow-wrap:anywhere}
h4{color:var(--forest);font-size:16px;margin:14px 0 6px}
.ticks{margin:0;padding:0 18px 0 0}.ticks li{margin:0 0 6px}
.ticks.warn li::marker{color:var(--red)}
.before{margin:0}.before img{border-radius:10px;border:1px solid var(--line)}.before figcaption{font-size:13px;color:var(--red);margin-top:6px;font-weight:600}
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.kpis div{background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.kpis b{display:block;font-size:22px;color:var(--forest);direction:ltr;text-align:right}.kpis span{font-size:13px;color:var(--soft)}
.decide{border-top:1px solid var(--line);margin-top:18px;padding-top:12px}
.ap-row{display:flex;flex-wrap:wrap;gap:8px}
.ap-radio{cursor:pointer;border:1.5px solid var(--line);border-radius:999px;padding:8px 16px;font-weight:600;font-size:15px;background:#fff;user-select:none}
.ap-radio input{display:none}
.ap-radio.accept-tone.selected{background:var(--ok);border-color:var(--ok);color:#fff}
.ap-radio.hold-tone.selected{background:var(--amber);border-color:var(--amber);color:#fff}
.ap-radio.reject-tone.selected{background:var(--red);border-color:var(--red);color:#fff}
.section-discuss{margin-top:12px}
.cmt-btn{background:none;border:1px dashed var(--terra);color:var(--terra);border-radius:999px;padding:6px 14px;font-family:inherit;font-size:14px;cursor:pointer}
.cmt-list{margin-top:8px}
.cmt-item{background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:6px 0;font-size:14px;white-space:pre-wrap}
.cmt-author{font-weight:700;color:var(--forest);margin-left:8px}.cmt-time{display:block;font-size:12px;color:var(--faint)}
.note{background:var(--cream);border-right:4px solid var(--terra);border-radius:10px;padding:12px 14px;margin:6px 0 10px}
.apply{background:var(--forest);color:var(--cream);border-radius:var(--r);padding:22px;margin:30px 0}
.apply h3{margin:0 0 10px;font-size:20px}.apply .ticks li::marker{color:var(--terra)}
.apply-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.apply-cta{font-family:inherit;font-size:16px;font-weight:700;border-radius:10px;padding:12px 18px;border:2px solid var(--cream);cursor:pointer}
.apply-cta.approve{background:var(--cream);color:var(--forest)}.apply-cta.hold{background:transparent;color:var(--cream)}
.apply-cta.is-active{outline:3px solid var(--terra);outline-offset:2px}
.you-decided{min-height:1em;margin:10px 0 0;font-size:14px}
.apply .cmt-btn{border-color:var(--cream);color:var(--cream)}.apply .cmt-item{color:var(--ink)}
.foot{color:var(--faint);font-size:13px;padding:18px 0 40px}
.cmt-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px;z-index:50}
.cmt-modal.open{display:flex}
.cmt-modal-card{background:#fff;border-radius:var(--r);padding:18px;width:100%;max-width:480px}
.cmt-modal-card h3{margin:0 0 4px;color:var(--forest)}.ctx{font-size:13px;color:var(--faint);margin:0 0 10px}
.cmt-row{margin-bottom:10px}.cmt-row label{display:block;font-size:13px;color:var(--soft);margin-bottom:4px}
.cmt-row input,.cmt-row textarea{width:100%;font-family:inherit;font-size:16px;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.cmt-row textarea{min-height:110px}
.cmt-actions{display:flex;gap:8px}.cmt-submit{background:var(--forest);color:#fff;border:0;border-radius:8px;padding:9px 18px;font-family:inherit;font-weight:700;cursor:pointer}
.cmt-cancel{background:none;border:1px solid var(--line);border-radius:8px;padding:9px 18px;font-family:inherit;cursor:pointer}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:10px;padding:10px 16px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .2s;z-index:60;max-width:calc(100% - 32px)}
.toast.show{opacity:1}
@media print{.section-discuss,.cmt-modal,.toast,.apply-row{display:none!important}.card{break-inside:avoid}}
"""

JS = """
let fbReady=false,toastTimer=null;const stateDecisions={},stateComments={};const NAME_KEY="basseqat-ads-v4-reviewer-name";
function getName(){try{return localStorage.getItem(NAME_KEY)||""}catch(e){return window.__awName||""}}
function setName(n){try{localStorage.setItem(NAME_KEY,n)}catch(e){window.__awName=n}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]))}
window.addEventListener("aw-fb-ready",()=>{fbReady=true;initSync()});
function initSync(){const fb=window.AW_FB;if(!fb)return;
 fb.onSnapshot(fb.collection(fb.db,"adApprovalFeedback",fb.DECK_SLUG,"decisions"),snap=>{Object.keys(stateDecisions).forEach(k=>delete stateDecisions[k]);snap.forEach(d=>{stateDecisions[d.id]=d.data()});renderDecisions()},err=>console.error("decisions",err));
 fb.onSnapshot(fb.query(fb.collection(fb.db,"adApprovalFeedback",fb.DECK_SLUG,"comments"),fb.orderBy("createdAt","asc")),snap=>{Object.keys(stateComments).forEach(k=>delete stateComments[k]);snap.forEach(d=>{const x=d.data();(stateComments[x.sectionId]=stateComments[x.sectionId]||[]).push({id:d.id,...x})});document.querySelectorAll("[data-cmt-list]").forEach(el=>renderComments(el.dataset.cmtList))},err=>console.error("comments",err));}
function fmt(ts){const t=ts&&ts.toDate?ts.toDate():new Date();return t.toLocaleString("ar-EG",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"long",numberingSystem:"latn"})}
function renderDecisions(){document.querySelectorAll(".ap-radio").forEach(r=>r.classList.remove("selected"));
 Object.entries(stateDecisions).forEach(([k,d])=>{document.querySelectorAll('.ap-radio[data-item="'+CSS.escape(k)+'"][data-decision="'+CSS.escape(String(d.decision))+'"]').forEach(r=>r.classList.add("selected"))});
 const a=document.getElementById("cta-approve-all"),h=document.getElementById("cta-hold-all"),b=document.getElementById("you-decided");a.classList.remove("is-active");h.classList.remove("is-active");
 const all=stateDecisions["apply-all"];if(!all){b.textContent="";return}
 (all.decision==="approve"?a:h).classList.add("is-active");
 b.textContent="اتسجل: "+(all.decision==="approve"?"موافقين على البدايل":"عايزين نتكلم الأول")+"، "+(all.name||"")+"، "+fmt(all.updatedAt);}
async function submitItemDecision(itemKey,decision,label){if(!fbReady){showToast("لسه بيتصل، جرب كمان ثانية.");return}
 let name=getName();if(!name){name=(prompt("اسمك (هيتسجل مرة واحدة):")||"").trim();if(!name){showToast("اكتب اسمك الأول.");return}setName(name)}
 const fb=window.AW_FB;try{await fb.setDoc(fb.doc(fb.db,"adApprovalFeedback",fb.DECK_SLUG,"decisions",itemKey),{decision,name,updatedAt:fb.serverTimestamp()});showToast("اتسجل: "+label)}catch(e){console.error(e);showToast("ماتسجلش، جرب تاني.")}}
window.submitItemDecision=submitItemDecision;
document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll(".ap-radio").forEach(l=>l.addEventListener("click",async e=>{e.preventDefault();const it=l.dataset.item;document.querySelectorAll('.ap-radio[data-item="'+CSS.escape(it)+'"]').forEach(r=>r.classList.remove("selected"));l.classList.add("selected");await submitItemDecision(it,l.dataset.decision,l.textContent.trim())}))});
let activeKey=null,activeLabel="";
function openCmtModal(k,label){activeKey=k;activeLabel=label;document.getElementById("cmt-modal-ctx").textContent="على: "+label;const has=getName();document.getElementById("cmt-name-row").style.display=has?"none":"block";document.getElementById("cmt-text-input").value="";document.getElementById("cmt-modal").classList.add("open");setTimeout(()=>document.getElementById(has?"cmt-text-input":"cmt-name-input").focus(),50)}
function closeCmtModal(){document.getElementById("cmt-modal").classList.remove("open");activeKey=null}
async function submitComment(){let name=getName();if(!name){name=(document.getElementById("cmt-name-input").value||"").trim();if(!name){showToast("اكتب اسمك الأول.");return}setName(name)}
 const text=(document.getElementById("cmt-text-input").value||"").trim();if(!text){showToast("التعليق فاضي.");return}if(!fbReady){showToast("لسه بيتصل، جرب كمان ثانية.");return}
 const fb=window.AW_FB;try{await fb.addDoc(fb.collection(fb.db,"adApprovalFeedback",fb.DECK_SLUG,"comments"),{sectionId:activeKey,sectionLabel:activeLabel,name,text,createdAt:fb.serverTimestamp()});closeCmtModal();showToast("التعليق وصل لفريق Admireworks.")}catch(e){console.error(e);showToast("ماتسجلش، جرب تاني.")}}
function renderComments(k){const el=document.querySelector('[data-cmt-list="'+k+'"]');if(!el)return;const list=stateComments[k]||[];
 el.innerHTML=list.map(c=>'<div class="cmt-item"><span class="cmt-author">'+escapeHtml(c.name)+'</span>'+escapeHtml(c.text)+'<span class="cmt-time">'+escapeHtml(fmt(c.createdAt))+'</span></div>').join("")}
window.openCmtModal=openCmtModal;window.closeCmtModal=closeCmtModal;window.submitComment=submitComment;
function showToast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
document.getElementById("cmt-modal").addEventListener("click",e=>{if(e.target.id==="cmt-modal")closeCmtModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCmtModal()});
"""

if __name__ == "__main__":
    out = page()
    if EM_DASH in out:
        raise SystemExit("em dash in the rendered page")
    (WAVE / "review.html").write_text(out, encoding="utf-8")
    print(f"wrote review.html ({len(out.encode()) // 1024} KB)")
