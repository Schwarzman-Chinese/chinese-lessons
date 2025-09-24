// ========== 1) Split-Pane 可拖动分栏（含把手/无障碍/双击重置） ==========
(function initSplitPane(){
  const root    = document.getElementById('split-root');
  const left    = document.getElementById('text-pane');
  const right   = document.getElementById('vocab-pane');
  const divider = document.getElementById('split-divider');
  if (!root || !left || !right || !divider) return;

  // 如果 HTML 里没放 grip，把手自动补齐
  if (!divider.querySelector('.grip')) {
    const grip = document.createElement('span');
    grip.className = 'grip';
    grip.setAttribute('aria-hidden', 'true');
    divider.appendChild(grip);
  }

  const KEY = 'splitPercent';
  const MIN = 25;   // 左栏最小百分比
  const MAX = 80;   // 左栏最大百分比
  const DEFAULT = 62;

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  // 无障碍属性
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', 'vertical');
  divider.setAttribute('aria-valuemin', String(MIN));
  divider.setAttribute('aria-valuemax', String(MAX));
  divider.tabIndex = divider.tabIndex || 0;

  function applyPercent(p, {persist=true} = {}){
    p = clamp(p, MIN, MAX);
    left.style.flex  = `0 0 ${p}%`;
    right.style.flex = `0 0 ${100 - p}%`;
    divider.setAttribute('aria-valuenow', String(Math.round(p)));
    divider.title = `左右比例：${Math.round(p)}% / ${Math.round(100 - p)}%`;
    if (persist) localStorage.setItem(KEY, String(p));
  }

  const saved = parseFloat(localStorage.getItem(KEY));
  applyPercent(Number.isFinite(saved) ? saved : DEFAULT, {persist:false});

  let dragging = false;

  function posToPercent(clientX){
    const rect = root.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  }

  function onMove(e){
    if (!dragging) return;
    const x = (e.touches && e.touches[0]?.clientX) ?? e.clientX;
    if (typeof x !== 'number') return;
    applyPercent(posToPercent(x));
    e.preventDefault();
  }

  // 鼠标拖动
  divider.addEventListener('mousedown', (e)=>{
    dragging = true;
    root.classList.add('is-dragging');
    e.preventDefault();
  });
  window.addEventListener('mouseup',   ()=>{
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
  });
  window.addEventListener('mousemove', onMove);

  // 触屏拖动
  divider.addEventListener('touchstart', ()=>{
    dragging = true;
    root.classList.add('is-dragging');
  }, {passive:true});
  window.addEventListener('touchend',    ()=>{
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
  }, {passive:true});
  window.addEventListener('touchcancel', ()=>{
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
  }, {passive:true});
  window.addEventListener('touchmove',   onMove, {passive:false});

  // 双击恢复默认
  divider.addEventListener('dblclick', ()=> applyPercent(DEFAULT));

  // 键盘微调
  divider.addEventListener('keydown', (e)=>{
    const cur = parseFloat(localStorage.getItem(KEY)) || DEFAULT;
    const step = (e.shiftKey ? 5 : 2);
    if (e.key === 'ArrowLeft')  { applyPercent(cur - step); e.preventDefault(); }
    if (e.key === 'ArrowRight') { applyPercent(cur + step); e.preventDefault(); }
    if (e.key === 'Home')       { applyPercent(MIN);        e.preventDefault(); }
    if (e.key === 'End')        { applyPercent(MAX);        e.preventDefault(); }
  });

  // 窗口缩放时，重新夹取一次，防止超界
  window.addEventListener('resize', ()=>{
    const cur = parseFloat(localStorage.getItem(KEY)) || DEFAULT;
    applyPercent(cur, {persist:false});
  });
})();

// ========== 2) 播放器：单实例复用 ==========
const player = document.getElementById('player');
let currentButton = null;

const iconPlay  = "▶︎";
const iconPause = "⏸";

function togglePlay(button){
  const src = button.getAttribute("data-audio");
  if (!src) return;

  // 再次点同一个按钮：暂停
  if (currentButton === button && !player.paused){
    player.pause();
    button.textContent = iconPlay;
    currentButton = null;
    return;
  }

  // 切换按钮状态
  if (currentButton && currentButton !== button) {
    currentButton.textContent = iconPlay;
  }
  currentButton = button;
  button.textContent = iconPause;

  // 切换音源并播放
  const abs = new URL(src, location).href;
  if (player.src !== abs) player.src = abs;
  player.currentTime = 0;

  player.play().catch(err=>{
    console.error("播放失败:", err);
    alert("音频播放失败：请检查路径或文件名。");
    button.textContent = iconPlay;
    currentButton = null;
  });
}

player.addEventListener("ended", ()=>{
  if (currentButton){ currentButton.textContent = iconPlay; currentButton = null; }
});
player.addEventListener("error", ()=>{
  if (currentButton){ currentButton.textContent = iconPlay; currentButton = null; }
});

// 让 JSON 注入的 HTML 里的 onclick 能用
window.togglePlay = togglePlay;

// ========== 3) 工具 ==========
function getParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function setParam(name, value){
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  history.replaceState({}, "", url.toString());
}

// ========== 4) 渲染 ==========
function renderVocabTable(vocab){
  const tbody = document.querySelector("#vocabTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  (vocab || []).forEach(row=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.hz||""}</td><td>${row.py||""}</td><td>${row.en||""}</td>`;
    tbody.appendChild(tr);
  });
}

function renderTitle(data, fallbackId){
  const titleEl = document.getElementById("title");
  if (!titleEl) return;

  const title = data.title || fallbackId || "";
  const audioSrc = data.title_audio || data.coverAudio;

  titleEl.innerHTML = title;
  if (audioSrc){
    const btn = document.createElement("button");
    btn.className = "play-button";
    btn.setAttribute("data-audio", audioSrc);
    btn.textContent = iconPlay;
    btn.onclick = function(){ togglePlay(btn); };
    titleEl.appendChild(document.createTextNode(" "));
    titleEl.appendChild(btn);
  }
}

function renderContentOldFormat(data){
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = data.content_html || "";
}

function renderContentNewFormat(data){
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = "";

  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  const images = Array.isArray(data.images) ? data.images : [];

  paragraphs.forEach((p, idx)=>{
    const para = document.createElement("p");
    // 允许内联 HTML（含 tooltip）
    if (p.html) para.innerHTML = p.html;
    else if (p.text) para.textContent = p.text;

    if (p.audio){
      const btn = document.createElement("button");
      btn.className = "play-button";
      btn.setAttribute("data-audio", p.audio);
      btn.textContent = iconPlay;
      btn.onclick = function(){ togglePlay(btn); };
      para.appendChild(document.createTextNode(" "));
      para.appendChild(btn);
    }
    contentEl.appendChild(para);

    // 段落专属图片（方案 1）
    if (p.image) {
      const img = document.createElement("img");
      img.src = p.image.src;
      img.alt = p.image.alt || "";
      img.className = "para-img";   // 用 CSS 控制大小
      contentEl.appendChild(img);
    }

    // 指定 after 的图片（方案 2）
    images
      .filter(img => Number.isInteger(img.after) && img.after === (idx + 1))
      .forEach(img => {
        const el = document.createElement("img");
        el.src = img.src;
        el.alt = img.alt || "";
        contentEl.appendChild(el);
      });
  });

  // 其余图片统一插到最后
  images
    .filter(img => !Number.isInteger(img.after))
    .forEach(img => {
      const el = document.createElement("img");
      el.src = img.src;
      el.alt = img.alt || "";
      contentEl.appendChild(el);
    });
}

// ========== 5) 加载目录与课文 ==========
async function loadIndex(){
  const res = await fetch("data/index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("无法加载 index.json");
  const data = await res.json(); // { lessons: [{id,title}, ...] }
  return data.lessons || [];
}

function fillLessonSelect(lessons, currentId){
  const sel = document.getElementById("lessonSelect");
  if (!sel) return;

  sel.innerHTML = "";
  lessons.forEach(ls=>{
    const opt = document.createElement("option");
    opt.value = ls.id;
    opt.textContent = ls.title || ls.id;
    if (ls.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = ()=>{
    const id = sel.value;
    setParam("lesson", id);
    loadLesson(id);
  };
}

async function loadLesson(id){
  const res = await fetch(`data/${id}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`无法加载 ${id}.json`);
  const data = await res.json();

  renderTitle(data, id);

  if (data.content_html){
    renderContentOldFormat(data);
  }else if (data.paragraphs){
    renderContentNewFormat(data);
  }else{
    const contentEl = document.getElementById("content");
    if (contentEl) contentEl.textContent = "（本课暂无内容）";
  }

  renderVocabTable(data.vocab || []);
}

// ========== 6) 入口 ==========
(async function init(){
  try{
    const lessons = await loadIndex();
    const defaultId = lessons[0]?.id;
    const id = getParam("lesson") || defaultId;
    fillLessonSelect(lessons, id);
    if (id) await loadLesson(id);
  }catch(e){
    console.error(e);
    const contentEl = document.getElementById("content");
    if (contentEl) contentEl.textContent = "加载失败，请检查 data/ 目录与 JSON 文件。";
  }
})();
