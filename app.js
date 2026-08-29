
(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const cats=window.TAHADDI_CATEGORIES||[], targets=window.TAHADDI_TARGETS||{};
let selected=[], state={team1:"الفريق الأول",team2:"الفريق الثاني",score1:0,score2:0,opened:0,total:36,current:null,timer:null,time:30,audio:null};
const screens={start:$("#startScreen"),cats:$("#categoryScreen"),game:$("#gameScreen"),finish:$("#finishScreen")};

function show(name){Object.values(screens).forEach(x=>x.classList.remove("active"));screens[name].classList.add("active");scrollTo({top:0,behavior:"smooth"})}
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function beep(freq=520,dur=.08,type="sine",vol=.035){try{const A=window.AudioContext||window.webkitAudioContext;window._ac=window._ac||new A();const ac=window._ac,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+dur);o.stop(ac.currentTime+dur)}catch{}}
let bgOn=false,bgTimer=null;
function toggleBg(){bgOn=!bgOn;$("#soundToggle").textContent=bgOn?"♫ ON":"♫"; if(bgOn){startBg();toast("موسيقى الخلفية شغالة")} else {clearInterval(bgTimer);toast("تم إيقاف الموسيقى")}}
function startBg(){clearInterval(bgTimer);let i=0,notes=[220,277,330,415,330,277,247,294];bgTimer=setInterval(()=>{if(bgOn){beep(notes[i++%notes.length],.22,"triangle",.012)}},360)}

const typeLabel=t=>({place:"أماكن وصور",music:"مقاطع أغاني",musicmix:"مقاطع أغاني",visual:"صور وتخمين",quiz:"معلومات",puzzle:"ألغاز",emoji:"خمن الكلمة"}[t]||"تحدي");
function renderCats(){
 const q=$("#categorySearch").value.trim().toLowerCase(), f=$("#typeFilter").value, grid=$("#categoryGrid"); grid.innerHTML="";
 cats.filter(c=>(!f||c.type===f)&&(!q||c.name.toLowerCase().includes(q))).forEach(c=>{
  const b=document.createElement("button");b.className="category"+(selected.includes(c.name)?" selected":"");b.innerHTML=`<strong>${c.name}</strong><small>${typeLabel(c.type)}</small>`;
  b.onclick=()=>{if(selected.includes(c.name))selected=selected.filter(x=>x!==c.name);else{if(selected.length>=6){toast("اختار 6 فئات فقط");return}selected.push(c.name)} updateCount();renderCats()};grid.appendChild(b)
 }); updateCount()
}
function updateCount(){$("#selectedCount").textContent=selected.length;$("#startGame").disabled=selected.length!==6}

$("#toCategories").onclick=()=>{state.team1=$("#team1").value.trim()||"الفريق الأول";state.team2=$("#team2").value.trim()||"الفريق الثاني";renderCats();show("cats")}
$("#categorySearch").oninput=renderCats;$("#typeFilter").onchange=renderCats;$("#soundToggle").onclick=toggleBg;

function pointsFor(i){return i<2?200:i<4?400:600}
function buildBoard(){
 state.score1=state.score2=state.opened=0;state.total=36;$("#score1").textContent=$("#score2").textContent=0;$("#team1Label").textContent=state.team1;$("#team2Label").textContent=state.team2;$("#progressText").textContent="0 / 36";
 const board=$("#board");board.innerHTML="";
 selected.forEach(name=>{const c=cats.find(x=>x.name===name),col=document.createElement("div");col.className="board-col";const h=document.createElement("div");h.className="board-head";h.textContent=name;col.appendChild(h);
  for(let i=0;i<6;i++){const b=document.createElement("button");b.className="qbtn";b.textContent=pointsFor(i);b.onclick=()=>openQuestion(c,i,b);col.appendChild(b)}board.appendChild(col)
 })
}
$("#startGame").onclick=()=>{show("game");buildBoard();}
function safeKey(s){return "tahaddi_used_"+encodeURIComponent(s)}
function readUsed(cat){try{return JSON.parse(localStorage.getItem(safeKey(cat))||"[]")}catch{return[]}}
function saveUsed(cat,arr){try{localStorage.setItem(safeKey(cat),JSON.stringify(arr.slice(-80)))}catch{}}
function chooseUnseen(cat,pool){
 let used=readUsed(cat), avail=pool.map((x,i)=>i).filter(i=>!used.includes(i));
 if(!avail.length){used=[];avail=pool.map((x,i)=>i)}
 const i=avail[Math.floor(Math.random()*avail.length)];used.push(i);saveUsed(cat,used);return {item:pool[i],index:i}
}

function hideMedia(){$("#loader").hidden=false;$("#qImage").hidden=true;$("#audioBox").hidden=true;$("#emojiBox").hidden=true;$("#qImage").src=""; if(state.audio){state.audio.pause();state.audio=null}}
async function commonsImage(query){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url =
      "https://commons.wikimedia.org/w/api.php" +
      "?action=query" +
      "&generator=search" +
      "&gsrsearch=" + encodeURIComponent('"' + query + '"') +
      "&gsrnamespace=6" +
      "&gsrlimit=10" +
      "&prop=imageinfo" +
      "&iiprop=url" +
      "&iiurlwidth=1200" +
      "&format=json" +
      "&origin=*";

    const r = await fetch(url, { signal: controller.signal });
    const j = await r.json();

    const pages = Object.values(j.query?.pages || {}).filter(p => {
      const url = p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url || "";
      return url && !url.toLowerCase().endsWith(".svg");
    });

    if (!pages.length) throw new Error("no image");

    return pages[0].imageinfo[0].thumburl ||
           pages[0].imageinfo[0].url;

  } finally {
    clearTimeout(timeout);
  }
}

async function setImage(query){
  const loader = $("#loader");
  const img = $("#qImage");

  loader.hidden = false;
  img.hidden = true;

  try {
    const url = await commonsImage(query);

    img.onload = () => {
      loader.hidden = true;
      img.hidden = false;
    };

    img.onerror = () => {
      loader.hidden = true;
      img.hidden = true;
    };

    img.src = url;

    setTimeout(() => {
      loader.hidden = true;
    }, 6000);

  } catch(e) {
    loader.hidden = true;
    img.hidden = true;
  }
}async function itunesTracks(query){
 const url=`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=40&country=ae`;
 const r=await fetch(url);const j=await r.json();return (j.results||[]).filter(x=>x.previewUrl&&x.trackName)
}
async function prepareMusic(c){
 $("#qText").textContent="اسمع المقطع وخمّن اسم الأغنية";
 try{
  const tracks=await itunesTracks(c.query);if(!tracks.length)throw new Error();
  const used=readUsed(c.name+"_audio"), avail=tracks.filter(t=>!used.includes(t.trackId));const pool=avail.length?avail:tracks;const t=pool[Math.floor(Math.random()*pool.length)];
  saveUsed(c.name+"_audio",[...(avail.length?used:[]),t.trackId]);state.current.answer=t.trackName;state.current.preview=t.previewUrl;state.current.artist=t.artistName;
  $("#loader").hidden=true;$("#audioBox").hidden=false;$("#playPreview").onclick=()=>{if(!state.audio){state.audio=new Audio(t.previewUrl);state.audio.volume=.9}state.audio.currentTime=0;state.audio.play().catch(()=>toast("المتصفح منع التشغيل، اضغط مرة ثانية"))}
 }catch{
  $("#loader").hidden=true;$("#audioBox").hidden=false;$("#playPreview").disabled=true;$("#playPreview").textContent="المقطع غير متاح حالياً";
  state.current.answer="جرّب سؤالاً آخر";$("#qText").textContent="المعاينة الصوتية غير متاحة لهذا السؤال حالياً";
 }
}

const genericQuiz={
"صح أو خطأ":[["المشتري أكبر كوكب في المجموعة الشمسية.","صح"],["المحيط الأطلسي أكبر من الهادئ.","خطأ"],["الذهب رمزه الكيميائي Au.","صح"],["كانبرا عاصمة أستراليا.","صح"],["عدد قارات العالم ثمانٍ.","خطأ"],["الصقر الشاهين من أسرع الطيور.","صح"],["الإنسان يملك ثلاث رئات.","خطأ"],["اليابان تقع في آسيا.","صح"]],
"السيرة النبوية":[["في أي مدينة وُلد النبي محمد ﷺ؟","مكة المكرمة"],["إلى أي مدينة كانت الهجرة؟","المدينة المنورة"],["ما اسم الغار الذي نزل فيه الوحي أول مرة؟","غار حراء"],["ما اسم أول زوجات النبي ﷺ؟","خديجة بنت خويلد رضي الله عنها"],["ما اسم عم النبي ﷺ الذي كفله بعد جده؟","أبو طالب"],["ما القبيلة التي ينتمي إليها النبي ﷺ؟","قريش"]],
"تحدي السرعة":[["كم يساوي 12 × 8؟","96"],["اذكر دولة تبدأ بحرف الميم.","مثال: مصر / المغرب"],["كم ثانية في الدقيقة؟","60"],["ما عكس كلمة سريع؟","بطيء"],["كم يساوي نصف 250؟","125"],["اذكر ثلاثة ألوان أساسية بسرعة.","أحمر، أزرق، أصفر"]]
};

function genericPool(c){
 if(targets[c.name])return targets[c.name];
 if(genericQuiz[c.name])return genericQuiz[c.name];
 return [
  [`ما الشيء الأشهر الذي يرتبط بفئة «${c.name}»؟`,`إجابة تعتمد على معرفة الفئة`],
  [`اذكر معلومة صحيحة عن «${c.name}».`,`أي معلومة صحيحة متفق عليها`],
  [`اذكر مثالاً معروفاً من فئة «${c.name}».`,`أي مثال صحيح`],
  [`ما الذي يميز «${c.name}» عن الفئات القريبة منها؟`,`إجابة صحيحة ومبررة`],
  [`اذكر اسماً أو مصطلحاً مشهوراً مرتبطاً بـ «${c.name}».`,`أي اسم صحيح`],
  [`تحدي سرعة: اذكر شيئين مرتبطين بـ «${c.name}».`,`أي إجابتين صحيحتين`],
  [`تحدي صعب: اذكر ثلاثة أشياء مرتبطة بـ «${c.name}».`,`أي ثلاث إجابات صحيحة`],
  [`صح أو خطأ: «${c.name}» من الفئات الموجودة في هذه اللعبة.`,`صح`]
 ]
}

async function openQuestion(c,idx,btn){
 if(btn.classList.contains("used"))return;hideMedia();state.current={cat:c,btn,value:pointsFor(idx),answer:"",preview:null};$("#qCategory").textContent=c.name;$("#qValue").textContent=state.current.value+" نقطة";$("#answerBox").hidden=true;$("#answerBox").textContent="";$("#qText").textContent="جاري تجهيز السؤال...";$("#modal").classList.add("open");$("#modal").setAttribute("aria-hidden","false");startTimer();
 if(c.type==="music"||c.type==="musicmix"){await prepareMusic(c);return}
 const pool=genericPool(c), chosen=chooseUnseen(c.name,pool), item=chosen.item;
 if(c.type==="emoji"){
  $("#loader").hidden=true;$("#emojiBox").hidden=false;$("#emojiBox").textContent=item[0];$("#qText").textContent="خمن الكلمة أو العبارة";state.current.answer=item[1];return
 }
 if(c.type==="puzzle"||c.type==="quiz"){
  $("#loader").hidden=true;$("#emojiBox").hidden=false;$("#emojiBox").textContent=c.type==="puzzle"?"🧩":"🧠";$("#qText").textContent=item[0];state.current.answer=item[1];return
 }
 if(c.type==="place" && targets[c.name]){
  $("#qText").textContent="ما اسم هذا المكان أو المعلم؟";state.current.answer=item[0];await setImage(item[1]);return
 }
 // visual fallback: use Wikimedia title as answer
 try{
  const search=c.query||c.name;const api=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(search)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`;
  const r=await fetch(api),j=await r.json(),pages=Object.values(j.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.thumburl||p.imageinfo?.[0]?.url);
  const used=readUsed(c.name+"_img"), avail=pages.filter(p=>!used.includes(p.pageid)), arr=avail.length?avail:pages, p=arr[Math.floor(Math.random()*arr.length)];
  if(!p)throw 0;saveUsed(c.name+"_img",[...(avail.length?used:[]),p.pageid]);let ans=(p.title||"").replace(/^File:/,"").replace(/\.[^.]+$/,"").replace(/[_-]/g," ");
  state.current.answer=ans;$("#qText").textContent="ما الشيء أو الاسم الظاهر في الصورة؟";$("#qImage").src=p.imageinfo[0].thumburl||p.imageinfo[0].url;$("#qImage").onload=()=>{$("#loader").hidden=true;$("#qImage").hidden=false}
 }catch{
  $("#loader").hidden=true;$("#emojiBox").hidden=false;$("#emojiBox").textContent="🎯";$("#qText").textContent=item[0];state.current.answer=item[1]
 }
}

function startTimer(){clearInterval(state.timer);state.time=30;$("#timer").textContent=30;$("#timerBar").style.width="100%";state.timer=setInterval(()=>{state.time--;$("#timer").textContent=state.time;$("#timerBar").style.width=(state.time/30*100)+"%";if(state.time<=5&&state.time>0)beep(720,.05,"square",.025);if(state.time<=0){clearInterval(state.timer);beep(180,.25,"sawtooth",.03)}},1000)}
$("#showAnswer").onclick=()=>{if(!state.current)return;$("#answerBox").textContent=state.current.answer;$("#answerBox").hidden=false;beep(640,.1)}
function finishQuestion(team){
 if(!state.current)return;if(state.audio){state.audio.pause();state.audio=null}
 clearInterval(state.timer);const {btn,value}=state.current;if(!btn.classList.contains("used")){btn.classList.add("used");state.opened++}
 if(team===1){state.score1+=value;$("#score1").textContent=state.score1;beep(880,.16,"triangle",.05)}
 if(team===2){state.score2+=value;$("#score2").textContent=state.score2;beep(880,.16,"triangle",.05)}
 $("#progressText").textContent=state.opened+" / "+state.total;$("#modal").classList.remove("open");$("#modal").setAttribute("aria-hidden","true");state.current=null;
 if(state.opened>=state.total)setTimeout(endGame,400)
}
$("#award1").onclick=()=>finishQuestion(1);$("#award2").onclick=()=>finishQuestion(2);$("#nobody").onclick=()=>finishQuestion(0);
function updateAwardNames(){$("#award1Name").textContent=state.team1;$("#award2Name").textContent=state.team2}
function endGame(){show("finish");$("#finalTeam1").textContent=state.team1;$("#finalTeam2").textContent=state.team2;$("#finalScore1").textContent=state.score1;$("#finalScore2").textContent=state.score2;
 let w=state.score1===state.score2?"تعادل قوي!":state.score1>state.score2?state.team1+" يفوز!":state.team2+" يفوز!";$("#winnerTitle").textContent=w;$("#winnerText").textContent=`النتيجة النهائية ${state.score1} — ${state.score2}`;beep(1040,.3,"triangle",.06)}
$("#restart").onclick=()=>{selected=[];updateCount();show("start")};
const oldToCats=$("#toCategories").onclick;$("#toCategories").onclick=()=>{oldToCats();updateAwardNames()}
renderCats();
})();
