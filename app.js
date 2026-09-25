const APP_VERSION="7.0.3";
const STORAGE_KEY="englishMaster_v1";
const DATA_URL="https://exist8506-bot.github.io/english-master-data/data/version.json";

let db={
  vocab:[],sentences:[],questions:[],grammar:[],communication:[],trilingual:[],
  stats:{xp:0,streak:0,learned:0,answered:0,correct:0},
  profile:{theme:"light",autoUpdate:true,speechRate:1},
  lastRemoteVersion:""
};
let view="home",flashIndex=0,flashFlipped=false,listenIndex=0,speakIndex=0,quizIndex=0,quizAnswered=false;
let activeRecognition=null,recognitionToken=0,listenAdvanceTimer=0;
let vocabPage=1,sentencePage=1,trilingualPage=1,communicationPage=1,lastVocabQuery="",pendingUserState=null;
let reviewQueue=[],reviewIndex=0,validatedContentSignature="",updateInProgress=false;
const CONTENT_DB_NAME="englishMasterContent_v1";
const CONTENT_STORE="snapshot";
let legacyStorageLoaded=false;

function $(id){return document.getElementById(id)}
function esc(s){return String(s??"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]})}
function escapeJs(s){return String(s??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,"&quot;").replace(/\r?\n/g," ")}
function norm(s){return String(s??"").trim().toLowerCase().replace(/\s+/g," ")}
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
function recordActivity(){
  const today=dateKey(),last=String(db.stats.lastActivityDate||"");
  if(last===today)return;
  if(last){
    const a=new Date(last+"T00:00:00"),b=new Date(today+"T00:00:00");
    const diff=Math.round((b-a)/86400000);
    db.stats.streak=diff===1?(Number(db.stats.streak)||0)+1:1;
  }else db.stats.streak=1;
  db.stats.lastActivityDate=today;
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
    lastRemoteVersion:String(d.lastRemoteVersion||"")
  };
}
function userSnapshot(source){
  const d=source||db,stats={...(d.stats||{})},profile={...(d.profile||{})};
  const states=Array.isArray(d.vocab)?d.vocab.map(function(v){return {
    word:v.word,status:v.status||"New",favorite:!!v.favorite,reviewDue:v.reviewDue||null,
    correct_count:Number(v.correct_count)||0,wrong_count:Number(v.wrong_count)||0,lastReviewed:v.lastReviewed||null
  }}):[];
  const p=d.positions||{flashIndex,listenIndex,speakIndex,quizIndex};
  return {schemaVersion:2,stats,profile,positions:p,vocabState:states};
}
function applyUserSnapshot(snapshot){
  if(!snapshot)return;
  db.stats={...db.stats,...(snapshot.stats||{})};
  db.profile={...db.profile,...(snapshot.profile||{})};
  const p=snapshot.positions||{};
  flashIndex=Number.isFinite(Number(p.flashIndex))?Number(p.flashIndex):flashIndex;
  listenIndex=Number.isFinite(Number(p.listenIndex))?Number(p.listenIndex):listenIndex;
  speakIndex=Number.isFinite(Number(p.speakIndex))?Number(p.speakIndex):speakIndex;
  quizIndex=Number.isFinite(Number(p.quizIndex))?Number(p.quizIndex):quizIndex;
  const states=Array.isArray(snapshot.vocabState)?snapshot.vocabState:[];
  if(!Array.isArray(db.vocab)||!db.vocab.length){pendingUserState=states;return;}
  const map=new Map(states.map(function(s){return [norm(s.word),s]}));
  db.vocab.forEach(function(v){
    const s=map.get(norm(v.word));if(!s)return;
    v.status=s.status||v.status||"New";v.favorite=!!s.favorite;v.reviewDue=s.reviewDue??v.reviewDue??null;
    v.correct_count=Number(s.correct_count)||0;v.wrong_count=Number(s.wrong_count)||0;v.lastReviewed=s.lastReviewed||v.lastReviewed||null;
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
function save(){
  try{
    db.positions={flashIndex,listenIndex,speakIndex,quizIndex};
    const serialized=JSON.stringify(userSnapshot());
    const previous=localStorage.getItem(STORAGE_KEY);
    if(previous){
      try{
        const prevParsed=JSON.parse(previous);
        localStorage.setItem(STORAGE_KEY+"_backup",JSON.stringify(userSnapshot(prevParsed)));
      }catch(e){}
    }
    localStorage.setItem(STORAGE_KEY,serialized);
    return true;
  }catch(e){
    toast("Không thể lưu tiến độ. Hãy giải phóng bộ nhớ trình duyệt rồi thử lại.");
    return false;
  }
}
function load(){
  let parsed=null,current=null;
  try{
    current=localStorage.getItem(STORAGE_KEY);
    try{parsed=current?JSON.parse(current):null}catch(e){}
  }catch(e){}
  if(!parsed){
    try{
      const backup=localStorage.getItem(STORAGE_KEY+"_backup");
      try{parsed=backup?JSON.parse(backup):null}catch(e){}
      if(parsed)toast("Đã khôi phục tiến độ từ bản sao lưu cục bộ.");
    }catch(e){}
  }
  if(parsed&&Array.isArray(parsed.vocab)){
    legacyStorageLoaded=true;
    db={
      ...db,...parsed,
      schemaVersion:2,
      vocab:Array.isArray(parsed.vocab)?parsed.vocab:[],
      sentences:Array.isArray(parsed.sentences)?parsed.sentences:[],
      questions:Array.isArray(parsed.questions)?parsed.questions:[],
      grammar:Array.isArray(parsed.grammar)?parsed.grammar:[],
      communication:Array.isArray(parsed.communication)?parsed.communication:[],
      trilingual:Array.isArray(parsed.trilingual)?parsed.trilingual:[],
      stats:{...db.stats,...(parsed.stats||{})},
      profile:{...db.profile,...(parsed.profile||{})}
    };
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
  if(cached){
    db={...db,...contentSnapshot(cached)};
    applyUserSnapshot(liveUserState);
    if(pendingUserState)applyUserSnapshot({vocabState:pendingUserState});
    validateContent(true);
    render();
  }
  const hasContent=db.vocab.length&&db.sentences.length&&db.questions.length&&db.trilingual.length;
  if(!hasContent){
    await updateOnline(true);
  }else if(db.profile.autoUpdate!==false){
    setTimeout(function(){updateOnline(false)},500);
  }
}
function toast(msg){
  const el=$("toast"); if(!el)return;
  el.textContent=msg; el.className="show"; setTimeout(function(){el.className=""},2600);
}
function addXP(n){db.stats.xp=(db.stats.xp||0)+Number(n||0)}
function recordVocabOutcome(word,correct,dueDays){
  const key=norm(word);
  if(!key)return;
  const v=db.vocab.find(function(x){return norm(x.word)===key});
  if(!v)return;
  v.lastReviewed=new Date().toISOString();
  if(correct){
    const wasLearned=["Learning","Review","Mastered","Đã nhớ","Rất dễ"].includes(v.status);
    v.correct_count=(Number(v.correct_count)||0)+1;
    if(!wasLearned)db.stats.learned=(Number(db.stats.learned)||0)+1;
    if(v.status==="New"||v.status==="Chưa nhớ")v.status="Learning";
    const days=Math.max(0,Number(dueDays??2));
    v.reviewDue=new Date(Date.now()+days*86400000).toISOString();
  }else{
    v.wrong_count=(Number(v.wrong_count)||0)+1;
    v.status="Chưa nhớ";
    v.reviewDue=new Date().toISOString();
  }
}

function stopRecognition(){
  recognitionToken++;
  if(activeRecognition){try{activeRecognition.onend=null;activeRecognition.abort()}catch(e){} activeRecognition=null;}
}
function show(v){
  stopSpeech();
  stopRecognition();
  if(listenAdvanceTimer){clearTimeout(listenAdvanceTimer);listenAdvanceTimer=0;}
  if(v!=="flashcards")reviewQueue=[];
  view=v;render();
}
function shell(title,sub,body){
  return '<section class="card hero"><h1 class="title">'+esc(title)+'</h1><p class="muted">'+esc(sub||"")+'</p></section>'+(body||"")
}
function shuffle(arr){
  const a=Array.isArray(arr)?arr.slice():[];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
let speechToken=0;
function getVoice(lang){
  try{
    const vs=window.speechSynthesis?.getVoices?.()||[], p=String(lang||"en-US").toLowerCase();
    return vs.find(v=>String(v.lang||"").toLowerCase()===p)||vs.find(v=>String(v.lang||"").toLowerCase().startsWith(p.split("-")[0]))||null;
  }catch(e){return null}
}
function stopSpeech(){
  speechToken++;
  if("speechSynthesis" in window)window.speechSynthesis.cancel();
}
function speak(text,rate,lang,retry,skipContentAudio){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const t=String(text??"").trim();if(!t)return;
  const token=++speechToken;
  const r=Number(rate)||Number(db.profile.speechRate)||1,l=lang||"en-US",attempt=Number(retry||0);
  if(!skipContentAudio){
    let item=null;
    if(view==="listening"&&db.sentences.length)item=db.sentences[listenIndex%db.sentences.length];
    else if(view==="speaking"&&db.sentences.length)item=db.sentences[speakIndex%db.sentences.length];
    const contentAudio=audioUrl(item,l);
    if(contentAudio){playAudio(contentAudio,t,r,l);return;}
  }
  const active=function(){return token===speechToken};
  const run=function(){
    if(!active())return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(t);u.lang=l;u.rate=r;
    const v=getVoice(l);if(v)u.voice=v;
    u.onerror=function(){
      if(!active())return;
      if(attempt<1)setTimeout(function(){if(active())speak(t,r,l,1)},180);
      else toast("Âm thanh gặp lỗi. Bấm Nghe lại để thử tiếp.");
    };
    try{
      window.speechSynthesis.resume();
      if(active())window.speechSynthesis.speak(u);
    }catch(e){
      if(attempt<1)setTimeout(function(){if(active())speak(t,r,l,1)},180);
      else toast("Không thể phát âm thanh.");
    }
  };
  const voices=window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[];
  if(!voices.length&&"onvoiceschanged" in window){
    let done=false;
    const once=function(){if(done||!active())return;done=true;window.speechSynthesis.onvoiceschanged=null;run()};
    window.speechSynthesis.onvoiceschanged=once;
    setTimeout(function(){if(!done){done=true;window.speechSynthesis.onvoiceschanged=null;run()}},180);
  }else run();
}
function speakSequence(lines,rate,lang){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const seq=(lines||[]).map(String).map(function(x){return x.trim()}).filter(Boolean),r=Number(rate)||0.92,l=lang||"en-US",token=++speechToken;
  window.speechSynthesis.cancel();
  let i=0;
  function next(){
    if(token!==speechToken)return;
    if(i>=seq.length)return;
    const u=new SpeechSynthesisUtterance(seq[i++]);u.lang=l;u.rate=r;const v=getVoice(l);if(v)u.voice=v;
    u.onend=next;u.onerror=function(){setTimeout(next,120)};
    window.speechSynthesis.resume();window.speechSynthesis.speak(u);
  }
  next();
}
function playAudio(url,fallbackText,rate,lang){
  const u=String(url||"").trim(),t=String(fallbackText||"").trim(),r=Number(rate)||1,l=lang||guessLang(t);
  if(!u){if(t)speak(t,r,l);return;}
  try{
    const a=new Audio(u);a.preload="auto";
    a.play().catch(function(){toast("Không phát được file âm thanh. Chuyển sang giọng đọc trình duyệt.");if(t)speak(t,r,l,0,true);});
  }catch(e){
    toast("Không thể phát file âm thanh. Chuyển sang giọng đọc trình duyệt.");
    if(t)speak(t,r,l,0,true);
  }
}
function audioUrl(item,lang){
  if(!item||typeof item!=="object")return "";
  const l=String(lang||"").toLowerCase(),base=l.slice(0,2);
  const keys=base==="en"?["audioEn","audio_en","enAudio"]:base==="zh"?["audioZh","audio_zh","zhAudio","chineseAudio"]:base==="vi"?["audioVi","audio_vi","viAudio","vietnameseAudio"]:[];
  for(const k of keys){const v=String(item[k]||"").trim();if(v)return v;}
  return String(item.audio||item.audioUrl||item.audio_url||"").trim();
}
function audioButton(text,label,lang,rate,item){
  const useLang=lang||guessLang(text),useRate=Number(rate)||Number(db.profile.speechRate)||1,url=audioUrl(item,useLang);
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
    if(!force&&db.lastRemoteVersion===ver&&!hasBland){toast("Dữ liệu đang mới nhất.");return}

    const incoming={};
    for(const key of Object.keys(spec)){
      const raw=await getJSON(DATA_URL.replace(/\/[^/]+$/,"/"+spec[key].path));
      const arr=Array.isArray(raw)?raw:(Array.isArray(raw[key])?raw[key]:[]);
      if(!Array.isArray(arr))throw new Error(key+" không trả về mảng dữ liệu");
      incoming[key]=arr;
    }

    const next={
      vocab:db.vocab.slice(),sentences:db.sentences.slice(),questions:db.questions.slice(),
      grammar:db.grammar.slice(),communication:db.communication.slice(),trilingual:db.trilingual.slice()
    };
    let added=0,changed=0;

    for(const x of incoming.vocab){
      const i=next.vocab.findIndex(v=>norm(v.word)===norm(x.word));
      if(i<0){
        next.vocab.push({...x,source:"remote",sourceVersion:ver,favorite:false,status:"New",reviewDue:null,correct_count:0,wrong_count:0});
        added++;
      }else{
        const oldV=next.vocab[i];
        next.vocab[i]={...oldV,...x,source:"remote",sourceVersion:ver,
          favorite:oldV.favorite??false,status:oldV.status||"New",reviewDue:oldV.reviewDue??null,
          correct_count:oldV.correct_count||0,wrong_count:oldV.wrong_count||0,lastReviewed:oldV.lastReviewed||null};
        changed++;
      }
    }
    for(const x of incoming.sentences){
      const i=next.sentences.findIndex(s=>String(s.id||"")===String(x.id||""));
      if(i<0){
        next.sentences.push({...x,source:"remote",sourceVersion:ver,favorite:false});
        added++;
      }else{
        const oldS=next.sentences[i];
        next.sentences[i]={...oldS,...x,source:"remote",sourceVersion:ver,favorite:oldS.favorite??false};
        changed++;
      }
    }
    for(const key of ["questions","grammar","communication","trilingual"]){
      const arr=next[key],keyFn=spec[key].key;
      for(const x of incoming[key]){
        const k=keyFn(x),i=arr.findIndex(y=>keyFn(y)===k);
        if(i<0){arr.push({...x,source:"remote",sourceVersion:ver});added++;}
        else if(arr[i].source==="remote"||key==="communication"||key==="grammar"||key==="questions"){
          arr[i]={...arr[i],...x,source:"remote",sourceVersion:ver};changed++;
        }
      }
    }

    const remoteContent={...next,lastRemoteVersion:ver};
    db={...db,...remoteContent};
    validateContent(true);
    if(pendingUserState){applyUserSnapshot({vocabState:pendingUserState});pendingUserState=null;}
    const cached=await cacheContent(db);
    if(!cached&&"indexedDB" in window)toast("Nội dung đã cập nhật nhưng chưa tạo được bản cache offline.");
    save();render();
    toast("Đã đồng bộ GitHub: +"+added+" mục mới, cập nhật "+changed+" mục.");
  }catch(e){
    toast("Cập nhật lỗi — chưa thay đổi dữ liệu hiện tại: "+e.message);
  }finally{
    updateInProgress=false;
  }
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
function render(){
  db.vocab=Array.isArray(db.vocab)?db.vocab:[];db.sentences=Array.isArray(db.sentences)?db.sentences:[];
  db.questions=Array.isArray(db.questions)?db.questions:[];db.grammar=Array.isArray(db.grammar)?db.grammar:[];
  db.communication=Array.isArray(db.communication)?db.communication:[];db.trilingual=Array.isArray(db.trilingual)?db.trilingual:[];
  document.body.classList.toggle("dark",db.profile.theme==="dark");
  if($("streak"))$("streak").textContent=db.stats.streak||0;
  const fn={home:home,vocab:vocab,sentences:sentences,flashcards:flashcards,quiz:quiz,listening:listening,speaking:speaking,grammar:grammar,communication:communication,trilingual:trilingual,review:review,stats:stats,settings:settings}[view]||home;
  fn();
}
function home(){
  $("view").innerHTML=shell("English Master V7.0.3","Học • Luyện • Nhớ • Cải thiện",
    '<div class="grid"><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Từ vựng</div></div><div class="card"><div class="big">'+db.sentences.length+'</div><div class="muted">Câu học</div></div><div class="card"><div class="big">'+db.questions.length+'</div><div class="muted">Câu trắc nghiệm</div></div></div>'+
    '<div class="card"><h2>Học nhanh</h2><div class="actions"><button class="primary" onclick="show(\'flashcards\')">🃏 Flashcards</button><button onclick="show(\'speaking\')">🎙️ Phát âm</button><button onclick="show(\'listening\')">🎧 Luyện nghe</button><button onclick="show(\'quiz\')">🧠 Trắc nghiệm</button></div></div>');
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
  const p=Math.max(1,Number(page)||1);
  if(kind==="vocab")vocabPage=p;
  else if(kind==="sentences")sentencePage=p;
  else if(kind==="trilingual")trilingualPage=p;
  else if(kind==="communication")communicationPage=p;
  render();
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
  const size=40,pages=Math.max(1,Math.ceil(db.sentences.length/size));
  if(sentencePage>pages)sentencePage=pages;
  const start=(sentencePage-1)*size,items=db.sentences.slice(start,start+size);
  $("view").innerHTML=shell("Học câu","Hiển thị theo trang để app nhẹ hơn trên điện thoại.",
    '<div class="card"><div class="muted small">Hiển thị '+(db.sentences.length?start+1:0)+'–'+Math.min(start+size,db.sentences.length)+' / '+db.sentences.length+' câu</div>'+pageControls(sentencePage,db.sentences.length,size,"sentences")+'</div>'+
    '<div class="grid grid-2">'+items.map(function(s){return '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted small">'+esc(s.grammar||"")+'</span></div><h3>'+esc(s.en)+'</h3><p class="muted">'+esc(s.vi||"")+'</p>'+audioGroup(s.en,"en-US",s)+'</div>'}).join("")+'</div>');
}
function renderFlashcards(){flashcards()}
function toggleFavorite(word){
  const key=norm(word),v=db.vocab.find(function(x){return norm(x.word)===key});
  if(!v)return;
  v.favorite=!v.favorite;save();render();
}
function startReview(){
  const now=new Date();
  const due=db.vocab.filter(function(v){return v.reviewDue&&new Date(v.reviewDue)<=now});
  const need=db.vocab.filter(function(v){return v.status==="Chưa nhớ"||v.status==="Review"||v.status==="New"});
  const seen=new Set(),queue=[];
  due.concat(need).forEach(function(v){
    const k=norm(v.word);if(k&&!seen.has(k)){seen.add(k);queue.push(k);}
  });
  if(!queue.length){toast("Hiện chưa có từ cần ôn.");return;}
  reviewQueue=queue;reviewIndex=0;flashFlipped=false;show("flashcards");
}
function flashcards(){
  if(!db.vocab.length){$("view").innerHTML=shell("Flashcards","Chưa có dữ liệu.");return}
  const reviewActive=reviewQueue.length>0;
  const list=reviewActive?reviewQueue:db.vocab;
  const idx=reviewActive?reviewIndex:flashIndex;
  const v=reviewActive?db.vocab.find(function(x){return norm(x.word)===norm(reviewQueue[idx%reviewQueue.length])}):list[idx%list.length];
  if(!v){reviewQueue=[];reviewIndex=0;return flashcards();}
  const front='<div><div class="big">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||"")+'</div>'+audioGroup(v.word,"en-US",v)+'<p class="muted">Bấm vào thẻ để lật</p></div>';
  const back='<div><div class="big">'+esc(v.meaning)+'</div><p>'+esc(v.example||"")+'</p><p class="muted">'+esc(v.exampleVi||"")+'</p>'+audioGroup(v.word,"en-US",v)+audioButton(v.example||v.word,"🔊 Nghe ví dụ","en-US",1,v)+'</div>';
  $("view").innerHTML=shell(reviewActive?"Ôn tập bằng Flashcards":"Flashcards",reviewActive?"Đang ôn các từ đến hạn/chưa nhớ.":"Lật thẻ, nghe từ/câu rồi tự đánh giá.",
    '<div class="card"><div class="row" style="justify-content:space-between"><b>Thẻ '+(idx%list.length+1)+' / '+list.length+'</b><div class="actions"><button onclick="toggleFavorite(\''+escapeJs(v.word)+'\')">'+(v.favorite?"⭐ Bỏ yêu thích":"☆ Yêu thích")+'</button><button onclick="shuffleFlash()">🔀 Ngẫu nhiên</button></div></div><div class="flash '+(flashFlipped?"flipped":"")+'" onclick="flashFlipped=!flashFlipped;renderFlashcards()">'+(flashFlipped?back:front)+'</div><div class="actions"><button onclick="rateFlash(\'Chưa nhớ\')">😵 Chưa nhớ</button><button onclick="rateFlash(\'Đã nhớ\')">🙂 Đã nhớ</button><button onclick="rateFlash(\'Rất dễ\')">😎 Rất dễ</button></div></div>');
}
function rateFlash(status){
  const reviewActive=reviewQueue.length>0;
  const idx=reviewActive?reviewIndex:flashIndex;
  const v=reviewActive?db.vocab.find(function(x){return norm(x.word)===norm(reviewQueue[idx%reviewQueue.length])}):db.vocab[idx%db.vocab.length];
  if(!v)return;
  const dueDays=status==="Rất dễ"?7:status==="Đã nhớ"?2:0;
  recordActivity();
  recordVocabOutcome(v.word,status!=="Chưa nhớ",dueDays);
  v.status=status;
  v.reviewDue=new Date(Date.now()+dueDays*86400000).toISOString();
  flashFlipped=false;
  if(reviewActive){
    if(reviewIndex+1>=reviewQueue.length){
      reviewQueue=[];reviewIndex=0;save();show("review");return;
    }
    reviewIndex++;
  }else{
    flashIndex=(flashIndex+1)%db.vocab.length;
  }
  save();render();
}
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
  if(!db.sentences.length){$("view").innerHTML=shell("Luyện nghe","Chưa có dữ liệu.");return}
  const s=db.sentences[listenIndex%db.sentences.length];
  const wrong=shuffle(db.sentences.filter(function(x){return x.id!==s.id&&x.vi})).slice(0,3).map(function(x){return x.vi});
  const choices=shuffle([s.vi,...wrong]);
  const showText=window.__showListeningText===true;
  $("view").innerHTML=shell("Luyện nghe","Nghe câu ở nhiều tốc độ, nghe lại và chọn đúng nghĩa.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted">Câu '+(listenIndex%db.sentences.length+1)+' / '+db.sentences.length+'</span></div>'+
    '<div class="actions" style="margin:14px 0"><button class="primary" onclick="speak(\''+escapeJs(s.en)+'\',0.75,\'en-US\')">🐢 0.75×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">▶ 1×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1.25,\'en-US\')">🐇 1.25×</button><button onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">🔁 Nghe lại</button><button onclick="window.__showListeningText=!window.__showListeningText;renderListening()">👁 '+(showText?"Ẩn câu":"Hiện câu")+'</button></div>'+
    (showText?'<div class="hint"><b>'+esc(s.en)+'</b><br><span class="muted">'+esc(s.vi||"")+'</span></div>':'')+
    '<h3>Nghe & chọn nghĩa</h3><div class="options">'+choices.map(function(o){return '<button class="option" onclick="listenCheck(this,\''+escapeJs(o)+'\',\''+escapeJs(s.vi)+'\')">'+esc(o)+'</button>'}).join("")+'</div><div id="listenResult" class="hint" style="margin-top:14px">Hãy nghe rồi chọn.</div></div>');
}
function listenCheck(el,selected,correct){
  document.querySelectorAll(".option").forEach(function(b){b.disabled=true});
  const ok=norm(selected)===norm(correct);el.classList.add(ok?"correct":"wrong");
  $("listenResult").innerHTML=ok?"✓ Chính xác!":"✗ Chưa đúng. Đáp án: <b>"+esc(correct)+"</b>";
  const currentSentence=db.sentences[listenIndex%db.sentences.length];
  db.stats.answered++;recordActivity();recordVocabOutcome(currentSentence?.vocabWord,ok);if(ok){db.stats.correct++;addXP(10)}save();
  if(listenAdvanceTimer)clearTimeout(listenAdvanceTimer);
  listenAdvanceTimer=setTimeout(function(){listenAdvanceTimer=0;listenIndex=(listenIndex+1)%db.sentences.length;window.__showListeningText=false;save();renderListening()},700);
}

function speaking(){renderSpeaking()}
let autoNextSpeaking=true;
function renderSpeaking(){
  if(!db.sentences.length){$("view").innerHTML=shell("Phát âm","Chưa có câu luyện.");return}
  const s=db.sentences[speakIndex%db.sentences.length],v=db.vocab.find(function(x){return norm(x.word)===norm(s.vocabWord)});
  $("view").innerHTML=shell("Luyện phát âm","Nghe mẫu → nói lại → có thể tự chuyển sang câu kế tiếp.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted">Câu '+(speakIndex%db.sentences.length+1)+' / '+db.sentences.length+'</span></div>'+
    '<h2>'+esc(s.en)+'</h2><p class="muted">'+esc(s.vi||"")+'</p><div class="hint"><b>Từ trọng tâm:</b> '+esc(s.vocabWord||"")+' <span class="ipa">'+esc(v?.ipa||"")+'</span></div>'+
    '<div class="actions" style="margin-top:14px"><button class="primary" onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">🔊 Nghe mẫu</button><button onclick="speak(\''+escapeJs(s.en)+'\',0.75,\'en-US\')">🐢 Nghe chậm</button>'+audioButton(s.vocabWord||"","🔊 Nghe từ","en-US",1,v)+
    '<button class="primary" onclick="startRecognition()">🎙️ Bắt đầu nói</button><button onclick="prevSpeak()">← Trước</button><button onclick="nextSpeak()">Tiếp →</button></div>'+
    '<div class="actions" style="margin-top:10px"><button onclick="autoNextSpeaking=!autoNextSpeaking;renderSpeaking()">⏭️ Tự chuyển: '+(autoNextSpeaking?"BẬT":"TẮT")+'</button><span class="muted small">Phím → cũng chuyển câu</span></div>'+
    '<div id="speechResult" class="hint" style="margin-top:14px">Nghe mẫu rồi nói lại.</div></div>');
}
function nextSpeak(){stopRecognition();speakIndex=(speakIndex+1)%db.sentences.length;save();renderSpeaking()}
function prevSpeak(){stopRecognition();speakIndex=(speakIndex-1+db.sentences.length)%db.sentences.length;save();renderSpeaking()}
function startRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Chrome/Edge thường hỗ trợ nhận diện microphone tốt hơn.");return}
  stopRecognition();
  const target=db.sentences[speakIndex%db.sentences.length].en,r=new SR(),token=++recognitionToken;
  activeRecognition=r;r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
  const out=$("speechResult");if(out)out.textContent="🎙️ Đang nghe...";
  r.onresult=function(e){
    if(token!==recognitionToken||activeRecognition!==r)return;
    const heard=e.results?.[0]?.[0]?.transcript||"",score=similarityScore(heard,target);
    if(out)out.innerHTML="<b>Bạn nói:</b> "+esc(heard)+"<br><b>Mức khớp:</b> "+score+"%<br><span class=\"muted\">Đây là độ tương đồng văn bản, không phải chấm phát âm chuyên môn.</span>";
    recordActivity();recordVocabOutcome(db.sentences[speakIndex%db.sentences.length].vocabWord,score>=80);
    if(score>=80)addXP(10);
    save();
    if(autoNextSpeaking)setTimeout(function(){if(view==="speaking"&&token===recognitionToken)nextSpeak()},1200);
  };
  r.onerror=function(){
    if(token!==recognitionToken)return;
    if(activeRecognition===r)activeRecognition=null;
    toast("Không nhận được giọng nói. Hãy kiểm tra quyền microphone.");
  };
  r.onend=function(){if(activeRecognition===r)activeRecognition=null;};
  try{r.start()}catch(e){if(activeRecognition===r)activeRecognition=null;toast("Microphone đang bận. Hãy thử lại.");}
}
function similarityScore(a,b){
  const A=norm(a).replace(/[.!?,]/g,"").split(" ").filter(Boolean),B=norm(b).replace(/[.!?,]/g,"").split(" ").filter(Boolean);
  if(!A.length||!B.length)return 0;let hit=0;const used=new Set();
  A.forEach(function(x){const i=B.findIndex(function(y,j){return !used.has(j)&&x===y});if(i>=0){hit++;used.add(i)}});return Math.round(hit/Math.max(A.length,B.length)*100);
}


function quiz(){
  quizAnswered=false;
  if(!db.questions.length){$("view").innerHTML=shell("Trắc nghiệm","Chưa có dữ liệu.");return}
  const q=db.questions[quizIndex%db.questions.length],opts=q.options||[];
  $("view").innerHTML=shell("Trắc nghiệm","Nghe câu hỏi và từng đáp án trước khi chọn.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(q.topic||"daily")+'</span><span class="muted">Câu '+(quizIndex%db.questions.length+1)+' / '+db.questions.length+'</span></div>'+
    '<div class="actions" style="margin:14px 0">'+audioButton(q.prompt,"🔊 Đọc câu hỏi",guessLang(q.prompt),1,q)+'</div><h2>'+esc(q.prompt)+'</h2><div class="options">'+
    opts.map(function(o,i){return '<div class="row"><button class="option" style="flex:1" onclick="answerQuiz('+i+','+Number(q.answer)+')">'+String.fromCharCode(65+i)+". "+esc(o)+'</button>'+audioButton(o,"🔊",guessLang(o),1)+'</div>'}).join("")+
    '</div><div id="qres" class="hint" style="margin-top:14px">Chọn đáp án.</div></div>');
}
function answerQuiz(i,a){
  if(quizAnswered)return;quizAnswered=true;const ok=i===a,q=db.questions[quizIndex%db.questions.length];
  document.querySelectorAll(".option").forEach(function(b,j){b.disabled=true;if(j===a)b.classList.add("correct");if(j===i&&!ok)b.classList.add("wrong")});
  db.stats.answered++;recordActivity();recordVocabOutcome(q.vocabWord,ok);if(ok){db.stats.correct++;addXP(10)}
  $("qres").innerHTML=(ok?"✓ Chính xác!":"✗ Chưa đúng.")+" "+esc(q.explain||"")+'<br><button class="primary" onclick="nextQuiz()">Câu tiếp →</button>';save();
}
function nextQuiz(){quizIndex=(quizIndex+1)%db.questions.length;quizAnswered=false;save();render()}

function grammar(){
  $("view").innerHTML=shell("Ngữ pháp","Mỗi ví dụ có nút nghe để bạn nghe và đọc theo.",
    '<div class="grid grid-2">'+db.grammar.map(function(g){return '<div class="card"><span class="badge">'+esc(g.level||"Beginner")+'</span><h3>'+esc(g.title||"")+'</h3><div class="hint"><b>Công thức:</b> '+esc(g.formula||"")+'</div><p>'+esc(g.explain||"")+'</p><h4>Ví dụ</h4><div class="list">'+(g.examples||[]).map(function(e){return '<div class="item">'+esc(e)+' '+audioButton(e,"🔊 Nghe","en-US",1,g)+'</div>'}).join("")+'</div><p class="muted small">'+esc(g.notes||"")+'</p></div>'}).join("")+'</div>');
}
function communication(){
  const size=12,pages=Math.max(1,Math.ceil(db.communication.length/size));
  if(communicationPage>pages)communicationPage=pages;
  const start=(communicationPage-1)*size,items=db.communication.slice(start,start+size);
  $("view").innerHTML=shell("Giao tiếp","Hội thoại thực tế; mỗi đoạn có 8–12 lượt nói và có thể nghe từng câu hoặc cả đoạn.",
    '<div class="card"><div class="muted small">Hiển thị '+(db.communication.length?start+1:0)+'–'+Math.min(start+size,db.communication.length)+' / '+db.communication.length+' hội thoại</div>'+pageControls(communicationPage,db.communication.length,size,"communication")+'</div>'+
    '<div class="grid grid-2">'+items.map(function(d,j){
      const i=start+j,lines=d.lines||[];
      return '<div class="card"><div class="toolbar"><span class="badge">'+esc(d.topic||"")+'</span><span class="muted small">'+lines.length+' lượt</span></div><h3>'+esc(d.title||"")+'</h3>'+
      '<div class="list">'+lines.map(function(l){
        return '<div class="item"><div><b>'+esc(l[0])+'</b> — <span>'+esc(l[1])+'</span></div>'+(l[2]?'<div class="muted small" style="margin-top:5px">'+esc(l[2])+'</div>':'')+
        '<div class="actions" style="margin-top:7px">'+audioButton(l[1],"🔊 Nghe","en-US",1,l)+'</div></div>';
      }).join("")+'</div><div class="actions" style="margin-top:12px"><button class="primary" onclick="playDialogue('+i+')">▶ Nghe cả đoạn</button><button onclick="stopSpeech()">⏹ Dừng</button></div></div>';
    }).join("")+'</div>'+pageControls(communicationPage,db.communication.length,size,"communication"));
}
function playDialogue(index){
  const d=db.communication[index];if(!d)return;
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
  const due=db.vocab.filter(function(v){return v.reviewDue&&new Date(v.reviewDue)<=new Date()});
  const need=db.vocab.filter(function(v){return v.status==="Chưa nhớ"||v.status==="Review"||v.status==="New"});
  $("view").innerHTML=shell("Ôn tập","Ưu tiên từ đến hạn và từ bạn đánh dấu chưa nhớ.",
    '<div class="grid"><div class="card"><div class="big">'+due.length+'</div><div class="muted">Đến hạn</div></div><div class="card"><div class="big">'+need.length+'</div><div class="muted">Cần củng cố</div></div><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Tổng từ</div></div></div><div class="card"><div class="actions"><button class="primary" onclick="startReview()">🃏 Bắt đầu ôn tập</button></div></div>');
}
function stats(){
  const acc=db.stats.answered?Math.round((db.stats.correct/db.stats.answered)*100):0;
  $("view").innerHTML=shell("Tiến độ","Theo dõi XP, số từ học và độ chính xác.",
    '<div class="grid"><div class="card"><div class="big">'+db.stats.xp+'</div><div class="muted">XP</div></div><div class="card"><div class="big">'+db.stats.learned+'</div><div class="muted">Số từ đã học</div></div><div class="card"><div class="big">'+acc+'%</div><div class="muted">Độ chính xác</div></div></div>');
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
function settings(){
  $("view").innerHTML=shell("Cài đặt","Cập nhật GitHub, âm thanh và giao diện.",
    '<div class="card"><h2>☁️ Cập nhật nội dung</h2><p class="muted">Nguồn: <code>'+esc(DATA_URL)+'</code></p><p>Phiên bản dữ liệu: <b>'+esc(db.lastRemoteVersion||"chưa đồng bộ")+'</b></p><div class="actions"><button class="primary" onclick="updateOnline(true)">🔄 Kiểm tra cập nhật</button><button onclick="speak(\'This is an audio test.\',1,\'en-US\')">🔊 Kiểm tra âm thanh</button></div></div>'+
    '<div class="card"><h2>🔊 Âm thanh & ngôn ngữ</h2><p class="muted">Giọng trình duyệt: '+esc(voiceAvailability())+'</p><p class="small muted">Nếu không có file audio riêng, app sẽ dùng giọng đọc TTS phù hợp với ngôn ngữ.</p></div>'+
    '<div class="card"><h2>🔊 Tốc độ mặc định</h2><select onchange="db.profile.speechRate=Number(this.value);save()">'+[0.5,0.75,1,1.25,1.5].map(function(x){return '<option value="'+x+'" '+(Number(db.profile.speechRate||1)===x?"selected":"")+'>'+x+'×</option>'}).join("")+'</select></div>'+
    '<div class="card"><h2>🌙 Giao diện</h2><button onclick="db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()">Đổi Light / Dark</button></div>');
}

function registerServiceWorker(){
  if("serviceWorker" in navigator){
    window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){})});
  }
}

function init(){
  load();
  if($("theme"))$("theme").onclick=function(){db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()};
  document.addEventListener("keydown",function(e){
    if(view==="speaking"&&e.key==="ArrowRight"&&e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA"){nextSpeak()}
    if(e.key==="Escape")stopSpeech();
  });
  render();
  hydrateContent();
  registerServiceWorker();
}
init();
