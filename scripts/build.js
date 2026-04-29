#!/usr/bin/env node
/**
 * 沐錦空間設計 靜態生成腳本
 *
 * 讀取 content/portfolio/*.json，產出：
 *   - portfolio.html            案例列表頁
 *   - portfolio/[slug].html     每個案例詳情頁
 *   - process.html              服務流程頁（含 HowTo schema）
 *   - sitemap.xml               更新 sitemap
 *   - index.html                替換 <!-- PORTFOLIO:START --> ~ <!-- PORTFOLIO:END --> 區塊
 *
 * 所有共用片段（head / GTM / header / footer / floating icons / scripts）
 * 已抽到 scripts/shared.js，達到「Vite 級的 partial 化」效果但無框架相依。
 */

const fs = require('fs');
const path = require('path');
const {
  SITE_URL,
  SHARED_HEAD_BASIC,
  SUPPLEMENTAL_CSS,
  GTM_HEAD,
  GTM_NOSCRIPT,
  FLOATING_ICONS,
  header,
  FOOTER,
  COMMON_SCRIPTS,
  breadcrumb,
} = require('./shared.js');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'portfolio');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio');

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

// 共用片段已搬到 scripts/shared.js（見上方 import）
// 此區僅保留本檔特有的頁面組裝邏輯

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
                    瀏覽所有見證
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
    name: "沐錦空間設計美好見證",
    description: "宜蘭羅東地區室內設計美好見證案例集，包含舊屋翻新、新屋裝修、商業空間設計。",
    url: `${SITE_URL}/portfolio.html`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: schemaItems
    }
  };
  const breadcrumbSchema = breadcrumb([
    { name: "首頁", url: `${SITE_URL}/` },
    { name: "美好見證", url: `${SITE_URL}/portfolio.html` },
  ]);

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/portfolio.html" />
    <title>美好見證 | 宜蘭羅東室內設計作品集 | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計美好見證案例集，宜蘭羅東地區的舊屋翻新、新屋裝修、預售屋客變與商業空間作品。每一案皆量身規劃，打造屬於居住者的空間敘事。">
    <meta name="keywords" content="宜蘭室內設計作品, 羅東室內設計案例, 宜蘭舊屋翻新案例, 宜蘭商業空間設計, 沐錦空間設計作品集">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta property="og:title" content="美好見證 | 沐錦空間設計">
    <meta property="og:description" content="宜蘭羅東地區的室內設計作品集。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/portfolio.html">
    ${cases[0] ? `<meta property="og:image" content="${SITE_URL}${cases[0].cover}">` : ''}
    <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('portfolio')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <div class="container mx-auto px-6">
            <!-- Breadcrumb -->
            <nav class="text-xs text-brand-500 mb-12 tracking-wider max-w-7xl mx-auto" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">美好見證</li>
                </ol>
            </nav>

            <div class="text-center mb-16">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Success Stories</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">美好見證</h1>
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
      { "@type": "ListItem", position: 2, name: "美好見證", item: `${SITE_URL}/portfolio.html` },
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
                    <li><a href="../portfolio.html" class="hover:text-brand-gold">美好見證</a></li>
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

// ---------- 服務流程 process.html ----------
const PROCESS_STEPS = [
  {
    code: '01', icon: 'fa-comments',
    title: '初次接洽',
    desc: '透過電話、Line 或表單聯繫我們，簡述您的案場類型、坪數與預算範圍。',
    detail: '我們會在 24 小時內回覆，安排第一次免費諮詢。請預先準備好房屋現況照片或平面圖，能讓討論更聚焦。',
    duration: '1–2 天'
  },
  {
    code: '02', icon: 'fa-mug-hot',
    title: '面對面諮詢',
    desc: '在工作室或案場與設計師深度對談，了解您的居住習慣與美學偏好。',
    detail: '此階段不收任何費用。我們會準備過往作品集與材料樣本，讓您具體感受設計方向。雙方都評估合適後再進入下一步。',
    duration: '2 小時'
  },
  {
    code: '03', icon: 'fa-handshake',
    title: '丈量與簽約',
    desc: '設計師到案場精確丈量，確認結構、管線、採光，並簽訂設計合約。',
    detail: '丈量資料是後續所有設計圖的基礎。設計合約採實坪計價，所有費用透明列出，不含任何隱藏成本。',
    duration: '1 週內'
  },
  {
    code: '04', icon: 'fa-pen-ruler',
    title: '平面規劃',
    desc: '依您的需求繪製平面配置圖、水電配置圖，討論動線與機能。',
    detail: '此階段含 2 次免費修改。平面圖確認後，將進入 3D 視覺階段，避免後續改動。',
    duration: '2–3 週'
  },
  {
    code: '05', icon: 'fa-cube',
    title: '3D 視覺與材料',
    desc: '產出 3D 精裝視覺預演，搭配實體材料樣本，讓您真實預見成果。',
    detail: '我們會帶您到展示間或材料廠選樣，所有用料均可實品確認。3D 視覺含 2 次免費調整。',
    duration: '2–3 週'
  },
  {
    code: '06', icon: 'fa-file-contract',
    title: '工程報價與簽約',
    desc: '提供詳細工程報價單，逐項列出材料、工資、數量，簽訂工程合約。',
    detail: '報價單依政府採購法格式編制，每一項目都可逐項檢視。簽約後才進入施工階段，不會臨時追加費用。',
    duration: '1–2 週'
  },
  {
    code: '07', icon: 'fa-hard-hat',
    title: '施工監造',
    desc: '工程進場後每週提供進度報告，重點工序皆有設計師現場監造。',
    detail: '重要工程（水電、結構）會錄影存檔，避免日後爭議。施工期間您可隨時到場參觀，案件規模不同工期約 6–14 週。',
    duration: '6–14 週'
  },
  {
    code: '08', icon: 'fa-house-chimney',
    title: '驗收交屋',
    desc: '完工後逐項驗收，附完整保固清單與保養手冊，正式交屋。',
    detail: '保固期內所有工程瑕疵免費修繕。交屋後一年內提供免費售後保養服務一次。',
    duration: '1 週'
  },
];

const processPage = () => {
  const stepCards = PROCESS_STEPS.map((s, i) => `
                <article class="process-step bg-white p-8 md:p-10 shadow-sm border-l-4 border-brand-gold flex flex-col md:flex-row gap-8" id="step-${s.code}">
                    <div class="flex-shrink-0 text-center md:text-left">
                        <div class="w-20 h-20 bg-brand-50 border border-brand-200 mx-auto md:mx-0 flex items-center justify-center mb-3">
                            <i class="fa-solid ${s.icon} text-3xl text-brand-gold"></i>
                        </div>
                        <span class="block font-serif text-3xl text-brand-800 tracking-wider">${s.code}</span>
                        <span class="block text-xs tracking-[0.2em] text-brand-500 mt-1">${s.duration}</span>
                    </div>
                    <div class="flex-1">
                        <h2 class="font-serif text-2xl md:text-3xl text-brand-800 tracking-wider mb-3">${s.title}</h2>
                        <p class="text-brand-600 leading-loose font-light mb-4">${s.desc}</p>
                        <p class="text-sm text-brand-500 leading-loose font-light border-t border-brand-100 pt-4">${s.detail}</p>
                    </div>
                </article>`).join('');

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "沐錦空間設計｜室內設計合作流程",
    "description": "從初次諮詢到完工交屋的完整 8 步驟室內設計合作流程。",
    "image": `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp`,
    "totalTime": "P3M",
    "estimatedCost": { "@type": "MonetaryAmount", "currency": "TWD", "value": "依坪數與材料規格而定" },
    "step": PROCESS_STEPS.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.title,
      "text": `${s.desc} ${s.detail}`,
      "url": `${SITE_URL}/process.html#step-${s.code}`
    }))
  };

  const breadcrumbSchema = breadcrumb([
    { name: "首頁", url: `${SITE_URL}/` },
    { name: "服務流程", url: `${SITE_URL}/process.html` },
  ]);

  const websiteSchemaPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "服務流程 | 沐錦空間設計",
    "url": `${SITE_URL}/process.html`,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".process-step h2", ".process-step p"]
    }
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/process.html" />
    <title>服務流程 | 從諮詢到交屋的 8 步驟 | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計完整服務流程：從初次接洽、面對面諮詢、丈量簽約、平面規劃、3D 視覺、工程報價、施工監造到驗收交屋的 8 個階段，每一步都透明可預期。">
    <meta name="keywords" content="宜蘭室內設計流程, 沐錦空間設計流程, 室內設計合作步驟, 設計監造流程, 宜蘭裝修流程">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta property="og:title" content="服務流程 | 沐錦空間設計">
    <meta property="og:description" content="從初次接洽到驗收交屋的 8 步驟，每一階段都透明可預期。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/process.html">
    <meta property="og:image" content="${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp">
    <script type="application/ld+json">${JSON.stringify(howToSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(websiteSchemaPage, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
    <style>
        .process-step { transition: transform 0.3s, box-shadow 0.3s; }
        .process-step:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
        .timeline-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: linear-gradient(180deg, transparent, #c9a961 20%, #c9a961 80%, transparent); transform: translateX(-50%); }
    </style>
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('process')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <div class="container mx-auto px-6">
            <!-- Breadcrumb -->
            <nav class="text-xs text-brand-500 mb-8 tracking-wider max-w-5xl mx-auto" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">服務流程</li>
                </ol>
            </nav>

            <!-- Header -->
            <header class="text-center mb-20 max-w-3xl mx-auto">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Our Process</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">服務流程</h1>
                <div class="w-16 h-px bg-brand-300 mx-auto mt-6"></div>
                <p class="text-brand-500 font-light mt-6 leading-loose">
                    從第一次接觸到正式交屋，我們把整套合作拆解成 8 個透明的階段。<br/>
                    每一步都有明確的交付物與時程，讓您隨時知道目前進到哪裡、下一步是什麼。
                </p>
            </header>

            <!-- Steps timeline -->
            <section class="space-y-6 max-w-5xl mx-auto">
                ${stepCards}
            </section>

            <!-- Total time summary -->
            <section class="mt-20 max-w-3xl mx-auto bg-brand-100 p-10 md:p-12 text-center border border-brand-200">
                <i class="fa-solid fa-clock text-3xl text-brand-gold mb-4"></i>
                <h2 class="font-serif text-2xl text-brand-800 tracking-wider mb-4">完整流程時程</h2>
                <p class="text-brand-600 font-light leading-loose">
                    住宅案件約 <strong class="text-brand-800">3–5 個月</strong>　·　商空案件約 <strong class="text-brand-800">2–4 個月</strong><br/>
                    依案件規模、材料供貨、客變需求而調整
                </p>
            </section>

            <!-- CTA -->
            <section class="mt-20 bg-brand-800 text-white p-10 md:p-14 text-center max-w-5xl mx-auto">
                <h2 class="font-serif text-2xl md:text-3xl tracking-widest mb-4">準備開始您的空間故事？</h2>
                <p class="text-brand-100 font-light mb-8 max-w-xl mx-auto leading-loose">
                    填寫線上諮詢表單，我們將在 24 小時內回覆，安排免費的初次諮詢。
                </p>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSdPI2DRVGC1Qtm0VXkKpeF2lWFtzxVMVBO056vxgE2jp5PdsA/viewform" target="_blank" rel="noopener noreferrer" class="inline-block border border-white px-10 py-4 text-sm tracking-widest hover:bg-white hover:text-brand-900 transition duration-300">
                    預約免費諮詢
                </a>
            </section>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
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
    { loc: `${SITE_URL}/process.html`, priority: '0.9' },
    { loc: `${SITE_URL}/faq.html`, priority: '0.7' },
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

  // 寫 process.html（服務流程）
  fs.writeFileSync(path.join(ROOT, 'process.html'), processPage(), 'utf8');
  console.log('[build] process.html 已寫入');

  // 更新首頁
  updateIndexHtml(cases);

  // sitemap
  writeSitemap(cases);

  console.log('[build] 完成');
}

main();
