const KEY='englishMaster_v1', DATA_URL='https://exist8506-bot.github.io/english-master-data/data/version.json';
let db={vocab:[],sentences:[],questions:[],grammar:[],communication:[],trilingual:[],stats:{xp:0,streak:0,learned:0,answered:0,correct:0},profile:{theme:'light',autoUpdate:true},lastRemoteVersion:null};
let view='home', flashIndex=0, flashFlipped=false, speakIndex=0, listenIndex=0, quizIndex=0, quizAnswered=false;
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ');
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
function toast(s){const e=$('toast');e.textContent=s;e.className='show';setTimeout(()=>e.className='',2500)}
function speak(t,rate=1){if(!('speechSynthesis'in window)){toast('Trình duyệt không hỗ trợ đọc giọng nói');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t));u.lang='en-US';u.rate=rate;speechSynthesis.speak(u)}
function merge(oldArr,newArr,key){const out=Array.isArray(oldArr)?[...oldArr]:[],seen=new Set(out.map(key).filter(Boolean));for(const x of newArr||[]){const k=key(x);if(k&&!seen.has(k)){out.push(x);seen.add(k)}}return out}
async function getJSON(url){const r=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
const sibling=f=>DATA_URL.replace(/\/[^/]+$/,'/'+f);
async function updateOnline(force=false){try{const m=await getJSON(DATA_URL),ver=String(m.version??'');if(!ver)return;if(!force&&db.lastRemoteVersion===ver)return;const files=m.files||{},names={vocab:files.vocabulary||'vocabulary.json',sentences:files.sentences||'sentences.json',questions:files.questions||'questions.json',grammar:files.grammar||'grammar.json',communication:files.communication||'communication.json',trilingual:files.trilingual||'trilingual.json'};let added=0;for(const [key,file] of Object.entries(names)){try{const d=await getJSON(/^https?:/i.test(file)?file:sibling(file)),arr=Array.isArray(d)?d:(Array.isArray(d[key])?d[key]:[]),before=db[key].length;db[key]=merge(db[key],arr,x=>x.id||norm(x.word||x.en||x.title||x.prompt));added+=db[key].length-before}catch(e){if(key==='vocab')throw e}}db.lastRemoteVersion=ver;save();render();toast(added?'Đã cập nhật '+added+' mục từ GitHub':'Đã kiểm tra: không có dữ liệu mới')}catch(e){if(force)toast('Cập nhật lỗi: '+e.message)}}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)db={...db,...x,stats:{...db.stats,...x.stats},profile:{...db.profile,...x.profile}}}catch{}}
function show(v){view=v;render()}
function shell(t,s=''){return '<div class="card hero"><h1 class="title">'+t+'</h1><p class="muted">'+s+'</p></div>'}
function render(){document.querySelectorAll('aside button').forEach(b=>b.classList.remove('active'));$('streak').textContent=db.stats.streak||0;({home,vocab,sentences,flashcards,quiz,listening,speaking,grammar,communication,trilingual,review,stats,settings}[view]||home)();document.body.classList.toggle('dark',db.profile.theme==='dark')}
function home(){$('view').innerHTML=shell('English Master V4','Học – Luyện – Nhớ – Cải thiện')+'<div class="grid"><div class="card"><div class="big">'+db.vocab.length+'</div><div class="muted">Từ vựng</div></div><div class="card"><div class="big">'+db.sentences.length+'</div><div class="muted">Câu học tập</div></div><div class="card"><div class="big">'+db.questions.length+'</div><div class="muted">Câu trắc nghiệm</div></div></div><div class="card"><h2>Học nhanh</h2><div class="actions"><button class="primary" onclick="show(\'flashcards\')">🃏 Flashcards</button><button onclick="show(\'speaking\')">🎙️ Phát âm</button><button onclick="show(\'listening\')">🎧 Luyện nghe</button><button onclick="show(\'quiz\')">🧠 Trắc nghiệm</button></div></div>'}
function vocab(){const a=db.vocab.slice(0,200);$('view').innerHTML=shell('Học từ vựng','500+ từ có IPA, nghĩa và ví dụ.')+'<div class="card"><input id="vs" placeholder="Tìm từ..." oninput="filterV()"></div><div id="vlist" class="list">'+a.map(v=>'<div class="item"><div class="row"><div style="flex:1"><b class="word">'+esc(v.word)+'</b> <span class="ipa">'+esc(v.ipa||'')+'</span><p>'+esc(v.meaning)+'</p><span class="muted small">'+esc(v.example||'')+'</span></div><button onclick="speak(\''+String(v.word).replace(/'/g,"\\'")+'\')">🔊</button></div></div>').join('')+'</div>'}
function filterV(){const q=norm($('vs').value),a=db.vocab.filter(v=>norm(v.word).includes(q)||norm(v.meaning).includes(q)).slice(0,200);$('vlist').innerHTML=a.map(v=>'<div class="item"><b class="word">'+esc(v.word)+'</b> <span class="ipa">'+esc(v.ipa||'')+'</span><p>'+esc(v.meaning)+'</p><button onclick="speak(\''+String(v.word).replace(/'/g,"\\'")+'\')">🔊 Nghe</button></div>').join('')}
function sentences(){$('view').innerHTML=shell('Học câu','Câu mẫu được lấy trực tiếp từ bộ dữ liệu online.')+'<div class="list">'+db.sentences.slice(0,200).map(s=>'<div class="item"><b>'+esc(s.en)+'</b><p class="muted">'+esc(s.vi)+'</p><span class="badge">'+esc(s.topic||'daily')+'</span> <button onclick="speak(\''+String(s.en).replace(/'/g,"\\'")+'\')">🔊</button></div>').join('')+'</div>'}
function flashcards(){if(!db.vocab.length){$('view').innerHTML=shell('Flashcards','Chưa có từ vựng.');return}const v=db.vocab[flashIndex%db.vocab.length];$('view').innerHTML=shell('Flashcards','Bấm vào thẻ để lật. Sau đó tự đánh giá mức nhớ.')+'<div class="card flash" onclick="flashFlipped=!flashFlipped;flashcards()">'+(flashFlipped?'<div><div class="big">'+esc(v.meaning)+'</div><p>'+esc(v.example||'')+'</p><p class="muted">'+esc(v.exampleVi||'')+'</p><button onclick="event.stopPropagation();speak(\''+String(v.word).replace(/'/g,"\\'")+'\')">🔊 Nghe từ</button></div>':'<div><div class="big">'+esc(v.word)+'</div><div class="ipa">'+esc(v.ipa||'')+'</div><p class="muted">Bấm để lật thẻ</p></div>')+'</div><div class="actions"><button onclick="rate(0)">😵 Chưa nhớ</button><button onclick="rate(1)">🙂 Đã nhớ</button><button onclick="rate(2)">😎 Rất dễ</button><button onclick="shuffle()">🔀 Ngẫu nhiên</button></div><p class="muted">Thẻ '+(flashIndex%db.vocab.length+1)+' / '+db.vocab.length+'</p>'}
function rate(){db.stats.learned++;db.stats.xp+=5;flashIndex=(flashIndex+1)%db.vocab.length;flashFlipped=false;save();render()}function shuffle(){flashIndex=Math.floor(Math.random()*db.vocab.length);flashFlipped=false;render()}
function speaking(){if(!db.sentences.length){$('view').innerHTML=shell('Phát âm','Chưa có câu luyện nói.');return}const s=db.sentences[speakIndex%db.sentences.length],v=db.vocab.find(x=>norm(x.word)===norm(s.vocabWord));$('view').innerHTML=shell('Luyện phát âm','Luyện theo từng câu; trình duyệt sẽ nhận diện giọng nói nếu hỗ trợ.')+'<div class="card"><span class="badge">'+esc(s.topic||'daily')+'</span><h2>'+esc(s.en)+'</h2><p class="muted">'+esc(s.vi)+'</p><div class="hint"><b>Từ trọng tâm:</b> '+esc(s.vocabWord||'')+' <span class="ipa">'+esc(v?.ipa||'')+'</span></div><div class="actions" style="margin-top:15px"><button class="primary" onclick="speak(\''+String(s.en).replace(/'/g,"\\'")+'\')">🔊 Nghe mẫu</button><button onclick="speak(\''+String(s.vocabWord||'').replace(/'/g,"\\'")+'\')">🔊 Nghe từ</button><button onclick="recognize()">🎙️ Bắt đầu nói</button><button onclick="prevSpeak()">← Trước</button><button onclick="nextSpeak()">Tiếp →</button></div><div id="speech" class="hint" style="margin-top:15px">Hãy nghe mẫu rồi nói lại.</div></div><div class="grid"><div class="card"><div class="big">'+(speakIndex%db.sentences.length+1)+'</div><div class="muted">Câu luyện nói</div></div><div class="card"><div class="big">'+db.sentences.length+'</div><div class="muted">Tổng câu</div></div><div class="card"><div class="big">IPA</div><div class="muted">'+esc(v?.ipa||'')+'</div></div></div>'}
function nextSpeak(){speakIndex=(speakIndex+1)%db.sentences.length;render()}function prevSpeak(){speakIndex=(speakIndex-1+db.sentences.length)%db.sentences.length;render()}
function recognize(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast('Trình duyệt chưa hỗ trợ nhận diện giọng nói');return}const target=db.sentences[speakIndex%db.sentences.length].en,r=new R();r.lang='en-US';r.interimResults=false;r.onresult=e=>{const got=e.results[0][0].transcript,a=norm(got).split(' '),b=norm(target).split(' '),same=a.filter(x=>b.includes(x)).length,score=Math.round(same/Math.max(a.length,b.length)*100);$('speech').innerHTML='<b>Bạn nói:</b> '+esc(got)+'<br><b>Mức khớp:</b> '+score+'%';if(score>=80){db.stats.xp+=10;save()}};r.onerror=()=>toast('Không nhận được giọng nói');r.start()}
function listening(){if(!db.sentences.length){$('view').innerHTML=shell('Luyện nghe','Chưa có câu.');return}const s=db.sentences[listenIndex%db.sentences.length],opts=[s.vi,...db.sentences.filter(x=>x.id!==s.id).slice(0,3).map(x=>x.vi)].filter(Boolean);$('view').innerHTML=shell('Luyện nghe','Nghe câu rồi chọn nghĩa tiếng Việt.')+'<div class="card"><h2>🔊 Nghe câu</h2><button class="primary" onclick="speak(\''+String(s.en).replace(/'/g,"\\'")+'\',0.75)">0.75×</button> <button onclick="speak(\''+String(s.en).replace(/'/g,"\\'")+'\')">1×</button> <button onclick="speak(\''+String(s.en).replace(/'/g,"\\'")+'\',1.25)">1.25×</button><div class="options" style="margin-top:18px">'+opts.map(o=>'<button class="option" onclick="listenAnswer(this,\''+String(o).replace(/'/g,"\\'")+'\',\''+String(s.vi).replace(/'/g,"\\'")+'\')">'+esc(o)+'</button>').join('')+'</div><div id="lres" class="hint" style="margin-top:15px">Chọn đáp án.</div></div>'}
function listenAnswer(el,o,c){document.querySelectorAll('.option').forEach(x=>x.disabled=true);const ok=norm(o)===norm(c);el.classList.add(ok?'correct':'wrong');$('lres').textContent=ok?'✓ Chính xác':'✗ Đáp án: '+c;db.stats.answered++;if(ok){db.stats.correct++;db.stats.xp+=10}listenIndex=(listenIndex+1)%db.sentences.length;save()}
function quiz(){if(!db.questions.length){$('view').innerHTML=shell('Trắc nghiệm','Chưa có câu hỏi.');return}const q=db.questions[quizIndex%db.questions.length];$('view').innerHTML=shell('Trắc nghiệm','Chọn một đáp án.')+'<div class="card"><span class="badge">'+esc(q.topic||'daily')+'</span><h2>'+esc(q.prompt)+'</h2><div class="options">'+(q.options||[]).map((o,i)=>'<button class="option" onclick="answerQuiz('+i+','+Number(q.answer)+')">'+esc(o)+'</button>').join('')+'</div><div id="qres" class="hint" style="margin-top:15px">Câu '+(quizIndex+1)+' / '+db.questions.length+'</div></div>'}
function answerQuiz(i,a){if(quizAnswered)return;quizAnswered=true;const ok=i===a;db.stats.answered++;if(ok){db.stats.correct++;db.stats.xp+=10}document.querySelectorAll('.option').forEach((b,j)=>{b.disabled=true;if(j===a)b.classList.add('correct');if(j===i&&!ok)b.classList.add('wrong')});$('qres').innerHTML=(ok?'✓ Chính xác':'✗ Chưa đúng')+' — <button onclick="nextQuiz()">Câu tiếp →</button>';save()}
function nextQuiz(){quizIndex=(quizIndex+1)%db.questions.length;quizAnswered=false;render()}
function grammar(){$('view').innerHTML=shell('Ngữ pháp','Các bài ngữ pháp được đồng bộ từ GitHub.')+'<div class="list">'+db.grammar.map(g=>'<div class="card"><h2>'+esc(g.title)+'</h2><span class="badge">'+esc(g.level||'Beginner')+'</span><p>'+esc(g.explain||'')+'</p><div class="hint">'+esc(g.formula||'')+'</div><h4>Ví dụ</h4>'+((g.examples||[]).map(x=>'<div>• '+esc(x)+'</div>').join(''))+'</div>').join('')+'</div>'}
function communication(){$('view').innerHTML=shell('Giao tiếp','Các chủ đề giao tiếp thực tế.')+'<div class="list">'+db.communication.map(c=>'<div class="card"><h2>'+esc(c.title)+'</h2>'+((c.lines||[]).map(x=>'<p><b>'+esc(x[0])+':</b> '+esc(x[1])+'</p>').join(''))+'</div>').join('')+'</div>'}
function trilingual(){$('view').innerHTML=shell('Tam ngữ','Anh – Trung – Việt.')+(db.trilingual.length?'<div class="list">'+db.trilingual.map(x=>'<div class="item"><b>'+esc(x.en)+'</b><p>'+esc(x.chinese||x.zh||'')+' '+esc(x.pinyin||'')+'</p><p>'+esc(x.vi||x.vietnamese||'')+'</p></div>').join('')+'</div>':'<div class="card">Server hiện chưa có <code>trilingual.json</code>. Chức năng đã sẵn sàng.</div>')}
function review(){$('view').innerHTML=shell('Ôn tập','Ôn lại toàn bộ kho từ bằng Flashcards.')+'<div class="card"><div class="big">'+db.vocab.length+'</div><p class="muted">Từ có thể ôn</p><button class="primary" onclick="show(\'flashcards\')">Bắt đầu ôn</button></div>'}
function stats(){const acc=db.stats.answered?Math.round(db.stats.correct/db.stats.answered*100):0;$('view').innerHTML=shell('Tiến độ','Theo dõi kết quả học tập.')+'<div class="grid"><div class="card"><div class="big">'+db.stats.xp+'</div><div class="muted">XP</div></div><div class="card"><div class="big">'+db.stats.learned+'</div><div class="muted">Từ đã học</div></div><div class="card"><div class="big">'+acc+'%</div><div class="muted">Độ chính xác</div></div></div>'}
function settings(){const au=db.profile.autoUpdate!==false?'selected':'';const off=db.profile.autoUpdate===false?'selected':'';$('view').innerHTML=shell('Cài đặt','Cập nhật nội dung tự động và giao diện.')+'<div class="card"><h2>☁️ Cập nhật GitHub</h2><p class="muted">Nguồn: <code>'+DATA_URL+'</code></p><p>Phiên bản nội dung đã nhận: <b>'+esc(db.lastRemoteVersion||'chưa có')+'</b></p><button class="primary" onclick="updateOnline(true)">🔄 Kiểm tra cập nhật ngay</button><label style="margin-top:18px">Tự động cập nhật khi mở app</label><select onchange="db.profile.autoUpdate=this.value===\'1\';save()"><option value="1" '+au+'>Bật</option><option value="0" '+off+'>Tắt</option></select></div><div class="card"><h2>Giao diện</h2><button onclick="db.profile.theme=db.profile.theme===\'dark\'?\'light\':\'dark\';save();render()">◐ Đổi Light/Dark</button></div>'}
$('theme').onclick=()=>{db.profile.theme=db.profile.theme==='dark'?'light':'dark';save();render()};load();render();setTimeout(()=>{if(db.profile.autoUpdate!==false)updateOnline(false)},700);


// ===== V4.1 FIXES: richer examples, audio everywhere, safe remote refresh =====
function speak(text, rate=1, lang="en-US"){
  if(!("speechSynthesis" in window)){toast("Trình duyệt không hỗ trợ phát giọng nói.");return}
  const value=String(text??"").trim(); if(!value)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(value); u.lang=lang; u.rate=Number(rate)||1;
  const voices=speechSynthesis.getVoices?speechSynthesis.getVoices():[];
  const p=String(lang).toLowerCase();
  u.voice=voices.find(v=>String(v.lang||"").toLowerCase()===p)||voices.find(v=>String(v.lang||"").toLowerCase().startsWith(p.split("-")[0]))||null;
  speechSynthesis.speak(u);
}
function audioBtn(text,label="🔊 Nghe",lang="en-US",rate=1){
  return "<button class=\"btn btn-secondary\" onclick=\"event.stopPropagation();speak('"+escapeJs(text)+"',"+Number(rate)+",'"+lang+"')\">"+label+"</button>";
}
function playDialogue(text){speak(text,0.92,"en-US")}

function vocab(){
  const q=localStorage.getItem("em_search")||"";
  let list=db.vocab;
  if(q)list=list.filter(v=>(v.word+" "+v.meaning+" "+v.example).toLowerCase().includes(q.toLowerCase()));
  document.getElementById("view").innerHTML=shell("Học từ vựng","Từ mới có IPA, ví dụ đa dạng và nghe riêng cho từ và câu.")+
  "<div class=\"card\"><div class=\"toolbar\"><input id=\"vSearch\" class=\"input\" placeholder=\"Tìm từ...\" value=\""+esc(q)+"\" onkeydown=\"if(event.key==='Enter')doVocabSearch()\"><button class=\"btn btn-secondary\" onclick=\"doVocabSearch()\">🔎 Tìm</button><button class=\"btn btn-primary\" onclick=\"setView('flashcards')\">🃏 Flashcards</button></div></div>"+
  "<div class=\"card\"><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th><th>Nghe</th></tr></thead><tbody>"+
  list.map(v=>"<tr><td><div class=\"word\">"+esc(v.word)+"</div><div class=\"ipa\">"+esc(v.ipa||"")+"</div></td><td>"+esc(v.meaning)+"<div class=\"small muted\">"+esc(v.pos||"")+"</div></td><td>"+esc(v.example||"")+"<div class=\"small muted\">"+esc(v.exampleVi||"")+"</div></td><td><div class=\"actions\">"+audioBtn(v.word,"🔊 Từ")+audioBtn(v.example||v.word,"🔊 Câu")+"</div></td></tr>").join("")+
  "</tbody></table></div></div>";
}
function sentences(){
  document.getElementById("view").innerHTML=shell("Học câu","Câu được viết theo ngữ cảnh thay vì lặp mẫu “I learned the word…”.")+
  "<div class=\"grid grid-2\">"+db.sentences.map(s=>"<div class=\"card\"><div class=\"toolbar\"><span class=\"badge\">"+esc(s.topic||"daily")+"</span><span class=\"muted small\">"+esc(s.grammar||"")+"</span></div><h3>"+esc(s.en)+"</h3><p class=\"muted\">"+esc(s.vi||"")+"</p><div class=\"actions\">"+audioBtn(s.en,"🔊 Nghe")+"<button class=\"btn btn-secondary\" onclick=\"speak('"+escapeJs(s.en)+"',0.75)\">🐢 Chậm</button><button class=\"btn btn-secondary\" onclick=\"toggleFavSentence('"+s.id+"')\">"+(s.favorite?"⭐":"☆")+" Lưu</button></div></div>").join("")+"</div>";
}
function flashcards(){
  if(!db.vocab.length){document.getElementById("view").innerHTML=shell("Flashcards","Chưa có dữ liệu.");return}
  const v=db.vocab[flashIndex%db.vocab.length];
  const front="<div class=\"flash-face\"><div class=\"big-word\">"+esc(v.word)+"</div><div class=\"ipa\">"+esc(v.ipa||"")+"</div><div class=\"actions\" style=\"justify-content:center\">"+audioBtn(v.word,"🔊 Nghe từ")+"</div><p class=\"muted\">Bấm thẻ để lật</p></div>";
  const back="<div class=\"flash-face flash-back\"><div class=\"big-word\" style=\"font-size:31px\">"+esc(v.meaning)+"</div><div class=\"ipa\">"+esc(v.pos||"")+"</div><p class=\"example\">"+esc(v.example||"")+"</p><p class=\"muted\">"+esc(v.exampleVi||"")+"</p><div class=\"actions\" style=\"justify-content:center\">"+audioBtn(v.word,"🔊 Từ")+audioBtn(v.example||v.word,"🔊 Ví dụ")+"</div></div>";
  document.getElementById("view").innerHTML=shell("Flashcards","Nghe từ ngay mặt trước, nghe ví dụ ở mặt sau.")+
  "<div class=\"card\"><div class=\"toolbar\"><strong>"+(flashIndex%db.vocab.length+1)+" / "+db.vocab.length+"</strong><button class=\"btn btn-secondary\" onclick=\"shuffleFlash()\">🔀 Ngẫu nhiên</button></div><div class=\"flashcard "+(flashFlipped?"flipped":"")+"\" onclick=\"flashFlipped=!flashFlipped;renderFlashcards()\"><div class=\"flash-inner\">"+front+back+"</div></div><div class=\"rating\"><button onclick=\"event.stopPropagation();rateFlash('Chưa nhớ')\">😵 Chưa nhớ</button><button onclick=\"event.stopPropagation();rateFlash('Đã nhớ')\">🙂 Đã nhớ</button><button onclick=\"event.stopPropagation();rateFlash('Rất dễ')\">😎 Rất dễ</button></div></div>";
}
function renderListening(){
  if(!db.sentences.length){document.getElementById("view").innerHTML=shell("Luyện nghe","Chưa có dữ liệu.");return}
  const s=db.sentences[listenIndex%db.sentences.length], choices=[s.vi,...shuffle(db.sentences.filter(x=>x.id!==s.id)).slice(0,3).map(x=>x.vi)];
  const showText=window.__showListeningText===true;
  document.getElementById("view").innerHTML=shell("Luyện nghe","Nghe chậm, chuẩn, nhanh; nghe lại và chọn nghĩa.")+
  "<div class=\"card\"><div class=\"toolbar\"><span class=\"badge\">"+esc(s.topic||"daily")+"</span><span class=\"muted\">Câu "+(listenIndex%db.sentences.length+1)+"/"+db.sentences.length+"</span></div><div class=\"actions\" style=\"margin:14px 0\"><button class=\"btn btn-primary\" onclick=\"speak('"+escapeJs(s.en)+"',0.75)\">🐢 0.75×</button><button class=\"btn btn-secondary\" onclick=\"speak('"+escapeJs(s.en)+"',1)\">▶ 1×</button><button class=\"btn btn-secondary\" onclick=\"speak('"+escapeJs(s.en)+"',1.25)\">🐇 1.25×</button><button class=\"btn btn-secondary\" onclick=\"speak('"+escapeJs(s.en)+"',1)\">🔁 Nghe lại</button><button class=\"btn btn-secondary\" onclick=\"window.__showListeningText=!window.__showListeningText;renderListening()\">👁 "+(showText?"Ẩn câu":"Hiện câu")+"</button></div>"+
  (showText?"<div class=\"hint\"><strong>"+esc(s.en)+"</strong><br><span class=\"muted\">"+esc(s.vi||"")+"</span></div>":"")+
  "<h3 style=\"margin-top:18px\">Nghe & chọn nghĩa</h3><div class=\"options\">"+choices.map(o=>"<button class=\"option\" onclick=\"listenCheck(this,'"+escapeJs(o)+"','"+escapeJs(s.vi)+"')\">"+esc(o)+"</button>").join("")+"</div><div id=\"listenResult\" class=\"hint\" style=\"margin-top:14px\">Hãy nghe rồi chọn đáp án.</div></div>";
}
function listenCheck(el,selected,correct){
  const ok=normText(selected)===normText(correct);document.querySelectorAll(".option").forEach(b=>b.disabled=true);el.classList.add(ok?"correct":"wrong");
  document.getElementById("listenResult").innerHTML=ok?"✓ Chính xác!":"✗ Chưa đúng. Đáp án: <strong>"+esc(correct)+"</strong>";
  db.stats.answered=(db.stats.answered||0)+1;if(ok){db.stats.correct=(db.stats.correct||0)+1;addXP(10)}save();
  setTimeout(()=>{listenIndex=(listenIndex+1)%db.sentences.length;window.__showListeningText=false;renderListening()},650);
}
function normText(s){return String(s??"").trim().toLowerCase().replace(/\s+/g," ")}
function renderSpeaking(){
  if(!db.sentences.length){document.getElementById("view").innerHTML=shell("Phát âm","Chưa có câu.");return}
  const s=db.sentences[speakIndex%db.sentences.length],v=db.vocab.find(x=>normText(x.word)===normText(s.vocabWord||""));
  document.getElementById("view").innerHTML=shell("Luyện phát âm","Luyện theo toàn bộ câu; có nghe mẫu, nghe chậm, nghe từ và microphone.")+
  "<div class=\"card\"><div class=\"toolbar\"><span class=\"badge\">"+esc(s.topic||"daily")+"</span><span class=\"muted\">Câu "+(speakIndex%db.sentences.length+1)+"/"+db.sentences.length+"</span></div><h2>"+esc(s.en)+"</h2><p class=\"muted\">"+esc(s.vi||"")+"</p><div class=\"hint\"><b>Từ trọng tâm:</b> "+esc(s.vocabWord||"")+" <span class=\"ipa\">"+esc(v?.ipa||"")+"</span></div><div class=\"actions\" style=\"margin-top:14px\"><button class=\"btn btn-primary\" onclick=\"speak('"+escapeJs(s.en)+"',1)\">🔊 Nghe mẫu</button><button class=\"btn btn-secondary\" onclick=\"speak('"+escapeJs(s.en)+"',0.75)\">🐢 Nghe chậm</button>"+(s.vocabWord?audioBtn(s.vocabWord,"🔊 Nghe từ"):"")+"<button class=\"btn btn-primary\" onclick=\"startRecognitionEnhanced()\">🎙️ Bắt đầu nói</button><button class=\"btn btn-secondary\" onclick=\"prevSpeakEnhanced()\">← Trước</button><button class=\"btn btn-secondary\" onclick=\"nextSpeakEnhanced()\">Tiếp →</button></div><div id=\"speechResult\" class=\"hint\" style=\"margin-top:14px\">Nghe mẫu rồi nói lại.</div></div>";
}
function nextSpeakEnhanced(){speakIndex=(speakIndex+1)%db.sentences.length;renderSpeaking()}
function prevSpeakEnhanced(){speakIndex=(speakIndex-1+db.sentences.length)%db.sentences.length;renderSpeaking()}
function startRecognitionEnhanced(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast("Chrome/Edge thường hỗ trợ microphone tốt hơn.");return}
  const s=db.sentences[speakIndex%db.sentences.length],r=new SR(),out=document.getElementById("speechResult");r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;if(out)out.textContent="🎙️ Đang nghe...";
  r.onresult=e=>{const heard=e.results[0][0].transcript,score=similarityScoreEnhanced(heard,s.en);if(out)out.innerHTML="<b>Bạn nói:</b> "+esc(heard)+"<br><b>Mức khớp câu:</b> "+score+"%<br><span class=\"muted\">Đây là độ khớp văn bản, không phải điểm phát âm chuyên môn.</span>";if(score>=80){db.stats.xp=(db.stats.xp||0)+10;save()}};
  r.onerror=()=>toast("Không nhận được giọng nói. Hãy kiểm tra quyền microphone.");r.start();
}
function similarityScoreEnhanced(a,b){
  const A=normText(a).replace(/[.!?,]/g,"").split(" ").filter(Boolean),B=normText(b).replace(/[.!?,]/g,"").split(" ").filter(Boolean);if(!A.length||!B.length)return 0;let hit=0;const used=new Set();
  for(const x of A){const j=B.findIndex((y,i)=>!used.has(i)&&x===y);if(j>=0){hit++;used.add(j)}}return Math.round(hit/Math.max(A.length,B.length)*100);
}
function renderGrammar(){
  document.getElementById("view").innerHTML=shell("Ngữ pháp","Mỗi ví dụ đều có nghe để bạn vừa nhìn vừa đọc theo.")+
  "<div class=\"grid grid-2\">"+db.grammar.map(g=>"<div class=\"card\"><span class=\"badge\">"+esc(g.level||"Beginner")+"</span><h3>"+esc(g.title)+"</h3><div class=\"hint\"><strong>Công thức:</strong> "+esc(g.formula||"")+"</div><p>"+esc(g.explain||"")+"</p><h4>Ví dụ</h4><div class=\"list\">"+(g.examples||[]).map(e=>"<div class=\"item\">"+esc(e)+" "+audioBtn(e,"🔊 Nghe")+"</div>").join("")+"</div><p class=\"muted small\"><strong>Lưu ý:</strong> "+esc(g.notes||"")+"</p></div>").join("")+"</div>";
}
function renderCommunication(){
  document.getElementById("view").innerHTML=shell("Giao tiếp","Nghe từng câu hoặc nghe cả đoạn để luyện phản xạ.")+
  "<div class=\"grid grid-2\">"+db.communication.map(c=>"<div class=\"card\"><span class=\"badge\">"+esc(c.topic||"")+"</span><h3>"+esc(c.title||"")+"</h3><div class=\"list\">"+(c.lines||[]).map(l=>"<div class=\"item\"><strong>"+esc(l[0])+"</strong> — "+esc(l[1])+"<div class=\"actions\" style=\"margin-top:7px\">"+audioBtn(l[1],"🔊 Nghe")+"</div></div>").join("")+"</div><div class=\"actions\" style=\"margin-top:12px\"><button class=\"btn btn-primary\" onclick=\"playDialogue('"+escapeJs((c.lines||[]).map(l=>l[1]).join(" "))+"')\">▶ Nghe cả đoạn</button></div></div>").join("")+"</div>";
}
function renderTrilingual(){
  document.getElementById("view").innerHTML=shell("Tam ngữ Anh – Trung – Việt","Nghe từng ngôn ngữ bằng giọng đọc tương ứng.")+
  "<div class=\"card\"><div class=\"table-wrap\"><table class=\"table\"><thead><tr><th>English</th><th>中文</th><th>Tiếng Việt</th><th>Nghe</th></tr></thead><tbody>"+
  db.trilingual.map(x=>"<tr><td>"+esc(x.en)+"</td><td>"+esc(x.zh||x.chinese||"")+"</td><td>"+esc(x.vi||"")+"</td><td><div class=\"actions\">"+audioBtn(x.en,"🇺🇸","en-US")+audioBtn(x.zh||x.chinese||"","🇨🇳","zh-CN")+audioBtn(x.vi||"","🇻🇳","vi-VN")+"</div></td></tr>").join("")+
  "</tbody></table></div></div>";
}
function renderQuiz(){
  if(!db.questions.length){document.getElementById("view").innerHTML=shell("Trắc nghiệm","Chưa có câu hỏi.");return}
  const q=db.questions[quizIndex%db.questions.length];
  document.getElementById("view").innerHTML=shell("Trắc nghiệm","Nghe câu hỏi và từng đáp án trước khi chọn.")+
  "<div class=\"card\"><div class=\"toolbar\"><span class=\"badge\">"+esc(q.topic||"daily")+"</span><span class=\"muted\">Câu "+(quizIndex%db.questions.length+1)+"/"+db.questions.length+"</span></div><div class=\"actions\" style=\"margin:12px 0\">"+audioBtn(q.prompt,"🔊 Đọc câu hỏi")+"</div><h2>"+esc(q.prompt)+"</h2><div class=\"options\">"+
  (q.options||[]).map((o,i)=>"<div class=\"row\"><button class=\"option\" style=\"flex:1\" onclick=\"answerQuizEnhanced("+i+","+Number(q.answer)+")\">"+String.fromCharCode(65+i)+". "+esc(o)+"</button>"+audioBtn(o,"🔊")+"</div>").join("")+
  "</div><div id=\"qres\" class=\"hint\" style=\"margin-top:14px\">Chọn đáp án.</div></div>";
}
function answerQuizEnhanced(i,a){
  const q=db.questions[quizIndex%db.questions.length],ok=i===a;document.querySelectorAll(".option").forEach(b=>b.disabled=true);db.stats.answered=(db.stats.answered||0)+1;if(ok){db.stats.correct=(db.stats.correct||0)+1;addXP(10)}document.querySelectorAll(".option").forEach((b,j)=>{if(j===a)b.classList.add("correct");if(j===i&&!ok)b.classList.add("wrong")});const el=document.getElementById("qres");if(el)el.innerHTML=(ok?"✓ Chính xác!":"✗ Chưa đúng.")+"<br>"+esc(q.explain||"")+"<div class=\"actions\" style=\"margin-top:10px\"><button class=\"btn btn-primary\" onclick=\"quizIndex=(quizIndex+1)%db.questions.length;renderQuiz()\">Câu tiếp →</button></div>";save();
}
async function updateOnline(force=false){
  try{
    const m=await getJSON(DATA_URL),ver=String(m.version??"").trim();if(!ver)throw Error("version.json thiếu version");
    const should=force||String(db.lastRemoteVersion||"")!==ver||db.vocab.some(v=>/^I learned the word/i.test(String(v.example||"")));
    if(!should){toast("Dữ liệu đang mới nhất.");return}
    const files=m.files||{},paths={vocabulary:files.vocabulary||"vocabulary.json",sentences:files.sentences||"sentences.json",questions:files.questions||"questions.json",grammar:files.grammar||"grammar.json",communication:files.communication||"communication.json",trilingual:files.trilingual||"trilingual.json"};
    let added=0,changed=0;
    for(const key of Object.keys(paths)){
      try{
        const raw=await getJSON(DATA_URL.replace(/\/[^/]+$/,"/"+paths[key])),incoming=Array.isArray(raw)?raw:(Array.isArray(raw[key])?raw[key]:[]),arr=db[key]||[];
        if(key==="vocabulary"){
          for(const x of incoming){
            const idx=db.vocab.findIndex(v=>normText(v.word)===normText(x.word));
            if(idx<0){db.vocab.push({...x,source:"remote",sourceVersion:ver,favorite:false,status:"New",reviewDue:null});added++}
            else if(/^I learned the word/i.test(String(db.vocab[idx].example||""))||db.vocab[idx].source==="remote"){const old=db.vocab[idx];db.vocab[idx]={...old,...x,source:"remote",sourceVersion:ver,favorite:old.favorite,status:old.status,reviewDue:old.reviewDue};changed++}
          }
        }else{
          const keyFn=key==="questions"?x=>normText(x.prompt):key==="grammar"?x=>normText(x.title):key==="communication"?x=>normText(x.title):key==="trilingual"?x=>normText(x.en)+"|"+normText(x.zh||x.chinese):x=>String(x.id||normText(x.en));
          for(const x of incoming){
            const idx=arr.findIndex(y=>keyFn(y)===keyFn(x)),item={...x,source:"remote",sourceVersion:ver};
            if(idx<0){arr.push(item);added++}
            else if(key==="sentences"&&(/^I learned the word/i.test(String(arr[idx].en||""))||arr[idx].source==="remote")){const old=arr[idx];arr[idx]={...old,...item,favorite:old.favorite};changed++}
          }
          db[key]=arr;
        }
      }catch(e){if(key==="vocabulary")throw e}
    }
    db.lastRemoteVersion=ver;save();render();toast("Đã đồng bộ: +"+added+" mới, sửa "+changed+" mục.");
  }catch(e){toast("Cập nhật lỗi: "+(e.message||e))}
}
window.startRecognitionEnhanced=startRecognitionEnhanced;window.nextSpeakEnhanced=nextSpeakEnhanced;window.prevSpeakEnhanced=prevSpeakEnhanced;window.listenCheck=listenCheck;window.answerQuizEnhanced=answerQuizEnhanced;window.playDialogue=playDialogue;
setTimeout(()=>{try{render()}catch{}},50);


// ===== V4.1 final polish =====
function review(){
  const due=db.vocab.filter(v=>v.reviewDue&&new Date(v.reviewDue)<=new Date()), hard=db.vocab.filter(v=>v.status==="Review"||v.status==="Chưa nhớ"||v.status==="New");
  document.getElementById("view").innerHTML=shell("Ôn tập thông minh","Ưu tiên từ đến hạn và từ bạn chưa nhớ; mọi mục đều có nút nghe.","<div class=\"grid\"><div class=\"card\"><div class=\"big\">"+due.length+"</div><div class=\"muted\">Đến hạn</div></div><div class=\"card\"><div class=\"big\">"+hard.length+"</div><div class=\"muted\">Cần củng cố</div></div><div class=\"card\"><div class=\"big\">"+db.vocab.filter(v=>v.status===\"Rất dễ\").length+"</div><div class=\"muted\">Đã nhớ tốt</div></div></div><div class=\"card\"><div class=\"actions\"><button class=\"primary\" onclick=\"setView('flashcards')\">🃏 Ôn bằng Flashcards</button></div><div class=\"list\" style=\"margin-top:14px\">"+[...due,...hard.filter(v=>!due.includes(v))].slice(0,20).map(v=>"<div class=\"item\"><div class=\"row\"><div style=\"flex:1\"><b>"+esc(v.word)+"</b> <span class=\"ipa\">"+esc(v.ipa||"")+"</span><div class=\"muted\">"+esc(v.meaning)+"</div></div>"+audioBtn(v.word,"🔊 Từ")+audioBtn(v.example||v.word,"🔊 Câu")+"</div></div>").join("")+"</div></div>");
}
function settings(){
  document.getElementById("view").innerHTML=shell("Cài đặt","Tự động cập nhật, giọng đọc và dữ liệu cá nhân.")+
  "<div class=\"card\"><h2>☁️ Cập nhật nội dung</h2><p class=\"muted\">Nguồn: <code>"+DATA_URL+"</code></p><p>Phiên bản nội dung đã nhận: <b>"+esc(db.lastRemoteVersion||"chưa có")+"</b></p><div class=\"actions\"><button class=\"btn primary\" onclick=\"updateOnline(true)\">🔄 Kiểm tra cập nhật</button><button class=\"btn\" onclick=\"speak('This is an audio test.',1,'en-US')\">🔊 Kiểm tra âm thanh</button></div><p class=\"small muted\" style=\"margin-top:12px\">Server hỗ trợ: vocabulary.json · sentences.json · questions.json · grammar.json · communication.json · trilingual.json</p></div>"+
  "<div class=\"card\"><h2>🔊 Giọng đọc</h2><label>Tốc độ</label><select onchange=\"db.profile.speechRate=Number(this.value);save()\">"+[0.5,0.75,1,1.25,1.5].map(x=>"<option value=\""+x+"\" "+(Number(db.profile.speechRate||1)===x?"selected":"")+">"+x+"×</option>").join("")+"</select></div>"+
  "<div class=\"card\"><h2>🌙 Giao diện</h2><button class=\"btn\" onclick=\"db.profile.theme=db.profile.theme==='dark'?'light':'dark';save();render()\">Đổi Light / Dark</button></div>";
}
setTimeout(()=>{try{render()}catch{}},80);
