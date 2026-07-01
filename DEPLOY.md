# VOCA 部署到免費 HTTPS(手機安裝 PWA + 口說麥克風)

App 是純靜態網頁,只要放上任何 **HTTPS** 網址即可。口說評分(麥克風)與「加入主畫面」都需要 HTTPS,`file://` 直接開無法用麥克風。

執行時只需要這 4 個檔:`index.html`、`words.js`、`words-pack1.js`、`manifest.json`、`sw.js`。
(`tools/`、`words_raw/` 只是製作單字用,不必上傳。)

---

## 方法 A:Netlify Drop(最快,約 2 分鐘,免 CLI)

1. 電腦開瀏覽器到 **https://app.netlify.com/drop**
2. 把整個 `EN` 資料夾**拖曳**進網頁的虛線框
3. 等幾秒 → 得到一個 `https://xxxx.netlify.app` 網址
4. 手機用瀏覽器開這個網址 → 選單選「**加入主畫面**」→ 完成,像 App 一樣全螢幕、可離線、可用麥克風

> 想要固定網址/之後可更新,可免費註冊 Netlify 帳號把這個站「認領」。

---

## 方法 B:GitHub Pages(永久免費,需 GitHub 帳號)

我已在本資料夾 `git init` 並完成第一次 commit,接著:

1. 到 **github.com** 建一個新的 repository(例如 `voca`,設 Public)
2. 在這個資料夾執行(把 `你的帳號` 換掉):
   ```bash
   git remote add origin https://github.com/你的帳號/voca.git
   git branch -M main
   git push -u origin main
   ```
   (第一次 push 會要求登入/貼上 GitHub Personal Access Token)
3. GitHub repo → **Settings → Pages** → Source 選 **Deploy from a branch** → Branch 選 **main** / **/(root)** → Save
4. 等 1~2 分鐘,得到 `https://你的帳號.github.io/voca/`
5. 手機開這個網址 →「加入主畫面」

> App 用相對路徑,放在子路徑(/voca/)也能正常運作。

---

## 之後要更新內容(例如又擴充了單字)

- Netlify:再拖一次資料夾(或用認領後的站台重新部署)
- GitHub Pages:
  ```bash
  git add -A
  git commit -m "update words"
  git push
  ```
