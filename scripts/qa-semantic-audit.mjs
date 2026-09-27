#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
}
function norm(v) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function words(v) {
  return norm(v).replace(/[^a-z0-9' -]/g, " ").split(/\s+/).filter(Boolean);
}
function singular(w) {
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.endsWith("ses") || w.endsWith("xes") || w.endsWith("zes") || w.endsWith("ches") || w.endsWith("shes")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}
function stripTarget(sentence, target) {
  const toks = words(sentence);
  const t = norm(target);
  const variants = new Set([t, singular(t)]);
  if (/[^aeiou]y$/.test(t)) variants.add(t.slice(0,-1)+"ies");
  else variants.add(t+"s");
  if (t.endsWith("e")) variants.add(t.slice(0,-1)+"ing");
  else variants.add(t+"ing");
  if (t.endsWith("e")) variants.add(t+"d");
  else variants.add(t+"ed");
  const out = [];
  for (const tok of toks) {
    if (variants.has(tok)) out.push("<TARGET>");
    else out.push(tok);
  }
  return out.join(" ");
}
function sample(rows, n=8) {
  return rows.slice(0, n).map(x => ({id:x.id,en:x.en,vi:x.vi,topic:x.topic,source:x.source}));
}

const sentences = readJson("sentences.json");
const communication = readJson("communication.json");
const vocabulary = readJson("vocabulary.json");
const expansion = readJson("expansion500.json");
const independent = sentences.filter(x => x?.source === "expansion500" || x?.source === "extra500_v8");

const sentenceById = new Map(sentences.map(x => [String(x.id ?? ""), x]));
const expansionRows = Array.isArray(expansion?.words) ? expansion.words : [];

// Broad semantic compatibility dictionaries: intentionally conservative.
const inanimateSubjects = new Set([
  "room","house","chair","table","book","dictionary","homework","question","answer","company","career","station","airport","mountain","river",
  "bicycle","office","meeting","manager","client","desk","computer","phone","window","door","truck","bridge","luggage","road","tennis",
  "plan","situation","difficulty","hall","bottom","majority","aspect","youth","iron","steel","secretary","email","password","audio","shelf",
  "lock","basket","spoon","dishwasher","garbage","detergent","kitchen","calendar","weather","rain","cloud","storm","sun","cold"
]);
const humanOrAgentSubjects = new Set([
  "i","you","he","she","we","they","people","someone","somebody","everyone","everybody","a person","the person","my friend","my mother","my father",
  "my brother","my sister","my teacher","the teacher","the manager","the customer","the cashier","the client","the team","our team","the student"
]);
const emotionAdjs = new Set(["sad","happy","angry","excited","nervous","tired","lonely","worried","afraid","jealous","proud","surprised","calm","bored","brave","lazy","relaxed","upset"]);
const agencyVerbs = new Set([
  "decide","decided","decides","want","wants","wanted","try","tries","tried","need","needs","needed","plan","plans","planned","choose","chooses","chose",
  "hope","hopes","hoped","prefer","prefers","preferred","remember","remembers","remembered","forget","forgets","forgot","talk","talks","talked","speak","speaks","spoke",
  "meet","meets","met","write","writes","wrote","read","reads","read","use","uses","used","buy","buys","bought","borrow","borrows","borrowed","carry","carries","carried"
]);
const physicalOrWeatherAdjs = new Set(["cloudy","snowy","rainy","warm","cold","wet","dry","open","closed","large","small","tiny","short","long","dirty","clean","salty","spicy","sweet","delicious"]);
const vagueTemplateVerbs = new Set(["receive","invest","float","surround","succeed","choose","stay","put","give","find","want","teach","make","bring","watch","save","together","below","tell","hear","mean","open","do","keep","hate","catch","prefer","wish","support","continue","establish","wonder","disturb","entertain","express","propose","resolve","serve","submit","thank","appear","gain","accompany","affect","attach","complain","consider","contribute","create","decrease","encourage","estimate","harm","ignore","notice","prevent","recommend"]);

const bad = [];
for (const s of independent) {
  const en = String(s.en ?? "").trim();
  const w = words(en);
  if (!en) continue;

  // 1) Inanimate + emotion adjective mismatch.
  const subj = w[0] === "the" || w[0] === "a" || w[0] === "an" ? w.slice(1,2)[0] : w[0];
  const isBe = /\b(?:is|was|seems?|looks?)\b/.test(en.toLowerCase());
  const adj = w.find(x => emotionAdjs.has(x));
  if (subj && inanimateSubjects.has(subj) && isBe && adj) {
    bad.push({kind:"inanimate-emotion",...s,detail:{subject:subj,adjective:adj}});
    continue;
  }

  // 2) Inanimate subject used with strongly agentive first/main verb.
  const firstVerb = w.find(x => agencyVerbs.has(x));
  if (subj && inanimateSubjects.has(subj) && firstVerb && /\b(?:decided|wanted|tried|needed|planned|chose|hoped|preferred|remembered|forgot|talked|spoke|met|wrote|used|bought|borrowed|carried)\b/.test(en.toLowerCase())) {
    bad.push({kind:"inanimate-agency",...s,detail:{subject:subj,verb:firstVerb}});
    continue;
  }

  // 3) Common malformed infinitive template.
  if (/^(?:i need|i try|he decided|she decided|he wants|she wants|we can|they tried) to\s+\w+\s+(?:before breakfast|after work|every day|carefully|together this evening)\.$/i.test(en)) {
    const toks = w;
    const pivot = toks.indexOf("to");
    const candidate = pivot >= 0 ? toks[pivot + 1] : "";
    if (candidate && vagueTemplateVerbs.has(candidate)) {
      bad.push({kind:"generic-infinitive-template",...s,detail:{verb:candidate}});
      continue;
    }
  }

  // 4) Reject only implausible adjective substitutions in the "It is ... to practice" frame.
  const itPractice = en.match(/^It is ([A-Za-z]+) to practice a little every day\.$/i);
  if (itPractice) {
    const allowed = new Set(["important","useful","helpful","good","beneficial","easy","hard","difficult","necessary","possible","wise","healthy"]);
    if (!allowed.has(itPractice[1].toLowerCase())) {
      bad.push({kind:"it-is-adj-template",...s});
      continue;
    }
  }

  // 5) Suspicious "That was a/an <adj> experience for me."
  if (/^that was an? \w+ experience for me\.$/i.test(en)) {
    bad.push({kind:"experience-adjective-template",...s});
    continue;
  }

  // 6) "She/He sounded <physical adjective>" is often semantically wrong.
  if (/^(?:she|he) sounded (?:delicious|salty|favorite)\b/i.test(en)) {
    bad.push({kind:"sound-adjective-mismatch",...s});
    continue;
  }

  // 7) "I feel <physical adjective> when..." mismatch.
  if (/^i feel (?:dangerous|full|sour|difficult|common|natural|personal|long) when i finish my work\.$/i.test(en)) {
    bad.push({kind:"feel-adjective-mismatch",...s});
    continue;
  }
}

// Detect generated sentence skeletons where the target word is merely substituted into the same frame.
// expansion500 maps one word to one standalone sentence by sentenceId.
const skeletons = new Map();
for (const x of expansionRows) {
  const s = sentenceById.get(String(x.sentenceId ?? ""));
  if (!s || s.source !== "expansion500") continue;
  const key = stripTarget(s.en, x.word);
  if (!skeletons.has(key)) skeletons.set(key, []);
  skeletons.get(key).push({word:x.word,id:s.id,en:s.en,vi:s.vi});
}
const repeatedSkeletons = [...skeletons.entries()]
  .filter(([, rows]) => rows.length >= 4)
  .sort((a,b) => b[1].length-a[1].length)
  .slice(0, 40)
  .map(([skeleton,rows]) => ({count:rows.length,skeleton,samples:rows.slice(0,6)}));

// Near-duplicate detection on independent sentences using token bigram Jaccard.
const bigrams = (s) => {
  const w=words(s);
  const out=new Set();
  for(let i=0;i<w.length-1;i++)out.add(w[i]+" "+w[i+1]);
  return out;
};
const jaccard=(a,b)=>{let hit=0;for(const x of a)if(b.has(x))hit++;return hit/Math.max(1,new Set([...a,...b]).size)};
const nearDuplicates=[];
const samplePool=independent.slice(0, 1000);
for(let i=0;i<samplePool.length;i++){
  const a=samplePool[i],A=bigrams(a.en);
  for(let j=i+1;j<samplePool.length;j++){
    const b=samplePool[j],B=bigrams(b.en);
    if(norm(a.en)===norm(b.en))continue;
    const score=jaccard(A,B);
    if(score>=0.78) nearDuplicates.push({score:Number(score.toFixed(3)),a:{id:a.id,en:a.en,vi:a.vi},b:{id:b.id,en:b.en,vi:b.vi}});
  }
}
nearDuplicates.sort((a,b)=>b.score-a.score);

const acceptableItIsPracticeAdjs = new Set(["important","useful","helpful","good","beneficial","easy","hard","difficult","necessary","possible","wise","healthy"]);
const itIsPracticeBad=[];
for(const s of independent){
  const m=String(s.en??"").trim().match(/^It is ([A-Za-z]+) to practice a little every day\.$/i);
  if(m&&!acceptableItIsPracticeAdjs.has(m[1].toLowerCase()))itIsPracticeBad.push(s);
}

const badVocabularyPatterns=[
  /^we can buy together this evening\.$/i,
  /^i feel (?:afraid|lazy|weak) when i finish my work\.$/i,
  /^we will meet next (?:evening|hour|date)\.$/i,
  /^we had (?:oven|knife|chopstick) for dinner\.$/i,
  /^the doctor asked about my (?:nurse|ambulance)\.$/i,
  /^she decided to (?:analyze|arrange|attend|contain|define|expect|imagine) after lunch\.$/i,
  /^they tried to (?:accompany|affect|attach|encourage|estimate|harm|ignore) carefully\.$/i,
  /^the team is working on secretary\.$/i,
  /^i use my email to study at night\.$/i
];
const vocabularyBad=vocabulary.filter(function(v){
  return badVocabularyPatterns.some(function(re){return re.test(String(v.example??"").trim())});
});

const communicationBad=[];
for(const d of communication){
  for(const line of Array.isArray(d.lines)?d.lines:[]){
    const en=Array.isArray(line)?String(line[1]??"").trim():String(line??"").trim();
    if(!en)continue;
    if(/^(?:the|a|an) (?:room|house|chair|table|book|dictionary|homework|question|answer|company|career|station|airport|mountain|river|bicycle|office|meeting|manager|client|desk|computer|phone|window|door) (?:looks?|is|was|seems?) (?:very )?(?:sad|happy|angry|excited|nervous|tired|lonely|worried|afraid|jealous|proud|surprised|calm|friendly|serious|careful|rich|sure|offline|cloudy|snowy|local|short|sweet)\b/i.test(en)){
      communicationBad.push({id:d.id,title:d.title,line:en});
    }
  }
}

console.log("=== English Master semantic audit ===");
console.log(JSON.stringify({
  independentSentences: independent.length,
  semanticFlags: bad.length,
  semanticFlagSamples: sample(bad, 40),
  repeatedSkeletonCount: repeatedSkeletons.length,
  repeatedSkeletons,
  nearDuplicatePairCount: nearDuplicates.length,
  nearDuplicateSamples: nearDuplicates.slice(0,40),
  communicationSemanticFlags: communicationBad.length,
  communicationFlagSamples: communicationBad.slice(0,30),
  itIsPracticeTemplateFlags: itIsPracticeBad.length,
  itIsPracticeTemplateSamples: sample(itIsPracticeBad, 30),
  vocabularySemanticFlags: vocabularyBad.length,
  vocabularySemanticSamples: vocabularyBad.slice(0,40).map(function(v){return {id:v.id,word:v.word,example:v.example,exampleVi:v.exampleVi}})
}, null, 2));

const totalFailures = bad.length + communicationBad.length + itIsPracticeBad.length + repeatedSkeletons.length + nearDuplicates.length + vocabularyBad.length;
if(totalFailures){
  console.error("SEMANTIC AUDIT FAILED: "+totalFailures+" suspicious findings remain.");
  process.exitCode=1;
}else{
  console.log("SEMANTIC AUDIT PASSED: no suspicious semantic/template findings.");
}

