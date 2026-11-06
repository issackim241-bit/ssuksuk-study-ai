/* 화면 개편과 추가 학습 활동. 기존 타이머·계획·AI·암기 카드 기능을 이어 사용합니다. */
const sectionTitle=(eyebrow,title,desc='')=>`<div class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${desc?`<p class="mu">${desc}</p>`:''}</div>`;
const gameBack=()=>'<button class="s back" onclick="go(\'game\')">← 학습 놀이터</button>';
V.home=function(){
 const minutes=Math.floor(dayS()/60),todo=D.plan.map((p,i)=>({...p,index:i})).filter(p=>!p.d).slice(0,4);
 const count=D.plan.filter(p=>p.d).length,stageIndex=stage(),pet=PETS[D.pet];
 return `<div class="home-title"><div><p class="eyebrow">${new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(new Date())}</p><h1>${esc(cur)}의 공부방</h1></div><div class="avatar">${esc(cur.slice(0,1))}</div></div>
 <section class="focus-banner"><div><span class="eyebrow">지금은 집중할 시간</span><h2>딱 25분,<br>한 가지에 집중해 볼까?</h2><button onclick="GOAL=25;go('timer')">타이머 시작 ${svg('send',18)}</button></div><div class="clock-art"><span>25</span><small>MIN</small></div></section>
 <div class="stat-strip"><div><small>오늘 공부</small><b>${minutes}<em>분</em></b></div><div><small>완료한 계획</small><b>${count}<em>개</em></b></div><div><small>누적 출석</small><b>${D.att.length}<em>일</em></b></div></div>
 <section class="card"><div class="ct"><h2>해야 할 일</h2><button class="text-btn" onclick="go('an')">계획 관리 →</button></div>${todo.length?todo.map(p=>`<label class="todo-line"><input type="checkbox" onchange="donePlan(${p.index})"><span>${esc(p.t)}</span></label>`).join(''):'<div class="empty-state"><p>오늘의 작은 목표를 정해 보세요.</p><button class="s" onclick="go(\'an\')">계획 만들기</button></div>'}</section>
 <section class="shortcut-grid"><button onclick="go('ai')"><span class="shortcut-icon">?</span><b>질문하기</b><small>막힌 개념을 풀어 봐요</small></button><button onclick="go('game')"><span class="shortcut-icon">＋</span><b>학습 놀이터</b><small>짧게 풀고 다시 집중</small></button><button onclick="gc()"><span class="shortcut-icon">Aa</span><b>암기 카드</b><small>오늘 배운 내용 복습</small></button></section>
 <section class="card"><div class="ct"><h2>공부 메모</h2><small class="mu">계정에 저장</small></div><form class="memo-entry" onsubmit="event.preventDefault();addNote()"><input id="memoText" maxlength="160" placeholder="잊기 전에 적어 두기"><button>추가</button></form><div class="memo-list">${(D.notes||[]).slice().reverse().map((n,i)=>`<div class="memo-item"><span>${esc(n.text)}</span><button class="icon-btn" aria-label="메모 삭제" onclick="delNote(${D.notes.length-1-i})">×</button></div>`).join('')||'<p class="mu">아직 적어 둔 메모가 없어요.</p>'}</div></section>
 <section class="growth-row"><span>${growthIcon(D.pet,stageIndex)}</span><div><b>나의 ${pet.t[stageIndex]}</b><p class="mu">공부와 복습을 하면 함께 자라요 · ${D.pts}P</p></div><button class="s" onclick="setPet(D.pet==='tree'?'animal':'tree')">바꾸기</button></section>
 <section class="card account-panel"><div class="ct"><h2>내 계정과 기록</h2><span id="accountSync" class="mu">${esc(syncMessage)}</span></div><div class="row"><button class="s" onclick="downloadRecords()">기록 내려받기</button><button class="s" onclick="flushSave()">저장 재시도</button></div><div class="row"><button class="text-btn" onclick="importLegacy()">이 브라우저의 이전 기록 가져오기</button><button class="text-btn" onclick="openRecoverySettings()">복구 코드 발급</button><button class="text-btn" onclick="logout()">계정 전환 · 로그아웃</button></div><p class="lt">다른 기기에서는 같은 아이디로 로그인하세요. 동시 편집 충돌 시 덮어쓰지 않고 저장을 멈춥니다.</p></section>`;
};
const originalRender=render;
render=function(){
 originalRender();if(!D)return;
 document.body.dataset.page=tab;
 const header=$('header');header.innerHTML=`<a class="wordmark" href="#" onclick="event.preventDefault();go('home')">쑥쑥<span>스터디</span></a><div class="header-right"><button id="syncStatus" class="sync-status" onclick="flushSave()">${esc(syncMessage)}</button><span class="point">${D.pts} P</span></div>`;
 const nav=$('nav');nav.innerHTML=[['home','홈'],['timer','집중'],['an','계획'],['game','놀이터'],['ai','질문']].map(([key,name])=>`<button class="${tab===key?'on':''}" onclick="go('${key}')">${svg(key)}<span>${name}</span></button>`).join('');
 if(tab==='game'&&G.m&&!['news','quiz','memory','pairs'].includes(G.m))$('main').insertAdjacentHTML('afterbegin',gameBack());
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
 ['16','한 장씩 개념 읽기','news','복습','짧은 카드뉴스로 공부 습관 정리','startNews(0)']
];
let gameFilter='전체';
gameMenu=function(){const list=games.filter(g=>gameFilter==='전체'||g[3]===gameFilter);return sectionTitle('STUDY BREAK','짧게 풀고, 가볍게 복습','계산부터 기억력까지. 한 판씩 골라 보세요.')+`<div class="filter-row">${['전체','계산','사고력','과목','복습'].map(f=>`<button class="${gameFilter===f?'selected':''}" onclick="gameFilter='${f}';render()">${f}</button>`).join('')}</div><div class="game-grid">${list.map(g=>`<button class="game-tile" onclick="${g[5]}"><span class="game-no">${g[0]} <small>${g[3]}</small></span><h2>${g[1]}</h2><p>${g[4]}</p><span class="game-arrow">↗</span></button>`).join('')}</div><section class="card"><div class="ct"><h2>최근 플레이</h2><small class="mu">최근 10회</small></div>${(D.gameHistory||[]).slice(0,10).map(h=>`<div class="history-line"><span>${esc(h.title)}</span><b>${h.score} / ${h.total}</b><small>${esc(h.date)}</small></div>`).join('')||'<p class="mu">한 판을 마치면 여기에 기록됩니다.</p>'}</section>`;};
const randomInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
function shuffled(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=randomInt(0,i);[out[i],out[j]]=[out[j],out[i]];}return out;}
function recordGame(title,score,total){D.gameHistory||=[];D.gameHistory.unshift({title,score,total,date:today()});D.gameHistory=D.gameHistory.slice(0,100);save();}
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
function startQuiz(type){const title=games.find(g=>g[2]===type)[1];G={m:'quiz',type,title,i:0,n:10,sc:0,answered:false,deck:shuffled(type==='science'?scienceBank:type==='spelling'?spellingBank:vocabBank)};nextQuiz();render();}
function nextQuiz(){
 G.answered=false;G.answer='';let a=randomInt(2,12),b=randomInt(2,12);
 if(G.type==='fraction'){const n=randomInt(2,10),x=randomInt(1,n-1),y=randomInt(1,n-1);G.q=`${x}/${n} + ${y}/${n} = ?`;G.a=(x+y)/n;G.display=`${x+y}/${n}`;G.explain=`분모가 같으므로 분자는 ${x}+${y}, 분모는 ${n} 그대로입니다. 소수나 분수로 답할 수 있어요.`;}
 if(G.type==='percent'){const base=randomInt(2,20)*100,rate=randomInt(1,9)*10;G.q=`${base}의 ${rate}%는?`;G.a=base*rate/100;G.explain=`${base} × ${rate}/100 = ${G.a}`;}
 if(G.type==='equation'){const x=randomInt(-9,20);G.q=`${a}x + ${b} = ${a*x+b}, x = ?`;G.a=x;G.explain=`양변에서 ${b}을 빼고 ${a}로 나누면 x=${x}입니다.`;}
 if(G.type==='unit'){const types=[['m','cm',100],['kg','g',1000],['시간','분',60],['L','mL',1000],['km','m',1000]];const [from,to,factor]=types[randomInt(0,4)];G.q=`${a} ${from} = 몇 ${to}?`;G.a=a*factor;G.explain=`1 ${from} = ${factor} ${to}이므로 ${a} × ${factor}입니다.`;}
 if(G.type==='sequence'){G.q=`${[0,1,2,3].map(i=>a+i*b).join(', ')}, 다음 수는?`;G.a=a+4*b;G.explain=`${b}씩 커지는 수열입니다.`;}
 G.options=null;
 if(['vocab','science','spelling'].includes(G.type)){
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
function advanceQuiz(){if(!G.answered)return;G.i++;if(G.i<G.n){delete G.display;nextQuiz();}else recordGame(G.title,G.sc,G.n);render();}
function quizHTML(){
 if(G.i>=G.n)return gameBack()+`<section class="card result-card"><span class="eyebrow">한 판 완료</span><h1>${G.sc}<small> / ${G.n}</small></h1><p>${G.sc>=8?'감각이 좋네요. 다음에도 이어 가 봐요.':'틀린 문제는 오답노트에 모아 뒀어요.'}</p><p class="mu">${G.sc*3}P 적립 · 서버에 기록됩니다</p><button onclick="startQuiz('${G.type}')">한 번 더</button><button class="s" onclick="go('game')">목록으로</button></section>`;
 return gameBack()+sectionTitle(G.title,`${G.i+1}번째 문제`)+`<section class="card quiz-card"><div class="bar"><i style="width:${G.i/G.n*100}%"></i></div><p class="mu">${G.i+1} / ${G.n} · ${G.sc}개 정답</p><h2 class="quiz-question">${esc(G.q)}</h2>${G.options?`<div class="quiz-options">${G.options.map((o,i)=>`<button ${G.answered?'disabled':''} class="${G.answered&&o===G.a?'correct':''}" onclick="submitQuiz(G.options[${i}])"><small>${i+1}</small>${esc(o)}</button>`).join('')}</div>`:`<form onsubmit="event.preventDefault();submitQuiz()"><label class="sr-only" for="quizAnswer">정답</label><input id="quizAnswer" autocomplete="off" placeholder="정답 입력${G.type==='fraction'?' (예: 3/4)':''}" ${G.answered?'disabled':''}><button class="w" ${G.answered?'disabled':''}>정답 확인</button></form>`}${G.answered?`<div class="answer-feedback ${G.correct?'correct':'incorrect'}"><b>${G.correct?'정답입니다.':'정답: '+esc(G.display||G.a)}</b><p>${esc(G.explain)}</p><button onclick="advanceQuiz()">${G.i===G.n-1?'결과 보기':'다음 문제'}</button></div>`:''}</section>`;
}
let memoryTimeout,pairTimeout;
function startMemory(){clearTimeout(memoryTimeout);G={m:'memory',phase:'ready',level:3,sc:0,round:0};render();}
function showMemory(){G.digits=Array.from({length:G.level},()=>randomInt(0,9)).join('');G.phase='show';render();const current=G;memoryTimeout=setTimeout(()=>{if(G!==current||tab!=='game')return;G.phase='input';render();},Math.max(1800,G.level*550));}
function answerMemory(){const value=$('#memoryAnswer').value.trim();if(!value)return;const ok=value===G.digits;G.phase='answer';G.correct=ok;if(ok){G.sc++;G.level++;D.pts+=3;}G.round++;save();render();}
function memoryHTML(){return gameBack()+sectionTitle('MEMORY','숫자 기억')+`<section class="card quiz-card"><p class="mu">${G.round} / 5 라운드 · 정답 ${G.sc}개</p>${G.round===5?`<h2>${G.sc} / 5 성공</h2><p>숫자 순서를 기억하는 짧은 연습을 마쳤어요.</p><button onclick="recordGame('숫자 기억',G.sc,5);go('game')">기록하고 마치기</button>`:G.phase==='ready'?'<p>잠깐 나타나는 숫자를 기억한 뒤 순서대로 입력하세요.</p><button onclick="showMemory()">숫자 보기</button>':G.phase==='show'?`<div class="memory-number">${G.digits.split('').join(' ')}</div><p class="mu">순서까지 기억해 보세요.</p>`:G.phase==='input'?'<form onsubmit="event.preventDefault();answerMemory()"><label>기억한 숫자<input id="memoryAnswer" inputmode="numeric" autocomplete="off" placeholder="숫자를 순서대로 입력"></label><button>확인</button></form>':`<h2>${G.correct?'맞았어요!':'다시 기억해 봐요.'}</h2><p>정답: ${G.digits}</p><button onclick="showMemory()">다음 라운드</button>`}</section>`;}
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
function newsHTML(){const d=newsDeck[G.index],slide=d.slides[G.slide];return gameBack()+sectionTitle('READ & REVIEW','한 장씩 개념 읽기')+`<div class="filter-row">${newsDeck.map((n,i)=>`<button class="${G.index===i?'selected':''}" onclick="startNews(${i})">${n.tag} · ${i+1}</button>`).join('')}</div><article class="news-card"><span class="eyebrow">${d.tag} / ${G.slide+1} OF ${d.slides.length}</span><h2>${d.title}</h2><div class="news-number">0${G.slide+1}</div><h3>${slide[0]}</h3><p>${slide[1]}</p><div class="news-controls"><button class="s" ${G.slide===0?'disabled':''} onclick="G.slide--;render()">이전</button><div>${d.slides.map((_,i)=>`<span class="${G.slide===i?'active':''}"></span>`).join('')}</div><button onclick="${G.slide<d.slides.length-1?'G.slide++;render()':"go('game')"}">${G.slide<d.slides.length-1?'다음':'읽기 완료'}</button></div></article><p class="lt">학습용 요약 콘텐츠입니다. 공부 방법은 개인과 과목에 따라 조절하세요.</p>`;}
const oldGame=V.game;
V.game=function(){return G.m==='quiz'?quizHTML():G.m==='memory'?memoryHTML():G.m==='pairs'?pairsHTML():G.m==='news'?newsHTML():oldGame();};
const oldResult=result;
result=function(){if(!G.recorded){G.recorded=true;recordGame(G.m==='hist'?'한국사 퀴즈':'암산',G.sc,G.n);}return oldResult();};
// 한 계정의 기록을 보여 줍니다. 공개 랭킹으로 오해하지 않도록 구분합니다.
rkHTML=function(){return `<p class="mu">${esc(cur)}의 오늘 누적 집중 시간</p><div class="record-time">${fmt(dayS()+elapsed())}</div>`;};
const oldTimer=V.timer;
V.timer=function(){return sectionTitle('FOCUS','집중 타이머')+oldTimer().replace('오늘의 랭킹','오늘의 집중').replace('<span class="mu">실시간</span>','<span class="mu">내 기록</span>');};
const oldAn=V.an;
V.an=function(){return sectionTitle('MY PLAN','내 속도에 맞는 계획')+oldAn();};


function growthIcon(type,level){return type==='tree'?`<svg width="38" height="42" viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 39V19" stroke="#758e68" stroke-width="2.5"/><path d="M20 27C7 28 5 18 7 13c10 0 15 5 13 14Z" fill="#b9cda5"/><path d="M20 21c-2-10 4-15 14-15 0 9-4 15-14 15Z" fill="#78966b"/><path d="M11 40h18" stroke="#b89b76" stroke-width="3" stroke-linecap="round"/></svg>`:`<svg width="40" height="44" viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M11 30c-7-10-2-24 7-25s15 14 13 24c-1 12-17 13-20 1Z" fill="#f5ddab" stroke="#d9bc80"/><circle cx="17" cy="20" r="1.5" fill="#645242"/><circle cx="26" cy="20" r="1.5" fill="#645242"/><path d="m19 25 3 3 3-3" fill="#d49a52"/></svg>`;}
