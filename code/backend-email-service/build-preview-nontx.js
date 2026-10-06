// Renders every NON-TRANSACTIONAL use-case as a PAIR — the push notification and
// the email side by side — with realistic sample data, exactly as each lands.
// No transactional, no agent (out of scope). Push + email only, non-transactional.
const fs = require('fs');
const { setAssetMode } = require('./templates/layout.js');
// Inline logo + social PNGs as base64 so they render in a browser preview
// (real sends use cid: inline attachments; a browser can't resolve cid:).
setAssetMode('datauri');
const { templates } = require('./templates/templates.js');
const { pushTemplates } = require('./templates/pushTemplates.js');

// [ label, note, emailKey, pushKey ] — grouped by lifecycle stage.
const GROUPS = [
  ['Acquisition & activation', [
    ['First-pickup nudge', 'Signed up but no pickup yet — the #1 activation lever.', 'FIRST_PICKUP_NUDGE', 'FIRST_PICKUP_NUDGE'],
    ['Service area live', 'Pickups just launched near the user — expansion + activation.', 'SERVICE_AREA_LIVE', 'SERVICE_AREA_LIVE'],
    ['First pickup done', 'One-time celebration after the first completed pickup.', 'FIRST_PICKUP_DONE', 'FIRST_PICKUP_DONE'],
  ]],
  ['Growth', [
    ['Referral invite', 'Promotional "invite a friend, both earn" — the growth loop.', 'REFERRAL_INVITE', 'REFERRAL_NUDGE'],
  ]],
  ['Engagement & habit', [
    ['Daily eco-quiz', 'Play to earn coins; resets nightly.', 'DAILY_QUIZ', 'DAILY_QUIZ_REMINDER'],
    ['Quiz streak at risk', "Haven't played today — protect the streak.", 'QUIZ_STREAK_REMINDER', 'STREAK_AT_RISK'],
    ['Streak milestone', 'Crossed a streak milestone (3/7/14/30…).', 'STREAK_MILESTONE', 'STREAK_MILESTONE'],
    ['Tier upgrade', 'Reached a new streak tier — each coin worth more.', 'TIER_UPGRADE', 'TIER_UPGRADE'],
  ]],
  ['Rewards & monetization', [
    ['Rewards ready to redeem', 'Balance is redeemable — nudge to cash out.', 'REDEMPTION_LIVE', 'REDEMPTION_READY'],
    ['Coins expiring', 'Only when a coin-expiry policy is enabled.', 'COINS_EXPIRING', 'COINS_EXPIRING'],
    ['Limited-time offer', 'Time-bound promo / bonus-coins campaign.', 'LIMITED_OFFER', 'LIMITED_OFFER'],
  ]],
  ['Sustainability & impact', [
    ['Carbon footprint invite', 'Never calculated a footprint — discover the feature.', 'CARBON_FOOTPRINT_INVITE', 'CARBON_FOOTPRINT_INVITE'],
    ['Monthly carbon check-in', 'Latest assessment is 30+ days old — retake to track progress.', 'CARBON_FOOTPRINT_CHECKIN', 'CARBON_FOOTPRINT_CHECKIN'],
    ['Lifetime impact milestone', 'Cumulative achievement — total kg recovered, CO₂ saved.', 'IMPACT_MILESTONE', 'IMPACT_MILESTONE'],
    ['Monthly impact report', 'Once-a-month recap of the user’s recycling impact.', 'IMPACT_REPORT', 'IMPACT_REPORT'],
    ['Monthly newsletter', 'Sustainability stories from the Knowledge Hub.', 'NEWSLETTER', 'NEWSLETTER'],
  ]],
  ['Product & retention', [
    ['Feature announcement', 'Per-campaign product / feature launch.', 'FEATURE_ANNOUNCEMENT', 'FEATURE_ANNOUNCEMENT'],
    ['Win-back', 'Re-engagement for lapsed users.', 'WIN_BACK', 'WIN_BACK'],
  ]],
  ['Relationship & trust', [
    ['Seasonal greeting', 'Festival wishes (Happy Diwali, Eid Mubarak…).', 'SEASONAL_GREETING', 'SEASONAL_GREETING'],
    ['Birthday', 'With or without a birthday coin gift.', 'BIRTHDAY', 'BIRTHDAY'],
    ['Feedback survey', 'NPS / product feedback request.', 'FEEDBACK_SURVEY', 'FEEDBACK_SURVEY'],
  ]],
];

// Preview-only inline placeholder for a Knowledge Hub article photo. The artifact
// CSP blocks external images, so the real hosted photo can't render in-browser;
// this data-URI SVG keeps the newsletter layout intact and honest ("loads in the
// live email"). Not used in production — the real template renders the real URL.
const phBanner = (color, category) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='536' height='210'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${color}'/><stop offset='1' stop-color='#0c1a12'/></linearGradient></defs>
    <rect width='536' height='210' fill='url(#g)'/>
    <g transform='translate(268,72)' fill='none' stroke='#ffffff' stroke-opacity='0.92' stroke-width='4' stroke-linejoin='round'>
      <rect x='-28' y='-14' width='56' height='40' rx='7'/><circle cx='0' cy='8' r='11'/><rect x='-17' y='-23' width='19' height='11' rx='3'/>
    </g>
    <text x='268' y='150' font-family='Arial, sans-serif' font-size='15' font-weight='700' fill='#ffffff' text-anchor='middle'>${category} · article photo</text>
    <text x='268' y='176' font-family='Arial, sans-serif' font-size='12' fill='#ffffff' fill-opacity='0.85' text-anchor='middle'>Actual Knowledge Hub photo loads in the live email</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const sample = {
  name: 'Priya', coins: 4055, streak: 7, tier: 'Gold', amount: 1200, date: '12 Oct 2025',
  month: 'September', occasion: 'happy diwali', xp: 320, minRedeem: 1000,
  balance: 6170, coinsSpent: 1500, pickups: 6, kg: 12, joinedThisMonth: false, bonus: 500,
  eligible: true, area: 'DLF Cyber City', code: 'PRIYA500', co2: 38, endDate: '30 Sep',
  surveyUrl: '#', city: 'Gurugram', lastKg: 184, lastDate: '28 Sep 2026',
  // Real Knowledge Hub articles (from src/data/articles.ts): real ids so "Read more"
  // deep-links to /ArticleDetail?id=<id>. The `image` field carries the article's
  // real hosted photo URL in production (commented per row); for THIS browser preview
  // the artifact CSP blocks external images and the sandbox can't reach Wikimedia, so
  // each `image` is swapped to an inline placeholder banner (see phBanner) — the live
  // email uses the real URL and renders the actual app photo.
  articles: [
    // real: https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Photograph_of_public-waste_segregation_bins%2C_Amritsar%2C_Punjab%2C_India%2C_8_April_2023.jpg/960px-...jpg
    { id: 'segregation-at-home', title: 'Why segregating waste at home matters more than you think', category: 'GUIDE', readTime: '4 min read', intro: 'One wet tea bag can ruin an entire bag of recyclable paper. Segregation is the single highest-impact habit in recycling — and it takes less than a minute a day.', image: phBanner('#16a34a', 'GUIDE') },
    // real: https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ewaste-pile.jpg/960px-Ewaste-pile.jpg
    { id: 'india-ewaste', title: 'India’s e-waste mountain — and the opportunity inside it', category: 'TECHNOLOGY', readTime: '5 min read', intro: 'India is the world’s third-largest producer of electronic waste — yet only about one-third of it is ever formally recycled.', image: phBanner('#7c3aed', 'TECHNOLOGY') },
    // real: https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Plastic_bottles_for_recycling.jpg/960px-...jpg
    { id: 'cut-plastic-at-home', title: '5 easy ways to cut plastic waste at home', category: 'LIFESTYLE', readTime: '3 min read', intro: 'A plastic bottle can take up to 450 years to break down. The good news: most household plastic is avoidable, and what remains is highly recyclable.', image: phBanner('#0284c7', 'LIFESTYLE') },
  ],
  benefits: ['Live pickup tracking', 'Instant coin credit'],
  title: 'Live pickup tracking', body: 'Follow your pickup partner on the map in real time.', ctaLabel: 'Try it now', ctaUrl: '#',
  unsubscribeUrl: '',
};

const attrEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const htmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pushCard = (key) => {
  const r = pushTemplates[key](sample);
  return `<div class="notif">
    <div class="nhead"><span class="nicon">K</span><span class="napp">KarmaVer$e</span><span class="ndot">•</span><span class="ntime">now</span></div>
    <div class="ntitle">${htmlEsc(r.title)}</div>
    <div class="nbody">${htmlEsc(r.body)}</div>
    <div class="nmeta"><span class="nk">${htmlEsc(key)}</span> &rarr; ${htmlEsc(r.data.route)}</div>
  </div>`;
};

const emailFrame = (key) => {
  const r = templates[key](sample);
  return `<div class="mailwrap">
    <div class="msubj"><span class="mk">${htmlEsc(key)}</span><span class="mst">${htmlEsc(r.subject)}</span></div>
    <iframe class="mframe" sandbox="allow-same-origin" srcdoc="${attrEsc(r.html)}" loading="lazy"></iframe>
  </div>`;
};

const caseBlock = ([label, note, emailKey, pushKey]) => `<div class="case">
  <div class="chead"><span class="cname">${htmlEsc(label)}</span><span class="cnote">${htmlEsc(note)}</span></div>
  <div class="pair">
    <div class="col col-push"><div class="collabel">Push notification</div>${pushCard(pushKey)}</div>
    <div class="col col-mail"><div class="collabel">Email</div>${emailFrame(emailKey)}</div>
  </div>
</div>`;

const groupBlock = ([name, cases]) => `<section class="group">
  <h2>${htmlEsc(name)} <span class="pill">${cases.length}</span></h2>
  ${cases.map(caseBlock).join('\n')}
</section>`;

const total = GROUPS.reduce((n, [, c]) => n + c.length, 0);

const page = `<title>Non-Transactional Mailers</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root{--bg:#f3f7f4;--surface:#fff;--surface-2:#eef3ee;--ink:#122019;--muted:#566b5f;--faint:#7c8f84;--accent:#16a34a;--accent-deep:#15803d;--nt:#b45309;--nt-soft:#fbe7d2;--line:#e0e7e1;--shadow:0 1px 2px rgba(18,32,25,.05),0 10px 26px rgba(18,32,25,.07);}
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--nt:#e0a45a;--nt-soft:#2a2013;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}}
  :root[data-theme="dark"]{--bg:#0c130f;--surface:#131c17;--surface-2:#182219;--ink:#e7f0ea;--muted:#9baba0;--faint:#7b8c81;--accent:#37c46e;--accent-deep:#2fae61;--nt:#e0a45a;--nt-soft:#2a2013;--line:#233029;--shadow:0 1px 2px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.32);}
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans",system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1100px;margin:0 auto;padding:clamp(24px,5vw,54px) clamp(16px,4vw,36px) 90px;}
  .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--accent-deep);}
  h1{font-family:"Sora",sans-serif;font-weight:800;font-size:clamp(27px,5.5vw,40px);letter-spacing:-.02em;margin:10px 0 10px;}
  .lede{color:var(--muted);max-width:74ch;margin:0 0 8px;font-size:16px;}
  .note{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:9px 14px;border-radius:12px;background:var(--nt-soft);color:var(--nt);font-size:13px;font-weight:600;}
  .group{margin-top:14px;}
  h2{font-family:"Sora",sans-serif;font-weight:700;font-size:20px;margin:44px 0 14px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:26px;}
  .group:first-of-type h2{border-top:0;padding-top:0;}
  .pill{font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--surface-2);color:var(--accent-deep);}

  .case{background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:16px 18px;margin:0 0 16px;}
  .chead{margin:0 0 12px;}
  .cname{font-family:"Sora",sans-serif;font-weight:700;font-size:16px;color:var(--ink);display:block;}
  .cnote{font-size:13px;color:var(--faint);}
  .pair{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start;}
  @media (max-width:720px){.pair{grid-template-columns:1fr;}}
  .col{min-width:0;}
  .collabel{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 7px;}

  .notif{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:13px 15px;}
  .nhead{display:flex;align-items:center;gap:7px;margin-bottom:7px;font-size:12px;color:var(--faint);}
  .nicon{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fde68a,#fbbf24 46%,#f59e0b);color:#3b2a00;font-weight:800;font-size:12px;display:grid;place-items:center;font-family:"Sora",sans-serif;}
  .napp{font-weight:700;color:var(--muted);}.ndot{color:var(--faint);}.ntime{margin-left:auto;}
  .ntitle{font-weight:700;font-size:15px;color:var(--ink);}
  .nbody{font-size:13.5px;color:var(--muted);margin-top:2px;}
  .nmeta{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--faint);margin-top:9px;padding-top:8px;border-top:1px solid var(--line);}
  .nk{color:var(--accent-deep);font-weight:600;}

  .mailwrap{border:1px solid var(--line);border-radius:14px;overflow:hidden;}
  .msubj{padding:11px 14px;border-bottom:1px solid var(--line);background:var(--surface-2);}
  .mk{display:block;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--accent-deep);font-weight:600;margin-bottom:3px;}
  .mst{font-weight:700;font-size:14px;color:var(--ink);}
  .mframe{width:100%;border:0;display:block;background:#fff;}
  footer{margin-top:50px;padding-top:20px;border-top:1px solid var(--line);font-size:12.5px;color:var(--faint);font-family:"IBM Plex Mono",monospace;}
</style>
<div class="wrap">
  <div class="eyebrow">KarmaVer$e · Rendered preview</div>
  <h1>Non-Transactional — Push + Email</h1>
  <p class="lede">Every marketing / engagement use-case for the user persona, rendered with real sample data — the phone push and the inbox email side by side. Each requires a marketing opt-in and carries an <strong>Unsubscribe</strong> link in the email footer.</p>
  <div class="note">Transactional (OTP, booking, payout, redemption) already done &amp; excluded — no unsubscribe there. Agent notifications excluded per scope.</div>

  ${GROUPS.map(groupBlock).join('\n')}

  <footer>KarmaVer$e · ${total} non-transactional use-cases · push + email each · rendered with sample data</footer>
</div>
<script>
  function fit(f){ try{ var h=f.contentWindow.document.body.scrollHeight; f.style.height=(h+24)+'px'; }catch(e){ f.style.height='560px'; } }
  document.querySelectorAll('iframe.mframe').forEach(function(f){ f.addEventListener('load',function(){fit(f);}); setTimeout(function(){fit(f);},350); });
  window.addEventListener('resize', function(){ document.querySelectorAll('iframe.mframe').forEach(fit); });
</script>`;

fs.writeFileSync(process.argv[2], page);
console.log('wrote', process.argv[2], '(' + page.length + ' chars,', total, 'use-cases)');
