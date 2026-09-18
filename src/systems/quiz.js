import { voice } from './voice.js';

/**
 * 识字答题浮层（DOM，覆盖画布上方）：
 * - 自动语音播报题目（"哪个是大字？大象的大。"），可点 🔊 重听
 * - 4 个大字按钮（幼儿园尺寸 ≥110px），点选正确汉字
 * - 答对：欢呼 + 语音表扬；答错：语音教学（正确答案 + 字形提示），错字进入错字本
 * - onDone(correct, quiz) 在浮层关闭时回调
 */
export function showQuiz(q, onDone) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  root.style.display = 'flex';

  const panel = document.createElement('div');
  panel.className = 'quiz-panel';

  const tag = document.createElement('div');
  tag.className = 'quiz-tag';
  tag.textContent = '⭐ 听一听 · 点字听音 · 再点一下确认';
  panel.appendChild(tag);

  const result = document.createElement('div');
  result.className = 'quiz-result';

  // 🔊 重听按钮（大，儿童友好）
  const sound = document.createElement('button');
  sound.className = 'quiz-sound';
  sound.textContent = '🔊 听题目';
  sound.addEventListener('click', () => voice.speak(q.speak));
  panel.appendChild(sound);

  const list = document.createElement('div');
  list.className = 'quiz-options';
  let answered = false;
  let rereadTimer = null;
  let demoIdx = -1; // 点击即读（示范先行）：第一次点=听音，再点同一张=确认作答

  q.opts.forEach((optChar, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    const hanzi = document.createElement('span');
    hanzi.className = 'hanzi';
    hanzi.textContent = optChar;
    const pinyin = document.createElement('span');
    pinyin.className = 'pinyin';
    pinyin.textContent = '\u00A0'; // 答题中不显示拼音（防止"拼"代替"认"），答完揭晓
    const confirmHint = document.createElement('span');
    confirmHint.className = 'confirm-hint';
    confirmHint.textContent = '🔊 听到了吗？再点一下确认';
    confirmHint.style.cssText = 'font-size:12px;color:#4ade80;visibility:hidden';
    btn.appendChild(hanzi);
    btn.appendChild(pinyin);
    btn.appendChild(confirmHint);

    btn.addEventListener('click', () => {
      if (answered) return;
      if (demoIdx !== i) {
        // 示范先行：朗读这个字（不选择），引导对比题目读音
        demoIdx = i;
        [...list.children].forEach((b, bi) => {
          const h = b.querySelector('.confirm-hint');
          if (h) h.style.visibility = bi === i ? 'visible' : 'hidden';
        });
        voice.speak(optChar);
        return;
      }
      // 再点同一张：确认作答
      answered = true;
      const isCorrect = i === q.ans;
      btn.classList.add(isCorrect ? 'opt-correct' : 'opt-wrong');
      // 高亮正确答案 + 揭晓拼音
      list.children[q.ans].classList.add('opt-correct');
      [...list.children].forEach((b, bi) => {
        b.querySelector('.pinyin').textContent = CHAR(q.opts[bi]).pinyin;
        const h = b.querySelector('.confirm-hint');
        if (h) h.style.visibility = 'hidden';
      });
      finish(isCorrect);
    });
    list.appendChild(btn);
  });
  panel.appendChild(list);
  panel.appendChild(result);

  function CHAR(c) {
    // 从题面拿拼音（opts 存的是字）
    return (q.pinyinMap && q.pinyinMap[c]) || { pinyin: '' };
  }

  function finish(isCorrect) {
    sound.style.display = 'none';
    list.querySelectorAll('button').forEach((b) => (b.disabled = true));

    // 教学反馈全程 try/catch：任何异常都不得阻止"继续战斗"按钮出现，否则升级流程卡死
    try {
      const expTitle = document.createElement('div');
      const expBody = document.createElement('div');
      expBody.className = 'quiz-exp';

      if (isCorrect) {
        expTitle.className = 'quiz-exp-title good';
        expTitle.textContent = `🎉 答对啦！这是【${q.char}】`;
        expBody.innerHTML = `<b class="hanzi-big">${q.char}</b>（${q.pinyin}）· ${q.word} · ${q.hint}`;
        voice.speak(`答对啦！这是${q.char}，${q.word}的${q.char}。`);
      } else {
        expTitle.className = 'quiz-exp-title bad';
        expTitle.textContent = `💪 没关系，再记一遍`;
        expBody.innerHTML = `<b class="hanzi-big">${q.char}</b>（${q.pinyin}）· ${q.word} · ${q.hint}`;
        voice.speak(`正确答案是${q.char}，${q.word}的${q.char}。${q.hint}。`);
        panel.classList.add('shake');
        setTimeout(() => panel.classList.remove('shake'), 360);
      }
      result.appendChild(expTitle);
      result.appendChild(expBody);
    } catch (e) {
      console.error('quiz finish fx error', e);
    }

    const cont = document.createElement('button');
    cont.className = 'quiz-continue';
    cont.textContent = '继续战斗 ▶';
    cont.addEventListener('click', () => {
      if (rereadTimer) clearTimeout(rereadTimer); // 防止关闭后自动复读声盖住选卡阶段的朗读
      root.style.display = 'none';
      root.innerHTML = '';
      onDone(isCorrect, q);
    });
    result.appendChild(cont);
    cont.focus({ preventScroll: true });

    // 答完自动再读一遍正确答案（加深记忆）；点"继续战斗"会取消
    rereadTimer = setTimeout(() => voice.speak(`${q.char}，${q.word}的${q.char}。`), 2600);
  }

  root.appendChild(panel);
  // 打开浮层后自动播报题目（TTS 不受自动播放限制）
  setTimeout(() => voice.speak(q.speak), 350);
}
