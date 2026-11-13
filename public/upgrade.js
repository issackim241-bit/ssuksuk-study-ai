/* 화면 개편과 추가 학습 활동. 기존 계획·AI·암기 카드 기능을 이어 사용합니다. */
const sectionTitle=(eyebrow,title,desc='')=>`<div class="page-heading">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h1>${title}</h1>${desc?`<p class="mu">${desc}</p>`:''}</div>`;
const gameBack=()=>'<button class="s back" onclick="go(\'game\')">← 학습 놀이터</button>';
V.home=function(){
 const minutes=Math.floor(totalStudySeconds()/60),todo=D.plan.map((p,i)=>({...p,index:i})).filter(p=>!p.d).slice(0,4);
 const count=D.plan.filter(p=>p.d).length;
 return `<div class="home-title"><div><p class="eyebrow">${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</p><h1>${esc(cur)}의 공부방</h1></div></div>
 <div class="stat-strip"><div><small>누적 공부</small><b>${minutes}<em>분</em></b></div><div><small>완료한 계획</small><b>${count}<em>개</em></b></div><div><small>누적 출석</small><b>${D.att.length}<em>일</em></b></div></div>
 <section class="card"><div class="ct"><h2>해야 할 일</h2><button class="text-btn" onclick="go('an')">계획 관리 →</button></div>${todo.length?todo.map(p=>`<label class="todo-line"><input type="checkbox" onchange="donePlan(${p.index})"><span>${esc(p.t)}</span></label>`).join(''):'<div class="empty-state"><p>오늘의 작은 목표를 정해 보세요.</p><button class="s" onclick="go(\'an\')">계획 만들기</button></div>'}</section>
 <section class="shortcut-grid"><button onclick="go('game')"><span class="shortcut-icon">＋</span><b>학습 놀이터</b><small>짧게 풀고 다시 집중</small></button><button onclick="gc()"><span class="shortcut-icon">Aa</span><b>암기 카드</b><small>오늘 배운 내용 복습</small></button></section>
 <section class="card"><div class="ct"><h2>공부 메모</h2><small class="mu">계정에 저장</small></div><form class="memo-entry" onsubmit="event.preventDefault();addNote()"><input id="memoText" maxlength="160" placeholder="잊기 전에 적어 두기"><button>추가</button></form><div class="memo-list">${(D.notes||[]).slice().reverse().map((n,i)=>`<div class="memo-item"><span>${esc(n.text)}</span><button class="icon-btn" aria-label="메모 삭제" onclick="delNote(${D.notes.length-1-i})">×</button></div>`).join('')||'<p class="mu">아직 적어 둔 메모가 없어요.</p>'}</div></section>
 ${gardenHTML()}`;
};
const originalRender=render;
render=function(){
 originalRender();if(!D)return;
 document.body.dataset.page=tab;
 const header=$('header');header.innerHTML=`<a class="wordmark" href="#" onclick="event.preventDefault();go('home')">쑥쑥<span>스터디</span></a><div class="header-right"><button id="syncStatus" class="sync-status" onclick="flushSave()">${esc(syncMessage)}</button><span class="point">${D.pts.toLocaleString("ko-KR")} P</span><button class="avatar" aria-label="내 프로필" aria-current="${tab === "profile" ? "page" : "false"}" onclick="go('profile')">${avatarArt()}</button></div>`;
 const nav=$('nav');nav.innerHTML=[['home','홈'],['an','계획'],['game','놀이터'],['ai','질문']].map(([key,name])=>`<button class="${tab===key?'on':''}" onclick="go('${key}')">${svg(key)}<span>${name}</span></button>`).join('');
 if(tab==='game'&&G.m&&!['news','newsQuiz','quiz','memory','pairs'].includes(G.m))$('main').insertAdjacentHTML('afterbegin',gameBack());
 updateSync();
};
const games=[
 ['01','암산 워밍업','math','계산','사칙연산부터 제곱근까지','startMath(1)'],
 ['02','암산 챌린지','math','계산','조금 더 큰 수로 도전','startMath(2)'],
 ['03','분수 계산','fraction','계산','분모를 맞추는 연습',"startQuiz('fraction')"],
 ['04','퍼센트 감각','percent','계산','할인율과 비율을 빠르게',"startQuiz('percent')"],
 ['05','방정식 한 줄','equation','계산','미지수 x를 찾아 봐요',"startQuiz('equation')"],
 ['06','단위 바꾸기','unit','계산','길이·무게·시간 환산',"startQuiz('unit')"],
 ['07','수열 탐정','sequence','사고력','숫자 사이 규칙 찾기',"startQuiz('sequence')"],
 ['08','숫자 기억','memory','사고력','잠깐 보고 순서대로 입력',"startMemory()"],
 ['09','짝 맞추기','pairs','사고력','영단어와 뜻을 연결',"startPairs()"],
 ['10','영단어 퀴즈','vocab','과목','뜻을 보고 알맞은 단어 선택',"startQuiz('vocab')"],
 ['11','과학 개념','science','과목','기본 개념을 네 보기로',"startQuiz('science')"],
 ['12','맞춤법 한 판','spelling','과목','자주 헷갈리는 표현 정리',"startQuiz('spelling')"],
 ['13','한국사 퀴즈','history','과목','시대와 사건을 짚어 봐요','startHist()'],
 ['14','암기 카드','cards','복습','직접 만들거나 기본 카드 복습','gc()'],
 ['15','오답 다시 보기','wrong','복습','놓친 문제만 모아서',"G={m:'wrong'};render()"],
 ['16','한 장씩 개념 읽기','news','복습','카드뉴스를 읽고 응용 문제 풀기','startNews(0)'],
 ['17','심화 응용 퀴즈','challenge','사고력','확률·농도·자료 해석을 여러 단계로 풀기',"startQuiz('challenge')"]
];

const schoolLevels = {
 elementary: {name:'초등', description:'사칙연산·기초 개념'},
 middle: {name:'중등', description:'교과 개념 적용'},
 high: {name:'고등', description:'추론·자료 해석'},
};
const levelSubjects = {
 math:['수학','계산'],
 science:['과학','과목'],
 korean:['국어','과목'],
 english:['영어','과목'],
};
const currentSchoolLevel = () => Object.hasOwn(schoolLevels, D.gameLevel) ? D.gameLevel : 'high';

function selectSchoolLevel(level) {
 if (!Object.hasOwn(schoolLevels, level)) return;
 D.gameLevel = level;
 save();
 render();
 document.querySelector('[data-school-level="' + level + '"]')?.focus();
}

function nextSetIndex(level, subject) {
 const saved = D.quizSetProgress?.[level + '.' + subject];
 return Number.isInteger(saved) && saved >= 0 && saved < levelBanks[level][subject].length ? saved : 0;
}

function startLevelQuiz(subject) {
 if (!Object.hasOwn(levelSubjects, subject)) return;
 const level = currentSchoolLevel();
 const sets = levelBanks[level][subject];
 const index = nextSetIndex(level, subject);
 const deck = sets[index];
 D.quizSetProgress = {...D.quizSetProgress, [level + '.' + subject]: (index + 1) % sets.length};
 save();
 const title = schoolLevels[level].name + ' ' + levelSubjects[subject][0] + ' · ' + (index + 1) + '세트';
 G = {m:'quiz', type:'school', subject, title, i:0, n:deck.length, sc:0, deck};
 nextQuiz();
 render();
}

function schoolLevelHTML() {
 const level = currentSchoolLevel();
 return `<section class="card school-level">
  <h2>문제 수준</h2>
  <div class="school-level-buttons" role="group" aria-label="문제 수준">
   ${Object.entries(schoolLevels).map(([key, item]) => `<button class="s" data-school-level="${key}" aria-pressed="${key === level}" onclick="selectSchoolLevel('${key}')">
    <b>${item.name}</b><small>${item.description}</small>
   </button>`).join('')}
  </div>
 </section>`;
}

function gameTile(title, category, description, action) {
 return `<button class="game-tile" onclick="${action}">
  <span class="game-category">${category}</span><h2>${title}</h2><p>${description}</p><span class="game-arrow" aria-hidden="true">↗</span>
 </button>`;
}

gameMenu = function () {
 const level = currentSchoolLevel();
 const subjectTiles = Object.entries(levelSubjects).map(([key, [name, category]]) =>
  gameTile(name, category, '다음 ' + (nextSetIndex(level, key) + 1) + '세트 · 4문제', "startLevelQuiz('" + key + "')")).join('');
 const commonActivities = games.filter(game => ['memory','pairs','cards','wrong','news'].includes(game[2]));
 const practice = games.filter(game => !commonActivities.includes(game));
 const gameTiles = list => list.map(([, title, , category, description, action]) => gameTile(title, category, description, action)).join('');
 return sectionTitle('', '학습 놀이터') + schoolLevelHTML() +
  `<div class="game-grid">${subjectTiles}</div>
   <details class="card plan-details"><summary>암기 카드와 카드뉴스</summary><div class="game-grid">${gameTiles(commonActivities)}</div></details>
   <details class="card plan-details"><summary>추가 연습</summary><div class="game-grid">${gameTiles(practice)}</div></details>
   <section class="card"><h2>최근 플레이</h2>${(D.gameHistory || []).slice(0, 10).map(item =>
    `<div class="history-line"><span>${esc(item.title)}</span><b>${item.score} / ${item.total}</b><small>${esc(item.date)}</small></div>`).join('') || '<p class="mu">한 판을 마치면 여기에 기록됩니다.</p>'}</section>`;
};

const randomInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
function shuffled(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=randomInt(0,i);[out[i],out[j]]=[out[j],out[i]];}return out;}
const GAME_COMPLETION_POINTS = 2;
function recordGame(title, score, total, completionPoints = 0) {
 D.gameHistory ||= [];
 D.gameHistory.unshift({title, score, total, date:today()});
 D.gameHistory = D.gameHistory.slice(0, 100);
 add(completionPoints);
}
const vocabBank=[['achieve','성취하다'],['compare','비교하다'],['evidence','증거'],['environment','환경'],['increase','증가하다'],['reduce','줄이다'],['require','필요로 하다'],['purpose','목적'],['predict','예측하다'],['discover','발견하다'],['provide','제공하다'],['consider','고려하다'],['improve','개선하다'],['prevent','예방하다'],['specific','구체적인'],['accurate','정확한'],['benefit','이익'],['challenge','도전'],['method','방법'],['result','결과']];
const scienceBank=[
 ['식물이 빛에너지를 이용해 양분을 만드는 과정은?','광합성','호흡','증발','응결','광합성에서는 빛에너지를 이용해 이산화 탄소와 물로 양분을 만듭니다.'],
 ['힘의 SI 단위는?','뉴턴(N)','줄(J)','와트(W)','파스칼(Pa)','힘은 뉴턴, 에너지는 줄, 일률은 와트로 나타냅니다.'],
 ['전류의 세기를 나타내는 단위는?','암페어(A)','볼트(V)','옴(Ω)','헤르츠(Hz)','전류는 암페어, 전압은 볼트, 저항은 옴을 씁니다.'],
 ['기체가 액체로 바뀌는 현상은?','응결','기화','융해','승화','기체가 열을 잃고 액체로 변하는 현상이 응결입니다.'],
 ['산성 수용액의 pH는 보통?','7보다 작다','항상 7이다','7보다 크다','항상 14이다','상온에서 중성은 약 pH 7, 산성은 이보다 작습니다.'],
 ['지구 대기에서 가장 많은 기체는?','질소','산소','이산화 탄소','수소','질소가 약 78%, 산소가 약 21%를 차지합니다.'],
 ['세포에서 유전 정보를 주로 담고 있는 물질은?','DNA','녹말','물','지방','DNA의 염기 서열에 유전 정보가 저장됩니다.'],
 ['속력 계산식으로 맞는 것은?','거리 ÷ 시간','시간 ÷ 거리','거리 × 시간','거리 + 시간','같은 거리를 더 짧은 시간에 이동하면 속력이 커집니다.'],
 ['전기 저항이 일정할 때 전압이 2배가 되면 전류는?','2배','절반','같다','4배','옴의 법칙 V=IR에 따라 전류도 2배가 됩니다.'],
 ['물체의 운동 상태 변화를 방해하는 성질은?','관성','부력','마찰력','탄성력','관성은 정지나 등속 운동 상태를 유지하려는 성질입니다.'],
 ['소리가 전달될 수 없는 곳은?','진공','공기','물','철','소리는 매질의 진동으로 전달되므로 진공에서는 전달되지 않습니다.'],
 ['원자핵을 구성하는 입자는?','양성자와 중성자','전자와 광자','전자와 중성자','양성자와 전자','전자는 원자핵 주위에 분포합니다.']
];
const spellingBank=[
 ['올바른 표현을 고르세요.','며칠','몇일','몇 일','멷일','날짜나 기간을 물을 때는 ‘며칠’로 씁니다.'],
 ['올바른 표현을 고르세요.','금세','금새','금세에','금쌔','‘금시에’가 줄어든 말은 ‘금세’입니다.'],
 ['올바른 문장을 고르세요.','내일 봬요.','내일 뵈요.','내일 뵙요.','내일 뵈어요요.','‘뵈어요’를 줄이면 ‘봬요’가 됩니다.'],
 ['올바른 표현을 고르세요.','웬일이야?','왠일이야?','왠 일이야?','웬이리야?','‘어찌 된 일’은 ‘웬일’입니다. ‘왠지’와 구별하세요.'],
 ['빈칸에 알맞은 말: 숙제를 ___.','안 했다','않 했다','안했다요','않했다','‘안’은 뒤의 말을 부정하는 부사입니다.'],
 ['올바른 표현을 고르세요.','어떡해','어떻해','어떡헤','어떻헤','‘어떻게 해’가 줄어든 말은 ‘어떡해’입니다.'],
 ['올바른 표현을 고르세요.','설레다','설레이다','설래이다','설래다','표준어는 ‘설레다’입니다.'],
 ['올바른 표현을 고르세요.','오랜만','오랫만','오레만','오랬만','‘오래간만’이 줄어든 말은 ‘오랜만’입니다.'],
 ['올바른 표현을 고르세요.','역할','역활','역활이요오','역핼','맡은 일을 뜻하는 단어는 ‘역할’입니다.'],
 ['올바른 표현을 고르세요.','돼요','되요','됍요','됀요','‘되어요’를 줄이면 ‘돼요’가 됩니다.']
];
const challengeBank = [
 ['빨간 공 3개와 파란 공 2개 중 공을 두 개 꺼낸다. 첫 공을 돌려놓지 않을 때 두 공이 같은 색일 확률은?', '2/5', '1/5', '12/25', '3/5', '전체 10쌍 중 빨간색끼리 3쌍, 파란색끼리 1쌍이므로 4/10 = 2/5입니다.'],
 ['소금물 200g의 농도는 8%다. 물만 증발시켜 농도를 10%로 만들려면 물을 몇 g 줄여야 할까?', '40g', '20g', '16g', '50g', '소금 16g은 그대로예요. 최종 용액은 16 ÷ 0.10 = 160g이므로 40g을 줄입니다.'],
 ['A반 20명의 평균은 72점, B반 30명의 평균은 82점이다. 두 반을 합친 평균은?', '78점', '77점', '79점', '80점', '인원수를 반영해 (20 × 72 + 30 × 82) ÷ 50 = 78점입니다.'],
 ['어떤 수에 25%를 더한 뒤 그 결과의 20%를 빼면 96이 된다. 처음 수는?', '96', '92', '100', '120', '1.25 × 0.8 = 1이므로 결과는 처음 수와 같습니다.'],
 ['같은 거리를 갈 때는 시속 60km, 돌아올 때는 시속 40km였다. 왕복 평균 속력은?', '48km/h', '50km/h', '46km/h', '52km/h', '편도 120km로 생각하면 갈 때 2시간, 올 때 3시간입니다. 240 ÷ 5 = 48km/h예요.'],
 ['식물의 빛 세기에 따른 성장 차이를 확인하려 한다. 실험에서 함께 바꾸면 결과 해석이 가장 어려워지는 조건은?', '물의 양', '화분에 붙인 번호', '기록표 글씨체', '측정 결과의 단위 표기 방식', '물의 양도 성장에 영향을 줍니다. 물과 빛을 동시에 바꾸면 어떤 요인이 차이를 만들었는지 구분하기 어려워요.']
];
function startQuiz(type) {
 const title = games.find(game => game[2] === type)[1];
 const bank = {science:scienceBank, spelling:spellingBank, challenge:challengeBank}[type] || vocabBank;
 G = {m:'quiz', type, title, i:0, n:type === 'challenge' ? bank.length : 10, sc:0, answered:false, deck:shuffled(bank)};
 nextQuiz();
 render();
}
function nextQuiz(){
 G.answered=false;G.answer='';let a=randomInt(2,12),b=randomInt(2,12);
 if(G.type==='fraction'){const n=randomInt(2,10),x=randomInt(1,n-1),y=randomInt(1,n-1);G.q=`${x}/${n} + ${y}/${n} = ?`;G.a=(x+y)/n;G.display=`${x+y}/${n}`;G.explain=`분모가 같으므로 분자는 ${x}+${y}, 분모는 ${n} 그대로입니다. 소수나 분수로 답할 수 있어요.`;}
 if(G.type==='percent'){const base=randomInt(2,20)*100,rate=randomInt(1,9)*10;G.q=`${base}의 ${rate}%는?`;G.a=base*rate/100;G.explain=`${base} × ${rate}/100 = ${G.a}`;}
 if(G.type==='equation'){const x=randomInt(-9,20);G.q=`${a}x + ${b} = ${a*x+b}, x = ?`;G.a=x;G.explain=`양변에서 ${b}을 빼고 ${a}로 나누면 x=${x}입니다.`;}
 if(G.type==='unit'){const types=[['m','cm',100],['kg','g',1000],['시간','분',60],['L','mL',1000],['km','m',1000]];const [from,to,factor]=types[randomInt(0,4)];G.q=`${a} ${from} = 몇 ${to}?`;G.a=a*factor;G.explain=`1 ${from} = ${factor} ${to}이므로 ${a} × ${factor}입니다.`;}
 if(G.type==='sequence'){G.q=`${[0,1,2,3].map(i=>a+i*b).join(', ')}, 다음 수는?`;G.a=a+4*b;G.explain=`${b}씩 커지는 수열입니다.`;}
 G.options=null;
 if (G.type === 'school') {
  const [question, answer, ...rest] = G.deck[G.i];
  G.q = question;
  G.a = answer;
  G.explain = rest.pop();
  G.options = shuffled([answer, ...rest]);
  return;
 }
 if(['vocab','science','spelling','challenge'].includes(G.type)){
  const row=G.deck[G.i%G.deck.length];
  if(G.type==='vocab'){G.q=`‘${row[1]}’에 해당하는 영단어는?`;G.a=row[0];G.options=shuffled([row[0],...shuffled(vocabBank.filter(x=>x[0]!==row[0])).slice(0,3).map(x=>x[0])]);G.explain=`${row[0]}: ${row[1]}`;}
  else{G.q=row[0];G.a=row[1];G.options=shuffled(row.slice(1,5));G.explain=row[5];}
 }
}
function submitQuiz(value){
 if(G.answered)return;let answer=value??$('#quizAnswer').value.trim();if(!answer)return;
 let numeric=Number(answer);if(/^[-+]?\d+\s*\/\s*\d+$/.test(answer)){const [x,y]=answer.split('/').map(Number);numeric=y?x/y:NaN;}
 G.correct=G.options?answer===G.a:Number.isFinite(numeric)&&Math.abs(numeric-G.a)<1e-7;G.answer=answer;G.answered=true;
 if(G.correct){G.sc++;D.pts+=3;}else addWrong(G.title,G.q,G.display||G.a,answer);
 save();render();
}
function advanceQuiz() {
 if (!G.answered || G.i >= G.n) return;
 G.i++;
 if (G.i < G.n) { delete G.display; nextQuiz(); }
 else recordGame(G.title, G.sc, G.n, GAME_COMPLETION_POINTS);
 render();
}
function quizHTML(){
 if(G.i>=G.n)return gameBack()+`<section class="card result-card"><span class="eyebrow">한 판 완료</span><h1>${G.sc}<small> / ${G.n}</small></h1><p>${G.sc/G.n>=0.8?'감각이 좋네요. 다음에도 이어 가 봐요.':'틀린 문제는 오답노트에 모아 뒀어요.'}</p><p class="mu">${G.sc*3 + GAME_COMPLETION_POINTS}P 적립 · 서버에 기록됩니다</p><button onclick="${G.type === 'school' ? "startLevelQuiz('" + G.subject + "')" : "startQuiz('" + G.type + "')"}">${G.type === 'school' ? '다음 세트' : '한 번 더'}</button><button class="s" onclick="go('game')">목록으로</button></section>`;
 return gameBack()+sectionTitle(G.title,`${G.i+1}번째 문제`)+`<section class="card quiz-card"><div class="bar"><i style="width:${G.i/G.n*100}%"></i></div><p class="mu">${G.i+1} / ${G.n} · ${G.sc}개 정답</p><h2 class="quiz-question">${esc(G.q)}</h2>${G.options?`<div class="quiz-options">${G.options.map((o,i)=>`<button ${G.answered?'disabled':''} class="${G.answered&&o===G.a?'correct':''}" onclick="submitQuiz(G.options[${i}])"><small>${i+1}</small>${esc(o)}</button>`).join('')}</div>`:`<form onsubmit="event.preventDefault();submitQuiz()"><label class="sr-only" for="quizAnswer">정답</label><input id="quizAnswer" autocomplete="off" placeholder="정답 입력${G.type==='fraction'?' (예: 3/4)':''}" ${G.answered?'disabled':''}><button class="w" ${G.answered?'disabled':''}>정답 확인</button></form>`}${G.answered?`<div class="answer-feedback ${G.correct?'correct':'incorrect'}"><b>${G.correct?'정답입니다.':'정답: '+esc(G.display||G.a)}</b><p>${esc(G.explain)}</p><button onclick="advanceQuiz()">${G.i===G.n-1?'결과 보기':'다음 문제'}</button></div>`:''}</section>`;
}
let memoryTimeout,pairTimeout;
function startMemory(){clearTimeout(memoryTimeout);G={m:'memory',phase:'ready',level:3,sc:0,round:0};render();}
function showMemory(){G.digits=Array.from({length:G.level},()=>randomInt(0,9)).join('');G.phase='show';render();const current=G;memoryTimeout=setTimeout(()=>{if(G!==current||tab!=='game')return;G.phase='input';render();},Math.max(1800,G.level*550));}
function answerMemory(){const value=$('#memoryAnswer').value.trim();if(!value)return;const ok=value===G.digits;G.phase='answer';G.correct=ok;if(ok){G.sc++;G.level++;D.pts+=3;}G.round++;save();render();}
function memoryHTML(){return gameBack()+sectionTitle('MEMORY','숫자 기억')+`<section class="card quiz-card"><p class="mu">${G.round} / 5 라운드 · 정답 ${G.sc}개</p>${G.round===5?`<h2>${G.sc} / 5 성공</h2><p>숫자 순서를 기억하는 짧은 연습을 마쳤어요.</p><button onclick="recordGame('숫자 기억',G.sc,5,GAME_COMPLETION_POINTS);go('game')">기록하고 마치기 +2P</button>`:G.phase==='ready'?'<p>잠깐 나타나는 숫자를 기억한 뒤 순서대로 입력하세요.</p><button onclick="showMemory()">숫자 보기</button>':G.phase==='show'?`<div class="memory-number">${G.digits.split('').join(' ')}</div><p class="mu">순서까지 기억해 보세요.</p>`:G.phase==='input'?'<form onsubmit="event.preventDefault();answerMemory()"><label>기억한 숫자<input id="memoryAnswer" inputmode="numeric" autocomplete="off" placeholder="숫자를 순서대로 입력"></label><button>확인</button></form>':`<h2>${G.correct?'맞았어요!':'다시 기억해 봐요.'}</h2><p>정답: ${G.digits}</p><button onclick="showMemory()">다음 라운드</button>`}</section>`;}
function startPairs(){clearTimeout(pairTimeout);const words=shuffled(vocabBank).slice(0,6);G={m:'pairs',deck:shuffled(words.flatMap((w,id)=>[{id,text:w[0]},{id,text:w[1]}])),open:[],matched:[],tries:0,done:false};render();}
function flipPair(i){if(G.open.length===2||G.open.includes(i)||G.matched.includes(G.deck[i].id)||G.done)return;G.open.push(i);if(G.open.length===2){G.tries++;const [a,b]=G.open;if(G.deck[a].id===G.deck[b].id){G.matched.push(G.deck[a].id);G.open=[];if(G.matched.length===6){G.done=true;D.pts+=18;recordGame('짝 맞추기',6,6);}}else{const current=G;pairTimeout=setTimeout(()=>{if(G===current){G.open=[];if(tab==='game')render();}},850);}}render();}
function pairsHTML(){return gameBack()+sectionTitle('MATCH','영단어 짝 맞추기',`시도 ${G.tries}회 · ${G.matched.length}/6쌍`)+`<div class="pair-grid">${G.deck.map((c,i)=>`<button class="${G.matched.includes(c.id)?'matched':''}" onclick="flipPair(${i})" aria-label="카드 ${i+1}${G.matched.includes(c.id)?' 완료':''}">${G.open.includes(i)||G.matched.includes(c.id)?esc(c.text):'?'}</button>`).join('')}</div>${G.done?'<div class="card"><h2>모두 연결했어요.</h2><p>18P 적립 · 결과가 저장됩니다.</p><button onclick="startPairs()">다시 하기</button></div>':''}`;}
const newsDeck=[
 {title:'오답노트는 짧게',tag:'복습',slides:[['틀린 이유를 한 줄로','풀이를 전부 옮기기보다 “부호를 놓침”, “개념을 혼동함”처럼 원인을 적어 보세요.'],['정답을 가리고 다시 풀기','답을 읽고 이해한 것과 직접 풀 수 있는 것은 다릅니다. 풀이를 덮고 처음부터 시도해 보세요.'],['며칠 뒤 한 번 더','그날만 보고 끝내지 말고, 다음 날과 며칠 뒤 다시 풀어 보세요. 간격은 자기 상황에 맞춰 조절하면 됩니다.']]},
 {title:'퍼센트 빠르게 계산하기',tag:'수학',slides:[['퍼센트는 100분의 몇','20%는 20/100, 즉 0.2입니다. 300의 20%는 300×0.2=60입니다.'],['10%부터 구하기','850의 10%는 85. 따라서 20%는 170, 5%는 42.5처럼 나눠 계산할 수 있습니다.'],['할인 후 가격은?','20% 할인하면 원래 가격의 80%를 냅니다. 5,000원×0.8=4,000원입니다.']]},
 {title:'영단어, 보는 것에서 꺼내기로',tag:'영어',slides:[['뜻을 가리고 떠올리기','단어를 보고 바로 뜻을 확인하기 전에 몇 초간 스스로 떠올려 보세요.'],['짧은 문장 만들기','새 단어가 쓰이는 상황을 짧은 예문으로 연결해 보세요. 정확한 쓰임은 사전 예문과 비교하면 좋습니다.'],['헷갈리는 것만 따로','이미 익숙한 단어와 어려운 단어를 나누고, 어려운 단어를 조금 더 자주 만나 보세요.']]},
 {title:'집중을 시작하는 작은 준비',tag:'공부 습관',slides:[['할 일을 작게 자르기','“수학 공부”보다 “오답 3문제 다시 풀기”처럼 끝이 보이는 목표를 정해 보세요.'],['방해 요소를 치우기','휴대전화 알림을 끄고 필요한 교재만 펼쳐 두세요. 시작 전에 정리하면 중간에 멈추는 일을 줄일 수 있습니다.'],['끝나면 짧게 돌아보기','무엇을 했는지 한 줄 기록하고 다음에 시작할 위치를 표시해 두세요. 쉬는 시간도 계획에 넣어 주세요.']]},
 {title:'분수 계산의 기본',tag:'수학',slides:[['분모가 같으면','1/5+2/5=3/5. 같은 크기의 조각을 합치는 것이므로 분자만 더합니다.'],['분모가 다르면 통분','1/2+1/3=3/6+2/6=5/6. 조각 크기를 먼저 같게 맞춥니다.'],['곱셈과 나눗셈','분수의 곱셈은 분자끼리, 분모끼리 곱합니다. 1/2÷2/3은 1/2×3/2=3/4입니다.']]}
];
function startNews(index){G={m:'news',index,slide:0};render();}
function newsHTML(){const d=newsDeck[G.index],slide=d.slides[G.slide];return gameBack()+sectionTitle('READ & REVIEW','한 장씩 개념 읽기')+`<div class="filter-row">${newsDeck.map((n,i)=>`<button class="${G.index===i?'selected':''}" onclick="startNews(${i})">${n.tag} · ${i+1}</button>`).join('')}</div><article class="news-card"><span class="eyebrow">${d.tag} / ${G.slide+1} OF ${d.slides.length}</span><h2>${d.title}</h2><h3>${slide[0]}</h3><p>${slide[1]}</p><div class="news-controls"><button class="s" ${G.slide===0?'disabled':''} onclick="G.slide--;render()">이전</button><div>${d.slides.map((_,i)=>`<span class="${G.slide===i?'active':''}"></span>`).join('')}</div><button onclick="${G.slide<d.slides.length-1?'G.slide++;render()':'startNewsQuiz()'}">${G.slide<d.slides.length-1?'다음':'응용 문제 풀기'}</button></div></article><p class="lt">학습용 요약 콘텐츠입니다. 공부 방법은 개인과 과목에 따라 조절하세요.</p>`;}
const oldGame=V.game;
V.game=function(){return G.m==='quiz'?quizHTML():G.m==='memory'?memoryHTML():G.m==='pairs'?pairsHTML():G.m==='news'?newsHTML():G.m==='newsQuiz'?newsQuizHTML():oldGame();};
const oldResult=result;
result = function () {
 if (!G.recorded) {
  G.recorded = true;
  recordGame(G.m === 'hist' ? '한국사 퀴즈' : '암산', G.sc, G.n, GAME_COMPLETION_POINTS);
 }
 return oldResult();
};
const oldAn=V.an;
V.an=function(){return sectionTitle('','공부 계획')+oldAn();};



const REWARD_STEP = 200;
const totalStudySeconds = () => Object.values(D.logs).reduce((total, seconds) => total + seconds, 0);
const rewardBadges = ['새싹 배지', '햇살 배지', '꽃잎 배지', '열매 배지'];
const rewardName = level => rewardBadges[level - 1] || '정원사 배지 ' + level + '단계';

function gardenHTML() {
  const level = Math.floor(D.pts / REWARD_STEP);
  return `<section class="card garden-card">
    <div class="ct"><h2>나의 정원</h2><b>${D.pts.toLocaleString('ko-KR')}P</b></div>
    <div class="growth-row"><span class="growth-stage" aria-hidden="true">${PETS[D.pet].e[stage()]}</span><div><b>${PETS[D.pet].t[stage()]}</b>
    <p class="mu">${level ? '배지 ' + level + '개 획득 · ' + rewardName(level) : '첫 배지를 모아 보세요.'}</p></div>
    <button class="s" onclick="setPet(D.pet==='tree'?'animal':'tree')">친구 바꾸기</button></div>
    <progress value="${D.pts % REWARD_STEP}" max="${REWARD_STEP}" aria-label="다음 정원 배지까지 진행률"></progress>
    <p class="mu">다음 보상 · ${rewardName(level + 1)}까지 ${REWARD_STEP - D.pts % REWARD_STEP}P</p>
    <p class="lt">출석 +10P · 계획 완료 +5P · 카드뉴스 정답 +5P</p>
  </section>`;
}

function avatarArt() {
  const hue = [...(accountUsername || cur)].reduce((hash, char) => (hash * 31 + char.codePointAt(0)) % 360, 0);
  return `<svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true">
    <rect width="80" height="80" rx="40" fill="hsl(${hue} 65% 90%)"/>
    <circle cx="57" cy="24" r="7" fill="#fff9e7"/>
    <path d="M0 65Q21 46 43 62T80 59V80H0Z" fill="hsl(${hue} 38% 78%)"/>
    <path d="M40 55V30" stroke="#365740" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 44C24 46 18 34 20 28c11 0 20 5 20 16Z" fill="#709963"/>
    <path d="M40 36c0-12 7-18 18-18 1 10-7 17-18 18Z" fill="#477754"/>
    <path d="M29 52h22l-4 16H33Z" fill="#bd684e"/>
    <rect x="27" y="50" width="26" height="5" rx="2" fill="#d78864"/>
  </svg>`;
}

V.profile = function () {
  return `<section class="card profile-card">
    <div class="profile-art">${avatarArt()}</div>
    <h1>${esc(cur)}</h1><p class="mu">${accountUsername ? '@' + esc(accountUsername) : '내 프로필'}</p>
    <dl class="profile-stats">
      <div><dt>출석</dt><dd>${D.att.length}일</dd></div>
      <div><dt>공부 시간</dt><dd>${Math.floor(totalStudySeconds()/60)}분</dd></div>
      <div><dt>식물 점수</dt><dd>${D.pts.toLocaleString('ko-KR')}P</dd></div>
    </dl>
    <h2>공부 과목</h2><ul class="subject-list">${subjectListHTML()}</ul>
    ${Object.keys(D.logs).length ? `<details class="profile-logs"><summary>과목별 공부 기록</summary><ul>${Object.entries(D.logs).map(([name, seconds]) =>
      `<li>${esc(name)} · ${Math.floor(seconds / 60)}분</li>`).join('')}</ul></details>` : ''}
  </section>${gardenHTML()}
  <section class="card account-panel"><div class="ct"><h2>내 계정과 기록</h2><span id="accountSync" class="mu">${esc(syncMessage)}</span></div><div class="row"><button class="s" onclick="downloadRecords()">기록 내려받기</button><button class="s" onclick="flushSave()">저장 재시도</button></div><div class="row"><button class="text-btn" onclick="importLegacy()">이 브라우저의 이전 기록 가져오기</button><button class="text-btn" onclick="openRecoverySettings()">복구 코드 발급</button><button class="text-btn" onclick="logout()">계정 전환 · 로그아웃</button></div><p class="lt">다른 기기에서는 같은 아이디로 로그인하세요. 동시 편집 충돌 시 덮어쓰지 않고 저장을 멈춥니다.</p></section>`;
};


const newsQuestions = [
  ['이틀 뒤 시험이다. 오답을 분류해 보니 6문제는 개념을 혼동했고, 4문제는 같은 부호 실수였다. 어떤 복습 계획이 두 원인을 모두 확인하기 좋은가?',
    ['해설 10개를 읽고 다음 날 새로운 단원을 공부한다', '개념은 차이를 설명해 보고, 부호 실수는 검산 기준을 만든 뒤 다음 날 답을 가리고 다시 푼다', '맞힌 문제만 다시 풀면서 풀이 속도를 높인다', '오답의 풀이를 공책에 옮기고 시험 직전에 읽는다'], 1,
    '틀린 원인별로 방법을 바꾸고, 시간을 두고 도움 없이 다시 풀어야 같은 실수가 줄었는지 확인할 수 있어요.'],
  ['정가에서 20% 할인한 뒤 할인된 가격에서 다시 15%를 깎아 40,800원이 되었다. 정가와 전체 할인율은?',
    ['60,000원 · 32%', '60,000원 · 35%', '58,000원 · 30%', '62,000원 · 34%'], 0,
    '남는 비율은 0.8 × 0.85 = 0.68입니다. 40,800원을 0.68로 나누면 정가 60,000원이고, 전체 할인율은 32%예요.'],
  ['영단어의 뜻을 보면 알아보지만, 한국어 문장을 영어로 바꿀 때 그 단어가 떠오르지 않는다. 어떤 연습이 이 문제를 직접 확인할 수 있는가?',
    ['영어 단어를 보면서 한국어 뜻을 읽는다', '틀린 문장을 정답과 함께 여러 번 베낀다', '한국어 상황만 보고 영어 단어를 떠올려 문장을 만든 뒤, 예문과 비교하고 다음 날 다시 해 본다', '이미 외운 단어를 영어 철자 순서로 정렬한다'], 2,
    '실제 과제와 같은 방향으로 단어를 꺼내고 문장에 써 보면, 뜻을 알아보는 능력과 문장에 쓰는 능력을 구분할 수 있어요.'],
  ['25분 공부를 세 번 해 보니 알림이 없어도 목표를 끝내지 못했다. 매번 첫 12분을 문제 고르는 데 썼다면 어떤 변경부터 시험해 볼까?',
    ['타이머를 50분으로 바꾸고 같은 방식으로 시작한다', '전날 오답 3개를 골라 두고, 같은 25분 동안 완료한 개수를 기록해 비교한다', '매번 그날 기분에 따라 과목을 바꾼다', '타이머와 기록을 모두 없애고 더 오래 앉아 있는다'], 1,
    '먼저 시간을 잡아먹는 과정을 줄이고, 같은 공부 시간에 결과가 달라지는지 비교하면 어떤 변경이 도움이 됐는지 알 수 있어요.'],
  ['물통에 물이 3/4만큼 차 있다. 들어 있는 물의 2/5를 쓰고 나서 물통 전체 용량의 1/6만큼 다시 채웠다. 지금 물통은 얼마나 차 있는가?',
    ['31/60', '7/15', '37/60', '47/60'], 2,
    '남은 물은 전체의 3/4 × 3/5 = 9/20입니다. 채운 물 1/6을 더하면 27/60 + 10/60 = 37/60이에요.'],
];

function startNewsQuiz() {
  const [question, options, correct, explanation] = newsQuestions[G.index];
  G = {m:'newsQuiz', index:G.index, question, options:shuffled(options), answer:options[correct], explanation};
  render();
}

function answerNews(index) {
  if (G.m !== 'newsQuiz' || G.answered || !G.options[index]) return;
  G.answered = true;
  G.correct = G.options[index] === G.answer;
  if (G.correct) add(5);
  recordGame(newsDeck[G.index].title + ' · 응용 문제', Number(G.correct), 1);
  render();
}

function newsQuizHTML() {
  return gameBack() + sectionTitle('', newsDeck[G.index].title) + `<section class="card quiz-card">
    <p class="mu">응용 문제 · 정답 +5P</p>
    <h2 class="quiz-question">${esc(G.question)}</h2>
    <div class="quiz-options">${G.options.map((option, index) =>
      `<button ${G.answered ? 'disabled' : ''} class="${G.answered && option === G.answer ? 'correct' : ''}" onclick="answerNews(${index})">${esc(option)}</button>`
    ).join('')}</div>
    ${G.answered ? `<div class="answer-feedback ${G.correct ? 'correct' : 'incorrect'}" role="status">
      <b>${G.correct ? '정답이에요! +5P' : '정답 · ' + esc(G.answer)}</b><p>${esc(G.explanation)}</p>
      <button onclick="startNews(${(G.index + 1) % newsDeck.length})">다른 카드뉴스 읽기</button>
    </div>` : ''}
  </section>`;
}

boot();
