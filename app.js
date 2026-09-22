const APP_VERSION="5.0.0";
const STORAGE_KEY="englishMaster_v1";
const DATA_URL="https://exist8506-bot.github.io/english-master-data/data/version.json";

let db={
  vocab:[],sentences:[],questions:[],grammar:[],communication:[],trilingual:[],
  stats:{xp:0,streak:0,learned:0,answered:0,correct:0},
  profile:{theme:"light",autoUpdate:true,speechRate:1},
  lastRemoteVersion:""
};
let view="home",flashIndex=0,flashFlipped=false,listenIndex=0,speakIndex=0,quizIndex=0,quizAnswered=false;

function $(id){return document.getElementById(id)}
function esc(s){return String(s??"").replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]})}
function escapeJs(s){return String(s??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\r?\n/g," ")}
function norm(s){return String(s??"").trim().toLowerCase().replace(/\s+/g," ")}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
function load(){
  try{
    const old=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(old) db={
      ...db,...old,
      vocab:Array.isArray(old.vocab)?old.vocab:[],
      sentences:Array.isArray(old.sentences)?old.sentences:[],
      questions:Array.isArray(old.questions)?old.questions:[],
      grammar:Array.isArray(old.grammar)?old.grammar:[],
      communication:Array.isArray(old.communication)?old.communication:[],
      trilingual:Array.isArray(old.trilingual)?old.trilingual:[],
      stats:{...db.stats,...(old.stats||{})},
      profile:{...db.profile,...(old.profile||{})}
    };
  }catch(e){}
}
function toast(msg){
  const el=$("toast"); if(!el)return;
  el.textContent=msg; el.className="show"; setTimeout(function(){el.className=""},2600);
}
function addXP(n){db.stats.xp=(db.stats.xp||0)+Number(n||0)}
function show(v){view=v;render()}
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
function speak(text,rate,lang,retry){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const t=String(text??"").trim();if(!t)return;
  speechToken++;
  const r=Number(rate)||Number(db.profile.speechRate)||1,l=lang||"en-US",attempt=Number(retry||0);
  const run=function(){
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(t);u.lang=l;u.rate=r;
    const v=getVoice(l);if(v)u.voice=v;
    u.onend=function(){};
    u.onerror=function(){
      if(attempt<1)setTimeout(function(){speak(t,r,l,1)},180);
      else toast("Âm thanh gặp lỗi. Bấm Nghe lại để thử tiếp.");
    };
    try{
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
    }catch(e){if(attempt<1)setTimeout(function(){speak(t,r,l,1)},180);else toast("Không thể phát âm thanh.")}
  };
  const voices=window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[];
  if(!voices.length&&"onvoiceschanged" in window){
    let done=false;
    const once=function(){if(done)return;done=true;window.speechSynthesis.onvoiceschanged=null;run()};
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
function audioButton(text,label,lang,rate){
  const useLang=lang||guessLang(text),useRate=Number(rate)||Number(db.profile.speechRate)||1;
  return '<button class="btn btn-secondary" onclick="event.stopPropagation();speak(\''+escapeJs(text)+'\','+useRate+',\''+useLang+'\')">'+(label||"🔊 Nghe")+'</button>';
}
function audioGroup(text,lang){
  return '<div class="actions">'+audioButton(text,"🔊 Nghe",lang||"en-US",1)+audioButton(text,"🐢 0.75×",lang||"en-US",0.75)+audioButton(text,"🐇 1.25×",lang||"en-US",1.25)+'</div>';
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
  try{
    const m=await getJSON(DATA_URL),ver=String(m.version??"");
    if(!ver)throw new Error("version.json thiếu version");
    const hasBland=db.vocab.some(function(v){return blandExample(v.example)})||db.sentences.some(function(s){return blandExample(s.en)});
    if(!force&&db.lastRemoteVersion===ver&&!hasBland){toast("Dữ liệu đang mới nhất.");return}
    const files=m.files||{};
    const spec={
      vocab:{path:files.vocabulary||"vocabulary.json",key:x=>norm(x.word)},
      sentences:{path:files.sentences||"sentences.json",key:x=>String(x.id||norm(x.en))},
      questions:{path:files.questions||"questions.json",key:x=>String(x.id||norm(x.prompt))},
      grammar:{path:files.grammar||"grammar.json",key:x=>String(x.id||norm(x.title))},
      communication:{path:files.communication||"communication.json",key:x=>String(x.id||norm(x.title))},
      trilingual:{path:files.trilingual||"trilingual.json",key:x=>norm(x.en)+"|"+norm(x.zh||x.chinese)}
    };
    let added=0,changed=0;
    for(const key of Object.keys(spec)){
      try{
        const raw=await getJSON(DATA_URL.replace(/\/[^/]+$/,"/"+spec[key].path));
        const incoming=Array.isArray(raw)?raw:(Array.isArray(raw[key])?raw[key]:[]);
        if(key==="vocab"){
          for(const x of incoming){
            const i=db.vocab.findIndex(v=>norm(v.word)===norm(x.word));
            if(i<0){db.vocab.push({...x,source:"remote",sourceVersion:ver,favorite:false,status:"New",reviewDue:null,correct_count:0,wrong_count:0});added++}
            else{
              const old=db.vocab[i];
              if(blandExample(old.example)||old.source==="remote"){
                db.vocab[i]={...old,...x,source:"remote",sourceVersion:ver,favorite:old.favorite??false,status:old.status||"New",reviewDue:old.reviewDue??null,correct_count:old.correct_count||0,wrong_count:old.wrong_count||0,lastReviewed:old.lastReviewed||null};changed++;
              }
            }
          }
        }else if(key==="sentences"){
          if(!Array.isArray(db.sentences))db.sentences=[];
          for(const x of incoming){
            const i=db.sentences.findIndex(s=>String(s.id||"")===String(x.id||"")||(s.vocabWord&&x.vocabWord&&norm(s.vocabWord)===norm(x.vocabWord)));
            if(i<0){db.sentences.push({...x,source:"remote",sourceVersion:ver,favorite:false});added++}
            else if(blandExample(db.sentences[i].en)||db.sentences[i].source==="remote"){
              const old=db.sentences[i];db.sentences[i]={...old,...x,source:"remote",sourceVersion:ver,favorite:old.favorite??false};changed++;
            }
          }
        }else{
          if(!Array.isArray(db[key]))db[key]=[];
          const arr=db[key];
          const keyFn=spec[key].key;
          for(const x of incoming){
            const i=arr.findIndex(y=>keyFn(y)===keyFn(x));
            if(i<0){arr.push({...x,source:"remote",sourceVersion:ver});added++}
            else{
              const old=arr[i];
              if(key==="communication"||key==="grammar"||key==="questions"||old.source==="remote"){
                arr[i]={...old,...x,source:"remote",sourceVersion:ver};changed++;
              }
            }
          }
          db[key]=arr;
        }
      }catch(e){if(key==="vocab")throw e}
    }
    db.lastRemoteVersion=ver;save();render();
    toast("Đã đồng bộ GitHub: +"+added+" mục mới, cập nhật "+changed+" mục.");
  }catch(e){toast("Cập nhật lỗi: "+e.message)}
}
function render(){
  document.body.classList.toggle("dark",db.profile.theme==="dark");
  if($("streak"))$("streak").textContent=db.stats.streak||0;
  const fn={home:home,vocab:vocab,sentences:sentences,flashcards:flashcards,quiz:quiz,listening:listening,speaking:speaking,grammar:grammar,communication:communication,trilingual:trilingual,review:review,stats:stats,settings:settings}[view]||home;
  fn();
}
function home(){
  $("view").innerHTML=shell("English Master V4.1","Học • Luyện • Nhớ • Cải thiện",
    '<div class="grid"><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Từ vựng</div></div><div class="card"><div class="big">'+db.sentences.length+'</div><div class="muted">Câu học</div></div><div class="card"><div class="big">'+db.questions.length+'</div><div class="muted">Câu trắc nghiệm</div></div></div>'+
    '<div class="card"><h2>Học nhanh</h2><div class="actions"><button class="primary" onclick="show(\'flashcards\')">🃏 Flashcards</button><button onclick="show(\'speaking\')">🎙️ Phát âm</button><button onclick="show(\'listening\')">🎧 Luyện nghe</button><button onclick="show(\'quiz\')">🧠 Trắc nghiệm</button></div></div>');
}
function vocab(){
  const q=norm((document.getElementById("vSearch")||{}).value||"");
  const list=q?db.vocab.filter(function(v){return norm(v.word).includes(q)||norm(v.meaning).includes(q)||norm(v.example).includes(q)}):db.vocab;
  $("view").innerHTML=shell("Học từ vựng","Mỗi từ có IPA, nghĩa, ví dụ đa dạng và nghe từ/câu.",
    '<div class="card"><div class="row"><input id="vSearch" placeholder="Tìm từ, nghĩa hoặc ví dụ..." value="'+esc(q)+'" onkeydown="if(event.key===\'Enter\')vocab()"><button class="primary" onclick="vocab()">🔎 Tìm</button><button onclick="show(\'flashcards\')">🃏 Flashcards</button></div></div>'+
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th><th>Nghe</th></tr></thead><tbody>'+
    list.map(function(v){return '<tr><td><div class="word">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||"")+'</div></td><td>'+esc(v.meaning)+'<div class="small muted">'+esc(v.pos||"")+'</div></td><td>'+esc(v.example||"")+'<div class="small muted">'+esc(v.exampleVi||"")+'</div></td><td><div class="actions">'+audioButton(v.word,"🔊 Từ")+audioButton(v.example||v.word,"🔊 Câu")+'</div></td></tr>'}).join("")+
    '</tbody></table></div></div>');
}
function sentences(){
  $("view").innerHTML=shell("Học câu","500 câu luyện đã được viết lại để tránh mẫu lặp “I learned the word…”.",
    '<div class="grid grid-2">'+db.sentences.map(function(s){return '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted small">'+esc(s.grammar||"")+'</span></div><h3>'+esc(s.en)+'</h3><p class="muted">'+esc(s.vi||"")+'</p>'+audioGroup(s.en,"en-US")+'</div>'}).join("")+'</div>');
}
function renderFlashcards(){flashcards()}
function flashcards(){
  if(!db.vocab.length){$("view").innerHTML=shell("Flashcards","Chưa có dữ liệu.");return}
  const v=db.vocab[flashIndex%db.vocab.length];
  const front='<div><div class="big">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||"")+'</div>'+audioGroup(v.word,"en-US")+'<p class="muted">Bấm vào thẻ để lật</p></div>';
  const back='<div><div class="big">'+esc(v.meaning)+'</div><p>'+esc(v.example||"")+'</p><p class="muted">'+esc(v.exampleVi||"")+'</p>'+audioGroup(v.word,"en-US")+audioButton(v.example||v.word,"🔊 Nghe ví dụ","en-US",1)+'</div>';
  $("view").innerHTML=shell("Flashcards","Lật thẻ, nghe từ/câu rồi tự đánh giá.",
    '<div class="card"><div class="row" style="justify-content:space-between"><b>Thẻ '+(flashIndex%db.vocab.length+1)+' / '+db.vocab.length+'</b><button onclick="shuffleFlash()">🔀 Ngẫu nhiên</button></div><div class="flash '+(flashFlipped?"flipped":"")+'" onclick="flashFlipped=!flashFlipped;renderFlashcards()">'+(flashFlipped?back:front)+'</div><div class="actions"><button onclick="rateFlash(\'Chưa nhớ\')">😵 Chưa nhớ</button><button onclick="rateFlash(\'Đã nhớ\')">🙂 Đã nhớ</button><button onclick="rateFlash(\'Rất dễ\')">😎 Rất dễ</button></div></div>');
}
function rateFlash(status){
  const v=db.vocab[flashIndex%db.vocab.length];v.status=status;v.lastReviewed=new Date().toISOString();v.reviewDue=new Date(Date.now()+(status==="Rất dễ"?7:status==="Đã nhớ"?2:0)*86400000).toISOString();db.stats.learned++;addXP(5);save();flashIndex=(flashIndex+1)%db.vocab.length;flashFlipped=false;render();
}
function shuffleFlash(){flashIndex=Math.floor(Math.random()*Math.max(1,db.vocab.length));flashFlipped=false;render()}

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
  db.stats.answered++;if(ok){db.stats.correct++;addXP(10)}save();
  setTimeout(function(){listenIndex=(listenIndex+1)%db.sentences.length;window.__showListeningText=false;renderListening()},700);
}

function speaking(){renderSpeaking()}
let autoNextSpeaking=true;
function renderSpeaking(){
  if(!db.sentences.length){$("view").innerHTML=shell("Phát âm","Chưa có câu luyện.");return}
  const s=db.sentences[speakIndex%db.sentences.length],v=db.vocab.find(function(x){return norm(x.word)===norm(s.vocabWord)});
  $("view").innerHTML=shell("Luyện phát âm","Nghe mẫu → nói lại → có thể tự chuyển sang câu kế tiếp.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(s.topic||"daily")+'</span><span class="muted">Câu '+(speakIndex%db.sentences.length+1)+' / '+db.sentences.length+'</span></div>'+
    '<h2>'+esc(s.en)+'</h2><p class="muted">'+esc(s.vi||"")+'</p><div class="hint"><b>Từ trọng tâm:</b> '+esc(s.vocabWord||"")+' <span class="ipa">'+esc(v?.ipa||"")+'</span></div>'+
    '<div class="actions" style="margin-top:14px"><button class="primary" onclick="speak(\''+escapeJs(s.en)+'\',1,\'en-US\')">🔊 Nghe mẫu</button><button onclick="speak(\''+escapeJs(s.en)+'\',0.75,\'en-US\')">🐢 Nghe chậm</button>'+audioButton(s.vocabWord||"","🔊 Nghe từ","en-US",1)+
    '<button class="primary" onclick="startRecognition()">🎙️ Bắt đầu nói</button><button onclick="prevSpeak()">← Trước</button><button onclick="nextSpeak()">Tiếp →</button></div>'+
    '<div class="actions" style="margin-top:10px"><button onclick="autoNextSpeaking=!autoNextSpeaking;renderSpeaking()">⏭️ Tự chuyển: '+(autoNextSpeaking?"BẬT":"TẮT")+'</button><span class="muted small">Phím → cũng chuyển câu</span></div>'+
    '<div id="speechResult" class="hint" style="margin-top:14px">Nghe mẫu rồi nói lại.</div></div>');
}
function nextSpeak(){speakIndex=(speakIndex+1)%db.sentences.length;renderSpeaking()}
function prevSpeak(){speakIndex=(speakIndex-1+db.sentences.length)%db.sentences.length;renderSpeaking()}
function startRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Chrome/Edge thường hỗ trợ nhận diện microphone tốt hơn.");return}
  const target=db.sentences[speakIndex%db.sentences.length].en,r=new SR();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
  const out=$("speechResult");if(out)out.textContent="🎙️ Đang nghe...";
  r.onresult=function(e){
    const heard=e.results[0][0].transcript,score=similarityScore(heard,target);
    if(out)out.innerHTML="<b>Bạn nói:</b> "+esc(heard)+"<br><b>Mức khớp:</b> "+score+"%<br><span class=\"muted\">Đây là độ tương đồng văn bản, không phải chấm phát âm chuyên môn.</span>";
    if(score>=80){addXP(10);save()}
    if(autoNextSpeaking)setTimeout(function(){if(view==="speaking")nextSpeak()},1200);
  };
  r.onerror=function(){toast("Không nhận được giọng nói. Hãy kiểm tra quyền microphone.")};r.start();
}
function similarityScore(a,b){
  const A=norm(a).replace(/[.!?,]/g,"").split(" ").filter(Boolean),B=norm(b).replace(/[.!?,]/g,"").split(" ").filter(Boolean);
  if(!A.length||!B.length)return 0;let hit=0;const used=new Set();
  A.forEach(function(x){const i=B.findIndex(function(y,j){return !used.has(j)&&x===y});if(i>=0){hit++;used.add(i)}});return Math.round(hit/Math.max(A.length,B.length)*100);
}


function quiz(){
  if(!db.questions.length){$("view").innerHTML=shell("Trắc nghiệm","Chưa có dữ liệu.");return}
  const q=db.questions[quizIndex%db.questions.length],opts=q.options||[];
  $("view").innerHTML=shell("Trắc nghiệm","Nghe câu hỏi và từng đáp án trước khi chọn.",
    '<div class="card"><div class="toolbar"><span class="badge">'+esc(q.topic||"daily")+'</span><span class="muted">Câu '+(quizIndex%db.questions.length+1)+' / '+db.questions.length+'</span></div>'+
    '<div class="actions" style="margin:14px 0">'+audioButton(q.prompt,"🔊 Đọc câu hỏi")+'</div><h2>'+esc(q.prompt)+'</h2><div class="options">'+
    opts.map(function(o,i){return '<div class="row"><button class="option" style="flex:1" onclick="answerQuiz('+i+','+Number(q.answer)+')">'+String.fromCharCode(65+i)+". "+esc(o)+'</button>'+audioButton(o,"🔊")+'</div>'}).join("")+
    '</div><div id="qres" class="hint" style="margin-top:14px">Chọn đáp án.</div></div>');
}
function answerQuiz(i,a){
  if(quizAnswered)return;quizAnswered=true;const ok=i===a,q=db.questions[quizIndex%db.questions.length];
  document.querySelectorAll(".option").forEach(function(b,j){b.disabled=true;if(j===a)b.classList.add("correct");if(j===i&&!ok)b.classList.add("wrong")});
  db.stats.answered++;if(ok){db.stats.correct++;addXP(10)}
  $("qres").innerHTML=(ok?"✓ Chính xác!":"✗ Chưa đúng.")+" "+esc(q.explain||"")+'<br><button class="primary" onclick="nextQuiz()">Câu tiếp →</button>';save();
}
function nextQuiz(){quizIndex=(quizIndex+1)%db.questions.length;quizAnswered=false;render()}

function grammar(){
  $("view").innerHTML=shell("Ngữ pháp","Mỗi ví dụ có nút nghe để bạn nghe và đọc theo.",
    '<div class="grid grid-2">'+db.grammar.map(function(g){return '<div class="card"><span class="badge">'+esc(g.level||"Beginner")+'</span><h3>'+esc(g.title||"")+'</h3><div class="hint"><b>Công thức:</b> '+esc(g.formula||"")+'</div><p>'+esc(g.explain||"")+'</p><h4>Ví dụ</h4><div class="list">'+(g.examples||[]).map(function(e){return '<div class="item">'+esc(e)+' '+audioButton(e,"🔊 Nghe","en-US",1)+'</div>'}).join("")+'</div><p class="muted small">'+esc(g.notes||"")+'</p></div>'}).join("")+'</div>');
}
function communication(){
  $("view").innerHTML=shell("Giao tiếp","Hội thoại dài hơn, có 8 lượt nói; nghe từng câu hoặc nghe cả đoạn.",
    '<div class="grid grid-2">'+db.communication.map(function(d,i){
      const lines=d.lines||[];
      return '<div class="card"><div class="toolbar"><span class="badge">'+esc(d.topic||"")+'</span><span class="muted small">'+lines.length+' lượt</span></div><h3>'+esc(d.title||"")+'</h3>'+
      '<div class="list">'+lines.map(function(l,j){
        return '<div class="item"><div><b>'+esc(l[0])+'</b> — <span>'+esc(l[1])+'</span></div>'+(l[2]?'<div class="muted small" style="margin-top:5px">'+esc(l[2])+'</div>':'')+
        '<div class="actions" style="margin-top:7px">'+audioButton(l[1],"🔊 Nghe","en-US",1)+'</div></div>';
      }).join("")+'</div><div class="actions" style="margin-top:12px"><button class="primary" onclick="playDialogue('+i+')">▶ Nghe cả đoạn</button><button onclick="stopSpeech()">⏹ Dừng</button></div></div>';
    }).join("")+'</div>');
}
function playDialogue(index){
  const d=db.communication[index];if(!d)return;
  stopSpeech();const lines=(d.lines||[]).map(function(l){return l[1]});speakSequence(lines,0.9,"en-US");
}


function trilingual(){
  $("view").innerHTML=shell("Tam ngữ Anh – Trung – Việt","Mỗi ngôn ngữ có giọng đọc riêng.",
    '<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>English</th><th>中文</th><th>Tiếng Việt</th><th>Nghe</th></tr></thead><tbody>'+
    db.trilingual.map(function(x){return '<tr><td>'+esc(x.en||"")+'</td><td>'+esc(x.zh||x.chinese||"")+'</td><td>'+esc(x.vi||x.vietnamese||"")+'</td><td><div class="actions">'+audioButton(x.en,"🇺🇸","en-US")+audioButton(x.zh||x.chinese,"🇨🇳","zh-CN")+audioButton(x.vi||x.vietnamese,"🇻🇳","vi-VN")+'</div></td></tr>'}).join("")+
    '</tbody></table></div></div>');
}
function review(){
  const due=db.vocab.filter(function(v){return v.reviewDue&&new Date(v.reviewDue)<=new Date()});
  const need=db.vocab.filter(function(v){return v.status==="Chưa nhớ"||v.status==="Review"||v.status==="New"});
  $("view").innerHTML=shell("Ôn tập","Ưu tiên từ đến hạn và từ bạn đánh dấu chưa nhớ.",
    '<div class="grid"><div class="card"><div class="big">'+due.length+'</div><div class="muted">Đến hạn</div></div><div class="card"><div class="big">'+need.length+'</div><div class="muted">Cần củng cố</div></div><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Tổng từ</div></div></div><div class="card"><div class="actions"><button class="primary" onclick="show(\'flashcards\')">🃏 Ôn bằng Flashcards</button></div></div>');
}
function stats(){
  const acc=db.stats.answered?Math.round((db.stats.correct/db.stats.answered)*100):0;
  $("view").innerHTML=shell("Tiến độ","Theo dõi XP, số từ học và độ chính xác.",
    '<div class="grid"><div class="card"><div class="big">'+db.stats.xp+'</div><div class="muted">XP</div></div><div class="card"><div class="big">'+db.stats.learned+'</div><div class="muted">Lần đánh dấu đã học</div></div><div class="card"><div class="big">'+acc+'%</div><div class="muted">Độ chính xác</div></div></div>');
}
function settings(){
  $("view").innerHTML=shell("Cài đặt","Cập nhật GitHub, âm thanh và giao diện.",
    '<div class="card"><h2>☁️ Cập nhật nội dung</h2><p class="muted">Nguồn: <code>'+esc(DATA_URL)+'</code></p><p>Phiên bản dữ liệu: <b>'+esc(db.lastRemoteVersion||"chưa đồng bộ")+'</b></p><div class="actions"><button class="primary" onclick="updateOnline(true)">🔄 Kiểm tra cập nhật</button><button onclick="speak(\'This is an audio test.\',1,\'en-US\')">🔊 Kiểm tra âm thanh</button></div></div>'+
    '<div class="card"><h2>🔊 Tốc độ mặc định</h2><select onchange="db.profile.speechRate=Number(this.value);save()">'+[0.5,0.75,1,1.25,1.5].map(function(x){return '<option value="'+x+'" '+(Number(db.profile.speechRate||1)===x?"selected":"")+'>'+x+'×</option>'}).join("")+'</select></div>'+
    '<div class="card"><h2>🌙 Giao diện</h2><button onclick="db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()">Đổi Light / Dark</button></div>');
}

function init(){
  load();
  if($("theme"))$("theme").onclick=function(){db.profile.theme=db.profile.theme==="dark"?"light":"dark";save();render()};
  document.addEventListener("keydown",function(e){
    if(view==="speaking"&&e.key==="ArrowRight"&&e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA"){nextSpeak()}
    if(e.key==="Escape")stopSpeech();
  });
  render();
  if(db.profile.autoUpdate!==false)setTimeout(function(){updateOnline(false)},800);
}
init();
