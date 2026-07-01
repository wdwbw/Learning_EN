/* apply-cmudict.js — 用 CMUdict(ARPAbet)重算 KK 音標,套用到 words.js 與 words-pack1.js
   ARPAbet → KK 對應 + 最大節首化(maximal onset)重音定位。
   字典查無的字(多為片語/俚語)保留原本的 KK。
   用法:node tools/apply-cmudict.js
*/
const fs = require("fs");
const path = require("path");
const PROJ = path.resolve(__dirname, "..");

// ---- 載入 CMUdict ----
const dict = new Map();
for (const line of fs.readFileSync(path.join(__dirname, "cmudict.dict"), "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith(";;;")) continue;
  const hash = line.indexOf("#"); const clean = hash >= 0 ? line.slice(0, hash) : line;
  const parts = clean.trim().split(/\s+/);
  if (parts.length < 2) continue;
  let w = parts[0].toLowerCase();
  if (w.endsWith(")")) w = w.replace(/\(\d+\)$/, ""); // 取第一個發音,忽略 word(2)
  if (dict.has(w)) continue;
  dict.set(w, parts.slice(1));
}

// ---- ARPAbet → KK ----
const CONS = { B:"b",CH:"tʃ",D:"d",DH:"ð",F:"f",G:"ɡ",HH:"h",JH:"dʒ",K:"k",L:"l",M:"m",
  N:"n",NG:"ŋ",P:"p",R:"r",S:"s",SH:"ʃ",T:"t",TH:"θ",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ" };
function vowelKK(base, stress) {
  switch (base) {
    case "AA": return "ɑ"; case "AE": return "æ";
    case "AH": return stress === "0" ? "ə" : "ʌ";
    case "AO": return "ɔ"; case "AW": return "aʊ"; case "AY": return "aɪ";
    case "EH": return "ɛ"; case "ER": return stress === "0" ? "ɚ" : "ɝ";
    case "EY": return "e"; case "IH": return "ɪ"; case "IY": return "i";
    case "OW": return "o"; case "OY": return "ɔɪ"; case "UH": return "ʊ"; case "UW": return "u";
    default: return null;
  }
}
const isVowelPh = p => /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)/.test(p);

// 合法節首(ARPAbet 子音代碼,已去重音)
function validOnset(cs) {
  if (cs.length === 0) return true;
  if (cs.length === 1) return cs[0] !== "NG";
  if (cs.length === 2) {
    const [a, b] = cs;
    if (a === "S" && ["P","T","K","M","N","L","W","F"].includes(b)) return true;
    if (["P","B","K","G","F"].includes(a) && b === "L") return true;
    if (["P","B","T","D","K","G","F","TH","SH"].includes(a) && b === "R") return true;
    if (["T","D","K","G","S","TH"].includes(a) && b === "W") return true;
    if (b === "Y") return true; // 如 K Y UW(cute)
    return false;
  }
  if (cs.length === 3) {
    if (cs[0] === "S" && ["P","T","K"].includes(cs[1]) && ["L","R","W","Y"].includes(cs[2])) return true;
    return false;
  }
  return false;
}

// 把一個字的 ARPAbet 陣列轉為 KK 字串(單一單字,無空格)
function phonesToKK(phones) {
  // 拆成 tokens:{ base, kk, isV, stress }
  const toks = phones.map(p => {
    if (isVowelPh(p)) {
      const m = p.match(/^([A-Z]+?)(\d)$/);
      const base = m ? m[1] : p.replace(/\d/g, "");
      const stress = m ? m[2] : "0";
      return { isV: true, stress, kk: vowelKK(base, stress), arp: base };
    }
    return { isV: false, kk: CONS[p] || "", arp: p };
  });
  if (toks.some(t => t.kk == null)) return null;

  // 建立音節:onset* vowel;子音群用最大節首化分配
  const vIdx = toks.map((t, i) => t.isV ? i : -1).filter(i => i >= 0);
  if (!vIdx.length) return null;
  const syllables = []; // { onset:[idx], nucleus:idx, stress }
  let prevV = -1;
  for (let s = 0; s < vIdx.length; s++) {
    const v = vIdx[s];
    // 這個母音前、上個母音後的子音群
    const consStart = prevV + 1;
    const cons = [];
    for (let i = consStart; i < v; i++) cons.push(i);
    let onset;
    if (s === 0) {
      onset = cons; // 開頭子音全給第一音節
    } else {
      // 最大節首化:從最長合法後綴開始
      let split = cons.length; // onset 取後綴長度
      for (let len = Math.min(3, cons.length); len >= 0; len--) {
        const suffix = cons.slice(cons.length - len).map(i => toks[i].arp);
        if (validOnset(suffix)) { split = len; break; }
      }
      const coda = cons.slice(0, cons.length - split);
      const onsetIdx = cons.slice(cons.length - split);
      // coda 掛到上一個音節
      if (coda.length) syllables[syllables.length - 1].coda.push(...coda);
      onset = onsetIdx;
    }
    syllables.push({ onset, nucleus: v, coda: [], stress: toks[v].stress });
    prevV = v;
  }
  // 最後母音之後的子音掛到最後音節 coda
  for (let i = vIdx[vIdx.length - 1] + 1; i < toks.length; i++) syllables[syllables.length - 1].coda.push(i);

  const mono = syllables.length === 1; // 單音節不標重音,較乾淨
  let out = "";
  for (const syl of syllables) {
    if (!mono) { if (syl.stress === "1") out += "ˈ"; else if (syl.stress === "2") out += "ˌ"; }
    for (const i of syl.onset) out += toks[i].kk;
    out += toks[syl.nucleus].kk;
    for (const i of syl.coda) out += toks[i].kk;
  }
  return out;
}

// 整個 word(可能是片語)→ KK,查無則回 null
function wordToKK(word) {
  const tokens = word.toLowerCase().split(/[\s\-]+/).map(t => t.replace(/[^a-z']/g, "")).filter(Boolean);
  if (!tokens.length) return null;
  const parts = [];
  for (const t of tokens) {
    const ph = dict.get(t);
    if (!ph) return null; // 任一 token 查無 → 整體放棄,保留原 KK
    const kk = phonesToKK(ph);
    if (!kk) return null;
    parts.push(kk);
  }
  return "[" + parts.join(" ") + "]";
}

// ---- 套用到檔案 ----
function loadArray(file) {
  const src = fs.readFileSync(file, "utf8");
  const win = {};
  new Function("window", src)(win);
  return win.SEED_WORDS;
}
function patch(arr) {
  let updated = 0, kept = 0;
  for (const w of arr) {
    const kk = wordToKK(w.word);
    if (kk) { w.kk = kk; updated++; } else kept++;
  }
  return { updated, kept };
}

// words.js(種子)
const seed = loadArray(path.join(PROJ, "words.js"));
const sStat = patch(seed);
const seedHeader = "/* words.js — 種子單字(KK 音標已由 CMUdict 校正)。欄位:id,word,kk,pos,meaning,examples[{en,zh}],img,theme,level */\n";
fs.writeFileSync(path.join(PROJ, "words.js"),
  seedHeader + "window.SEED_WORDS = [\n" + seed.map(o => JSON.stringify(o)).join(",\n") + "\n];\n", "utf8");

// words-pack1.js(擴充)
const pack = loadArray(path.join(PROJ, "words-pack1.js"));
const pStat = patch(pack);
const packHeader = `/* words-pack1.js — 擴充單字包(KK 由 CMUdict 校正)。共 ${pack.length} 字。 */\n`;
fs.writeFileSync(path.join(PROJ, "words-pack1.js"),
  packHeader + "window.SEED_WORDS = (window.SEED_WORDS||[]).concat([\n" + pack.map(o => JSON.stringify(o)).join(",\n") + "\n]);\n", "utf8");

console.log("CMUdict 詞條:", dict.size);
console.log("種子 words.js: 校正", sStat.updated, "保留", sStat.kept);
console.log("擴充 pack:     校正", pStat.updated, "保留", pStat.kept);
console.log("範例:");
["computer","banana","available","photography","psychology","comfortable"].forEach(w=>console.log("  "+w, "→", wordToKK(w)));
