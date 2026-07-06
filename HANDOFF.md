# HANDOFF — 用另一個帳號 / 另一個 AI 接手

這份給「換帳號或換人繼續」用。舊帳號的對話記憶不會跟著走,所有需要的資訊都在這個 repo 裡:
- `README.md` — 架構、資料格式、三條產生管線、功能與改法
- `PROGRESS.md` — 目前進度、斷點、待辦、已知風險
- 本檔 `HANDOFF.md` — 取得專案、環境設定、給新 AI 的啟動指令

---

## 1. 取得專案

```bash
git clone https://github.com/wdwbw/Learning_EN.git
cd Learning_EN
```

需要 **push 權限**才能更新線上版,擇一:
- **加協作者**:repo 擁有者(wdwbw)到 GitHub → repo **Settings → Collaborators** 把新帳號加入;新帳號接受邀請後即可 `git push`。
- **或 fork**:新帳號 fork 一份到自己名下,改自己的 remote(`git remote set-url origin https://github.com/<新帳號>/Learning_EN.git`),部署自己的 GitHub Pages。

第一次 push 會要求 GitHub 登入(瀏覽器授權或 Personal Access Token)。

---

## 2. 環境設定

- **Node.js**(跑組裝腳本 `tools/*.js`)。
- **本機預覽**:`python -m http.server 5050` 後開 `http://localhost:5050`(設定見 `.claude/launch.json`)。
- **CMUdict 字典**(只有要重算 KK 音標時才需要,已 gitignore):
  ```bash
  curl -L -o tools/cmudict.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict
  ```

執行時的 App 只需 6 個檔:`index.html`、`words.js`、`words-pack1.js`、`langs-pack1.js`、`manifest.json`、`sw.js`。

---

## 3. 給新 AI 助理的啟動提示詞(整段複製貼上)

> 我要接手一個叫 LL 的多語單字學習 PWA(在這個 repo 根目錄)。請先讀 `README.md` 與 `PROGRESS.md` 了解架構、資料格式、產生管線與目前斷點,再開始。
>
> 現況:英文 3096 字;德/法/日各 3096 字齊全;廣東話(yue)只做了前 90 字(索引 0–90),要補到 3096。之後還要把英文擴到 5000→10000,新字要補齊全部翻譯(德法日粵)。
>
> 產生內容的做法:用能寫檔的子代理平行處理——英文擴充寫 `words_raw/*.json` 再跑 `node tools/assemble-all.js`;翻譯寫 `trans/t_<索引>.json`(德法日)或 `trans/y_<索引>.json`(粵語,欄位 `yue:{word,jyutping,examples:[{s,zh}]}`)再跑 `node tools/assemble-langs.js`。每個子代理讀 `SEED_WORDS.slice(start,start+30)` 拿到要處理的英文字。組裝腳本都是冪等的。
>
> 完成後 `git add -A && git commit && git push`,GitHub Pages 會自動重新部署。改 `index.html`/資料檔後要在本機預覽驗證(切語言、翻卡、console 無錯)。
>
> 請先幫我：**用背景 workflow 把廣東話從索引 90 補到 3090(每塊 30 字,寫 `trans/y_<start>.json`),完成後組裝並驗證覆蓋率。** 注意帳號用量上限,一輪跑不完就分批續跑。

---

## 4. 目前的下一步(接手後第一件事)

**補齊廣東話 90 → 3090**(約 100 塊,~1.7M tokens,會跨額度分批):
1. 對每個索引區間(START=90,120,…,3090)開一個代理,讀 `SEED_WORDS.slice(START,START+30)`,產生粵語(`word` 用粵字、`jyutping` 粵拼、2 句香港口語例句 + 中文),寫 `trans/y_<START>.json`。
2. `node tools/assemble-langs.js`
3. 驗證缺漏:
   ```bash
   node -e "const fs=require('fs');const w={};new Function('window',fs.readFileSync('words.js','utf8'))(w);new Function('window',fs.readFileSync('words-pack1.js','utf8'))(w);const g={};new Function('window',fs.readFileSync('langs-pack1.js','utf8'))(g);const miss=w.SEED_WORDS.filter(x=>!(g.LL_LANGS[x.id]&&g.LL_LANGS[x.id].yue&&g.LL_LANGS[x.id].yue.word));console.log('粵語缺',miss.length,'索引',miss.map(x=>w.SEED_WORDS.indexOf(x)).slice(0,20).join(','))"
   ```
4. `git commit && git push`

之後才進行英文擴充(擴之前先看 `PROGRESS.md` 的「id 穩定性」風險)。

---

## 5. 重要提醒
- 所有內容產生都受**帳號用量上限**節制,大批一次跑不完會中斷(訊息顯示重置時間),分批續跑即可,不會重複(組裝以檔案/id 為單位)。
- 舊帳號的「記憶檔」不會轉移;一切以 repo 內 `README.md` / `PROGRESS.md` / `HANDOFF.md` 為準。
- 若換成 fork,記得也要在新帳號開自己的 GitHub Pages(Settings→Pages→main→/root)。
