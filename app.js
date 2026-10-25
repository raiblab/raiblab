/* 레이브랩 RAIB Lab 홈페이지 — 화면 + Supabase(회원·게시글·사진) */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const fmt=ts=>{if(!ts)return"";const d=new Date(ts);return isNaN(d)?String(ts):d.getFullYear()+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0")};
const nz=v=>(v===""||v==null)?null:v;
const num=v=>(v===""||v==null||isNaN(Number(v)))?null:Number(v);

/* ---------- Supabase 연결 ---------- */
const CFG=window.RAIB_CONFIG||{};
const ready=CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/YOUR_/.test(CFG.SUPABASE_URL)&&window.supabase;
const sb=ready?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const BUCKET="photos";

/* ---------- 게시판 정의 ---------- */
const BOARDS={
  research:{name:"연구실적·공동연구",desc:"논문, 학술발표, 공동연구과제, 저서·보고서를 연도별로 정리합니다.",layout:"research",
    fields:[["kind","구분","select",["학술지 논문","학술대회 발표","공동연구과제","저서·보고서"]],["year","연도","number"],["title","제목","text",null,true],["authors","저자·참여연구원","text"],["venue","게재지·발주기관","text"],["link","링크 (선택)","url"],["body","요약 (선택)","textarea"]]},
  conference:{name:"학술대회",desc:"참가·발표한 학술대회와 세미나 기록입니다.",layout:"cards",photo:true,
    fields:[["title","학술대회명","text",null,true],["date","일자","date"],["place","장소","text"],["body","내용","textarea"]]},
  news:{name:"연구실 동정",desc:"연구실 구성원의 소식, 수상, 학위, 행사를 알립니다.",layout:"cards",photo:true,
    fields:[["title","제목","text",null,true],["date","일자","date"],["body","내용","textarea"]]},
  edu:{name:"미래교육원",desc:"상명대학교 미래교육원 빌딩관리사 자격증반·타로반 과정 소개와 강의 모습입니다.",layout:"cards",photo:true,filter:"kind",
    fields:[["kind","과정","select",["빌딩관리사 자격증반","타로반","기타"]],["title","제목","text",null,true],["date","일자","date"],["place","강의실·장소","text"],["body","소개·내용","textarea"]]},
  golf:{name:"친목도모",desc:"레이브랩 회원 친목 모임과 골프 라운딩 일정·후기입니다.",layout:"cards",photo:true,
    fields:[["title","제목","text",null,true],["date","일자","date"],["place","장소","text"],["body","내용","textarea"]]}
};
const TABS=[["home","홈"],["greeting","교수님 인사말"],["chair","회장 인사말"],["officers","임원·회원"],["research","연구실적"],["conference","학술대회"],["news","연구실 동정"],["edu","미래교육원"],["golf","친목도모"]];

/* ---------- 상태 ---------- */
const S={posts:[],pages:{},officers:[],members:[],admins:[],users:[],usersOk:false,loaded:false,f:{},session:null,myId:null,myEmail:"",canEdit:false,q:{}};
let current="home";
const myMember=()=>S.myId?S.members.find(m=>m.userId===S.myId):null;
const canWrite=()=>!!myMember()||S.canEdit;

/* ---------- DB ↔ 화면 변환 ---------- */
const toPost=r=>({id:r.id,board:r.board,title:r.title||"",body:r.body||"",date:r.date||"",place:r.place||"",kind:r.kind||"",year:r.year||"",authors:r.authors||"",venue:r.venue||"",source:r.source||"",link:r.link||"",authorName:r.author_name||"",authorId:r.author_id||"",photos:Array.isArray(r.photos)?r.photos:[],createdAt:r.created_at});
const fromPost=d=>({title:d.title,body:nz(d.body),date:nz(d.date),place:nz(d.place),kind:nz(d.kind),year:num(d.year),authors:nz(d.authors),venue:nz(d.venue),source:nz(d.source),link:nz(d.link),author_name:nz(d.authorName),photos:d.photos||[]});
const toOfficer=r=>({id:r.id,section:r.section||"임원",term:r.term||"",period:r.period||"",role:r.role||"",name:r.name||"",note:r.note||"",termOrder:r.term_order});
const toMember=r=>({id:r.id,userId:r.user_id||"",name:r.name||"",phone:r.phone||"",gen:r.gen||"",course:r.course||"",year:r.year||"",email:r.email||"",org:r.org||"",field:r.field||"",joinedAt:r.joined_at});

async function loadAll(){
  if(!sb){S.loaded=true;render();return}
  const [p,pg,o,m]=await Promise.all([
    sb.from("posts").select("*").order("created_at",{ascending:false}).limit(1000),
    sb.from("pages").select("*"),
    sb.from("officers").select("*"),
    S.session?sb.from("members").select("*"):Promise.resolve({data:[]})
  ]);
  S.posts=(p.data||[]).map(toPost);
  S.pages={};(pg.data||[]).forEach(r=>S.pages[r.key]=r);
  S.officers=(o.data||[]).map(toOfficer);
  S.members=(m.data||[]).map(toMember);
  S.admins=[];
  S.users=[];S.usersOk=false;
  if(S.canEdit){const [a,u]=await Promise.all([sb.from("admins").select("user_id"),sb.rpc("admin_list_users")]);
    S.admins=(a.data||[]).map(r=>r.user_id);
    if(!u.error){S.users=u.data||[];S.usersOk=true}}
  S.loaded=true;render();
}
async function loadAuth(session){
  S.session=session||null;S.myId=session?session.user.id:null;S.myEmail=session?session.user.email:"";S.canEdit=false;
  if(sb&&S.myId){const {data}=await sb.from("admins").select("user_id").eq("user_id",S.myId).maybeSingle();S.canEdit=!!data}
}
function must(res){if(res&&res.error)throw res.error;return res}
/* 새로 추가한 열(phone, section)이 DB에 없으면 빼고 저장하지 않고 안내 */
async function save(run,row,cols){const r=await run(row);
  if(r.error&&cols.some(c=>String(r.error.message||"").includes(c)))throw {message:"데이터베이스 업데이트가 아직 안 되었습니다. Supabase SQL Editor에서 2026-10-25 업데이트 SQL을 실행한 뒤 다시 저장해 주세요."};
  return must(r)}

/* ---------- 탭 ---------- */
$("#tabs").innerHTML=TABS.map(([k,l])=>`<a href="#${k}" data-k="${k}">${l}</a>`).join("");
function go(k){
  if(k==="members")k="officers";
  if(!TABS.some(t=>t[0]===k))k="home";
  current=k;
  document.querySelectorAll(".view").forEach(v=>v.hidden=v.id!=="v-"+k);
  document.querySelectorAll("#tabs a").forEach(a=>{if(a.dataset.k===k)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  const act=document.querySelector(`#tabs a[data-k="${k}"]`);act&&act.scrollIntoView({block:"nearest",inline:"nearest"});
  render();window.scrollTo(0,0);
}
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const k=a.getAttribute("href").slice(1);if(TABS.some(t=>t[0]===k)){e.preventDefault();history.replaceState(null,"","#"+k);go(k)}});

/* ---------- 렌더 ---------- */
function postsOf(b){return S.posts.filter(p=>p.board===b)}
function sortKey(p){return p.date||p.createdAt||""}
function render(){
  const sg=$("#signin");if(sg)sg.hidden=!!sb;
  renderWho();renderHome();
  if(current==="greeting")renderLetter("greeting","교수님 인사말","지도교수","전해정 교수","상명대학교 일반대학원 부동산학 박사 연구실");
  if(current==="chair")renderLetter("chair","회장 인사말","레이브랩 회장","","레이브랩 RAIB Lab");
  if(current==="officers"){renderOfficers();renderMembers()}
  if(BOARDS[current])renderBoard(current);
}
function renderWho(){
  const w=$("#who");const mem=myMember();const adm=S.canEdit?'<span class="adm">관리자</span>':"";
  if(S.session){
    w.innerHTML=`${adm}<button class="hbtn" id="h-me">${esc(mem?mem.name+"님":"내 정보")}</button><button class="hbtn" id="h-out">로그아웃</button>`;
    $("#h-me").onclick=()=>mem?editMember(mem,true):editMember({},true);
    $("#h-out").onclick=async()=>{await sb.auth.signOut();toast("로그아웃했습니다")};
  }else{
    w.innerHTML=`<button class="hbtn" id="h-login">로그인</button><button class="hbtn solid" id="h-join">회원가입</button>`;
    $("#h-login").onclick=loginModal;$("#h-join").onclick=signupModal;
  }
}
function loadingOr(html){return S.loaded?html:`<div class="empty">불러오는 중…</div>`}
function renderHome(){
  const HB=["news","conference","research","edu","golf"];
  $("#home-grid").innerHTML=HB.map((b,i)=>{
    const list=postsOf(b).sort((a,c)=>sortKey(c).localeCompare(sortKey(a))).slice(0,5);
    const items=list.length?`<ul class="mini">${list.map(p=>`<li><a href="#${b}" data-open="${p.id}">${esc(p.title)}</a><time>${fmt(p.date||p.createdAt)}</time></li>`).join("")}</ul>`:`<div class="empty">아직 등록된 글이 없습니다.</div>`;
    return `<div class="panel${HB.length%2&&i===HB.length-1?" wide":""}"><h3>${BOARDS[b].name}<a href="#${b}">전체 보기 →</a></h3>${loadingOr(items)}</div>`;
  }).join("");
}
function renderLetter(key,title,role,defName,aff){
  const p=S.pages[key]||{};const el=$("#v-"+key);
  const body=p.body?esc(p.body):`<span class="empty">${S.loaded?"아직 인사말이 등록되지 않았습니다."+(S.canEdit?" 오른쪽 위 ‘인사말 편집’을 눌러 작성해 주세요.":""):"불러오는 중…"}</span>`;
  el.innerHTML=`<div class="sec-h"><div><h2>${title}</h2></div>${S.canEdit?`<button class="btn ghost" id="edit-${key}">인사말 편집</button>`:""}</div>
  <article class="letter"><aside><div class="role">${esc(p.role||role)}</div><div class="nm">${esc(p.name||defName||"—")}</div><div class="aff">${esc(p.aff||aff)}</div></aside>
  <div class="body">${p.heading?`<h3>${esc(p.heading)}</h3>`:""}${body}${p.body&&p.name?`<div class="sign">${esc(p.aff||aff)} ${esc(p.role||role)} ${esc(p.name)}</div>`:""}</div></article>`;
  const b=$("#edit-"+key);b&&(b.onclick=()=>editLetter(key,title,role,defName,aff));
}
const ROLES=["회장","부회장","총무","감사","이사"];
const SECTIONS=[["임원","off-box","역대 임원","기수별 회장단과 임원 명단입니다."],["골프 임원","golf-off-box","골프 임원","골프 동호회 임원 명단입니다."]];
function roleRank(r){const i=ROLES.indexOf(String(r||"").trim());return i<0?9:i}
function renderOfficers(){SECTIONS.forEach(([sec,box,title,desc])=>renderOfficerSection(sec,box,title,desc))}
function renderOfficerSection(sec,box,title,desc){
  const el=$("#"+box);const terms={};
  S.officers.filter(o=>o.section===sec).forEach(o=>{(terms[o.term]=terms[o.term]||[]).push(o)});
  const keys=Object.keys(terms).sort((a,b)=>(terms[b][0].termOrder||0)-(terms[a][0].termOrder||0)||b.localeCompare(a,"ko"));
  const body=keys.length?keys.map(t=>{const rows=terms[t].sort((a,b)=>roleRank(a.role)-roleRank(b.role)||String(a.name).localeCompare(String(b.name),"ko"));
    return `<div class="officer-term"><h3>${esc(t)}${rows[0].period?`<small>${esc(rows[0].period)}</small>`:""}</h3><div class="tablewrap off-t"><table><thead><tr><th>직책</th><th>성명</th><th>소속</th>${S.canEdit?"<th></th>":""}</tr></thead><tbody>${rows.map(r=>`<tr><td style="white-space:nowrap;font-weight:600">${esc(r.role)}</td><td style="white-space:nowrap">${esc(r.name)}</td><td>${esc(r.note)}</td>${S.canEdit?`<td class="num"><button class="btn sm ghost" data-off-edit="${r.id}">수정</button></td>`:""}</tr>`).join("")}</tbody></table></div></div>`}).join("")
    :`<div class="panel"><div class="empty">${S.loaded?"아직 등록된 "+title+" 명단이 없습니다."+(S.canEdit?" ‘"+title+" 추가’로 명단을 입력해 주세요.":""):"불러오는 중…"}</div></div>`;
  el.innerHTML=`<div class="sec-h"><div><h2>${title}</h2><p>${desc}</p></div>${S.canEdit?`<button class="btn" data-off-add="1">${title} 추가</button>`:""}</div>${body}`;
  const a=el.querySelector("[data-off-add]");a&&(a.onclick=()=>editOfficer({section:sec}));
  el.querySelectorAll("[data-off-edit]").forEach(b=>b.onclick=()=>editOfficer(S.officers.find(o=>o.id===b.dataset.offEdit)));
}
function renderBoard(b){
  const cfg=BOARDS[b],el=$("#v-"+b);
  const q=(S.q[b]||"").trim().toLowerCase();
  const fv=cfg.filter?(S.f[b]||""):"";
  let list=postsOf(b).filter(p=>!fv||p[cfg.filter]===fv).filter(p=>!q||[p.title,p.body,p.authors,p.venue,p.place,p.authorName].join(" ").toLowerCase().includes(q));
  const keep=document.activeElement&&document.activeElement.id==="q-"+b;
  let inner;
  if(!S.loaded)inner=`<div class="panel"><div class="empty">불러오는 중…</div></div>`;
  else if(!list.length)inner=`<div class="panel"><div class="empty">${q?"검색 결과가 없습니다.":"아직 등록된 글이 없습니다."+(canWrite()?" ‘글쓰기’로 첫 글을 올려 주세요.":"")}</div></div>`;
  else if(cfg.layout==="cards"){
    list.sort((a,c)=>sortKey(c).localeCompare(sortKey(a)));
    inner=`<div class="cards">${list.map(p=>{const ps=p.photos;return `<button class="card" data-open="${p.id}">${ps.length?`<div class="ph" style="background-image:url('${esc(ps[0].url)}')">${ps.length>1?`<span class="n">사진 ${ps.length}장</span>`:""}</div>`:`<div class="ph none">RAIB</div>`}<div class="cb">${p.kind?`<span class="kind">${esc(p.kind)}</span>`:""}<div class="cm">${fmt(p.date||p.createdAt)}${p.place?" · "+esc(p.place):""}</div><div class="ct">${esc(p.title)}</div>${p.body?`<div class="cx">${esc(p.body)}</div>`:""}</div></button>`}).join("")}</div>`;
  }else{
    const years={};list.forEach(p=>{const y=p.year||"연도 미기재";(years[y]=years[y]||[]).push(p)});
    inner=Object.keys(years).sort((a,c)=>String(c).localeCompare(String(a))).map(y=>`<div class="year-h">${esc(y)}</div><div class="tablewrap"><table><thead><tr><th>구분</th><th>제목</th><th>저자·참여</th><th>게재지·발주기관</th></tr></thead><tbody>${years[y].map(p=>`<tr class="row" data-open="${p.id}"><td><span class="kind">${esc(p.kind)}</span></td><td style="font-weight:600">${esc(p.title)}</td><td>${esc(p.authors)}</td><td>${esc(p.venue)}</td></tr>`).join("")}</tbody></table></div>`).join("");
  }
  el.innerHTML=`<div class="sec-h"><div><h2>${cfg.name}</h2><p>${cfg.desc}</p></div><div class="toolbar"><input class="search" id="q-${b}" type="search" placeholder="검색" value="${esc(S.q[b]||"")}">${canWrite()?`<button class="btn" id="w-${b}">글쓰기</button>`:(S.session?"":`<button class="btn ghost" id="w-login">로그인하고 글쓰기</button>`)}</div></div>${cfg.filter?`<div class="ftabs">${[""].concat(cfg.fields.find(f=>f[0]===cfg.filter)[3]).map(o=>`<button type="button" data-f="${esc(o)}"${o===fv?' aria-pressed="true"':""}>${o?esc(o):"전체"} <small>${o?postsOf(b).filter(p=>p[cfg.filter]===o).length:postsOf(b).length}</small></button>`).join("")}</div>`:""}${inner}`;
  el.querySelectorAll("[data-f]").forEach(x=>x.onclick=()=>{S.f[b]=x.dataset.f;renderBoard(b)});
  const qi=$("#q-"+b);qi.oninput=()=>{S.q[b]=qi.value;renderBoard(b)};
  if(keep){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}
  const w=$("#w-"+b);w&&(w.onclick=()=>editPost(b));
  const wl=$("#w-login");wl&&(wl.onclick=loginModal);
}
document.addEventListener("click",e=>{const t=e.target.closest("[data-open]");if(!t)return;e.preventDefault();
  const p=S.posts.find(x=>x.id===t.dataset.open);if(!p)return;
  if(current!==p.board){history.replaceState(null,"","#"+p.board);go(p.board)}
  viewPost(p)});

/* ---------- 모달 ---------- */
function modal(html){const r=$("#modal-root");r.innerHTML=`<div class="overlay" id="ov"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  $("#ov").addEventListener("click",e=>{if(e.target.id==="ov")close()});return r.querySelector(".modal")}
function close(){$("#modal-root").innerHTML=""}
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2400)}
function mine(p){return S.canEdit||(S.myId&&p.authorId===S.myId)}
function errMsg(e){const m=(e&&(e.message||e.error_description||e.code))||"오류";
  if(/Invalid login credentials/i.test(m))return"이메일 또는 비밀번호가 맞지 않습니다.";
  if(/already registered|already been registered/i.test(m))return"이미 가입된 이메일입니다. 로그인해 주세요.";
  if(/Password should be/i.test(m))return"비밀번호는 8자 이상으로 정해 주세요.";
  if(/Email not confirmed/i.test(m))return"이메일 인증이 아직 안 되었습니다. 받은편지함의 인증 메일을 확인해 주세요.";
  if(/rate limit/i.test(m))return"잠시 요청이 많았습니다. 몇 분 뒤에 다시 시도해 주세요.";
  if(/row-level security|permission/i.test(m))return"권한이 없습니다. 로그인 상태와 회원가입 여부를 확인해 주세요.";
  return m}

/* ---------- 로그인·회원가입 ---------- */
function loginModal(){
  if(!sb){toast("홈페이지 설정(Supabase 연결)이 아직 끝나지 않았습니다");return}
  const m=modal(`<h2>로그인</h2><form class="form" id="lgf">
    <label for="lg-email">이메일<input id="lg-email" name="email" type="email" autocomplete="email" required></label>
    <label for="lg-pw">비밀번호<input id="lg-pw" name="pw" type="password" autocomplete="current-password" required></label>
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
const courseClass=c=>({"박사":"c-doc","박사수료":"c-abd","박사과정":"c-cand"})[c]||"";
function memberFields(m){return `
    <div class="row2"><label for="m-name">성명<input id="m-name" name="name" required value="${esc(m.name)}"></label>
    <label for="m-course">과정<select id="m-course" name="course">${COURSES.map(c=>`<option${c===m.course?" selected":""}>${c}</option>`).join("")}</select></label></div>
    <div class="row2"><label for="m-gen">기수 (숫자만, 예: 3)<input id="m-gen" name="gen" type="number" min="1" max="200" required value="${esc(m.gen)}"></label><label for="m-year">입학 연도 (선택)<input id="m-year" name="year" type="number" min="1990" max="2100" value="${esc(m.year)}"></label></div>
    <label for="m-email">명단에 표시할 이메일 (선택)<input id="m-email" name="email" type="email" value="${esc(m.email)}"></label>
    <label for="m-org">직장·직위 (선택)<input id="m-org" name="org" placeholder="예: ○○공사 차장" value="${esc(m.org)}"></label>
    <label for="m-field">연구분야<input id="m-field" name="field" placeholder="예: 전세시장, 머신러닝" value="${esc(m.field)}"></label>`}
function readMember(fd){const d={};["name","gen","course","year","email","org","field"].forEach(k=>d[k]=(fd.get(k)||"").toString().trim());
  return {name:d.name,gen:num(d.gen),course:d.course,year:num(d.year),email:nz(d.email),org:nz(d.org),field:nz(d.field)}}
function signupModal(){
  if(!sb){toast("홈페이지 설정(Supabase 연결)이 아직 끝나지 않았습니다");return}
  if(S.session){editMember({},true);return}
  const m=modal(`<h2>회원가입</h2><form class="form" id="suf">
    <div class="notice">레이브랩 구성원을 위한 가입입니다. 가입하면 회원 명단에 자동으로 올라가고, 회원 명단은 로그인한 회원끼리만 볼 수 있습니다.</div>
    <div class="row2"><label for="su-email">로그인 이메일<input id="su-email" name="loginEmail" type="email" autocomplete="email" required></label>
    <label for="su-pw">비밀번호 (8자 이상)<input id="su-pw" name="pw" type="password" minlength="8" autocomplete="new-password" required></label></div>
    ${memberFields({})}
    <div class="err" id="suerr"></div>
    <div class="actions"><button type="button" class="btn ghost" id="su-c">취소</button><button class="btn" id="su-go">가입하기</button></div></form>`);
  m.querySelector("#su-c").onclick=close;
  m.querySelector("#suf").onsubmit=async e=>{e.preventDefault();const b=$("#su-go");b.disabled=true;$("#suerr").textContent="";
    const fd=new FormData(e.target);const prof=readMember(fd);const email=fd.get("loginEmail").toString().trim();
    try{
      const {data,error}=await sb.auth.signUp({email,password:fd.get("pw").toString(),options:{data:{pending_member:prof}}});
      if(error)throw error;
      if(data.session){close();toast("회원가입이 완료되었습니다")}  /* 명단 등록은 로그인 이벤트에서 자동 처리 */
      else{close();modal(`<h2>인증 메일을 보냈습니다</h2><div class="content">${esc(email)}로 보낸 메일의 링크를 누른 뒤 로그인하시면 회원 명단에 자동으로 올라갑니다.</div><div class="actions"><button class="btn" onclick="document.getElementById('modal-root').innerHTML=''">확인</button></div>`)}
    }catch(err){b.disabled=false;$("#suerr").textContent=errMsg(err)}};
}
async function insertSelf(prof){await save(r=>sb.from("members").insert(r),Object.assign({user_id:S.myId},prof),["phone"])}
/* 이메일 인증 후 처음 로그인하면 가입 때 적은 정보로 명단에 자동 등록 */
async function ensureMemberRow(session){
  const pend=session&&session.user&&session.user.user_metadata&&session.user.user_metadata.pending_member;
  if(!pend||!S.myId)return;
  const {data}=await sb.from("members").select("id").eq("user_id",S.myId).maybeSingle();
  if(!data){try{await insertSelf(pend)}catch(_){}}
  try{await sb.auth.updateUser({data:{pending_member:null}})}catch(_){}
}

/* ---------- 사진 ---------- */
function gallery(ps){if(!ps.length)return"";
  return `<div class="gal"><img class="main" src="${esc(ps[0].url)}" alt="첨부 사진">${ps.length>1?`<div class="cnt">1 / ${ps.length}</div><div class="thumbs">${ps.map((x,i)=>`<button type="button" data-i="${i}" aria-label="사진 ${i+1}" aria-current="${i===0}" style="background-image:url('${esc(x.url)}')"></button>`).join("")}</div>`:""}</div>`}
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
  const cfg=BOARDS[p.board];
  const meta=[cfg.name,p.kind,p.year,p.date&&fmt(p.date),p.place,p.authors,p.venue,p.authorName&&"작성 "+p.authorName,p.createdAt&&"등록 "+fmt(p.createdAt)].filter(Boolean);
  let link="";if(p.link&&/^https?:\/\//i.test(p.link))link=`<p><a href="${esc(p.link)}" target="_blank" rel="noopener">원문·자료 보기 ↗</a></p>`;
  const m=modal(`<h2>${esc(p.title)}</h2><div class="meta">${meta.map(x=>`<span>${esc(x)}</span>`).join("")}</div>${gallery(p.photos)}<div class="content">${esc(p.body)}</div>${link}
  <div class="actions" id="acts">${mine(p)?`<button class="btn danger" id="del">삭제</button><button class="btn ghost" id="ed">수정</button>`:""}<button class="btn" id="cl">닫기</button></div>`);
  m.querySelector("#cl").onclick=close;
  const gm=m.querySelector(".gal .main");if(gm){const ps=p.photos;m.querySelectorAll(".thumbs button").forEach(t=>t.onclick=()=>{const i=+t.dataset.i;gm.src=ps[i].url;m.querySelectorAll(".thumbs button").forEach(x=>x.setAttribute("aria-current",x===t?"true":"false"));m.querySelector(".gal .cnt").textContent=(i+1)+" / "+ps.length})}
  const ed=m.querySelector("#ed");ed&&(ed.onclick=()=>editPost(p.board,p));
  const del=m.querySelector("#del");del&&(del.onclick=()=>{
    $("#acts").innerHTML=`<span class="err" style="margin-right:auto">이 글을 삭제할까요? 되돌릴 수 없습니다.</span><button class="btn ghost" id="no">취소</button><button class="btn danger" id="yes">삭제</button>`;
    $("#no").onclick=()=>viewPost(p);
    $("#yes").onclick=async()=>{try{must(await sb.from("posts").delete().eq("id",p.id));
      const paths=p.photos.map(x=>x.path).filter(Boolean);if(paths.length)sb.storage.from(BUCKET).remove(paths).catch(()=>{});
      close();toast("삭제했습니다");loadAll()}catch(e){toast("삭제하지 못했습니다: "+errMsg(e))}};
  });
}
function field([k,label,type,opts,req],val){
  const id="f-"+k;val=val??"";
  if(type==="textarea")return `<label for="${id}">${label}<textarea id="${id}" name="${k}">${esc(val)}</textarea></label>`;
  if(type==="select")return `<label for="${id}">${label}<select id="${id}" name="${k}">${opts.map(o=>`<option${o===val?" selected":""}>${o}</option>`).join("")}</select></label>`;
  return `<label for="${id}">${label}<input id="${id}" name="${k}" type="${type}" value="${esc(val)}"${req?" required":""}${type==="number"?' min="1990" max="2100"':""}></label>`;
}
function editPost(b,p){
  const cfg=BOARDS[b];p=p||{};const mem=myMember();
  const defaults={date:today(),year:new Date().getFullYear(),authorName:(mem&&mem.name)||""};
  const v=k=>(p[k]!==undefined&&p[k]!=="")?p[k]:(defaults[k]??"");
  const m=modal(`<h2>${cfg.name} ${p.id?"글 수정":"글쓰기"}</h2><form class="form" id="pf">
    ${cfg.fields.map(f=>field(f,v(f[0]))).join("")}
    <label for="f-authorName">작성자 표시 이름<input id="f-authorName" name="authorName" value="${esc(v("authorName"))}"></label>
    ${cfg.photo?`<div><div style="font-size:13px;color:var(--muted);font-weight:500;margin-bottom:6px">사진 (여러 장 선택 가능, 최대 ${MAXPH}장 · 첫 사진이 대표 사진)</div><div style="font-size:12.5px;color:var(--muted);margin:-2px 0 8px">이미지를 복사한 뒤 이 창에서 <b>Ctrl+V</b>(맥은 ⌘+V)로 붙여넣거나, 사진 파일을 아래로 끌어다 놓아도 됩니다.</div><div class="pick" id="pick"></div><input id="f-photo" type="file" accept="image/*" multiple hidden></div>`:""}
    <div class="err" id="perr"></div>
    <div class="actions"><button type="button" class="btn ghost" id="cancel">취소</button><button class="btn" id="save">${p.id?"저장":"등록"}</button></div></form>`);
  const ph=m.querySelector("#f-photo");
  const items=(p.photos||[]).map(x=>({url:x.url,path:x.path||""}));
  function drawPick(){const box=m.querySelector("#pick");if(!box)return;
    box.innerHTML=items.map((x,i)=>`<div class="it" style="background-image:url('${esc(x.url)}')">${i===0?'<span class="first">대표</span>':""}<button type="button" class="x" data-i="${i}" aria-label="사진 빼기">×</button></div>`).join("")+(items.length<MAXPH?`<button type="button" class="add" id="addph">+ 사진<br>추가</button>`:"");
    box.querySelectorAll(".x").forEach(b=>b.onclick=()=>{const it=items.splice(+b.dataset.i,1)[0];if(it&&it.file)URL.revokeObjectURL(it.url);drawPick()});
    const a=box.querySelector("#addph");a&&(a.onclick=()=>ph.click())}
  function addFiles(fl){fl=fl.filter(f=>f&&/^image\//.test(f.type));if(!fl.length)return false;const room=MAXPH-items.length;
    fl.slice(0,room).forEach(f=>items.push({file:f,url:URL.createObjectURL(f)}));
    $("#perr").textContent=fl.length>room?`사진은 최대 ${MAXPH}장까지 올릴 수 있어 ${fl.length-room}장은 빠졌습니다.`:"";
    drawPick();return true}
  if(ph){ph.onchange=()=>{addFiles([...ph.files]);ph.value=""};drawPick();
    const onPaste=e=>{if(!document.body.contains(m)){document.removeEventListener("paste",onPaste);return}
      const cd=e.clipboardData;if(cd&&/^(INPUT|TEXTAREA)$/.test((e.target||{}).tagName||"")&&cd.getData("text/plain"))return;
      if(addFiles([...((cd&&cd.items)||[])].filter(i=>i.kind==="file").map(i=>i.getAsFile()))){e.preventDefault();toast("붙여넣은 사진을 추가했습니다")}};
    document.addEventListener("paste",onPaste);
    const box=m.querySelector("#pick");
    box.addEventListener("dragover",e=>{e.preventDefault();box.classList.add("drop")});
    box.addEventListener("dragleave",()=>box.classList.remove("drop"));
    box.addEventListener("drop",e=>{e.preventDefault();box.classList.remove("drop");addFiles([...(e.dataTransfer?e.dataTransfer.files:[])])})}
  m.querySelector("#cancel").onclick=()=>p.id?viewPost(p):close();
  m.querySelector("#pf").onsubmit=async e=>{
    e.preventDefault();const btn=$("#save");btn.disabled=true;$("#perr").textContent="";
    const fd=new FormData(e.target);const data={};
    cfg.fields.forEach(([k])=>data[k]=(fd.get(k)||"").toString().trim());
    data.authorName=(fd.get("authorName")||"").toString().trim();
    if(!data.title){$("#perr").textContent="제목을 입력해 주세요.";btn.disabled=false;return}
    try{
      const news=items.filter(x=>x.file);let n=0;
      for(const it of items){if(!it.file)continue;n++;btn.textContent=`사진 올리는 중 ${n}/${news.length}`;
        const up=await uploadPhoto(it.file);URL.revokeObjectURL(it.url);it.url=up.url;it.path=up.path;delete it.file}
      data.photos=items.map(x=>({url:x.url,path:x.path||""}));
      const row=fromPost(data);
      if(p.id){row.updated_at=new Date().toISOString();must(await sb.from("posts").update(row).eq("id",p.id));toast("저장했습니다")}
      else{row.board=b;row.author_id=S.myId;must(await sb.from("posts").insert(row));toast("등록했습니다")}
      close();loadAll();
    }catch(err){btn.disabled=false;btn.textContent=p.id?"저장":"등록";$("#perr").textContent="저장하지 못했습니다. "+errMsg(err)}
  };
}

/* ---------- 인사말·임원 (관리자) ---------- */
function editLetter(key,title,role,defName,aff){
  const p=S.pages[key]||{};
  const m=modal(`<h2>${title} 편집</h2><form class="form" id="lf">
    <div class="row2"><label for="l-name">성명<input id="l-name" name="name" value="${esc(p.name||defName)}"></label><label for="l-role">직함<input id="l-role" name="role" value="${esc(p.role||role)}"></label></div>
    <label for="l-aff">소속<input id="l-aff" name="aff" value="${esc(p.aff||aff)}"></label>
    <label for="l-heading">제목 (선택)<input id="l-heading" name="heading" value="${esc(p.heading||"")}"></label>
    <label for="l-body">인사말 본문<textarea id="l-body" name="body" style="min-height:300px">${esc(p.body||"")}</textarea></label>
    <div class="err" id="lerr"></div>
    <div class="actions"><button type="button" class="btn ghost" id="lc">취소</button><button class="btn">저장</button></div></form>`);
  m.querySelector("#lc").onclick=close;
  m.querySelector("#lf").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const d={key};["name","role","aff","heading","body"].forEach(k=>d[k]=(fd.get(k)||"").toString().trim());d.updated_at=new Date().toISOString();
    try{must(await sb.from("pages").upsert(d));close();toast("저장했습니다");loadAll()}catch(err){$("#lerr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}
function editOfficer(o){
  o=o||{};
  const m=modal(`<h2>임원 ${o.id?"수정":"추가"}</h2><form class="form" id="of">
    <label for="o-section">구분<select id="o-section" name="section">${SECTIONS.map(([x])=>`<option${x===(o.section||"임원")?" selected":""}>${x}</option>`).join("")}</select></label>
    <div class="row2"><label for="o-term">기수<input id="o-term" name="term" placeholder="예: 제1기" value="${esc(o.term||"")}" required></label><label for="o-period">임기<input id="o-period" name="period" placeholder="예: 2025.03 – 2027.02" value="${esc(o.period||"")}"></label></div>
    <div class="row2"><label for="o-role">직책<select id="o-role" name="role">${(ROLES.includes(o.role)||!o.role?ROLES:ROLES.concat([o.role])).map(r=>`<option${r===o.role?" selected":""}>${esc(r)}</option>`).join("")}</select></label><label for="o-name">성명<input id="o-name" name="name" value="${esc(o.name||"")}" required></label></div>
    <label for="o-note">소속<input id="o-note" name="note" value="${esc(o.note||"")}"></label>
    <div class="row2"><label for="o-termOrder">기수 순번 (숫자가 클수록 위에 표시)<input id="o-termOrder" name="termOrder" type="number" value="${esc(o.termOrder??"")}"></label></div>
    <div class="err" id="oerr"></div>
    <div class="actions">${o.id?`<button type="button" class="btn danger" id="odel" style="margin-right:auto">삭제</button>`:""}<button type="button" class="btn ghost" id="oc">취소</button><button class="btn">저장</button></div></form>`);
  m.querySelector("#oc").onclick=close;
  const od=m.querySelector("#odel");od&&(od.onclick=async()=>{if(od.dataset.sure){try{must(await sb.from("officers").delete().eq("id",o.id));close();toast("삭제했습니다");loadAll()}catch(err){$("#oerr").textContent=errMsg(err)}}else{od.dataset.sure=1;od.textContent="한 번 더 누르면 삭제"}});
  m.querySelector("#of").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const g=k=>(fd.get(k)||"").toString().trim();
    const d={section:g("section")||"임원",term:g("term"),period:nz(g("period")),role:g("role"),name:g("name"),note:nz(g("note")),term_order:num(g("termOrder"))};
    try{if(o.id)await save(r=>sb.from("officers").update(r).eq("id",o.id),d,["section"]);else await save(r=>sb.from("officers").insert(r),d,["section"]);close();toast("저장했습니다");loadAll()}catch(err){$("#oerr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}

/* ---------- 회원 명단 ---------- */
function renderMembers(){
  const el=$("#v-members");
  if(!S.session){el.innerHTML=`<div class="sec-h"><div><h2>회원</h2><p>레이브랩 회원 명단입니다.</p></div><div class="toolbar"><button class="btn ghost" id="mm-login">로그인</button><button class="btn" id="mm-join">회원가입</button></div></div><div class="panel"><div class="empty">회원 명단은 로그인한 회원에게만 보입니다.</div></div>`;
    $("#mm-login").onclick=loginModal;$("#mm-join").onclick=signupModal;return}
  const adm=S.canEdit;
  const q=(S.q.members||"").trim().toLowerCase();const fc=S.f.members||"";
  const keep=document.activeElement&&document.activeElement.id==="q-members";
  const mineRow=myMember();
  const U={};S.users.forEach(u=>U[u.id]=u);
  const list=S.members.filter(m=>!fc||m.course===fc).filter(m=>!q||[m.name,m.course,m.year,m.org,m.field,m.email,m.gen?m.gen+"기":"",adm&&U[m.userId]?U[m.userId].email:""].join(" ").toLowerCase().includes(q))
    .sort((a,b)=>(Number(a.gen)||9999)-(Number(b.gen)||9999)||(COURSES.indexOf(a.course)+1||99)-(COURSES.indexOf(b.course)+1||99)||String(a.name).localeCompare(String(b.name),"ko"));
  let btns=mineRow?`<button class="btn ghost" id="m-mine">내 회원정보 수정</button>`:`<button class="btn" id="m-join">명단에 내 정보 등록</button>`;
  if(adm)btns+=`<button class="btn ghost" id="m-add">회원 추가</button>`;
  const chips=`<div class="ftabs">${[""].concat(COURSES).map(c=>`<button type="button" data-mf="${esc(c)}"${c===fc?' aria-pressed="true"':""}>${c||"전체"} <small>${c?S.members.filter(m=>m.course===c).length:S.members.length}</small></button>`).join("")}</div>`;
  const ah=adm?"<th>로그인 계정</th><th>가입일</th><th>최근 접속</th>":"";
  const ac=m=>{if(!adm)return"";const u=U[m.userId];
    return u?`<td style="white-space:nowrap">${esc(u.email)}</td><td class="num">${fmt(u.created_at)}</td><td class="num">${u.last_sign_in_at?fmt(u.last_sign_in_at):"—"}</td>`
      :`<td style="white-space:nowrap;color:var(--muted)">${m.userId?(S.usersOk?"—":"…"):"계정 없음"}</td><td class="num">${fmt(m.joinedAt)}</td><td class="num">—</td>`};
  const inner=!S.loaded?`<div class="panel"><div class="empty">불러오는 중…</div></div>`
    :!list.length?`<div class="panel"><div class="empty">${q||fc?"검색 결과가 없습니다.":"아직 등록된 회원이 없습니다."}</div></div>`
    :`<div class="tablewrap"><table><thead><tr><th>번호</th><th>기수</th><th>성명</th><th>과정</th><th>입학</th><th>직장·직위</th><th>연구분야</th><th>이메일</th>${ah}<th></th></tr></thead><tbody>${list.map((m,i)=>`<tr><td class="num">${i+1}</td><td class="num" style="color:var(--ink);font-weight:600">${m.gen?esc(m.gen)+"기":"—"}</td><td style="white-space:nowrap;font-weight:600">${esc(m.name)}${m.userId&&m.userId===S.myId?' <span class="kind">나</span>':""}${adm&&m.userId&&S.admins.includes(m.userId)?' <span class="adm">관리자</span>':""}</td><td><span class="kind ${courseClass(m.course)}">${esc(m.course)}</span></td><td class="num">${esc(m.year)}</td><td style="white-space:nowrap">${esc(m.org)}</td><td style="white-space:nowrap">${esc(m.field)}</td><td style="white-space:nowrap">${esc(m.email)}</td>${ac(m)}<td class="num" style="white-space:nowrap">${(adm||(m.userId&&m.userId===S.myId))?`<button class="btn sm ghost" data-mem="${m.id}">수정</button>`:""}${adm&&m.userId!==S.myId?` <button class="btn sm danger" data-out="${m.id}">탈퇴</button>`:""}</td></tr>`).join("")}</tbody></table></div>`;
  /* 관리자: 가입은 했지만 명단에 없는 계정 */
  let orphan="";
  if(adm&&S.usersOk){const has=new Set(S.members.map(m=>m.userId).filter(Boolean));
    const os=S.users.filter(u=>!has.has(u.id)&&(!q||String(u.email).toLowerCase().includes(q)));
    if(os.length)orphan=`<h3 class="sub-h">명단에 없는 가입 계정 <small>${os.length}개</small></h3><div class="tablewrap"><table><thead><tr><th>로그인 계정</th><th>가입일</th><th>최근 접속</th><th></th></tr></thead><tbody>${os.map(u=>`<tr><td>${esc(u.email)}${S.admins.includes(u.id)?' <span class="adm">관리자</span>':""}</td><td class="num">${fmt(u.created_at)}</td><td class="num">${u.last_sign_in_at?fmt(u.last_sign_in_at):"—"}</td><td class="num">${u.id!==S.myId?`<button class="btn sm danger" data-uout="${u.id}">탈퇴</button>`:""}</td></tr>`).join("")}</tbody></table></div>`}
  const note=adm&&!S.usersOk&&S.loaded?`<div class="notice" style="margin-bottom:14px">회원관리 기능(로그인 계정·가입일·탈퇴 처리)을 쓰려면 Supabase에서 회원관리 SQL을 한 번 실행해야 합니다.</div>`:"";
  el.innerHTML=`<div class="sec-h"><div><h2>회원${adm?' <small class="adm">관리자 보기</small>':""}</h2><p>레이브랩 회원 명단입니다. 회원가입을 하면 자동으로 명단에 추가됩니다.${S.loaded?` 현재 ${S.members.length}명`:""}</p></div><div class="toolbar"><input class="search" id="q-members" type="search" placeholder="${adm?"이름·과정·직장·이메일 검색":"이름·과정·직장 검색"}" value="${esc(S.q.members||"")}">${btns}</div></div>${note}${chips}${inner}${orphan}`;
  const qi=$("#q-members");qi.oninput=()=>{S.q.members=qi.value;renderMembers()};
  if(keep){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}
  el.querySelectorAll("[data-mf]").forEach(x=>x.onclick=()=>{S.f.members=x.dataset.mf;renderMembers()});
  const j=$("#m-join");j&&(j.onclick=()=>editMember({},true));
  const mi=$("#m-mine");mi&&(mi.onclick=()=>editMember(mineRow,true));
  const ad=$("#m-add");ad&&(ad.onclick=()=>editMember({},false));
  el.querySelectorAll("[data-mem]").forEach(b=>b.onclick=()=>{const m=S.members.find(x=>x.id===b.dataset.mem);editMember(m,m.userId===S.myId)});
  el.querySelectorAll("[data-out]").forEach(b=>b.onclick=()=>{const m=S.members.find(x=>x.id===b.dataset.out);withdraw(m.name,m.userId,m.id)});
  el.querySelectorAll("[data-uout]").forEach(b=>b.onclick=()=>{const u=S.users.find(x=>x.id===b.dataset.uout);withdraw(u.email,u.id,null)});
}
/* 관리자: 탈퇴 처리 (명단 삭제 + 로그인 계정 삭제) */
function withdraw(label,userId,memberId){
  const m=modal(`<h2>탈퇴 처리</h2><div class="content"><b>${esc(label)}</b> 님을 탈퇴 처리할까요?<br><br>${userId?"회원 명단에서 빠지고 로그인 계정도 삭제되어 더 이상 로그인할 수 없습니다.":"관리자가 직접 추가한 명단이라 로그인 계정은 없고, 명단에서만 빠집니다."} 이 사람이 올린 글과 사진은 남습니다. 되돌릴 수 없습니다.</div><div class="err" id="werr"></div>
    <div class="actions"><button class="btn ghost" id="wc">취소</button><button class="btn danger" id="wy">탈퇴 처리</button></div>`);
  m.querySelector("#wc").onclick=close;
  m.querySelector("#wy").onclick=async()=>{const b=$("#wy");b.disabled=true;
    try{
      if(userId){const r=await sb.rpc("admin_delete_user",{target:userId});
        if(r.error){if(/admin_delete_user|function/i.test(r.error.message||""))throw {message:"Supabase에서 회원관리 SQL을 먼저 실행해 주세요."};throw r.error}}
      else must(await sb.from("members").delete().eq("id",memberId));
      close();toast("탈퇴 처리했습니다");loadAll();
    }catch(e){b.disabled=false;$("#werr").textContent="처리하지 못했습니다. "+errMsg(e)}};
}
function editMember(m,self){
  m=Object.assign({name:"",gen:"",course:"",year:"",phone:"",email:"",org:"",field:""},m||{});const isNew=!m.id;
  const title=self?(isNew?"명단에 내 정보 등록":"내 회원정보 수정"):(isNew?"회원 추가":"회원 정보 수정");
  if(self&&isNew&&!m.email)m.email=S.myEmail||"";
  const md=modal(`<h2>${title}</h2><form class="form" id="mf">
    ${self?`<div class="notice">로그인 계정: ${esc(S.myEmail)}</div>`:""}
    ${memberFields(m)}
    ${S.canEdit&&!self&&!isNew?(m.userId?`<label class="chk"><input type="checkbox" id="m-admin"${S.admins.includes(m.userId)?" checked":""}> 홈페이지 관리자로 지정 (인사말·임원 명단 편집, 회원 관리, 다른 사람 글 수정·삭제 가능)</label>`:`<div class="notice">이 회원은 관리자가 직접 추가한 명단이라 로그인 계정이 없습니다. 관리자로 지정하려면 본인이 회원가입을 해야 합니다.</div>`):""}
    <div class="err" id="merr"></div>
    <div class="actions">${!isNew?`<button type="button" class="btn danger" id="mdel" style="margin-right:auto">${self?"명단에서 빼기":"삭제"}</button>`:""}<button type="button" class="btn ghost" id="mc">취소</button><button class="btn" id="ms">${isNew?"등록":"저장"}</button></div></form>`);
  md.querySelector("#mc").onclick=close;
  const del=md.querySelector("#mdel");del&&(del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent="한 번 더 누르면 "+(self?"빼기":"삭제");return}
    try{must(await sb.from("members").delete().eq("id",m.id));close();toast("처리했습니다");loadAll()}catch(err){$("#merr").textContent=errMsg(err)}});
  md.querySelector("#mf").onsubmit=async e=>{e.preventDefault();const d=readMember(new FormData(e.target));const btn=$("#ms");btn.disabled=true;
    try{
      if(isNew&&self)await insertSelf(d);
      else if(isNew)await save(r=>sb.from("members").insert(r),d,["phone"]);
      else{d.updated_at=new Date().toISOString();await save(r=>sb.from("members").update(r).eq("id",m.id),d,["phone"])}
      if(!self&&!isNew&&m.userId){const want=!!(e.target.querySelector("#m-admin")||{}).checked,has=S.admins.includes(m.userId);
        if(want&&!has)must(await sb.from("admins").insert({user_id:m.userId}));
        if(!want&&has)must(await sb.from("admins").delete().eq("user_id",m.userId))}
      close();toast("저장했습니다");loadAll();
    }catch(err){btn.disabled=false;$("#merr").textContent="저장하지 못했습니다. "+errMsg(err)}};
}

/* ---------- 비밀번호 재설정 ---------- */
function newPasswordModal(){
  const m=modal(`<h2>새 비밀번호 정하기</h2><form class="form" id="npf"><label for="np">새 비밀번호 (8자 이상)<input id="np" type="password" minlength="8" autocomplete="new-password" required></label><div class="err" id="nperr"></div><div class="actions"><button class="btn">저장</button></div></form>`);
  m.querySelector("#npf").onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.updateUser({password:$("#np").value});
    if(error){$("#nperr").textContent=errMsg(error);return}close();toast("비밀번호를 바꿨습니다")};
}

/* ---------- 시작 ---------- */
go((location.hash||"").slice(1).split("&")[0]||"home");
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
