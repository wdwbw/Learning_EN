/* assemble-all.js — 可重複執行的單字包組裝器
   讀取 words_raw/*.json 的所有批次(每檔一個 JSON 陣列),
   對種子字(words.js)與各批次做全域去重、正規化 KK、剔除雜訊,
   依 word 首字母排序後重新編號,輸出 words-pack1.js。
   用法:node tools/assemble-all.js
*/
const fs = require("fs");
const path = require("path");
const PROJ = path.resolve(__dirname, "..");
const RAW = path.join(PROJ, "words_raw");

// 種子字(排除重複用)
const seedSrc = fs.readFileSync(path.join(PROJ, "words.js"), "utf8");
const win = {};
new Function("window", seedSrc)(win);
const seedWords = new Set((win.SEED_WORDS || []).map(w => w.word.toLowerCase().trim()));

function normKK(kk){ return (kk||"").replace(/ˋ/g,"ˈ").replace(/ˏ/g,"ˌ").replace(/!/g,"l").trim(); }
const blocklist = new Set(["colleague-wide","tidy-minded","deliverables"]);
function bad(o){
  if(!o || !o.word || !o.meaning) return true;
  if(!Array.isArray(o.examples) || o.examples.length < 1) return true;
  if(!o.examples[0] || !o.examples[0].en || !o.examples[0].zh) return true;
  if(/複合替代/.test(o.meaning)) return true;
  if(blocklist.has(o.word.toLowerCase().trim())) return true;
  if(o.word.length > 40) return true;
  return false;
}

const files = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter(f=>f.endsWith(".json")).sort() : [];
const seen = new Set();
const all = [];
const stats = {};
let malformed = 0, dupes = 0;

for(const f of files){
  let arr;
  try { arr = JSON.parse(fs.readFileSync(path.join(RAW,f),"utf8")); }
  catch(e){ console.log("!! 解析失敗,略過:", f, e.message); continue; }
  if(!Array.isArray(arr)) continue;
  let kept = 0;
  for(const o of arr){
    if(bad(o)){ malformed++; continue; }
    const key = o.word.toLowerCase().trim();
    if(seedWords.has(key) || seen.has(key)){ dupes++; continue; }
    seen.add(key);
    all.push({
      word: o.word.trim(),
      kk: normKK(o.kk || o.phonetic || ""),
      pos: (o.pos||"").trim(),
      meaning: (o.meaning||"").trim(),
      examples: o.examples.slice(0,2).map(e=>({en:(e.en||"").trim(), zh:(e.zh||"").trim()})),
      img: (o.img||o.word).trim(),
      theme: (o.theme||"其他").trim(),
      level: +o.level || 2,
    });
    kept++;
  }
  stats[f] = { raw: arr.length, kept };
}

// 依字母排序 + 重新編號
all.sort((a,b)=>a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
all.forEach((w,i)=> w.id = "p" + String(i+1).padStart(4,"0"));

console.log("種子字:", seedWords.size);
for(const f of Object.keys(stats)) console.log("  " + f + ":", stats[f].raw, "->", stats[f].kept);
console.log("剔除雜訊:", malformed, " 去重:", dupes);
console.log("擴充總數:", all.length, " => 全庫合計:", seedWords.size + all.length);

const themeCount = {};
all.forEach(w=> themeCount[w.theme] = (themeCount[w.theme]||0)+1);
console.log("主題分布:", JSON.stringify(themeCount, null, 0));

const header = `/* words-pack1.js — 擴充單字包(子代理生成、全域去重)。共 ${all.length} 字。自動附加到 window.SEED_WORDS。 */\n`;
const body = "window.SEED_WORDS = (window.SEED_WORDS||[]).concat(\n" +
  JSON.stringify(all, null, 0).replace(/\},\{/g, "},\n{") + "\n);\n";
fs.writeFileSync(path.join(PROJ, "words-pack1.js"), header + body, "utf8");
console.log("已寫出 words-pack1.js");
