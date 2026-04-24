# 沐錦空間設計 — 後台上線步驟

這份文件給 **Hank（開發者）**看。老闆用的後台使用說明在下方第三段。

---

## 你（Hank）要做的事：一次性設定

### 1. 把網站放到 GitHub

目前這資料夾還不是 git repo。先建立：

```bash
cd D:/Users/Administrator/Downloads/Hank-agent/mujin_web
git init
git add .
git commit -m "chore: 加入 Decap CMS 後台與靜態生成"
git branch -M main
```

到 GitHub 開一個 repo（建議命名 `mujin-web`，Private 或 Public 都可），然後：

```bash
git remote add origin https://github.com/<你的帳號>/mujin-web.git
git push -u origin main
```

### 2. Netlify 連接到這個 repo

- 到 Netlify Dashboard → **Add new site** → **Import from Git** → 選剛剛那個 repo
- **Build command**：`npm run build`（netlify.toml 已設定，會自動讀）
- **Publish directory**：`.`
- Deploy 完成後，原本 mujin.tw 若是用另一個 Netlify site 部署的，記得把 domain 轉移過來（或在新 site 綁定 custom domain）。

### 3. 啟用 Netlify Identity（給老闆登入用）

- 進入 site → **Integrations** 分頁 → 找到 **Identity**（或左側 **Site configuration** → **Identity**）→ **Enable Identity**
- Registration preferences：**選 Invite only**（避免陌生人自己註冊）
- External providers（可選）：可開 Google 登入，讓老闆用 Gmail 直接登入，免記密碼

### 4. 啟用 Git Gateway

- 同一個 Identity 頁面往下找 **Services** → **Git Gateway** → **Enable Git Gateway**
- 這會讓老闆在後台按「儲存」時，Netlify 幫他代筆 commit 到 GitHub（老闆不用自己有 GitHub 帳號）

### 5. 邀請老闆

- **Identity** 分頁 → **Invite users** → 輸入老闆的 Email
- 老闆會收到啟用信，點連結設密碼後就能用 `https://mujin.tw/admin/` 登入

### 6. 驗證

- 打開 `https://mujin.tw/admin/` 自己測一次：登入 → 看到「精選案例」清單 → 編一筆 → 儲存 → 幾分鐘後看網站是否更新

---

## 未來新增 / 修改案例的流程

**老闆：只需用後台**
- 前往 `https://mujin.tw/admin/` → 登入 → 編輯 → 儲存

**Hank：什麼都不用做**
- Netlify 會自動 `git commit` → 自動 `npm run build` → 自動部署
- 5 分鐘內新案例就會出現在首頁 + 案例列表頁 + 自動生成獨立詳情頁 + sitemap 自動更新

---

## 給老闆的後台使用說明（可複製貼給老闆）

### 登入後台

1. 打開 https://mujin.tw/admin/
2. 輸入 Email 和密碼（第一次要先去信箱點啟用信設密碼）

### 新增案例

1. 左側選單點「**精選案例**」
2. 右上角點「**新增案例**」
3. 依序填寫：
   - **網址代碼**：英文小寫，用連字號分隔，例如 `toucheng-seaside-home`（**建立後就不要改**，改了會影響 Google 收錄）
   - **案例名稱**：例「頭城 • 海濱寓所」
   - **分類**：住宅 / 商業 二選一
   - **地區、年份、坪數、案型**：依實際狀況
   - **封面圖片**：點上傳，建議寬度 1200px 以上
   - **封面圖片描述 (alt)**：給 Google 看的描述，例「頭城海濱現代簡約客廳」
   - **簡述**：1-2 句話，會顯示在案例列表卡片上
   - **內頁相簿**：逐張上傳內頁多圖，每張要填 alt
   - **設計筆記**：一段文字介紹，說明設計想法、材料、為誰設計、為什麼這樣處理
   - **排序**：數字越小越前面（首頁只顯示前 6 名）
   - **是否上架**：預設是 ✓，若要暫時下架改成空白
4. 按右上角「**發佈**」→ 「**立刻發佈**」
5. 等 3-5 分鐘，打開 `https://mujin.tw/portfolio.html` 就能看到

### 修改案例

1. 左側「精選案例」清單 → 點要改的那筆
2. 改完 → 右上「發佈」→「立刻發佈」
3. 等 3-5 分鐘

### 隱藏 / 下架案例

1. 進入案例 → 把「**是否上架**」從 ✓ 改成空白
2. 發佈 → 案例會從網站上移除，但資料還在（之後想重新上架再打勾即可）

### 刪除案例（少用）

1. 進入案例 → 右上「**刪除項目**」→ 確認
2. 注意：這會永久刪除，建議先用「下架」而不是刪除

### 注意事項

- **網址代碼不要改**。一旦案例上線，Google 會記錄這個網址。改了等於舊網址失效 → 之前收藏或分享的連結會壞掉
- **圖片建議先壓縮**：可用 https://squoosh.app/ 壓成 WebP，寬度 1200-1600px，檔案 < 300KB
- **簡述別太長**：1-2 句話就好，這是列表頁給人快速掃的
- **設計筆記是重點**：這段是 Google 判斷你專業度的關鍵。寫屋主的需求、你做了什麼、為什麼。不要只寫材料清單

---

## 技術細節（Hank 備忘）

- **資料格式**：JSON，存在 `content/portfolio/` 資料夾
- **生成**：`npm run build` → `node scripts/build.js` → 自動產：
  - `portfolio.html`（列表頁）
  - `portfolio/[slug].html`（每筆詳情頁）
  - `index.html` 精選案例區塊替換
  - `sitemap.xml` 更新
- **模板全部寫在 `scripts/build.js`**：單檔好讀好改
- **樣式**：沿用 `styles.css`（預編 Tailwind），build.js 補了幾個 utility 的 inline CSS
- **Swiper**：案例詳情頁的 hero 輪播用 Swiper CDN
- **想本機預覽**：`npm run build` 後用任何靜態伺服器開即可，例 `python -m http.server` 或 VS Code Live Server

### 案例排序邏輯

- `order` 數字越小越前面
- 同時顯示於：首頁（前 6 筆）、portfolio.html（全部）
- `published: false` 的不會顯示

### 未來擴充

- 若案例超過 12 筆，可考慮在 `portfolio.html` 加分類篩選（Residential / Commercial）
- 若要加標籤系統，在 config.yml 加一個 `tags` 欄位即可
- 若要做中英雙語，Decap CMS 支援 i18n，再擴充一次就好
