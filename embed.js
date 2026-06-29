/* Embeddable PLS widget loader.
 * Any blog/site can add:  <script src="https://plant-listing.ycdit.workers.dev/embed.js" data-keyword="plant lover apparel"></script>
 * It injects a compact iframe-free widget + a "Powered by Profit-to-Listing Score" backlink.
 * The backlink is how this channel compounds (distribution + SEO), with zero human posting.
 */
(function(){
  "use strict";
  var me = document.currentScript;
  var kw = (me && me.getAttribute("data-keyword")) || "your niche apparel";
  var origin = "https://plant-listing.ycdit.workers.dev/";
  var mount = document.createElement("div");
  mount.id = "pls-app";
  mount.setAttribute("data-keyword", kw);
  mount.setAttribute("data-pack-url", origin);
  mount.setAttribute("data-sample-url", origin + "sample.html");

  var wrap = document.createElement("div");
  wrap.style.cssText = "max-width:680px;margin:16px auto;font-family:-apple-system,Segoe UI,Roboto,sans-serif";
  wrap.appendChild(mount);

  var credit = document.createElement("div");
  credit.style.cssText = "font-size:12px;text-align:right;margin-top:6px";
  credit.innerHTML = 'Powered by <a href="'+origin+'" target="_blank" rel="noopener">Profit-to-Listing Score</a> — free POD listing scorer';
  wrap.appendChild(credit);

  if(me && me.parentNode) me.parentNode.insertBefore(wrap, me);

  var css = document.createElement("link");
  css.rel="stylesheet"; css.href=origin+"styles.css"; document.head.appendChild(css);
  var js = document.createElement("script");
  js.src = origin+"tool.js"; document.body.appendChild(js);
})();
