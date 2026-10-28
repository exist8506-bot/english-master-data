#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const vocab = read("data/vocabulary.json");
const sentences = read("data/sentences.json");
const fails = [];
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const byWord = new Map(vocab.map(v => [norm(v.word), v]));
const primary = sentences.filter(s => {
  const v = byWord.get(norm(s.vocabWord));
  const src = s.source || (String(s.id || "").startsWith("sent500_") ? "base" : "");
  return v && ((v.source === "base" && src === "base") || (v.source === "remote" && src === "remote"));
});
if (vocab.length !== 3500) fails.push(`Expected 3500 vocabulary rows, got ${vocab.length}`);
if (sentences.length !== 3750) fails.push(`Expected 3750 sentence rows, got ${sentences.length}`);
if (new Set(vocab.map(v => v.id)).size !== vocab.length) fails.push("Duplicate vocabulary IDs found");
if (new Set(sentences.map(s => s.id)).size !== sentences.length) fails.push("Duplicate sentence IDs found");
for (const v of vocab) {
  if (!String(v.word || "").trim() || !String(v.example || "").trim() || !String(v.exampleVi || "").trim()) {
    fails.push(`Missing word/example/translation: ${v.id}`);
  }
  if (v.source === "expansion500_v2" && (!v.pos || v.pos === "word")) {
    fails.push(`Missing useful part of speech: ${v.word}`);
  }
}
for (const s of primary) {
  const v = byWord.get(norm(s.vocabWord));
  if (s.en !== v.example || s.vi !== v.exampleVi) {
    fails.push(`Linked example mismatch: ${s.id} / ${s.vocabWord}`);
  }
}
const badEnglish = [
  /^I put the (?:beach|market|airport|mountain|river|office|company|college|career|station) (?:in|into) (?:my|the) (?:travel )?(?:bag|wallet|pocket)\.$/i,
  /^We will meet next (?:evening|hour|date)\.$/i,
  /^I usually study in the week\.$/i,
  /^I left my keys beside the key\.$/i,
  /^I use my (?:password|audio) to study at night\.$/i,
  /^She decided to break today\.$/i,
  /^We can mean together this evening\.$/i,
];
for (const v of vocab) {
  for (const re of badEnglish) if (re.test(String(v.example || "").trim())) fails.push(`Known bad vocabulary example remains: ${v.word}`);
}
if (fails.length) {
  console.error(fails.slice(0, 100).join("\n"));
  console.error(`Total failures: ${fails.length}`);
  process.exit(1);
}
console.log(JSON.stringify({ok:true,vocabulary:vocab.length,sentences:sentences.length,primaryLinkedSentences:primary.length,v2PlaceholderPos:vocab.filter(v=>v.source==="expansion500_v2"&&v.pos==="word").length}));
