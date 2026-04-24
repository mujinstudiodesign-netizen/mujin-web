#!/usr/bin/env node
/**
 * 沐錦空間設計 靜態生成腳本
 *
 * 讀取 content/portfolio/*.json，產出：
 *   - portfolio.html            案例列表頁
 *   - portfolio/[slug].html     每個案例詳情頁
 *   - sitemap.xml               更新 sitemap
 *   - index.html                替換 <!-- PORTFOLIO:START --> ~ <!-- PORTFOLIO:END --> 區塊
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'portfolio');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio');
const SITE_URL = 'https://mujin.tw';

// ---------- utils ----------
const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (s = '') => escapeHtml(s).replace(/\r?\n/g, '<br>');

function readAllCases() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`[build] content/portfolio 不存在，略過`);
    return [];
  }
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
  const cases = files.map(f => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[build] JSON 格式錯誤：${f}`, e.message);
      return null;
    }
  }).filter(Boolean);

  const published = cases.filter(c => c.published !== false);
  published.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return published;
}

// ---------- shared fragments ----------
const SHARED_HEAD_BASIC = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" href="/images/logo-icon.png" type="image/png">
    <link rel="apple-touch-icon" href="/images/logo-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
`;

// 補充預編 styles.css 裡沒有的 Tailwind utilities（案例列表 / 詳情頁使用）
const SUPPLEMENTAL_CSS = `
    <style>
        .aspect-\\[16\\/9\\] { aspect-ratio: 16/9; }
        .aspect-\\[16\\/8\\] { aspect-ratio: 16/8; }
        .p-8 { padding: 2rem; }
        .p-10 { padding: 2.5rem; }
        .p-14 { padding: 3.5rem; }
        .pt-8 { padding-top: 2rem; }
        .pt-32 { padding-top: 8rem; }
        .pb-20 { padding-bottom: 5rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .max-w-xl { max-width: 36rem; }
        .max-w-3xl { max-width: 48rem; }
        .max-w-7xl { max-width: 80rem; }
        .mt-20 { margin-top: 5rem; }
        .mt-16 { margin-top: 4rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .self-center { align-self: center; }
        .flex-grow { flex-grow: 1; }
        .min-h-screen { min-height: 100vh; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        @media (min-width: 768px) {
            .md\\:p-10 { padding: 2.5rem; }
            .md\\:p-12 { padding: 3rem; }
            .md\\:p-14 { padding: 3.5rem; }
            .md\\:aspect-\\[16\\/8\\] { aspect-ratio: 16/8; }
            .md\\:text-5xl { font-size: 3rem; line-height: 1; }
        }
    </style>
`;

const GTM_HEAD = `
    <script>(function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start': new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', 'GTM-T5RTXK6L');</script>
`;

const GTM_NOSCRIPT = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T5RTXK6L" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

const FLOATING_ICONS = `
    <div class="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2">
        <a href="https://www.facebook.com/profile.php?id=61579849735643" target="_blank" rel="noopener noreferrer" title="Facebook" class="float-icon w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-facebook-f text-xl"></i></a>
        <a href="https://www.instagram.com/mujinstudiodesign/" target="_blank" rel="noopener noreferrer" title="Instagram" class="float-icon w-12 h-12 bg-instagram text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-instagram text-xl"></i></a>
        <a href="https://qr-official.line.me/gs/M_153kwalu_GW.png?oat_content=qr" target="_blank" rel="noopener noreferrer" title="Line" class="float-icon w-12 h-12 bg-[#06C755] text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-line text-2xl"></i></a>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdPI2DRVGC1Qtm0VXkKpeF2lWFtzxVMVBO056vxgE2jp5PdsA/viewform" target="_blank" rel="noopener noreferrer" title="線上預約" class="float-icon w-12 h-12 bg-brand-gold text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-solid fa-calendar-check text-xl"></i></a>
    </div>
`;

/**
 * 導覽列；active = 'portfolio' | 'faq' | 'testimonials' | ''
 * basePath = 相對於當前頁面的根路徑（首頁與子頁的連結不同）
 */
const header = (active = '', basePath = '') => {
  const link = (key, href, label) => {
    const activeStyle = active === key
      ? 'text-brand-gold relative group'
      : 'hover:text-brand-500 transition relative group';
    const underline = active === key
      ? `<span class="absolute -bottom-1 left-0 w-full h-px bg-brand-gold"></span>`
      : `<span class="absolute -bottom-1 left-0 w-0 h-px bg-brand-500 transition-all group-hover:w-full"></span>`;
    return `<a href="${basePath}${href}" class="${activeStyle}">${label}${underline}</a>`;
  };

  const mobileLink = (key, href, label) => {
    const cls = active === key
      ? 'block py-2 text-brand-gold font-bold mobile-link'
      : 'block py-2 hover:bg-brand-100 mobile-link';
    return `<a href="${basePath}${href}" class="${cls}">${label}</a>`;
  };

  return `
    <header class="fixed w-full top-0 z-50 bg-brand-50/90 backdrop-blur-md transition-all duration-300 border-b border-brand-300/30" id="navbar">
        <div class="container mx-auto px-6 py-1 flex justify-between items-center">
            <a href="${basePath}index.html" class="flex items-center gap-3 group hover:opacity-80 transition">
                <img src="${basePath}images/mujin-studio-yilan-interior-design-logo.webp" alt="沐錦空間設計 Mujin Studio Logo" width="1182" height="1182" class="h-16 md:h-20 w-auto">
                <div class="flex flex-col justify-center">
                    <span class="font-serif text-xl tracking-widest text-brand-800 font-bold leading-none mb-1">MUJIN</span>
                    <span class="text-sm font-medium tracking-widest text-brand-500 leading-none">沐錦空間設計</span>
                </div>
            </a>
            <nav class="hidden md:flex space-x-12 text-sm tracking-widest font-bold text-brand-800">
                ${link('portfolio', 'portfolio.html', '精選案例')}
                ${link('faq', 'faq.html', '設計解惑')}
                ${link('testimonials', 'testimonials.html', '美好見證')}
            </nav>
            <button id="mobile-menu-btn" class="md:hidden text-brand-800 focus:outline-none"><i class="fa-solid fa-bars text-2xl"></i></button>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-brand-50 border-t border-brand-200 shadow-lg absolute w-full left-0 top-full">
            <div class="px-6 py-4 flex flex-col space-y-4 text-center font-light text-brand-800">
                ${mobileLink('portfolio', 'portfolio.html', '精選案例')}
                ${mobileLink('faq', 'faq.html', '設計解惑')}
                ${mobileLink('testimonials', 'testimonials.html', '美好見證')}
            </div>
        </div>
    </header>
`;
};

const FOOTER = `
    <footer class="bg-brand-900 text-brand-100 py-10 border-t border-brand-800 mt-auto">
        <div class="container mx-auto px-6 text-center md:text-left">
            <p>&copy; <span id="year">2024</span> Mujin Studio. All Rights Reserved.</p>
            <p class="text-xs text-brand-300 mt-2">宜蘭縣冬山鄉冬山路三段465號 | 宜蘭室內設計推薦 | 羅東舊屋翻新</p>
            <p class="text-xs text-brand-300 mt-1">營業時間：週一~週五 09:00~18:00 / 週六 13:00~18:00</p>
        </div>
    </footer>
`;

const COMMON_SCRIPTS = `
    <script>
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const mobileLinks = document.querySelectorAll('.mobile-link');
        btn && btn.addEventListener('click', () => { menu.classList.toggle('hidden'); });
        mobileLinks.forEach(link => link.addEventListener('click', () => menu.classList.add('hidden')));
        document.getElementById('year').textContent = new Date().getFullYear();
    </script>
`;

// ---------- 首頁案例卡片（6 張） ----------
const homePortfolioCards = (cases) => {
  const top6 = cases.slice(0, 6);
  const cards = top6.map(c => `
                <a href="portfolio/${escapeHtml(c.slug)}.html" class="group block">
                    <figure class="cursor-pointer">
                        <div class="relative overflow-hidden aspect-[4/3] mb-4 bg-brand-100">
                            <img src="${escapeHtml(c.cover)}" alt="${escapeHtml(c.coverAlt || c.title)}" width="1200" height="800" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" loading="lazy">
                            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-300"></div>
                        </div>
                        <figcaption>
                            <h4 class="text-lg font-serif text-brand-800 tracking-wider">${escapeHtml(c.title)}</h4>
                            <p class="text-sm text-brand-500 font-light mt-1">${escapeHtml(c.category === 'Commercial' ? 'Commercial Design' : 'Residential Design')}</p>
                        </figcaption>
                    </figure>
                </a>`).join('');

  const viewAll = cases.length > 6 ? `
            <div class="text-center mt-12">
                <a href="portfolio.html" class="inline-block border border-brand-800 text-brand-800 px-8 py-3 text-sm tracking-widest hover:bg-brand-800 hover:text-white transition duration-300">
                    瀏覽所有案例
                </a>
            </div>` : '';

  return `<!-- PORTFOLIO:START -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${cards}
            </div>${viewAll}
            <!-- PORTFOLIO:END -->`;
};

// ---------- 列表頁 ----------
const portfolioListPage = (cases) => {
  const cards = cases.map(c => `
                    <a href="portfolio/${escapeHtml(c.slug)}.html" class="group block">
                        <figure class="cursor-pointer">
                            <div class="relative overflow-hidden aspect-[4/3] mb-4 bg-brand-100">
                                <img src="${escapeHtml(c.cover)}" alt="${escapeHtml(c.coverAlt || c.title)}" width="1200" height="800" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" loading="lazy">
                                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                ${c.type ? `<div class="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-1 tracking-widest">${escapeHtml(c.type)}</div>` : ''}
                            </div>
                            <figcaption>
                                <div class="flex items-center gap-2 text-xs text-brand-500 mb-1">
                                    <span>${escapeHtml(c.location || '')}</span>
                                    ${c.area ? `<span class="text-brand-300">·</span><span>${escapeHtml(c.area)}</span>` : ''}
                                    ${c.year ? `<span class="text-brand-300">·</span><span>${escapeHtml(c.year)}</span>` : ''}
                                </div>
                                <h3 class="text-lg font-serif text-brand-800 tracking-wider group-hover:text-brand-gold transition">${escapeHtml(c.title)}</h3>
                                ${c.summary ? `<p class="text-sm text-brand-500 font-light mt-2 line-clamp-2">${escapeHtml(c.summary)}</p>` : ''}
                            </figcaption>
                        </figure>
                    </a>`).join('');

  const schemaItems = cases.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/portfolio/${c.slug}.html`,
    name: c.title,
    image: `${SITE_URL}${c.cover}`
  }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "沐錦空間設計精選案例",
    description: "宜蘭羅東地區室內設計精選案例，包含舊屋翻新、新屋裝修、商業空間設計。",
    url: `${SITE_URL}/portfolio.html`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: schemaItems
    }
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/portfolio.html" />
    <title>精選案例 | 宜蘭羅東室內設計作品集 | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計精選案例集，宜蘭羅東地區的舊屋翻新、新屋裝修、預售屋客變與商業空間作品。每一案皆量身規劃，打造屬於居住者的空間敘事。">
    <meta name="keywords" content="宜蘭室內設計作品, 羅東室內設計案例, 宜蘭舊屋翻新案例, 宜蘭商業空間設計, 沐錦空間設計作品集">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta property="og:title" content="精選案例 | 沐錦空間設計">
    <meta property="og:description" content="宜蘭羅東地區的室內設計作品集。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/portfolio.html">
    ${cases[0] ? `<meta property="og:image" content="${SITE_URL}${cases[0].cover}">` : ''}
    <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('portfolio')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Portfolio</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">精選案例</h1>
                <div class="w-16 h-px bg-brand-300 mx-auto mt-6"></div>
                <p class="text-brand-500 font-light mt-6 max-w-xl mx-auto leading-loose">每一個案場都是一段與屋主共同完成的對話。從舊屋翻新到預售屋客變，從住宅到商空，我們為每一種生活提供適切的空間敘事。</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                ${cards || '<p class="col-span-full text-center text-brand-500">案例整理中，敬請期待。</p>'}
            </div>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
</body>
</html>`;
};

// ---------- 詳情頁 ----------
const portfolioDetailPage = (c, allCases) => {
  const currentIndex = allCases.findIndex(x => x.slug === c.slug);
  const prev = currentIndex > 0 ? allCases[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < allCases.length - 1 ? allCases[currentIndex + 1] : null;

  const gallery = (c.gallery && c.gallery.length)
    ? c.gallery
    : [{ src: c.cover, alt: c.coverAlt || c.title }];

  const slides = gallery.map(g => `
                                <div class="swiper-slide">
                                    <img src="${escapeHtml(g.src)}" alt="${escapeHtml(g.alt || c.title)}" class="w-full h-full object-cover" loading="lazy">
                                </div>`).join('');

  const thumbs = gallery.slice(1).map(g => `
                <figure class="aspect-[4/3] overflow-hidden bg-brand-100">
                    <img src="${escapeHtml(g.src)}" alt="${escapeHtml(g.alt || c.title)}" class="w-full h-full object-cover hover:scale-105 transition duration-500" loading="lazy">
                </figure>`).join('');

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${c.title} | 沐錦空間設計`,
    description: c.summary || '',
    image: gallery.map(g => `${SITE_URL}${g.src}`),
    author: { "@type": "Organization", name: "沐錦空間設計 Mujin Studio" },
    publisher: {
      "@type": "Organization",
      name: "沐錦空間設計 Mujin Studio",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp` }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/portfolio/${c.slug}.html` }
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "精選案例", item: `${SITE_URL}/portfolio.html` },
      { "@type": "ListItem", position: 3, name: c.title, item: `${SITE_URL}/portfolio/${c.slug}.html` }
    ]
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/portfolio/${c.slug}.html" />
    <title>${escapeHtml(c.title)} | ${escapeHtml(c.type || '室內設計案例')} | 沐錦空間設計</title>
    <meta name="description" content="${escapeHtml(c.summary || `${c.title} — ${c.type || '室內設計案例'}。沐錦空間設計`)}">
    ${c.type ? `<meta name="keywords" content="${escapeHtml(c.location || '')}${escapeHtml(c.type)}, 宜蘭室內設計, 羅東室內設計, 沐錦空間設計">` : ''}
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta property="og:title" content="${escapeHtml(c.title)} | 沐錦空間設計">
    <meta property="og:description" content="${escapeHtml(c.summary || '')}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${SITE_URL}/portfolio/${c.slug}.html">
    <meta property="og:image" content="${SITE_URL}${c.cover}">
    <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb, null, 2)}</script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
    <style>
        :root { --swiper-theme-color: #ffffff; }
        .swiper-button-next, .swiper-button-prev { color: white; text-shadow: 0 0 3px rgba(0,0,0,0.5); }
        .swiper-pagination-bullet-active { background: white; }
    </style>
    <link href="../styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('portfolio', '../')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <div class="container mx-auto px-6 max-w-6xl">
            <!-- Breadcrumb -->
            <nav class="text-xs text-brand-500 mb-8 tracking-wider" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="../index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li><a href="../portfolio.html" class="hover:text-brand-gold">精選案例</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">${escapeHtml(c.title)}</li>
                </ol>
            </nav>

            <!-- Title Block -->
            <header class="mb-10">
                <div class="flex flex-wrap gap-2 mb-4 text-xs tracking-widest">
                    ${c.type ? `<span class="bg-brand-800 text-white px-3 py-1">${escapeHtml(c.type)}</span>` : ''}
                    ${c.category ? `<span class="border border-brand-300 text-brand-600 px-3 py-1">${escapeHtml(c.category)}</span>` : ''}
                </div>
                <h1 class="font-serif text-3xl md:text-5xl text-brand-800 tracking-widest leading-tight">${escapeHtml(c.title)}</h1>
                <div class="flex flex-wrap gap-6 mt-6 text-sm text-brand-500 font-light">
                    ${c.location ? `<div><span class="text-brand-300 text-xs mr-2">LOCATION</span>${escapeHtml(c.location)}</div>` : ''}
                    ${c.area ? `<div><span class="text-brand-300 text-xs mr-2">AREA</span>${escapeHtml(c.area)}</div>` : ''}
                    ${c.year ? `<div><span class="text-brand-300 text-xs mr-2">YEAR</span>${escapeHtml(c.year)}</div>` : ''}
                </div>
            </header>

            <!-- Hero Swiper -->
            <div class="relative aspect-[16/9] md:aspect-[16/8] mb-10 shadow-lg overflow-hidden">
                <div class="swiper mySwiper w-full h-full">
                    <div class="swiper-wrapper">${slides}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                </div>
            </div>

            <!-- Summary + Body -->
            ${(c.summary || c.body) ? `
            <section class="bg-white p-8 md:p-12 shadow-sm mb-10 max-w-3xl mx-auto">
                ${c.summary ? `<p class="font-serif text-xl md:text-2xl text-brand-800 leading-loose mb-8">${escapeHtml(c.summary)}</p>` : ''}
                ${c.body ? `<div class="border-t border-brand-200 pt-8">
                    <span class="text-xs tracking-[0.3em] text-brand-500 block mb-4">DESIGN NOTES</span>
                    <p class="text-brand-600 leading-loose font-light text-justify">${nl2br(c.body)}</p>
                </div>` : ''}
            </section>` : ''}

            <!-- Thumbnail Grid -->
            ${thumbs ? `
            <section class="mb-16">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">${thumbs}
                </div>
            </section>` : ''}

            <!-- Prev / Next -->
            <nav class="border-t border-brand-200 pt-8 flex flex-col md:flex-row justify-between gap-6 text-sm">
                ${prev ? `<a href="${escapeHtml(prev.slug)}.html" class="group flex items-center gap-3 text-brand-500 hover:text-brand-gold transition"><i class="fa-solid fa-arrow-left"></i><span><span class="block text-xs text-brand-300">上一件作品</span><span class="block mt-1 text-brand-800 group-hover:text-brand-gold">${escapeHtml(prev.title)}</span></span></a>` : '<div></div>'}
                <a href="../portfolio.html" class="text-center text-brand-500 hover:text-brand-gold transition self-center"><i class="fa-solid fa-grip mr-1"></i>回到列表</a>
                ${next ? `<a href="${escapeHtml(next.slug)}.html" class="group flex items-center gap-3 text-brand-500 hover:text-brand-gold transition text-right"><span><span class="block text-xs text-brand-300">下一件作品</span><span class="block mt-1 text-brand-800 group-hover:text-brand-gold">${escapeHtml(next.title)}</span></span><i class="fa-solid fa-arrow-right"></i></a>` : '<div></div>'}
            </nav>

            <!-- CTA -->
            <section class="mt-20 bg-brand-800 text-white p-10 md:p-14 text-center">
                <h2 class="font-serif text-2xl md:text-3xl tracking-widest mb-4">為您的空間展開一段對話</h2>
                <p class="text-brand-100 font-light mb-8 max-w-xl mx-auto leading-loose">喜歡這件作品的調性嗎？填寫線上諮詢表單，讓我們聊聊您對家的想像。</p>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSdPI2DRVGC1Qtm0VXkKpeF2lWFtzxVMVBO056vxgE2jp5PdsA/viewform" target="_blank" rel="noopener noreferrer" class="inline-block border border-white px-10 py-4 text-sm tracking-widest hover:bg-white hover:text-brand-900 transition duration-300">預約諮詢</a>
            </section>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    <script>
        new Swiper(".mySwiper", {
            loop: ${gallery.length > 1},
            spaceBetween: 0,
            centeredSlides: true,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: ".swiper-pagination", clickable: true },
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" }
        });
    </script>
</body>
</html>`;
};

// ---------- 更新 index.html 的精選案例區塊 ----------
function updateIndexHtml(cases) {
  const indexPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('[build] index.html 不存在，略過');
    return;
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const newBlock = homePortfolioCards(cases);

  const re = /<!-- PORTFOLIO:START -->[\s\S]*?<!-- PORTFOLIO:END -->/;
  if (!re.test(html)) {
    console.warn('[build] index.html 找不到 <!-- PORTFOLIO:START --> 標記，請先插入標記後再跑 build');
    return;
  }
  const next = html.replace(re, newBlock);
  if (next !== html) {
    fs.writeFileSync(indexPath, next, 'utf8');
    console.log('[build] index.html 已更新精選案例區塊');
  } else {
    console.log('[build] index.html 精選案例區塊無變動');
  }
}

// ---------- sitemap ----------
function writeSitemap(cases) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/portfolio.html`, priority: '0.9' },
    { loc: `${SITE_URL}/faq.html`, priority: '0.7' },
    { loc: `${SITE_URL}/testimonials.html`, priority: '0.7' },
    ...cases.map(c => ({ loc: `${SITE_URL}/portfolio/${c.slug}.html`, priority: '0.8' }))
  ];
  const body = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`[build] sitemap.xml 已寫入（${urls.length} 筆）`);
}

// ---------- main ----------
function main() {
  console.log('[build] 開始生成…');
  const cases = readAllCases();
  console.log(`[build] 已讀取 ${cases.length} 筆已上架案例`);

  // 確保 portfolio/ 目錄存在
  if (!fs.existsSync(PORTFOLIO_DIR)) fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });

  // 清除舊的 portfolio/*.html（避免已刪除案例殘留）
  fs.readdirSync(PORTFOLIO_DIR).forEach(f => {
    if (f.endsWith('.html')) fs.unlinkSync(path.join(PORTFOLIO_DIR, f));
  });

  // 寫詳情頁
  cases.forEach(c => {
    const html = portfolioDetailPage(c, cases);
    fs.writeFileSync(path.join(PORTFOLIO_DIR, `${c.slug}.html`), html, 'utf8');
    console.log(`[build]   + portfolio/${c.slug}.html`);
  });

  // 寫列表頁
  fs.writeFileSync(path.join(ROOT, 'portfolio.html'), portfolioListPage(cases), 'utf8');
  console.log('[build] portfolio.html 已寫入');

  // 更新首頁
  updateIndexHtml(cases);

  // sitemap
  writeSitemap(cases);

  console.log('[build] 完成');
}

main();
