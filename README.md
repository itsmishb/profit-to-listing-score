# Profit-to-Listing Score (PLS)

A free, private, **client-side-only** tool that scores a print-on-demand / Etsy / Shopify
product listing on **profit and listing quality** in one number (0–100), and shows the
top-3 gaps to fix.

- **No backend, no API, no LLM, no login.** All scoring runs in your browser.
- You paste your **own** listing — nothing is scraped and nothing is sent to a server.
- Host the folder on any static host for $0 (Cloudflare, GitHub Pages, Netlify).

**Live:** https://plant-listing.ycdit.workers.dev/

## What it scores

Profit margin · platform fees · price band · title · tags · description · FAQ ·
differentiation · sales-page completeness — weighted into a single 0–100 score, plus the
three weakest areas to fix first.

## Run locally

```
python3 -m http.server 8080   # then open http://localhost:8080
```

No build step and no dependencies.

## Files

- `index.html` — the tool
- `tool.js` — the scoring engine (pure client-side JavaScript)
- `styles.css`
- `embed.js` — one-line embeddable widget
- `sample.html`, `pages/` — example and landing pages
- `sitemap.xml`, `robots.txt`

## Embed on your own site

```html
<script src="https://YOURDOMAIN/embed.js" data-keyword="your niche apparel"></script>
```

## Analytics (optional, off by default)

Each page has a commented [GoatCounter](https://www.goatcounter.com/) snippet just before
`</footer>`. Uncomment it and set your own code to collect privacy-friendly, cookie-less
analytics. It is disabled by default, so nothing is tracked out of the box.

## License

[MIT](LICENSE). Scores are guidance, not a sales guarantee.
