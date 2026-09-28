#!/usr/bin/env python3
import bz2,csv,hashlib,json,os,re,subprocess,sys,time,urllib.parse,urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"
VERSION="8.1.0"; SOURCE="expansion500_v2"; NEED=500
UA="English-Master-500V2/4.0"
MYMEMORY="https://api.mymemory.translated.net/get"
TTS="https://dict.minhqnd.com/api/v1/tts"

def R(n): return json.loads((DATA/n).read_text(encoding="utf-8"))
def W(n,x): (DATA/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def norm(s): return re.sub(r"\s+"," ",str(s or "").strip().lower())
def get_bytes(url,timeout=240):
    req=urllib.request.Request(url,headers={"User-Agent":UA})
    with urllib.request.urlopen(req,timeout=timeout) as r: return r.read()
def get_text(url,timeout=240): return get_bytes(url,timeout).decode("utf-8")
def tts(text,lang): return TTS+"?word="+urllib.parse.quote(str(text))+"&lang="+lang

vocab=[x for x in R("vocabulary.json") if x.get("source")!=SOURCE]
sentences=[x for x in R("sentences.json") if x.get("source")!=SOURCE]
questions=[x for x in R("questions.json") if x.get("source")!=SOURCE]
grammar=[x for x in R("grammar.json") if x.get("source")!=SOURCE]
communication=[x for x in R("communication.json") if x.get("source")!=SOURCE]
tri=[x for x in R("trilingual.json") if x.get("source")!=SOURCE]
used={norm(v.get("word")) for v in vocab}; used|={norm(v.get("en")) for v in tri}

# HSK 2-6
hsk={}
for level in (2,3,4,5,6):
    raw=get_text(f"https://raw.githubusercontent.com/plaktos/hsk_csv/master/hsk{level}.csv")
    for row in csv.reader(raw.splitlines()):
        if len(row)<3: continue
        zh,py,gloss=row[0].strip(),row[1].strip(),",".join(row[2:]).strip()
        word=re.sub(r"^to\s+","",gloss,flags=re.I); word=re.sub(r"^(?:a|an)\s+","",word,flags=re.I).strip().lower()
        if zh and py and re.fullmatch(r"[a-z]+",word) and 3<=len(word)<=15 and word not in used:
            hsk.setdefault(word,{"word":word,"zh":zh,"pinyin":py,"gloss":gloss,"hsk":level})
print("HSK candidates:",len(hsk))

# CMUdict -> IPA
try: import cmudict
except ImportError:
    subprocess.check_call([sys.executable,"-m","pip","install","-q","cmudict"]); import cmudict
CMU=cmudict.dict()
MAP={"AA":"ɑ","AE":"æ","AH":"ʌ","AO":"ɔ","AW":"aʊ","AY":"aɪ","EH":"ɛ","ER":"ɝ","EY":"eɪ","IH":"ɪ","IY":"i","OW":"oʊ","OY":"ɔɪ","UH":"ʊ","UW":"u","B":"b","CH":"tʃ","D":"d","DH":"ð","F":"f","G":"ɡ","HH":"h","JH":"dʒ","K":"k","L":"l","M":"m","N":"n","NG":"ŋ","P":"p","R":"r","S":"s","SH":"ʃ","T":"t","TH":"θ","V":"v","W":"w","Y":"j","Z":"z","ZH":"ʒ"}
def ipa(w):
    p=CMU.get(w.lower())
    if not p: return ""
    out=[]; stressed=False
    for ph in p[0]:
        m=re.fullmatch(r"([A-Z]+)([012]?)",ph)
        if not m: continue
        v=MAP.get(m.group(1))
        if not v: continue
        if m.group(2)=="1" and not stressed: out.append("ˈ"); stressed=True
        elif m.group(2)=="2": out.append("ˌ")
        out.append(v)
    return "/"+"" .join(out)+"/" if out else ""

def translate(text):
    q=urllib.parse.urlencode({"q":str(text),"langpair":"en|vi"})
    for a in range(3):
        try:
            req=urllib.request.Request(MYMEMORY+"?"+q,headers={"User-Agent":UA})
            with urllib.request.urlopen(req,timeout=20) as r: d=json.loads(r.read().decode("utf-8"))
            v=str((d.get("responseData") or {}).get("translatedText") or "").strip()
            if v and "MYMEMORY WARNING" not in v.upper(): return v
        except Exception: pass
        time.sleep(.4*(a+1))
    return ""

candidates=[x for x in hsk.values() if ipa(x["word"])]
candidates.sort(key=lambda x:(x["hsk"],len(x["word"]),x["word"]))
def enrich(x):
    v=translate(x["gloss"])
    return None if not v else {**x,"ipa":ipa(x["word"]),"meaningVi":v}
with ThreadPoolExecutor(max_workers=8) as pool:
    enriched=[x for x in pool.map(enrich,candidates) if x]
print("IPA+VI candidates:",len(enriched))
if len(enriched)<NEED: raise SystemExit("Not enough words with IPA and Vietnamese meaning")

# Official Tatoeba English export. English examples are real corpus sentences.
# Vietnamese is taken from a direct Tatoeba link when available, otherwise translated
# only after the English sentence has been selected.
ENG_SENT_URL="https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2"
VIE_SENT_URL="https://downloads.tatoeba.org/exports/per_language/vie/vie_sentences.tsv.bz2"
ENG_VIE_LINK_URL="https://downloads.tatoeba.org/exports/per_language/eng/eng-vie_links.tsv.bz2"
GOOGLE="https://translate.googleapis.com/translate_a/single"

raw_eng=bz2.decompress(get_bytes(ENG_SENT_URL)).decode("utf-8")
raw_links=bz2.decompress(get_bytes(ENG_VIE_LINK_URL)).decode("utf-8")
raw_vie=bz2.decompress(get_bytes(VIE_SENT_URL)).decode("utf-8")

names={"Tom","Mary","John","Muiriel","Ken","Jack","Bob","Jane","Mike","Alice","Paul","Tony","Lucy","Maria","Anna","Emily","Jim","Kate","Sami","Layla","Dan","Linda","Bill","Taro","Hanako","Yanni"}
bad=[
re.compile(r"^(?:The|A|An) (?:room|house|chair|table|book|dictionary|homework|question|answer|company|career|station|airport|mountain|river|bicycle|office|meeting|manager|client|desk|computer|phone|window|door) (?:looks?|is|was|seems?) (?:very )?(?:sad|happy|angry|excited|nervous|tired|lonely|worried|afraid|jealous|proud|surprised|calm|friendly|serious|careful|rich|sure|offline|cloudy|snowy|local|short|sweet)\b",re.I),
re.compile(r"^I'?m practicing\b",re.I),
re.compile(r"^I noticed (?:youth|iron|steel) this morning\.$",re.I),
re.compile(r"^I saw aspect on my way home\.$",re.I),
re.compile(r"^They properly use the app\.$",re.I),
re.compile(r"^The (?:road|tennis) is useful in daily life\.$",re.I),
re.compile(r"^The new plan is (?:funny|same|dry) for us\.$",re.I),
re.compile(r"^The situation is primary right now\.$",re.I),
re.compile(r"^This plan is immediate\.$",re.I)
]
def usable(s):
    toks=s.split()
    if not 4<=len(toks)<=16 or not re.search(r"[.!?]$",s): return False
    for i,t in enumerate(toks):
        c=t.strip(".,!?;:\"'()")
        if c in names and i>0: return False
        if i>0 and c and c[0].isupper() and c not in {"I","I'm","I've","I'll","I'd"}: return False
    return not any(rx.search(s) for rx in bad)

# Direct Tatoeba EN->VI links, used whenever present.
vie_by_id={}
for line in raw_vie.splitlines():
    p=line.split("\t")
    if len(p)>=3:
        sid,vi_text=p[0].strip(),p[-1].strip()
    elif len(p)==2:
        sid,vi_text=p[0].strip(),p[1].strip()
    else:
        continue
    if sid and vi_text:
        vie_by_id[sid]=vi_text

links_by_eng={}
for line in raw_links.splitlines():
    p=line.split("\t")
    if len(p)>=2:
        links_by_eng.setdefault(p[0].strip(),[]).append(p[1].strip())

targets={x["word"] for x in enriched}
eng_rows=[]
for line in raw_eng.splitlines():
    p=line.split("\t")
    if len(p)>=3:
        sid,en=p[0].strip(),p[-1].strip()
    elif len(p)==2:
        sid,en=p[0].strip(),p[1].strip()
    else:
        continue
    if not usable(en): continue
    hit=targets.intersection(set(re.findall(r"[a-z]+",en.lower())))
    if not hit: continue
    direct_vi=next((vie_by_id.get(tid,"").strip() for tid in links_by_eng.get(sid,[]) if vie_by_id.get(tid,"").strip()),"")
    eng_rows.append((sid,en,hit,direct_vi))
# Short, unique, ordinary sentences first.
eng_rows.sort(key=lambda x:(0 if x[3] else 1,len(x[1].split()),x[0]))
enriched_by_word={x["word"]:x for x in enriched}
chosen=[]; seen=set()
for sid,en,hit,direct_vi in eng_rows:
    for w in sorted(hit):
        if w in used or w in {x["word"] for x in chosen}: continue
        k=norm(en)
        if k in seen: continue
        seen.add(k)
        base=enriched_by_word.get(w)
        if not base: continue
        chosen.append({**base,"example":en,"exampleId":sid,"exampleVi":direct_vi})
        break
    if len(chosen)>=NEED: break

print("Tatoeba real English coverage:",len(chosen))
if len(chosen)<NEED:
    raise SystemExit(f"Only {len(chosen)} words have real Tatoeba English examples; expected {NEED}.")

def translate_google(text):
    q=urllib.parse.urlencode({"client":"gtx","sl":"en","tl":"vi","dt":"t","q":str(text)})
    for a in range(3):
        try:
            req=urllib.request.Request(GOOGLE+"?"+q,headers={"User-Agent":UA})
            with urllib.request.urlopen(req,timeout=20) as r:
                d=json.loads(r.read().decode("utf-8"))
            if isinstance(d,list) and d and isinstance(d[0],list):
                v="".join(str(part[0]) for part in d[0] if part and part[0]).strip()
                if v: return v
        except Exception: pass
        if a<2: time.sleep(.5*(a+1))
    return ""

def fill_vietnamese(row):
    if row.get("exampleVi"):
        return row
    vi=translate(row["example"])
    if not vi:
        vi=translate_google(row["example"])
    return None if not vi else {**row,"exampleVi":vi}

with ThreadPoolExecutor(max_workers=8) as pool:
    translated=[x for x in pool.map(fill_vietnamese,chosen) if x]
print("Selected examples with Vietnamese:",len(translated))
if len(translated)<NEED:
    raise SystemExit(f"Only {len(translated)} selected examples have Vietnamese translations; expected {NEED}.")
chosen=translated[:NEED]

def topic(w):
    groups={"school":["school","student","teacher","class","lesson","exam","homework","college","university","study","education","library","research","degree"],"work":["job","work","office","company","boss","manager","worker","meeting","business","career","project","report","salary","department","factory","customer"],"travel":["travel","trip","airport","station","train","bus","taxi","hotel","passport","flight","tour","journey","ticket","tourist","map","road"],"food":["food","meal","breakfast","lunch","dinner","restaurant","menu","bread","rice","noodle","soup","cake","fruit","vegetable","drink","taste"],"health":["health","doctor","hospital","medicine","exercise","ill","sick","fever","pain","body","heart","head","stomach","sleep"],"home":["home","house","room","kitchen","bathroom","door","window","table","chair","bed","family","parent","child","neighbor"],"shopping":["shop","shopping","buy","sell","price","cheap","expensive","market","store","clothes","shirt","shoe","size","discount"],"technology":["computer","phone","internet","email","screen","keyboard","software","technology","machine","online","website","video","camera"],"weather":["weather","rain","snow","wind","storm","cloud","sun","summer","winter","spring","autumn","temperature"],"feelings":["happy","sad","angry","afraid","worry","hope","love","hate","excited","tired","quiet","nervous","surprise","fear"],"city":["city","street","building","park","station","bridge","traffic","car","road","town","village","country"],"nature":["tree","flower","animal","river","mountain","forest","earth","land","sea","water","fire","air"]}
    for k,vals in groups.items():
        if any(v in w.lower() for v in vals): return k
    return "daily"

new_vocab=[]; new_sentences=[]; new_tri=[]
for i,x in enumerate(chosen,1):
    tp=topic(x["word"]); level="Beginner" if x["hsk"]<=3 else ("Intermediate" if x["hsk"]==4 else "Upper-Intermediate")
    hid=hashlib.sha1(x["word"].encode()).hexdigest()[:10]; ref=f"tatoeba:eng#{x['exampleId']}"
    new_vocab.append({"id":f"exp500v2_{i:03d}_{hid}","word":x["word"],"ipa":x["ipa"],"meaning":x["meaningVi"],"pos":"word","example":x["example"],"exampleVi":x["exampleVi"],"synonyms":"","antonyms":"","topic":tp,"level":level,"favorite":False,"status":"New","reviewDue":None,"createdAt":"2026-09-28T00:00:00.000Z","audio":"tts","audioEn":tts(x["word"],"en"),"source":SOURCE,"sourceVersion":VERSION,"sourceRef":ref,"hsk":x["hsk"]})
    new_sentences.append({"id":f"exp500v2_sent_{i:03d}_{hid}","en":x["example"],"vi":x["exampleVi"],"topic":tp,"grammar":"Everyday English","audioEn":tts(x["example"],"en"),"favorite":False,"source":SOURCE,"sourceVersion":VERSION,"sourceRef":ref})
    new_tri.append({"id":f"exp500v2_tri_{i:03d}_{hid}","en":x["word"],"zh":x["zh"],"pinyin":x["pinyin"],"vi":x["meaningVi"],"topic":tp,"level":level,"audio":"tts","audioEn":tts(x["word"],"en"),"audioZh":tts(x["zh"],"zh"),"audioVi":tts(x["meaningVi"],"vi"),"source":SOURCE,"sourceVersion":VERSION})

new_questions=[]
all_meanings=[]; new_meaning={norm(v["meaning"]):v["meaning"] for v in new_vocab}; all_words=[v["word"] for v in vocab+new_vocab]
for i,v in enumerate(new_vocab,1):
    correct=v["meaning"]; ds=[]
    for old in vocab:
        m=str(old.get("meaning") or "").strip()
        if m and norm(m)!=norm(correct) and norm(m) not in {norm(d) for d in ds}: ds.append(m)
        if len(ds)==3: break
    if len(ds)<3: raise SystemExit("Meaning distractors unavailable")
    opts=[correct]+ds; shift=(i*5)%4; opts=opts[shift:]+opts[:shift]
    new_questions.append({"id":f"exp500v2_qm_{i:03d}_{hashlib.sha1(v['word'].encode()).hexdigest()[:10]}","type":"multiple","prompt":f'"{v["word"]}" nghĩa là gì?',"options":opts,"answer":opts.index(correct),"explain":f'{v["word"]} = {correct}.',"topic":v["topic"],"level":v["level"],"vocabWord":v["word"],"audio":"tts","audioEn":tts(v["word"],"en"),"source":SOURCE,"sourceVersion":VERSION})
    word_opts=[v["word"]]
    for w in all_words:
        if norm(w)!=norm(v["word"]) and norm(w) not in {norm(z) for z in word_opts}: word_opts.append(w)
        if len(word_opts)==4: break
    if len(word_opts)<4: raise SystemExit("Word distractors unavailable")
    shift=(i*3)%4; word_opts=word_opts[shift:]+word_opts[:shift]
    blank=re.sub(r"\b"+re.escape(v["word"])+r"\b","_____",v["example"],count=1,flags=re.I)
    new_questions.append({"id":f"exp500v2_qc_{i:03d}_{hashlib.sha1(v['word'].encode()).hexdigest()[:10]}","type":"multiple","prompt":blank,"options":word_opts,"answer":word_opts.index(v["word"]),"explain":f'Từ phù hợp là "{v["word"]}".',"topic":v["topic"],"level":v["level"],"vocabWord":v["word"],"audio":"tts","audioEn":tts(blank,"en"),"source":SOURCE,"sourceVersion":VERSION})

new_comm=[]
for st in range(0,500,5):
    g=new_vocab[st:st+5]; lines=[]
    for v in g:
        lines += [["A","I found a useful word while reading today.","Tôi gặp một từ hữu ích khi đọc hôm nay."],["B","Where did you see it?","Bạn thấy nó ở đâu?"],["A",v["example"],v["exampleVi"]],["B","The context makes the meaning easier to remember.","Ngữ cảnh giúp nhớ nghĩa dễ hơn."]]
    new_comm.append({"id":f"exp500v2_comm_{st//5+1:03d}","title":f"Luyện giao tiếp từ mới {st//5+1:03d}","topic":g[0]["topic"],"vocab":[v["word"] for v in g],"lines":lines,"source":SOURCE,"sourceVersion":VERSION})

new_grammar=[]
for st in range(0,500,25):
    g=new_vocab[st:st+25]
    new_grammar.append({"id":f"exp500v2_grammar_{st//25+1:02d}","title":f"Ngữ pháp qua câu thật — {g[0]['topic']}","level":"Beginner–Intermediate","formula":"Real sentence + target word in context","explain":"Đọc câu thật, nghe câu và nói lại câu để ghi nhớ cách dùng trong ngữ cảnh.","examples":[v["example"] for v in g],"notes":"Câu tiếng Anh từ Tatoeba.","vocabWords":[v["word"] for v in g],"source":SOURCE,"sourceVersion":VERSION})

# Full pre-commit validation.
assert len(new_vocab)==500 and len({norm(v["word"]) for v in new_vocab})==500
assert all(v["ipa"] and v["meaning"] and v["example"] and v["exampleVi"] and v["audioEn"] for v in new_vocab)
assert len(new_sentences)==500 and len({norm(s["en"]) for s in new_sentences})==500 and all(not s.get("vocabWord") for s in new_sentences)
assert len(new_questions)==1000 and all(len(q["options"])==4 and len({norm(z) for z in q["options"]})==4 and q["options"][q["answer"]] for q in new_questions)
assert len(new_tri)==500 and all(t["en"] and t["zh"] and t["pinyin"] and t["vi"] and t["audioEn"] and t["audioZh"] and t["audioVi"] for t in new_tri)
assert len(new_comm)==100 and all(len(d["lines"])==20 for d in new_comm)
assert len(new_grammar)==20 and all(len(g["examples"])==25 and len(g["vocabWords"])==25 for g in new_grammar)

W("vocabulary.json",vocab+new_vocab); W("sentences.json",sentences+new_sentences); W("questions.json",questions+new_questions)
W("trilingual.json",tri+new_tri); W("communication.json",communication+new_comm); W("grammar.json",grammar+new_grammar)
W("expansion500_v2.json",{"package":SOURCE,"version":VERSION,"count":500,"attribution":"Example sentences from Tatoeba (tatoeba.org), CC BY 2.0 FR.","ipaSource":"CMUdict (Carnegie Mellon University).","words":[{"word":new_vocab[i]["word"],"vocabId":new_vocab[i]["id"],"sentenceId":new_sentences[i]["id"],"questionIds":[new_questions[i*2]["id"],new_questions[i*2+1]["id"]],"trilingualId":new_tri[i]["id"],"communicationId":new_comm[i//5]["id"],"grammarId":new_grammar[i//25]["id"]} for i in range(500)]})
W("version.json",{"version":VERSION,"updatedAt":"2026-09-28","releaseNotes":"V8.1.0: thêm 500 từ mới; câu tiếng Anh lấy từ Tatoeba, có IPA, nghĩa Việt, nghe, đọc, nói, quiz, ôn tập, tam ngữ, giao tiếp và ngữ pháp.","files":{"vocabulary":"vocabulary.json","sentences":"sentences.json","questions":"questions.json","grammar":"grammar.json","communication":"communication.json","trilingual":"trilingual.json"},"expansion":{"package":SOURCE,"count":500}})

app=ROOT/"app.js"; txt=app.read_text(encoding="utf-8"); txt=re.sub(r'^const APP_VERSION="[^"]+";',f'const APP_VERSION="{VERSION}";',txt,count=1,flags=re.M); app.write_text(txt,encoding="utf-8")
(ROOT/"app-version.json").write_text(json.dumps({"version":VERSION,"updatedAt":"2026-09-28"},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
idx=ROOT/"index.html"; html=idx.read_text(encoding="utf-8")
html=re.sub(r'<meta name="application-version" content="[^"]+">',f'<meta name="application-version" content="{VERSION}">',html)
html=re.sub(r'<title>English Master V[^<]+</title>',f'<title>English Master V{VERSION}</title>',html)
html=re.sub(r'<script src="app\.js\?v=[^"]+"',f'<script src="app.js?v={VERSION}"',html)
html=re.sub(r'<strong>English Master <small>V[^<]+</small>',f'<strong>English Master <small>V{VERSION}</small>',html)
idx.write_text(html,encoding="utf-8")
sw=ROOT/"sw.js"; sws=sw.read_text(encoding="utf-8"); sws=re.sub(r'CACHE_NAME="[^"]+"',f'CACHE_NAME="english-master-v{VERSION}-layout-switch"',sws,count=1); sws=re.sub(r'app\.js\?v=[0-9.]+',f'app.js?v={VERSION}',sws); sw.write_text(sws,encoding="utf-8")
manifest=ROOT/"manifest.json"; m=json.loads(manifest.read_text(encoding="utf-8")); m["name"]="English Master V"+VERSION; manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"PASS":True,"newWords":500,"sentences":500,"questions":1000,"trilingual":500,"communication":100,"grammar":20},ensure_ascii=False))
