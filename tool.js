/* Profit-to-Listing Score (PLS)
 * Client-side only. No backend ($0 to host). Input-driven: the seller pastes their OWN
 * listing — we never scrape any platform, so this stays TOS-safe.
 *
 * The tool renders into <div id="pls-app" data-...></div>. SEO landing pages set
 * data attributes to vary the headline / default platform / niche keyword, so the SAME
 * engine powers many indexable pages (programmatic SEO) without duplicate-thin content.
 */
(function () {
  "use strict";

  // ---- niche price band (plant-lover apparel retail, USD). Used by the price-band sub-score.
  var NICHE = { name: "plant lover apparel", low: 19.99, high: 29.99 };

  // ---- platform fee models (approximate, transparent, editable).
  var PLATFORMS = {
    etsy:    { label: "Etsy",    pct: 0.065 + 0.03, flat: 0.25, listing: 0.20 }, // txn + payment + payment-flat + listing
    shopify: { label: "Shopify", pct: 0.029,        flat: 0.30, listing: 0.00 },
    amazon:  { label: "Amazon",  pct: 0.15,         flat: 0.00, listing: 0.00 }
  };

  // ---- words that signal a generic / low-differentiation listing (we want MORE than these).
  var GENERIC = ["shirt","tee","t-shirt","gift","cute","funny","cool","nice","great","best","quality","comfortable","soft"];
  // ---- benefit / structure signals we reward in a description.
  var BENEFIT = ["gift","unisex","soft","cotton","fit","true to size","care","wash","material","size chart","sizing","print","durable","present","birthday"];
  // ---- sections we look for (scannability / completeness).
  var SECTIONS = ["material","size","care","shipping","gift","fit"];

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function pct(n){ return Math.round(n * 100); }
  function esc(s){ return (s||"").replace(/[&<>"]/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }

  // ---------- financial ----------
  function calcMargin(cost, price, shipCost, platformKey){
    var p = PLATFORMS[platformKey] || PLATFORMS.etsy;
    var fees = price * p.pct + p.flat + p.listing;
    var profit = price - cost - shipCost - fees;
    var margin = price > 0 ? profit / price : 0;
    return { fees: fees, profit: profit, margin: margin, model: p };
  }
  // margin 40%+ => 100; 0% => 0 (linear, clamped)
  function scoreMargin(margin){ return clamp(Math.round((margin / 0.40) * 100), 0, 100); }
  function scoreFees(fees, price){
    if(price <= 0) return 0;
    var ratio = fees / price;            // lower is better; <12% => 100, >35% => 0
    return clamp(Math.round((0.35 - ratio) / (0.35 - 0.12) * 100), 0, 100);
  }
  function scorePriceBand(price){
    if(price >= NICHE.low && price <= NICHE.high) return 100;
    if(price <= 0) return 0;
    var d = price < NICHE.low ? (NICHE.low - price)/NICHE.low : (price - NICHE.high)/NICHE.high;
    return clamp(Math.round(100 - d*180), 0, 100);
  }

  // ---------- listing text ----------
  function scoreTitle(title){
    title = (title||"").trim();
    if(!title) return 0;
    var len = title.length;
    var sLen = clamp(Math.round(len / 140 * 100), 0, 100);     // use the full 140 chars
    var commas = (title.match(/,/g)||[]).length;
    var sLong = clamp(commas * 22, 0, 100);                     // long-tail phrases separated by commas
    var allcaps = title === title.toUpperCase() && /[A-Z]/.test(title);
    var sCase = allcaps ? 30 : 100;
    var frontKw = /^[a-z0-9]/i.test(title) ? 100 : 70;         // starts with a keyword, not punctuation
    return Math.round(sLen*0.45 + sLong*0.3 + sCase*0.15 + frontKw*0.10);
  }
  function scoreTags(tagsRaw){
    var tags = (tagsRaw||"").split(/[,\n]/).map(function(t){return t.trim();}).filter(Boolean);
    if(!tags.length) return 0;
    var sCount = clamp(Math.round(tags.length / 13 * 100), 0, 100); // 13 tag slots
    var multi = tags.filter(function(t){return t.indexOf(" ")>-1;}).length;
    var sMulti = clamp(Math.round(multi / Math.max(tags.length,1) * 100), 0, 100);
    var over = tags.filter(function(t){return t.length>20;}).length;  // Etsy: 20 char max/tag
    var sChar = clamp(100 - over*25, 0, 100);
    return Math.round(sCount*0.5 + sMulti*0.3 + sChar*0.2);
  }
  function scoreDescription(desc){
    desc = (desc||"").trim();
    if(!desc) return 0;
    var len = desc.length;
    var sLen = clamp(Math.round(len / 600 * 100), 0, 100);     // ~600 chars = solid
    var lines = (desc.match(/\n/g)||[]).length;
    var bullets = (desc.match(/(^|\n)\s*[-•*•]/g)||[]).length;
    var sScan = clamp((lines*8) + (bullets*16), 0, 100);
    var low = desc.toLowerCase();
    var sec = SECTIONS.filter(function(w){return low.indexOf(w)>-1;}).length;
    var sSec = clamp(Math.round(sec / SECTIONS.length * 100), 0, 100);
    var ben = BENEFIT.filter(function(w){return low.indexOf(w)>-1;}).length;
    var sBen = clamp(ben*18, 0, 100);
    return Math.round(sLen*0.3 + sScan*0.25 + sSec*0.25 + sBen*0.2);
  }
  function scoreFAQ(desc){
    var low = (desc||"").toLowerCase();
    var has = /faq|frequently asked|q:|q\)|question/.test(low);
    return has ? 100 : 0;
  }
  function scoreDifferentiation(title, desc){
    var text = ((title||"") + " " + (desc||"")).toLowerCase();
    var words = text.split(/[^a-z']+/).filter(function(w){return w.length>3;});
    if(!words.length) return 0;
    var uniq = {}; words.forEach(function(w){uniq[w]=1;});
    var uniqCount = Object.keys(uniq).length;
    var genericHits = GENERIC.filter(function(w){return text.indexOf(w)>-1;}).length;
    var sUniq = clamp(uniqCount*6, 0, 100);                    // richer vocabulary
    var sGeneric = clamp(100 - genericHits*16, 0, 100);        // penalize generic-only copy
    return Math.round(sUniq*0.55 + sGeneric*0.45);
  }
  function scoreSalesPage(photos, hasSizeChart, hasVideo){
    var sPhotos = clamp(Math.round(photos / 8 * 100), 0, 100); // Etsy allows 10; 8+ is strong
    var sChart = hasSizeChart ? 100 : 0;
    var sVideo = hasVideo ? 100 : 40;
    return Math.round(sPhotos*0.6 + sChart*0.25 + sVideo*0.15);
  }

  // ---------- orchestration ----------
  var WEIGHTS = {
    margin:0.16, fees:0.08, priceBand:0.08, title:0.16, tags:0.14,
    description:0.16, faq:0.05, differentiation:0.10, salesPage:0.07
  };
  var LABELS = {
    margin:"Profit margin", fees:"Fees", priceBand:"Price band",
    title:"Title", tags:"Tags", description:"Description",
    faq:"FAQ", differentiation:"Differentiation", salesPage:"Sales page"
  };
  var GAP_FIX = {
    margin:"Margin is too thin. Revisit price, item cost or shipping, or raise the price with a stronger value pitch.",
    fees:"Fees eat too much. Absorb them in your price or rethink shipping terms.",
    priceBand:"Your price is outside the typical "+NICHE.name+" band ($"+NICHE.low+"–$"+NICHE.high+").",
    title:"Weak title. Use the full 140 chars, lead with your main keyword, add long-tail phrases separated by commas.",
    tags:"Not enough tags. Fill all 13 slots, favor multi-word tags, keep each ≤20 chars.",
    description:"Weak description. Use bullets for material / size / care / gift use so it's scannable.",
    faq:"No FAQ. Add 3–5 likely questions on sizing, shipping and care to cut drop-off.",
    differentiation:"Copy is too generic. Differentiate with niche-specific phrasing (e.g. \"plant mom\").",
    salesPage:"Weak sales page. Add 8+ photos, a size chart, and a short video."
  };

  function compute(v){
    var fin = calcMargin(v.cost, v.price, v.ship, v.platform);
    var s = {
      margin: scoreMargin(fin.margin),
      fees: scoreFees(fin.fees, v.price),
      priceBand: scorePriceBand(v.price),
      title: scoreTitle(v.title),
      tags: scoreTags(v.tags),
      description: scoreDescription(v.desc),
      faq: scoreFAQ(v.desc),
      differentiation: scoreDifferentiation(v.title, v.desc),
      salesPage: scoreSalesPage(v.photos, v.sizeChart, v.video)
    };
    var total = 0;
    Object.keys(WEIGHTS).forEach(function(k){ total += s[k]*WEIGHTS[k]; });
    total = Math.round(total);
    // top-3 lowest sub-scores = the gaps to fix
    var gaps = Object.keys(s).sort(function(a,b){return s[a]-s[b];}).slice(0,3);
    return { sub:s, total:total, fin:fin, gaps:gaps };
  }

  // ---------- tiny privacy-light event log (counts only; for the seller's own KPI) ----------
  function logEvent(name){
    try {
      var k = "pls_events";
      var ev = JSON.parse(localStorage.getItem(k) || "{}");
      ev[name] = (ev[name]||0) + 1;
      localStorage.setItem(k, JSON.stringify(ev));
    } catch(e){}
    if (window.plsAnalytics) try { window.plsAnalytics(name); } catch(e){}
  }

  // ---------- render ----------
  function render(app){
    var kw = app.getAttribute("data-keyword") || NICHE.name;
    var defPlatform = app.getAttribute("data-platform") || "etsy";
    var packUrl = app.getAttribute("data-pack-url") || "https://ycdit.gumroad.com/l/yfrplc";
    var sampleUrl = app.getAttribute("data-sample-url") || "sample.html";

    app.innerHTML =
      '<div class="card">'+
        '<div class="grid cols2">'+
          '<div><label>Platform</label>'+
            '<select id="pls-platform">'+
              '<option value="etsy">Etsy</option><option value="shopify">Shopify</option><option value="amazon">Amazon</option>'+
            '</select></div>'+
          '<div><label>Price (USD)</label><input id="pls-price" type="number" value="24.99" step="0.01"></div>'+
          '<div><label>Item cost (USD)</label><input id="pls-cost" type="number" value="11.50" step="0.01"></div>'+
          '<div><label>Shipping cost (USD)</label><input id="pls-ship" type="number" value="0" step="0.01"></div>'+
        '</div>'+
        '<label>Title <span class="muted small">(Etsy: 140 chars)</span></label>'+
        '<textarea id="pls-title" placeholder="e.g. Plant Lover Shirt, Plant Mom Tee, Gardening Gift for Her, Botanical Cottagecore T-Shirt"></textarea>'+
        '<label>Tags <span class="muted small">(comma-separated, 13 slots)</span></label>'+
        '<textarea id="pls-tags" placeholder="plant mom shirt, plant lover gift, gardening tee, ..."></textarea>'+
        '<label>Description</label>'+
        '<textarea id="pls-desc" placeholder="Material, size, care, gift use, FAQ — as bullet points"></textarea>'+
        '<div class="grid cols3">'+
          '<div><label>Photos</label><input id="pls-photos" type="number" value="3" min="0" max="10"></div>'+
          '<div><label><input id="pls-chart" type="checkbox" style="width:auto"> Size chart</label></div>'+
          '<div><label><input id="pls-video" type="checkbox" style="width:auto"> Has video</label></div>'+
        '</div>'+
        '<div class="row" style="margin-top:12px"><button class="btn" id="pls-run">Score my listing</button>'+
          '<button class="btn secondary" id="pls-sample">See free sample</button></div>'+
      '</div>'+
      '<div id="pls-out"></div>'+
      '<div class="disclosure">PLS scores only what you paste, in your browser (nothing is sent, nothing is scraped). '+
      'Scores are guidance based on public guidelines and do not guarantee sales.</div>';

    var $ = function(id){ return app.querySelector(id); };
    $("#pls-platform").value = defPlatform;

    $("#pls-sample").addEventListener("click", function(){ logEvent("sample_click"); location.href = sampleUrl; });

    $("#pls-run").addEventListener("click", function(){
      var v = {
        platform: $("#pls-platform").value,
        price: parseFloat($("#pls-price").value)||0,
        cost: parseFloat($("#pls-cost").value)||0,
        ship: parseFloat($("#pls-ship").value)||0,
        title: $("#pls-title").value,
        tags: $("#pls-tags").value,
        desc: $("#pls-desc").value,
        photos: parseInt($("#pls-photos").value)||0,
        sizeChart: $("#pls-chart").checked,
        video: $("#pls-video").checked
      };
      logEvent("tool_run");
      var r = compute(v);

      var subHtml = Object.keys(WEIGHTS).map(function(k){
        return '<div class="item"><span class="lab">'+LABELS[k]+'</span>'+
          '<span class="meter"><i style="width:'+r.sub[k]+'%"></i></span>'+
          '<span class="val kv">'+r.sub[k]+'</span></div>';
      }).join("");

      var gapHtml = r.gaps.map(function(k){
        return '<div class="gap"><b>Gap: '+LABELS[k]+' ('+r.sub[k]+'/100)</b> — '+GAP_FIX[k]+'</div>';
      }).join("");

      var fin = r.fin;
      var color = r.total>=75?"var(--good)":r.total>=50?"var(--warn)":"var(--bad)";

      $("#pls-out").innerHTML =
        '<div class="card">'+
          '<div class="score-ring"><div class="score-big" style="color:'+color+'">'+r.total+'<span class="muted" style="font-size:18px">/100</span></div>'+
          '<div class="small muted">Profit-to-Listing Score<br>'+esc(kw)+'</div></div>'+
          '<div class="grid cols3" style="margin-top:12px">'+
            '<div class="card" style="margin:0"><div class="muted small">Profit / unit</div><div class="kv" style="font-size:20px">$'+fin.profit.toFixed(2)+'</div></div>'+
            '<div class="card" style="margin:0"><div class="muted small">Margin</div><div class="kv" style="font-size:20px">'+pct(fin.margin)+'%</div></div>'+
            '<div class="card" style="margin:0"><div class="muted small">Fees / unit</div><div class="kv" style="font-size:20px">$'+fin.fees.toFixed(2)+'</div></div>'+
          '</div>'+
          '<h3>Sub-scores</h3><div class="sub">'+subHtml+'</div>'+
          '<h3>Top-3 gaps to fix now</h3>'+gapHtml+
          '<div class="cta">'+
            '<b>Fill every gap at once → Inspected Listing CSV Pack ('+esc(NICHE.name)+')</b>'+
            '<p class="small muted" style="margin:6px 0">50 titles, 50 descriptions, tags, FAQ and profit-tier copy — IP/trademark, duplicate and character-count checked. CSV / Markdown / PDF, instant.</p>'+
            '<div class="row"><a class="btn" id="pls-buy" href="'+esc(packUrl)+'">See the pack</a>'+
            '<span class="price">Pay What You Want (min $9 / suggested $19)</span></div>'+
          '</div>'+
        '</div>';
      var buy = $("#pls-buy"); if(buy){ buy.addEventListener("click", function(){ logEvent("gumroad_click_tool"); }); }
      $("#pls-out").scrollIntoView({behavior:"smooth", block:"start"});
    });
  }

  function init(){
    var apps = document.querySelectorAll("#pls-app,[data-pls-app]");
    apps.forEach(render);
  }
  if(document.readyState!=="loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
