# 3R ZeroWaste — website

The 3R ZeroWaste marketing site, built from the "3R ZeroWaste Website" design (home page + blog). Plain HTML, CSS and JavaScript: no framework, no build step.

| File | Page |
|---|---|
| `index.html` | Home: hero, vision, impact console, solutions, how 3R works, KarmaVerse, technology, case studies, why 3R, team, journey, blog teaser, live events, partners, contact |
| `blog.html` | Insights & Blog: category filter, featured post, article grid, newsletter |
| `assets/css/site.css`, `assets/css/blog.css` | Styles, taken from the design (fixes at the end of `site.css`) |
| `assets/js/site.js` | Sticky nav + scroll progress, active-section highlight, mobile menu, live events calendar with countdown, Upcoming/Past tabs, impact count-up, card tilt / magnetic buttons, KarmaVerse buddy |
| `assets/js/blog.js` | Category filter and article count |
| `assets/img/` | Logo, team portraits, KarmaVerse mascot, app screenshots |

## Run it locally

```bash
cd website
python3 -m http.server 8000
# open http://localhost:8000
```

Any static host works (Netlify, Vercel, GitHub Pages, S3, cPanel): upload the `website/` folder as is.

## Updating content

- **Events calendar**: edit the `CAL` list in the events section of `assets/js/site.js`. Dates are IST; past events drop off on their own, and the next one gets the countdown.
- **Impact numbers** (260+ clients, 310+ industries, 32+ RWAs, 35+ schools): change both the number and its `data-count` in `index.html`.
- **Blog posts**: replace `POSTS` in `assets/js/blog.js` (and the `[Article title]` placeholders in `blog.html`).

## Still to fill in (placeholders from the design)

- Case studies, 3R/KarmaVerse events, blog articles: `[ ... ]` fields await approved content.
- Partner logos: the 7 partners are listed; add their logo files to `assets/img/partners/` (see the README there).
- Hero video `hero-earth-loop.mp4` (the "Video slot" tag marks where it goes).
- Newsletter form and "Load more articles" are not wired to a backend yet.
- The second row of impact metrics shows `[ — ]` until the numbers are verified.
