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
  PHONE_DISPLAY,
  PHONE_HREF,
  EMAIL,
  SHARED_HEAD_BASIC,
  SUPPLEMENTAL_CSS,
  MUJIN_COMPONENT_CSS,
  GTM_HEAD,
  GTM_NOSCRIPT,
  FLOATING_ICONS,
  header,
  FOOTER,
  footer,
  CONTACT_FORM,
  COMMON_SCRIPTS,
  COOKIE_CONSENT,
  ctaSection,
  breadcrumb,
} = require('./shared.js');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'portfolio');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio');
const BLOG_CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const BLOG_DIR = path.join(ROOT, 'blog');

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
  const cards = top6.map((c, i) => `
                <a href="portfolio/${escapeHtml(c.slug)}.html" class="group block reveal" style="transition-delay: ${i * 80}ms">
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
  const cards = cases.map((c, i) => `
                    <a href="portfolio/${escapeHtml(c.slug)}.html" class="group block reveal" style="transition-delay: ${(i % 3) * 80}ms">
                        <figure class="cursor-pointer">
                            <div class="relative overflow-hidden aspect-[4/3] mb-4 bg-brand-100">
                                <img src="${escapeHtml(c.cover)}" alt="${escapeHtml(c.coverAlt || c.title)}" width="1200" height="800" class="w-full h-full object-cover transition duration-500 group-hover:scale-110" loading="lazy">
                                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-300"></div>
                                ${c.type ? `<div class="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-1 tracking-widest">${escapeHtml(c.type)}</div>` : ''}
                                ${c.concept ? `<div class="mj-concept-badge">Concept Study</div>` : ''}
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
    ${MUJIN_COMPONENT_CSS}
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

            <div class="text-center mb-16 reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Success Stories</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">美好見證</h1>
                <div class="w-16 h-px bg-brand-300 mx-auto mt-6"></div>
                <p class="text-brand-500 font-light mt-6 max-w-xl mx-auto leading-loose">每一個案場都是一段與屋主共同完成的對話。從老屋翻新到預售屋客變，從住宅到商空，我們為每一種生活提供適切的空間敘事。</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                ${cards || '<p class="col-span-full text-center text-brand-500">案例整理中，敬請期待。</p>'}
            </div>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
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
    ${MUJIN_COMPONENT_CSS}
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
            <header class="mb-10 reveal">
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
            ${c.concept ? `
            <aside class="mj-concept-notice max-w-3xl mx-auto">
                <strong>關於本案例：</strong>本作品為沐錦設計團隊的「設計提案研究（Concept Study）」，
                呈現設計風格與空間規劃思考，圖片採用合法授權之圖庫素材，並非實際完工案場。
            </aside>` : ''}

            <!-- Hero Swiper -->
            <div class="relative aspect-[16/9] md:aspect-[16/8] mb-10 shadow-lg overflow-hidden reveal-fade">
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
            <section class="bg-white p-8 md:p-12 shadow-sm mb-10 max-w-3xl mx-auto reveal">
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
            ${ctaSection({
              heading: '為您的空間展開一段對話',
              desc: '喜歡這件作品的調性嗎？填寫線上諮詢表單，讓我們聊聊您對家的想像。',
              basePath: '../',
            })}
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
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
                <article class="process-step reveal bg-white p-8 md:p-10 shadow-sm border-l-4 border-brand-gold flex flex-col md:flex-row gap-8" id="step-${s.code}" style="transition-delay: ${Math.min(i, 3) * 80}ms">
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
    ${MUJIN_COMPONENT_CSS}
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
            <header class="text-center mb-20 max-w-3xl mx-auto reveal">
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
            <section class="mt-20 max-w-3xl mx-auto bg-brand-100 p-10 md:p-12 text-center border border-brand-200 reveal">
                <i class="fa-solid fa-clock text-3xl text-brand-gold mb-4"></i>
                <h2 class="font-serif text-2xl text-brand-800 tracking-wider mb-4">完整流程時程</h2>
                <p class="text-brand-600 font-light leading-loose">
                    住宅案件約 <strong class="text-brand-800">3–5 個月</strong>　·　商空案件約 <strong class="text-brand-800">2–4 個月</strong><br/>
                    依案件規模、材料供貨、客變需求而調整
                </p>
            </section>

            <!-- CTA -->
            ${ctaSection({
              heading: '準備開始您的空間故事？',
              desc: '填寫線上諮詢表單，我們將在 24 小時內回覆，安排免費的初次諮詢。',
              btnText: '預約免費諮詢',
            })}
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
</body>
</html>`;
};

// ---------- pricing.html 收費標準 ----------
const PRICING_ROWS = [
  {
    name: '現場勘查',
    en: 'Site Visit',
    amount: '6,000 ~ 8,000',
    unit: '單次到場',
    desc: '宜蘭地區單次到府或案場勘查，含基礎丈量、屋況評估、口頭設計建議與書面報告。距離宜蘭外另議。',
    why: '簽約前即提供具體建議，避免來回奔波',
  },
  {
    name: '預售屋客變',
    en: 'Pre-sale Customization',
    amount: '2,000',
    unit: '元 / 坪',
    desc: '在建商客變截止日前，協助您完成格局變更、水電配置、地坪建材選擇與插座定位的客變圖面對接。',
    why: '省下交屋後拆改的高額成本',
  },
  {
    name: '設計費用',
    en: 'Design Service',
    amount: '4,000 ~ 6,000',
    unit: '元 / 坪（實坪）',
    desc: '完整設計包：平面配置圖、水電配置圖、3D 精裝視覺、材料樣本與詳細工程報價單。含 2 次免費修改。',
    why: '所有圖面都是合約附件，按圖驗收',
  },
  {
    name: '監造費用',
    en: 'Construction Supervision',
    amount: '8 ~ 10%',
    unit: '總工程款',
    desc: '工程期每週現場巡查、即時通報進度、重點工序錄影存證、工班協調與品質控管，直到驗收交屋。',
    why: '不只是繪圖，是把圖落實到現場',
  },
];

const PRICING_PROMISES = [
  { icon: 'fa-receipt', title: '一張清單，看到底', desc: '所有費用簽約前列明，工程款按實核銷，沒有事後追加的隱形成本。' },
  { icon: 'fa-ruler-combined', title: '實坪計價', desc: '只算您實際生活的室內坪數，公設不分攤。預算 100% 投入在您看得到、用得到的空間。' },
  { icon: 'fa-handshake', title: '客變優先', desc: '預售屋客變設計費投報率極高 — 省下交屋後的拆除、清運、重建費用。' },
];

const pricingPage = () => {
  const rows = PRICING_ROWS.map((r, i) => `
                <article class="mj-price-row reveal" style="transition-delay: ${i * 70}ms">
                    <div class="mj-price-num">${String(i + 1).padStart(2, '0')}</div>
                    <div class="mj-price-info">
                        <h3 class="mj-price-name">${escapeHtml(r.name)}</h3>
                        <p class="mj-price-en">${escapeHtml(r.en)}</p>
                        <p class="mj-price-desc">${escapeHtml(r.desc)}</p>
                        ${r.why ? `<span class="mj-price-why">${escapeHtml(r.why)}</span>` : ''}
                    </div>
                    <div class="mj-price-value">
                        <div class="mj-price-amount"><span class="mj-price-currency">NT$</span>${escapeHtml(r.amount)}</div>
                        <div class="mj-price-unit">${escapeHtml(r.unit)}</div>
                    </div>
                </article>`).join('');

  const promises = PRICING_PROMISES.map((p, i) => `
                <div class="mj-promise-item reveal" style="transition-delay: ${i * 80}ms">
                    <i class="fa-solid ${p.icon} mj-promise-icon"></i>
                    <h3 class="mj-promise-title">${escapeHtml(p.title)}</h3>
                    <p class="mj-promise-desc">${escapeHtml(p.desc)}</p>
                </div>`).join('');

  const breadcrumbSchema = breadcrumb([
    { name: '首頁', url: `${SITE_URL}/` },
    { name: '收費標準', url: `${SITE_URL}/pricing.html` },
  ]);

  const offerSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "沐錦空間設計｜室內設計與監造服務",
    "provider": {
      "@type": "Organization",
      "name": "沐錦空間設計 Mujin Studio",
      "url": SITE_URL
    },
    "areaServed": [
      { "@type": "AdministrativeArea", "name": "宜蘭縣" }
    ],
    "offers": [
      { "@type": "Offer", "name": "現場勘查", "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "TWD", "minPrice": 6000, "maxPrice": 8000 } },
      { "@type": "Offer", "name": "預售屋客變設計", "priceSpecification": { "@type": "UnitPriceSpecification", "priceCurrency": "TWD", "price": 2000, "unitText": "坪" } },
      { "@type": "Offer", "name": "室內設計", "priceSpecification": { "@type": "UnitPriceSpecification", "priceCurrency": "TWD", "minPrice": 4000, "maxPrice": 6000, "unitText": "坪" } },
      { "@type": "Offer", "name": "工程監造", "priceSpecification": { "@type": "PriceSpecification", "priceCurrency": "TWD", "description": "總工程款 8 ~ 10%" } }
    ]
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/pricing.html" />
    <title>收費標準 | 透明報價與監造費用 | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計收費標準公開透明，現場勘查、預售屋客變、設計費用與工程監造皆採實坪計價，宜蘭室內設計預算規劃一目了然。">
    <meta name="keywords" content="宜蘭室內設計費用, 宜蘭設計費, 宜蘭裝潢監造費, 室內設計實坪計價, 預售屋客變費用">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta property="og:title" content="收費標準 | 沐錦空間設計">
    <meta property="og:description" content="現場勘查、預售屋客變、設計費用、工程監造的透明收費基準。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/pricing.html">
    <meta property="og:image" content="${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp">
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(offerSchema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
    ${MUJIN_COMPONENT_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('pricing')}

    <main class="flex-grow bg-brand-50">
        <header class="mj-scroll-hero reveal">
            <span class="mj-scroll-hero-eyebrow">Transparent Pricing</span>
            <h1 class="mj-scroll-hero-title">收費標準</h1>
            <p class="mj-scroll-hero-tagline">一張清單，看到底。<br>所有費用簽約前列明，沒有事後追加的隱形成本。</p>
        </header>

        <div class="container mx-auto px-6 pb-24">
            <nav class="text-xs text-brand-500 mb-12 tracking-wider max-w-5xl mx-auto" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">收費標準</li>
                </ol>
            </nav>

            <section class="mj-price-list">${rows}
            </section>

            <p class="text-xs text-brand-500 text-center mt-10 tracking-wider max-w-2xl mx-auto leading-relaxed reveal">
                * 實際費用可能因案場條件、坪數規模、特殊工法需求而調整，詳情請與設計師當面討論。<br>
                * 設計合約簽訂前，提供 1 次免費諮詢與初步預算建議。
            </p>

            <section class="mj-promise-grid">${promises}
            </section>

            ${ctaSection({
              heading: '準備好聊聊預算了嗎？',
              desc: '告訴我們您的案場條件與坪數，沐錦會在 24 小時內回覆，並提供初步預算建議。',
              btnText: '前往預約諮詢',
            })}
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
</body>
</html>`;
};

// ---------- 簡易 Markdown 轉 HTML ----------
function markdownToHtml(md = '') {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const inline = (s) => {
    let t = s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 連結 [text](url)
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // 粗體 **xxx**
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜體 *xxx*
    t = t.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    // 行內 code `xx`
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    return t;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // H2 / H3
    let m;
    if ((m = line.match(/^###\s+(.*)$/))) { out.push(`<h3>${inline(m[1])}</h3>`); i++; continue; }
    if ((m = line.match(/^##\s+(.*)$/))) { out.push(`<h2>${inline(m[1])}</h2>`); i++; continue; }

    // 無序清單
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // 有序清單
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // 引用
    if (line.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // 段落（聚合直到空行或下一個區塊）
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|[-*]\s|\d+\.\s)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

// ---------- Blog 系統 ----------
function readAllBlogPosts() {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) return [];
  const files = fs.readdirSync(BLOG_CONTENT_DIR).filter(f => f.endsWith('.json'));
  const posts = files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(BLOG_CONTENT_DIR, f), 'utf8')); }
    catch (e) { console.error(`[build] blog JSON 錯誤：${f}`, e.message); return null; }
  }).filter(p => p && p.published !== false);
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

const blogListPage = (posts) => {
  const cards = posts.map((p, i) => `
                <a href="blog/${escapeHtml(p.slug)}.html" class="mj-blog-card reveal" style="transition-delay: ${(i % 3) * 80}ms">
                    <div class="mj-blog-card-img">
                        <img src="${escapeHtml(p.cover || '/images/mujin-studio-yilan-interior-design-logo.webp')}" alt="${escapeHtml(p.coverAlt || p.title)}" loading="lazy">
                    </div>
                    <div class="mj-blog-card-body">
                        <div class="mj-blog-meta">${escapeHtml(p.category || '')}　·　${escapeHtml(p.date || '')}</div>
                        <h3>${escapeHtml(p.title)}</h3>
                        <p>${escapeHtml(p.excerpt || '')}</p>
                    </div>
                </a>`).join('');

  const breadcrumbSchema = breadcrumb([
    { name: '首頁', url: `${SITE_URL}/` },
    { name: '沐錦筆記', url: `${SITE_URL}/blog.html` },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "沐錦筆記",
    "description": "沐錦空間設計分享的宜蘭室內設計、老屋翻新、預算規劃、工法與材料筆記。",
    "url": `${SITE_URL}/blog.html`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": posts.map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `${SITE_URL}/blog/${p.slug}.html`,
        "name": p.title
      }))
    }
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/blog.html" />
    <title>沐錦筆記 | 宜蘭室內設計觀點與在地裝修知識 | 沐錦空間設計</title>
    <meta name="description" content="沐錦筆記分享宜蘭老屋翻新、預算規劃、工法與材料、選品與軟裝、在地知識，協助您在裝修決策上做出更明智的判斷。">
    <meta name="keywords" content="宜蘭室內設計部落格, 宜蘭老屋翻新文章, 宜蘭裝修知識, 沐錦筆記, 預售屋客變指南">
    <meta name="geo.region" content="TW-ILA" />
    <meta property="og:title" content="沐錦筆記 | 沐錦空間設計">
    <meta property="og:description" content="宜蘭室內設計與裝修知識筆記。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/blog.html">
    <meta property="og:image" content="${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp">
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(itemListSchema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
    ${MUJIN_COMPONENT_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('blog')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <div class="container mx-auto px-6 max-w-7xl">
            <nav class="text-xs text-brand-500 mb-12 tracking-wider" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">沐錦筆記</li>
                </ol>
            </nav>

            <div class="text-center mb-16 reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Studio Journal</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">沐錦筆記</h1>
                <div class="w-16 h-px bg-brand-300 mx-auto mt-6"></div>
                <p class="text-brand-500 font-light mt-6 max-w-xl mx-auto leading-loose">宜蘭老屋翻新、預售屋客變、工法材料、軟裝選品⋯⋯把設計工作裡的判斷邏輯留成文字，希望讓更多人不被裝修黑話卡住。</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${cards || '<p class="col-span-full text-center text-brand-500">文章準備中，敬請期待。</p>'}
            </div>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
</body>
</html>`;
};

const blogDetailPage = (p, allPosts) => {
  const idx = allPosts.findIndex(x => x.slug === p.slug);
  const prev = idx > 0 ? allPosts[idx - 1] : null;
  const next = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;

  const bodyHtml = markdownToHtml(p.body || '');

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": p.title,
    "description": p.excerpt || '',
    "image": p.cover ? [`${SITE_URL}${p.cover}`] : [],
    "datePublished": p.date,
    "dateModified": p.date,
    "author": { "@type": "Organization", "name": "沐錦空間設計 Mujin Studio" },
    "publisher": {
      "@type": "Organization",
      "name": "沐錦空間設計 Mujin Studio",
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp` }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/blog/${p.slug}.html` },
    "keywords": (p.tags || []).join(', ')
  };
  const breadcrumbSchema = breadcrumb([
    { name: '首頁', url: `${SITE_URL}/` },
    { name: '沐錦筆記', url: `${SITE_URL}/blog.html` },
    { name: p.title, url: `${SITE_URL}/blog/${p.slug}.html` },
  ]);

  const tagsHtml = (p.tags || []).map(t => `<span class="inline-block bg-white border border-brand-200 text-brand-500 text-xs px-3 py-1 mr-2 mb-2">#${escapeHtml(t)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/blog/${p.slug}.html" />
    <title>${escapeHtml(p.title)} | 沐錦筆記 | 沐錦空間設計</title>
    <meta name="description" content="${escapeHtml(p.excerpt || p.title)}">
    ${p.tags && p.tags.length ? `<meta name="keywords" content="${escapeHtml(p.tags.join(', '))}, 沐錦空間設計, 宜蘭室內設計">` : ''}
    <meta name="geo.region" content="TW-ILA" />
    <meta property="og:title" content="${escapeHtml(p.title)} | 沐錦筆記">
    <meta property="og:description" content="${escapeHtml(p.excerpt || '')}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${SITE_URL}/blog/${p.slug}.html">
    ${p.cover ? `<meta property="og:image" content="${SITE_URL}${p.cover}">` : ''}
    <meta property="article:published_time" content="${escapeHtml(p.date || '')}">
    <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <link href="../styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
    ${MUJIN_COMPONENT_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('blog', '../')}

    <main class="flex-grow pt-32 pb-20 bg-brand-50">
        <article class="container mx-auto px-6 max-w-3xl">
            <nav class="text-xs text-brand-500 mb-8 tracking-wider" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="../index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li><a href="../blog.html" class="hover:text-brand-gold">沐錦筆記</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800 line-clamp-2">${escapeHtml(p.title)}</li>
                </ol>
            </nav>

            <header class="mb-10 text-center reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-3">${escapeHtml(p.category || 'Journal')}</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-wider leading-tight">${escapeHtml(p.title)}</h1>
                <p class="text-sm text-brand-500 mt-6 tracking-widest">${escapeHtml(p.date || '')} · 約 ${p.readingTime || 6} 分鐘閱讀</p>
            </header>

            ${p.cover ? `<figure class="aspect-[16/9] overflow-hidden bg-brand-100 mb-12 shadow-sm reveal-fade">
                <img src="${escapeHtml(p.cover)}" alt="${escapeHtml(p.coverAlt || p.title)}" class="w-full h-full object-cover">
            </figure>` : ''}

            <div class="mj-article-body bg-white p-8 md:p-12 shadow-sm reveal">
                ${bodyHtml}
            </div>

            ${tagsHtml ? `<div class="mt-10 text-center">${tagsHtml}</div>` : ''}

            <nav class="border-t border-brand-200 pt-8 mt-12 flex flex-col md:flex-row justify-between gap-6 text-sm">
                ${prev ? `<a href="${escapeHtml(prev.slug)}.html" class="group flex items-center gap-3 text-brand-500 hover:text-brand-gold transition"><i class="fa-solid fa-arrow-left"></i><span><span class="block text-xs text-brand-300">上一篇</span><span class="block mt-1 text-brand-800 group-hover:text-brand-gold">${escapeHtml(prev.title)}</span></span></a>` : '<div></div>'}
                <a href="../blog.html" class="text-center text-brand-500 hover:text-brand-gold transition self-center"><i class="fa-solid fa-grip mr-1"></i>回到筆記列表</a>
                ${next ? `<a href="${escapeHtml(next.slug)}.html" class="group flex items-center gap-3 text-brand-500 hover:text-brand-gold transition text-right"><span><span class="block text-xs text-brand-300">下一篇</span><span class="block mt-1 text-brand-800 group-hover:text-brand-gold">${escapeHtml(next.title)}</span></span><i class="fa-solid fa-arrow-right"></i></a>` : '<div></div>'}
            </nav>

            ${ctaSection({
              heading: '想為自己的空間做出更好的決定？',
              desc: '我們協助您把模糊的想像，化為可執行的設計與預算規劃。',
              basePath: '../',
            })}
        </article>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
</body>
</html>`;
};

// ---------- 隱私權政策 / 使用條款（個人工作室版本） ----------
const PRIVACY_SECTIONS = [
  {
    title: '適用範圍',
    body: `<p>本政策適用於您在沐錦空間設計官方網站（mujin.tw）瀏覽、填寫表單、來電或來信諮詢，或透過 LINE 官方帳號、Facebook、Instagram 等社群管道與本工作室互動時，所涉及的個人資料蒐集、處理及利用行為。</p>
    <p>本政策不適用於本工作室網站以外之連結網站，亦不適用於非本工作室所委託或參與管理的人員。</p>`,
  },
  {
    title: '蒐集之個人資料類別',
    body: `<p>本工作室基於提供宜蘭室內設計、老屋翻新、預售屋客變、農舍規劃與商業空間設計等服務之目的，可能蒐集以下個人資料：</p>
    <ul>
      <li><strong>識別類：</strong>姓名、聯絡電話、電子郵件信箱</li>
      <li><strong>服務需求類：</strong>諮詢項目、物件地點、預算範圍、方便聯絡時間、備註需求</li>
      <li><strong>技術紀錄類：</strong>IP 位址、瀏覽器類型、瀏覽紀錄、停留時間（透過 Google Analytics 4 / Google Tag Manager 蒐集）</li>
      <li><strong>Cookie：</strong>用於改善網站瀏覽體驗與流量分析</li>
    </ul>`,
  },
  {
    title: '蒐集之目的',
    body: `<p>本工作室蒐集個人資料之特定目的依《個人資料保護法之特定目的及個人資料之類別》代號如下：</p>
    <ul>
      <li><strong>040 行銷</strong>（含商業電子郵件行銷）</li>
      <li><strong>069 契約、類似契約或其他法律關係事務</strong></li>
      <li><strong>090 消費者、客戶管理與服務</strong></li>
      <li><strong>148 網站經營業務</strong>（含流量分析與使用者體驗優化）</li>
      <li><strong>152 廣告或商業行為管理</strong></li>
    </ul>
    <p>實際使用情境包含：聯絡您安排諮詢、提供報價、寄送設計提案、回覆服務問題、優化網站內容與服務流程。</p>`,
  },
  {
    title: '利用期間、地區、對象及方式',
    body: `<p><strong>利用期間：</strong>自您提供個人資料時起，至您提出停止使用要求或本工作室停止提供服務之日止；委託案件完成後將保留 5 年，以符合稅務及契約紛爭之法定保存期限。</p>
    <p><strong>利用地區：</strong>本工作室營運所在地（中華民國）及本政策所列第三方服務商所在地。</p>
    <p><strong>利用對象：</strong>本工作室及下列第三方服務商：</p>
    <ul>
      <li><strong>Formspree</strong>（美國，表單接收與轉發）</li>
      <li><strong>Google Analytics 4 / Google Tag Manager</strong>（美國，網站流量分析）</li>
      <li><strong>Google Maps</strong>（美國，店家位置顯示）</li>
      <li><strong>Netlify</strong>（美國，網站託管）</li>
      <li><strong>LINE 官方帳號 / Facebook / Instagram</strong>（日本／美國，客戶服務溝通）</li>
    </ul>
    <p>本工作室不會將您的個人資料販售、交換、出租或以任何方式揭露予前述對象以外之第三方，但法律另有規定或經您同意者除外。</p>`,
  },
  {
    title: '您的個資權益',
    body: `<p>依《個人資料保護法》第 3 條，您就本工作室保有您之個人資料得行使下列權利：</p>
    <ul>
      <li>查詢或請求閱覽</li>
      <li>請求製給複製本</li>
      <li>請求補充或更正</li>
      <li>請求停止蒐集、處理或利用</li>
      <li>請求刪除</li>
    </ul>
    <p>您欲行使上述權利時，請以電子郵件或電話向本工作室資料保護聯絡窗口提出，本工作室將於 30 日內回覆處理。</p>`,
  },
  {
    title: 'Cookie 政策',
    body: `<p>本網站使用 Cookie 以改善您的瀏覽體驗，包含：</p>
    <ul>
      <li><strong>必要 Cookie：</strong>維持網站正常運作（如表單防止重複送出）</li>
      <li><strong>分析 Cookie：</strong>Google Analytics 4 用於了解訪客如何使用本網站</li>
    </ul>
    <p>本網站採用 Google Consent Mode v2，預設拒絕分析與廣告類 Cookie；您可於首次造訪時的 Cookie 同意條款橫幅中選擇接受或拒絕。您也可透過瀏覽器設定隨時清除或封鎖 Cookie，但部分功能可能因此受限。</p>`,
  },
  {
    title: '資料安全保護措施',
    body: `<p>本工作室採取下列措施保護您的個人資料：</p>
    <ul>
      <li>網站全程使用 HTTPS（SSL/TLS）加密傳輸</li>
      <li>表單資料透過 Formspree 安全 API 接收，本工作室網站不直接儲存個資</li>
      <li>限制接觸個人資料之人員範圍（僅工作室負責人與必要協作者）</li>
      <li>第三方服務商皆符合 GDPR 或同等個資保護標準</li>
    </ul>`,
  },
  {
    title: '政策修訂',
    body: `<p>本工作室保留隨時修訂本政策之權利。修訂後將於本網站公告，並更新「最後更新日期」。建議您定期回訪以掌握最新內容。</p>`,
  },
  {
    title: '聯絡窗口',
    body: `<p><strong>單位名稱：</strong>沐錦空間設計工作室 Mujin Studio</p>
    <p><strong>地址：</strong>宜蘭縣冬山鄉冬山路三段 465 號</p>
    <p><strong>聯絡電話：</strong><a href="tel:${PHONE_HREF}">${PHONE_DISPLAY}</a></p>
    <p><strong>資料保護聯絡 Email：</strong><a href="mailto:${EMAIL}">${EMAIL}</a></p>`,
  },
];

const TERMS_SECTIONS = [
  {
    title: '條款之適用',
    body: `<p>當您使用本網站時，即視為您已閱讀、瞭解並同意接受本條款之所有內容。本工作室有權於任何時間修改本條款，修改後之條款公告於本網站時即生效，請您隨時注意該等修改或變更。</p>
    <p>若您不同意本條款之內容，請立即停止使用本網站。</p>`,
  },
  {
    title: '服務內容',
    body: `<p>本網站提供以下資訊與服務：</p>
    <ul>
      <li>室內設計、老屋翻新、預售屋客變、農舍規劃、商業空間設計等服務之介紹與案例展示</li>
      <li>線上諮詢表單與聯絡資訊</li>
      <li>設計知識文章、最新消息與服務流程說明</li>
    </ul>
    <p>本工作室提供之服務內容、規格、價格得隨時調整，最終以雙方簽訂之書面合約為準。</p>`,
  },
  {
    title: '智慧財產權',
    body: `<p>本網站所有內容，包括但不限於文字、圖片、設計案例、影音、商標、Logo、版面設計、程式碼，均為本工作室或原權利人所有，受《著作權法》、《商標法》及相關智慧財產權法令保護。</p>
    <p>未經本工作室書面同意，您不得以任何方式（含複製、重製、公開傳輸、改作、散布、出租、出版）使用本網站之內容。</p>
    <p>若需引用本網站內容，請於使用前來信徵得書面同意，並註明出處。</p>`,
  },
  {
    title: '使用者行為規範',
    body: `<p>使用本網站時，您同意不得有下列行為：</p>
    <ul>
      <li>提供虛偽不實之個人資料或冒用他人身份</li>
      <li>以自動化工具大量擷取本網站內容</li>
      <li>從事任何違反法令、公序良俗或侵害他人權益之行為</li>
      <li>對本網站進行任何形式之干擾、破壞或入侵行為</li>
      <li>傳輸含有病毒、惡意程式之資料</li>
    </ul>
    <p>違反前述規定者，本工作室得立即停止其使用，並依法追究法律責任。</p>`,
  },
  {
    title: '免責聲明',
    body: `<p>本網站所提供之資訊（包含案例、價格區間、服務說明）僅供參考，實際內容以雙方簽訂之合約為準。本工作室不保證網站內容之絕對正確性、即時性與完整性。</p>
    <p>本網站可能含有第三方網站連結（如 Facebook、Instagram、LINE、Google Maps），該等網站之隱私權政策與內容由各該網站負責，本工作室不負任何責任。</p>
    <p>因不可抗力或非可歸責於本工作室之事由（如系統維護、網路故障、第三方服務中斷）造成本網站暫時無法使用，本工作室不負損害賠償責任。</p>`,
  },
  {
    title: '案例與圖片來源說明',
    body: `<p>本網站展示之案例圖片包含「設計提案研究（Concept Study）」與本工作室實際執行案例兩類，皆於相對應案例頁面標示，避免造成誤解。</p>
    <p>部分形象圖片採用合法授權之圖庫素材（如 Unsplash），版權歸原作者所有，本網站僅作品牌形象呈現用途。</p>`,
  },
  {
    title: '準據法與管轄法院',
    body: `<p>本條款之解釋與適用，以及與本條款有關之爭議，均以中華民國法律為準據法。</p>
    <p>因本條款所生之訴訟，雙方合意以<strong>臺灣宜蘭地方法院</strong>為第一審管轄法院。</p>`,
  },
  {
    title: '聯絡窗口',
    body: `<p><strong>單位名稱：</strong>沐錦空間設計工作室 Mujin Studio</p>
    <p><strong>地址：</strong>宜蘭縣冬山鄉冬山路三段 465 號</p>
    <p><strong>聯絡電話：</strong><a href="tel:${PHONE_HREF}">${PHONE_DISPLAY}</a></p>
    <p><strong>電子郵件：</strong><a href="mailto:${EMAIL}">${EMAIL}</a></p>`,
  },
];

const docPage = ({ slug, title, eyebrow, intro, sections, updatedAt }) => {
  const breadcrumbSchema = breadcrumb([
    { name: '首頁', url: `${SITE_URL}/` },
    { name: title, url: `${SITE_URL}/${slug}.html` },
  ]);

  const sectionsHtml = sections.map((s, i) => `
                <section class="reveal" style="transition-delay: ${Math.min(i, 4) * 60}ms">
                    <span class="mj-doc-num">${String(i + 1).padStart(2, '0')}</span>
                    <h3 class="mj-doc-h3">${escapeHtml(s.title)}</h3>
                    <div class="mj-doc-body">${s.body}</div>
                </section>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${SITE_URL}/${slug}.html" />
    <title>${escapeHtml(title)} | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計${escapeHtml(title)}說明。${escapeHtml(intro.replace(/<[^>]+>/g, '').slice(0, 80))}">
    <meta property="og:title" content="${escapeHtml(title)} | 沐錦空間設計">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/${slug}.html">
    <meta property="og:image" content="${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp">
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${SUPPLEMENTAL_CSS}
    ${MUJIN_COMPONENT_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('')}

    <main class="flex-grow bg-brand-50">
        <header class="mj-doc-header">
            <p class="mj-doc-eyebrow">${escapeHtml(eyebrow)}</p>
            <h1 class="mj-doc-title">${escapeHtml(title)}</h1>
            <div class="mj-doc-divider"></div>
        </header>

        <div class="mj-doc-main">
            <nav class="text-xs text-brand-500 mb-10 tracking-wider" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2 justify-center">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">${escapeHtml(title)}</li>
                </ol>
            </nav>

            <p class="mj-doc-intro reveal">${intro}</p>

            <article class="mj-doc-article">${sectionsHtml}
            </article>

            <p class="mj-doc-footer">最後更新日期 · Last Updated：${escapeHtml(updatedAt)}</p>
        </div>
    </main>

    ${FOOTER}
    ${COMMON_SCRIPTS}
    ${COOKIE_CONSENT}
</body>
</html>`;
};

const privacyPage = () => docPage({
  slug: 'privacy',
  title: '隱私權政策',
  eyebrow: 'Privacy Policy',
  intro: '沐錦空間設計工作室（以下簡稱「本工作室」）非常重視您的隱私權，並依據《個人資料保護法》規範，制定本隱私權政策。',
  sections: PRIVACY_SECTIONS,
  updatedAt: '2026.05.15',
});

const termsPage = () => docPage({
  slug: 'terms',
  title: '使用條款',
  eyebrow: 'Terms of Service',
  intro: '歡迎使用沐錦空間設計工作室網站。使用本網站即表示您同意以下使用條款，請您詳細閱讀。',
  sections: TERMS_SECTIONS,
  updatedAt: '2026.05.15',
});

// ---------- faq.html ----------
const FAQ_QA_PAIRS = [
  { q: "宜蘭室內設計服務費包含哪些具體產出？", a: "設計費包含四大技術文件：1.平面配置圖(動線)、2.水電配置圖(機能)、3.3D精裝視覺預演(對位)、4.詳細工程報價單(成本)。這套文件是施工的法律基準，能降低現場誤差產生的拆改成本。" },
  { q: "採「實坪計價」對業主的意義為何？", a: "實坪計價能直接排除公設比造成的預算虛耗。雖然單價看似較高，但能確保每一分預算都回歸到業主實際居住的室內空間，而非分攤到公共區域。" },
  { q: "特定規格（如高訂）的單坪成本為何較高？", a: "成本差異源於「工藝工時」與「材料精度」。例如石材精密對位、極細金屬收邊等，需要資深師傅花費數倍時間施作，以換取更精細的質感與耐用度。" },
  { q: "宜蘭老屋翻新「基礎工程」預算大約多少？", a: "以20-30年屋齡為例，基礎工程建議預算為每坪 $10-12 萬起。費用包含拆除、全室水電更新、防水加強與基礎泥作，這是確保居住安全的最底線投資。" },
  { q: "為什麼老屋翻新工程需要長達 8-12 個月？", a: "基於宜蘭「高濕多雨」的氣候特性，我們堅持執行防水層與泥作工程的「自然乾燥期」。不趕工是為了防止未來牆面起泡或壁癌，確保翻修後30年的資產保值。" },
  { q: "預售屋客變設計費行情與效益？", a: "客變設計費約 $2,000 - $3,500 / 坪。其核心價值在於省下交屋後的「拆除費、清運費與重建費」，通常省下的工程款遠高於設計費，是高投報率的避險投資。" },
  { q: "若預算有限，客變階段應優先執行哪些項目？", a: "應優先執行「格局變更」與「電力/給排水預埋」。這類隱蔽工程涉及建築體結構，交屋後改動成本極高；至於地磚、油漆等裝飾性項目則可後續再處理。" },
  { q: "軟裝預算與硬裝工程如何分配？", a: "建議比例為：硬裝工藝 50%、基礎設備 30%、軟裝氛圍 20%。預算應優先配置在長時間接觸的家具（如沙發、床墊），其次才是裝飾品。" },
  { q: "統包與設計師，哪種方式的預算配置更有優勢？", a: "統包適合「預算集中施工、且屋主具備監工能力」的情況。設計師適合「重視圖面預演、降低拆改風險」的屋主。設計費本質上是將不確定性轉化為顯性的管理成本。" },
  { q: "兩者在保固與售後服務上有何區別？", a: "主要差異在於「圖資完整度」。設計師會提供完整的竣工圖與水電系統圖，未來若需維修或二次裝修，工人能有明確的管線依據，避免誤鑽或盲測。" },
];

const FAQ_BODY_HTML = `
            <article class="mb-24 scroll-mt-24 reveal" id="section-1">
                <div class="flex items-end gap-4 mb-8 border-b border-brand-300 pb-4">
                    <span class="text-4xl font-serif text-brand-gold opacity-30">01</span>
                    <h2 class="text-2xl font-serif text-brand-800 tracking-wide">設計費計算 & 預算配置攻略</h2>
                </div>

                <div class="bg-brand-50 p-8 rounded-sm border-l-4 border-brand-800 mb-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 class="text-lg font-bold text-brand-800 mb-2">設計服務費核算</h3>
                            <p class="text-brand-500 text-sm leading-relaxed text-justify">
                                採<strong class="text-brand-800 font-normal">「室內實際施作坪數」</strong>計費，標準為 <strong class="font-normal">$4,000 - $6,000 / 坪</strong>。包含平面/水電配置圖、3D 精裝視覺預演及詳細工程報價單。
                            </p>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-brand-800 mb-2">實坪計價機制</h3>
                            <p class="text-brand-500 text-sm leading-relaxed text-justify">
                                工程預算採實坪基準。排除建築公設虛坪，確保資源 <strong class="text-brand-800 font-normal">100% 投入於實際生活空間</strong>。
                            </p>
                        </div>
                    </div>
                </div>

                <div class="mb-8 overflow-hidden border border-brand-100 rounded-lg">
                    <div class="bg-brand-800 text-white p-3 text-center tracking-widest text-sm">工程預算級距參考 (含監造管理費)</div>
                    <div class="divide-y divide-brand-100 text-sm text-brand-500 bg-white">
                        <div class="p-4 flex flex-col md:flex-row justify-between hover:bg-brand-50 transition">
                            <span>新成屋（標準規格）</span><span class="font-medium">$6 - $8 萬 / 坪</span>
                        </div>
                        <div class="p-4 flex flex-col md:flex-row justify-between hover:bg-brand-50 transition">
                            <span>新成屋（進階規格）</span><span class="font-medium">$8 - $10 萬 / 坪</span>
                        </div>
                        <div class="p-4 flex flex-col md:flex-row justify-between hover:bg-brand-50 transition">
                            <span>新成屋（高訂規格）</span><span class="font-medium">$10 萬以上 / 坪</span>
                        </div>
                        <div class="p-4 flex flex-col md:flex-row justify-between hover:bg-brand-50 transition">
                            <span>老屋翻新（基礎工程）</span><span class="font-medium">$10 - $12 萬 / 坪起</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm text-brand-500">
                    <div class="flex items-start gap-4">
                        <i class="fa-solid fa-cube text-brand-gold mt-1"></i>
                        <div>
                            <h4 class="font-bold text-brand-800 mb-1">3D 圖面量化核實</h4>
                            <p class="font-light">透過 3D 精裝製圖進行數量清查與視覺預對位。除不可抗力結構缺陷外，落實「按實核銷」原則。</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <i class="fa-solid fa-ruler-combined text-brand-gold mt-1"></i>
                        <div>
                            <h4 class="font-bold text-brand-800 mb-1">細部收邊準則</h4>
                            <p class="font-light">針對金屬、石材銜接介面，強制執行 0.5cm 極細收邊工法，確保空間精密感與結構穩定度。</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <details id="faq-design-fee" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：設計服務費包含哪些具體產出？其技術價值為何？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            本所提供之技術文件含：<strong class="font-normal">平面配置圖</strong>（空間動線邏輯）、<strong class="font-normal">水電配置圖</strong>（機能定位）、<strong class="font-normal">3D 精裝視覺預演</strong>（作為材料收邊與工程施作之對位依據）及<strong class="font-normal">詳細工程報價單</strong>（材料成本精算）。這套文件旨在定義施工基準，降低現場誤差所產生的拆改成本。
                        </div>
                    </details>
                    <details id="faq-real-ping-meaning" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：採「實坪計價」對業主的資產意義為何？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            此計法能直接<strong class="font-normal">排除公設比</strong>造成的預算虛耗。透明化的計費基準雖然提升了名目單價，但有效避免了預算被配置在「非使用空間」的浪費，使預算完全回歸<strong class="font-normal">實際使用面積</strong>。
                        </div>
                    </details>
                    <details id="faq-structural-risk" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：若拆除後發現結構缺陷，如何控管追加預算？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            針對隱蔽工程之不可預見風險，本所採取<strong class="font-normal">「即時通報、現場簽證、透明報價」</strong>。所有結構補強項目將依實況會同業主進行核認，確保預算變動具備高度工程依據。
                        </div>
                    </details>
                    <details id="faq-high-end-cost" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：特定規格（如高訂）的單坪成本為何較高？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            預算差異源於<strong class="font-normal">「材料稀有度」與「工藝工時」</strong>。如石材精密對位、極細金屬收邊等工項，其施工難度與所需工日較高，此預算投入在於獲得經得起數據檢視的精確細節。
                        </div>
                    </details>
                </div>
            </article>

            <article class="mb-24 scroll-mt-24 reveal" id="section-2">
                <div class="flex items-end gap-4 mb-8 border-b border-brand-300 pb-4">
                    <span class="text-4xl font-serif text-brand-gold opacity-30">02</span>
                    <h2 class="text-2xl font-serif text-brand-800 tracking-wide">老屋翻修預算 & 結構補強解析</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div class="space-y-4">
                        <div class="p-4 bg-white border-l-4 border-brand-gold shadow-sm">
                            <h4 class="font-bold text-brand-800 mb-1">科學工期管理</h4>
                            <p class="text-xs text-brand-500 leading-relaxed">堅持 8-12 個月施工週期。針對<strong class="text-brand-800 font-normal">宜蘭多雨高濕</strong>氣候，強制執行防水層與泥作之「自然乾燥期」，杜絕未來牆面起泡風險。</p>
                        </div>
                        <div class="p-4 bg-white border-l-4 border-brand-gold shadow-sm">
                            <h4 class="font-bold text-brand-800 mb-1">高規防水系統</h4>
                            <p class="text-xs text-brand-500 leading-relaxed">針對宜蘭環境，於衛浴、窗框、外牆接縫處執行多層次防水塗佈標準。</p>
                        </div>
                    </div>
                    <div class="bg-brand-50 p-6 text-sm text-brand-500 leading-loose rounded-lg">
                        <h4 class="font-bold text-brand-800 mb-3 border-b border-brand-200 pb-2">五大基礎工程模組</h4>
                        <ul class="list-disc list-inside space-y-1">
                            <li>結構拆除：標準化保護，嚴禁傷及主體。</li>
                            <li>高規防水：適應宜蘭多雨氣候的防護。</li>
                            <li>格局優化：3D 模擬採光與風道，解決潮濕。</li>
                            <li>電力更新：全室線徑更新，符合高功率家電。</li>
                            <li>預算動態控管：按實核銷，杜絕無故追加。</li>
                        </ul>
                    </div>
                </div>

                <div class="space-y-3">
                    <details id="faq-renovation-budget-basics" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：老屋翻新的「基礎工程」預算配置基準為何？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            以 20-30 年屋齡為例，基礎工程（含拆除、全室水電更新、廁所工程、基礎硬裝修工程）建議配置基準為 <strong class="font-normal">$10 - $12 萬 / 坪起</strong>。此項預算旨在確保隱蔽工程達到最高安全標準，其餘美學裝飾則依業主需求另行疊加。
                        </div>
                    </details>
                    <details id="faq-renovation-duration" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：為什麼老屋翻新工程需要長達 8-12 個月之執行週期？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            此為保證工程品質之必要時程。在<strong class="font-normal">宜蘭高濕環境</strong>下，水電、泥作、防水層之穩定性極度依賴<strong class="font-normal">「乾燥率」</strong>。堅持不趕工，是為了確保翻修後 30 年之居住安全與資產保值。
                        </div>
                    </details>
                    <details id="faq-structure-issues" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：若拆除舊裝潢後才發現「結構破損」，如何處理預算落差？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            隱蔽結構受損常在拆除後現形。本所處置原則為：<strong class="font-normal">「即時通報、現場簽證、透明報價」</strong>。我們會透過專業鑑定確認破損範圍，並提供獨立的專業補強方案供業主核認。結構安全是居住之前提。
                        </div>
                    </details>
                    <details id="faq-partial-renovation" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：若預算受限，是否建議進行局部翻修？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            本所主張<strong class="font-normal">「功能優先於裝飾」</strong>。若預算有限，應優先執行全室水電更新與防水補強等<strong class="font-normal">「建築壽命基礎工程」</strong>。局部翻修若忽略老舊管線風險，未來發生滲漏將導致新裝潢損毀，產生雙倍成本。
                        </div>
                    </details>
                </div>
            </article>

            <article class="mb-24 scroll-mt-24 reveal" id="section-3">
                <div class="flex items-end gap-4 mb-8 border-b border-brand-300 pb-4">
                    <span class="text-4xl font-serif text-brand-gold opacity-30">03</span>
                    <h2 class="text-2xl font-serif text-brand-800 tracking-wide">預售屋客變攻略</h2>
                </div>

                <div class="bg-white border border-brand-100 p-8 rounded-lg mb-8 shadow-sm">
                    <div class="mb-6">
                        <h4 class="text-brand-800 text-lg font-bold mb-2">時程關鍵點控管</h4>
                        <p class="text-brand-500 text-sm leading-loose">
                            建議於建商規定之客變期限前 <span class="text-brand-gold font-bold">2-3 個月</span> 介入。本所將代位對接建商工務體系，確保平面格局、水電配置與插座定位之技術圖面產出精度。
                        </p>
                    </div>
                    <div class="mb-6">
                        <h4 class="text-brand-800 text-lg font-bold mb-2">倒推式機能規劃</h4>
                        <p class="text-brand-500 text-sm leading-loose">
                            不以毛胚圖紙為唯一依據，而是預先核定業主之家具尺度與家電規格，反向推算插座與管路位移。確保交屋後機能完美對位，杜絕斷層。
                        </p>
                    </div>
                    <div>
                        <h4 class="text-brand-800 text-lg font-bold mb-2">資產價值優化</h4>
                        <p class="text-brand-500 text-sm leading-loose">
                            於建築階段退除不必要之隔間牆或標配建材，精算走道佔比。將每一毛購屋坪價轉化為實際可用之居住坪效，實現資產價值最大化。
                        </p>
                    </div>
                </div>

                <div class="space-y-3">
                    <details id="faq-customer-change-roi" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：客變設計費之行情為何？其投資報酬率如何核算？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            本所客變設計費採按坪計費（約 <strong class="font-normal">$2,000 - $3,500 / 坪</strong>）。該費用之專業價值在於省下交屋後的<strong class="font-normal">「拆除費、廢棄物清運費與重建工程費」</strong>。是一項具備極高避險效益的資產投資。
                        </div>
                    </details>
                    <details id="faq-why-designer-for-change" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：為什麼預售屋客變必須由設計師代位對接？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            客變涉及精密之<strong class="font-normal">水電迴路圖、弱電配置圖與空調管線預埋圖</strong>。若無專業設計師將生活慣性轉化為精確之技術圖面，交屋後常發生水電位置不符使用需求，導致保固失效與結構受損風險。
                        </div>
                    </details>
                    <details id="faq-change-revisions" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：客變方案確認後是否具備修正空間？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            建商對於客變手續通常具備<strong class="font-normal">「一次性簽署」</strong>之限制。因此，客變規劃必須落實「一次到位」。若錯過期限，則需承擔交屋後高額之工程拆改費用。
                        </div>
                    </details>
                    <details id="faq-change-priorities" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：若預算有限，客變階段應優先執行哪些項目？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            應優先執行<strong class="font-normal">「格局變更」與「電力/給排水預埋」</strong>。這類隱蔽工程涉及建築體結構，交屋後的改動成本最高。至於地磚、漆色等裝飾性標配，可依預算現況評估是否保留或退除。
                        </div>
                    </details>
                </div>
            </article>

            <article class="mb-24 scroll-mt-24 reveal" id="section-4">
                <div class="flex items-end gap-4 mb-8 border-b border-brand-300 pb-4">
                    <span class="text-4xl font-serif text-brand-gold opacity-30">04</span>
                    <h2 class="text-2xl font-serif text-brand-800 tracking-wide">軟裝家具挑選 & 空間尺度</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="p-6 bg-brand-50 border-t-2 border-brand-800">
                        <h4 class="font-bold text-brand-800 mb-2">7：3 裝修權重分配</h4>
                        <p class="text-xs text-brand-500 leading-relaxed">落實「7 成硬裝結構、3 成軟裝陳設」。硬裝負責物理性能，軟裝負責感官介面，杜絕過度裝修。</p>
                    </div>
                    <div class="p-6 bg-brand-50 border-t-2 border-brand-500">
                        <h4 class="font-bold text-brand-800 mb-2">靜態生活場景模組</h4>
                        <p class="text-xs text-brand-500 leading-relaxed">依據作息設定「特定場景」，如「主人椅情境」。透過光影預演與尺度計算，落實生活儀式感。</p>
                    </div>
                    <div class="p-6 bg-brand-50 border-t-2 border-brand-500">
                        <h4 class="font-bold text-brand-800 mb-2">人體工學體感選購</h4>
                        <p class="text-xs text-brand-500 leading-relaxed">家具挑選須經「物理數據」核對。建議選用低甲醛板材家具，並執行壓力測試確保舒適與健康。</p>
                    </div>
                    <div class="p-6 bg-brand-50 border-t-2 border-brand-800">
                        <h4 class="font-bold text-brand-800 mb-2">倒推式色彩與材質統籌</h4>
                        <p class="text-xs text-brand-500 leading-relaxed">在 3D 製圖階段即進行色彩權重計算。透過光學模擬，解決環境色溫產生的視覺誤差。</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <details id="faq-budget-allocation" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：軟裝預算與硬裝工程如何進行合理的權重分配？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            針對新成屋，理想配置程序為：<strong class="font-normal">「硬裝工藝 50%、基礎設備 30%、軟裝氛圍 20%」</strong>。建議將預算優先配置於「沙發、床墊、餐椅」等長時間接觸類別。
                        </div>
                    </details>
                    <details id="faq-furniture-testing" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：為什麼必須現場試坐，不能直接採購網路高顏值的家具？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            美感由視覺判定，但質感由身體數據判定。設計師的責任是精算家具與動線的<strong class="font-normal">「安全間距」</strong>，並確保家具內材的回彈率與業主的體感契合。
                        </div>
                    </details>
                    <details id="faq-soft-decor-timing" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：軟裝家具的最佳進場時間點為何？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            軟裝進場基準點設定於<strong class="font-normal">「油漆工程結束、室內細部清潔完成後」</strong>。透過嚴謹的進度控管，確保家具在最純淨的環境下定位。
                        </div>
                    </details>
                    <details id="faq-soft-planning-start" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：軟裝規劃在整體裝修流程中的切入點為何？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            必須在<strong class="font-normal">「平面配置階段」</strong>同步啟動。大型家具的尺寸與位置，直接影響插座高度、弱電定位與空調出風口走向。
                        </div>
                    </details>
                </div>
            </article>

            <article class="mb-24 scroll-mt-24 reveal" id="section-5">
                <div class="flex items-end gap-4 mb-8 border-b border-brand-300 pb-4">
                    <span class="text-4xl font-serif text-brand-gold opacity-30">05</span>
                    <h2 class="text-2xl font-serif text-brand-800 tracking-wide">統包還是設計師？適合自己的才是最佳選擇</h2>
                </div>

                <div class="overflow-x-auto mb-8">
                    <table class="w-full text-sm text-left text-brand-500 border border-brand-200">
                        <caption class="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">統包工程與室內設計師服務比較表</caption>
                        <thead class="text-xs text-brand-800 uppercase bg-brand-50">
                            <tr>
                                <th scope="col" class="px-6 py-3 border-r border-brand-200">比較項目</th>
                                <th scope="col" class="px-6 py-3 border-r border-brand-200">統包工程</th>
                                <th scope="col" class="px-6 py-3">室內設計師</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-brand-100">
                            <tr class="bg-white">
                                <th scope="row" class="px-6 py-4 font-medium text-brand-800 border-r border-brand-100">管理參與度</th>
                                <td class="px-6 py-4 border-r border-brand-100">施工者管理模式 (效率優先)</td>
                                <td class="px-6 py-4">管理代理人模式 (精度優先)</td>
                            </tr>
                            <tr class="bg-white">
                                <th scope="row" class="px-6 py-4 font-medium text-brand-800 border-r border-brand-100">圖面溝通</th>
                                <td class="px-6 py-4 border-r border-brand-100">平面圖 + 現場放樣</td>
                                <td class="px-6 py-4">3D 預演圖 + 技術施工圖</td>
                            </tr>
                            <tr class="bg-white">
                                <th scope="row" class="px-6 py-4 font-medium text-brand-800 border-r border-brand-100">驗收機制</th>
                                <td class="px-6 py-4 border-r border-brand-100">施工方自行驗收</td>
                                <td class="px-6 py-4">設計師代理業主技術驗收</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="space-y-3">
                    <details id="faq-contractor-vs-designer" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：統包與設計師，哪種方式的預算配置更有優勢？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            統包省下設計費，適合預算集中施工。設計師雖增加管理成本，但能降低拆改風險。本質上是將「不確定性」轉化為顯性的<strong class="font-normal">「管理費用」</strong>，屬於避險型的資產投資。
                        </div>
                    </details>
                    <details id="faq-style-decision" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：如果我對居家風格已有定見，是否還需要設計師？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            這是<strong class="font-normal">「執行效率」與「管理預演」</strong>的選擇。能直接指揮工班並判斷工程品質的屋主，統包是高效率路徑；若希望由專業者將想法轉化為可執行的施工圖說，則建議委任設計師。
                        </div>
                    </details>
                    <details id="faq-warranty-service" class="group bg-white border border-brand-200 rounded-lg open:border-brand-500 transition">
                        <summary class="flex justify-between items-center p-5 cursor-pointer font-medium text-brand-800 list-none">
                            <span>Q：兩者在保固與售後服務上有何區別？</span>
                            <span class="transition group-open:rotate-180"><i class="fa-solid fa-chevron-down text-xs text-brand-300"></i></span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-brand-500 font-light leading-loose">
                            兩者皆提供保固。差異在於<strong class="font-normal">「圖資完整度」</strong>。設計師提供完整的竣工圖與水電系統圖，這對未來局部維修時，能提供確切的物理依據。
                        </div>
                    </details>
                </div>
            </article>
`;

const faqPage = () => {
  const breadcrumbSchema = breadcrumb([
    { name: '首頁', url: `${SITE_URL}/` },
    { name: '設計解惑', url: `${SITE_URL}/faq.html` },
  ]);

  const speakableSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "宜蘭室內設計常見問題",
    "url": `${SITE_URL}/faq.html`,
    "speakable": { "@type": "SpeakableSpecification", "cssSelector": [".faq-question", ".faq-answer"] }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_QA_PAIRS.map(p => ({
      "@type": "Question",
      "name": p.q,
      "acceptedAnswer": { "@type": "Answer", "text": p.a }
    }))
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/faq.html" />
    <title>設計解惑 | 宜蘭室內設計費用計算、老屋翻新預算與軟裝配置攻略 | 沐錦空間設計</title>
    <meta name="description" content="沐錦空間設計公開透明報價機制。解析宜蘭新屋裝修、老屋翻新基礎工程預算、預售屋客變流程以及7:3軟裝配置攻略。針對宜蘭多雨氣候提供專業防水與結構建議，比較統包與設計師差異。">
    <meta name="keywords" content="宜蘭室內設計費用, 宜蘭裝潢預算, 實坪計價, 老屋翻新費用, 宜蘭軟裝設計, 宜蘭家具挑選, 裝修比例, 宜蘭室內設計推薦, 統包與設計師差異">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta name="geo.position" content="24.6395;121.7725" />
    <meta name="ICBM" content="24.6395, 121.7725" />
    <meta property="og:title" content="設計解惑 | 沐錦空間設計">
    <meta property="og:description" content="宜蘭室內設計費用、老屋翻新預算與軟裝配置攻略。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/faq.html">
    <meta property="og:image" content="${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp">
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(speakableSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${MUJIN_COMPONENT_CSS}
</head>
<body class="font-sans antialiased flex flex-col min-h-screen">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('faq', '')}

    <main class="flex-grow pt-32 pb-20">
        <div class="container mx-auto px-6 max-w-5xl">
            <nav class="text-xs text-brand-500 mb-12 tracking-wider" aria-label="Breadcrumb">
                <ol class="flex flex-wrap gap-2">
                    <li><a href="index.html" class="hover:text-brand-gold">首頁</a></li>
                    <li class="text-brand-300">/</li>
                    <li class="text-brand-800">設計解惑</li>
                </ol>
            </nav>

            <div class="text-center mb-20 reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Q&A Guide</span>
                <h1 class="font-serif text-3xl md:text-4xl text-brand-800 tracking-widest">設計解惑 & 裝修攻略</h1>
                <div class="w-16 h-px bg-brand-300 mx-auto mt-6"></div>
                <p class="text-brand-500 mt-4 font-light text-sm">公開透明的計費標準與宜蘭在地裝修知識庫</p>
            </div>

            ${FAQ_BODY_HTML}

            ${ctaSection({
              heading: '還有其他想釐清的問題嗎？',
              desc: '看完這些還不夠？歡迎直接聊聊您的案場條件，我們會在 24 小時內回覆。',
              btnText: '預約您的空間改造計畫',
            })}
        </div>
    </main>

    ${footer('')}
    ${COMMON_SCRIPTS}
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
    <script>
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on("init", user => {
                if (!user) {
                    window.netlifyIdentity.on("login", () => {
                        document.location.href = "/admin/";
                    });
                }
            });
        }
    </script>
    ${COOKIE_CONSENT}
</body>
</html>`;
};

// ---------- 首頁 ----------
const HOME_SCHEMA_WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "沐錦空間設計 Mujin Studio",
  "alternateName": "沐錦設計",
  "url": SITE_URL,
  "inLanguage": "zh-TW",
  "publisher": {
    "@type": "Organization",
    "name": "沐錦空間設計 Mujin Studio",
    "logo": { "@type": "ImageObject", "url": `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp` }
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_URL}/portfolio.html?q={search_term_string}` },
    "query-input": "required name=search_term_string"
  }
};

const HOME_SCHEMA_STUDIO = {
  "@context": "https://schema.org",
  "@type": "InteriorDesignStudio",
  "name": "沐錦空間設計 Mujin Studio",
  "alternateName": "沐錦設計",
  "url": SITE_URL,
  "logo": `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.png`,
  "image": `${SITE_URL}/images/yilan-interior-design-minimalist-living-room.jpg`,
  "description": "沐錦空間設計專注於宜蘭與羅東地區的室內設計、老屋翻新及新屋裝修服務。提供鋼構屋規劃與預售屋客變諮詢，打造質感、沉穩的理想生活空間。",
  "telephone": PHONE_HREF,
  "email": EMAIL,
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "冬山路三段465號",
    "addressLocality": "冬山鄉",
    "addressRegion": "宜蘭縣",
    "postalCode": "269",
    "addressCountry": "TW"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 24.6395, "longitude": 121.7725 },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "12:00" }
  ],
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61579849735643",
    "https://www.instagram.com/mujinstudiodesign/"
  ],
  "areaServed": [
    { "@type": "AdministrativeArea", "name": "宜蘭縣" },
    { "@type": "City", "name": "羅東鎮" },
    { "@type": "City", "name": "冬山鄉" },
    { "@type": "City", "name": "宜蘭市" },
    { "@type": "City", "name": "礁溪鄉" },
    { "@type": "City", "name": "五結鄉" }
  ],
  "makesOffer": [
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "老屋翻新", "description": "宜蘭地區老屋與透天厝翻新服務，管線重拉與空間重新規劃" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "新屋裝修", "description": "新成屋空間規劃與室內設計裝修" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "預售屋客變", "description": "協助預售屋格局變更與水電配置客製化" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "農舍規劃設計", "description": "農舍建築室內規劃與設計" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "鋼構屋規劃", "description": "鋼構建築室內規劃與設計" } },
    { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "商業空間設計", "description": "店面、民宿與辦公室空間設計" } }
  ]
};

const homePage = (cases) => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "首頁", "item": `${SITE_URL}/` }
    ]
  };

  return `<!DOCTYPE html>
<html lang="zh-TW" class="scroll-smooth">
<head>
    ${GTM_HEAD}
    ${SHARED_HEAD_BASIC}
    <link rel="canonical" href="${SITE_URL}/" />
    <title>沐錦空間設計 | 宜蘭羅東室內設計推薦 | 老屋翻新 | 預售屋客變 | 鋼構屋規劃</title>
    <meta name="description" content="沐錦空間設計 Mujin Studio 位於宜蘭冬山，專注於宜蘭與羅東地區的室內設計、室內裝修、老屋翻新及新屋裝修服務。我們是推薦的宜蘭室內設計師團隊，提供鋼構屋規劃與預售屋客變諮詢，打造質感、沉穩的理想生活空間。">
    <meta name="keywords" content="宜蘭室內設計, 宜蘭室內空間設計, 宜蘭室內設計推薦, 宜蘭室內設計師, 宜蘭室內設計工作室, 宜蘭室內裝修, 宜蘭舊屋翻新, 宜蘭老屋翻新, 宜蘭老屋翻新推薦, 宜蘭新屋裝修, 宜蘭新屋裝修推薦, 宜蘭鋼構屋, 宜蘭鋼構屋推薦, 宜蘭預售屋客變, 宜蘭預售屋客變推薦, 羅東室內設計, 羅東室內空間設計, 羅東室內設計推薦, 羅東室內設計師, 羅東室內設計工作室, 羅東室內裝修, 羅東舊屋翻新, 羅東老屋翻新, 羅東老屋翻新推薦, 羅東新屋裝修, 羅東新屋裝修推薦, 羅東鋼構屋, 羅東鋼構屋推薦, 羅東預售屋客變, 羅東預售屋客變推薦">
    <meta name="geo.region" content="TW-ILA" />
    <meta name="geo.placename" content="Yilan County" />
    <meta name="geo.position" content="24.6395;121.7725" />
    <meta name="ICBM" content="24.6395, 121.7725" />
    <meta property="og:title" content="沐錦空間設計 | 宜蘭羅東室內設計推薦">
    <meta property="og:description" content="專注於宜蘭與羅東地區的室內設計、老屋翻新及新屋裝修服務。">
    <meta property="og:image" content="${SITE_URL}/images/yilan-interior-design-minimalist-living-room.jpg">
    <meta property="og:url" content="${SITE_URL}/">
    <meta property="og:type" content="website">
    <script type="application/ld+json">${JSON.stringify(HOME_SCHEMA_WEBSITE, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema, null, 2)}</script>
    <script type="application/ld+json">${JSON.stringify(HOME_SCHEMA_STUDIO, null, 2)}</script>
    <link href="styles.css" rel="stylesheet">
    ${MUJIN_COMPONENT_CSS}
    <style>
        @keyframes fadeInUp {
            from { opacity: 0; transform: translate3d(0, 40px, 0); }
            to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-fade-in-up { animation-name: fadeInUp; animation-duration: 1s; animation-fill-mode: forwards; }
    </style>
</head>
<body class="font-sans antialiased selection:bg-brand-500 selection:text-white">
    ${GTM_NOSCRIPT}
    ${FLOATING_ICONS}
    ${header('', '')}

    <!-- Hero Section -->
    <section class="relative h-screen flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 z-0">
            <img src="images/yilan-interior-design-minimalist-living-room.webp" alt="宜蘭室內設計推薦-極簡客廳案例" width="7002" height="4668" class="w-full h-full object-cover" fetchpriority="high" loading="eager">
            <div class="absolute inset-0 bg-stone-900/30"></div>
        </div>
        <div class="relative z-10 text-center text-white px-4">
            <h1 class="font-serif text-3xl md:text-5xl lg:text-6xl mb-6 tracking-widest leading-tight opacity-0 animate-fade-in-up" style="animation-delay: 0.2s;">
                <span class="sr-only">宜蘭室內設計推薦</span>
                回歸純粹，<br class="md:hidden">讓空間回到最適合人的樣子
            </h1>
            <p class="text-sm md:text-base font-light tracking-[0.2em] mb-10 text-stone-200 opacity-0 animate-fade-in-up" style="animation-delay: 0.4s;">
                MUJIN STUDIO INTERIOR DESIGN
            </p>
            <a href="#contact" class="inline-block border border-white px-8 py-3 text-sm tracking-widest hover:bg-white hover:text-brand-900 transition duration-300 opacity-0 animate-fade-in-up" style="animation-delay: 0.6s;">
                預約諮詢
            </a>
        </div>
    </section>

    <!-- About Us -->
    <section id="about" class="py-20 md:py-32 bg-brand-50">
        <div class="container mx-auto px-6">
            <div class="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                <div class="w-full md:w-1/2 md:pl-10 order-2 md:order-1 reveal">
                    <h2 class="font-serif text-2xl md:text-3xl text-brand-800 mb-6 tracking-widest">設計理念</h2>
                    <div class="w-12 h-0.5 bg-brand-500 mb-8"></div>
                    <p class="text-brand-500 leading-loose text-justify mb-6 font-light">
                        沐錦空間設計深耕宜蘭，我們相信空間是生活的容器，應當承載居住者的情感與記憶。
                    </p>
                    <p class="text-brand-500 leading-loose text-justify font-light mb-8">
                        我們擅長運用大地色系與自然材質，將光影的流動引入室內，去除繁複的裝飾，保留材質最純粹的肌理。在繁忙的現代生活中，為您構築一處沉穩、靜謐且充滿溫度的棲身之所。我們專注於
                        <strong>宜蘭老屋翻新</strong>、<strong>預售屋客變</strong>、<strong>新屋裝修</strong>與<strong>農舍規劃設計</strong>
                        服務，致力於實現您對家的想像。
                    </p>
                    <div class="border-t border-brand-200 pt-6">
                        <span class="text-xs tracking-widest text-brand-800 mb-3 block opacity-70">核心服務項目 CORE SERVICES</span>
                        <ul class="flex flex-wrap gap-3 max-w-sm">
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#宜蘭室內設計</li>
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#鋼構屋規劃</li>
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#預售屋客變</li>
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#農舍規劃設計</li>
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#老屋翻新</li>
                            <li class="bg-white border border-brand-200 px-3 py-1 text-sm text-brand-600 tracking-wide rounded-sm shadow-sm">#商業空間設計</li>
                        </ul>
                    </div>
                </div>
                <div class="w-full md:w-1/2 order-1 md:order-2 reveal-scale">
                    <div class="relative overflow-hidden aspect-[4/5] shadow-xl">
                        <img src="images/mujin-studio-design-philosophy-yilan.webp" alt="宜蘭室內設計師推薦-沐錦空間設計理念，擅長運用光影與自然材質" width="4668" height="7002" class="w-full h-full object-cover hover:scale-105 transition duration-700 ease-out" loading="lazy">
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Portfolio -->
    <section id="portfolio" class="py-20 bg-white">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16 reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Success Stories</span>
                <h3 class="font-serif text-3xl text-brand-800 tracking-widest">美好見證</h3>
            </div>
            ${homePortfolioCards(cases)}
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-brand-50">
        <div class="container mx-auto px-6">
            <div class="text-center mb-16 reveal">
                <span class="text-xs tracking-[0.3em] text-brand-500 uppercase block mb-2">Contact</span>
                <h3 class="font-serif text-3xl text-brand-800 tracking-widest">預約諮詢</h3>
                <div class="w-12 h-px bg-brand-300 mx-auto mt-6"></div>
            </div>
            <div class="mj-contact-grid">
                <!-- Info & Map -->
                <div class="mj-contact-col reveal">
                    <div class="space-y-6 mb-8">
                        <div class="flex items-start">
                            <i class="fa-solid fa-location-dot mt-1.5 w-6 text-brand-500 text-center"></i>
                            <div class="ml-4">
                                <h4 class="text-brand-800 font-medium tracking-wider mb-1">地址</h4>
                                <p class="text-brand-500 font-light"><a href="https://maps.app.goo.gl/jWy5dEc5q29SDvjr5" target="_blank" rel="noopener noreferrer" class="hover:text-brand-gold transition">宜蘭縣冬山鄉冬山路三段465號 <i class="fa-solid fa-arrow-up-right-from-square text-xs ml-1 opacity-70"></i></a></p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <i class="fa-solid fa-phone mt-1.5 w-6 text-brand-500 text-center"></i>
                            <div class="ml-4">
                                <h4 class="text-brand-800 font-medium tracking-wider mb-1">電話</h4>
                                <p class="text-brand-500 font-light"><a href="tel:${PHONE_HREF}" class="hover:text-brand-gold transition">${PHONE_DISPLAY}</a></p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <i class="fa-solid fa-envelope mt-1.5 w-6 text-brand-500 text-center"></i>
                            <div class="ml-4">
                                <h4 class="text-brand-800 font-medium tracking-wider mb-1">Email</h4>
                                <p class="text-brand-500 font-light"><a href="mailto:${EMAIL}" class="hover:text-brand-gold transition">${EMAIL}</a></p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <i class="fa-solid fa-clock mt-1.5 w-6 text-brand-500 text-center"></i>
                            <div class="ml-4">
                                <h4 class="text-brand-800 font-medium tracking-wider mb-1">營業時間</h4>
                                <p class="text-brand-500 font-light">週一~週五 09:00~18:00</p>
                                <p class="text-brand-500 font-light">週六 09:00~12:00</p>
                            </div>
                        </div>
                    </div>
                    <div class="mj-contact-map">
                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.7876807897854!2d121.7725!3d24.6395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3467e67abd43e467%3A0x5ee8270c392fa7bc!2z5rKQ6Yym56m66ZaT6Kit6KiIIE11amluIFN0dWRpbw!5e0!3m2!1szh-TW!2stw!4v1737557123456!5m2!1szh-TW!2stw" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="沐錦空間設計 Mujin Studio 宜蘭室內設計 Google 地圖"></iframe>
                    </div>
                </div>
                <!-- Contact Form -->
                <div class="mj-contact-col reveal">
                    ${CONTACT_FORM}
                </div>
            </div>
        </div>
    </section>

    ${footer('')}
    ${COMMON_SCRIPTS}
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
    <script>
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on("init", user => {
                if (!user) {
                    window.netlifyIdentity.on("login", () => {
                        document.location.href = "/admin/";
                    });
                }
            });
        }
    </script>
    ${COOKIE_CONSENT}
</body>
</html>`;
};

// ---------- sitemap ----------
function writeSitemap(cases, posts = []) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
    { loc: `${SITE_URL}/portfolio.html`, priority: '0.9' },
    { loc: `${SITE_URL}/pricing.html`, priority: '0.9' },
    { loc: `${SITE_URL}/process.html`, priority: '0.9' },
    { loc: `${SITE_URL}/faq.html`, priority: '0.7' },
    { loc: `${SITE_URL}/blog.html`, priority: '0.8' },
    { loc: `${SITE_URL}/privacy.html`, priority: '0.3' },
    { loc: `${SITE_URL}/terms.html`, priority: '0.3' },
    ...cases.map(c => ({ loc: `${SITE_URL}/portfolio/${c.slug}.html`, priority: '0.8' })),
    ...posts.map(p => ({ loc: `${SITE_URL}/blog/${p.slug}.html`, priority: '0.7' })),
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

  // 寫 pricing.html
  fs.writeFileSync(path.join(ROOT, 'pricing.html'), pricingPage(), 'utf8');
  console.log('[build] pricing.html 已寫入');

  // 寫 privacy / terms
  fs.writeFileSync(path.join(ROOT, 'privacy.html'), privacyPage(), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'terms.html'), termsPage(), 'utf8');
  console.log('[build] privacy.html / terms.html 已寫入');

  // 寫 faq.html
  fs.writeFileSync(path.join(ROOT, 'faq.html'), faqPage(), 'utf8');
  console.log('[build] faq.html 已寫入');

  // 寫 blog 列表與詳情頁
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.readdirSync(BLOG_DIR).forEach(f => {
    if (f.endsWith('.html')) fs.unlinkSync(path.join(BLOG_DIR, f));
  });

  const posts = readAllBlogPosts();
  console.log(`[build] 已讀取 ${posts.length} 篇沐錦筆記`);
  posts.forEach(p => {
    fs.writeFileSync(path.join(BLOG_DIR, `${p.slug}.html`), blogDetailPage(p, posts), 'utf8');
    console.log(`[build]   + blog/${p.slug}.html`);
  });
  fs.writeFileSync(path.join(ROOT, 'blog.html'), blogListPage(posts), 'utf8');
  console.log('[build] blog.html 已寫入');

  // 寫首頁
  fs.writeFileSync(path.join(ROOT, 'index.html'), homePage(cases), 'utf8');
  console.log('[build] index.html 已寫入');

  // sitemap
  writeSitemap(cases, posts);

  console.log('[build] 完成');
}

main();
