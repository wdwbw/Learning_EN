/* assemble-langs.js — 讀取 trans/*.json(每檔一個 [{id, de, fr, ja}] 陣列)
   合併成 window.LL_LANGS,輸出 langs-pack1.js。可重複執行。
   用法:node tools/assemble-langs.js
*/
const fs = require("fs");
const path = require("path");
const PROJ = path.resolve(__dirname, "..");
const TR = path.join(PROJ, "trans");

// 有效的英文 id 集合(避免亂 id)
const win = {};
new Function("window", fs.readFileSync(path.join(PROJ, "words.js"), "utf8"))(win);
new Function("window", fs.readFileSync(path.join(PROJ, "words-pack1.js"), "utf8"))(win);
const validIds = new Set(win.SEED_WORDS.map(w => w.id));

const LANGS = ["de", "fr", "ja"];
function cleanLangObj(l, isJa) {
  if (!l || !l.word) return null;
  const ex = Array.isArray(l.examples) ? l.examples.slice(0, 2)
    .filter(e => e && e.s && e.zh).map(e => ({ s: String(e.s).trim(), zh: String(e.zh).trim() })) : [];
  const o = { word: String(l.word).trim(), examples: ex };
  if (isJa) { if (l.kana) o.kana = String(l.kana).trim(); if (l.romaji) o.romaji = String(l.romaji).trim(); }
  else { if (l.ipa) o.ipa = String(l.ipa).trim(); }
  return o;
}

const out = {};
const stats = { files: 0, ids: 0, de: 0, fr: 0, ja: 0, skipped: 0 };
if (fs.existsSync(TR)) {
  for (const f of fs.readdirSync(TR).filter(f => f.endsWith(".json")).sort()) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(TR, f), "utf8")); }
    catch (e) { console.log("!! 解析失敗:", f, e.message); continue; }
    if (!Array.isArray(arr)) continue;
    stats.files++;
    for (const o of arr) {
      if (!o || !o.id || !validIds.has(o.id)) { stats.skipped++; continue; }
      const entry = out[o.id] || (out[o.id] = {});
      const de = cleanLangObj(o.de, false), fr = cleanLangObj(o.fr, false), ja = cleanLangObj(o.ja, true);
      if (de) { entry.de = de; stats.de++; }
      if (fr) { entry.fr = fr; stats.fr++; }
      if (ja) { entry.ja = ja; stats.ja++; }
    }
  }
}
stats.ids = Object.keys(out).length;

const header = `/* langs-pack1.js — 多語翻譯包(德/法/日)。共 ${stats.ids} 個詞。自動附加到 window.LL_LANGS。 */\n`;
const body = "window.LL_LANGS = Object.assign(window.LL_LANGS||{}, " +
  JSON.stringify(out).replace(/","/g, '",\n"') + ");\n";
fs.writeFileSync(path.join(PROJ, "langs-pack1.js"), header + body, "utf8");

console.log("檔案:", stats.files, " 覆蓋詞數:", stats.ids);
console.log("翻譯數  德:", stats.de, " 法:", stats.fr, " 日:", stats.ja, " 略過(壞id):", stats.skipped);
console.log("已寫出 langs-pack1.js");
