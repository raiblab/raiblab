/* RAIB Lab 홈페이지 — 연구실 중심, 로그인 없이 모두 공개. 데이터는 Supabase */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const fmt=ts=>{if(!ts)return"";const d=new Date(ts);return isNaN(d)?String(ts):d.getFullYear()+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0")};
const nz=v=>(v===""||v==null)?null:v;
const num=v=>(v===""||v==null||isNaN(Number(v)))?null:Number(v);
const lines=v=>Array.isArray(v)?v.filter(Boolean):String(v||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const url=u=>/^https?:\/\//i.test(String(u||""))?u:"";

/* ---------- Supabase 연결 ---------- */
const CFG=window.RAIB_CONFIG||{};
const ready=CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/YOUR_/.test(CFG.SUPABASE_URL)&&window.supabase;
const sb=ready?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const BUCKET="photos";
const NEED_SQL="데이터베이스 업데이트가 아직 안 되었습니다. Supabase SQL Editor에서 update-2026-11-renewal.sql 을 실행한 뒤 다시 저장해 주세요.";

/* ---------- 메뉴 ---------- */
const MENU=[["members","Members"],["alumni","Alumni"],["publications","Publications"],["projects","Projects"],["news","News"],["community","Community"],["admissions","Admissions"]];
const VIEWS=["home"].concat(MENU.map(m=>m[0]));
/* 예전 주소(#research 등)로 들어와도 맞는 메뉴로 */
const OLD={research:"publications",officers:"members",conference:"news",golf:"community",edu:"community",greeting:"home",chair:"home",intro:"home"};

/* ---------- 기본 내용 (관리자가 화면에서 바꾸면 DB 값이 우선) ---------- */
const PROF_DEFAULT={name:"전해정",title:"교수",aff:"상명대학교 대학원 부동산학과",photo:"images/prof-jeon.jpg",
  fields:["부동산시장 분석","주택시장","빅데이터","인공지능(AI)","데이터 애널리틱스"],
  bio:[],edu:[],email:"",scholar:"https://scholar.google.com/citations?hl=ko&user=MlYd81sAAAAJ"};
const GRAD_GUIDE="https://www.smu.ac.kr/grad/admission/guideline.do";
const ADM_DEFAULT={
  intro:"레이브랩은 빅데이터와 인공지능으로 부동산시장과 주택시장을 연구하고 싶은 대학원생을 환영합니다. 데이터 분석 경험이 많지 않아도 괜찮습니다. 세미나와 공동연구를 통해 함께 배워 갑니다.",
  steps:["공식 모집요강에서 상명대학교 대학원 부동산학과 박사과정 모집 일정과 지원 자격을 확인합니다.","지원 전에 지도교수에게 이메일로 연구 관심 분야와 간단한 이력을 보내 상담을 요청합니다.","대학원 입학 전형(서류·면접)에 지원합니다.","입학 후 연구실 세미나와 공동연구에 참여합니다."],
  contactName:"",contactEmail:"",contactPhone:"",
  office:"상명대학교 대학원교학팀 02-2287-5030",guide:GRAD_GUIDE};
const GOLF_DEFAULT={info:""};
const INTRO="레이브랩(RAIB Lab)은 빅데이터와 인공지능을 활용하여 부동산시장과 주택시장을 연구합니다. 데이터에 기반한 분석과 열린 토론을 통해 함께 배우고 성장합니다.";

/* ---------- 글 종류 ---------- */
const NEWS_KINDS=["학술대회 발표","논문 게재","수상","학위","출간","기타"];
const COMM_KINDS=["연구실 모임","졸업 축하","친목행사","교류 활동"];
const FORMS={
  pub:{board:"research",name:"논문",fixed:{kind:"학술지 논문"},fields:[["title","논문 제목","text",null,true],["authors","저자 (쉼표로 구분, 예: 홍길동, 전해정)","text"],["venue","학술지","text"],["year","연도","number"],["link","DOI 또는 논문 링크","text"]]},
  proj:{board:"research",name:"연구과제",fixed:{kind:"공동연구과제"},fields:[["title","연구 제목","text",null,true],["status","진행 상태","select",["진행 중","완료"]],["period","기간 (예: 2025.03 – 2026.02)","text"],["year","시작 연도","number"],["authors","참여자","text"],["venue","발주·지원기관 (선택)","text"],["body","간단한 설명","textarea"]]},
  news:{board:"news",name:"소식",photo:true,fields:[["kind","구분","select",NEWS_KINDS],["title","제목","text",null,true],["date","날짜","date"],["body","짧은 설명 (한두 문장)","textarea"],["link","관련 링크 (선택)","url"]]},
  golf:{board:"golf",name:"골프회 사진",photo:true,fields:[["title","제목","text",null,true],["date","날짜","date"],["body","짧은 설명 (한 문장)","textarea"]]},
  community:{board:"community",name:"교류 활동 사진",photo:true,fields:[["kind","구분","select",COMM_KINDS],["title","제목","text",null,true],["date","날짜","date"],["body","짧은 설명 (한 문장)","textarea"]]}
};
const formOf=p=>p.board==="research"?(p.kind==="공동연구과제"?"proj":"pub"):p.board==="golf"?"golf":p.board==="community"?"community":"news";

/* ---------- 상태 ---------- */
const S={popups:[],popupsOk:false,posts:[],pages:{},officers:[],members:[],membersOk:true,admins:[],users:[],usersOk:false,loaded:false,session:null,myId:null,myEmail:"",canEdit:false,q:"",nf:"",hasGrad:false,hasScholar:false};
let current="home";let popShown=false;
const myMember=()=>S.myId?S.members.find(m=>m.userId===S.myId):null;
const canWrite=()=>!!myMember()||S.canEdit;

/* ---------- DB ↔ 화면 ---------- */
const toPost=r=>({id:r.id,board:r.board,title:r.title||"",body:r.body||"",date:r.date||"",kind:r.kind||"",year:r.year||"",authors:r.authors||"",venue:r.venue||"",link:r.link||"",period:r.period||"",status:r.status||"",authorName:r.author_name||"",authorId:r.author_id||"",photos:Array.isArray(r.photos)?r.photos:[],createdAt:r.created_at});
const toOfficer=r=>({id:r.id,section:r.section||"임원",term:r.term||"",period:r.period||"",role:r.role||"",name:r.name||"",note:r.note||"",termOrder:r.term_order});
const toMember=r=>({id:r.id,userId:r.user_id||"",name:r.name||"",phone:r.phone||"",gen:r.gen||"",course:r.course||"",year:r.year||"",email:r.email||"",org:r.org||"",field:r.field||"",scholar:r.scholar||"",gradYear:r.grad_year||"",degree:r.degree||"",joinedAt:r.joined_at});
const pageData=(key,def)=>Object.assign({},def,((S.pages[key]||{}).data)||{});

async function loadAll(){
  if(!sb){S.loaded=true;render();return}
  const [p,pg,o,m,pu]=await Promise.all([
    sb.from("posts").select("*").order("created_at",{ascending:false}).limit(2000),
    sb.from("pages").select("*"),
    sb.from("officers").select("*"),
    S.session?sb.from("members").select("*"):sb.from("members_public").select("*"),
    sb.from("popups").select("*").order("created_at",{ascending:false})
  ]);
  S.popupsOk=!pu.error;S.popups=pu.error?[]:(pu.data||[]);
  S.posts=(p.data||[]).map(toPost);
  S.pages={};(pg.data||[]).forEach(r=>S.pages[r.key]=r);
  S.officers=(o.data||[]).map(toOfficer);
  S.membersOk=!m.error;S.members=(m.data||[]).map(toMember);
  const m0=(m.data||[])[0]||{};S.hasGrad="grad_year" in m0;S.hasScholar="scholar" in m0;
  S.admins=[];S.users=[];S.usersOk=false;
  if(S.canEdit){const [a,u]=await Promise.all([sb.from("admins").select("user_id"),sb.rpc("admin_list_users")]);
    S.admins=(a.data||[]).map(r=>r.user_id);if(!u.error){S.users=u.data||[];S.usersOk=true}}
  S.loaded=true;render();
  if(!popShown){popShown=true;showPopups()}
}
async function loadAuth(session){
  S.session=session||null;S.myId=session?session.user.id:null;S.myEmail=session?session.user.email:"";S.canEdit=false;
  if(sb&&S.myId){const {data}=await sb.from("admins").select("user_id").eq("user_id",S.myId).maybeSingle();S.canEdit=!!data}
}
function must(res){if(res&&res.error)throw res.error;return res}
async function save(run,row,cols){const r=await run(row);
  if(r.error&&cols.some(c=>String(r.error.message||"").includes(c)))throw {message:NEED_SQL};
  return must(r)}

/* ---------- 이동 ---------- */
$("#menu").innerHTML=MENU.map(([k,en])=>`<a href="#${k}" data-k="${k}">${en}</a>`).join("");
function go(k){
  k=OLD[k]||k;if(!VIEWS.includes(k))k="home";
  current=k;
  document.querySelectorAll(".view").forEach(v=>v.hidden=v.id!=="v-"+k);
  document.querySelectorAll("#menu a").forEach(a=>{if(a.dataset.k===k)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  const act=$("#menu a[aria-current]");act&&act.scrollIntoView({block:"nearest",inline:"nearest"});
  render();window.scrollTo(0,0);
}
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const raw=a.getAttribute("href").slice(1);
  if(raw.startsWith("c-")){e.preventDefault();const t=document.getElementById(raw);t&&t.scrollIntoView({behavior:"smooth",block:"start"});return}
  const k=OLD[raw]||raw;if(!VIEWS.includes(k))return;e.preventDefault();history.pushState(null,"","#"+k);go(k)});
window.addEventListener("popstate",()=>go((location.hash||"").slice(1)));

/* ---------- 공통 조각 ---------- */
function postsOf(...b){return S.posts.filter(p=>b.includes(p.board))}
const byDate=(a,c)=>String(c.date||c.createdAt||"").localeCompare(String(a.date||a.createdAt||""));
function loading(){return `<p class="empty">불러오는 중…</p>`}
function pageHead(en,ko,desc,btns){return `<div class="ph"><div><h1>${en}</h1><p class="ph-ko">${ko}</p>${desc?`<p class="ph-d">${desc}</p>`:""}</div>${btns?`<div class="tools">${btns}</div>`:""}</div>`}
const adminBtn=(id,label)=>S.canEdit?`<button class="btn sm ghost" id="${id}">${label}</button>`:"";
function bind(id,fn){const el=document.getElementById(id);el&&(el.onclick=fn)}
function excerpt(s,n){s=String(s||"").replace(/\s+/g," ").trim();return s.length>n?s.slice(0,n).trim()+"…":s}

/* 논문: 지도교수(전해정)가 저자로 참여한 학술지 논문만 */
const PROF_RX=/전해정|Jeon,?\s*Hae[-\s]?jeong|Hae[-\s]?jeong\s*Jeon/i;
function pubs(){return S.posts.filter(p=>p.board==="research"&&(p.kind==="학술지 논문"||!p.kind)&&PROF_RX.test(p.authors))
  .sort((a,c)=>(Number(c.year)||0)-(Number(a.year)||0)||String(c.date||"").localeCompare(String(a.date||""))||String(a.title).localeCompare(String(c.title),"ko"))}
function pubLink(p){const l=String(p.link||"").trim();if(!l)return"";
  const doi=l.match(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/\S+)$/i);
  if(doi)return `<a href="https://doi.org/${esc(doi[1])}" target="_blank" rel="noopener">DOI ${esc(doi[1])}</a>`;
  return url(l)?`<a href="${esc(l)}" target="_blank" rel="noopener">논문 보기 ↗</a>`:""}
function pubItem(p){
  return `<li class="pub"><div class="pub-t">${esc(p.title)}</div><div class="pub-a">${esc(p.authors)}</div><div class="pub-v">${p.venue?`<span class="venue">${esc(p.venue)}</span>`:""}${p.year?`<span>${esc(p.year)}</span>`:""}${pubLink(p)?`<span>${pubLink(p)}</span>`:""}${S.canEdit?`<button class="lnk" data-edit="${p.id}">수정</button>`:""}</div></li>`}

/* 소식·사진 카드 */
function card(p){const ph=p.photos[0];
  return `<button class="card" data-open="${p.id}"><div class="cph${ph?"":" none"}"${ph?` style="background-image:url('${esc(ph.url)}')"`:""}>${ph?(p.photos.length>1?`<span class="n">+${p.photos.length-1}</span>`:""):"<span>RAIB Lab</span>"}</div><div class="cb"><div class="cm">${p.kind?`<span class="tag">${esc(p.kind)}</span>`:""}<time>${fmt(p.date||p.createdAt)}</time></div><div class="ct">${esc(p.title)}</div>${p.body?`<div class="cx">${esc(excerpt(p.body,80))}</div>`:""}</div></button>`}
function cards(list,emptyMsg){return list.length?`<div class="cards">${list.map(card).join("")}</div>`:`<p class="empty">${emptyMsg}</p>`}

/* ---------- 렌더 ---------- */
function render(){
  renderWho();
  ({home:renderHome,members:renderMembers,alumni:renderAlumni,publications:renderPubs,projects:renderProjects,news:renderNews,community:renderCommunity,admissions:renderAdmissions})[current]();
}
function renderWho(){
  const w=$("#who");const fl=$("#foot-login");
  if(!S.session){w.hidden=true;w.innerHTML="";fl.textContent="관리자 로그인";fl.onclick=loginModal;return}
  const mem=myMember();w.hidden=false;
  w.innerHTML=`<div class="wrap ab"><span>${S.canEdit?'<b>관리자</b> · ':""}${esc(mem?mem.name:S.myEmail)}님 로그인 중</span><span class="ab-r">${S.canEdit?'<button class="lnk" id="h-pop">팝업 관리</button>':""}<button class="lnk" id="h-me">내 정보</button><button class="lnk" id="h-out">로그아웃</button></span></div>`;
  bind("h-me",()=>mem?editMember(mem,true):editMember({},true));bind("h-pop",popupManager);
  bind("h-out",async()=>{await sb.auth.signOut();toast("로그아웃했습니다")});
  fl.textContent="로그아웃";fl.onclick=async()=>{await sb.auth.signOut();toast("로그아웃했습니다")};
}

/* 첫 화면: 로고 · 소개 · 최근 논문 3 · 최근 소식 3 */
function renderHome(){
  const el=$("#v-home");
  const P=pubs().slice(0,3);const N=postsOf("news","conference").sort(byDate).slice(0,3);
  el.innerHTML=`<div class="hero"><img class="hero-logo" src="images/raib-logo-en.png" alt="RAIB Lab — Real Estate AI &amp; Big Data Lab"><p class="hero-t">${esc(INTRO)}</p></div>
  <div class="home-sec"><div class="sec-h"><h2>Recent Publications</h2><a href="#publications">전체 보기 →</a></div>${!S.loaded?loading():P.length?`<ol class="pubs">${P.map(pubItem).join("")}</ol>`:`<p class="empty">등록된 논문이 없습니다.</p>`}</div>
  <div class="home-sec"><div class="sec-h"><h2>News</h2><a href="#news">전체 보기 →</a></div>${!S.loaded?loading():cards(N,"등록된 소식이 없습니다.")}</div>`;
}

/* Members: 지도교수 · 재학생 · 수료생 */
function renderMembers(){
  const el=$("#v-members");const P=pageData("professor",PROF_DEFAULT);
  const fields=lines(P.fields),bio=lines(P.bio),edu=lines(P.edu);
  const row=(k,v)=>v?`<div class="pr-row"><dt>${k}</dt><dd>${v}</dd></div>`:"";
  const prof=`<article class="prof"><img class="prof-ph" src="${esc(P.photo||PROF_DEFAULT.photo)}" alt="${esc(P.name)} 교수">
    <div class="prof-b"><div class="prof-role">Advisor · 지도교수</div><h2>${esc(P.name)} <small>${esc(P.title)}</small></h2><p class="prof-aff">${esc(P.aff)}</p>
    <dl>${row("연구 분야",fields.length?`<div class="chips">${fields.map(f=>`<span>${esc(f)}</span>`).join("")}</div>`:"")}
    ${row("학력",edu.length?`<ul>${edu.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"")}
    ${row("약력",bio.length?`<ul>${bio.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"")}
    ${row("이메일",P.email?`<a href="mailto:${esc(P.email)}">${esc(P.email)}</a>`:"")}</dl>
    ${url(P.scholar)?`<a class="btn ghost sm" href="${esc(P.scholar)}" target="_blank" rel="noopener">Google Scholar ↗</a>`:""}${adminBtn("ed-prof","지도교수 정보 수정")}</div></article>`;
  const sortM=(a,b)=>(Number(a.gen)||9999)-(Number(b.gen)||9999)||String(a.name).localeCompare(String(b.name),"ko");
  const grp=(c)=>S.members.filter(m=>m.course===c).sort(sortM);
  const names=list=>list.length?`<ul class="names">${list.map(m=>`<li>${esc(m.name)}${S.canEdit||m.userId&&m.userId===S.myId?` <button class="lnk" data-mem="${m.id}">수정</button>`:""}</li>`).join("")}</ul>`:`<p class="empty">${S.loaded?(S.membersOk?"등록된 구성원이 없습니다.":"명단을 준비 중입니다."):"불러오는 중…"}</p>`;
  let btns=adminBtn("m-add","구성원 추가");
  if(S.session&&!myMember())btns+=`<button class="btn sm ghost" id="m-join">명단에 내 정보 등록</button>`;
  el.innerHTML=pageHead("Members","구성원","",btns)+prof+
    `<div class="grp"><h3>재학생 <small>Ph.D. Students</small></h3>${names(grp("박사과정"))}</div>
     <div class="grp"><h3>수료생 <small>Ph.D. Candidates</small></h3>${names(grp("박사수료"))}</div>`+(S.canEdit?adminMembers():"");
  bind("ed-prof",editProfessor);bind("m-add",()=>editMember({},false));bind("m-join",()=>editMember({},true));
  bindMemberButtons(el);
}
function bindMemberButtons(el){
  el.querySelectorAll("[data-mem]").forEach(b=>b.onclick=()=>{const m=S.members.find(x=>x.id===b.dataset.mem);editMember(m,m.userId===S.myId)});
  el.querySelectorAll("[data-out]").forEach(b=>b.onclick=()=>{const m=S.members.find(x=>x.id===b.dataset.out);withdraw(m.name,m.userId,m.id)});
  el.querySelectorAll("[data-uout]").forEach(b=>b.onclick=()=>{const u=S.users.find(x=>x.id===b.dataset.uout);withdraw(u.email,u.id,null)});
}
/* 관리자만 보는 전체 명단 표 (로그인 계정·탈퇴 처리) */
function adminMembers(){
  const U={};S.users.forEach(u=>U[u.id]=u);
  const list=S.members.slice().sort((a,b)=>(Number(a.gen)||9999)-(Number(b.gen)||9999)||String(a.name).localeCompare(String(b.name),"ko"));
  const rows=list.map(m=>{const u=U[m.userId];return `<tr><td class="num">${m.gen?esc(m.gen)+"기":"—"}</td><td><b>${esc(m.name)}</b>${m.userId&&S.admins.includes(m.userId)?' <span class="tag">관리자</span>':""}</td><td>${esc(courseLabel(m.course))}</td><td class="num">${esc(m.gradYear)}</td><td>${esc(m.org)}</td><td>${u?esc(u.email):(m.userId?"—":"계정 없음")}</td><td class="num nowrap"><button class="lnk" data-mem="${m.id}">수정</button>${m.userId!==S.myId?` <button class="lnk danger" data-out="${m.id}">탈퇴</button>`:""}</td></tr>`}).join("");
  let orphan="";if(S.usersOk){const has=new Set(S.members.map(m=>m.userId).filter(Boolean));const os=S.users.filter(u=>!has.has(u.id));
    if(os.length)orphan=`<p class="hint">명단에 없는 가입 계정: ${os.map(u=>`${esc(u.email)}${u.id!==S.myId?` <button class="lnk danger" data-uout="${u.id}">탈퇴</button>`:""}`).join(" · ")}</p>`}
  return `<details class="admin-box"><summary>관리자: 전체 명단 관리 (${S.members.length}명)</summary><div class="tablewrap"><table><thead><tr><th>기수</th><th>성명</th><th>과정</th><th>졸업</th><th>소속</th><th>로그인 계정</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${orphan}</details>`;
}

/* Alumni: 학위 취득자 */
function renderAlumni(){
  const el=$("#v-alumni");
  const list=S.members.filter(m=>m.course==="박사").sort((a,b)=>(Number(b.gradYear)||0)-(Number(a.gradYear)||0)||String(a.name).localeCompare(String(b.name),"ko"));
  const inner=!S.loaded?loading():!list.length?`<p class="empty">${S.membersOk?"등록된 졸업생이 없습니다.":"명단을 준비 중입니다."}</p>`
    :`<div class="tablewrap"><table class="alum"><thead><tr><th>이름</th><th>학위</th><th>졸업연도</th><th>소속</th></tr></thead><tbody>${list.map(m=>`<tr><td class="nowrap"><b>${esc(m.name)}</b>${S.canEdit?` <button class="lnk" data-mem="${m.id}">수정</button>`:""}</td><td>${esc(m.degree||"부동산학 박사")}</td><td class="num">${esc(m.gradYear)}</td><td>${esc(m.org)}</td></tr>`).join("")}</tbody></table></div>`;
  el.innerHTML=pageHead("Alumni","졸업생","레이브랩에서 박사학위를 취득한 졸업생입니다.",adminBtn("m-add","졸업생 추가"))+inner;
  bind("m-add",()=>editMember({course:"박사"},false));bindMemberButtons(el);
}

/* Publications */
function renderPubs(){
  const el=$("#v-publications");const q=S.q.trim().toLowerCase();
  const all=pubs();const list=all.filter(p=>!q||[p.title,p.authors,p.venue,p.year].join(" ").toLowerCase().includes(q));
  const years={};list.forEach(p=>{const y=p.year||"연도 미기재";(years[y]=years[y]||[]).push(p)});
  const inner=!S.loaded?loading():!list.length?`<p class="empty">${q?"검색 결과가 없습니다.":"등록된 논문이 없습니다."}</p>`
    :Object.keys(years).sort((a,c)=>String(c).localeCompare(String(a))).map(y=>`<section class="yr"><h3>${esc(y)}</h3><ol class="pubs">${years[y].map(pubItem).join("")}</ol></section>`).join("");
  const keep=document.activeElement&&document.activeElement.id==="q-pub";
  el.innerHTML=pageHead("Publications","논문","지도교수 전해정 교수가 단독 또는 공동저자로 참여한 학술지 논문입니다."+(S.loaded?` (${all.length}편)`:""),`<input class="search" id="q-pub" type="search" placeholder="제목·저자·학술지 검색" value="${esc(S.q)}">${adminBtn("w-pub","논문 추가")}`)+inner;
  const qi=$("#q-pub");qi.oninput=()=>{S.q=qi.value;renderPubs()};if(keep){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}
  bind("w-pub",()=>editPost("pub"));
}

/* Projects */
function renderProjects(){
  const el=$("#v-projects");
  const all=S.posts.filter(p=>p.board==="research"&&p.kind==="공동연구과제").sort((a,c)=>(Number(c.year)||0)-(Number(a.year)||0)||String(c.period).localeCompare(String(a.period)));
  const item=p=>`<li class="proj"><div class="proj-t">${esc(p.title)}</div><div class="proj-m">${[p.period||p.year,p.venue,p.authors&&"참여: "+p.authors].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join("")}</div>${p.body?`<p class="proj-d">${esc(p.body)}</p>`:""}${S.canEdit?`<button class="lnk" data-edit="${p.id}">수정</button>`:""}</li>`;
  const sec=(t,en,list)=>`<section class="grp"><h3>${t} <small>${en}</small></h3>${list.length?`<ul class="projs">${list.map(item).join("")}</ul>`:`<p class="empty">${S.loaded?"해당 연구가 없습니다.":"불러오는 중…"}</p>`}</section>`;
  el.innerHTML=pageHead("Projects","연구과제","",adminBtn("w-proj","연구과제 추가"))+sec("진행 중인 연구","Ongoing",all.filter(p=>p.status==="진행 중"))+sec("완료된 연구","Completed",all.filter(p=>p.status!=="진행 중"));
  bind("w-proj",()=>editPost("proj"));
}

/* News */
function renderNews(){
  const el=$("#v-news");const f=S.nf;
  const all=postsOf("news","conference").sort(byDate);
  const kinds=NEWS_KINDS.filter(k=>all.some(p=>p.kind===k));
  const list=all.filter(p=>!f||p.kind===f);
  el.innerHTML=pageHead("News","소식","학술대회 발표, 논문 게재, 수상, 학위 취득 등 연구실 소식입니다.",canWrite()?`<button class="btn sm" id="w-news">소식 올리기</button>`:"")+
    (kinds.length>1?`<div class="ftabs">${[""].concat(kinds).map(k=>`<button type="button" data-nf="${esc(k)}"${k===f?' aria-pressed="true"':""}>${k?esc(k):"전체"}</button>`).join("")}</div>`:"")+
    (!S.loaded?loading():cards(list,"등록된 소식이 없습니다."));
  el.querySelectorAll("[data-nf]").forEach(b=>b.onclick=()=>{S.nf=b.dataset.nf;renderNews()});
  bind("w-news",()=>editPost("news"));
}

/* Community: 원우회 · 골프회 · 교류 활동 */
const ROLES=["회장","부회장","총무","감사","이사"];
const roleRank=r=>{const i=ROLES.indexOf(String(r||"").trim());return i<0?9:i};
function officerBlock(sec){
  const terms={};S.officers.filter(o=>o.section===sec).forEach(o=>{(terms[o.term]=terms[o.term]||[]).push(o)});
  const keys=Object.keys(terms).sort((a,b)=>(terms[b][0].termOrder||0)-(terms[a][0].termOrder||0)||b.localeCompare(a,"ko"));
  if(!keys.length)return `<p class="empty">${S.loaded?"등록된 명단이 없습니다.":"불러오는 중…"}</p>`;
  return keys.map(t=>{const rows=terms[t].sort((a,b)=>roleRank(a.role)-roleRank(b.role)||String(a.name).localeCompare(String(b.name),"ko"));
    return `<div class="term"><div class="term-h"><b>${esc(t)}</b>${rows[0].period?`<span>임기 ${esc(rows[0].period)}</span>`:""}</div><ul class="offs">${rows.map(r=>`<li><span class="role">${esc(r.role)}</span><span class="nm">${esc(r.name)}</span>${S.canEdit?`<button class="lnk" data-off="${r.id}">수정</button>`:""}</li>`).join("")}</ul></div>`}).join("")}
function renderCommunity(){
  const el=$("#v-community");const G=pageData("golf",GOLF_DEFAULT);
  el.innerHTML=pageHead("Community","커뮤니티","",`<nav class="jump"><a href="#c-assoc">원우회</a><a href="#c-golf">골프회</a><a href="#c-act">교류 활동</a></nav>`)+
  `<section class="csec" id="c-assoc"><div class="sec-h"><h2>원우회 <small>임원단</small></h2>${adminBtn("o-add1","임원 추가")}</div>${officerBlock("임원")}</section>
   <section class="csec" id="c-golf"><div class="sec-h"><h2>골프회</h2><span class="tools">${adminBtn("o-add2","운영진 추가")}${adminBtn("ed-golf","모임 안내 수정")}${canWrite()?`<button class="btn sm ghost" id="w-golf">사진 올리기</button>`:""}</span></div>
     <div class="golf"><div><h4>운영진</h4>${officerBlock("골프 임원")}</div><div><h4>모임 안내</h4>${G.info?`<p class="info">${esc(G.info)}</p>`:`<p class="empty">모임 안내를 준비 중입니다.</p>`}</div></div>
     ${S.loaded?cards(postsOf("golf").sort(byDate),"등록된 사진이 없습니다."):loading()}</section>
   <section class="csec" id="c-act"><div class="sec-h"><h2>교류 활동 <small>연구실 모임 · 졸업 축하 · 친목행사</small></h2>${canWrite()?`<button class="btn sm ghost" id="w-comm">사진 올리기</button>`:""}</div>
     ${S.loaded?cards(postsOf("community").sort(byDate),"등록된 사진이 없습니다."):loading()}</section>`;
  bind("o-add1",()=>editOfficer({section:"임원"}));bind("o-add2",()=>editOfficer({section:"골프 임원"}));
  bind("ed-golf",editGolf);bind("w-golf",()=>editPost("golf"));bind("w-comm",()=>editPost("community"));
  el.querySelectorAll("[data-off]").forEach(b=>b.onclick=()=>editOfficer(S.officers.find(o=>o.id===b.dataset.off)));
}

/* Admissions */
function renderAdmissions(){
  const el=$("#v-admissions");const A=pageData("admissions",ADM_DEFAULT);const P=pageData("professor",PROF_DEFAULT);
  const steps=lines(A.steps);
  const contacts=[
    P.email&&["지도교수",`${esc(P.name)} 교수 · <a href="mailto:${esc(P.email)}">${esc(P.email)}</a>`],
    (A.contactName||A.contactEmail||A.contactPhone)&&["연구실 문의",[esc(A.contactName),A.contactEmail&&`<a href="mailto:${esc(A.contactEmail)}">${esc(A.contactEmail)}</a>`,esc(A.contactPhone)].filter(Boolean).join(" · ")],
    A.office&&["대학원 입학",esc(A.office)]].filter(Boolean);
  el.innerHTML=pageHead("Admissions","입학 안내","",adminBtn("ed-adm","입학 안내 수정"))+
  `<div class="adm"><p class="adm-intro">${esc(A.intro)}</p>
   ${steps.length?`<h3>지원 절차</h3><ol class="steps">${steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:""}
   <h3>문의</h3>${contacts.length?`<dl class="contact">${contacts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`:`<p class="empty">문의처를 준비 중입니다.</p>`}
   ${url(A.guide)?`<p><a class="btn" href="${esc(A.guide)}" target="_blank" rel="noopener">상명대학교 대학원 모집요강 보기 ↗</a></p>`:""}</div>`;
  bind("ed-adm",editAdmissions);
}

/* 글·논문 열기 */
document.addEventListener("click",e=>{
  const ed=e.target.closest("[data-edit]");if(ed){e.preventDefault();const p=S.posts.find(x=>x.id===ed.dataset.edit);p&&editPost(formOf(p),p);return}
  const t=e.target.closest("[data-open]");if(!t)return;e.preventDefault();
  const p=S.posts.find(x=>x.id===t.dataset.open);p&&viewPost(p)});

/* ---------- 모달 ---------- */
function modal(html){dropPreview();const r=$("#modal-root");r.innerHTML=`<div class="overlay" id="ov"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  $("#ov").addEventListener("click",e=>{if(e.target.id==="ov")close()});return r.querySelector(".modal")}
function close(){dropPreview();$("#modal-root").innerHTML=""}
function dropPreview(){document.querySelectorAll(".pop.preview").forEach(x=>x.remove())}
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2400)}
function mine(p){return S.canEdit||(S.myId&&p.authorId===S.myId)}
function errMsg(e){const m=(e&&(e.message||e.error_description||e.code))||"오류";
  if(/Invalid login credentials/i.test(m))return"이메일 또는 비밀번호가 맞지 않습니다.";
  if(/already registered|already been registered/i.test(m))return"이미 가입된 이메일입니다. 로그인해 주세요.";
  if(/Password should be/i.test(m))return"비밀번호는 8자 이상으로 정해 주세요.";
  if(/Email not confirmed/i.test(m))return"이메일 인증이 아직 안 되었습니다. 받은편지함의 인증 메일을 확인해 주세요.";
  if(/rate limit/i.test(m))return"잠시 요청이 많았습니다. 몇 분 뒤에 다시 시도해 주세요.";
  if(/posts_board_check|does not exist|schema cache/i.test(m))return NEED_SQL;
  if(/row-level security|permission/i.test(m))return"권한이 없습니다. 로그인 상태와 회원가입 여부를 확인해 주세요.";
  return m}

/* ---------- 로그인·회원가입 ---------- */
function loginModal(){
  if(!sb){toast("홈페이지 설정(Supabase 연결)이 아직 끝나지 않았습니다");return}
  const m=modal(`<h2>로그인</h2><p class="hint">글을 올리거나 정보를 고치는 연구실 구성원·관리자용입니다. 홈페이지 내용은 로그인 없이 모두 볼 수 있습니다.</p><form class="form" id="lgf">
    <label for="lg-email">이메일<input id="lg-email" type="email" autocomplete="email" required></label>
    <label for="lg-pw">비밀번호<input id="lg-pw" type="password" autocomplete="current-password" required></label>
    <div class="err" id="lgerr"></div>
    <div class="actions"><button type="button" class="btn ghost" id="lg-reset" style="margin-right:auto">비밀번호 찾기</button><button type="button" class="btn ghost" id="lg-join">회원가입</button><button class="btn" id="lg-go">로그인</button></div></form>`);
  m.querySelector("#lg-join").onclick=signupModal;
  m.querySelector("#lg-reset").onclick=async()=>{const em=$("#lg-email").value.trim();if(!em){$("#lgerr").textContent="이메일을 먼저 입력해 주세요.";return}
    const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
    $("#lgerr").textContent=error?errMsg(error):"비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 눌러 새 비밀번호를 정해 주세요."};
  m.querySelector("#lgf").onsubmit=async e=>{e.preventDefault();const b=$("#lg-go");b.disabled=true;
    const {error}=await sb.auth.signInWithPassword({email:$("#lg-email").value.trim(),password:$("#lg-pw").value});
    if(error){b.disabled=false;$("#lgerr").textContent=errMsg(error);return}
    close();toast("로그인했습니다")};
  setTimeout(()=>$("#lg-email").focus(),30);
}
const COURSES=["박사과정","박사수료","박사"];
const courseLabel=c=>({"박사과정":"재학생","박사수료":"수료생","박사":"졸업생"})[c]||c||"—";
function memberFields(m){return `
    <div class="row2"><label for="m-name">성명<input id="m-name" name="name" required value="${esc(m.name)}"></label>
    <label for="m-course">구분<select id="m-course" name="course">${COURSES.map(c=>`<option value="${c}"${c===m.course?" selected":""}>${courseLabel(c)} (${c})</option>`).join("")}</select></label></div>
    <div class="row2"><label for="m-gen">기수 (숫자만)<input id="m-gen" name="gen" type="number" min="1" max="200" value="${esc(m.gen)}"></label><label for="m-year">입학 연도 (선택)<input id="m-year" name="year" type="number" min="1990" max="2100" value="${esc(m.year)}"></label></div>
    ${S.hasGrad||!S.members.length?`<div class="row2"><label for="m-grad">졸업연도 (졸업생만)<input id="m-grad" name="grad_year" type="number" min="1990" max="2100" value="${esc(m.gradYear)}"></label><label for="m-degree">학위 (졸업생만)<input id="m-degree" name="degree" placeholder="부동산학 박사" value="${esc(m.degree)}"></label></div>`:""}
    <label for="m-org">소속 (직장·직위)<input id="m-org" name="org" placeholder="예: ○○공사 차장" value="${esc(m.org)}"></label>
    <label for="m-field">연구분야 (선택)<input id="m-field" name="field" value="${esc(m.field)}"></label>
    <label for="m-email">연락 이메일 (선택 · 홈페이지에는 공개되지 않음)<input id="m-email" name="email" type="email" value="${esc(m.email)}"></label>`}
function readMember(fd){const g=k=>(fd.get(k)||"").toString().trim();
  const r={name:g("name"),gen:num(g("gen")),course:g("course"),year:num(g("year")),email:nz(g("email")),org:nz(g("org")),field:nz(g("field"))};
  if(fd.has("grad_year")){r.grad_year=num(g("grad_year"));r.degree=nz(g("degree"))}return r}
function signupModal(){
  if(!sb)return;if(S.session){editMember({},true);return}
  const m=modal(`<h2>회원가입</h2><form class="form" id="suf">
    <div class="notice">레이브랩 구성원용 가입입니다. 가입하면 구성원 명단에 이름이 올라가고, 소식·사진을 올릴 수 있습니다.</div>
    <div class="row2"><label for="su-email">로그인 이메일<input id="su-email" name="loginEmail" type="email" autocomplete="email" required></label>
    <label for="su-pw">비밀번호 (8자 이상)<input id="su-pw" name="pw" type="password" minlength="8" autocomplete="new-password" required></label></div>
    ${memberFields({course:"박사과정"})}
    <div class="err" id="suerr"></div>
    <div class="actions"><button type="button" class="btn ghost" id="su-c">취소</button><button class="btn" id="su-go">가입하기</button></div></form>`);
  m.querySelector("#su-c").onclick=close;
  m.querySelector("#suf").onsubmit=async e=>{e.preventDefault();const b=$("#su-go");b.disabled=true;$("#suerr").textContent="";
    const fd=new FormData(e.target);const prof=readMember(fd);const email=fd.get("loginEmail").toString().trim();
    try{const {data,error}=await sb.auth.signUp({email,password:fd.get("pw").toString(),options:{data:{pending_member:prof}}});
      if(error)throw error;close();
      if(data.session)toast("회원가입이 완료되었습니다");
      else{const mm=modal(`<h2>인증 메일을 보냈습니다</h2><div class="content">${esc(email)}로 보낸 메일의 링크를 누른 뒤 로그인하시면 명단에 자동으로 올라갑니다.</div><div class="actions"><button class="btn" id="ok">확인</button></div>`);mm.querySelector("#ok").onclick=close}
    }catch(err){b.disabled=false;$("#suerr").textContent=errMsg(err)}};
}
async function insertSelf(prof){await save(r=>sb.from("members").insert(r),Object.assign({user_id:S.myId},prof),["grad_year","degree"])}
async function ensureMemberRow(session){
  const pend=session&&session.user&&session.user.user_metadata&&session.user.user_metadata.pending_member;
  if(!pend||!S.myId)return;
  const {data}=await sb.from("members").select("id").eq("user_id",S.myId).maybeSingle();
  if(!data){try{await insertSelf(pend)}catch(_){try{const p=Object.assign({},pend);delete p.grad_year;delete p.degree;await insertSelf(p)}catch(__){}}}
  try{await sb.auth.updateUser({data:{pending_member:null}})}catch(_){}
}
function editMember(m,self){
  m=Object.assign({name:"",gen:"",course:"박사과정",year:"",email:"",org:"",field:"",gradYear:"",degree:""},m||{});const isNew=!m.id;
  const title=self?(isNew?"명단에 내 정보 등록":"내 정보 수정"):(isNew?"구성원 추가":"구성원 정보 수정");
  if(self&&isNew&&!m.email)m.email=S.myEmail||"";
  const md=modal(`<h2>${title}</h2><form class="form" id="mf">
    ${self?`<div class="notice">로그인 계정: ${esc(S.myEmail)}</div>`:""}
    ${memberFields(m)}
    ${S.canEdit&&!self&&!isNew&&m.userId?`<label class="chk"><input type="checkbox" id="m-admin"${S.admins.includes(m.userId)?" checked":""}> 홈페이지 관리자로 지정</label>`:""}
    <div class="err" id="merr"></div>
    <div class="actions">${!isNew?`<button type="button" class="btn danger" id="mdel" style="margin-right:auto">${self?"명단에서 빼기":"삭제"}</button>`:""}<button type="button" class="btn ghost" id="mc">취소</button><button class="btn" id="ms">${isNew?"등록":"저장"}</button></div></form>`);
  md.querySelector("#mc").onclick=close;
  const del=md.querySelector("#mdel");del&&(del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent="한 번 더 누르면 "+(self?"빼기":"삭제");return}
    try{must(await sb.from("members").delete().eq("id",m.id));close();toast("처리했습니다");loadAll()}catch(err){$("#merr").textContent=errMsg(err)}});
  md.querySelector("#mf").onsubmit=async e=>{e.preventDefault();const d=readMember(new FormData(e.target));const btn=$("#ms");btn.disabled=true;
    try{
      if(isNew&&self)await insertSelf(d);
      else if(isNew)await save(r=>sb.from("members").insert(r),d,["grad_year","degree"]);
      else{d.updated_at=new Date().toISOString();await save(r=>sb.from("members").update(r).eq("id",m.id),d,["grad_year","degree"])}
      if(!self&&!isNew&&m.userId){const want=!!(e.target.querySelector("#m-admin")||{}).checked,has=S.admins.includes(m.userId);
        if(want&&!has)must(await sb.from("admins").insert({user_id:m.userId}));
        if(!want&&has)must(await sb.from("admins").delete().eq("user_id",m.userId))}
      close();toast("저장했습니다");loadAll();
    }catch(err){btn.disabled=false;$("#merr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}
function withdraw(label,userId,memberId){
  const m=modal(`<h2>탈퇴 처리</h2><div class="content"><b>${esc(label)}</b> 님을 탈퇴 처리할까요?<br><br>${userId?"명단에서 빠지고 로그인 계정도 삭제됩니다.":"명단에서만 빠집니다."} 올린 글과 사진은 남습니다. 되돌릴 수 없습니다.</div><div class="err" id="werr"></div>
    <div class="actions"><button class="btn ghost" id="wc">취소</button><button class="btn danger" id="wy">탈퇴 처리</button></div>`);
  m.querySelector("#wc").onclick=close;
  m.querySelector("#wy").onclick=async()=>{const b=$("#wy");b.disabled=true;
    try{if(userId)must(await sb.rpc("admin_delete_user",{target:userId}));else must(await sb.from("members").delete().eq("id",memberId));
      close();toast("탈퇴 처리했습니다");loadAll()}catch(e){b.disabled=false;$("#werr").textContent="처리하지 못했습니다. "+errMsg(e)}};
}

/* ---------- 사진 ---------- */
function gallery(ps){if(!ps.length)return"";
  return `<div class="gal"><img class="main" src="${esc(ps[0].url)}" alt="활동 사진">${ps.length>1?`<div class="cnt">1 / ${ps.length}</div><div class="thumbs">${ps.map((x,i)=>`<button type="button" data-i="${i}" aria-label="사진 ${i+1}" aria-current="${i===0}" style="background-image:url('${esc(x.url)}')"></button>`).join("")}</div>`:""}</div>`}
async function shrink(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<1.5e6)return file;
  try{const bmp=await createImageBitmap(file);const k=Math.min(1,2000/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const b=await new Promise(r=>c.toBlob(r,"image/jpeg",.85));return b&&b.size<file.size?new File([b],"photo.jpg",{type:"image/jpeg"}):file}catch(_){return file}}
async function uploadPhoto(file){
  const f=await shrink(file);const ext=(f.type.split("/")[1]||"jpg").replace("jpeg","jpg");
  const path=`${S.myId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  must(await sb.storage.from(BUCKET).upload(path,f,{contentType:f.type,upsert:false}));
  return {url:sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,path};
}
const MAXPH=20;

/* ---------- 글 보기·쓰기 ---------- */
function viewPost(p){
  const meta=[p.kind,fmt(p.date||p.createdAt)].filter(Boolean);
  const link=url(p.link)?`<p><a href="${esc(p.link)}" target="_blank" rel="noopener">관련 링크 ↗</a></p>`:"";
  const m=modal(`<div class="meta">${meta.map(x=>`<span>${esc(x)}</span>`).join("")}</div><h2>${esc(p.title)}</h2>${gallery(p.photos)}${p.body?`<div class="content">${esc(p.body)}</div>`:""}${link}
  <div class="actions" id="acts">${mine(p)?`<button class="btn danger" id="del">삭제</button><button class="btn ghost" id="ed">수정</button>`:""}<button class="btn" id="cl">닫기</button></div>`);
  m.querySelector("#cl").onclick=close;
  const gm=m.querySelector(".gal .main");if(gm){const ps=p.photos;m.querySelectorAll(".thumbs button").forEach(t=>t.onclick=()=>{const i=+t.dataset.i;gm.src=ps[i].url;m.querySelectorAll(".thumbs button").forEach(x=>x.setAttribute("aria-current",x===t?"true":"false"));m.querySelector(".gal .cnt").textContent=(i+1)+" / "+ps.length})}
  const ed=m.querySelector("#ed");ed&&(ed.onclick=()=>editPost(formOf(p),p));
  const del=m.querySelector("#del");del&&(del.onclick=()=>confirmDelete(p,()=>viewPost(p)));
}
function confirmDelete(p,back){
  $("#acts").innerHTML=`<span class="err" style="margin-right:auto">삭제할까요? 되돌릴 수 없습니다.</span><button class="btn ghost" id="no">취소</button><button class="btn danger" id="yes">삭제</button>`;
  $("#no").onclick=back;
  $("#yes").onclick=async()=>{try{must(await sb.from("posts").delete().eq("id",p.id));
    const paths=p.photos.map(x=>x.path).filter(Boolean);if(paths.length)sb.storage.from(BUCKET).remove(paths).catch(()=>{});
    close();toast("삭제했습니다");loadAll()}catch(e){toast("삭제하지 못했습니다: "+errMsg(e))}};
}
function field([k,label,type,opts,req],val){
  const id="f-"+k;val=val??"";
  if(type==="textarea")return `<label for="${id}">${label}<textarea id="${id}" name="${k}">${esc(val)}</textarea></label>`;
  if(type==="select")return `<label for="${id}">${label}<select id="${id}" name="${k}">${opts.concat(val&&!opts.includes(val)?[val]:[]).map(o=>`<option${o===val?" selected":""}>${esc(o)}</option>`).join("")}</select></label>`;
  return `<label for="${id}">${label}<input id="${id}" name="${k}" type="${type}" value="${esc(val)}"${req?" required":""}${type==="number"?' min="1990" max="2100"':""}></label>`;
}
function editPost(fk,p){
  const cfg=FORMS[fk];p=p||{};const mem=myMember();
  const defaults={date:today(),year:new Date().getFullYear(),status:"진행 중"};
  const v=k=>(p[k]!==undefined&&p[k]!=="")?p[k]:(defaults[k]??"");
  const m=modal(`<h2>${cfg.name} ${p.id?"수정":"올리기"}</h2><form class="form" id="pf">
    ${cfg.fields.map(f=>field(f,v(f[0]))).join("")}
    ${cfg.photo?`<div><div class="lbl">사진 (여러 장 가능, 첫 사진이 대표 사진)</div><p class="hint">사진 설명은 활동을 알 수 있을 만큼 짧게 적어 주세요. 숙소·식당 이름이나 자세한 일정은 넣지 않습니다.</p><div class="pick" id="pick"></div><input id="f-photo" type="file" accept="image/*" multiple hidden></div>`:""}
    <div class="err" id="perr"></div>
    <div class="actions">${p.id&&!cfg.photo&&mine(p)?`<button type="button" class="btn danger" id="pdel" style="margin-right:auto">삭제</button>`:""}<button type="button" class="btn ghost" id="cancel">취소</button><button class="btn" id="save">${p.id?"저장":"등록"}</button></div></form>`);
  const ph=m.querySelector("#f-photo");
  const items=(p.photos||[]).map(x=>({url:x.url,path:x.path||""}));
  function drawPick(){const box=m.querySelector("#pick");if(!box)return;
    box.innerHTML=items.map((x,i)=>`<div class="it" style="background-image:url('${esc(x.url)}')">${i===0?'<span class="first">대표</span>':""}<button type="button" class="x" data-i="${i}" aria-label="사진 빼기">×</button></div>`).join("")+(items.length<MAXPH?`<button type="button" class="add" id="addph">+ 사진</button>`:"");
    box.querySelectorAll(".x").forEach(b=>b.onclick=()=>{const it=items.splice(+b.dataset.i,1)[0];if(it&&it.file)URL.revokeObjectURL(it.url);drawPick()});
    const a=box.querySelector("#addph");a&&(a.onclick=()=>ph.click())}
  function addFiles(fl){fl=fl.filter(f=>f&&/^image\//.test(f.type));if(!fl.length)return false;const room=MAXPH-items.length;
    fl.slice(0,room).forEach(f=>items.push({file:f,url:URL.createObjectURL(f)}));drawPick();return true}
  if(ph){ph.onchange=()=>{addFiles([...ph.files]);ph.value=""};drawPick();
    const onPaste=e=>{if(!document.body.contains(m)){document.removeEventListener("paste",onPaste);return}
      const cd=e.clipboardData;if(addFiles([...((cd&&cd.items)||[])].filter(i=>i.kind==="file").map(i=>i.getAsFile()))){e.preventDefault();toast("붙여넣은 사진을 추가했습니다")}};
    document.addEventListener("paste",onPaste);
    const box=m.querySelector("#pick");
    box.addEventListener("dragover",e=>{e.preventDefault();box.classList.add("drop")});
    box.addEventListener("dragleave",()=>box.classList.remove("drop"));
    box.addEventListener("drop",e=>{e.preventDefault();box.classList.remove("drop");addFiles([...(e.dataTransfer?e.dataTransfer.files:[])])})}
  m.querySelector("#cancel").onclick=()=>p.id&&cfg.photo?viewPost(p):close();
  const pd=m.querySelector("#pdel");pd&&(pd.onclick=()=>{$("#perr").innerHTML="";const a=m.querySelector(".actions");a.id="acts";confirmDelete(p,()=>editPost(fk,p))});
  m.querySelector("#pf").onsubmit=async e=>{
    e.preventDefault();const btn=$("#save");btn.disabled=true;$("#perr").textContent="";
    const fd=new FormData(e.target);const row={};
    cfg.fields.forEach(([k,,type])=>{const s=(fd.get(k)||"").toString().trim();row[k]=type==="number"?num(s):nz(s)});
    if(!row.title){$("#perr").textContent="제목을 입력해 주세요.";btn.disabled=false;return}
    try{
      if(cfg.photo){const news=items.filter(x=>x.file);let n=0;
        for(const it of items){if(!it.file)continue;n++;btn.textContent=`사진 올리는 중 ${n}/${news.length}`;
          const up=await uploadPhoto(it.file);URL.revokeObjectURL(it.url);it.url=up.url;it.path=up.path;delete it.file}
        row.photos=items.map(x=>({url:x.url,path:x.path||""}))}
      Object.assign(row,cfg.fixed||{});
      if(fk==="pub"&&!p.id)row.date=row.year?row.year+"-01-01":null;
      const cols=["period","status","posts_board_check"];
      if(p.id){row.updated_at=new Date().toISOString();await save(r=>sb.from("posts").update(r).eq("id",p.id),row,cols);toast("저장했습니다")}
      else{row.board=cfg.board;row.author_id=S.myId;row.author_name=(mem&&mem.name)||null;await save(r=>sb.from("posts").insert(r),row,cols);toast("등록했습니다")}
      close();loadAll();
    }catch(err){btn.disabled=false;btn.textContent=p.id?"저장":"등록";$("#perr").textContent="저장하지 못했습니다. "+errMsg(err)}
  };
}

/* ---------- 지도교수·입학 안내·골프회 안내 (관리자) ---------- */
async function savePage(key,data){
  const r=await sb.from("pages").upsert({key,data,updated_at:new Date().toISOString()});
  if(r.error&&/data/.test(String(r.error.message||"")))throw {message:NEED_SQL};must(r)}
function pageForm(title,html,collect,key){
  const m=modal(`<h2>${title}</h2><form class="form" id="pgf">${html}<div class="err" id="pgerr"></div><div class="actions"><button type="button" class="btn ghost" id="pgc">취소</button><button class="btn" id="pgs">저장</button></div></form>`);
  m.querySelector("#pgc").onclick=close;
  m.querySelector("#pgf").onsubmit=async e=>{e.preventDefault();const b=$("#pgs");b.disabled=true;
    try{const data=await collect(new FormData(e.target),b);await savePage(key,data);close();toast("저장했습니다");loadAll()}
    catch(err){b.disabled=false;b.textContent="저장";$("#pgerr").textContent="저장하지 못했습니다. "+errMsg(err)}};
  return m}
const ta=(k,label,val,hint)=>`<label for="pg-${k}">${label}${hint?`<span class="hint">${hint}</span>`:""}<textarea id="pg-${k}" name="${k}">${esc(Array.isArray(val)?val.join("\n"):val||"")}</textarea></label>`;
const ti=(k,label,val,type)=>`<label for="pg-${k}">${label}<input id="pg-${k}" name="${k}" type="${type||"text"}" value="${esc(val||"")}"></label>`;
function editProfessor(){
  const P=pageData("professor",PROF_DEFAULT);
  const m=pageForm("지도교수 정보 수정",`
    <div class="row2">${ti("name","성명",P.name)}${ti("title","직함",P.title)}</div>
    ${ti("aff","소속",P.aff)}
    ${ta("fields","연구 분야",P.fields,"한 줄에 하나씩")}
    ${ta("edu","학력",P.edu,"한 줄에 하나씩 (예: 상명대학교 부동산학 박사)")}
    ${ta("bio","약력",P.bio,"한 줄에 하나씩")}
    <div class="row2">${ti("email","이메일",P.email,"email")}${ti("scholar","Google Scholar 주소",P.scholar,"url")}</div>
    <label for="pg-photo">사진 바꾸기 (선택)<input id="pg-photo" name="photo" type="file" accept="image/*"></label>`,
    async(fd,b)=>{const g=k=>(fd.get(k)||"").toString().trim();let photo=P.photo;const f=fd.get("photo");
      if(f&&f.size){b.textContent="사진 올리는 중…";photo=(await uploadPhoto(f)).url}
      return {name:g("name"),title:g("title"),aff:g("aff"),fields:lines(g("fields")),edu:lines(g("edu")),bio:lines(g("bio")),email:g("email"),scholar:g("scholar"),photo}},"professor");
}
function editAdmissions(){
  const A=pageData("admissions",ADM_DEFAULT);
  pageForm("입학 안내 수정",`${ta("intro","안내 문구",A.intro)}${ta("steps","지원 절차",A.steps,"한 줄에 하나씩")}
    <div class="row2">${ti("contactName","연구실 문의 담당 (선택)",A.contactName)}${ti("contactPhone","연락처 (선택)",A.contactPhone)}</div>
    ${ti("contactEmail","문의 이메일 (선택)",A.contactEmail,"email")}${ti("office","대학원 입학 문의",A.office)}${ti("guide","공식 모집요강 주소",A.guide,"url")}
    <p class="hint">지도교수 이메일은 ‘지도교수 정보’에 적힌 이메일이 자동으로 표시됩니다.</p>`,
    async fd=>{const g=k=>(fd.get(k)||"").toString().trim();return {intro:g("intro"),steps:lines(g("steps")),contactName:g("contactName"),contactPhone:g("contactPhone"),contactEmail:g("contactEmail"),office:g("office"),guide:g("guide")}},"admissions");
}
function editGolf(){
  const G=pageData("golf",GOLF_DEFAULT);
  pageForm("골프회 모임 안내 수정",ta("info","모임 안내",G.info,"예: 매월 셋째 주 목요일 정기 라운딩, 참가 신청은 총무에게"),async fd=>({info:(fd.get("info")||"").toString().trim()}),"golf");
}
function editOfficer(o){
  o=o||{};const SECS=[["임원","원우회 임원단"],["골프 임원","골프회 운영진"]];
  const m=modal(`<h2>${o.id?"명단 수정":"명단 추가"}</h2><form class="form" id="of">
    <label for="o-section">구분<select id="o-section" name="section">${SECS.map(([x,l])=>`<option value="${x}"${x===(o.section||"임원")?" selected":""}>${l}</option>`).join("")}</select></label>
    <div class="row2"><label for="o-term">기수<input id="o-term" name="term" placeholder="예: 제1기" value="${esc(o.term||"")}" required></label><label for="o-period">임기<input id="o-period" name="period" placeholder="예: 2025.01 – 2026.12" value="${esc(o.period||"")}"></label></div>
    <div class="row2"><label for="o-role">직책<input id="o-role" name="role" list="o-roles" value="${esc(o.role||"")}" required><datalist id="o-roles">${ROLES.map(r=>`<option value="${r}">`).join("")}</datalist></label><label for="o-name">성명<input id="o-name" name="name" value="${esc(o.name||"")}" required></label></div>
    <label for="o-termOrder">기수 순번 (숫자가 클수록 위에 표시)<input id="o-termOrder" name="termOrder" type="number" value="${esc(o.termOrder??"")}"></label>
    <div class="err" id="oerr"></div>
    <div class="actions">${o.id?`<button type="button" class="btn danger" id="odel" style="margin-right:auto">삭제</button>`:""}<button type="button" class="btn ghost" id="oc">취소</button><button class="btn">저장</button></div></form>`);
  m.querySelector("#oc").onclick=close;
  const od=m.querySelector("#odel");od&&(od.onclick=async()=>{if(od.dataset.sure){try{must(await sb.from("officers").delete().eq("id",o.id));close();toast("삭제했습니다");loadAll()}catch(err){$("#oerr").textContent=errMsg(err)}}else{od.dataset.sure=1;od.textContent="한 번 더 누르면 삭제"}});
  m.querySelector("#of").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const g=k=>(fd.get(k)||"").toString().trim();
    const d={section:g("section")||"임원",term:g("term"),period:nz(g("period")),role:g("role"),name:g("name"),term_order:num(g("termOrder"))};
    try{if(o.id)must(await sb.from("officers").update(d).eq("id",o.id));else must(await sb.from("officers").insert(d));close();toast("저장했습니다");loadAll()}catch(err){$("#oerr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}

/* ---------- 팝업 공지 (관리자) ---------- */
const POPW=420;
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function popState(pp){const t=today();
  if(!pp.active)return["꺼짐","off"];
  if(pp.start_date&&t<pp.start_date)return["예정","soon"];
  if(pp.end_date&&t>pp.end_date)return["기간 끝남","off"];
  return["게시 중","on"]}
function hiddenToday(id){try{return localStorage.getItem("raib-pop-"+id)===today()}catch(_){return false}}
function hideToday(id){try{localStorage.setItem("raib-pop-"+id,today())}catch(_){}}
function popHTML(pp,preview){
  const link=url(pp.link);
  const img=pp.image_url?(link&&!preview?`<a href="${esc(link)}" target="_blank" rel="noopener"><img src="${esc(pp.image_url)}" alt="${esc(pp.title)}"></a>`:`<img src="${esc(pp.image_url)}" alt="${esc(pp.title)}">`):"";
  return `<div class="pop-h"><span>${esc(pp.title||"공지")}</span>${preview?'<em>미리보기 · 끌어서 위치 조정</em>':""}</div>
  <div class="pop-b">${img}${pp.body?`<div class="tx">${esc(pp.body)}</div>`:""}${link?`<a class="more" href="${esc(link)}" target="_blank" rel="noopener"${preview?' tabindex="-1"':""}>자세히 보기 ↗</a>`:""}</div>
  <div class="pop-f"><button type="button" data-today${preview?" disabled":""}>오늘 하루 보지 않기</button><button type="button" data-x${preview?" disabled":""}>닫기 ✕</button></div>${preview?'<div class="grip" title="끌어서 크기 조절"></div>':""}`}
function placePop(el,pp,i,preview){
  const vw=innerWidth,vh=innerHeight,mob=vw<700&&!preview;
  const w=Math.min(pp.width||POPW,vw-(mob?24:16));let x,y;
  if(mob){x=Math.round((vw-w)/2)+i*8;y=118+i*14}
  else{x=Math.min(Math.max(8,pp.pos_x??40),Math.max(8,vw-w-8));y=Math.min(Math.max(8,pp.pos_y??120),Math.max(8,vh-160))}
  el.style.left=x+"px";el.style.top=y+"px";el.style.width=w+"px";
  el.style.maxHeight=(vh-y-12)+"px";el.style.height=pp.height?Math.min(pp.height,vh-y-12)+"px":"";
}
function dragBy(handle,onDrag){handle.addEventListener("pointerdown",e=>{if(e.button>0||e.target.closest("button,a"))return;e.preventDefault();
  const sx=e.clientX,sy=e.clientY;const st=onDrag(0,0,true);try{handle.setPointerCapture(e.pointerId)}catch(_){}
  const mv=ev=>onDrag(ev.clientX-sx,ev.clientY-sy,false,st);
  const up=()=>{handle.removeEventListener("pointermove",mv);handle.removeEventListener("pointerup",up);handle.removeEventListener("pointercancel",up)};
  handle.addEventListener("pointermove",mv);handle.addEventListener("pointerup",up);handle.addEventListener("pointercancel",up)})}
function makeMovable(el,onMove){dragBy(el.querySelector(".pop-h"),(dx,dy,start,st)=>{
  if(start)return{x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0};
  const x=Math.round(Math.max(0,Math.min(innerWidth-60,st.x+dx))),y=Math.round(Math.max(0,Math.min(innerHeight-44,st.y+dy)));
  el.style.left=x+"px";el.style.top=y+"px";onMove&&onMove(x,y)})}
function showPopups(){
  document.querySelectorAll(".pop:not(.preview)").forEach(x=>x.remove());
  const list=S.popups.filter(pp=>popState(pp)[1]==="on"&&!hiddenToday(pp.id)).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
  list.forEach((pp,i)=>{const el=document.createElement("div");el.className="pop";el.setAttribute("role","dialog");el.setAttribute("aria-label",pp.title||"공지");
    el._pp=pp;el._i=i;el.innerHTML=popHTML(pp,false);document.body.appendChild(el);placePop(el,pp,i,false);
    el.querySelector("[data-x]").onclick=()=>el.remove();
    el.querySelector("[data-today]").onclick=()=>{hideToday(pp.id);el.remove()};
    makeMovable(el)});
}
function popupManager(){
  if(!S.popupsOk){const m=modal(`<h2>팝업 관리</h2><div class="notice">팝업 기능을 쓰려면 Supabase SQL Editor에서 update-popup-lock.sql 을 한 번 실행해야 합니다.</div><div class="actions"><button class="btn" id="pm-x">닫기</button></div>`);m.querySelector("#pm-x").onclick=close;return}
  const rows=S.popups.slice().sort((a,b)=>String(b.start_date||"").localeCompare(String(a.start_date||""))||String(b.created_at).localeCompare(String(a.created_at)));
  const m=modal(`<h2>팝업 관리</h2><p class="hint">홈페이지에 들어오면 뜨는 공지 창입니다. 시작일부터 종료일까지만 보입니다.</p>
    ${rows.length?`<div class="tablewrap"><table><thead><tr><th>상태</th><th>제목</th><th>게시 기간</th><th></th></tr></thead><tbody>${rows.map(pp=>{const [st]=popState(pp);
      return `<tr><td>${st}</td><td><b>${esc(pp.title)}</b></td><td class="num nowrap">${pp.start_date?fmt(pp.start_date):"—"} ~ ${pp.end_date?fmt(pp.end_date):"계속"}</td><td class="num"><button class="lnk" data-pe="${pp.id}">수정</button></td></tr>`}).join("")}</tbody></table></div>`
      :`<p class="empty">아직 만든 팝업이 없습니다.</p>`}
    <div class="actions"><button class="btn ghost" id="pm-x">닫기</button><button class="btn" id="pm-new">새 팝업 만들기</button></div>`);
  m.querySelector("#pm-x").onclick=close;
  m.querySelector("#pm-new").onclick=()=>editPopup({});
  m.querySelectorAll("[data-pe]").forEach(b=>b.onclick=()=>editPopup(S.popups.find(x=>x.id===b.dataset.pe)));
}
function editPopup(pp){
  pp=pp||{};const isNew=!pp.id;
  const d=Object.assign({title:"",body:"",link:"",start_date:today(),end_date:addDays(14),active:true,pos_x:40,pos_y:120,width:POPW,height:null},pp);
  let img=d.image_url?{url:d.image_url,path:d.image_path||""}:null;
  const m=modal(`<h2>${isNew?"새 팝업 만들기":"팝업 수정"}</h2><form class="form" id="ppf">
    <label for="pp-title">제목<input id="pp-title" name="title" required value="${esc(d.title)}"></label>
    <label for="pp-body">내용 (선택)<textarea id="pp-body" name="body">${esc(d.body||"")}</textarea></label>
    <div><div class="lbl">이미지 (선택 · 한 장)</div><div class="pick" id="pp-pick"></div><input id="pp-file" type="file" accept="image/*" hidden></div>
    <label for="pp-link">눌렀을 때 열 주소 (선택)<input id="pp-link" name="link" type="url" placeholder="https://" value="${esc(d.link||"")}"></label>
    <div class="row2"><label for="pp-start">시작일<input id="pp-start" name="start_date" type="date" value="${esc(d.start_date||"")}"></label><label for="pp-end">종료일 (비우면 계속)<input id="pp-end" name="end_date" type="date" value="${esc(d.end_date||"")}"></label></div>
    <div class="row4"><label for="pp-x">왼쪽에서<input id="pp-x" name="pos_x" type="number" min="0" value="${esc(d.pos_x)}"></label><label for="pp-y">위에서<input id="pp-y" name="pos_y" type="number" min="0" value="${esc(d.pos_y)}"></label>
      <label for="pp-w">너비<input id="pp-w" name="width" type="number" min="200" max="1400" value="${esc(d.width)}"></label><label for="pp-h">높이<input id="pp-h" name="height" type="number" min="120" max="1200" value="${esc(d.height??"")}"></label></div>
    <p class="hint">점선 미리보기 창의 제목줄을 끌면 위치, 오른쪽 아래 모서리를 끌면 크기가 바뀝니다.</p>
    <label class="chk"><input type="checkbox" id="pp-on"${d.active?" checked":""}> 팝업 사용</label>
    <div class="err" id="pperr"></div>
    <div class="actions">${isNew?"":`<button type="button" class="btn danger" id="pp-del" style="margin-right:auto">삭제</button>`}<button type="button" class="btn ghost" id="pp-back">목록으로</button><button class="btn" id="pp-save">${isNew?"만들기":"저장"}</button></div></form>`);
  const f=m.querySelector("#ppf"),g=k=>(f.elements[k].value||"").trim(),setv=(k,v)=>{f.elements[k].value=v};
  const fileIn=m.querySelector("#pp-file");
  function drawPick(){const box=m.querySelector("#pp-pick");
    box.innerHTML=img?`<div class="it" style="background-image:url('${esc(img.url)}')"><button type="button" class="x" aria-label="이미지 빼기">×</button></div>`:`<button type="button" class="add" id="pp-add">+ 이미지</button>`;
    const x=box.querySelector(".x");x&&(x.onclick=()=>{if(img&&img.file)URL.revokeObjectURL(img.url);img=null;drawPick();drawPv()});
    const a=box.querySelector("#pp-add");a&&(a.onclick=()=>fileIn.click())}
  fileIn.onchange=()=>{const fl=fileIn.files[0];fileIn.value="";if(!fl||!/^image\//.test(fl.type))return;if(img&&img.file)URL.revokeObjectURL(img.url);img={file:fl,url:URL.createObjectURL(fl)};drawPick();drawPv()};
  drawPick();
  const pv=document.createElement("div");pv.className="pop preview";pv.setAttribute("aria-hidden","true");document.body.appendChild(pv);
  const cur=()=>({title:g("title"),body:g("body"),link:g("link"),image_url:img?img.url:"",pos_x:num(g("pos_x"))??40,pos_y:num(g("pos_y"))??120,width:num(g("width"))||POPW,height:num(g("height"))});
  function drawPv(){if(!document.body.contains(pv))return;pv.innerHTML=popHTML(cur(),true);placePop(pv,cur(),0,true);
    makeMovable(pv,(x,y)=>{setv("pos_x",x);setv("pos_y",y)});
    dragBy(pv.querySelector(".grip"),(dx,dy,start,st)=>{
      if(start)return{w:pv.offsetWidth,h:pv.offsetHeight};
      const w=Math.round(Math.max(220,Math.min(1400,st.w+dx))),h=Math.round(Math.max(140,Math.min(1200,st.h+dy)));
      pv.style.width=w+"px";pv.style.height=h+"px";pv.style.maxHeight="none";setv("width",w);setv("height",h)})}
  f.addEventListener("input",drawPv);drawPv();
  m.querySelector("#pp-back").onclick=popupManager;
  const del=m.querySelector("#pp-del");del&&(del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent="한 번 더 누르면 삭제";return}
    try{must(await sb.from("popups").delete().eq("id",pp.id));if(pp.image_path)sb.storage.from(BUCKET).remove([pp.image_path]).catch(()=>{});
      toast("팝업을 삭제했습니다");await loadAll();showPopups();popupManager()}catch(err){$("#pperr").textContent=errMsg(err)}});
  f.onsubmit=async e=>{e.preventDefault();const btn=$("#pp-save");$("#pperr").textContent="";
    const st=g("start_date"),en=g("end_date");
    if(st&&en&&en<st){$("#pperr").textContent="종료일이 시작일보다 앞에 있습니다.";return}
    btn.disabled=true;
    try{
      if(img&&img.file){btn.textContent="이미지 올리는 중…";const up=await uploadPhoto(img.file);URL.revokeObjectURL(img.url);img={url:up.url,path:up.path}}
      const row={title:g("title"),body:nz(g("body")),link:nz(g("link")),start_date:nz(st),end_date:nz(en),active:m.querySelector("#pp-on").checked,
        pos_x:num(g("pos_x"))??40,pos_y:num(g("pos_y"))??120,width:num(g("width"))||POPW,height:num(g("height")),
        image_url:img?img.url:null,image_path:img?(img.path||null):null,updated_at:new Date().toISOString()};
      if(isNew)must(await sb.from("popups").insert(row));else must(await sb.from("popups").update(row).eq("id",pp.id));
      if(pp.image_path&&pp.image_path!==row.image_path)sb.storage.from(BUCKET).remove([pp.image_path]).catch(()=>{});
      toast(isNew?"팝업을 만들었습니다":"저장했습니다");await loadAll();showPopups();popupManager();
    }catch(err){btn.disabled=false;btn.textContent=isNew?"만들기":"저장";$("#pperr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}

/* ---------- 비밀번호 재설정 ---------- */
function newPasswordModal(){
  const m=modal(`<h2>새 비밀번호 정하기</h2><form class="form" id="npf"><label for="np">새 비밀번호 (8자 이상)<input id="np" type="password" minlength="8" autocomplete="new-password" required></label><div class="err" id="nperr"></div><div class="actions"><button class="btn">저장</button></div></form>`);
  m.querySelector("#npf").onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.updateUser({password:$("#np").value});
    if(error){$("#nperr").textContent=errMsg(error);return}close();toast("비밀번호를 바꿨습니다")};
}

/* ---------- 시작 ---------- */
let rzT;addEventListener("resize",()=>{clearTimeout(rzT);rzT=setTimeout(()=>document.querySelectorAll(".pop:not(.preview)").forEach(el=>el._pp&&placePop(el,el._pp,el._i,false)),150)});
go((location.hash||"").slice(1).split("&")[0]);
if(!sb){S.loaded=true;render();return}
sb.auth.onAuthStateChange((ev,session)=>{
  setTimeout(async()=>{
    await loadAuth(session);
    if(ev==="SIGNED_IN")await ensureMemberRow(session);
    if(ev==="PASSWORD_RECOVERY")newPasswordModal();
    await loadAll();
  },0);
});
})();
