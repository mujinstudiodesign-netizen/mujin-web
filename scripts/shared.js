/**
 * 沐錦空間設計 共用片段（Partials）
 *
 * 把 build.js 內重複的 head、GTM、header、footer、浮動 icon、
 * 共用 script 抽到此檔。新增頁面時只要 import 即可，不再複製貼上。
 *
 * 設計概念：模仿 Vite + Handlebars 的 partial 概念，但保持純 Node.js
 * 不引入任何套件相依，符合沐錦「零依賴部署」的原則。
 */

const SITE_URL = 'https://mujin.tw';

// ============== Head ==============
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

// 補充預編 styles.css 沒有的 Tailwind utilities（案例列表 / 詳情頁 / process 共用）
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

// ============== Google Tag Manager ==============
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

// ============== 浮動 icons ==============
const FLOATING_ICONS = `
    <div class="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2">
        <a href="https://www.facebook.com/profile.php?id=61579849735643" target="_blank" rel="noopener noreferrer" title="Facebook" class="float-icon w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-facebook-f text-xl"></i></a>
        <a href="https://www.instagram.com/mujinstudiodesign/" target="_blank" rel="noopener noreferrer" title="Instagram" class="float-icon w-12 h-12 bg-instagram text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-instagram text-xl"></i></a>
        <a href="https://qr-official.line.me/gs/M_153kwalu_GW.png?oat_content=qr" target="_blank" rel="noopener noreferrer" title="Line" class="float-icon w-12 h-12 bg-[#06C755] text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-brands fa-line text-2xl"></i></a>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdPI2DRVGC1Qtm0VXkKpeF2lWFtzxVMVBO056vxgE2jp5PdsA/viewform" target="_blank" rel="noopener noreferrer" title="線上預約" class="float-icon w-12 h-12 bg-brand-gold text-white flex items-center justify-center rounded-l-lg shadow-lg"><i class="fa-solid fa-calendar-check text-xl"></i></a>
    </div>
`;

// ============== Header (含手機選單) ==============
/**
 * @param active - 'portfolio' | 'process' | 'faq' | ''
 * @param basePath - 相對於當前頁面的根路徑（首頁 '' / 子頁 '../'）
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
                ${link('portfolio', 'portfolio.html', '美好見證')}
                ${link('process', 'process.html', '服務流程')}
                ${link('faq', 'faq.html', '設計解惑')}
            </nav>
            <button id="mobile-menu-btn" class="md:hidden text-brand-800 focus:outline-none"><i class="fa-solid fa-bars text-2xl"></i></button>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-brand-50 border-t border-brand-200 shadow-lg absolute w-full left-0 top-full">
            <div class="px-6 py-4 flex flex-col space-y-4 text-center font-light text-brand-800">
                ${mobileLink('portfolio', 'portfolio.html', '美好見證')}
                ${mobileLink('process', 'process.html', '服務流程')}
                ${mobileLink('faq', 'faq.html', '設計解惑')}
            </div>
        </div>
    </header>
`;
};

// ============== Footer ==============
const FOOTER = `
    <footer class="bg-brand-900 text-brand-100 py-10 border-t border-brand-800 mt-auto">
        <div class="container mx-auto px-6 text-center md:text-left">
            <p>&copy; <span id="year">2024</span> Mujin Studio. All Rights Reserved.</p>
            <p class="text-xs text-brand-300 mt-2">宜蘭縣冬山鄉冬山路三段465號 | 宜蘭室內設計推薦 | 羅東舊屋翻新</p>
            <p class="text-xs text-brand-300 mt-1">營業時間：週一~週五 09:00~18:00 / 週六 13:00~18:00</p>
        </div>
    </footer>
`;

// ============== 共用 scripts ==============
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

// ============== Schema 工廠（補強 Top 5%）==============

/** WebSite + SearchAction（指引 Google 用站內搜尋介接）*/
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "沐錦空間設計 Mujin Studio",
  "url": SITE_URL,
  "inLanguage": "zh-TW",
  "publisher": {
    "@type": "Organization",
    "name": "沐錦空間設計 Mujin Studio",
    "logo": {
      "@type": "ImageObject",
      "url": `${SITE_URL}/images/mujin-studio-yilan-interior-design-logo.webp`
    }
  }
};

/** BreadcrumbList builder */
const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((it, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": it.name,
    "item": it.url
  }))
});

/** Speakable for FAQ page */
const faqSpeakable = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".faq-question", ".faq-answer"]
  }
};

module.exports = {
  SITE_URL,
  SHARED_HEAD_BASIC,
  SUPPLEMENTAL_CSS,
  GTM_HEAD,
  GTM_NOSCRIPT,
  FLOATING_ICONS,
  header,
  FOOTER,
  COMMON_SCRIPTS,
  websiteSchema,
  breadcrumb,
  faqSpeakable,
};
