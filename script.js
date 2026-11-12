/* ===== JavaScript 기능 시작 ===== */
/* ===== 쑥쑥 스터디 코드 지도 (자세한 설명은 인수인계.md) =====
 저장: localStorage(sg_u 전체 유저, sg_c 로그인 중인 이름), 현재 유저 데이터는 D
 화면: V.home / V.an / V.game 이 각 탭을 그림, render()가 전체를 다시 그림
 수정 지점: PETS(성장 단계) · LK(외부 링크) · HQ(역사 퀴즈) · DECKS(암기 카드) · SN(알람음)
 AI 도우미 탭: aiPage / aiSend / histHTML (대화 기록은 D.chats), 로비의 AI 브리핑: brief / follow
 AI 채팅은 서버의 OpenAI API를 사용해요. HTML 파일을 직접 열면 API 연결은 작동하지 않아요 */
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
let U = {},
  cur = null,
  D = null,
  tab = "home",
  G = { m: "" };
const tabSessionKey = 'ssuksuk.tab-session';
let csrf = '', revision = 0, saveTimer, savePending = false, saving = false, conflict = false;
let syncMessage = '연결 중', authMode = 'login', accountUsername = '';
const save = () => {
  if (!D || !cur) return;
  savePending = true;
  syncMessage = conflict ? '다른 기기 기록 확인 필요' : '저장 대기';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 500);
  updateSync();
};
const today = () => new Date().toLocaleDateString("sv");
const ST = [0, 30, 100, 250, 500];
const IC = {
  home: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  an: "M5 20V10M12 20V4M19 20v-7",
  game: "M6 8h12a3 3 0 013 3v4a3 3 0 01-5 2l-1-2H9l-1 2a3 3 0 01-5-2v-4a3 3 0 013-3zM8 11v3M6.5 12.5h3M16 12h.01M18 14h.01",
  card: "M4 6h16v12H4zM8 10h8M8 14h5",
  send: "M5 12h14M13 6l6 6-6 6",
  ai: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5",
  spark:
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  chev: "M9 6l6 6-6 6",
  out: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
};
const svg = (k, s = 22) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
const gc = () => {
  tab = "game";
  G = { m: "card", i: 0, f: 0 };
  render();
};
const PETS = {
  tree: {
    n: "나무",
    e: ["🌰", "🌱", "🌿", "🌳", "🍎"],
    t: ["씨앗", "새싹", "묘목", "큰 나무", "열매 나무"],
  },
  animal: {
    n: "동물",
    e: ["🥚", "🐣", "🐥", "🐔", "🦚"],
    t: ["알", "아기 새", "병아리", "닭", "공작"],
  },
};
const add = (n) => {
  D.pts += n;
  save();
};
const stage = () => ST.filter((v) => D.pts >= v).length - 1;

/* 로그인 */
const rememberedAccountsKey = 'ssuksuk.remembered-accounts';
let selectedLogin = '';

function rememberedAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(rememberedAccountsKey) || '[]');
    if (!Array.isArray(accounts)) return [];
    return accounts.filter(a => typeof a?.name === 'string' && typeof a.username === 'string' && /^[a-z0-9_-]{3,24}$/.test(a.username)).slice(0, 8);
  } catch { return []; }
}

function saveRememberedAccounts(accounts) {
  try { localStorage.setItem(rememberedAccountsKey, JSON.stringify(accounts.slice(0, 8))); } catch {}
}

function chooseRememberedAccount(username) {
  selectedLogin = username;
  authMode = 'login';
  render();
  $('#pw')?.focus();
}

function forgetRememberedAccount(username) {
  saveRememberedAccounts(rememberedAccounts().filter(a => a.username !== username));
  if (selectedLogin === username) selectedLogin = '';
  render();
}

function accountChoicesHTML() {
  const accounts = rememberedAccounts();
  if (!accounts.length) return '';
  return `<section class="remembered-accounts"><h3>계정 선택</h3>
    ${accounts.map(a => `<div class="remembered-account">
      <button type="button" class="s" data-username="${esc(a.username)}" onclick="chooseRememberedAccount(this.dataset.username)">
        <strong>${esc(a.name)}</strong><small>@${esc(a.username)}</small>
      </button>
      <button type="button" class="text-btn" data-username="${esc(a.username)}" aria-label="${esc(a.username)} 목록에서 삭제" onclick="forgetRememberedAccount(this.dataset.username)">삭제</button>
    </div>`).join('')}
    <button type="button" class="text-btn" onclick="chooseRememberedAccount('');$('#nm').focus()">다른 계정 사용</button>
    <p class="lt">이 브라우저에 닉네임과 아이디를 기억합니다.</p>
  </section>`;
}

function recoveryHTML() {
  return `<main class="auth-page"><a class="wordmark" href="/">쑥쑥<span>스터디</span></a>
    <form class="card auth-form" onsubmit="event.preventDefault();recoverAccount(event.submitter?.value==='reset')">
      <h2>아이디 · 비밀번호 찾기</h2>
      <p class="lt">로그인한 상태에서 발급해 둔 복구 코드를 입력하세요. 비밀번호를 바꾸면 사용한 코드는 만료됩니다.</p>
      <label>복구 코드<input id="recoveryInput" required maxlength="48" autocomplete="off" spellcheck="false"></label>
      <button type="submit" value="lookup" class="s">아이디 확인</button>
      <label>새 비밀번호<input id="recoveryPassword" type="password" maxlength="128" autocomplete="new-password" placeholder="재설정할 때만 입력 · 8자 이상"></label>
      <button type="submit" value="reset" class="w">비밀번호 재설정</button>
      <p id="recoveryResult" role="status"></p>
      <button type="button" class="text-btn" onclick="authMode='login';render()">로그인으로 돌아가기</button>
    </form></main>`;
}

async function recoverAccount(reset) {
  const result = $('#recoveryResult');
  const buttons = result.closest('form').querySelectorAll('button[type="submit"]');
  const body = {code:$('#recoveryInput').value};
  if (reset) {
    body.password = $('#recoveryPassword').value;
    if (body.password.length < 8) { result.textContent = '새 비밀번호를 8자 이상 입력해 주세요.'; return; }
  }
  buttons.forEach(button => button.disabled = true);
  try {
    const {username} = await api('/auth/recover',{method:'POST',body:JSON.stringify(body)});
    selectedLogin = username;
    result.textContent = reset ? `아이디는 ${username}입니다. 새 비밀번호로 로그인하세요.` : `아이디는 ${username}입니다.`;
    if (reset) {
      $('#recoveryInput').value = '';
      $('#recoveryPassword').value = '';
    }
  } catch (error) {
    result.textContent = error.message;
  } finally {
    buttons.forEach(button => button.disabled = false);
  }
}

function openRecoverySettings() {
  if ($('#recoveryDialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'recoveryDialog';
  dialog.className = 'card recovery-dialog';
  dialog.innerHTML = `<form><h2>복구 코드 발급</h2>
    <p class="lt">코드는 아이디 찾기와 비밀번호 재설정에 사용합니다. 새 코드를 발급하면 이전 코드는 만료됩니다.</p>
    <label>현재 비밀번호<input type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label>
    <button type="submit">코드 발급</button><p role="status"></p>
    <button type="button" class="s">닫기</button></form>`;
  const password = dialog.querySelector('input');
  const message = dialog.querySelector('[role="status"]');
  const submit = dialog.querySelector('[type="submit"]');
  dialog.querySelector('[type="button"]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove(), {once:true});
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const {code} = await api('/auth/recovery-code',{method:'POST',body:JSON.stringify({password:password.value})});
      password.value = '';
      const output = document.createElement('code');
      output.textContent = code;
      message.replaceChildren('이 코드를 안전한 곳에 따로 저장하세요.', document.createElement('br'), output);
      submit.hidden = true;
    } catch (error) {
      message.textContent = error.message;
      submit.disabled = false;
    }
  };
  document.body.append(dialog);
  dialog.showModal();
}

function loginHTML(m = '') {
  if (authMode === 'recover') return recoveryHTML();
  return `<main class="auth-page"><a class="wordmark" href="/">쑥쑥<span>스터디</span></a><div class="auth-intro"><span class="eyebrow">나의 공부, 한곳에.</span><h1>공부의 흐름을<br>이어 가는 곳.</h1><p>계획하고, 집중하고, 짧게 복습하세요.<br>기록은 로그인한 계정에 남습니다.</p></div><form class="card auth-form" onsubmit="event.preventDefault();login()"><div class="auth-tabs"><button type="button" class="${authMode==='login'?'active':''}" onclick="authMode='login';render()">로그인</button><button type="button" class="${authMode==='register'?'active':''}" onclick="authMode='register';render()">회원가입</button></div>${authMode==='login'?accountChoicesHTML():''}${authMode==='register'?'<label>닉네임<input id="dn" maxlength="24" autocomplete="nickname" placeholder="앱에서 부를 이름"></label>':''}<label>아이디<input id="nm" required minlength="3" maxlength="24" autocomplete="username" value="${authMode==='login'?esc(selectedLogin):''}" placeholder="영문·숫자 3~24자"></label><label>비밀번호<input id="pw" required type="password" minlength="8" maxlength="128" autocomplete="${authMode==='register'?'new-password':'current-password'}" placeholder="8자 이상"></label><button class="w" id="loginBtn" type="submit">${authMode==='register'?'계정 만들기':'로그인'}</button>${authMode==='login'?'<button type="button" class="text-btn" onclick="authMode=\'recover\';render()">아이디 · 비밀번호 찾기</button>':''}<p class="no" id="lm" role="alert">${esc(m)}</p><p class="lt">비밀번호는 암호화된 해시로 보관합니다. 질문과 일부 학습 정보는 AI 답변을 위해 OpenAI로 전송됩니다.</p></form></main>`;
}
async function api(path, options = {}) {
  const response = await fetch('/api'+path, {credentials:'same-origin',...options,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,...options.headers}});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) {const error = new Error(data.error || '서버 연결을 확인해 주세요.');error.status=response.status;throw error;}
  return data;
}
function loadAccount(account) {
  accountUsername=account.username || '';
  cur=account.name; csrf=account.csrf;revision=account.revision;D=account.state;
  try { sessionStorage.setItem(tabSessionKey, csrf); } catch {}
  if (typeof account.username === 'string') {
    saveRememberedAccounts([{username:account.username,name:account.name}, ...rememberedAccounts().filter(a => a.username !== account.username)]);
  }
  U={};U[cur]={d:D};D.notes ||= [];D.gameHistory ||= [];
  savePending=false;conflict=false;syncMessage='서버 저장됨';
  if(!D.att.includes(today())){D.att.push(today());add(10);}
  render();
}
async function login() {
  const button=$('#loginBtn');button.disabled=true;
  try {
    const mode = authMode;
    loadAccount(await api('/auth/'+mode,{method:'POST',body:JSON.stringify({username:$('#nm').value.trim(),password:$('#pw').value,name:$('#dn')?.value.trim()})}));
    if (mode === 'register') openRecoverySettings();
  }
  catch(e){$('#lm').textContent=e.message;button.disabled=false;}
}
function updateSync(){for(const selector of ['#syncStatus','#accountSync']){const el=$(selector);if(el){el.textContent=syncMessage;el.classList.toggle('sync-error',conflict||syncMessage.includes('실패'));}}}
async function flushSave(){
 clearTimeout(saveTimer);
 if(!D||!savePending||saving||conflict)return !savePending;
 saving=true;savePending=false;syncMessage='저장 중';updateSync();
 const snapshot=JSON.stringify(D);
 try{const result=await api('/state',{method:'PUT',body:JSON.stringify({state:JSON.parse(snapshot),revision})});revision=result.revision;syncMessage='서버 저장됨';}
 catch(e){savePending=true;syncMessage='저장 실패 · 다시 시도';if(e.status===409){conflict=true;syncMessage='다른 기기에서 변경됨';}if(e.status===401){conflict=true;syncMessage='로그인 만료 · 기록 내려받기';}console.warn(e.message);}
 finally{saving=false;updateSync();}
 if(savePending&&!conflict){saveTimer=setTimeout(flushSave,3000);}
 return !savePending;
}
async function logout(){
 if(saving){toast('저장 중입니다. 잠시 후 다시 눌러 주세요.');return;}
 if(!await flushSave()){toast('저장되지 않은 기록이 있습니다. 내 기록을 내려받은 뒤 다시 시도해 주세요.');return;}
 try{await api('/auth/logout',{method:'POST'});try { sessionStorage.removeItem(tabSessionKey); } catch {} AI.ctl?.abort();AI={v:'chat',cur:null,busy:0,ctl:null};U={};D=null;cur=null;csrf='';selectedLogin='';authMode='login';tab='home';clearTimeout(saveTimer);render();}
 catch(e){toast(e.message);}
}
function downloadRecords(){
 const blob=new Blob([JSON.stringify({name:cur,state:D,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='study-records-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importLegacy(){
 let users;try{users=JSON.parse(localStorage.getItem('sg_u')||'{}');}catch{return toast('이전 기록을 읽지 못했습니다.');}
 const names=Object.keys(users);if(!names.length)return toast('이 브라우저에 이전 기록이 없습니다.');
 const name=prompt('가져올 이전 이름을 입력하세요. 기존 서버 기록은 교체됩니다.');if(!name||!users[name]?.d)return;
 if(!confirm('현재 계정 기록을 이전 기록으로 교체할까요? 먼저 내 기록을 내려받는 것을 권장합니다.'))return;
 const old=users[name].d;D={...D,...old,notes:old.notes||[],gameHistory:old.gameHistory||[]};U[cur].d=D;save();render();
}
function toast(text){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.className='show';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.className='',4000);}
window.addEventListener('online',()=>{if(!conflict)flushSave();});
window.addEventListener('beforeunload',e=>{if(savePending||saving){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSave();});
const go = (t) => {
  tab = t;
  G = { m: "" };
  render();
  window.scrollTo(0, 0);
};

/* 화면 */
const V = {
  home() {
    const s = stage(),
      P = PETS[D.pet],
      nx = ST[s + 1],
      pr = nx ? Math.round(((D.pts - ST[s]) / (nx - ST[s])) * 100) : 100;
    const td = Math.floor(
      Object.values(D.logs).reduce((a, b) => a + b, 0) / 60,
    );
    const wk = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return [d.toLocaleDateString("sv"), "일월화수목금토"[d.getDay()]];
    });
    const todo = D.plan.filter((p) => !p.d).slice(0, 3);
    return `<section class="hero"><p class="hs">${esc(cur)}님, 반가워요</p><h1>오늘도 한 걸음<br>자라볼까요?</h1><div class="pw"><div class="pe">${P.e[s]}</div><div style="flex:1"><b>${P.t[s]}</b><div class="bar"><i style="width:${pr}%"></i></div><span class="hs">${nx ? `다음 단계까지 ${nx - D.pts}P` : "최고 단계예요"}</span></div></div></section>
 <div class="grid">${[
   ["an", "an", "스케줄"],
   ["game", "game", "미니게임"],
   ["gc", "card", "암기 카드"],
 ]
   .map(
     (x) =>
       `<button class="tile" onclick="${x[0] == "gc" ? "gc()" : `go('${x[0]}')`}"><span class="ic">${svg(x[1], 26)}</span>${x[2]}${x[0] == "an" ? '<em class="pill">AI</em>' : ""}</button>`,
   )
   .join("")}</div>
 <div class="card"><div class="ct"><h3>출석</h3><span class="mu">${D.att.length}일째</span></div><div class="wk">${wk.map((w) => `<div class="${D.att.includes(w[0]) ? "on" : ""}"><i></i>${w[1]}</div>`).join("")}</div></div>
 <div class="card"><div class="ct"><h3>오늘 할 일</h3><span class="mu">누적 ${td}분 공부</span></div>${todo.length ? todo.map((p) => `<p class="td">${esc(p.t)}</p>`).join("") : '<p class="mu" style="margin:0">아직 계획이 없어요. 스케줄에서 계획을 만들어 보세요.</p>'}</div>
 <div class="card memo-card"><div class="ct"><div><p class="eyebrow">QUICK NOTE</p><h3>공부 메모</h3></div><span class="mu">계정에 저장</span></div><p class="mu memo-help">갑자기 떠오른 질문이나 다음에 복습할 내용을 적어 두세요.</p><div class="memo-entry"><input id="memoText" maxlength="160" placeholder="예: 수학 3단원 오답 다시 풀기" onkeydown="if(event.key==='Enter')addNote()"><button onclick="addNote()">추가</button></div><div class="memo-list">${(D.notes || []).length ? D.notes.slice().reverse().map((n, i) => `<div class="memo-item"><span>${esc(n.text)}</span><button class="icon-btn" aria-label="메모 삭제" onclick="delNote(${D.notes.length - 1 - i})">×</button></div>`).join("") : '<p class="empty-note">아직 메모가 없어요. 작은 할 일부터 적어 보세요.</p>'}</div></div>
 <div class="row account-actions"><button class="s" onclick="setPet(D.pet=='tree'?'animal':'tree')">키울 친구 바꾸기 (${P.n})</button><button class="s" onclick="logout()">로그아웃</button></div>`;
  },
  an() {
    const t = D.traits,
      x = D.tests,
      e = D.exam;
    return `<section class="card"><h2>공부 과목</h2><ul class="subject-list" id="subjectList">${subjectListHTML()}</ul><form class="memo-entry" onsubmit="event.preventDefault();addSub()"><input id="ns" maxlength="80" required aria-label="새 과목 이름" placeholder="예: 한국사"><button>과목 추가</button></form><p class="mu" id="subjectStatus" role="status"></p></section><form onsubmit="event.preventDefault();analyze()"><div class="card"><h2>내 학습 정보</h2><label>공부 습관<input id="th" value="${esc(t.habit)}" placeholder="예: 밤에 집중이 잘 돼요"></label><label>잘하는 과목<input id="tg" value="${esc(t.good)}"></label><label>부족한 과목<input id="tw" value="${esc(t.weak)}"></label></div>
 <details class="card plan-details" ontoggle="if(this.isConnected) planTestsOpen=this.open" ${planTestsOpen?"open":""}><summary>테스트 결과 입력 <small class="mu">선택</small></summary>${linksHTML()}<p class="mu" style="margin:0 0 8px">위 사이트에서 해 본 결과를 100점 기준으로 적어 주세요.</p><div class="row"><label>암기력<input id="t1" type="number" min="0" max="100" value="${x.mem}"></label><label>문제풀이<input id="t2" type="number" min="0" max="100" value="${x.sol}"></label><label>사고력<input id="t3" type="number" min="0" max="100" value="${x.thk}"></label></div><p class="lt">사이트 결과가 점수가 아니면 아래에 적어도 돼요 (선택)</p><div class="row"><label>숫자 기억 (자리수)<input id="s1" type="number" min="1" max="30" value="${x.hn || ""}"></label><label>시각 기억 (레벨)<input id="s2" type="number" min="1" max="40" value="${x.hv || ""}"></label></div><div class="row"><label>칸 아카데미 단계<select id="s3"><option value="">선택 안 함</option>${["시도함", "익숙함", "능숙함", "마스터"].map((o, i) => `<option value="${i}" ${x.kh === String(i) ? "selected" : ""}>${o}</option>`).join("")}</select></label><label>커리어넷 수리·논리 (백분위)<input id="s4" type="number" min="1" max="100" value="${x.cn || ""}"></label></div></details>
 <div class="card"><h2>시험 일정</h2><div class="row"><label>시험 날짜<input id="ed" type="date" value="${e.date}"></label><label>하루 공부 시간(시간)<input id="eh" type="number" min="1" max="12" value="${e.hrs}"></label></div><button class="w">분석하고 계획 만들기</button></div></form>
 ${D.report || ""}${D.plan.length ? `<div class="card"><h3>기본 공부 계획</h3><p class="mu">입력한 시험 일정과 공부 시간에 맞춘 기본 계획이에요. 완료하면 5P를 받아요.</p>${D.plan.map((p, i) => `<label class="chk"><input type="checkbox" ${p.d ? "checked disabled" : ""} onchange="donePlan(${i})"><span>${esc(p.t)}${p.w ? `<small class="mu" style="display:block">${esc(p.w)}</small>` : ""}</span></label>`).join("")}</div>` : ""}`;
  },
  game() {
    if (G.m == "math") return gMath();
    if (G.m == "hist") return gHist();
    if (G.m == "card") return gCard();
    if (G.m == "wrong") return gWrong();
    return gameMenu();
  },
  ai() {
    return aiPage();
  },
};

function render() {
  const a = $("#app");
  if (!D) {
    a.innerHTML = loginHTML();
    return;
  }
  a.innerHTML = `<header><b>쑥쑥 스터디</b><span class="chip">${D.pts}P</span></header><main>${V[tab]()}</main><nav>${[
    ["home", "홈"],
    ["an", "스케줄"],
    ["game", "게임"],
  ]
    .map(
      (x) =>
        `<button class="${tab == x[0] ? "on" : ""}" onclick="go('${x[0]}')">${svg(x[0])}${x[1]}</button>`,
    )
    .join("")}</nav>`;

}
function addNote() {
  const input = $("#memoText");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!Array.isArray(D.notes)) D.notes = [];
  D.notes.push({ text, date: today() });
  D.notes = D.notes.slice(-12);
  save();
  render();
}
function delNote(index) {
  if (!Array.isArray(D.notes)) return;
  D.notes.splice(index, 1);
  save();
  render();
}

const setPet = (k) => {
  D.pet = k;
  save();
  render();
};

let planTestsOpen = false;

function subjectListHTML() {
  return D.subs.map(name => `<li>${esc(name)}</li>`).join("");
}

function addSub() {
  const input = $("#ns");
  const status = $("#subjectStatus");
  const name = input.value.trim();
  if (!name) { status.textContent = "과목 이름을 입력해 주세요."; return; }
  if (D.subs.includes(name)) { status.textContent = "이미 추가한 과목이에요."; return; }
  if (D.subs.length >= 2000) { status.textContent = "등록 가능한 과목 수를 모두 사용했어요."; return; }
  D.subs.push(name);
  save();
  $("#subjectList").innerHTML = subjectListHTML();
  input.value = "";
  status.textContent = name + " 과목을 추가했어요.";
  input.focus();
}

/* 분석 및 계획 */
/* ===== [AI-DATA] 학습법 지식 데이터 : 조원이 여기에 계속 추가해요 =====
 M  학습법 라이브러리  {n 이름, h 방법, w 효과가 있는 이유, m 권장 분, k 검색 키워드}
 AB 능력별 진단       AB.mem/sol/thk = [낮음, 보통, 높음] 각각 {d 진단, m 추천 학습법 키}
 SB 과목별 팁         SB['수학'] = {tips 팁 목록, t 세션 과제 3개}
 HB 습관 키워드       {r 정규식, a 조언, m 학습법 키}
 PH 시험까지 남은 기간별 단계 */
const M = {
  retr: {
    n: "인출 연습",
    h: "책을 덮고 떠오르는 내용을 백지에 써 보거나 스스로 문제를 내서 풀어요.",
    w: "읽기만 하는 것보다 떠올리는 연습이 장기 기억에 훨씬 오래 남는다는 연구가 많아요(Roediger & Karpicke, 2006).",
    m: 15,
    k: "암기 외우 기억 복습 인출 백지 퀴즈 시험",
  },
  spc: {
    n: "분산 복습",
    h: "같은 내용을 1일, 3일, 7일, 14일 뒤에 다시 봐요.",
    w: "한 번에 몰아서 하는 것보다 간격을 두면 잊는 속도가 느려져요(에빙하우스 망각곡선, Cepeda 외 2006).",
    m: 10,
    k: "복습 망각 잊 간격 반복 장기 에빙하우스",
  },
  err: {
    n: "오답노트",
    h: "틀린 문제를 문제, 내 풀이, 틀린 이유, 올바른 풀이 순서로 적고 3일 뒤 다시 풀어요.",
    w: "틀린 이유를 직접 분석하면 같은 실수를 반복하는 비율이 줄어요.",
    m: 15,
    k: "오답 틀린 실수 문제풀이 문제 풀이",
  },
  fey: {
    n: "설명하기(파인만 기법)",
    h: "배운 내용을 아무것도 모르는 친구에게 가르치듯 소리 내어 설명해요. 막히는 곳이 모르는 부분이에요.",
    w: "안다고 느끼는 것과 실제로 아는 것의 차이를 바로 드러내 줘요.",
    m: 10,
    k: "이해 설명 개념 원리 파인만 사고력",
  },
  pomo: {
    n: "25분 집중, 5분 휴식",
    h: "타이머를 25분에 맞추고 한 가지에만 집중한 뒤 5분 쉬어요. 4번 반복하면 길게 쉬어요.",
    w: "짧은 목표가 시작을 쉽게 하고, 휴식이 집중력 저하를 막아줘요.",
    m: 25,
    k: "집중 산만 시작 미루 딴짓 휴식 타이머",
  },
  inter: {
    n: "섞어서 풀기",
    h: "한 단원만 계속 풀지 말고 여러 단원·유형을 섞어서 풀어요.",
    w: "어떤 방법을 써야 하는지 고르는 연습이 돼서 실전에 강해져요(교차 학습 연구).",
    m: 20,
    k: "문제 유형 섞 실전 응용",
  },
  sim: {
    n: "시간 재고 풀기",
    h: "시험 시간과 같은 시간을 재고 모의고사처럼 풀어요. 끝나면 바로 채점하고 오답노트를 써요.",
    w: "시간 압박 속에서 푸는 경험이 실전 실수를 줄여줘요.",
    m: 40,
    k: "실전 모의 시간 부족 시험 직전 기출",
  },
  pre: {
    n: "유형 분류",
    h: "문제를 유형별로 묶고, 유형마다 풀이 순서를 한 줄로 정리해요.",
    w: "새로운 문제를 봐도 아는 유형으로 연결할 수 있어요.",
    m: 15,
    k: "유형 분류 정리 문제 수학",
  },
  why: {
    n: "왜 그럴까 질문하기",
    h: '답을 구한 뒤에도 "왜 이 방법이 되지?", "조건을 바꾸면?"을 한 줄씩 적어요.',
    w: "결과만 외우지 않고 원리를 따져보는 습관이 사고력의 바탕이 돼요.",
    m: 10,
    k: "사고력 생각 원리 응용 창의",
  },
  map: {
    n: "마인드맵",
    h: "가운데에 주제를 쓰고 가지를 뻗어 개념의 관계를 그려요.",
    w: "개념이 서로 어떻게 연결되는지 한눈에 보여서 전체 구조를 이해하기 쉬워요.",
    m: 15,
    k: "정리 구조 연결 한국사 사회 개념",
  },
  chunk: {
    n: "덩어리로 묶기",
    h: "외울 것을 3~5개씩 묶고 이름을 붙여요. 묶음 단위로 먼저 외우고 세부 내용을 채워요.",
    w: "한 번에 기억할 수 있는 정보량에는 한계가 있어서, 묶으면 부담이 줄어요(청킹).",
    m: 10,
    k: "암기 외우 기억력 많이 단어",
  },
  mnem: {
    n: "연상 암기",
    h: "첫 글자를 따서 문장을 만들거나 장소·이야기와 연결해서 외워요.",
    w: "의미 없는 정보에 의미를 붙이면 기억에 오래 남아요.",
    m: 10,
    k: "암기 외우 연상 두문자 순서 단어 연표",
  },
  cor: {
    n: "노트 정리(코넬식)",
    h: "노트를 왼쪽 키워드, 오른쪽 내용, 아래 한 줄 요약으로 나눠요. 키워드를 가리고 내용을 떠올려요.",
    w: "정리와 인출 연습을 한 번에 할 수 있어요.",
    m: 15,
    k: "노트 필기 정리 수업",
  },
  slp: {
    n: "충분한 수면",
    h: "시험 전날에도 평소 시간에 자요. 공부한 내용은 자는 동안 정리돼요.",
    w: "수면이 부족하면 기억 정리와 집중력이 모두 떨어져요.",
    m: 0,
    k: "수면 잠 밤샘 새벽 피곤 벼락치기",
  },
};
const AB = {
  mem: [
    {
      d: "암기력 점수가 낮은 편이에요. 타고난 한계라기보다 외우는 방법에 따라 크게 달라지는 부분이라, 방법만 바꿔도 좋아질 수 있어요.",
      m: ["chunk", "mnem", "retr", "spc"],
    },
    {
      d: "암기력은 보통이에요. 복습 간격만 잘 관리해도 오래 기억할 수 있어요.",
      m: ["spc", "retr", "map"],
    },
    {
      d: "암기력이 좋은 편이에요. 외운 내용을 문제에 쓰는 연습으로 넘어가면 좋아요.",
      m: ["retr", "sim"],
    },
  ],
  sol: [
    {
      d: "문제풀이 점수가 낮아요. 개념을 이해한 뒤 같은 유형을 반복해 풀고, 풀이 과정을 직접 쓰는 연습이 필요해요.",
      m: ["err", "pre", "fey"],
    },
    {
      d: "문제풀이는 보통이에요. 틀린 문제를 분석하고 유형을 섞어 풀면 한 단계 올라가요.",
      m: ["err", "inter", "sim"],
    },
    {
      d: "문제풀이가 좋은 편이에요. 시간을 재고 푸는 실전 연습과 어려운 문제에 도전해 보세요.",
      m: ["inter", "sim", "why"],
    },
  ],
  thk: [
    {
      d: "사고력 점수가 낮아요. 정답을 바로 보지 말고 스스로 생각하는 시간을 늘리고, 이유를 말로 설명하는 연습이 도움이 돼요.",
      m: ["fey", "map", "why"],
    },
    {
      d: "사고력은 보통이에요. 원리를 따져 묻는 습관을 더하면 응용 문제에 강해져요.",
      m: ["why", "inter", "fey"],
    },
    {
      d: "사고력이 좋은 편이에요. 서로 다른 단원을 연결하는 문제에 도전해 보세요.",
      m: ["inter", "why"],
    },
  ],
};
const SB = {
  수학: {
    tips: [
      "풀이를 보기 전에 최소 10분은 스스로 생각해요.",
      "공식은 외우기 전에 유도 과정을 한 번 따라가 봐요.",
      "틀린 문제는 계산 실수인지 개념 부족인지 구분해서 적어요.",
    ],
    t: [
      "개념을 정리하고 예제를 풀어 확인",
      "같은 유형 문제를 모아 반복 풀이",
      "틀린 문제를 오답노트에 정리하고 다시 풀기",
    ],
  },
  영어: {
    tips: [
      "단어는 하루 20개씩 짧게, 3일 뒤 다시 봐요.",
      "본문은 소리 내어 읽고 문장 구조를 표시해요.",
      "문법은 틀린 문제의 규칙을 한 줄로 적어요.",
    ],
    t: [
      "단어 20개를 가리고 뜻 떠올리기",
      "본문을 소리 내어 읽고 해석하기",
      "문법 문제를 풀고 규칙 한 줄 정리",
    ],
  },
  국어: {
    tips: [
      "지문을 읽기 전에 문제를 먼저 훑어요.",
      "문단마다 요지를 한 줄로 적어요.",
      "정답의 근거 문장에 밑줄을 긋는 습관을 들여요.",
    ],
    t: [
      "문단별 요지를 한 줄씩 정리",
      "문제를 풀고 근거 문장 표시하기",
      "문학 개념과 어휘 복습",
    ],
  },
  과학: {
    tips: [
      "개념은 그림이나 도식으로 한 장에 정리해요.",
      "원리를 말로 설명해 보며 이해를 확인해요.",
      "계산 문제는 단위까지 같이 적어요.",
    ],
    t: [
      "개념을 도식으로 한 장 정리",
      "원리를 소리 내어 설명하기",
      "계산·그래프 문제 풀이",
    ],
  },
  사회: {
    tips: [
      "사건은 연표와 인과관계로 묶어서 외워요.",
      "인물·사건은 마인드맵으로 연결해요.",
      "기출 문제로 자주 나오는 키워드를 확인해요.",
    ],
    t: [
      "연표와 키워드 카드 만들기",
      "인물·사건을 마인드맵으로 연결",
      "문제를 풀고 헷갈린 키워드 복습",
    ],
  },
  기본: {
    tips: [
      "배운 날 안에 한 번 복습해요.",
      "책을 덮고 떠오르는 내용을 먼저 써 봐요.",
    ],
    t: ["개념을 이해하며 정리", "문제를 풀며 확인", "틀린 부분 복습"],
  },
};
const HB = [
  {
    r: /집중|산만|딴짓/,
    a: "집중이 어렵다면 25분 집중, 5분 휴식으로 시작해 보세요. 시작할 때 오늘 할 한 가지만 정해요.",
    m: ["pomo"],
  },
  {
    r: /폰|핸드폰|유튜브|sns|게임/i,
    a: "공부할 때 폰을 다른 방에 두거나 알림을 꺼 두세요. 눈에 보이면 의지와 상관없이 집중이 깨져요.",
    m: ["pomo"],
  },
  {
    r: /미루|귀찮|시작/,
    a: "시작이 어렵다면 목표를 10분으로 줄여요. 일단 시작하면 이어서 하기 쉬워요.",
    m: ["pomo"],
  },
  {
    r: /밤|새벽|늦게/,
    a: "밤늦게 공부하느라 잠이 줄면 기억 정리에 손해예요. 잠은 최소한 지켜 주세요.",
    m: ["slp"],
  },
  {
    r: /실수|덤벙/,
    a: "실수가 잦다면 풀고 나서 검산하는 시간을 따로 정해요. 틀린 실수는 종류별로 오답노트에 적어요.",
    m: ["err"],
  },
  {
    r: /시간.{0,3}부족|바빠|학원/,
    a: "시간이 부족하면 새로운 걸 늘리기보다 복습 비중을 줄이지 마세요. 짧아도 매일 하는 게 좋아요.",
    m: ["spc"],
  },
  {
    r: /외우|암기|까먹|잊/,
    a: "외운 게 금방 사라진다면 복습 간격이 문제일 수 있어요. 1일, 3일, 7일 뒤에 다시 떠올려 보세요.",
    m: ["spc", "retr"],
  },
  {
    r: /이해|개념/,
    a: "이해가 부족하다고 느끼면 소리 내어 설명해 보세요. 막히는 곳이 정확히 모르는 부분이에요.",
    m: ["fey"],
  },
];
const PH = [
  [
    14,
    "기초 다지기",
    "시험까지 시간이 넉넉해서 개념을 이해하고 정리하는 데 집중해요.",
  ],
  [
    7,
    "개념과 문제 연결",
    "개념을 문제에 적용하며 부족한 부분을 찾는 시기예요.",
  ],
  [3, "문제 풀이와 오답", "문제를 많이 풀고 틀린 이유를 분석하는 시기예요."],
  [1, "총정리", "새로운 걸 늘리기보다 아는 것을 확실히 하는 시기예요."],
  [-9, "마무리", "가볍게 복습하고 충분히 자요. 컨디션이 점수에 영향을 줘요."],
];
Object.assign(M, {
  sq3r: {
    n: "SQ3R 읽기",
    h: "훑어보기, 질문 만들기, 읽기, 말하기, 복습하기 순서로 읽어요.",
    w: "읽기 전에 질문을 만들면 목적이 생겨서 이해와 기억에 도움이 돼요(로빈슨, 1946).",
    m: 20,
    k: "읽기 교과서 지문 독서 국어 이해",
  },
  leit: {
    n: "라이트너 상자",
    h: "암기 카드를 상자 3개로 나눠요. 맞히면 다음 칸으로 옮겨 간격을 늘리고, 틀리면 첫 칸으로 되돌려요.",
    w: "틀리는 카드는 자주, 아는 카드는 드물게 보게 돼서 분산 복습을 쉽게 할 수 있어요.",
    m: 10,
    k: "단어 암기 카드 영어 영단어 한국사",
  },
  goal: {
    n: "구체적인 목표",
    h: '"수학 공부"가 아니라 "수학 2단원 문제 15개 풀고 오답 정리"처럼 끝이 보이게 정해요.',
    w: "목표가 구체적이면 시작하기 쉽고 끝났는지 확인할 수 있어요.",
    m: 5,
    k: "계획 목표 미루 시작 의욕 동기",
  },
  env: {
    n: "공부 환경 만들기",
    h: "책상 위에는 지금 과목만 두고, 폰은 다른 곳에 둬요. 항상 같은 장소에서 시작해요.",
    w: "눈에 보이는 방해 요소를 줄이면 집중하는 데 필요한 의지가 덜 들어요.",
    m: 0,
    k: "환경 책상 장소 폰 집중 도서관 카페",
  },
  ex: {
    n: "가벼운 움직임",
    h: "공부 사이 쉬는 시간에 스트레칭이나 산책을 해요.",
    w: "가벼운 운동은 집중과 기분에 도움이 될 수 있다고 알려져 있어요.",
    m: 5,
    k: "휴식 피곤 졸 집중 운동 쉬는",
  },
  rev: {
    n: "시험 후 분석",
    h: "틀린 문제를 모르는 개념, 실수, 시간 부족으로 나눠 표로 정리해요.",
    w: "어디서 점수를 잃었는지 알면 다음 계획이 구체적으로 바뀌어요.",
    m: 20,
    k: "시험 후 결과 분석 오답 성적",
  },
  dual: {
    n: "그림과 글 같이 쓰기",
    h: "개념을 글로 쓰고 옆에 간단한 그림이나 도표를 그려요.",
    w: "말과 그림을 함께 쓰면 두 가지 경로로 기억돼서 떠올리기 쉬워요(이중 부호화 이론, 파이비오).",
    m: 10,
    k: "그림 도표 도식 과학 개념 시각",
  },
});
const SM = {
  수학: ["err", "pre"],
  영어: ["leit", "retr"],
  국어: ["sq3r", "cor"],
  과학: ["dual", "fey"],
  사회: ["map", "mnem"],
  기본: ["retr"],
};
const FQ = [
  {
    k: "벼락치기 하루 전 밤샘 전날",
    a: "벼락치기는 단기 점수엔 도움이 될 수 있어도 오래 기억하기는 어려워요. 시험 전날은 새로운 걸 늘리기보다 아는 걸 확인하고 평소처럼 자는 게 좋아요.",
  },
  {
    k: "몇 시간 하루 얼마나 시간 양",
    a: "정해진 정답은 없어요. 시간보다 책을 덮고 떠올리고 푸는 방식이 더 중요해요. 처음엔 지킬 수 있는 만큼 하루 목표를 정하고 조금씩 늘려 보세요.",
  },
  {
    k: "순서 먼저 우선순위 어떤 과목부터",
    a: "집중이 잘 되는 시간에 어렵거나 약한 과목을 먼저 하고, 좋아하는 과목은 뒤에 두면 좋아요. 약한 과목은 매일 조금씩 넣어요.",
  },
  {
    k: "슬럼프 의욕 동기 하기 싫",
    a: "의욕이 없을 때는 목표를 10분으로 줄이고 한 일을 눈에 보이게 체크해 보세요. 오래 지속되면 선생님이나 가족과 이야기해 보세요.",
  },
  {
    k: "인강 자습 혼자 강의",
    a: "강의는 이해에 도움이 되지만 보기만 하면 내 것이 되지 않아요. 보고 나서 책을 덮고 직접 설명하거나 문제를 풀어 확인하세요.",
  },
  {
    k: "모르는 막힐 질문 해설",
    a: "바로 답을 보지 말고 10분은 스스로 시도해요. 막힌 지점을 한 줄로 적은 뒤 해설이나 선생님께 그 부분만 물어보세요.",
  },
  {
    k: "필기 노트 정리 예쁘게",
    a: "예쁘게 꾸미는 것보다 키워드를 가리고 떠올릴 수 있게 만드는 게 중요해요. 코넬식 노트가 도움이 돼요.",
  },
  {
    k: "불안 떨려 긴장 걱정",
    a: "시험 전 긴장은 흔해요. 시험처럼 시간을 재고 연습해 보고, 시험 중에는 심호흡하며 쉬운 문제부터 풀어 보세요. 너무 힘들면 학교 상담 선생님과 이야기해 보세요.",
  },
  {
    k: "문제집 몇 권 많이",
    a: "여러 권을 한 번씩 푸는 것보다 한 권을 틀린 문제까지 확실히 끝내는 편이 효과적이에요.",
  },
  {
    k: "숫자 기억 자리수 해석",
    a: "숫자 기억은 잠깐 기억하는 용량을 봐요. 사람이 한 번에 기억하는 정보는 7개 안팎(±2)이라는 연구(밀러, 1956)가 있어서 6~8자리는 보통으로 봐요. 이 사이트의 기준은 참고용이에요. 짧다면 묶어서 외우는 방법이 도움이 돼요.",
  },
  {
    k: "시각 기억 레벨 해석",
    a: "시각 기억은 본 것을 잠깐 기억하는 능력을 봐요. 레벨이 높을수록 좋고, 하루 컨디션에 따라 달라지니 여러 번 해서 평균을 보세요. 이 분석의 기준은 참고용이에요.",
  },
  {
    k: "칸 아카데미 단계 시도함 익숙함 능숙함 마스터",
    a: "칸 아카데미는 연습 결과에 따라 단계가 올라가요. 능숙함 이상이면 개념을 풀이에 쓸 수 있다는 뜻으로 봐요. 앞 단계라면 쉬운 문제를 반복하며 개념부터 다져 보세요.",
  },
  {
    k: "커리어넷 적성검사 직업적성 수리 논리",
    a: "커리어넷 직업적성검사는 언어, 수리·논리 등 능력을 보여주는 진로 참고 자료예요. 공부 능력을 정확히 재는 검사는 아니니 결과는 참고로만 보세요.",
  },
  {
    k: "테스트 결과 점수 믿 정확",
    a: "온라인 테스트는 그날 컨디션에 따라 달라지고 공부 능력 전체를 재지는 못해요. 여러 번 해서 평균을 보고, 이 분석은 참고용으로 쓰세요.",
  },
];
/* ===== [/AI-DATA] ===== */
/* ===== [AI-ENGINE] 분석 · 계획 만들기 ===== */
const subjKey = (n) =>
  /수학/.test(n)
    ? "수학"
    : /영어/.test(n)
      ? "영어"
      : /국어|문학|독서/.test(n)
        ? "국어"
        : /과학|물리|화학|생물|지구/.test(n)
          ? "과학"
          : /사회|역사|한국사|지리|윤리|도덕/.test(n)
            ? "사회"
            : "기본";
const phase = (d) => PH.find((x) => d > x[0]) || PH[4];
function analyze() {
  const g = (id) => $(id).value;
  D.traits = { habit: g("#th"), good: g("#tg"), weak: g("#tw") };
  D.tests = {
    mem: g("#t1"),
    sol: g("#t2"),
    thk: g("#t3"),
    hn: g("#s1"),
    hv: g("#s2"),
    kh: g("#s3"),
    cn: g("#s4"),
  };
  D.exam = { date: g("#ed"), hrs: Math.max(1, Math.min(12, +g("#eh") || 2)) };
  const Z = D.tests,
    has = (k) => Z[k] !== "" && Z[k] != null,
    sl = (v) => (v < 40 ? 0 : v < 70 ? 1 : 2),
    src = { mem: [], sol: [], thk: [] };
  if (has("mem")) src.mem.push([sl(+Z.mem), `입력 점수 ${Z.mem}점`]);
  if (has("hn"))
    src.mem.push([
      +Z.hn <= 5 ? 0 : +Z.hn <= 8 ? 1 : 2,
      `숫자 기억 ${Z.hn}자리`,
    ]);
  if (has("hv"))
    src.mem.push([
      +Z.hv <= 5 ? 0 : +Z.hv <= 9 ? 1 : 2,
      `시각 기억 ${Z.hv}레벨`,
    ]);
  if (has("sol")) src.sol.push([sl(+Z.sol), `입력 점수 ${Z.sol}점`]);
  if (has("kh"))
    src.sol.push([
      [0, 1, 2, 2][+Z.kh],
      `칸 아카데미 ${["시도함", "익숙함", "능숙함", "마스터"][+Z.kh]}`,
    ]);
  if (has("thk")) src.thk.push([sl(+Z.thk), `입력 점수 ${Z.thk}점`]);
  if (has("cn")) src.thk.push([sl(+Z.cn), `커리어넷 수리·논리 ${Z.cn}백분위`]);
  const ab = [
    ["mem", "암기력"],
    ["sol", "문제풀이"],
    ["thk", "사고력"],
  ]
    .filter((x) => src[x[0]].length)
    .map((x) => {
      const a = src[x[0]],
        avg = a.reduce((p, c) => p + c[0], 0) / a.length;
      return {
        k: x[0],
        n: x[1],
        avg,
        l: Math.round(avg),
        why: a.map((y) => y[1]).join(", "),
      };
    })
    .sort((a, b) => a.avg - b.avg);
  const tot = Object.values(D.logs).reduce((a, b) => a + b, 0),
    byT = [...D.subs].sort((a, b) => (D.logs[a] || 0) - (D.logs[b] || 0));
  const wk = D.subs.find((x) => D.traits.weak.includes(x)),
    focus = wk || byT[0],
    second = byT.find((x) => x != focus) || focus;
  const dl = D.exam.date
      ? Math.ceil((new Date(D.exam.date) - new Date(today())) / 864e5)
      : null,
    days = Math.min(7, dl > 0 ? dl : 7);
  const ms = [];
  const addM = (k) => {
    if (M[k] && !ms.includes(k)) ms.push(k);
  };
  ab.slice(0, 2).forEach((a) => AB[a.k][a.l].m.slice(0, 3).forEach(addM));
  HB.forEach((h) => {
    if (h.r.test(D.traits.habit + " " + D.traits.weak)) h.m.forEach(addM);
  });
  (SM[subjKey(focus)] || []).forEach(addM);
  if (dl != null && dl > 0 && dl <= 3) addM("sim");
  addM("spc");
  addM("retr");
  const P = phase(dl > 0 ? dl : 30),
    sk = subjKey(focus),
    T = SB[sk].t,
    T2 = SB[subjKey(second)].t,
    tt = D.exam.hrs * 60,
    f = Math.round((tt * 0.5) / 5) * 5,
    s2 = Math.round((tt * 0.3) / 5) * 5,
    r = tt - f - s2;
  D.plan = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + i);
    const l = dt.getMonth() + 1 + "/" + dt.getDate(),
      pp = phase(dl > 0 ? dl - i : 30),
      fin = pp[0] <= 1 && dl > 0;
    D.plan.push(
      {
        t: `${l} ${focus} ${f}분 · ${fin ? "시간을 재고 문제 풀기, 오답 정리" : T[i % 3]}`,
        w: `[${pp[1]}] ${pp[2]}`,
        d: 0,
      },
      {
        t: `${l} ${second} ${s2}분 · ${fin ? "헷갈린 부분만 복습" : T2[i % 3]}`,
        w: "공부 시간이 적은 과목도 놓치지 않기 위해 매일 조금씩 넣었어요.",
        d: 0,
      },
    );
    D.plan.push({
      t: `${l} ${r}분 · 오늘 배운 것을 책 덮고 백지에 써 보기`,
      w: `${M.retr.n}: ${M.retr.w}`,
      d: 0,
    });
    if (i == 1 || i == 3)
      D.plan.push({
        t: `${l} 10분 · ${i == 1 ? "어제" : "3일 전"} 공부한 내용 다시 떠올리기`,
        w: `${M.spc.n}: ${M.spc.w}`,
        d: 0,
      });
  }
  const lab = ["보완이 필요해요", "보통이에요", "좋은 편이에요"],
    top = [];
  if (ab.length)
    top.push(
      `${ab[0].n} 보완: ${M[AB[ab[0].k][ab[0].l].m[0]].n}부터 시작해 보세요.`,
    );
  top.push(
    `${focus} 과목에 집중하고, ${wk ? "직접 부족하다고 쓴 과목이에요." : "공부 시간이 가장 적은 과목이에요."}`,
  );
  top.push(`현재 단계는 "${P[1]}"예요. ${P[2]}`);
  const hab = HB.filter((h) =>
    h.r.test(D.traits.habit + " " + D.traits.weak),
  ).map((h) => h.a);
  D.sum = top.join("\n");
  D.report = `<div id="rep"></div><div class="card"><h3 class="ah">${svg("spark", 18)} 스터디 AI의 분석</h3>${ab.length ? ab.map((a) => `<p style="margin:12px 0 0"><b>${a.n}</b> · ${lab[a.l]}<br><span class="mu">근거: ${a.why}</span><br><span class="mu">${AB[a.k][a.l].d}</span></p>`).join("") : '<p class="mu">테스트 결과를 입력하면 능력별 분석이 나와요.</p>'}${
    tot
      ? `<p style="margin:12px 0 0"><b>공부 시간</b><br><span class="mu">${[
          ...D.subs,
        ]
          .sort((a, b) => (D.logs[b] || 0) - (D.logs[a] || 0))
          .slice(0, 3)
          .map((x) => `${esc(x)} ${Math.floor((D.logs[x] || 0) / 60)}분`)
          .join(" · ")} · 가장 적은 과목은 ${esc(byT[0])}이에요.</span></p>`
      : ""
  }${hab.length ? `<p style="margin:12px 0 0"><b>습관 조언</b></p>${hab.map((h) => `<p class="mu" style="margin:4px 0 0">${h}</p>`).join("")}` : ""}</div>
 <div class="card"><h3>우선순위</h3>${top.map((x, i) => `<p style="margin:${i ? 8 : 10}px 0 0">${i + 1}. ${esc(x)}</p>`).join("")}</div>
 <div class="card"><h3>추천 학습법</h3>${ms
   .slice(0, 6)
   .map(
     (k) =>
       `<div style="margin-top:14px"><b>${M[k].n}</b>${M[k].m ? ` <span class="mu">하루 ${M[k].m}분</span>` : ""}<br>${M[k].h}<br><span class="mu">왜 효과가 있나요? ${M[k].w}</span></div>`,
   )
   .join("")}</div>
 <div class="card"><h3>이 분석에 대해</h3><p class="mu" style="margin:0">입력한 점수와 습관, 내장된 학습법 자료로 만든 일반적인 안내예요. 개인 진단이나 검사 결과를 대신하지 않아요. 자료는 학습 과학 연구에서 널리 알려진 원칙을 정리한 것이라, 학교 선생님과 함께 확인하면 더 좋아요.</p></div>`;
  D.analysisDone = true;
  save();
  render();
  setTimeout(() => {
    const e = $("#rep");
    if (e && e.scrollIntoView) e.scrollIntoView({ behavior: "smooth" });
  }, 60);
}
/* ===== [/AI-ENGINE] ===== */
const LK = [
  [
    "암기력",
    [
      [
        "Human Benchmark 기억력 테스트",
        "화면에 나온 칸을 기억하며 레벨을 올려요",
        "https://humanbenchmark.com/tests/memory",
      ],
      [
        "Human Benchmark 숫자 기억",
        "점점 길어지는 숫자를 외워요",
        "https://humanbenchmark.com/tests/number-memory",
      ],
    ],
  ],
  [
    "문제풀이",
    [
      [
        "칸 아카데미",
        "수학·과학 개념 영상과 연습문제",
        "https://ko.khanacademy.org",
      ],
      ["EBSi", "무료 강의와 모의고사 자료", "https://www.ebsi.co.kr"],
      ["콴다", "모르는 문제를 찍어서 풀이 확인", "https://qanda.ai"],
    ],
  ],
  [
    "사고력",
    [
      [
        "커리어넷 직업적성검사",
        "언어·수리·논리 등 능력을 확인해요",
        "https://www.career.go.kr",
      ],
    ],
  ],
];
function linksHTML() {
  return `<div class="card"><h3>1. 외부 사이트에서 능력 확인하기</h3><p class="lt" style="margin:4px 0 0">누르면 새 탭에서 열려요. 해 본 뒤 결과를 아래에 적어 주세요.</p>${LK.map((g) => `<p class="lt"><b style="color:var(--tx)">${g[0]}</b></p>${g[1].map((l) => `<a class="lk" href="${l[2]}" target="_blank" rel="noopener"><span>${l[0]}<small>${l[1]}</small></span>${svg("out", 18)}</a>`).join("")}`).join("")}</div>`;
}

/* ===== AI 도우미 탭 : 대화 기록 · 새 대화 · 공부 모드 on/off ===== */

let AI = { v: "chat", cur: null, busy: 0, ctl: null };
const aiSet = () => { D.ai = D.ai || { study: true, tier: "default" }; D.ai.eng = "api"; return D.ai; };
const chats = () => (D.chats = D.chats || []);
const curChat = () => chats().find((c) => c.id == AI.cur);
function aiPlanHTML() {
  return `<details class="card plan-details" ${D.aiPlanText ? "open" : ""}>
    <summary>AI 맞춤 공부 계획</summary>
    <p class="mu">계획 탭에서 분석을 마친 뒤, 학습 정보에 맞춰 계획을 구체화할 수 있어요.</p>
    <button id="aiPlanBtn" onclick="generateAIPlan()">${D.aiPlanText ? "AI 계획 다시 만들기" : "AI 계획 만들기"}</button>
    <p id="aiPlanStatus" class="mu" role="status"></p>
    ${D.aiPlanText ? `<div class="ai-plan-text">${esc(D.aiPlanText)}</div>` : ""}
  </details>`;
}
function aiPage() {
  const s = aiSet(),
    top = `<div class="aih"><b>물어보세요</b><span><button class="s" onclick="go('an')">스케줄</button> <button class="s" onclick="aiView('hist')">기록</button> <button class="s" onclick="aiNew()">새 대화</button></span></div>`;
  if (AI.v == "hist") return top + histHTML();
  return (
    top + aiPlanHTML() +
    `<div class="card aiset"><label class="sw"><span><b>공부 모드</b><small>${s.study ? "공부 관련 질문에만 답해요" : "제한 없이 자유롭게 대화해요"}</small></span><input type="checkbox" role="switch" aria-label="공부 모드" ${s.study ? "checked" : ""} onchange="aiSet().study=this.checked;save();render()"></label><label class="sw"><span><b>답변 방식</b><small>설명 길이를 선택하세요</small></span><select onchange="aiSet().tier=this.value;save()">${[
      ["quick", "짧게"],
      ["default", "기본"],
      ["complex", "자세히"],
    ]
      .map(
        (o) =>
          `<option value="${o[0]}" ${s.tier == o[0] ? "selected" : ""}>${o[1]}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="lt" style="padding:10px 0">AI 답변은 틀릴 수 있어요. 중요한 개념은 교재와 함께 확인하세요.</div></div>
 <div id="chat">${chatHTML()}</div><div class="chatbar"><div class="ask"><textarea id="cq" rows="1" aria-label="메시지 입력" placeholder="${s.study ? "공부하다 궁금한 걸 물어보세요" : "무엇이든 물어보세요"}" onkeydown="if(event.key=='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();aiSend()}"></textarea>${AI.busy ? `<button class="send stopb" aria-label="멈추기" onclick="aiStop()">■</button>` : `<button class="send" aria-label="보내기" onclick="aiSend()">${svg("send", 20)}</button>`}</div></div>`
  );
}
function chatHTML() {
  const c = curChat(),
    m = c ? c.m : [];
  if (!m.length)
    return `<div class="aie"><h2>무엇을 도와드릴까요?</h2><p class="mu">${aiSet().study ? "공부 모드가 켜져 있어요" : "공부 모드가 꺼져 있어요"}</p><div class="chips">${["광합성을 쉽게 설명해줘", "근의 공식은 왜 그렇게 돼?", "영단어 오래 기억하는 방법"].map((q) => `<button class="chip2" data-q="${esc(q)}" onclick="aiSend(this.dataset.q)">${esc(q)}</button>`).join("")}</div></div>`;
  return m
    .map(
      (x) =>
        `<div class="msg ${x.r}">${x.r == "a" ? `<span class="av">${svg("spark", 16)}</span>` : ""}<div class="bub">${x.c ? esc(x.c) : '<span class="mu">생각하는 중…</span>'}</div></div>`,
    )
    .join("");
}
function paintChat() {
  const e = $("#chat");
  if (e && AI.v == "chat" && tab == "ai") {
    e.innerHTML = chatHTML();
    window.scrollTo(0, document.body.scrollHeight);
  }
}
function histHTML() {
  const L = chats();
  return `<div class="card" style="padding:4px 18px"><div class="ct" style="margin:14px 0 4px"><h3>대화 기록</h3><button class="s" onclick="aiView('chat')">돌아가기</button></div>${L.length ? L.map((c) => `<div class="lk" style="gap:8px"><button style="flex:1;background:none;color:var(--tx);text-align:left;padding:12px 0;font-weight:400;border-radius:0" onclick="openChat(${c.id})"><b>${esc(c.t)}</b><br><small class="mu">${new Date(c.ts).toLocaleDateString("ko-KR")} · ${Math.ceil(c.m.length / 2)}번 주고받음</small></button><button class="s" aria-label="이 대화 삭제" onclick="delChat(${c.id})">삭제</button></div>`).join("") : '<p class="mu">아직 대화가 없어요.</p>'}</div>`;
}
const aiView = (v) => {
  AI.v = v;
  render();
};
function aiStop() {
  if (AI.ctl) AI.ctl.abort();
}
function aiNew() {
  aiStop();
  AI.cur = null;
  AI.v = "chat";
  render();
}
function openChat(id) {
  aiStop();
  AI.cur = id;
  AI.v = "chat";
  render();
}
function delChat(id) {
  D.chats = chats().filter((c) => c.id != id);
  if (AI.cur == id) AI.cur = null;
  save();
  render();
}
async function aiSend(t) {
  const el = $("#cq");
  t = (t || (el ? el.value : "")).trim();
  if (!t || AI.busy) return;
  const accountState = D;
  let c = curChat();
  if (!c) {
    c = { id: Date.now(), t: t.slice(0, 24), ts: Date.now(), m: [] };
    chats().unshift(c);
    if (D.chats.length > 30) D.chats.length = 30;
    AI.cur = c.id;
  }
  c.m.push({ r: "u", c: t });
  const a = { r: "a", c: "" };
  c.m.push(a);
  c.ts = Date.now();
  if (c.m.length > 60) c.m.splice(0, 2);

  AI.busy = 1;
  AI.ctl = new AbortController();
  render();
  window.scrollTo(0, document.body.scrollHeight);
  const settings = aiSet();
  const turns = c.m.slice(0, -1).slice(-16).map((x) => ({
    role: x.r === "u" ? "user" : "assistant",
    content: String(x.c || "").slice(0, 3000),
  }));
  try {
    {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        signal: AI.ctl.signal,
        body: JSON.stringify({
          messages: turns,
          studyMode: !!settings.study,
          answerStyle: settings.tier,
          profile: {
            traits: D.traits || {},
            tests: D.tests || {},
            exam: D.exam || {},
            subjects: D.subs || [],
            studyLogs: D.logs || {},
            plan: (D.plan || []).map((p) => ({ task: p.t, done: !!p.d })),
            analysis: D.sum || "",
            report: D.report || "",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `서버 오류 (${response.status})`);
      a.c = data.reply || "답변을 받지 못했어요. 다시 시도해 주세요.";
    }
  } catch (e) {
    if (e && e.name === "AbortError") a.c = "(응답을 중지했어요)";
    else a.c = "AI 연결에 실패했어요. " + (e && e.message ? e.message : "서버 실행 상태와 API 설정을 확인해 주세요.");
  }
  if (D !== accountState) return;
  AI.busy = 0;
  AI.ctl = null;
  save();
  if (tab === "ai" && AI.v === "chat") render();
}

async function generateAIPlan() {
  const status = $("#aiPlanStatus");
  const button = $("#aiPlanBtn");
  if (!D) return;
  const accountState = D;
  if (!D.analysisDone) {
    if (status) status.textContent = "먼저 학습 정보를 입력하고 '분석하고 계획 만들기'를 눌러 주세요.";
    return;
  }
  if (button) { button.disabled = true; button.textContent = "AI가 계획을 만드는 중…"; }
  if (status) status.textContent = "입력한 학습 정보와 테스트 결과를 바탕으로 계획을 만들고 있어요.";
  const payload = {
    traits: D.traits || {},
    testResults: D.tests || {},
    exam: D.exam || {},
    subjects: D.subs || [],
    studyLogsSeconds: D.logs || {},
    previousAnalysis: D.sum || "",
    availableStudyHours: D.exam?.hrs || 2,
  };
  const prompt = `다음 고등학생의 학습 정보를 활용해 현실적인 맞춤 공부 계획을 한국어로 작성해 줘.

학생 정보(JSON): ${JSON.stringify(payload)}

작성 조건:
1. 자기평가와 테스트 결과를 구분하고, 테스트가 없는 능력은 추측하지 말 것.
2. 시험 날짜와 하루 공부 가능 시간을 우선 반영할 것. 날짜가 없으면 앞으로 7일 계획으로 제안할 것.
3. 부족한 과목/능력부터 우선순위를 정하고, 매일 과목·분량·공부 방법·예상 시간을 제시할 것.
4. 공부 가능 시간 합계를 넘기지 말 것. 중간 휴식도 고려할 것.
5. 외부 테스트 점수는 참고 자료일 뿐 확정적인 능력 진단처럼 말하지 말 것.
6. 마지막에 관련 학습 자료 추천을 최대 3개 제시하되, 실제로 확인하지 않은 링크는 만들지 말 것. 사이트 이름만 추천해도 됨.
7. 형식: '분석 요약', '우선순위', '하루 공부 계획', '추천 학습법/자료', '실행 팁' 제목을 사용하고 간결하게 작성할 것.`;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({
        studyMode: true,
        profile: payload,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI 요청에 실패했어요.");
    if (D !== accountState) return;
    D.aiPlanText = String(data.reply || "계획을 만들지 못했어요.").slice(0, 9000);
    D.aiPlanDate = today();
    save();
    render();
  } catch (error) {
    if (status) status.textContent = "AI 계획 생성에 실패했어요. 서버 배포 상태와 OPENAI_API_KEY 설정을 확인해 주세요. " + (error.message || "");
    if (button) { button.disabled = false; button.textContent = "다시 시도하기"; }
  }
}

function donePlan(i) {
  if (!D.plan[i].d) {
    D.plan[i].d = 1;
    D.pts += 5;
    save();
    render();
  }
}

/* 게임 공통 */
function result(back) {
  return `<div class="card" style="text-align:center"><h2>${G.sc} / ${G.n} 정답!</h2><p class="mu">포인트 ${G.sc * 3}P 획득</p><div class="row">${G.sc < G.n ? `<button class="s" onclick="G={m:'wrong'};render()">오답노트 보기</button>` : ""}<button onclick="G={m:''};render()">게임 목록</button></div></div>`;
}
const shuf = (a) => [...a].sort(() => Math.random() - 0.5);
function addWrong(k, q, a, y) {
  D.wr = D.wr || [];
  const e = D.wr.find((w) => w.q == q);
  if (e) {
    e.y = String(y);
    e.n = (e.n || 1) + 1;
  } else D.wr.unshift({ k, q, a: String(a), y: String(y), n: 1, d: today() });
  D.wr = D.wr.slice(0, 100);
  save();
}
function clrWrong(i) {
  D.wr.splice(i, 1);
  G.sh = -1;
  add(2);
  render();
}
function gWrong() {
  const w = D.wr || [],
    back = `<button class="s" onclick="G={m:''};render()" style="margin-bottom:10px">← 게임 목록</button>`;
  if (!w.length)
    return (
      back +
      `<div class="card"><h3>오답노트</h3><p class="mu" style="margin:6px 0 0">틀린 문제가 아직 없어요. 퀴즈를 풀다 틀리면 여기에 모여요.</p></div>`
    );
  return (
    back +
    `<div class="card"><h3>오답노트</h3><p class="mu" style="margin:4px 0 0">${w.length}문제 · 다시 풀어 보고 알았어요를 누르면 사라져요</p></div>` +
    w
      .map(
        (x, i) =>
          `<div class="card"><p class="mu" style="margin:0">${esc(x.k)} · ${esc(x.d.slice(5).replace("-", "/"))}${x.n > 1 ? ` · ${x.n}번 틀림` : ""}</p><p style="font-weight:700;margin:6px 0">${esc(x.q)}</p><p class="no" style="margin:0">내 답: ${esc(x.y)}</p>${G.sh == i ? `<p class="ok" style="margin:6px 0 0">정답: ${esc(x.a)}</p>` : ""}<div class="row" style="margin-top:12px"><button class="s" onclick="G.sh=${i};render()">정답 보기</button><button onclick="clrWrong(${i})">알았어요 +2P</button></div></div>`,
      )
      .join("")
  );
}
function startMath(lv) {
  G = { m: "math", lv, i: 0, sc: 0, n: 10, fb: "" };
  newQ();
  render();
}
function newQ() {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    l = G.lv || 1,
    t = r(0, 6);
  let q, a, k;
  if (t == 0) {
    const x = r(11, l > 1 ? 999 : 99),
      y = r(11, l > 1 ? 999 : 99);
    k = "덧셈";
    q = `${x} + ${y} = ?`;
    a = x + y;
  } else if (t == 1) {
    const x = r(30, l > 1 ? 999 : 99),
      y = r(11, x - 5);
    k = "뺄셈";
    q = `${x} − ${y} = ?`;
    a = x - y;
  } else if (t == 2) {
    const x = r(11, l > 1 ? 29 : 15),
      y = r(3, l > 1 ? 19 : 9);
    k = "곱셈";
    q = `${x} × ${y} = ?`;
    a = x * y;
  } else if (t == 3) {
    const b = r(3, l > 1 ? 25 : 12),
      c = r(3, l > 1 ? 40 : 15);
    k = "나눗셈";
    q = `${b * c} ÷ ${b} = ?`;
    a = c;
  } else if (t == 4) {
    const p = Math.random() < 0.6,
      b = p ? r(2, l > 1 ? 20 : 12) : r(2, l > 1 ? 6 : 4),
      e = p ? 2 : r(3, l > 1 ? 5 : 4);
    k = "거듭제곱";
    q = `${b}${["", "", "²", "³", "⁴", "⁵"][e]} = ?`;
    a = b ** e;
  } else if (t == 5) {
    const n = r(2, l > 1 ? 25 : 15);
    k = "제곱근";
    q = `√${n * n} = ?`;
    a = n;
  } else {
    const w = r(0, l > 1 ? 3 : 1);
    let T = [];
    k = "수열 · 다음에 올 수";
    if (w == 0) {
      const s = r(1, l > 1 ? 20 : 10),
        d = r(2, l > 1 ? 9 : 6);
      T = [0, 1, 2, 3].map((i) => s + d * i);
      a = s + 4 * d;
    } else if (w == 1) {
      const s = r(1, 4),
        m = l > 1 ? r(2, 3) : 2;
      T = [0, 1, 2, 3].map((i) => s * m ** i);
      a = s * m ** 4;
    } else if (w == 2) {
      const s = r(1, 6);
      T = [0, 1, 2, 3].map((i) => (s + i) ** 2);
      a = (s + 4) ** 2;
    } else {
      const x = r(1, 4),
        y = r(1, 4);
      T = [x, y, x + y, x + 2 * y];
      a = 2 * x + 3 * y;
    }
    q = T.join(", ") + ", ?";
  }
  G.q = q;
  G.a = a;
  G.k = k;
}
function gMath() {
  if (G.i >= G.n) return result();
  return `<div class="card"><p class="mu">${G.i + 1} / ${G.n} · ${G.k} ${G.fb}</p><div class="big" style="font-size:34px;margin:14px 0">${G.q}</div><input id="ans" type="number" inputmode="numeric" onkeydown="if(event.key=='Enter')chkMath()"><button class="w" onclick="chkMath()">확인</button></div>`;
}
function chkMath() {
  const v = $("#ans").value;
  if (v === "") return;
  const ok = +v === G.a;
  if (ok) {
    G.sc++;
    add(3);
  } else addWrong(G.k, G.q, G.a, v);
  G.fb = ok ? "· 지난 문제 정답 ⭕" : "· 지난 문제 오답 ❌ (정답 " + G.a + ")";
  G.i++;
  newQ();
  render();
}
const HQ = [
  ["훈민정음을 만든 왕은?", "세종대왕", "태종", "정조", "광개토대왕"],
  ["임진왜란이 시작된 해는?", "1592년", "1392년", "1636년", "1910년"],
  ["고구려를 세운 사람은?", "주몽", "온조", "박혁거세", "왕건"],
  ["고려를 세운 사람은?", "왕건", "이성계", "궁예", "견훤"],
  ["조선을 세운 사람은?", "이성계", "왕건", "정도전", "이방원"],
  ["3·1 운동이 일어난 해는?", "1919년", "1910년", "1945년", "1950년"],
  ["거북선으로 유명한 장군은?", "이순신", "강감찬", "을지문덕", "김유신"],
  ["한글날은 몇 월일까요?", "10월", "9월", "1월", "5월"],
  ["광개토대왕이 다스린 나라는?", "고구려", "백제", "신라", "가야"],
  ["살수대첩을 이끈 장군은?", "을지문덕", "강감찬", "이순신", "김유신"],
  ["귀주대첩을 이끈 장군은?", "강감찬", "서희", "윤관", "최영"],
  [
    "거란과 담판을 지어 강동 6주를 얻은 사람은?",
    "서희",
    "강감찬",
    "최무선",
    "정몽주",
  ],
  ["경국대전을 완성한 왕은?", "성종", "세종", "태조", "영조"],
  ["균역법을 시행한 왕은?", "영조", "정조", "숙종", "성종"],
  ["수원 화성을 지은 왕은?", "정조", "영조", "세종", "고종"],
  ["병자호란이 일어난 해는?", "1636년", "1592년", "1876년", "1894년"],
  ["동학농민운동이 일어난 해는?", "1894년", "1876년", "1905년", "1910년"],
  ["대한민국 정부가 수립된 해는?", "1948년", "1945년", "1950년", "1960년"],
  ["6·25 전쟁이 일어난 해는?", "1950년", "1945년", "1953년", "1960년"],
  ["발해를 세운 사람은?", "대조영", "주몽", "왕건", "궁예"],
  ["훈민정음이 반포된 해는?", "1446년", "1392년", "1592년", "1910년"],
  ["신라의 삼국 통일을 이룬 왕은?", "문무왕", "진흥왕", "선덕여왕", "법흥왕"],
];
const DECKS = {
  한국사: [
    ["고조선을 세운 사람", "단군왕검"],
    ["금관가야를 세운 사람", "김수로왕"],
    ["신라가 불교를 공인한 왕과 해", "법흥왕, 527년"],
    ["한강 유역을 차지한 신라의 왕", "진흥왕"],
    ["발해를 세운 사람과 세운 해", "대조영, 698년"],
    ["고려가 건국된 해", "918년, 왕건"],
    ["훈민정음 창제와 반포", "세종, 1443년 창제·1446년 반포"],
    ["임진왜란이 시작된 해", "1592년"],
    ["병자호란이 일어난 해", "1636년"],
    ["강화도 조약이 체결된 해", "1876년"],
    ["3·1 운동과 대한민국 임시정부 수립", "1919년"],
    ["광복", "1945년 8월 15일"],
    ["대한민국 정부 수립", "1948년"],
    ["6·25 전쟁", "1950년 발발, 1953년 휴전"],
    ["4·19 혁명", "1960년"],
  ],
  영단어: [
    ["abandon", "버리다"],
    ["ability", "능력"],
    ["accept", "받아들이다"],
    ["achieve", "이루다"],
    ["agree", "동의하다"],
    ["ancient", "고대의"],
    ["appear", "나타나다"],
    ["attempt", "시도하다"],
    ["avoid", "피하다"],
    ["benefit", "이익"],
    ["challenge", "도전"],
    ["compare", "비교하다"],
    ["concern", "걱정, 관심"],
    ["decide", "결정하다"],
    ["develop", "발전하다"],
    ["effort", "노력"],
    ["environment", "환경"],
    ["improve", "향상시키다"],
    ["include", "포함하다"],
    ["necessary", "필요한"],
  ],
  과학: [
    ["광합성의 재료", "이산화 탄소와 물 (빛 에너지 이용)"],
    ["세포의 에너지 공장", "미토콘드리아"],
    ["공기 중 가장 많은 기체", "질소 (약 78%)"],
    ["물의 화학식", "H₂O"],
    ["속력 공식", "속력 = 거리 ÷ 시간"],
    ["밀도 공식", "밀도 = 질량 ÷ 부피"],
    ["지표면 중력가속도", "약 9.8 m/s²"],
    ["산성 용액의 pH", "7보다 작다"],
    ["원자를 이루는 입자", "양성자, 중성자, 전자"],
    ["소리가 전달되지 않는 곳", "진공 (매질이 없어서)"],
    ["지구 자전 주기와 공전 주기", "자전 약 24시간, 공전 약 365일"],
    ["태양계에서 가장 큰 행성", "목성"],
    ["유전 정보를 담고 있는 물질", "DNA"],
    ["빛의 속력", "약 30만 km/s"],
    ["식물 세포에만 있는 구조", "세포벽, 엽록체"],
  ],
  수학: [
    ["피타고라스 정리", "a² + b² = c²"],
    ["원의 넓이와 둘레", "넓이 πr², 둘레 2πr"],
    ["삼각형의 넓이", "밑변 × 높이 ÷ 2"],
    ["사다리꼴의 넓이", "(윗변 + 아랫변) × 높이 ÷ 2"],
    ["이차방정식 근의 공식", "x = (−b ± √(b² − 4ac)) ÷ 2a"],
    ["등차수열의 n번째 항", "a + (n − 1)d"],
    ["등비수열의 n번째 항", "a × r를 (n−1)번 곱한 값"],
    ["지수법칙 aᵐ × aⁿ", "aᵐ⁺ⁿ"],
    ["(a + b)²", "a² + 2ab + b²"],
    ["a² − b²", "(a + b)(a − b)"],
    ["a⁰ (a≠0)", "1"],
    ["직각삼각형의 빗변", "√(밑변² + 높이²)"],
  ],
};
function gameMenu() {
  const n = Object.values(DECKS).reduce((a, b) => a + b.length, 0),
    rows = [
      [
        "암산 기본",
        "덧셈·뺄셈·곱셈·나눗셈·거듭제곱·제곱근·수열 10문제",
        "startMath(1)",
      ],
      ["암산 도전", "숫자가 커지고 수열도 어려워져요 · 10문제", "startMath(2)"],
      ["역사 퀴즈", `한국사 ${HQ.length}문제 중 10문제`, "startHist()"],
      [
        "암기 카드",
        `한국사·영단어·과학·수학 ${n}장 + 내 카드`,
        "G={m:'card',i:0,f:0};render()",
      ],
      [
        "오답노트",
        `틀린 문제 ${(D.wr || []).length}개 다시 보기`,
        "G={m:'wrong'};render()",
      ],
    ];
  return `<div class="card"><h3>미니게임</h3><p class="mu" style="margin:4px 0 0">정답 하나에 3P, 카드 복습은 2P예요.</p></div><div class="card" style="padding:4px 18px">${rows.map((r, i) => `<button class="lk" style="width:100%;background:none;border-radius:0;padding:14px 0;text-align:left;color:var(--tx);font-weight:400;${i ? "" : "border-top:0"}" onclick="${r[2]}"><span><b>${r[0]}</b><small>${r[1]}</small></span>${svg("chev", 18)}</button>`).join("")}</div>`;
}
function startHist() {
  G = { m: "hist", i: 0, sc: 0, n: 10, qs: shuf(HQ).slice(0, 10), fb: "" };
  render();
}
function gHist() {
  if (G.i >= G.n) return result();
  const q = G.qs[G.i];
  return `<div class="card"><p class="mu">${G.i + 1} / ${G.n} ${G.fb}</p><h3 style="margin-bottom:12px">${q[0]}</h3>${shuf(
    q.slice(1),
  )
    .map(
      (o) =>
        `<button class="opt" data-o="${esc(o)}" onclick="chkH(this.dataset.o)">${esc(o)}</button>`,
    )
    .join("")}</div>`;
}
function chkH(o) {
  const ok = o === G.qs[G.i][1];
  if (ok) {
    G.sc++;
    add(3);
  } else addWrong("역사", G.qs[G.i][0], G.qs[G.i][1], o);
  G.fb = ok
    ? "· 지난 문제 정답 ⭕"
    : "· 지난 문제 오답 ❌ (정답 " + G.qs[G.i][1] + ")";
  G.i++;
  render();
}
function gCard() {
  const mine = !G.dk || G.dk == "내 카드",
    c = mine ? D.cards : DECKS[G.dk].map(x => ({ f: x[0], b: x[1] }));
  const form = `<div class="card"><h3>카드 만들기</h3><input id="cf" placeholder="앞면 (질문)"><input id="cb" placeholder="뒷면 (답)"><button class="w" onclick="addCard()">카드 추가</button></div>`;
  const back = `<button class="s" onclick="G={m:''};render()" style="margin-bottom:10px">← 게임 목록</button>`;
  const dk = `<div class="chips" style="justify-content:flex-start;margin:0 0 12px">${["내 카드", ...Object.keys(DECKS)].map((n) => `<button class="chip2 ${(G.dk || "내 카드") == n ? "on" : ""}" onclick="G.dk='${n}';G.i=0;G.f=0;render()">${n}</button>`).join("")}</div>`,
    frm = mine ? form : "";
  if (!c.length)
    return (
      back +
      dk +
      (mine
        ? `<p class="mu">아직 만든 카드가 없어요. 아래에서 추가해 보세요.</p>`
        : "") +
      frm
    );
  const k = G.i % c.length;
  return (
    back +
    dk +
    `<div class="card"><p class="mu">${k + 1} / ${c.length}</p><div class="flip" onclick="G.f=!G.f;render()">${esc(G.f ? c[k].b : c[k].f)}</div><p class="mu" style="text-align:center">${G.f ? "답을 확인했어요" : "카드를 눌러 답 보기"}</p><div class="row"><button class="s" onclick="G.i++;G.f=0;render()">몰라요</button><button onclick="add(2);G.i++;G.f=0;render()">알아요 +2P</button></div>${mine ? `<button class="s" style="margin-top:10px" onclick="delCard(${k})">이 카드 삭제</button>` : ""}</div>` +
    frm
  );
}
function addCard() {
  const f = $("#cf").value.trim(),
    b = $("#cb").value.trim();
  if (f && b) {
    D.cards.push({ f, b });
    save();
    render();
  }
}
function delCard(k) {
  D.cards.splice(k, 1);
  G.f = 0;
  save();
  render();
}


/* ===== JavaScript 기능 끝 ===== */

async function boot(){
 try { csrf = sessionStorage.getItem(tabSessionKey) || ''; } catch {}
 if (!csrf) { render(); return; }
 $('#app').innerHTML='<main class="auth-page"><h2>공부 기록을 불러오는 중…</h2></main>';
 try{loadAccount(await api('/me'));}catch(e){if(e.status===401){csrf='';try { sessionStorage.removeItem(tabSessionKey); } catch {}}render();if(e.status!==401){const el=$('#lm');if(el)el.textContent=e.message;}}
}
