
const CHALLENGE_KEYS = {
  best: 'pt_best_score',
  totalCorrect: 'pt_total_correct'
};

const challengeArea = document.getElementById('challengeArea');
const startRoundBtn = document.getElementById('startRoundBtn');
const practiceBtn = document.getElementById('practiceBtn');
const resetChallengeBtn = document.getElementById('resetChallengeBtn');
const roundProgress = document.getElementById('roundProgress');
const roundScore = document.getElementById('roundScore');
const bestScore = document.getElementById('bestScore');
const totalCorrect = document.getElementById('totalCorrect');
const titleWall = document.getElementById('titleWall');

let session = { mode: 'idle', total: 10, current: 0, score: 0, queue: [] };

function getStoredNumber(key){ return Number(localStorage.getItem(key) || '0'); }
function setStoredNumber(key, value){ localStorage.setItem(key, String(value)); }

function shuffle(arr){
  const clone = [...arr];
  for(let i=clone.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}
function pickDistinctValues(values, count, exclude){
  const filtered = shuffle([...new Set(values.filter(v => v && v !== exclude))]);
  return filtered.slice(0, count);
}
function randomElement(){
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

function buildQuestion(){
  const e = randomElement();
  const templates = [];

  templates.push(() => {
    const wrong = pickDistinctValues(ELEMENTS.map(x => x.nameZh), 3, e.nameZh);
    return {
      prompt: `元素符號 <strong>${e.symbol}</strong> 對應哪一個中文名稱？`,
      answer: e.nameZh,
      options: shuffle([e.nameZh, ...wrong]),
      explain: `${e.nameZh} 的符號是 ${e.symbol}。`
    };
  });

  templates.push(() => {
    const wrong = pickDistinctValues(ELEMENTS.map(x => String(x.number)), 3, String(e.number));
    return {
      prompt: `元素 <strong>${e.nameZh}（${e.symbol}）</strong> 的原子序是哪一個？`,
      answer: String(e.number),
      options: shuffle([String(e.number), ...wrong]),
      explain: `${e.nameZh} 的原子序是 ${e.number}。`
    };
  });

  templates.push(() => {
    const wrong = pickDistinctValues(ELEMENTS.map(x => x.category), 3, e.category);
    return {
      prompt: `元素 <strong>${e.nameZh}</strong> 屬於哪一類？`,
      answer: e.category,
      options: shuffle([e.category, ...wrong]),
      explain: `${e.nameZh} 屬於「${e.category}」。`
    };
  });

  templates.push(() => {
    const correct = e.compounds[0] || e.applications.split('、')[0] || e.nameZh;
    const pool = [];
    ELEMENTS.forEach(x => {
      if(x.number !== e.number){
        if(x.compounds[0]) pool.push(x.compounds[0]);
        else if(x.applications) pool.push(x.applications.split('、')[0]);
      }
    });
    const wrong = pickDistinctValues(pool, 3, correct);
    return {
      prompt: `下列哪一個最可能是 <strong>${e.nameZh}</strong> 的常見化合物或代表應用？`,
      answer: correct,
      options: shuffle([correct, ...wrong]),
      explain: `${e.nameZh} 可連結到：${correct}。`
    };
  });

  return templates[Math.floor(Math.random() * templates.length)]();
}

function renderStats(){
  roundProgress.textContent = `${session.current} / ${session.total}`;
  roundScore.textContent = session.score;
  bestScore.textContent = getStoredNumber(CHALLENGE_KEYS.best);
  totalCorrect.textContent = getStoredNumber(CHALLENGE_KEYS.totalCorrect);
  renderTitles();
}

function renderTitles(){
  const best = getStoredNumber(CHALLENGE_KEYS.best);
  const total = getStoredNumber(CHALLENGE_KEYS.totalCorrect);
  const titles = [
    { label: '元素新兵', ok: total >= 5 },
    { label: '週期偵探', ok: total >= 15 },
    { label: '反應系高手', ok: total >= 30 },
    { label: '原子序快手', ok: best >= 8 },
    { label: '元素王者', ok: best >= 10 }
  ];
  titleWall.innerHTML = titles.map(t => `<span class="badge ${t.ok ? 'on' : ''}">${t.label}</span>`).join('');
}

function startRound(){
  session = { mode: 'round', total: 10, current: 0, score: 0, queue: Array.from({length:10}, () => buildQuestion()) };
  renderStats();
  showNextQuestion();
}

function startPractice(){
  session = { mode: 'practice', total: 1, current: 0, score: 0, queue: [buildQuestion()] };
  renderStats();
  showNextQuestion();
}

function saveCorrectIncrement(){
  const next = getStoredNumber(CHALLENGE_KEYS.totalCorrect) + 1;
  setStoredNumber(CHALLENGE_KEYS.totalCorrect, next);
}

function finishRound(){
  const best = getStoredNumber(CHALLENGE_KEYS.best);
  if(session.score > best) setStoredNumber(CHALLENGE_KEYS.best, session.score);
  const titles = [
    { min: 10, text: '滿分通關！你已經可以去考倒週期表了。' },
    { min: 8, text: '很強，已經有元素達人的味道。' },
    { min: 6, text: '穩穩進步中，再刷一輪會更漂亮。' },
    { min: 0, text: '先別灰心，元素很多，記規律比硬背更有效。' }
  ];
  const title = titles.find(t => session.score >= t.min).text;
  challengeArea.innerHTML = `
    <div class="result-panel">
      <div class="result-emoji">🎉</div>
      <h2>本回合完成</h2>
      <p>你答對 <strong>${session.score}</strong> / ${session.total} 題。</p>
      <p>${title}</p>
      <div class="landing-actions">
        <button class="landing-main-btn" id="retryBtn">再挑戰一次</button>
        <a class="landing-sub-btn" href="study.html">回學習模式複習</a>
      </div>
    </div>
  `;
  document.getElementById('retryBtn').addEventListener('click', startRound);
  renderStats();
}

function showNextQuestion(){
  if(!session.queue.length){
    finishRound();
    return;
  }
  const q = session.queue.shift();
  session.current += 1;
  renderStats();
  challengeArea.innerHTML = `
    <div class="challenge-question">
      <div class="question-kicker">${session.mode === 'practice' ? '單題練習' : `第 ${session.current} 題`}</div>
      <h2>${q.prompt}</h2>
      <div class="quiz-options challenge-options">
        ${q.options.map((opt, idx) => `<button data-answer="${String(opt).replace(/"/g, '&quot;')}">${opt}</button>`).join('')}
      </div>
      <div id="feedback" class="quiz-result"></div>
    </div>
  `;
  const feedback = document.getElementById('feedback');
  document.querySelectorAll('.challenge-options button').forEach(btn => {
    btn.addEventListener('click', () => {
      const picked = btn.getAttribute('data-answer');
      const correct = picked === q.answer;
      if(correct){
        session.score += 1;
        saveCorrectIncrement();
        feedback.textContent = `答對了！${q.explain}`;
        feedback.className = 'quiz-result ok';
      }else{
        feedback.textContent = `這題答案是 ${q.answer}。${q.explain}`;
        feedback.className = 'quiz-result bad';
      }
      document.querySelectorAll('.challenge-options button').forEach(b => b.disabled = true);
      const nextBtn = document.createElement('button');
      nextBtn.className = 'landing-main-btn next-question-btn';
      nextBtn.textContent = session.queue.length ? '下一題' : '看結果';
      nextBtn.addEventListener('click', showNextQuestion, { once: true });
      feedback.insertAdjacentElement('afterend', nextBtn);
      const best = getStoredNumber(CHALLENGE_KEYS.best);
      if(session.score > best) setStoredNumber(CHALLENGE_KEYS.best, session.score);
      renderStats();
    }, { once: true });
  });
}

function resetChallenge(){
  localStorage.removeItem(CHALLENGE_KEYS.best);
  localStorage.removeItem(CHALLENGE_KEYS.totalCorrect);
  session = { mode: 'idle', total: 10, current: 0, score: 0, queue: [] };
  challengeArea.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">⚗️</div>
      <h2>紀錄已重設</h2>
      <p>可以重新開始新的闖關。</p>
    </div>
  `;
  renderStats();
}

startRoundBtn.addEventListener('click', startRound);
practiceBtn.addEventListener('click', startPractice);
resetChallengeBtn.addEventListener('click', resetChallenge);
renderStats();
