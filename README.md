# LL — 多語單字學習 App(交接文件)

一個純靜態網頁 PWA:英文單字卡 + SRS 間隔複習 + 口說評分 + 生活例句,支援 **英 / 德 / 法 / 日 / 粵(廣東話)** 語言切換。手機瀏覽器「加入主畫面」即可像 App 一樣使用、離線複習、麥克風口說。

> 本文件給接手的人(工程師或 AI 助理)。照著即可繼續擴充內容或改功能。
> **換帳號 / 換人接手** → 先看 [`HANDOFF.md`](HANDOFF.md)(取得專案、環境設定、給新 AI 的啟動提示詞);目前進度斷點看 [`PROGRESS.md`](PROGRESS.md)。

---

## 1. 目前狀態(2026-07)

| 項目 | 現況 |
|---|---|
| 英文單字 | **3096 字**(`words.js` 50 + `words-pack1.js` 3046) |
| 多語翻譯 | **德/法/日 各 3096 字齊全**(`langs-pack1.js`),每字每語言 2 例句;**粵語建置中** |
| KK 音標 | 由 CMUdict 校正(`tools/apply-cmudict.js`) |
| 部署 | GitHub `wdwbw/Learning_EN`,Pages 網址 `https://wdwbw.github.io/Learning_EN/` |
| 待辦 | 英文(+三語)擴到 5000 → 10000 |

**進行中的目標**:先把英文補到常用 5000,再到 10000;新增的英文字要再跑翻譯管線補齊德/法/日。

---

## 2. 檔案結構

### 執行時需要的(部署只需這些)
| 檔案 | 作用 |
|---|---|
| `index.html` | 整個 App(UI + 學習引擎 + 語音 + 雲端同步),單檔 |
| `words.js` | 種子 50 字(`window.SEED_WORDS = [...]`) |
| `words-pack1.js` | 擴充英文字,`window.SEED_WORDS = (window.SEED_WORDS||[]).concat([...])` |
| `langs-pack1.js` | 多語翻譯,`window.LL_LANGS = Object.assign(...)`,以英文 id 對應 de/fr/ja |
| `manifest.json` | PWA 設定(名稱 LL、圖示、加入主畫面) |
| `sw.js` | Service Worker,離線快取。**改版記得把新檔加進 ASSETS 並升 CACHE 版號** |

### 製作工具(不影響執行,可不部署)
| 路徑 | 作用 |
|---|---|
| `words_raw/*.json` | 英文擴充的原始批次(每檔一個 `[{word,kk,pos,meaning,examples,img,theme,level}]`) |
| `trans/*.json` | 翻譯批次(每檔一個 `[{id, de, fr, ja}]`) |
| `tools/assemble-all.js` | 讀 `words_raw/*` → 去重、正規化 KK、重編號 → 產出 `words-pack1.js` |
| `tools/assemble-langs.js` | 讀 `trans/*` → 合併 → 產出 `langs-pack1.js` |
| `tools/apply-cmudict.js` | 用 CMUdict 重算 KK 音標,套用到 `words.js` 與 `words-pack1.js` |
| `tools/cmudict.dict` | CMU 發音字典(3.6MB,已 gitignore;需要時從 github.com/cmusphinx/cmudict 下載 `cmudict.dict`) |
| `DEPLOY.md` | 部署教學(Netlify Drop / GitHub Pages) |

---

## 3. 資料格式(Schema)

**英文字物件**(`words.js` / `words-pack1.js`):
```json
{"id":"p0001","word":"airport","kk":"[ˈɛrˌpɔrt]","pos":"n.","meaning":"機場",
 "examples":[{"en":"...","zh":"..."},{"en":"...","zh":"..."}],
 "img":"airport","theme":"旅行","level":1}
```

**多語物件**(`langs-pack1.js`,`LL_LANGS[英文id]`):
```json
{"de":{"word":"der Flughafen","ipa":"[...]","examples":[{"s":"德語句","zh":"繁中"},{...}]},
 "fr":{"word":"l'aéroport","ipa":"[...]","examples":[{"s":"...","zh":"..."},{...}]},
 "ja":{"word":"空港","kana":"くうこう","romaji":"kūkō","examples":[{"s":"...","zh":"..."},{...}]},
 "yue":{"word":"機場","jyutping":"gei1 coeng4","examples":[{"s":"香港口語句","zh":"中文意思"},{...}]}}
```
各語言音標欄位:德/法用 `ipa`、日語用 `kana`+`romaji`、**粵語用 `jyutping`(粵拼)**。新增語言時在 `index.html` 的 `LANG_META` 加一筆(含 `tts` 語系,如粵語 `zh-HK`),`W_phon()` 與 `assemble-langs.js` 的 `cleanLangObj()` 各加一個分支即可。
App 內:非英語模式時,卡片正面顯示該語言的 `word` + 音標(日語顯示 kana・romaji),背面例句用該語言的 `examples`(`s`=句子,`zh`=中文),**中文意思 `meaning` 沿用英文字的**。各語言 SRS 進度獨立(localStorage key 加 `@lang`)。

---

## 4. 三條產生管線(如何繼續灌內容)

> 用「子代理各自把結果寫成 JSON 檔 → 跑組裝腳本」的模式,資料不經過對話上下文,可規模化。以下用 Claude Code 的 subagent 或任何能寫檔的 LLM 皆可。

### A. 擴充英文字
1. 每個代理產生 ~50 個某主題的新字,寫成純 JSON 陣列到 `words_raw/<名稱>.json`。物件欄位見 §3。**產生時避開已存在的字**(可讓代理讀現有字或事後靠去重)。
2. 跑組裝:
   ```bash
   node tools/assemble-all.js
   ```
   會自動對種子 + 所有 `words_raw/*` 全域去重、正規化 KK、依字母重編號 id(p0001…),輸出 `words-pack1.js`,並印出各檔保留數與主題分布。
3. (可選)校正 KK:`node tools/apply-cmudict.js`(需先放好 `tools/cmudict.dict`)。

**代理提示詞範本**(英文擴充):
> 產生「<主題>」50 個常用英文字。輸出 JSON 陣列,每物件:word, kk(KK音標美式方括號), pos, meaning(繁中), examples(2個{en,zh}生活例句), img(英文圖像關鍵字), theme(固定"<主題>"), level(1/2/3)。用 Write 寫純 JSON(可 JSON.parse、無 markdown)到 `words_raw/<檔名>.json`,完成只回 DONE。

### B. 翻譯成德/法/日
1. 每個代理負責一段英文字(依索引),先讀出清單:
   ```bash
   node -e "const fs=require('fs');const w={};new Function('window',fs.readFileSync('words.js','utf8'))(w);new Function('window',fs.readFileSync('words-pack1.js','utf8'))(w);console.log(JSON.stringify(w.SEED_WORDS.slice(START,END).map(x=>({id:x.id,word:x.word,meaning:x.meaning}))))"
   ```
2. 對每字產生翻譯(格式見 §3,例句欄位用 `s`/`zh`),寫成 `[{id, de, fr, ja}]` 到 `trans/t_<START>.json`。
   - **粵語**同理:寫 `[{id, yue:{word,jyutping,examples}}]` 到 `trans/y_<START>.json`。`assemble-langs.js` 會依 id 把各語言(不論在哪個檔)合併起來,所以粵語可獨立於 de/fr/ja 補。
3. 跑組裝:
   ```bash
   node tools/assemble-langs.js
   ```
   輸出 `langs-pack1.js`,並印出覆蓋詞數與各語言數。
4. 檢查覆蓋率(找出還沒翻的英文字):
   ```bash
   node -e "const fs=require('fs');const w={};new Function('window',fs.readFileSync('words.js','utf8'))(w);new Function('window',fs.readFileSync('words-pack1.js','utf8'))(w);const g={};new Function('window',fs.readFileSync('langs-pack1.js','utf8'))(g);const miss=w.SEED_WORDS.filter(x=>{const e=g.LL_LANGS[x.id];return !e||!e.de||!e.fr||!e.ja}).map((x,i)=>x.id);console.log('缺',miss.length,miss.slice(0,20).join(','))"
   ```

### C. 每次改完內容
```bash
node tools/assemble-all.js      # 若動了英文
node tools/assemble-langs.js    # 若動了翻譯
git add -A && git commit -m "..." && git push
```
GitHub Pages 會自動重新部署。

---

## 5. 續作路線圖 & Token 估算

**目標:英文 3096 → 5000 → 10000,新字補三語。**

實測單位成本(本專案 Claude subagent 輸出 tokens):
- 英文生成:每 50 字 ≈ 45k tokens(≈ 900/字)
- 三語翻譯:每 30 字 ≈ 48k tokens(≈ 1,600/字)

| 里程碑 | 英文(含去重) | +三語 | 合計(約) |
|---|---|---|---|
| →5000(+1900 英文) | ~2.5–2.9M | +3.0M | ~5.5M |
| →10000(+6900 英文) | ~9M | +11M | ~20M |

**注意事項**
- **帳號用量上限**:大量 fan-out 一輪跑不完會中斷(訊息會顯示重置時間),分批 / 跨額度週期續跑即可。管線都是冪等的(以檔案為單位),重跑不會重複。
- **去重率隨字數上升**:越後面越多重複字,越難湊到「常用字」;實用生活字建議 ~4000–4500 CP 值最高。
- 用 Claude Code 時,可用 **Workflow**(背景一次 fan-out 多個翻譯塊)或逐批 **Agent**;每個 subagent 記得指定 `agentType: 'general-purpose'` 才有 Write/Bash。

---

## 6. App 功能速覽(給要改功能的人)

全部在 `index.html`,無框架、無外部相依(圖片用 loremflickr,可離線降級)。
- **今日 / 複習**:SM-2 精簡 SRS(`grade()`、`getProg()`、`pk()` 做語言分離的進度 key)
- **口說**:Web Speech API,`speak()` 依 `uiLang` 切 tts 語系並挑自然嗓音;`scoreSpeech()` 逐字/逐詞比對(日語逐字、德法保留重音)
- **單字庫 / 匯入**:支援貼 JSON/CSV 匯入
- **統計**:近 7 日、主題進度
- **設定 → 雲端同步**:Supabase REST(表 `voca_sync`),填 URL/anon key/同步碼即可跨裝置同步;教學內建在設定頁
- **語言切換**:頂部 EN/DE/FR/JA;`switchLang()`、`W_word()/W_phon()/W_examples()` 是取「目前語言顯示欄位」的關鍵函式

**驗證方式**:改完用本機靜態伺服器開(見 `.claude/launch.json`,`python -m http.server 5050`),切換語言、翻卡、確認 console 無錯。改 `index.html`/`words*.js` 後,若在手機上開過,記得清 Service Worker 快取或升 `sw.js` 的 `CACHE` 版號。

---

## 7. 部署
見 `DEPLOY.md`。最快:Netlify Drop 拖資料夾;永久:GitHub Pages(此 repo 已設,Settings→Pages→main→/root)。
執行時只需 §2 的 6 個檔;`words_raw/`、`trans/`、`tools/` 可不上傳(但目前 repo 有含,無妨)。
