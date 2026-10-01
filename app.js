const APP_VERSION="9.4.2";
const STORAGE_KEY="englishMaster_v1";
const DATA_URL="https://exist8506-bot.github.io/english-master-data/data/version.json";
const APP_VERSION_URL="./app-version.json";

let renderMotion=false,renderMotionSeq=0;
let db={
  vocab:[],sentences:[],questions:[],grammar:[],communication:[],trilingual:[],
  stats:{xp:0,streak:0,learned:0,answered:0,correct:0,sentenceAnswered:0,sentenceCorrect:0,speakingAttempts:0,speakingGood:0,dailyDate:"",dailyUnits:0,dailyHistory:[],practiceCompleted:0},
  profile:{theme:"light",autoUpdate:true,speechRate:1,layout:"auto",dailyGoal:10},
  lastRemoteVersion:"",
  contentCounts:{}
};
let view="home",flashIndex=0,flashFlipped=false,listenIndex=0,speakIndex=0,quizIndex=0,quizAnswered=false,quizOptions=[],quizCorrectIndex=-1;
let activeRecognition=null,recognitionToken=0,listenAdvanceTimer=0,listenAnswered=false;
let vocabPage=1,sentencePage=1,trilingualPage=1,communicationPage=1,lastVocabQuery="",pendingUserState=null;
let reviewQueue=[],reviewIndex=0,quickReviewActive=false,reviewSession={active:false,mode:"",total:0,answered:0,remembered:0,forgot:0,xp:0},validatedContentSignature="",updateInProgress=false;
let derivedPools={signature:"",sentences:null,communication:null};
let practiceQueue=[],practiceIndex=0,practiceAnswered=false,practiceAnswerOrder=[],practiceCorrectCount=0,practiceMode="smart",practiceAnsweredCount=0,practiceSessionXp=0;
const CONTENT_DB_NAME="englishMasterContent_v1";
const CONTENT_STORE="snapshot";
let legacyStorageLoaded=false;

function $(id){return document.getElementById(id)}
function esc(s){return String(s??"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]})}
function escapeJs(s){return String(s??"").replace(/&/g,"&amp;").replace(/\\/g,"\\\\").replace(/\'/g,"\\\'").replace(/"/g,"&quot;").replace(/\r?\n/g," ").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function norm(s){return String(s??"").trim().toLowerCase().replace(/\s+/g," ")}
const STANDALONE_SENTENCE_SOURCES=new Set(["extra500_v8","expansion500","expansion500_v2"]);
const ALLOWED_IT_IS_PRACTICE_ADJECTIVES=new Set(["important","useful","helpful","good","beneficial","easy","hard","difficult","necessary","possible","wise","healthy"]);
function standalonePracticeTemplateIsNatural(en){
  const m=String(en??"").trim().match(/^It is ([A-Za-z]+) to practice a little every day\.$/i);
  if(!m)return true;
  return ALLOWED_IT_IS_PRACTICE_ADJECTIVES.has(m[1].toLowerCase());
}
const BAD_STANDALONE_SENTENCE_PATTERNS=[
  /^(?:the|a|an) (?:room|house|chair|table|book|dictionary|homework|question|answer|company|career|station|airport|mountain|river|bicycle|office|meeting|manager|client|desk|computer|phone|window|door) (?:looks?|is|was|seems?) (?:very )?(?:sad|happy|angry|excited|nervous|tired|lonely|worried|afraid|jealous|proud|surprised|calm|friendly|serious|careful|rich|sure|offline|cloudy|snowy|local|short|sweet)\\b/i,
  /^(?:the|a|an) (?:room|house|bedroom|office) (?:looks?|seems?) (?:very )?(?:cheap|hard|fresh)\\b/i,
  /^(?:the|a|an) (?:room|house|bedroom|office) feels (?:very )?wet\\b/i,
  /^(?:he|she) decided to (?:need|know|happen|fail|occur|already|only|slowly|beautifully|probably|just|discover|detect|indicate|expect|elect|react|advertise)\\b/i,
  /^i need to (?:use|take|look|like|feel|show|spend|lend|beautifully|probably|just) before breakfast\\.$/i,
  /^they tried to (?:support|continue|establish|wonder|disturb|entertain|express|propose|resolve|serve|submit|thank|appear|gain|accompany|affect|attach|complain|consider|contribute|create|decrease|encourage|estimate|harm|ignore|notice|prevent|recommend) carefully\\.$/i,
  /^i put the (?:beach|market|airport|mountain|river|office|company|college|career|station) (?:in|into) (?:my|the) (?:travel )?(?:bag|wallet|pocket)\\.$/i,
  /^i checked (?:the )?(?:sun|cloud|storm|cold weather|sponsor) (?:at|before|after|in|on) /i,
  /^the .* is on my desk today\\.$/i,
  /^i talked to the homework after class\\.$/i,
  /^i used the (?:question|college|career|office|station) during my study session\\.$/i,
  /^(?:i'm|i am) practicing .+\\.$/i,
  /^(?:i'll|i will) keep practicing\\b/i,
  /^(?:when would you use|what does|how can i use|how would you use|can you give me an example with|can you tell me more about|why is .+ useful in real life|which word is easier to remember) /i,
  /^i read the word, hear it, and use it in a sentence\\.$/i,
  /^i'll listen to them, say them aloud, and make my own sentences\\.$/i,
  /^i think .+ is easier because i can use it often\\.$/i,
  /^this plan is (?:immediate|civil)\\.$/i,
  /^this majority is useful in everyday life\\.$/i,
  /^she seems visual today\\.$/i,
  /^i saw aspect on my way home\\.$/i,
  /^i noticed (?:youth|iron|steel) this morning\\.$/i,
  /^i usually (?:insist|acknowledge) after work\\.$/i,
  /^i need to (?:usually|always|often|sometimes|still|really|very|maybe|carefully|slowly) before breakfast\\.$/i,
  /^i try to (?:always|usually|often|sometimes|still|really|very|carefully|slowly) every day\\.$/i,
  /^(?:she|he) wants to (?:always|usually|often|sometimes|still|really|very|carefully|slowly|maybe|again) after work\\.$/i,
  /^we can (?:quickly|almost|also|sometimes|usually|always) together this evening\\.$/i,
  /^that was a (?:angry|bored|lonely|brave|strong|dirty|rainy|warm|busy|easy|necessary|normal|private|small|old|safe|tiny|thirsty) experience for me\\.$/i,
  /^i feel (?:dangerous|full|sour|difficult|common|natural|personal|long) when i finish my work\\.$/i,  /^i feel (?:afraid|lazy|weak) when i finish my work\.$/i,

  /^it is (?:hungry|spicy|large|big|low|public) to practice a little every day\\.$/i,
  /^she sounded (?:delicious|salty|favorite) during the conversation\\.$/i,

  // Newly found semantic/template failures. Keep this list conservative and specific.
  /^the (?:new plan) is (?:same|dry|funny) for us\\.$/i,
  /^the situation is primary right now\\.$/i,
  /^the (?:road|tennis) is useful in daily life\\.$/i,
  /^they properly use the app\\.$/i,
  /^the team is working on secretary\\.$/i,
  /^we will meet next (?:hour|date|evening)\\.?$/i,
  /^we can (?:buy|hear|open|keep) together this evening\\.$/i,
  /^i feel (?:kind|cool|welcome) when i finish my work\\.$/i,
  /^i need to (?:receive|invest|float|surround|succeed|choose|stay|put) (?:before|after)\\b/i,
  /^i try to (?:give|find|want|teach|carry) every day\\.$/i,
  /^he decided to (?:close|put) before the meeting\\.$/i,
  /^we need a new (?:class|exam|library) for this lesson\\.$/i,
  /^i use my email to study at night\\.$/i,
  /^the (?:luggage|bridge) was delayed this morning\\.$/i,
  /^the truck was ready this morning\\.$/i
];
function isNaturalStandaloneSentence(item){
  if(!item||typeof item!=="object")return false;
  const en=String(item.en||"").trim(),vi=String(item.vi||"").trim(),source=String(item.source||"");
  if(!STANDALONE_SENTENCE_SOURCES.has(source)||!en||!vi||item.vocabWord)return false;
  if(!/[.!?]$/.test(en))return false;
  if(!standalonePracticeTemplateIsNatural(en))return false;
  return !BAD_STANDALONE_SENTENCE_PATTERNS.some(function(re){return re.test(en)});
}
function derivedPoolSignature(){
  return [String(db.lastRemoteVersion||""),db.sentences.length,db.communication.length].join("|");
}
function invalidateDerivedPools(){
  derivedPools.signature="";
  derivedPools.sentences=null;
  derivedPools.communication=null;
}
function sentencePracticePool(){
  const sig=derivedPoolSignature();
  if(derivedPools.signature===sig&&Array.isArray(derivedPools.sentences))return derivedPools.sentences;
  const seen=new Set(),out=[];
  for(const s of db.sentences){
    if(!isNaturalStandaloneSentence(s))continue;
    const k=norm(s.en);
    if(!k||seen.has(k))continue;
    seen.add(k);out.push(s);
  }
  derivedPools.signature=sig;
  derivedPools.sentences=out;
  derivedPools.communication=null;
  return out;
}
function communicationLineIsNatural(line){
  const en=String(line??"").trim();
  if(!en)return false;
  const rejects=[
    /^i'?m practicing .+\.$/i,
    /^(?:when would you use|what does|how can i use|how would you use|can you give me an example with|can you tell me more about|why is .+ useful in real life|which word is easier to remember) /i,
    /^why do you need\b/i,
    /^how do you use\b.*\bin real life\?$/i,
    /^do you find\b.*\buseful\?$/i,
    /^what will you do with\b.*\bnext\?$/i,
    /^i think .+ is easier because i can use it often\.$/i,
    /^do you know the word "/i,
    /^yes\. it means /i,
    /^where might i see the word "/i,
    /^(?:the|a|an) (?:room|house|chair|table|book|dictionary|homework|question|answer|company|career|station|airport|mountain|river|bicycle|office|meeting|manager|client|desk) (?:looks?|is|was|seems?) (?:very )?(?:sad|happy|angry|excited|nervous|tired|lonely|worried|afraid|jealous|proud|surprised|calm|friendly|serious|careful|rich|sure|offline|cloudy|snowy|local|short|sweet)\b/i,
    /^(?:the|a|an) (?:room|house|bedroom|office) feels (?:very )?wet\b/i
  ];
  if(rejects.some(function(re){return re.test(en)}))return false;
  if(!standalonePracticeTemplateIsNatural(en))return false;
  // Dictionary-style infinitive fragments should never become dialogue lines.
  if(/^to\s+/i.test(en))return false;
  // Keep real "A/An ..." sentences, but reject noun-phrase fragments.
  if(/^(?:a|an)\s+/i.test(en)){
    const rest=en.replace(/^(?:a|an)\s+/i,"");
    if(!/\b(?:am|is|are|was|were|can|could|will|would|should|must|have|has|had|do|does|did|need|needs|want|wants|like|likes|love|loves|go|goes|went|come|comes|came|make|makes|made|take|takes|took|give|gives|gave|work|works|worked|live|lives|lived|visit|visits|visited|call|calls|called|try|tries|tried|feel|feels|felt|look|looks|looked|seem|seems|seemed|help|helps|helped|keep|keeps|kept|start|starts|started|finish|finishes|finished|read|reads|wrote|write|writes|see|sees|saw|hear|hears|heard|find|finds|found|buy|buys|bought|open|opens|opened|close|closes|closed|sit|sits|sat|stand|stands|stood|sleep|sleeps|slept|eat|eats|ate|drink|drinks|drank|play|plays|played|study|studies|studied|learn|learns|learned|plan|plans|planned|enjoy|enjoys|enjoyed)\b/i.test(rest))return false;
  }
  const semanticRejects=[
    /^they properly use the app\.$/i,
    /^this (?:plan|situation|difficulty|hall|bottom) is (?:immediate|primary|useful in daily life|same|dry|funny)\b/i,
    /^(?:the|this) tennis is useful in daily life\.$/i,
    /^i noticed (?:youth|iron|steel) this morning\.$/i
  ];
  if(semanticRejects.some(function(re){return re.test(en)}))return false;
  return true;
}
function communicationPracticePool(){
  const sig=derivedPoolSignature();
  if(derivedPools.signature===sig&&Array.isArray(derivedPools.communication))return derivedPools.communication;
  const out=db.communication.map(function(d){
    const lines=(d.lines||[]).filter(function(l){return Array.isArray(l)&&communicationLineIsNatural(l[1])});
    return {...d,lines};
  }).filter(function(d){return d&&d.lines.length>=2});
  derivedPools.signature=sig;
  derivedPools.communication=out;
  return out;
}
function guessLang(text){
  const t=String(text??"");
  if(/[\u3400-\u9fff]/.test(t))return "zh-CN";
  if(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(t))return "vi-VN";
  return "en-US";
}
function dateKey(d){
  const x=d||new Date();
  return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");
}
function normalizeDailyHistory(input){
  const map=new Map();
  for(const row of Array.isArray(input)?input:[]){
    if(!row||typeof row!=="object")continue;
    const date=String(row.date||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    const units=Math.max(0,Math.min(100000,Math.floor(Number(row.units)||0)));
    const goalRaw=Number(row.goal);
    const goal=Number.isFinite(goalRaw)?Math.max(1,Math.min(100,Math.floor(goalRaw))):10;
    map.set(date,{date,units,goal});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
}
function syncDailyHistoryEntry(){
  const history=normalizeDailyHistory(db.stats.dailyHistory);
  const date=String(db.stats.dailyDate||dateKey());
  const units=Math.max(0,Math.floor(Number(db.stats.dailyUnits)||0));
  const goal=dailyGoal();
  const found=history.findIndex(x=>x.date===date);
  const entry={date,units,goal};
  if(found>=0)history[found]=entry;else history.push(entry);
  db.stats.dailyHistory=history.slice(-30);
}
function ensureDailyProgress(){
  const today=dateKey();
  if(String(db.stats.dailyDate||"")!==today){db.stats.dailyDate=today;db.stats.dailyUnits=0;}
  db.stats.dailyHistory=normalizeDailyHistory(db.stats.dailyHistory);
}
function recordStudyUnit(){
  ensureDailyProgress();
  db.stats.dailyUnits=(Number(db.stats.dailyUnits)||0)+1;
  syncDailyHistoryEntry();
}
function dailyHistorySeries(days=7){
  const n=Math.max(1,Math.min(30,Math.floor(Number(days)||7)));
  const history=new Map(normalizeDailyHistory(db.stats.dailyHistory).map(x=>[x.date,x]));
  const out=[];
  const today=new Date();
  today.setHours(0,0,0,0);
  for(let i=n-1;i>=0;i--){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const date=dateKey(d),row=history.get(date)||{date,units:0,goal:dailyGoal()};
    out.push({...row,label:String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0"),pct:Math.min(100,Math.round((row.units/Math.max(1,row.goal))*100))});
  }
  return out;
}
function dailyGoalsMet(days=7){
  return dailyHistorySeries(days).filter(x=>x.units>=x.goal).length;
}
function setDailyGoal(value){
  const n=Number(value);
  if(!Number.isInteger(n)||n<1||n>100){toast("Mục tiêu ngày không hợp lệ.");return}
  ensureDailyProgress();
  db.profile.dailyGoal=n;
  syncDailyHistoryEntry();
  save();
  render();
}
function dailyGoal(){const n=Number(db.profile.dailyGoal);return Number.isFinite(n)?Math.max(1,Math.min(100,Math.floor(n))):10;}
function dailyPercent(){ensureDailyProgress();return Math.min(100,Math.round((Number(db.stats.dailyUnits)||0)/dailyGoal()*100));}
function weakVocabularyPool(){
  const weak=db.vocab.filter(v=>v.status==="Chưa nhớ"||v.status==="Review"||Number(v.wrong_count||0)>Number(v.correct_count||0));
  const fresh=db.vocab.filter(v=>v.status==="New");
  const weakSet=new Set(weak),freshSet=new Set(fresh);
  const rest=db.vocab.filter(v=>!weakSet.has(v)&&!freshSet.has(v));
  return [...weak,...fresh,...rest];
}
function recordActivity(){
  const today=dateKey(),last=String(db.stats.lastActivityDate||"");
  ensureDailyProgress();
  recordStudyUnit();
  if(last===today)return;
  if(last){
    const a=new Date(last+"T00:00:00"),b=new Date(today+"T00:00:00");
    const diff=Math.round((b-a)/86400000);
    db.stats.streak=diff===1?(Number(db.stats.streak)||0)+1:1;
  }else db.stats.streak=1;
  db.stats.lastActivityDate=today;
  pulseStreak();
}
function contentSnapshot(source){
  const d=source||db;
  return {
    vocab:Array.isArray(d.vocab)?d.vocab:[],
    sentences:Array.isArray(d.sentences)?d.sentences:[],
    questions:Array.isArray(d.questions)?d.questions:[],
    grammar:Array.isArray(d.grammar)?d.grammar:[],
    communication:Array.isArray(d.communication)?d.communication:[],
    trilingual:Array.isArray(d.trilingual)?d.trilingual:[],
    lastRemoteVersion:String(d.lastRemoteVersion||""),
    contentCounts:{...(d.contentCounts||{})}
  };
}
function userSnapshot(source){
  const d=source||db,stats={...(d.stats||{})},profile={...(d.profile||{})};
  const states=Array.isArray(d.vocab)?d.vocab.map(function(v){return {
    word:v.word,status:v.status||"New",favorite:!!v.favorite,reviewDue:v.reviewDue||null,
    correct_count:Number(v.correct_count)||0,wrong_count:Number(v.wrong_count)||0,reviewStreak:Number(v.reviewStreak)||0,lastReviewed:v.lastReviewed||null
  }}):[];
  const p=d.positions||{flashIndex,listenIndex,speakIndex,quizIndex};
  return {schemaVersion:2,stats,profile,positions:p,vocabState:states};
}
function applyUserSnapshot(snapshot){
  if(!snapshot)return;
  db.stats={...db.stats,...(snapshot.stats||{})};
  const numericStats=["xp","streak","learned","answered","correct","sentenceAnswered","sentenceCorrect","speakingAttempts","speakingGood","dailyUnits","practiceCompleted"];
  numericStats.forEach(function(k){
    const n=Number(db.stats[k]);
    db.stats[k]=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
  });
  db.stats.correct=Math.min(db.stats.correct,db.stats.answered);
  db.stats.sentenceCorrect=Math.min(db.stats.sentenceCorrect,db.stats.sentenceAnswered);
  db.stats.speakingGood=Math.min(db.stats.speakingGood,db.stats.speakingAttempts);
  db.stats.dailyHistory=normalizeDailyHistory(db.stats.dailyHistory);
  db.profile={...db.profile,...(snapshot.profile||{})};
  if(!["light","dark"].includes(String(db.profile.theme)))db.profile.theme="light";
  if(typeof db.profile.autoUpdate!=="boolean")db.profile.autoUpdate=true;
  if(!["auto","phone","desktop"].includes(String(db.profile.layout)))db.profile.layout="auto";
  const rate=Number(db.profile.speechRate);
  db.profile.speechRate=Number.isFinite(rate)?Math.max(0.5,Math.min(1.5,rate)):1;
  const goal=Number(db.profile.dailyGoal);
  db.profile.dailyGoal=Number.isFinite(goal)?Math.max(1,Math.min(100,Math.floor(goal))):10;
  ensureDailyProgress();
  const p=snapshot.positions||{};
  flashIndex=Number.isFinite(Number(p.flashIndex))?Number(p.flashIndex):flashIndex;
  listenIndex=Number.isFinite(Number(p.listenIndex))?Number(p.listenIndex):listenIndex;
  speakIndex=Number.isFinite(Number(p.speakIndex))?Number(p.speakIndex):speakIndex;
  quizIndex=Number.isFinite(Number(p.quizIndex))?Number(p.quizIndex):quizIndex;
  const states=(Array.isArray(snapshot.vocabState)?snapshot.vocabState:[]).filter(function(s){return s&&typeof s==="object"&&String(s.word||"").trim()});
  if(!Array.isArray(db.vocab)||!db.vocab.length){pendingUserState=states;return;}
  const map=new Map(states.map(function(s){return [norm(s.word),s]}));
  const allowedStatus=new Set(["New","Learning","Review","Mastered","Chưa nhớ","Đã nhớ","Rất dễ"]);
  db.vocab.forEach(function(v){
    const s=map.get(norm(v.word));if(!s)return;
    v.status=allowedStatus.has(String(s.status))?String(s.status):(v.status||"New");
    v.favorite=!!s.favorite;v.reviewDue=s.reviewDue??v.reviewDue??null;
    const correct=Number(s.correct_count),wrong=Number(s.wrong_count);
    v.correct_count=Number.isFinite(correct)?Math.max(0,Math.floor(correct)):0;
    v.wrong_count=Number.isFinite(wrong)?Math.max(0,Math.floor(wrong)):0;
    const streak=Number(s.reviewStreak);
    v.reviewStreak=Number.isFinite(streak)?Math.max(0,Math.floor(streak)):Number(v.reviewStreak||0);
    v.lastReviewed=s.lastReviewed||v.lastReviewed||null;
  });
  db.stats.learned=db.vocab.filter(function(v){return ["Learning","Review","Mastered","Đã nhớ","Rất dễ"].includes(v.status)}).length;
  pendingUserState=null;
}
function openContentDB(){
  if(!window.indexedDB)return Promise.resolve(null);
  return new Promise(function(resolve){
    try{
      const req=window.indexedDB.open(CONTENT_DB_NAME,1);
      req.onupgradeneeded=function(e){
        const database=e.target.result;
        if(!database.objectStoreNames.contains(CONTENT_STORE))database.createObjectStore(CONTENT_STORE,{keyPath:"id"});
      };
      req.onsuccess=function(){resolve(req.result)};
      req.onerror=function(){resolve(null)};
    }catch(e){resolve(null)}
  });
}
function cacheContent(source){
  const payload={id:"main",savedAt:new Date().toISOString(),...contentSnapshot(source)};
  return openContentDB().then(function(database){
    if(!database)return false;
    return new Promise(function(resolve){
      try{
        const tx=database.transaction(CONTENT_STORE,"readwrite"),store=tx.objectStore(CONTENT_STORE);
        store.put(payload);
        tx.oncomplete=function(){database.close();resolve(true)};
        tx.onerror=function(){database.close();resolve(false)};
        tx.onabort=function(){database.close();resolve(false)};
      }catch(e){try{database.close()}catch(_e){}resolve(false)}
    });
  });
}
function readCachedContent(){
  return openContentDB().then(function(database){
    if(!database)return null;
    return new Promise(function(resolve){
      try{
        const tx=database.transaction(CONTENT_STORE,"readonly"),req=tx.objectStore(CONTENT_STORE).get("main");
        req.onsuccess=function(){const value=req.result||null;database.close();resolve(value)};
        req.onerror=function(){database.close();resolve(null)};
      }catch(e){try{database.close()}catch(_e){}resolve(null)}
    });
  });
}
function usableCachedContent(cached){
  if(!cached||typeof cached!=="object")return false;
  const keys=["vocab","sentences","questions","grammar","communication","trilingual"];
  const complete=keys.every(function(key){
    const arr=Array.isArray(cached[key])?cached[key]:[];
    const expected=Number(cached.contentCounts?.[key]);
    return arr.length>0&&Number.isFinite(expected)&&expected===arr.length;
  });
  if(!complete)return false;
  try{validateIncomingContent(contentSnapshot(cached));return true}catch(e){return false}
}
function save(){
  try{
    db.positions={flashIndex,listenIndex,speakIndex,quizIndex};
    const snapshot=userSnapshot();
    snapshot.stats.dailyDate=String(snapshot.stats.dailyDate||"");
    snapshot.stats.dailyUnits=Math.max(0,Math.floor(Number(snapshot.stats.dailyUnits)||0));
    snapshot.stats.practiceCompleted=Math.max(0,Math.floor(Number(snapshot.stats.practiceCompleted)||0));
    const serialized=JSON.stringify(snapshot);
    const previous=localStorage.getItem(STORAGE_KEY);
    if(previous){
      try{
        const prevParsed=JSON.parse(previous);
        const prevSnapshot=(prevParsed&&typeof prevParsed==="object"&&Array.isArray(prevParsed.vocabState))
          ? prevParsed
          : userSnapshot(prevParsed);
        localStorage.setItem(STORAGE_KEY+"_backup",JSON.stringify(prevSnapshot));
      }catch(e){}
    }
    localStorage.setItem(STORAGE_KEY,serialized);
    return true;
  }catch(e){
    toast("Không thể lưu tiến độ. Hãy giải phóng bộ nhớ trình duyệt rồi thử lại.");
    return false;
  }
}
function savedProgressLooksUsable(parsed){
  if(!parsed||typeof parsed!=="object")return false;
  if(Array.isArray(parsed.vocabState)&&parsed.stats&&typeof parsed.stats==="object"&&parsed.profile&&typeof parsed.profile==="object"){
    return parsed.vocabState.every(function(s){return s&&typeof s==="object"&&String(s.word||"").trim()});
  }
  return Array.isArray(parsed.vocab);
}
function legacyContentLooksUsable(parsed){
  if(!parsed||typeof parsed!=="object")return false;
  const keys=["vocab","sentences","questions","grammar","communication","trilingual"];
  return keys.every(function(key){
    const arr=parsed[key];
    return Array.isArray(arr)&&arr.length>0&&arr.every(function(item){return item&&typeof item==="object"});
  });
}
function load(){
  let parsed=null,current=null;
  try{
    current=localStorage.getItem(STORAGE_KEY);
    try{parsed=current?JSON.parse(current):null}catch(e){}
  }catch(e){}
  if(!savedProgressLooksUsable(parsed)){
    try{
      const backup=localStorage.getItem(STORAGE_KEY+"_backup");
      const backupParsed=backup?JSON.parse(backup):null;
      if(savedProgressLooksUsable(backupParsed)){parsed=backupParsed;toast("Đã khôi phục tiến độ từ bản sao lưu cục bộ.");}
      else parsed=null;
    }catch(e){parsed=null}
  }
  if(parsed&&legacyContentLooksUsable(parsed)){
    try{
      validateIncomingContent(contentSnapshot(parsed));
      legacyStorageLoaded=true;
      db={
        ...db,...parsed,
        schemaVersion:2,
        vocab:parsed.vocab,sentences:parsed.sentences,questions:parsed.questions,
        grammar:parsed.grammar,communication:parsed.communication,trilingual:parsed.trilingual,
        stats:{...db.stats,...(parsed.stats||{})},
        profile:{...db.profile,...(parsed.profile||{})}
      };
      invalidateDerivedPools();
    }catch(e){legacyStorageLoaded=false}
  }
  applyUserSnapshot(parsed);
}
async function hydrateContent(){
  if(legacyStorageLoaded&&db.vocab.length){
    const cached=await cacheContent(db);
    if(cached){
      legacyStorageLoaded=false;
      save();
    }
  }
  const liveUserState=userSnapshot(db);
  const cached=await readCachedContent();
  if(cached&&usableCachedContent(cached)){
    db={...db,...contentSnapshot(cached)};
    invalidateDerivedPools();
    applyUserSnapshot(liveUserState);
    if(pendingUserState)applyUserSnapshot({vocabState:pendingUserState});
    validateContent(true);
    render();
  }
  const hasContent=[db.vocab,db.sentences,db.questions,db.grammar,db.communication,db.trilingual].every(function(arr){return Array.isArray(arr)&&arr.length>0});
  if(!hasContent){
    showBootSkeleton();
    await updateOnline(true);
  }else if(db.profile.autoUpdate!==false){
    setTimeout(function(){updateOnline(false)},500);
  }
}
function setSyncIndicator(state,text){
  const el=$("syncStatus");if(!el)return;
  const labels={idle:["●","Đồng bộ"],sync:["↻","Đang đồng bộ"],ok:["✓","Đã đồng bộ"],offline:["•","Ngoại tuyến"],error:["!","Cập nhật lỗi"]};
  const x=labels[state]||labels.idle;
  el.textContent=x[0]+" "+x[1];
  if(el.dataset)el.dataset.state=state;
  el.setAttribute("aria-label",text||x[1]);
  el.title=text||x[1];
}
function showBootSkeleton(){
  const el=$("view");if(!el)return;
  el.classList.add("boot-loading");
  el.innerHTML='<section class="card hero skeleton-hero"><div class="skeleton-line wide"></div><div class="skeleton-line"></div><div class="skeleton-chips"><span></span><span></span><span></span></div><div class="skeleton-progress"></div></section><div class="grid"><div class="card skeleton-card"><span></span><span></span></div><div class="card skeleton-card"><span></span><span></span></div><div class="card skeleton-card"><span></span><span></span></div></div>';
}
let toastTimer=0;
function toast(msg){
  const el=$("toast"); if(!el)return;
  el.textContent=msg; el.className="show"; el.setAttribute("role","status"); el.setAttribute("aria-live","polite");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.className=""},2600);
}
let xpFxNodes=0,streakFxTimer=0;
function showXpBurst(amount){
  const n=Math.max(0,Number(amount)||0),root=document.body;
  if(!root||!n)return;
  const el=document.createElement("div");
  el.className="xp-burst";
  el.textContent="+"+n+" XP";
  el.setAttribute("aria-hidden","true");
  if(xpFxNodes>=3){
    const old=root.querySelector?root.querySelector(".xp-burst"):null;
    if(old){old.remove();xpFxNodes=Math.max(0,xpFxNodes-1)}
  }
  root.appendChild(el);
  xpFxNodes++;
  setTimeout(function(){el.remove();xpFxNodes=Math.max(0,xpFxNodes-1)},850);
}
function pulseStreak(){
  const el=$("streak");if(!el)return;
  el.classList.remove("streak-pulse");
  void el.offsetWidth;
  el.classList.add("streak-pulse");
  if(streakFxTimer)clearTimeout(streakFxTimer);
  streakFxTimer=setTimeout(function(){el.classList.remove("streak-pulse")},600);
}
function addXP(n){
  const amount=Number(n)||0;
  db.stats.xp=(db.stats.xp||0)+amount;
  if(amount>0)showXpBurst(amount);
}
let uiFeedbackTimer=0;
function playUiFeedback(kind){
  const el=$("view");if(!el)return;
  const cls=kind==="bad"?"feedback-bad":kind==="xp"?"feedback-xp":"feedback-good";
  el.classList.remove("feedback-good","feedback-bad","feedback-xp");
  void el.offsetWidth;
  el.classList.add(cls);
  if(uiFeedbackTimer)clearTimeout(uiFeedbackTimer);
  uiFeedbackTimer=setTimeout(function(){el.classList.remove(cls)},620);
}
function animateResult(id,kind){
  const el=$(id);if(!el)return;
  el.classList.remove("result-good","result-bad");
  void el.offsetWidth;
  el.classList.add(kind==="bad"?"result-bad":"result-good");
}
function reviewIntervalDays(v,rating){
  const streak=Math.max(1,Number(v?.reviewStreak)||1);
  if(rating==="Chưa nhớ")return 0;
  const base=[1,2,4,7,14,30,60][Math.min(6,streak-1)]||60;
  return rating==="Rất dễ"?Math.min(90,base*2):base;
}
function recordVocabOutcome(word,correct,dueDays,rating){

  const key=norm(word);
  if(!key)return;
  const v=db.vocab.find(function(x){return norm(x.word)===key});
  if(!v)return;
  v.lastReviewed=new Date().toISOString();
  if(correct){
    const wasLearned=["Learning","Review","Mastered","Đã nhớ","Rất dễ"].includes(v.status);
    v.correct_count=(Number(v.correct_count)||0)+1;
    v.reviewStreak=Math.max(0,Number(v.reviewStreak)||0)+1;
    if(!wasLearned)db.stats.learned=(Number(db.stats.learned)||0)+1;
    if(v.status==="New"||v.status==="Chưa nhớ")v.status="Learning";
    const days=dueDays!==undefined?Math.max(0,Number(dueDays)||0):reviewIntervalDays(v,rating);
    v.reviewDue=new Date(Date.now()+days*86400000).toISOString();
  }else{
    v.wrong_count=(Number(v.wrong_count)||0)+1;
    v.reviewStreak=0;
    v.status="Chưa nhớ";
    v.reviewDue=new Date().toISOString();
  }
  db.stats.learned=db.vocab.filter(function(x){return ["Learning","Review","Mastered","Đã nhớ","Rất dễ"].includes(x.status)}).length;
}

function stopRecognition(){
  recognitionToken++;
  clearRecognitionTimer();
  if(activeRecognition){try{activeRecognition.onend=null;activeRecognition.abort()}catch(e){} activeRecognition=null;}
}
function show(v){
  stopSpeech();
  stopRecognition();
  if(listenAdvanceTimer){clearTimeout(listenAdvanceTimer);listenAdvanceTimer=0;}
  if(v!=="flashcards"&&v!=="reviewSummary"){reviewQueue=[];reviewIndex=0;quickReviewActive=false;reviewSession={active:false,mode:"",total:0,answered:0,remembered:0,forgot:0,xp:0};}
  if(v!=="practice"){practiceQueue=[];practiceIndex=0;practiceAnswered=false;practiceAnswerOrder=[];practiceCorrectCount=0;practiceAnsweredCount=0;practiceSessionXp=0;}
  renderMotion=true;view=v;render();
}
function learnNext(){
  const due=db.vocab.some(v=>v.reviewDue&&new Date(v.reviewDue)<=new Date());
  const weak=db.vocab.some(v=>v.status==="Chưa nhớ"||v.status==="Review");
  if(due||weak){startReview();return;}
  show("practice");
}
function shell(title,sub,body){
  const xp=Number(db.stats?.xp)||0,streak=Number(db.stats?.streak)||0,done=Number(db.stats?.dailyUnits)||0,target=dailyGoal(),pct=Math.min(100,Math.round((done/Math.max(1,target))*100));
  return '<section class="card hero"><div class="hero-top"><div><h1 class="title">'+esc(title)+'</h1><p class="muted">'+esc(sub||"")+'</p></div><div class="hero-stats" aria-label="Tiến độ nhanh"><span class="hero-chip flame">🔥 <b>'+streak+'</b><small>ngày</small></span><span class="hero-chip xp">⭐ <b>'+xp+'</b><small>XP</small></span><span class="hero-chip goal">🎯 <b>'+pct+'%</b><small>hôm nay</small></span></div></div><div class="hero-progress" aria-hidden="true"><span style="width:'+pct+'%"></span></div></section>'+(body||"")
}
function shuffle(arr){
  const a=Array.isArray(arr)?arr.slice():[];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
let speechToken=0,activeAudio=null,audioCache=new Map(),voiceCache=[],voiceCacheReady=false,recognitionTimer=0;
const AUDIO_CACHE_LIMIT=12;
function refreshVoiceCache(){
  try{
    const synth=window.speechSynthesis;
    voiceCache=synth&&typeof synth.getVoices==="function"?(synth.getVoices()||[]):[];
    voiceCacheReady=true;
  }catch(e){voiceCache=[];voiceCacheReady=false}
  return voiceCache;
}
function installVoiceCache(){
  try{
    const synth=window.speechSynthesis;if(!synth)return;
    refreshVoiceCache();
    const update=function(){refreshVoiceCache()};
    if(typeof synth.addEventListener==="function")synth.addEventListener("voiceschanged",update);
    else if("onvoiceschanged" in synth)synth.onvoiceschanged=update;
  }catch(e){}
}
function getVoice(lang){
  try{
    const vs=voiceCacheReady?voiceCache:refreshVoiceCache();
    const p=String(lang||"en-US").toLowerCase(),parts=p.split("-"),base=parts[0],region=parts[1]||"";
    let best=null,bestScore=Infinity;
    for(const v of vs){
      const vl=String(v?.lang||"").toLowerCase();
      if(!vl)continue;
      let score=Infinity;
      if(vl===p)score=0;
      else if(region&&vl===base+"-"+region)score=1;
      else if(vl===base)score=3;
      else if(vl.startsWith(base+"-"))score=5;
      else continue;
      if(v.default)score-=0.75;
      if(v.localService)score-=0.25;
      if(score<bestScore){bestScore=score;best=v;}
    }
    return best;
  }catch(e){return null}
}
function trimAudioCache(){
  while(audioCache.size>AUDIO_CACHE_LIMIT){
    const first=audioCache.keys().next().value,firstAudio=audioCache.get(first);
    if(firstAudio===activeAudio){
      const alternate=[...audioCache.keys()].find(function(k){return audioCache.get(k)!==activeAudio});
      if(alternate===undefined)break;
      audioCache.delete(alternate);
    }else audioCache.delete(first);
  }
}
function preloadAudio(url){
  const u=String(url||"").trim();
  if(!u||audioCache.has(u))return;
  try{const a=new Audio(u);a.preload="auto";audioCache.set(u,a);trimAudioCache()}catch(e){}
}
function preloadItemAudio(item,lang){
  const url=audioUrl(item,lang);if(url)preloadAudio(url);
}
function audioCacheSize(){return audioCache.size}
function stopSpeech(){
  speechToken++;
  if("speechSynthesis" in window){try{window.speechSynthesis.cancel()}catch(e){} }
  if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}
}
function splitSpeechText(text,maxLength=180){
  const t=String(text??"").trim();if(!t)return [];
  if(t.length<=maxLength)return [t];
  const chunks=[],words=t.split(/\s+/);let current="";
  words.forEach(function(word){
    if(!current){current=word;return}
    if((current+" "+word).length<=maxLength){current+=" "+word;return}
    chunks.push(current);current=word;
  });
  if(current)chunks.push(current);
  return chunks.length?chunks:[t];
}
function speak(text,rate,lang,retry,skipContentAudio){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const t=String(text??"").trim();if(!t)return;
  if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}
  const token=++speechToken;
  const r=Math.max(0.5,Math.min(1.5,Number(rate)||Number(db.profile.speechRate)||1)),l=lang||"en-US",attempt=Number(retry||0);
  if(!skipContentAudio){
    let item=null;const practice=sentencePracticePool();
    if(view==="listening"&&practice.length)item=practice[normalizeArrayIndex(listenIndex,practice.length)];
    else if(view==="speaking"&&practice.length)item=practice[normalizeArrayIndex(speakIndex,practice.length)];
    const contentAudio=audioUrl(item,l);
    if(contentAudio){playAudio(contentAudio,t,r,l);return}
  }
  const parts=splitSpeechText(t),active=function(){return token===speechToken};let partIndex=0;
  const runPart=function(){
    if(!active()||partIndex>=parts.length)return;
    try{window.speechSynthesis.cancel()}catch(e){}
    const u=new SpeechSynthesisUtterance(parts[partIndex++]);
    u.lang=l;u.rate=r;u.pitch=1;u.volume=1;
    const v=getVoice(l);if(v)u.voice=v;
    u.onend=function(){if(active())setTimeout(runPart,20)};
    u.onerror=function(){
      if(!active())return;
      if(attempt<1)setTimeout(function(){if(active())speak(t,r,l,1,skipContentAudio)},160);
      else toast("Âm thanh gặp lỗi. Bấm Nghe lại để thử tiếp.");
    };
    try{window.speechSynthesis.resume();if(active())window.speechSynthesis.speak(u)}
    catch(e){
      if(attempt<1)setTimeout(function(){if(active())speak(t,r,l,1,skipContentAudio)},160);
      else toast("Không thể phát âm thanh.");
    }
  };
  const voices=refreshVoiceCache();
  if(!voices.length&&"onvoiceschanged" in window&&attempt<1){
    let done=false;
    const once=function(){if(done||!active())return;done=true;try{window.speechSynthesis.onvoiceschanged=null}catch(e){}refreshVoiceCache();runPart()};
    try{window.speechSynthesis.onvoiceschanged=once}catch(e){}
    setTimeout(function(){if(!done){done=true;try{window.speechSynthesis.onvoiceschanged=null}catch(e){}runPart()}},140);
  }else runPart();
}
function speakSequence(lines,rate,lang){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const seq=(lines||[]).map(String).map(function(x){return x.trim()}).filter(Boolean),r=Math.max(0.5,Math.min(1.5,Number(rate)||0.92)),l=lang||"en-US",token=++speechToken;
  if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}
  try{window.speechSynthesis.cancel()}catch(e){}
  let i=0;
  function next(){
    if(token!==speechToken||i>=seq.length)return;
    const u=new SpeechSynthesisUtterance(seq[i++]);u.lang=l;u.rate=r;u.pitch=1;u.volume=1;
    const v=getVoice(l);if(v)u.voice=v;
    u.onend=function(){if(token===speechToken)next()};
    u.onerror=function(){if(token===speechToken)setTimeout(next,120)};
    try{
      window.speechSynthesis.resume();
      if(token===speechToken)window.speechSynthesis.speak(u);
    }catch(e){
      if(token===speechToken)toast("Không thể phát chuỗi âm thanh. Bấm Nghe lại để thử.");
    }
  }
  next();
}
function playAudio(url,fallbackText,rate,lang){
  const u=String(url||"").trim(),t=String(fallbackText||"").trim(),r=Math.max(0.5,Math.min(2,Number(rate)||1)),l=lang||guessLang(t);
  if(!u){if(t)speak(t,r,l);return}
  const token=++speechToken;
  if("speechSynthesis" in window)window.speechSynthesis.cancel();
  try{
    if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0}catch(e){}activeAudio=null}
    let a=audioCache.get(u);
    if(!a){a=new Audio(u);a.preload="auto";audioCache.set(u,a);trimAudioCache()}
    try{a.currentTime=0}catch(e){}
    a.playbackRate=r;activeAudio=a;
    let failed=false;
    const fallback=function(){
      if(failed)return;failed=true;
      if(audioCache.get(u)===a)audioCache.delete(u);
      if(activeAudio===a)activeAudio=null;
      if(token!==speechToken)return;
      toast("Không phát được file âm thanh. Chuyển sang giọng đọc trình duyệt.");
      if(t)speak(t,r,l,0,true);
    };
    a.onended=function(){if(activeAudio===a)activeAudio=null};
    a.onerror=fallback;
    const p=a.play();if(p&&typeof p.catch==="function")p.catch(fallback);
  }catch(e){
    if(activeAudio)activeAudio=null;
    if(token===speechToken){toast("Không thể phát file âm thanh. Chuyển sang giọng đọc trình duyệt.");if(t)speak(t,r,l,0,true)}
  }
}
function audioUrl(item,lang){
  if(!item||typeof item!=="object")return "";
  const l=String(lang||"").toLowerCase(),base=l.slice(0,2);
  const keys=base==="en"?["audioEn","audio_en","enAudio"]:base==="zh"?["audioZh","audio_zh","zhAudio","chineseAudio"]:base==="vi"?["audioVi","audio_vi","viAudio","vietnameseAudio"]:[];
  for(const k of keys){const v=String(item[k]||"").trim();if(v)return v;}
  const generic=String(item.audio||item.audioUrl||item.audio_url||"").trim();
  if(!generic)return "";
  const genericLang=String(item.audioLang||item.audio_lang||"").toLowerCase();
  if(genericLang)return genericLang.startsWith(base)?generic:"";
  const multilingual=!!(item.zh||item.chinese||item.vi||item.vietnamese);
  return !multilingual||base==="en"?generic:"";
}
function audioButton(text,label,lang,rate,item){
  const useLang=lang||guessLang(text),useRate=Number(rate)||Number(db.profile.speechRate)||1;
  const primaryText=(function(){
    if(!item||typeof item!=="object"||Array.isArray(item))return "";
    const l=String(useLang).toLowerCase();
    return l.startsWith("zh")?String(item.zh||item.chinese||"").trim():
      l.startsWith("vi")?String(item.vi||item.vietnamese||"").trim():
      String(item.word||item.en||"").trim();
  })();
  const url=primaryText&&norm(primaryText)===norm(text)?audioUrl(item,useLang):"";
  if(url)return '<button class="btn btn-secondary" onclick="event.stopPropagation();playAudio(\''+escapeJs(url)+'\',\''+escapeJs(text)+'\','+useRate+',\''+useLang+'\')">'+(label||"🔊 Nghe")+'</button>';
  return '<button class="btn btn-secondary" onclick="event.stopPropagation();speak(\''+escapeJs(text)+'\','+useRate+',\''+useLang+'\')">'+(label||"🔊 Nghe")+'</button>';
}
function audioGroup(text,lang,item){
  const l=lang||guessLang(text);
  return '<div class="actions">'+audioButton(text,"🔊 Nghe",l,1,item)+audioButton(text,"🐢 0.75×",l,0.75,item)+audioButton(text,"🐇 1.25×",l,1.25,item)+'</div>';
}


function mergeBy(arr,incoming,keyFn,shouldReplace){
  const target=Array.isArray(arr)?arr.slice():[], map=new Map();
  target.forEach(function(x,i){const k=keyFn(x);if(k)map.set(k,i)});
  for(const x of (incoming||[])){
    const k=keyFn(x); if(!k)continue;
    if(!map.has(k)){target.push(x);map.set(k,target.length-1)}
    else if(shouldReplace&&shouldReplace(target[map.get(k)],x)){target[map.get(k)]={...target[map.get(k)],...x}}
  }
  return target;
}
function blandExample(s){return /^I learned the word/i.test(String(s||""))}
function remoteReplaceAllowed(old){
  return blandExample(old?.example)||blandExample(old?.en)||old?.source==="remote";
}
async function getJSON(url){
  const sep=url.includes("?")?"&":"?";
  const r=await fetch(url+sep+"t="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return r.json();
}
async function updateOnline(force){
  if(updateInProgress){toast("Đang cập nhật dữ liệu, vui lòng chờ lượt này hoàn tất.");return}
  updateInProgress=true;
  setSyncIndicator("sync","Đang kiểm tra và đồng bộ dữ liệu");
  try{
    const m=await getJSON(DATA_URL),ver=String(m.version??"");
    if(!ver)throw new Error("version.json thiếu version");
    const files=m.files||{},spec={
      vocab:{path:files.vocabulary||"vocabulary.json",key:x=>norm(x.word)},
      sentences:{path:files.sentences||"sentences.json",key:x=>String(x.id||norm(x.en))},
      questions:{path:files.questions||"questions.json",key:x=>String(x.id||norm(x.prompt))},
      grammar:{path:files.grammar||"grammar.json",key:x=>String(x.id||norm(x.title))},
      communication:{path:files.communication||"communication.json",key:x=>String(x.id||norm(x.title))},
      trilingual:{path:files.trilingual||"trilingual.json",key:x=>norm(x.en)+"|"+norm(x.zh||x.chinese)}
    };
    const hasBland=db.vocab.some(v=>blandExample(v.example))||db.sentences.some(s=>blandExample(s.en));
    const countsMatch=Object.keys(spec).every(function(key){
      return Number(db.contentCounts?.[key])>0 &&
        Number(db.contentCounts[key])===(Array.isArray(db[key])?db[key].length:0);
    });
    if(!force&&db.lastRemoteVersion===ver&&countsMatch&&!hasBland){setSyncIndicator("ok","Dữ liệu đang mới nhất");toast("Dữ liệu đang mới nhất.");return}

    const incoming={};
    const downloaded=await Promise.all(Object.keys(spec).map(async function(key){
      const raw=await getJSON(DATA_URL.replace(/\/[^/]+$/,"/"+spec[key].path));
      const arr=Array.isArray(raw)?raw:(Array.isArray(raw[key])?raw[key]:[]);
      if(!Array.isArray(arr))throw new Error(key+" không trả về mảng dữ liệu");
      return [key,arr];
    }));
    downloaded.forEach(function(pair){incoming[pair[0]]=pair[1]});
    validateIncomingContent(incoming);

    const next={
      vocab:db.vocab.slice(),sentences:db.sentences.slice(),questions:db.questions.slice(),
      grammar:db.grammar.slice(),communication:db.communication.slice(),trilingual:db.trilingual.slice()
    };
    function provenance(incomingItem,oldItem){
      const xs=String(incomingItem?.source||"").trim(),xsv=String(incomingItem?.sourceVersion||"").trim();
      const os=String(oldItem?.source||"").trim(),osv=String(oldItem?.sourceVersion||"").trim();
      return {
        source:xs&&xs!=="remote"?xs:(os||xs||"remote"),
        sourceVersion:xsv&&xsv!=="remote"?xsv:(osv||xsv||ver)
      };
    }
    let added=0,changed=0;

    for(const x of incoming.vocab){
      const i=next.vocab.findIndex(v=>norm(v.word)===norm(x.word));
      if(i<0){
        next.vocab.push({...x,...provenance(x,null),favorite:false,status:"New",reviewDue:null,correct_count:0,wrong_count:0});
        added++;
      }else{
        const oldV=next.vocab[i];
        next.vocab[i]={...oldV,...x,...provenance(x,oldV),
          favorite:oldV.favorite??false,status:oldV.status||"New",reviewDue:oldV.reviewDue??null,
          correct_count:oldV.correct_count||0,wrong_count:oldV.wrong_count||0,lastReviewed:oldV.lastReviewed||null};
        changed++;
      }
    }
    for(const x of incoming.sentences){
      const i=next.sentences.findIndex(s=>String(s.id||"")===String(x.id||""));
      if(i<0){
        next.sentences.push({...x,...provenance(x,null),favorite:false});
        added++;
      }else{
        const oldS=next.sentences[i];
        next.sentences[i]={...oldS,...x,...provenance(x,oldS),favorite:oldS.favorite??false};
        changed++;
      }
    }
    for(const key of ["questions","grammar","communication","trilingual"]){
      const arr=next[key],keyFn=spec[key].key;
      for(const x of incoming[key]){
        const k=keyFn(x),i=arr.findIndex(y=>keyFn(y)===k);
        if(i<0){arr.push({...x,...provenance(x,null)});added++;}
        else if(arr[i].source==="remote"||key==="communication"||key==="grammar"||key==="questions"){
          const oldItem=arr[i];
          arr[i]={...oldItem,...x,...provenance(x,oldItem)};changed++;
        }
      }
    }

    const remoteContent={...next,lastRemoteVersion:ver,
      contentCounts:Object.fromEntries(Object.keys(next).map(function(key){return [key,next[key].length]}))
    };
    db={...db,...remoteContent};
    invalidateDerivedPools();
    validateContent(true);
    if(pendingUserState){applyUserSnapshot({vocabState:pendingUserState});pendingUserState=null;}
    const cached=await cacheContent(db);
    if(!cached&&"indexedDB" in window)toast("Nội dung đã cập nhật nhưng chưa tạo được bản cache offline.");
    save();render();
    setSyncIndicator("ok","Đã đồng bộ dữ liệu từ GitHub");
    toast("Đã đồng bộ GitHub: +"+added+" mục mới, cập nhật "+changed+" mục.");
  }catch(e){
    setSyncIndicator("error","Cập nhật dữ liệu gặp lỗi");
    toast("Cập nhật lỗi — chưa thay đổi dữ liệu hiện tại: "+e.message);
  }finally{
    updateInProgress=false;
    setTimeout(function(){if(!updateInProgress)setSyncIndicator(db.lastRemoteVersion?"ok":"idle")},900);
  }
}
function validateIncomingContent(incoming){
  const rules={
    vocab:function(x){return x&&String(x.word||"").trim()&&String(x.meaning||"").trim()},
    sentences:function(x){
      if(!x||!String(x.id||"").trim()||!String(x.en||"").trim()||!String(x.vi||"").trim())return false;
      if(STANDALONE_SENTENCE_SOURCES.has(String(x.source||"")))return isNaturalStandaloneSentence(x);
      return true;
    },
    questions:function(x){
      const options=Array.isArray(x?.options)?x.options:[];
      const normalizedOptions=options.map(norm);
      return x&&String(x.id||"").trim()&&String(x.prompt||"").trim()&&
        options.length===4&&normalizedOptions.every(Boolean)&&
        new Set(normalizedOptions).size===4&&
        Number.isInteger(Number(x.answer))&&Number(x.answer)>=0&&Number(x.answer)<4;
    },
    grammar:function(x){return x&&String(x.title||"").trim()&&String(x.formula||"").trim()},
    communication:function(x){
      const lines=Array.isArray(x?.lines)?x.lines:[];
      // Keep the dialogue container intact; invalid/generated lines are filtered
      // by communicationPracticePool() at render time instead of rejecting the
      // whole conversation during remote hydration.
      return x&&String(x.title||"").trim()&&lines.length>=2&&
        lines.every(function(l){return Array.isArray(l)&&String(l[0]??"").trim()&&String(l[1]??"").trim()});
    },
    trilingual:function(x){return x&&String(x.en||"").trim()&&String(x.zh||x.chinese||"").trim()&&String(x.pinyin||"").trim()&&String(x.vi||x.vietnamese||"").trim()}
  };
  const bad=[];
  const keyFns={
    vocab:x=>norm((x||{}).word),sentences:x=>String((x||{}).id||""),
    questions:x=>String((x||{}).id||""),grammar:x=>String((x||{}).id||(x||{}).title||""),
    communication:x=>String((x||{}).id||(x||{}).title||""),trilingual:x=>norm((x||{}).en)+"|"+norm((x||{}).zh||(x||{}).chinese)
  };
  Object.keys(rules).forEach(function(key){
    const arr=Array.isArray(incoming[key])?incoming[key]:[];
    if(!arr.length){bad.push(key+" rỗng");return}
    const invalid=arr.reduce(function(n,x){return n+(rules[key](x)?0:1)},0);
    if(invalid>0)bad.push(key+" có "+invalid+"/"+arr.length+" mục không hợp lệ");
    const keys=arr.map(keyFns[key]).filter(Boolean),dups=keys.length-new Set(keys).size;
    if(dups>0)bad.push(key+" trùng "+dups+" khóa");
  });
  if(bad.length)throw new Error("Dữ liệu từ xa không an toàn: "+bad.join("; "));
  return true;
}
function validateContent(force){
  const signature=[db.lastRemoteVersion,db.vocab.length,db.sentences.length,db.questions.length,db.grammar.length,db.communication.length,db.trilingual.length].join("|");
  if(!force&&validatedContentSignature===signature)return [];
  const checks=[
    ["vocab",db.vocab,v=>norm(v.word)],
    ["sentences",db.sentences,v=>String(v.id||"")],
    ["questions",db.questions,v=>String(v.id||"")],
    ["grammar",db.grammar,v=>String(v.id||v.title||"")],
    ["communication",db.communication,v=>String(v.id||v.title||"")],
    ["trilingual",db.trilingual,v=>String(v.id||"")+"|"+norm(v.en)+"|"+norm(v.zh||v.chinese)]
  ];
  const issues=[];
  checks.forEach(function(item){
    const seen=new Set(),dup=new Set(),bad=[];
    (item[1]||[]).forEach(function(x){
      const k=item[2](x||{});
      if(!k)bad.push(x);
      else if(seen.has(k))dup.add(k);
      else seen.add(k);
    });
    if(dup.size)issues.push(item[0]+" trùng "+dup.size);
    if(bad.length)issues.push(item[0]+" thiếu ID/từ khóa "+bad.length);
  });
  validatedContentSignature=signature;
  if(issues.length)console.warn("[English Master] Data validation:",issues.join("; "));
  return issues;
}
function setLayoutMode(mode){
  const m=["auto","phone","desktop"].includes(String(mode))?String(mode):"auto";
  db.profile.layout=m;save();render();
}
function toggleLayoutQuick(){
  const phone=document.body.classList.contains("layout-phone");
  setLayoutMode(phone?"desktop":"phone");
}
function isPhoneViewport(){
  try{
    if(window.matchMedia)return window.matchMedia("(max-width: 800px)").matches;
  }catch(e){}
  return false;
}
function updateLayoutQuickButton(phone){
  const b=$("layoutQuick");if(!b)return;
  const nextPhone=!phone;
  const label=nextPhone?"📱":"🖥️";
  const title=nextPhone?"Chuyển sang giao diện điện thoại":"Chuyển sang giao diện máy tính";
  b.textContent=label;b.title=title;if(b.setAttribute){b.setAttribute("title",title);b.setAttribute("aria-label",title);}
}
function applyLayoutMode(){
  const m=["auto","phone","desktop"].includes(String(db.profile.layout))?db.profile.layout:"auto";
  document.body.classList.remove("layout-phone","layout-desktop");
  const phone=m==="phone"||(m==="auto"&&isPhoneViewport());
  if(phone)document.body.classList.add("layout-phone");
  else document.body.classList.add("layout-desktop");
  updateLayoutQuickButton(phone);
}
function handleViewportChange(){
  if(String(db.profile.layout)==="auto")applyLayoutMode();
}
function renderErrorFallback(error){
  const el=$("view");if(!el)return;
  const detail=error&&error.message?String(error.message):"Lỗi không xác định";
  el.innerHTML=shell("Có lỗi khi hiển thị","Dữ liệu học của bạn vẫn được giữ nguyên.",
    '<div class="card error-state"><div class="error-icon" aria-hidden="true">⚠️</div><h2>Không thể mở màn hình này</h2><p class="muted">Bạn có thể thử tải lại màn hình. Tiến độ học tập không bị xóa.</p><details><summary>Chi tiết kỹ thuật</summary><code>'+esc(detail)+'</code></details><div class="actions"><button class="primary" onclick="render()">🔄 Thử lại</button><button onclick="show("home")">🏠 Về trang chủ</button></div></div>');
}
function render(){
  db.vocab=Array.isArray(db.vocab)?db.vocab:[];db.sentences=Array.isArray(db.sentences)?db.sentences:[];
  db.questions=Array.isArray(db.questions)?db.questions:[];db.grammar=Array.isArray(db.grammar)?db.grammar:[];
  db.communication=Array.isArray(db.communication)?db.communication:[];db.trilingual=Array.isArray(db.trilingual)?db.trilingual:[];
  document.body.classList.toggle("dark",db.profile.theme==="dark");
  applyLayoutMode();
  if($("streak"))$("streak").textContent=db.stats.streak||0;
  const side=$("side");
  if(side&&typeof side.querySelectorAll==="function"){
    side.querySelectorAll("button").forEach(function(b){
      const onclick=b.getAttribute?String(b.getAttribute("onclick")||""):"";
      const m=onclick.match(/show\('([^']+)'\)/),route=m?m[1]:"";
      const active=route===view||(view==="reviewSummary"&&route==="review");
      b.classList.toggle("active",active);
      if(active&&b.setAttribute)b.setAttribute("aria-current","page");
      else if(b.removeAttribute)b.removeAttribute("aria-current");
    });
  }
  const fn={home:home,vocab:vocab,sentences:sentences,flashcards:flashcards,practice:practice,quiz:quiz,listening:listening,speaking:speaking,grammar:grammar,communication:communication,trilingual:trilingual,review:review,reviewSummary:reviewSummary,stats:stats,settings:settings}[view]||home;
  try{fn()}catch(error){console.error("[English Master] render error",error);renderErrorFallback(error)}
  const animate=renderMotion;
  renderMotion=false;
  if(animate){
    const el=$("view"),seq=++renderMotionSeq;
    if(el){
      el.classList.remove("page-enter");
      void el.offsetWidth;
      const kick=typeof window.requestAnimationFrame==="function"?window.requestAnimationFrame:function(cb){setTimeout(cb,0)};
      kick(function(){
        if(seq!==renderMotionSeq)return;
        el.classList.add("page-enter");
        setTimeout(function(){if(seq===renderMotionSeq)el.classList.remove("page-enter")},560);
      });
    }
    try{
      if(typeof window.scrollTo==="function"){
        const behavior=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
        window.scrollTo({top:0,behavior:behavior});
      }
    }catch(e){}
  }
}
function home(){
  ensureDailyProgress();
  const practiceCount=sentencePracticePool().length,done=Number(db.stats.dailyUnits)||0,target=dailyGoal(),pct=dailyPercent();
  const dueWords=db.vocab.filter(v=>v.reviewDue&&new Date(v.reviewDue)<=new Date()).map(v=>norm(v.word));
  const weakWords=db.vocab.filter(v=>v.status==="Chưa nhớ"||v.status==="Review").map(v=>norm(v.word));
  const pending=new Set(dueWords.concat(weakWords).filter(Boolean)).size;
  $("view").innerHTML=shell("English Master V"+APP_VERSION,"Học • Luyện • Nhớ • Cải thiện",
    '<div class="card"><div class="toolbar"><b>🎯 Mục tiêu hôm nay</b><b>'+done+' / '+target+'</b></div><div class="progress" style="margin-top:10px"><div class="bar" style="width:'+pct+'%"></div></div><div class="actions" style="margin-top:12px"><button class="primary" onclick="learnNext()">▶ Học tiếp</button><button onclick="startQuickStudy()">⚡ Học nhanh 10 từ</button><button onclick="show(\'practice\')">🧩 Luyện tập</button></div></div>'+
    '<div class="grid"><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Từ vựng</div></div><div class="card"><div class="big">'+practiceCount+'</div><div class="muted">Câu luyện</div></div><div class="card"><div class="big">'+db.questions.length+'</div><div class="muted">Quiz</div></div></div>'+
    '<div class="card"><h2>📌 Hôm nay</h2><p class="muted">'+(pending>0?pending+' từ đang đến hạn hoặc yếu.':'Chưa có từ cần ôn; app sẽ tạo bài luyện hỗn hợp.')+'</p><div class="actions"><button onclick="startReview(\'weak\',20)">🔄 Ôn từ yếu</button><button onclick="show(\'quiz\')">🧠 Quiz</button><button onclick="show(\'listening\')">🎧 Nghe</button><button onclick="show(\'speaking\')">🎙️ Nói</button></div></div>');
}
function pageControls(page,total,size,kind){
  const pages=Math.max(1,Math.ceil(total/size)),p=Math.min(Math.max(1,Number(page)||1),pages);
  if(pages<=1)return "";
  return '<div class="actions" style="margin:12px 0;justify-content:center">'+
    '<button onclick="goPage(\''+kind+'\','+(p-1)+')" '+(p<=1?"disabled":"")+'">← Trước</button>'+
    '<span class="muted" style="padding:9px 4px">Trang '+p+' / '+pages+'</span>'+
    '<button onclick="goPage(\''+kind+'\','+(p+1)+')" '+(p>=pages?"disabled":"")+'">Sau →</button></div>';
}
function goPage(kind,page){
  stopSpeech();
  const p=Math.max(1,Number(page)||1);
  if(kind==="vocab")vocabPage=p;
  else if(kind==="sentences")sentencePage=p;
  else if(kind==="trilingual")trilingualPage=p;
  else if(kind==="communication")communicationPage=p;
  render();
}
function jumpToItem(kind,raw){
  stopSpeech();
  const n=Math.trunc(Number(raw));
  let total=0;
  if(kind==="listening"||kind==="speaking")total=sentencePracticePool().length;
  else if(kind==="quiz")total=db.questions.length;
  else return false;
  if(!Number.isFinite(n)||n<1||n>total){
    toast("Nhập số từ 1 đến "+total+".");
    return false;
  }
  if(kind==="listening"){
    if(listenAdvanceTimer){clearTimeout(listenAdvanceTimer);listenAdvanceTimer=0}
    window.__showListeningText=false;
    listenIndex=n-1;
  }else if(kind==="speaking"){
    stopRecognition();
    speakIndex=n-1;
  }else{
    quizIndex=n-1;
    quizAnswered=false;
  }
  save();render();
  return true;
}
function jumpControl(kind,current,total){
  return '<div class="jump-control"><span class="muted small">Tới câu</span><input class="jump-input" id="'+kind+'Jump" type="number" min="1" max="'+total+'" value="'+(current+1)+'" aria-label="Tới câu" onkeydown="if(event.key===\'Enter\')jumpToItem(\''+kind+'\',this.value)"><button onclick="jumpToItem(\''+kind+'\',document.getElementById(\''+kind+'Jump\').value)">Đi</button></div>';
}

function vocab(){
  const inputValue=(document.getElementById("vSearch")||{}).value;
  const q=norm(inputValue!==undefined?inputValue:lastVocabQuery);
  if(q!==lastVocabQuery){lastVocabQuery=q;vocabPage=1;}
  const list=q?db.vocab.filter(function(v){return norm(v.word).includes(q)||norm(v.meaning).includes(q)||norm(v.example).includes(q)}):db.vocab;
  const size=50,pages=Math.max(1,Math.ceil(list.length/size));
  if(vocabPage>pages)vocabPage=pages;
  const start=(vocabPage-1)*size,items=list.slice(start,start+size);
  $("view").innerHTML=shell("Học từ vựng","Mỗi từ có IPA, nghĩa, ví dụ và nghe từ/câu.",
    '<div class="card"><div class="row"><input id="vSearch" placeholder="Tìm từ, nghĩa hoặc ví dụ..." value="'+esc(q)+'" onkeydown="if(event.key===\'Enter\')vocab()"><button class="primary" onclick="vocab()">🔎 Tìm</button><button onclick="show(\'flashcards\')">🃏 Flashcards</button></div><div class="muted small" style="margin-top:8px">Hiển thị '+(list.length?start+1:0)+'–'+Math.min(start+size,list.length)+' / '+list.length+' từ</div>'+pageControls(vocabPage,list.length,size,"vocab")+'</div>'+
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th><th>Nghe</th></tr></thead><tbody>'+
    items.map(function(v){return '<tr><td><div class="word">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||"")+'</div></td><td>'+esc(v.meaning)+'<div class="small muted">'+esc(v.pos||"")+'</div></td><td>'+esc(v.example||"")+'<div class="small muted">'+esc(v.exampleVi||"")+'</div></td><td><div class="actions">'+audioButton(v.word,"🔊 Từ","en-US",1,v)+audioButton(v.example||v.word,"🔊 Câu","en-US",1,v)+'</div></td></tr>'}).join("")+
    '</tbody></table></div>'+pageControls(vocabPage,list.length,size,"vocab")+'</div>');
}
function sentences(){
  const list=sentencePracticePool();
  const size=40,pages=Math.max(1,Math.ceil(list.length/size));
  if(sentencePage>pages)sentencePage=pages;
  const start=(sentencePage-1)*size,items=list.slice(start,start+size);
  $("view").innerHTML=shell("Học câu","Hiển thị theo trang để app nhẹ hơn trên điện thoại. Chỉ lấy câu độc lập, không gắn trực tiếp với từ vựng.",
    '<div class="card"><div class="muted small">Hiển thị '+(list.length?start+1:0)+'–'+Math.min(start+size,list.length)+' / '+list.length+' câu</div>'+pageControls(sentencePage,list.length,size,"sentences")+'</div>'+
    '<div class="grid grid-2">'+items.map(function(s){return '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted small">'+esc(s.grammar||"")+'</span></div><h3>'+esc(s.en)+'</h3><p class="muted">'+esc(s.vi||"")+'</p>'+audioGroup(s.en,"en-US",s)+'</div>'}).join("")+'</div>');
}
function renderFlashcards(){flashcards()}
function toggleFavorite(word){
  const key=norm(word),v=db.vocab.find(function(x){return norm(x.word)===key});
  if(!v)return;
  v.favorite=!v.favorite;save();render();
}
function buildReviewQueue(mode="smart",limit=20){
  const max=Math.max(1,Math.min(50,Math.floor(Number(limit)||20)));
  const now=new Date();
  const groups={
    due:db.vocab.filter(function(v){return v.reviewDue&&new Date(v.reviewDue)<=now}),
    weak:db.vocab.filter(function(v){return v.status==="Chưa nhớ"||v.status==="Review"||Number(v.wrong_count||0)>Number(v.correct_count||0)}),
    favorites:db.vocab.filter(function(v){return !!v.favorite}),
    mistakes:db.vocab.filter(function(v){return Number(v.wrong_count||0)>Number(v.correct_count||0)}),
    new:db.vocab.filter(function(v){return v.status==="New"}),
    all:db.vocab.slice()
  };
  const key=String(mode||"smart").toLowerCase();
  const order=key==="smart"?["due","weak","favorites","new"]:groups[key]?[key]:["due","weak"];
  const seen=new Set(),queue=[];
  for(const groupName of order){
    const group=groups[groupName]||[];
    for(const v of group){
      const k=norm(v.word);
      if(k&&!seen.has(k)){seen.add(k);queue.push(k);}
      if(queue.length>=max)return queue;
    }
  }
  return queue;
}
function startReview(mode="smart",limit=20){
  const queue=buildReviewQueue(mode,limit);
  if(!queue.length){toast("Không có từ phù hợp với phiên ôn này.");return;}
  reviewQueue=queue;reviewIndex=0;quickReviewActive=false;flashFlipped=false;reviewSession={active:true,mode:String(mode||"smart"),total:queue.length,answered:0,remembered:0,forgot:0,xp:0};show("flashcards");
}
function buildQuickStudyQueue(limit=10){
  return buildReviewQueue("smart",limit);
}
function startQuickStudy(){
  const queue=buildQuickStudyQueue(10);
  if(!queue.length){toast("Chưa có từ để tạo phiên học nhanh.");return;}
  reviewQueue=queue;reviewIndex=0;quickReviewActive=true;flashFlipped=false;reviewSession={active:true,mode:"quick",total:queue.length,answered:0,remembered:0,forgot:0,xp:0};show("flashcards");
  toast("Đã tạo phiên học nhanh: "+queue.length+" từ.");
}
function reviewMeta(v){
  const streak=Math.max(0,Number(v?.reviewStreak)||0);
  if(!v?.reviewDue)return '<div class="muted small">🧠 Chuỗi nhớ: '+streak+' · Ôn lại: chưa đặt lịch</div>';
  const d=new Date(v.reviewDue);
  if(Number.isNaN(d.getTime()))return '<div class="muted small">🧠 Chuỗi nhớ: '+streak+'</div>';
  return '<div class="muted small">🧠 Chuỗi nhớ: '+streak+' · Ôn lại: '+esc(d.toLocaleDateString("vi-VN"))+'</div>';
}
function flashcards(){
  if(!db.vocab.length){$("view").innerHTML=shell("Flashcards","Chưa có dữ liệu.");return}
  const reviewActive=reviewQueue.length>0;
  const list=reviewActive?reviewQueue:db.vocab;
  if(reviewActive)reviewIndex=normalizeArrayIndex(reviewIndex,reviewQueue.length);
  else flashIndex=normalizeArrayIndex(flashIndex,db.vocab.length);
  const idx=reviewActive?reviewIndex:flashIndex;
  const v=reviewActive?db.vocab.find(function(x){return norm(x.word)===norm(reviewQueue[idx%reviewQueue.length])}):list[idx%list.length];
  if(!v){reviewQueue=[];reviewIndex=0;return flashcards();}
  const front='<div><div class="big">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||"")+'</div>'+reviewMeta(v)+audioGroup(v.word,"en-US",v)+'<p class="muted">Bấm vào thẻ để lật</p></div>';
  const back='<div><div class="big">'+esc(v.meaning)+'</div><p>'+esc(v.example||"")+'</p><p class="muted">'+esc(v.exampleVi||"")+'</p>'+audioGroup(v.word,"en-US",v)+audioButton(v.example||v.word,"🔊 Nghe ví dụ","en-US",1,v)+'</div>';
  $("view").innerHTML=shell(reviewActive?(quickReviewActive?"Học nhanh hôm nay":"Ôn tập bằng Flashcards"):"Flashcards",reviewActive?(quickReviewActive?"Phiên 10 từ ưu tiên: đến hạn → yếu → mới.":"Đang ôn các từ đến hạn/chưa nhớ."):"Lật thẻ, nghe từ/câu rồi tự đánh giá.",
    '<div class="card"><div class="row" style="justify-content:space-between"><b>Thẻ '+(idx%list.length+1)+' / '+list.length+'</b><div class="actions"><button onclick="toggleFavorite(\''+escapeJs(v.word)+'\')">'+(v.favorite?"⭐ Bỏ yêu thích":"☆ Yêu thích")+'</button><button onclick="shuffleFlash()">🔀 Ngẫu nhiên</button></div></div><div class="flash '+(flashFlipped?"flipped":"")+'" onclick="flashFlipped=!flashFlipped;renderFlashcards()">'+(flashFlipped?back:front)+'</div><div class="actions"><button onclick="rateFlash(\'Chưa nhớ\')">😵 Chưa nhớ</button><button onclick="rateFlash(\'Đã nhớ\')">🙂 Đã nhớ</button><button onclick="rateFlash(\'Rất dễ\')">😎 Rất dễ</button></div></div>');
}
function rateFlash(status){
  stopSpeech();
  const reviewActive=reviewQueue.length>0;
  const idx=reviewActive?reviewIndex:flashIndex;
  const v=reviewActive?db.vocab.find(function(x){return norm(x.word)===norm(reviewQueue[idx%reviewQueue.length])}):db.vocab[idx%db.vocab.length];
  if(!v)return;
  recordActivity();
  recordVocabOutcome(v.word,status!=="Chưa nhớ",undefined,status);
  const earned=status!=="Chưa nhớ"?5:0;
  if(earned)addXP(earned);
  if(reviewActive&&reviewSession.active){reviewSession.answered++;reviewSession.xp+=earned;if(status==="Chưa nhớ")reviewSession.forgot++;else reviewSession.remembered++;}
  v.status=status;
  db.stats.learned=db.vocab.filter(function(x){return ["Learning","Review","Mastered","Đã nhớ","Rất dễ"].includes(x.status)}).length;
  flashFlipped=false;
  if(reviewActive){
    if(reviewIndex+1>=reviewQueue.length){finishReviewSession();return;}
    reviewIndex++;
  }else{
    flashIndex=(flashIndex+1)%db.vocab.length;
  }
  save();render();
}
function finishReviewSession(){
  const result={...reviewSession};
  reviewQueue=[];reviewIndex=0;quickReviewActive=false;
  reviewSession={active:false,mode:"",total:0,answered:0,remembered:0,forgot:0,xp:0};
  save();window.__lastReviewSummary=result;view="reviewSummary";render();
}
function reviewSummary(){
  const s=window.__lastReviewSummary||{mode:"",total:0,answered:0,remembered:0,forgot:0,xp:0};
  const pct=s.answered?Math.round(s.remembered/s.answered*100):0;
  const label=s.mode==="quick"?"Học nhanh hôm nay":s.mode==="smart"?"Ôn thông minh":"Ôn "+s.mode;
  $("view").innerHTML=shell("Hoàn thành phiên học",label,
    '<div class="grid"><div class="card"><div class="big">'+s.total+'</div><div class="muted">Tổng thẻ</div></div>'+
    '<div class="card"><div class="big">'+s.answered+'</div><div class="muted">Đã đánh giá</div></div>'+
    '<div class="card"><div class="big">'+s.remembered+'</div><div class="muted">Nhớ được</div></div>'+
    '<div class="card"><div class="big">'+s.forgot+'</div><div class="muted">Chưa nhớ</div></div>'+
    '<div class="card"><div class="big">'+pct+'%</div><div class="muted">Tỷ lệ nhớ</div></div>'+
    '<div class="card"><div class="big">+'+s.xp+'</div><div class="muted">XP từ phiên</div></div></div>'+
    '<div class="card"><h2>Tiếp tục học</h2><div class="actions"><button class="primary" onclick="startQuickStudy()">⚡ Học nhanh 10 từ</button><button onclick="show(\'review\')">🔄 Ôn tập</button><button onclick="show(\'home\')">🏠 Trang chủ</button></div></div>');
}
function nextFlash(){const total=reviewQueue.length||db.vocab.length;if(!total)return;stopSpeech();flashFlipped=false;if(reviewQueue.length)reviewIndex=(reviewIndex+1)%reviewQueue.length;else flashIndex=(flashIndex+1)%db.vocab.length;save();render();}
function prevFlash(){const total=reviewQueue.length||db.vocab.length;if(!total)return;stopSpeech();flashFlipped=false;if(reviewQueue.length)reviewIndex=(reviewIndex-1+reviewQueue.length)%reviewQueue.length;else flashIndex=(flashIndex-1+db.vocab.length)%db.vocab.length;save();render();}
function shuffleFlash(){
  if(reviewQueue.length){
    reviewIndex=Math.floor(Math.random()*reviewQueue.length);
  }else{
    flashIndex=Math.floor(Math.random()*Math.max(1,db.vocab.length));
  }
  flashFlipped=false;save();render();
}


function listening(){renderListening()}
function renderListening(){
  const list=sentencePracticePool();
  if(!list.length){$("view").innerHTML=shell("Luyện nghe","Chưa có câu luyện độc lập.");return}
  listenIndex=normalizeArrayIndex(listenIndex,list.length);
  const s=list[listenIndex];
  const seen=new Set([norm(s.vi||"")]),sameTopic=shuffle(list.filter(function(x){return x.id!==s.id&&x.vi&&norm(x.topic||"")===norm(s.topic||"")}));
  const fallback=shuffle(list.filter(function(x){return x.id!==s.id&&x.vi&&!seen.has(norm(x.vi))}));
  const wrong=[];
  sameTopic.concat(fallback).forEach(function(x){const k=norm(x.vi);if(k&&!seen.has(k)&&wrong.length<3){seen.add(k);wrong.push(x.vi);}});
  const choices=shuffle([s.vi,...wrong]);
  const showText=window.__showListeningText===true;
  $("view").innerHTML=shell("Luyện nghe","Nghe câu ở nhiều tốc độ, nghe lại và chọn đúng nghĩa.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted">Câu '+(listenIndex%list.length+1)+' / '+list.length+'</span>'+jumpControl("listening",listenIndex%list.length,list.length)+'</div>'+
    '<div class="actions" style="margin:14px 0"><button class="primary" onclick="speak(\''+escapeJs(s.en)+'\',0.75,\'en-US\')">🐢 0.75×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">▶ 1×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1.25,\'en-US\')">🐇 1.25×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">🔁 Nghe lại</button><button onclick="window.__showListeningText=!window.__showListeningText;renderListening()">👁 '+(showText?"Ẩn câu":"Hiện câu")+'</button></div>'+
    (showText?'<div class="hint"><b>'+esc(s.en)+'</b><br><span class="muted">'+esc(s.vi||"")+'</span></div>':'')+
    '<h3>Nghe & chọn nghĩa</h3><div class="options">'+choices.map(function(o){return '<button class="option" onclick="listenCheck(this,\''+escapeJs(o)+'\',\''+escapeJs(s.vi)+'\')">'+esc(o)+'</button>'}).join("")+'</div><div id="listenResult" class="hint" style="margin-top:14px">Hãy nghe rồi chọn.</div></div>');
  preloadItemAudio(s,"en-US");
}
function listenCheck(el,selected,correct){
  if(listenAnswered)return;
  if(!el||!String(correct??"").trim()){toast("Câu nghe không hợp lệ.");return}
  listenAnswered=true;
  stopSpeech();
  document.querySelectorAll(".option").forEach(function(b){b.disabled=true});
  const ok=norm(selected)===norm(correct);el.classList.add(ok?"correct":"wrong");
  $("listenResult").innerHTML=ok?"✓ Chính xác!":"✗ Chưa đúng. Đáp án: <b>"+esc(correct)+"</b>";
  animateResult("listenResult",ok?"good":"bad");playUiFeedback(ok?"xp":"bad");
  db.stats.sentenceAnswered=(Number(db.stats.sentenceAnswered)||0)+1;
  recordActivity();
  if(ok){db.stats.sentenceCorrect=(Number(db.stats.sentenceCorrect)||0)+1;addXP(10)}
  save();
  if(listenAdvanceTimer)clearTimeout(listenAdvanceTimer);
  listenAdvanceTimer=setTimeout(function(){
    const list=sentencePracticePool();listenAdvanceTimer=0;
    if(view!=="listening"||!list.length)return;
    listenIndex=(listenIndex+1)%list.length;window.__showListeningText=false;save();renderListening();
  },700);
}

function speaking(){renderSpeaking()}
let autoNextSpeaking=true;
function renderSpeaking(){
  const list=sentencePracticePool();
  if(!list.length){$("view").innerHTML=shell("Luyện phát âm","Chưa có câu luyện độc lập.");return}
  speakIndex=normalizeArrayIndex(speakIndex,list.length);
  const s=list[speakIndex];
  $("view").innerHTML=shell("Luyện phát âm","Nghe mẫu → nói lại → chấm độ tương đồng văn bản; câu luyện độc lập với danh sách từ vựng.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted">Câu '+(speakIndex%list.length+1)+' / '+list.length+'</span>'+jumpControl("speaking",speakIndex%list.length,list.length)+'</div>'+
    '<h2>'+esc(s.en)+'</h2><p class="muted">'+esc(s.vi||"")+'</p>'+
    '<div class="actions" style="margin-top:14px"><button class="primary" onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">🔊 Nghe mẫu</button><button onclick="speak(\''+escapeJs(s.en)+'\',0.75,\'en-US\')">🐢 Nghe chậm</button><button class="primary" onclick="startRecognition()">🎙️ Bắt đầu nói</button><button onclick="prevSpeak()">← Trước</button><button onclick="nextSpeak()">Tiếp →</button></div>'+
    '<div class="actions" style="margin-top:10px"><button onclick="autoNextSpeaking=!autoNextSpeaking;renderSpeaking()">⏭️ Tự chuyển: '+(autoNextSpeaking?"BẬT":"TẮT")+'</button><span class="muted small">Phím → cũng chuyển câu</span></div>'+
    '<div id="speechResult" class="hint" style="margin-top:14px">Nghe mẫu rồi nói lại.</div></div>');
  preloadItemAudio(s,"en-US");
}
function nextSpeak(){const list=sentencePracticePool();if(!list.length)return;stopSpeech();stopRecognition();speakIndex=(speakIndex+1)%list.length;save();renderSpeaking()}
function prevSpeak(){const list=sentencePracticePool();if(!list.length)return;stopSpeech();stopRecognition();speakIndex=(speakIndex-1+list.length)%list.length;save();renderSpeaking()}
function clearRecognitionTimer(){
  if(recognitionTimer){clearTimeout(recognitionTimer);recognitionTimer=0}
}
function startRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Trình duyệt này chưa hỗ trợ nhận diện microphone. Chrome/Edge thường hoạt động tốt hơn.");return}
  stopRecognition();
  const list=sentencePracticePool();if(!list.length){toast("Chưa có câu luyện độc lập.");return}
  speakIndex=normalizeArrayIndex(speakIndex,list.length);
  const target=list[speakIndex].en,r=new SR(),token=++recognitionToken;let handledResult=false;
  activeRecognition=r;r.lang="en-US";r.interimResults=false;r.continuous=false;r.maxAlternatives=3;
  const out=$("speechResult");if(out)out.innerHTML='<span class="speech-live">🎙️ Đang nghe… Hãy nói trọn câu.</span>';
  recognitionTimer=setTimeout(function(){
    recognitionTimer=0;
    if(token!==recognitionToken||activeRecognition!==r||handledResult)return;
    try{r.stop()}catch(e){}
    if(activeRecognition===r)activeRecognition=null;
    toast("Chưa nghe được câu nói. Hãy nói rõ, gần microphone hơn và thử lại.");
  },12000);
  r.onresult=function(e){
    if(handledResult||token!==recognitionToken||activeRecognition!==r)return;
    const result=e.results?.[0];if(!result||!result.length)return;
    handledResult=true;clearRecognitionTimer();
    const candidates=Array.from(result).map(function(item,index){
      const heard=String(item?.transcript||"").trim();
      return {heard,confidence:Number(item?.confidence)||0,index,score:similarityScore(heard,target)};
    }).filter(function(x){return x.heard});
    candidates.sort(function(a,b){return b.score-a.score||b.confidence-a.confidence||a.index-b.index});
    const best=candidates[0]||{heard:"",confidence:0,score:0};
    const score=best.score,confidence=best.confidence;
    if(out){
      const confidenceText=confidence>0?" · Độ tin cậy nhận diện: "+Math.round(confidence*100)+"%":"";
      out.innerHTML="<b>Bạn nói:</b> "+esc(best.heard)+"<br><b>Độ khớp câu:</b> "+score+"%"+confidenceText+'<div class="speech-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+score+'"><span style="width:'+score+'%"></span></div><span class="muted small">Điểm dựa trên transcript và thứ tự từ; không phải phép đo âm học chuyên nghiệp.</span>';
    }
    db.stats.sentenceAnswered=(Number(db.stats.sentenceAnswered)||0)+1;
    db.stats.speakingAttempts=(Number(db.stats.speakingAttempts)||0)+1;
    recordActivity();
    if(score>=80){db.stats.sentenceCorrect=(Number(db.stats.sentenceCorrect)||0)+1;db.stats.speakingGood=(Number(db.stats.speakingGood)||0)+1;addXP(10)}
    save();
    if(autoNextSpeaking)setTimeout(function(){if(view==="speaking"&&token===recognitionToken)nextSpeak()},1200);
  };
  r.onerror=function(e){
    if(token!==recognitionToken)return;
    clearRecognitionTimer();if(activeRecognition===r)activeRecognition=null;
    const code=String(e?.error||"");
    if(code==="not-allowed"||code==="service-not-allowed")toast("Microphone đã bị chặn. Hãy cấp quyền microphone cho trang rồi thử lại.");
    else if(code==="no-speech")toast("Không phát hiện giọng nói. Hãy nói rõ và thử lại.");
    else toast("Không nhận được giọng nói. Hãy kiểm tra microphone và quyền truy cập.");
  };
  r.onend=function(){if(activeRecognition===r)activeRecognition=null;clearRecognitionTimer()};
  try{r.start()}catch(e){clearRecognitionTimer();if(activeRecognition===r)activeRecognition=null;toast("Microphone đang bận. Hãy thử lại.")}
}
function normalizeSpeechText(s){
  let t=norm(s).replace(/’/g,"'");
  t=t
    .replace(/\b(i'm|im)\b/g,"i am")
    .replace(/\b(you're|youre)\b/g,"you are")
    .replace(/\b(we're)\b/g,"we are")
    .replace(/\b(they're|theyre)\b/g,"they are")
    .replace(/\b(it's)\b/g,"it is")
    .replace(/\b(can't|cant)\b/g,"cannot")
    .replace(/\b(won't|wont)\b/g,"will not")
    .replace(/\b(don't|dont)\b/g,"do not")
    .replace(/\b(doesn't|doesnt)\b/g,"does not")
    .replace(/\b(didn't|didnt)\b/g,"did not")
    .replace(/\b(isn't|isnt)\b/g,"is not")
    .replace(/\b(aren't|arent)\b/g,"are not")
    .replace(/\b(wasn't|wasnt)\b/g,"was not")
    .replace(/\b(weren't|werent)\b/g,"were not")
    .replace(/\b(i'll)\b/g,"i will")
    .replace(/\b(you'll|youll)\b/g,"you will")
    .replace(/\b(we'll)\b/g,"we will")
    .replace(/\b(they'll|theyll)\b/g,"they will")
    .replace(/\b(i'd)\b/g,"i would")
    .replace(/\b(you'd|youd)\b/g,"you would")
    .replace(/\b(we'd)\b/g,"we would")
    .replace(/\b(they'd|theyd)\b/g,"they would");
  return t.replace(/[.!?,;:()[\]{}"]/g," ").replace(/\s+/g," ").trim();
}
function tokenLevenshtein(a,b){
  const A=Array.isArray(a)?a:[],B=Array.isArray(b)?b:[],prev=new Array(B.length+1);
  for(let j=0;j<=B.length;j++)prev[j]=j;
  for(let i=1;i<=A.length;i++){
    let prevDiag=prev[0];prev[0]=i;
    for(let j=1;j<=B.length;j++){
      const old=prev[j],cost=A[i-1]===B[j-1]?0:1;
      prev[j]=Math.min(prev[j]+1,prev[j-1]+1,prevDiag+cost);prevDiag=old;
    }
  }
  return prev[B.length]||0;
}
function tokenOverlapScore(A,B){
  const used=new Set();let hit=0;
  A.forEach(function(x){const i=B.findIndex(function(y,j){return !used.has(j)&&x===y});if(i>=0){hit++;used.add(i)}});
  return hit/Math.max(1,Math.max(A.length,B.length));
}
function positionalWordScore(A,B){
  const n=Math.min(A.length,B.length);if(!n)return 0;
  let same=0;for(let i=0;i<n;i++)if(A[i]===B[i])same++;
  return same/Math.max(A.length,B.length);
}
function similarityScore(a,b){
  const A=normalizeSpeechText(a).split(" ").filter(Boolean),B=normalizeSpeechText(b).split(" ").filter(Boolean);
  if(!A.length||!B.length)return 0;
  if(A.join(" ")===B.join(" "))return 100;
  const maxLen=Math.max(A.length,B.length),edit=1-tokenLevenshtein(A,B)/maxLen,overlap=tokenOverlapScore(A,B),position=positionalWordScore(A,B);
  return Math.max(0,Math.min(100,Math.round((edit*0.65+overlap*0.2+position*0.15)*100)));
}

function normalizeArrayIndex(value,total){
  if(!total)return 0;
  const n=Number(value);
  const safe=Number.isFinite(n)?Math.trunc(n):0;
  return ((safe%total)+total)%total;
}
function normalizeQuizIndex(){
  const total=db.questions.length;
  if(!total){quizIndex=0;return 0}
  const n=Number(quizIndex);
  const safe=Number.isFinite(n)?Math.trunc(n):0;
  quizIndex=((safe%total)+total)%total;
  return quizIndex;
}
function quiz(){
  quizAnswered=false;
  quizOptions=[];quizCorrectIndex=-1;
  if(!db.questions.length){$("view").innerHTML=shell("Trắc nghiệm","Chưa có dữ liệu.");return}
  const q=db.questions[normalizeQuizIndex()],raw=Array.isArray(q?.options)?q.options:[];
  const qValid=!!q&&raw.length===4&&raw.every(function(x){return String(x??"").trim()})&&
    new Set(raw.map(norm)).size===4&&Number.isInteger(Number(q.answer))&&Number(q.answer)>=0&&Number(q.answer)<4;
  if(!qValid){
    const start=normalizeQuizIndex(),total=db.questions.length;
    let next=-1;
    for(let step=1;step<total;step++){
      const candidate=db.questions[(start+step)%total];
      const options=Array.isArray(candidate?.options)?candidate.options:[];
      if(candidate&&options.length===4&&options.every(function(x){return String(x??"").trim()})&&
         new Set(options.map(norm)).size===4&&Number.isInteger(Number(candidate.answer))&&Number(candidate.answer)>=0&&Number(candidate.answer)<4){
        next=(start+step)%total;break;
      }
    }
    if(next<0){
      $("view").innerHTML=shell("Trắc nghiệm","Không còn câu hỏi hợp lệ để luyện.");
      return;
    }
    quizIndex=next;
    return quiz();
  }
  const answerIndex=Number(q.answer);
  const paired=raw.map(function(text,index){return {text,correct:index===answerIndex}});
  quizOptions=shuffle(paired);
  quizCorrectIndex=quizOptions.findIndex(function(o){return o.correct});
  const opts=quizOptions.map(function(o){return o.text});
  $("view").innerHTML=shell("Trắc nghiệm","Nghe câu hỏi và từng đáp án trước khi chọn.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(q.topic||"daily")+'</span><span class="muted">Câu '+(quizIndex%db.questions.length+1)+' / '+db.questions.length+'</span>'+jumpControl("quiz",quizIndex%db.questions.length,db.questions.length)+'</div>'+
    '<div class="actions" style="margin:14px 0">'+audioButton(q.prompt,"🔊 Đọc câu hỏi",guessLang(q.prompt),1,q)+'</div><h2>'+esc(q.prompt)+'</h2><div class="options">'+
    opts.map(function(o,i){return '<div class="row"><button class="option" style="flex:1" onclick="answerQuiz('+i+','+quizCorrectIndex+')">'+String.fromCharCode(65+i)+". "+esc(o)+'</button>'+audioButton(o,"🔊",guessLang(o),1)+'</div>'}).join("")+
    '</div><div id="qres" class="hint" style="margin-top:14px">Chọn đáp án.</div></div>');
}
function answerQuiz(i,a){
  if(quizAnswered)return;
  const choiceIndex=Number.isInteger(Number(i))?Number(i):-1;
  if(choiceIndex<0||choiceIndex>=quizOptions.length){toast("Đáp án không hợp lệ.");return}
  stopSpeech();
  if(!Number.isInteger(quizCorrectIndex)||quizCorrectIndex<0||quizCorrectIndex>=quizOptions.length){toast("Câu hỏi chưa sẵn sàng.");return}
  const correctIndex=quizCorrectIndex;
  quizAnswered=true;
  const qIndex=normalizeQuizIndex(),q=db.questions[qIndex];
  if(!q){quizAnswered=false;toast("Không tìm thấy câu hỏi hiện tại.");return}
  const ok=choiceIndex===correctIndex;
  document.querySelectorAll(".option").forEach(function(b,j){b.disabled=true;if(j===correctIndex)b.classList.add("correct");if(j===choiceIndex&&!ok)b.classList.add("wrong")});
  db.stats.answered=(Number(db.stats.answered)||0)+1;recordActivity();recordVocabOutcome(q.vocabWord,ok);if(ok){db.stats.correct=(Number(db.stats.correct)||0)+1;addXP(10)}
  $("qres").innerHTML=(ok?"✓ Chính xác!":"✗ Chưa đúng.")+" "+esc(q.explain||"")+'<br><button class="primary" onclick="nextQuiz()">Câu tiếp →</button>';
  animateResult("qres",ok?"good":"bad");playUiFeedback(ok?"xp":"bad");save();
}
function nextQuiz(){stopSpeech();if(!db.questions.length){quizAnswered=false;quizOptions=[];quizCorrectIndex=-1;return}quizIndex=(quizIndex+1)%db.questions.length;quizAnswered=false;quizOptions=[];quizCorrectIndex=-1;save();render()}

function blankWordInExample(example,word){
  const text=String(example||""),target=String(word||"").trim();
  if(!text||!target)return "";
  const escaped=target.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const re=new RegExp("(^|[^A-Za-z0-9'])"+escaped+"(?![A-Za-z0-9'])","i");
  let found=false;
  const out=text.replace(re,function(prefix){found=true;return prefix+"_____";});
  return found?out:"";
}
function chooseFour(correct,field){
  const key=norm(correct),items=shuffle(db.vocab.filter(v=>norm(v[field]||"")!==key)),out=[correct];
  for(const v of items){
    const x=String(v[field]||"").trim();
    if(x&&!out.some(y=>norm(y)===norm(x)))out.push(x);
    if(out.length===4)break;
  }
  return out.length===4?shuffle(out):out;
}
function practiceVocabularyPool(mode="smart"){
  const all=db.vocab.filter(v=>String(v.word||"").trim()&&String(v.meaning||"").trim());
  const weak=all.filter(v=>v.status==="Chưa nhớ"||v.status==="Review"||Number(v.wrong_count||0)>Number(v.correct_count||0));
  const favorites=all.filter(v=>!!v.favorite);
  const fresh=all.filter(v=>v.status==="New");
  const key=String(mode||"smart").toLowerCase();
  if(key==="weak")return weak;
  if(key==="favorites")return favorites;
  if(key==="new")return fresh;
  if(key==="mixed")return shuffle(all);
  return weakVocabularyPool();
}
function practiceModeLabel(mode){
  return ({smart:"Thông minh",weak:"Từ yếu",favorites:"Yêu thích",new:"Từ mới",mixed:"Tổng hợp"})[String(mode||"smart").toLowerCase()]||"Thông minh";
}
function startPracticeMode(mode="smart",count=8){
  const pool=practiceVocabularyPool(mode);
  if(!pool.length){toast("Chưa có từ phù hợp với chế độ luyện này.");return;}
  practiceMode=String(mode||"smart").toLowerCase();
  practiceQueue=buildPracticeSession(count,practiceMode);
  practiceIndex=0;practiceAnswered=false;practiceAnswerOrder=[];practiceCorrectCount=0;practiceAnsweredCount=0;practiceSessionXp=0;
  if(!practiceQueue.length){toast("Không đủ dữ liệu để tạo bài luyện.");return;}
  render();
}
function buildPracticeSession(count=8,mode="smart"){
  const vocab=practiceVocabularyPool(mode);
  const sentences=sentencePracticePool(),out=[];
  for(let i=0;i<Math.min(count,vocab.length);i++){
    const v=vocab[i],mode=i%4;
    if(mode===0){
      const options=chooseFour(v.meaning,"meaning");
      out.push({type:"meaning",prompt:v.word,word:v.word,meaning:v.meaning,example:v.example,answer:v.meaning,options});
    }else if(mode===1){
      const options=chooseFour(v.word,"word");
      out.push({type:"translate",prompt:v.meaning,word:v.word,answer:v.word,options});
    }else if(mode===2){
      const example=String(v.example||"").trim();
      const prompt=blankWordInExample(example,v.word);
      const options=chooseFour(v.word,"word");
      if(prompt)out.push({type:"fill",prompt,word:v.word,answer:v.word,options});
      else{
        const meaningOptions=chooseFour(v.meaning,"meaning");
        out.push({type:"meaning",prompt:v.word,word:v.word,meaning:v.meaning,example:v.example,answer:v.meaning,options:meaningOptions});
      }
    }else{
      const s=sentences[i%Math.max(1,sentences.length)],target=String(s?.en||v.example||v.word).trim();
      const words=target.replace(/[.!?]+$/,"").split(/\s+/).filter(Boolean);
      out.push({type:"order",prompt:s?.vi||"Sắp xếp câu",target,words:shuffle(words)});
    }
  }
  return out;
}
function practice(){
  if(!practiceQueue.length)practiceQueue=buildPracticeSession(8,practiceMode);
  if(!practiceQueue.length){$("view").innerHTML=shell("Luyện tập V9.3.1","Chưa đủ dữ liệu để tạo bài.");return;}
  practiceIndex=normalizeArrayIndex(practiceIndex,practiceQueue.length);
  const item=practiceQueue[practiceIndex];
  let body='<div class="toolbar"><span class="badge">⚡ '+esc(practiceModeLabel(practiceMode))+'</span><span class="muted">'+(practiceIndex+1)+' / '+practiceQueue.length+' · Đúng '+practiceCorrectCount+' / '+practiceAnsweredCount+'</span></div>';
  if(item.type!=="order"){
    const title=item.type==="meaning"?"Chọn nghĩa đúng":item.type==="translate"?"Chọn từ đúng":"Điền từ còn thiếu";
    body+='<h2>'+esc(title)+'</h2><div class="hint"><b>'+esc(item.prompt)+'</b></div>'+(item.example?'<p class="muted">'+esc(item.example)+'</p>':"")+'<div class="options" style="margin-top:14px">'+item.options.map(function(o,i){return '<button class="option" '+(practiceAnswered?"disabled":"")+' onclick="practiceAnswer('+i+')">'+String.fromCharCode(65+i)+'. '+esc(o)+'</button>'}).join("")+'</div>';
  }else{
    body+='<h2>Sắp xếp câu</h2><p class="muted">'+esc(item.prompt)+'</p><div class="practice-order">'+practiceAnswerOrder.map(function(i){return '<button class="token chosen" onclick="practiceRemoveToken('+i+')">'+esc(item.words[i])+'</button>'}).join(" ")+'</div><div class="practice-order">'+item.words.map(function(w,i){const used=practiceAnswerOrder.includes(i);return '<button class="token" '+(used||practiceAnswered?"disabled":"")+' onclick="practicePickToken('+i+')">'+esc(w)+'</button>'}).join(" ")+'</div><button class="primary" style="margin-top:12px" onclick="practiceCheckOrder()">Kiểm tra</button>';
  }
  body+='<div id="practiceResult" class="hint" style="margin-top:14px">'+(practiceAnswered?"":"Hoàn thành bài rồi kiểm tra đáp án.")+'</div><div class="actions" style="margin-top:14px">'+(practiceAnswered?'<button class="primary" onclick="practiceNext()">Câu tiếp →</button>':"")+'<button onclick="restartPractice()">🔀 Bài khác</button></div><div class="card" style="margin-top:12px"><div class="muted small">Chế độ luyện</div><div class="actions"><button onclick="startPracticeMode(\'smart\',8)">🧠 Thông minh</button><button onclick="startPracticeMode(\'weak\',8)">🔥 Từ yếu</button><button onclick="startPracticeMode(\'favorites\',8)">⭐ Yêu thích</button><button onclick="startPracticeMode(\'new\',8)">🆕 Từ mới</button><button onclick="startPracticeMode(\'mixed\',8)">🎲 Tổng hợp</button></div><div class="muted small" style="margin-top:8px">Đang chọn: <b>'+esc(practiceModeLabel(practiceMode))+'</b> · XP phiên: '+practiceSessionXp+'</div></div>';
  $("view").innerHTML=shell("Luyện tập V9.3.1","Chế độ: "+practiceModeLabel(practiceMode)+" · chọn kiểu luyện phù hợp với mục tiêu.",body);
}
function finishPractice(ok){recordActivity();practiceAnsweredCount++;if(ok){addXP(10);practiceCorrectCount++;practiceSessionXp+=10;}}
function practiceAnswer(index){
  if(practiceAnswered)return;
  const item=practiceQueue[practiceIndex];if(!item||item.type==="order")return;
  const choiceIndex=Number(index);
  if(!Number.isInteger(choiceIndex)||choiceIndex<0||choiceIndex>=item.options.length){toast("Đáp án không hợp lệ.");return}
  const choice=String(item.options[choiceIndex]??"");
  const ok=norm(choice)===norm(item.answer);
  practiceAnswered=true;finishPractice(ok);if(item.word)recordVocabOutcome(item.word,ok);
  const correctIndex=item.options.findIndex(function(x){return norm(x)===norm(item.answer)});
  document.querySelectorAll(".option").forEach(function(b,i){b.disabled=true;if(i===correctIndex)b.classList.add("correct");if(i===index&&!ok)b.classList.add("wrong");});
  const result=$("practiceResult");if(result)result.innerHTML=ok?"✓ Chính xác!":"✗ Chưa đúng. Đáp án: <b>"+esc(item.answer)+"</b>";
  save();render();animateResult("practiceResult",ok?"good":"bad");playUiFeedback(ok?"xp":"bad");
}
function practicePickToken(i){
  if(practiceAnswered)return;
  const item=practiceQueue[practiceIndex],n=Number(i);
  if(!item||item.type!=="order"||!Number.isInteger(n)||n<0||n>=item.words.length){
    toast("Từ sắp xếp không hợp lệ.");return;
  }
  if(practiceAnswerOrder.includes(n))return;
  practiceAnswerOrder.push(n);render();
}
function practiceRemoveToken(i){
  if(practiceAnswered)return;
  const item=practiceQueue[practiceIndex],n=Number(i);
  if(!item||item.type!=="order"||!Number.isInteger(n)||n<0||n>=item.words.length)return;
  const p=practiceAnswerOrder.lastIndexOf(n);
  if(p>=0){practiceAnswerOrder.splice(p,1);render();}
}
function practiceCheckOrder(){
  if(practiceAnswered)return;
  const item=practiceQueue[practiceIndex];if(!item||item.type!=="order")return;
  const cleaned=[],seen=new Set();
  (Array.isArray(practiceAnswerOrder)?practiceAnswerOrder:[]).forEach(function(raw){
    const n=Number(raw);
    if(Number.isInteger(n)&&n>=0&&n<item.words.length&&!seen.has(n)){seen.add(n);cleaned.push(n);}
  });
  if(cleaned.length!==(Array.isArray(practiceAnswerOrder)?practiceAnswerOrder.length:0))practiceAnswerOrder=cleaned;
  if(cleaned.length<item.words.length){toast("Hãy chọn đủ các từ trước khi kiểm tra.");render();return;}
  const actual=cleaned.map(function(i){return item.words[i]}).join(" ");
  const ok=norm(actual)===norm(item.target.replace(/[.!?]+$/,""));
  practiceAnswered=true;finishPractice(ok);
  const result=$("practiceResult");if(result)result.innerHTML=ok?"✓ Chính xác!":"✗ Chưa đúng. Câu đúng: <b>"+esc(item.target)+"</b>";
  save();render();
}
function practiceNext(){
  if(!practiceAnswered)return;
  if(practiceIndex+1>=practiceQueue.length){
    const lessonSize=practiceQueue.length,correct=practiceCorrectCount,answered=practiceAnsweredCount,perfect=correct===lessonSize,accuracy=answered?Math.round(correct/answered*100):0,sessionXp=practiceSessionXp;
    db.stats.practiceCompleted=(Number(db.stats.practiceCompleted)||0)+1;addXP(30);if(perfect)addXP(50);
    practiceQueue=[];practiceIndex=0;practiceAnswered=false;practiceAnswerOrder=[];practiceCorrectCount=0;practiceAnsweredCount=0;practiceSessionXp=0;save();
    toast("Hoàn thành "+practiceModeLabel(practiceMode)+": "+correct+"/"+answered+" đúng · "+accuracy+"% · +"+sessionXp+" XP trả lời"+(perfect?" · +50 XP hoàn hảo":""));
    show("home");return;
  }
  practiceIndex++;practiceAnswered=false;practiceAnswerOrder=[];save();render();
}
function restartPractice(){practiceQueue=buildPracticeSession(8,practiceMode);practiceIndex=0;practiceAnswered=false;practiceAnswerOrder=[];practiceCorrectCount=0;practiceAnsweredCount=0;practiceSessionXp=0;render();}
function grammarPracticePool(){
  return db.grammar.filter(function(g){return !String(g.id||"").startsWith("exp500_grammar_")});
}
function grammar(){
  const list=grammarPracticePool();
  const cards=list.map(function(g){
    const examples=(g.examples||[]).map(function(e){
      return '<div class="item">'+esc(e)+' '+audioButton(e,"🔊 Nghe","en-US",1,g)+'</div>';
    }).join("");
    return '<div class="card"><span class="badge">'+esc(g.level||"Beginner")+'</span><h3>'+esc(g.title||"")+'</h3>'+
      '<div class="hint"><b>Công thức:</b> '+esc(g.formula||"")+'</div>'+
      '<p>'+esc(g.explain||"")+'</p><h4>Ví dụ</h4><div class="list">'+examples+'</div>'+
      '<p class="muted small">'+esc(g.notes||"")+'</p></div>';
  }).join("");
  $("view").innerHTML=shell("Ngữ pháp","Chỉ hiển thị bài ngữ pháp thực hành; các mục từ vựng rời legacy không đưa vào giao diện.",'<div class="grid grid-2">'+cards+'</div>');
}
function communication(){
  const list=communicationPracticePool(),size=12,pages=Math.max(1,Math.ceil(list.length/size));
  if(communicationPage>pages)communicationPage=pages;
  const start=(communicationPage-1)*size,items=list.slice(start,start+size);
  $("view").innerHTML=shell("Giao tiếp","Hiển thị hội thoại có câu hoàn chỉnh và tự nhiên; nội dung mở rộng đã được khôi phục và làm sạch.",
    '<div class="card"><div class="muted small">Hiển thị '+(list.length?start+1:0)+'–'+Math.min(start+size,list.length)+' / '+list.length+' hội thoại</div>'+pageControls(communicationPage,list.length,size,"communication")+'</div>'+
    '<div class="grid grid-2">'+items.map(function(d,j){
      const i=start+j,lines=d.lines||[];
      return '<div class="card"><div class="toolbar"><span class="badge">'+esc(d.topic||"")+'</span><span class="muted small">'+lines.length+' lượt</span></div><h3>'+esc(d.title||"")+'</h3>'+
      '<div class="list">'+lines.map(function(l){
        return '<div class="item"><div><b>'+esc(l[0])+'</b> — <span>'+esc(l[1])+'</span></div>'+(l[2]?'<div class="muted small" style="margin-top:5px">'+esc(l[2])+'</div>':'')+
        '<div class="actions" style="margin-top:7px">'+audioButton(l[1],"🔊 Nghe","en-US",1,l)+'</div></div>';
      }).join("")+'</div><div class="actions" style="margin-top:12px"><button class="primary" onclick="playDialogue('+i+')">▶ Nghe cả đoạn</button><button onclick="stopSpeech()">⏹ Dừng</button></div></div>';
    }).join("")+'</div>'+pageControls(communicationPage,list.length,size,"communication"));
}
function playDialogue(index){
  const d=communicationPracticePool()[index];if(!d)return;
  stopSpeech();const lines=(d.lines||[]).map(function(l){return l[1]});speakSequence(lines,0.9,"en-US");
}


function trilingual(){
  const size=60,pages=Math.max(1,Math.ceil(db.trilingual.length/size));
  if(trilingualPage>pages)trilingualPage=pages;
  const start=(trilingualPage-1)*size,items=db.trilingual.slice(start,start+size);
  $("view").innerHTML=shell("Tam ngữ Anh – Trung – Việt","English • 中文 • Pinyin • Tiếng Việt; mỗi ngôn ngữ có giọng đọc riêng.",
    '<div class="card"><div class="muted small">Hiển thị '+(db.trilingual.length?start+1:0)+'–'+Math.min(start+size,db.trilingual.length)+' / '+db.trilingual.length+' mục</div>'+pageControls(trilingualPage,db.trilingual.length,size,"trilingual")+'</div>'+
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>English</th><th>中文</th><th>Pinyin</th><th>Tiếng Việt</th><th>Nghe</th></tr></thead><tbody>'+
    items.map(function(x){return '<tr><td>'+esc(x.en||"")+'</td><td>'+esc(x.zh||x.chinese||"")+'</td><td>'+esc(x.pinyin||"")+'</td><td>'+esc(x.vi||x.vietnamese||"")+'</td><td><div class="actions">'+audioButton(x.en,"🇺🇸","en-US",1,x)+audioButton(x.zh||x.chinese,"🇨🇳","zh-CN",1,x)+audioButton(x.vi||x.vietnamese,"🇻🇳","vi-VN",1,x)+'</div></td></tr>'}).join("")+
    '</tbody></table></div>'+pageControls(trilingualPage,db.trilingual.length,size,"trilingual")+'</div>');
}
function review(){
  const now=new Date();
  const due=db.vocab.filter(function(v){return v.reviewDue&&new Date(v.reviewDue)<=now});
  const weak=db.vocab.filter(function(v){return v.status==="Chưa nhớ"||v.status==="Review"||Number(v.wrong_count||0)>Number(v.correct_count||0)});
  const favorites=db.vocab.filter(function(v){return !!v.favorite});
  const mistakes=db.vocab.filter(function(v){return Number(v.wrong_count||0)>Number(v.correct_count||0)});
  const fresh=db.vocab.filter(function(v){return v.status==="New"});
  $("view").innerHTML=shell("Ôn tập","Chọn đúng loại phiên học thay vì phải ôn toàn bộ danh sách.",
    '<div class="grid">'+
      '<div class="card"><div class="big">'+due.length+'</div><div class="muted">Đến hạn</div></div>'+
      '<div class="card"><div class="big">'+weak.length+'</div><div class="muted">Từ yếu</div></div>'+
      '<div class="card"><div class="big">'+mistakes.length+'</div><div class="muted">Sai nhiều</div></div>'+
      '<div class="card"><div class="big">'+favorites.length+'</div><div class="muted">Yêu thích</div></div>'+
      '<div class="card"><div class="big">'+fresh.length+'</div><div class="muted">Từ mới</div></div>'+
    '</div>'+
    '<div class="card"><h2>🧠 Ôn tập thông minh</h2><p class="muted">Ưu tiên theo thứ tự: đến hạn → từ yếu → yêu thích → từ mới, không lặp từ.</p><div class="actions"><button class="primary" onclick="startReview(\'smart\',20)">🧠 Ôn thông minh 20 từ</button><button onclick="startReview(\'smart\',10)">⚡ Ôn nhanh 10 từ</button></div></div>'+
    '<div class="card"><h2>🎯 Ôn theo mục tiêu</h2><div class="actions">'+
      '<button onclick="startReview(\'due\',20)">⏰ Từ đến hạn</button>'+
      '<button onclick="startReview(\'weak\',20)">🔥 Từ yếu</button>'+
      '<button onclick="startReview(\'mistakes\',20)">❌ Sai nhiều</button>'+
      '<button onclick="startReview(\'favorites\',20)">⭐ Yêu thích</button>'+
      '<button onclick="startReview(\'new\',20)">🆕 Từ mới</button>'+
    '</div></div>');
}
function stats(){
  ensureDailyProgress();
  const quizAcc=db.stats.answered?Math.round((db.stats.correct/db.stats.answered)*100):0;
  const sentenceAcc=db.stats.sentenceAnswered?Math.round((db.stats.sentenceCorrect/db.stats.sentenceAnswered)*100):0;
  const done=Number(db.stats.dailyUnits)||0,target=dailyGoal(),pct=dailyPercent();
  const weak=weakVocabularyPool().filter(v=>v.status==="Chưa nhớ"||v.status==="Review"||Number(v.wrong_count||0)>Number(v.correct_count||0)).slice(0,6);
  const history=dailyHistorySeries(7),goalsMet=dailyGoalsMet(7);
  const historyHtml=history.map(function(x){return '<div class="item"><div class="toolbar"><span>'+x.label+'</span><b>'+x.units+'/'+x.goal+'</b></div><div class="progress" style="margin-top:6px"><div class="bar" style="width:'+x.pct+'%"></div></div></div>';}).join("");
  $("view").innerHTML=shell("Tiến độ V9.3.1","Mục tiêu ngày, lịch sử 7 ngày, độ chính xác và từ cần củng cố.",
    '<div class="card"><div class="toolbar"><b>🎯 Mục tiêu hôm nay</b><b>'+done+' / '+target+'</b></div><div class="progress" style="margin-top:10px"><div class="bar" style="width:'+pct+'%"></div></div><p class="muted small">'+pct+'% hoàn thành · còn '+Math.max(0,target-done)+' hoạt động.</p></div>'+
    '<div class="card"><div class="toolbar"><b>📅 7 ngày gần đây</b><b>'+goalsMet+'/7 đạt mục tiêu</b></div><div class="list" style="margin-top:10px">'+historyHtml+'</div></div>'+
    '<div class="grid"><div class="card"><div class="big">'+db.stats.xp+'</div><div class="muted">XP</div></div><div class="card"><div class="big">'+db.stats.learned+'</div><div class="muted">Từ đã học</div></div><div class="card"><div class="big">'+(db.stats.practiceCompleted||0)+'</div><div class="muted">Bài luyện hoàn thành</div></div></div>'+
    '<div class="grid"><div class="card"><div class="big">'+quizAcc+'%</div><div class="muted">Quiz</div></div><div class="card"><div class="big">'+sentenceAcc+'%</div><div class="muted">Nghe/nói</div></div><div class="card"><div class="big">'+(db.stats.speakingGood||0)+'</div><div class="muted">Nói đạt ≥80%</div></div></div>'+
    '<div class="card"><h2>🔥 Từ cần củng cố</h2>'+(weak.length?'<div class="list">'+weak.map(v=>'<div class="item"><b>'+esc(v.word)+'</b><span class="muted"> · sai '+Number(v.wrong_count||0)+' / đúng '+Number(v.correct_count||0)+'</span></div>').join("")+'</div>':'<div class="empty">Chưa có từ yếu được ghi nhận.</div>')+'</div>');
}
function voiceAvailability(){
  try{
    const vs=window.speechSynthesis?.getVoices?.()||[];
    const langs=["en-US","zh-CN","vi-VN"];
    return langs.map(function(lang){
      const exact=vs.find(function(v){return String(v.lang||"").toLowerCase()===lang.toLowerCase()});
      const base=vs.find(function(v){return String(v.lang||"").toLowerCase().startsWith(lang.slice(0,2).toLowerCase())});
      return (exact||base)?"✓ "+lang:"✗ "+lang;
    }).join(" · ");
  }catch(e){return "Không kiểm tra được giọng đọc";}
}
function exportProgress(){
  try{
    const payload={app:"English Master",exportedAt:new Date().toISOString(),...userSnapshot()};
    const blob=new Blob([JSON.stringify(payload,null,2)+"\n"],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="english-master-progress.json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
    toast("Đã xuất tiến độ học tập.");
  }catch(e){toast("Không thể xuất tiến độ: "+e.message)}
}
function openProgressImport(){
  const input=$("progressImport");
  if(input&&typeof input.click==="function")input.click();
}
function validateProgressImport(parsed){
  if(!parsed||typeof parsed!=="object")throw new Error("File tiến độ không đúng định dạng.");
  if(!Array.isArray(parsed.vocabState)||!parsed.stats||typeof parsed.stats!=="object"||!parsed.profile||typeof parsed.profile!=="object"){
    throw new Error("Thiếu phần stats, profile hoặc vocabState.");
  }
  const numeric=["xp","streak","learned","answered","correct","sentenceAnswered","sentenceCorrect","speakingAttempts","speakingGood","dailyUnits","practiceCompleted"];
  numeric.forEach(function(k){
    if(parsed.stats[k]!==undefined){
      const n=Number(parsed.stats[k]);
      if(!Number.isFinite(n)||n<0)throw new Error("Thống kê \""+k+"\" không hợp lệ.");
    }
  });
  const statPairs=[["correct","answered"],["sentenceCorrect","sentenceAnswered"],["speakingGood","speakingAttempts"]];
  statPairs.forEach(function(pair){
    const a=parsed.stats[pair[0]],b=parsed.stats[pair[1]];
    if(a!==undefined&&b!==undefined&&Number(a)>Number(b)){
      throw new Error("Thống kê \""+pair[0]+"\" không thể lớn hơn \""+pair[1]+"\".");
    }
  });
  const theme=String(parsed.profile.theme??"light");
  if(!["light","dark"].includes(theme))throw new Error("Giao diện không hợp lệ.");
  if(parsed.profile.autoUpdate!==undefined&&typeof parsed.profile.autoUpdate!=="boolean")throw new Error("Tùy chọn tự cập nhật không hợp lệ.");
  if(parsed.profile.speechRate!==undefined){
    const rate=Number(parsed.profile.speechRate);
    if(!Number.isFinite(rate)||rate<0.5||rate>1.5)throw new Error("Tốc độ giọng đọc không hợp lệ.");
  }
  if(parsed.profile.dailyGoal!==undefined){
    const goal=Number(parsed.profile.dailyGoal);
    if(!Number.isInteger(goal)||goal<1||goal>100)throw new Error("Mục tiêu ngày không hợp lệ.");
  }
  if(parsed.profile.layout!==undefined&&!["auto","phone","desktop"].includes(String(parsed.profile.layout))){
    throw new Error("Bố cục thiết bị không hợp lệ.");
  }
  if(parsed.stats.dailyHistory!==undefined){
    if(!Array.isArray(parsed.stats.dailyHistory))throw new Error("Lịch sử mục tiêu ngày không hợp lệ.");
    const seen=new Set();
    parsed.stats.dailyHistory.forEach(function(row){
      const date=String(row?.date||"");
      const units=Number(row?.units),goal=Number(row?.goal);
      if(!row||typeof row!=="object"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||seen.has(date)||
        !Number.isFinite(units)||units<0||!Number.isFinite(goal)||goal<1||goal>100){
        throw new Error("Lịch sử mục tiêu ngày không hợp lệ.");
      }
      seen.add(date);
    });
  }
  const allowedStatus=new Set(["New","Learning","Review","Mastered","Chưa nhớ","Đã nhớ","Rất dễ"]);
  const stateKeys=new Set();
  const validStates=parsed.vocabState.every(function(s){
    const word=String(s?.word||"").trim(),key=norm(word);
    if(!s||typeof s!=="object"||!word||stateKeys.has(key))return false;
    stateKeys.add(key);
    if(s.status!==undefined&&!allowedStatus.has(String(s.status)))return false;
    if(s.favorite!==undefined&&typeof s.favorite!=="boolean")return false;
    if(s.reviewStreak!==undefined){
      const n=Number(s.reviewStreak);
      if(!Number.isFinite(n)||n<0||!Number.isInteger(n))return false;
    }
    for(const k of ["correct_count","wrong_count"]){
      if(s[k]!==undefined){
        const n=Number(s[k]);
        if(!Number.isFinite(n)||n<0)return false;
      }
    }
    for(const k of ["reviewDue","lastReviewed"]){
      if(s[k]!==undefined&&s[k]!==null&&Number.isNaN(Date.parse(String(s[k]))))return false;
    }
    return true;
  });
  if(!validStates)throw new Error("File có mục từ vựng không hợp lệ.");
  return true;
}
async function importProgress(input){
  const file=input?.files?.[0];
  if(!file)return;
  const previous=userSnapshot(db);
  try{
    const raw=await file.text(),parsed=JSON.parse(raw);
    validateProgressImport(parsed);
    applyUserSnapshot(parsed);
    if(!save()){
      applyUserSnapshot(previous);
      save();
      throw new Error("Không thể lưu tiến độ sau khi nhập.");
    }
    render();
    toast("Đã nhập tiến độ học tập.");
  }catch(e){toast("Nhập tiến độ lỗi: "+e.message)}
  finally{input.value=""}
}
function resetProgress(){
  const ok=typeof window.confirm==="function"?window.confirm("Xóa toàn bộ XP, lịch sử ôn tập, yêu thích và trạng thái học?"):true;
  if(!ok)return;
  db.stats={xp:0,streak:0,learned:0,answered:0,correct:0,sentenceAnswered:0,sentenceCorrect:0,speakingAttempts:0,speakingGood:0,lastActivityDate:"",dailyDate:dateKey(),dailyUnits:0,dailyHistory:[],practiceCompleted:0};
  db.vocab.forEach(function(v){
    v.status="New";v.favorite=false;v.reviewDue=null;v.correct_count=0;v.wrong_count=0;v.reviewStreak=0;v.lastReviewed=null;
  });
  flashIndex=0;flashFlipped=false;listenIndex=0;speakIndex=0;quizIndex=0;quizAnswered=false;quizOptions=[];quizCorrectIndex=-1;
  reviewQueue=[];reviewIndex=0;quickReviewActive=false;reviewSession={active:false,mode:"",total:0,answered:0,remembered:0,forgot:0,xp:0};practiceQueue=[];practiceIndex=0;practiceAnswered=false;practiceAnswerOrder=[];practiceCorrectCount=0;practiceMode="smart";practiceAnsweredCount=0;practiceSessionXp=0;
  view="home";save();render();toast("Đã đặt lại tiến độ học tập.");
}
function dailyGoalOptions(){return [5,10,15,20,30].map(function(x){var selected=Number(db.profile.dailyGoal||10)===x?" selected":"";return '<option value="'+x+'"'+selected+'>'+x+' hoạt động</option>';}).join("");}
function settings(){
  const layout=String(db.profile.layout||"auto");
  $("view").innerHTML=shell("Cài đặt","Cập nhật GitHub, âm thanh và giao diện.",
    '<div class="card"><h2>☁️ Cập nhật nội dung</h2><p class="muted">Nguồn: <code>'+esc(DATA_URL)+'</code></p><p>Phiên bản dữ liệu: <b>'+esc(db.lastRemoteVersion||"chưa đồng bộ")+'</b></p><div class="actions"><button class="primary" onclick="updateOnline(true)">🔄 Kiểm tra cập nhật</button><button onclick="runContentAudit()">🔎 Kiểm tra 1.500 câu luyện độc lập</button><button onclick="speak(\'This is an audio test.\',1,\'en-US\')">🔊 Kiểm tra âm thanh</button></div><div id="contentAuditResult" class="notice">Kiểm tra các câu luyện độc lập có English/Vietnamese/audio hợp lệ và không bị buộc vào vocabWord. Hiện có 1.500 câu luyện độc lập được tích hợp và kiểm tra chất lượng.</div></div>'+
    '<div class="card"><h2>📚 Nguồn dữ liệu</h2><p class="small muted">Câu ví dụ tiếng Anh: Tatoeba (tatoeba.org). Phát âm IPA: CMUdict. Từ Trung/Pinyin: dữ liệu HSK CSV. Một số câu có thể có chỉnh sửa ngữ cảnh thủ công để giữ tiếng Anh tự nhiên.</p></div>'+    '<div class="card"><h2>🔊 Âm thanh & ngôn ngữ</h2><p class="muted">Giọng trình duyệt: '+esc(voiceAvailability())+'</p><p class="small muted">Nếu không có file audio riêng, app sẽ dùng giọng đọc TTS phù hợp với ngôn ngữ.</p></div>'+
    '<div class="card"><h2>🎯 Mục tiêu mỗi ngày</h2><select onchange="setDailyGoal(this.value)">'+dailyGoalOptions()+'</select><p class="small muted">Mỗi câu trả lời hoặc lần đánh giá học tập được tính là 1 hoạt động.</p></div>'+
    '<div class="card"><h2>🔊 Tốc độ mặc định</h2><select onchange="db.profile.speechRate=Number(this.value);save()">'+[0.5,0.75,1,1.25,1.5].map(function(x){return '<option value="'+x+'" '+(Number(db.profile.speechRate||1)===x?"selected":"")+'>'+x+'×</option>'}).join("")+'</select></div>'+
    '<div class="card"><h2>📱💻 Bố cục thiết bị</h2><p class="small muted">“Tự động” bám theo kích thước màn hình. Có thể khóa bố cục Điện thoại hoặc Máy tính để thao tác thuận tiện hơn.</p><select id="layoutMode" onchange="setLayoutMode(this.value)">'+
      '<option value="auto" '+(layout==="auto"?"selected":"")+'>Tự động theo màn hình</option>'+
      '<option value="phone" '+(layout==="phone"?"selected":"")+'>Điện thoại</option>'+
      '<option value="desktop" '+(layout==="desktop"?"selected":"")+'>Máy tính</option>'+
    '</select></div>'+
    '<div class="card"><h2>🌙 Giao diện</h2><button onclick="db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()">Đổi Light / Dark</button></div>'+
    '<div class="card"><h2>💾 Dữ liệu học tập</h2><p class="small muted">Xuất tiến độ để sao lưu hoặc nhập lại trên thiết bị khác. Đặt lại chỉ xóa tiến độ, không xóa dữ liệu bài học.</p><div class="actions"><button class="primary" onclick="exportProgress()">⬇️ Xuất tiến độ</button><button onclick="openProgressImport()">⬆️ Nhập tiến độ</button><button onclick="resetProgress()">♻️ Đặt lại tiến độ</button></div><input id="progressImport" type="file" accept="application/json,.json" style="display:none" onchange="importProgress(this)"></div>');
}
function persistLifecycle(){
  try{save();}catch(e){}
}
function installLifecyclePersistence(){
  try{
    document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")persistLifecycle()});
    window.addEventListener("pagehide",persistLifecycle);
  }catch(e){}
}
function registerServiceWorker(){
  if("serviceWorker" in navigator){
    window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){})});
  }
}

function compareVersions(a,b){
  const pa=String(a||"").split(".").map(x=>Number(x)),pb=String(b||"").split(".").map(x=>Number(x));
  if(pa.length!==3||pb.length!==3||pa.some(x=>!Number.isInteger(x)||x<0)||pb.some(x=>!Number.isInteger(x)||x<0))return 0;
  for(let i=0;i<3;i++){if(pa[i]>pb[i])return 1;if(pa[i]<pb[i])return -1;}
  return 0;
}
async function checkAppVersion(){
  try{
    const r=await fetch(APP_VERSION_URL+"?t="+Date.now(),{cache:"no-store"});
    if(!r.ok)return;
    const info=await r.json();
    const remote=String(info.version||"").trim();
    if(compareVersions(remote,APP_VERSION)>0){
      const url=new URL(window.location.href);
      url.searchParams.set("appv",remote);
      window.location.replace(url.toString());
    }
  }catch(e){}
}
function installVisualInteractionHooks(){
  try{
    document.addEventListener("pointerdown",function(e){
      const b=e.target?.closest?.("button");
      if(!b||b.disabled)return;
      const r=b.getBoundingClientRect();
      if(r.width>0&&r.height>0){
        b.style.setProperty("--ripple-x",Math.round(e.clientX-r.left)+"px");
        b.style.setProperty("--ripple-y",Math.round(e.clientY-r.top)+"px");
      }
    },{passive:true});
    const top=$("backTop");
    const sync=function(){if(top)top.classList.toggle("show",window.scrollY>480)};
    window.addEventListener("scroll",sync,{passive:true});
    if(top)top.onclick=function(){try{window.scrollTo({top:0,behavior:"smooth"})}catch(e){window.scrollTo(0,0)}};
    sync();
  }catch(e){}
}
function init(){
  load();
  installVisualInteractionHooks();
  if($("theme"))$("theme").onclick=function(){db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()};
  document.addEventListener("keydown",function(e){
    const tag=String(e.target?.tagName||"").toUpperCase();
    const editing=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||tag==="BUTTON"||!!e.target?.isContentEditable;
    if(editing)return;
    if(view==="speaking"&&e.key==="ArrowRight"){e.preventDefault();nextSpeak();return}
    if(view==="flashcards"){
      if(e.key===" "){e.preventDefault();flashFlipped=!flashFlipped;renderFlashcards();return}
      if(e.key==="ArrowRight"){e.preventDefault();nextFlash();return}
      if(e.key==="ArrowLeft"){e.preventDefault();prevFlash();return}
      if(e.key==="1"){e.preventDefault();rateFlash("Chưa nhớ");return}
      if(e.key==="2"){e.preventDefault();rateFlash("Đã nhớ");return}
      if(e.key==="3"){e.preventDefault();rateFlash("Rất dễ");return}
    }
    if((view==="quiz"||view==="listening"||view==="practice")&&/^[1-4]$/.test(e.key)){
      const n=Number(e.key)-1,opts=document.querySelectorAll("#view .options .option");
      if(opts[n]&&!opts[n].disabled){e.preventDefault();opts[n].click();return}
    }
    if(e.key==="Escape")stopSpeech();
  });
  installVoiceCache();
  render();
  try{
    if(window.matchMedia){
      const mq=window.matchMedia("(max-width: 800px)");
      if(mq.addEventListener)mq.addEventListener("change",handleViewportChange);
      else if(mq.addListener)mq.addListener(handleViewportChange);
    }
    window.addEventListener("resize",handleViewportChange);
  }catch(e){}
  hydrateContent();
  registerServiceWorker();
  checkAppVersion();
  installLifecyclePersistence();
}
init();

function runContentAudit(){
  const r=dataAudit();
  const missing=Object.entries(r.missing||{}).filter(([,items])=>items.length);
  const el=$("contentAuditResult");
  if(!el)return;
  if(!r.expansion500){el.textContent="Chưa tải gói mở rộng.";return;}
  if(r.duplicateWords||missing.length||r.standaloneQualityIssues||r.standaloneDuplicateEnglish){
    const parts=[];
    if(missing.length)parts.push("thiếu liên kết: "+missing.map(([k,items])=>esc(k)+" ("+items.length+")").join(", "));
    if(r.duplicateWords)parts.push("trùng từ: "+r.duplicateWords);
    if(r.standaloneQualityIssues)parts.push("câu độc lập lỗi: "+r.standaloneQualityIssues);
    if(r.standaloneDuplicateEnglish)parts.push("câu độc lập trùng: "+r.standaloneDuplicateEnglish);
    el.innerHTML="⚠️ "+parts.join(" · ");
    return;
  }
  el.textContent="✓ "+r.expansion500+"/"+r.expansion500+" từ đã được nối đầy đủ · "+r.naturalIndependentSentences+"/"+r.independentSentences+" câu luyện độc lập hợp lệ, không trùng.";
}

function dataAudit(){
  const packageV1=db.vocab.filter(v=>v.source==="expansion500"&&v.sourceVersion==="8.0.0");
  const packageV2=db.vocab.filter(v=>v.source==="expansion500_v2"&&v.sourceVersion==="8.1.0");
  const exp=[...packageV1,...packageV2];
  const expSentences=db.sentences.filter(s=>s.source==="expansion500"||s.source==="expansion500_v2");
  const generalSentences=db.sentences.filter(s=>s.source==="extra500_v8");
  const normSet=arr=>new Set((arr||[]).filter(Boolean).map(norm));
  const qw=normSet(db.questions.map(x=>x.vocabWord));
  const tw=normSet(db.trilingual.map(x=>x.en));
  const cw=normSet(db.communication.flatMap(x=>x.vocab||[]));
  const gw=normSet(db.grammar.flatMap(x=>x.vocabWords||[]));
  const independentRaw=[...expSentences,...generalSentences];
  const independent=sentencePracticePool();
  const independentKeys=independentRaw.map(s=>norm(s.en)).filter(Boolean);
  const standaloneDuplicateEnglish=independentKeys.length-new Set(independentKeys).size;
  const standaloneQuality=independentRaw.filter(function(s){return !isNaturalStandaloneSentence(s)});
  const missing={sentences:[],questions:[],trilingual:[],communication:[],grammar:[],audio:[]};
  exp.forEach(v=>{
    const w=norm(v.word);
    if(!qw.has(w))missing.questions.push(v.word);
    if(!tw.has(w))missing.trilingual.push(v.word);
    if(!cw.has(w))missing.communication.push(v.word);
    if(!gw.has(w))missing.grammar.push(v.word);
    if(!(v.audio==="tts"&&v.audioEn))missing.audio.push(v.word);
  });
  independentRaw.forEach(s=>{
    if(!String(s.en||"").trim()||!String(s.vi||"").trim()||s.vocabWord)missing.sentences.push(s.id||"");
  });
  const result={
    expansion500:exp.length,expansion500V1:packageV1.length,expansion500V2:packageV2.length,
    duplicateWords:exp.length-new Set(exp.map(x=>norm(x.word))).size,
    sentences:expSentences.length,generalSentences:generalSentences.length,
    independentSentences:independentRaw.length,
    naturalIndependentSentences:independent.length,
    independentSentenceLinks:independentRaw.filter(x=>x.vocabWord).length,
    standaloneQualityIssues:standaloneQuality.length,
    standaloneDuplicateEnglish,
    questions:exp.length-missing.questions.length,trilingual:exp.length-missing.trilingual.length,
    communication:exp.length-missing.communication.length,grammar:exp.length-missing.grammar.length,
    audio:exp.length-missing.audio.length,missing
  };
  console.table(result);return result;
}
