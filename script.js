// ========== 播放器：单实例播放 ==========
let currentAudio = null;
let currentButton = null;

const iconPlay  = "▶︎";
const iconPause = "⏸";

function togglePlay(button){
  const src = button.getAttribute("data-audio");
  if (!src) return;

  // 点同一个按钮 → 暂停
  if (currentAudio && currentButton === button){
    currentAudio.pause();
    button.textContent = iconPlay;
    currentAudio = null;
    currentButton = null;
    return;
  }

  // 有别的在播 → 停止并重置
  if (currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentButton) currentButton.textContent = iconPlay;
  }

  // 播放新的
  const audio = new Audio(src);
  button.textContent = iconPause;
  audio.play();

  audio.addEventListener("ended", ()=>{
    button.textContent = iconPlay;
    if (currentAudio === audio){
      currentAudio = null;
      currentButton = null;
    }
  });

  currentAudio = audio;
  currentButton = button;
}

// 让 JSON 注入的 HTML 里的 onclick 能用
window.togglePlay = togglePlay;

// ========== 工具 ==========
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

// ========== 渲染函数 ==========
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
  const audioSrc = data.title_audio || data.coverAudio; // 兼容两种命名

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
  // 老格式： content_html 字符串（里可能自带 <p> / <img> / 按钮等）
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = data.content_html || "";
  // 若 content_html 里自己写了 <button onclick="togglePlay(this)"> 也可正常使用
}

function renderContentNewFormat(data){
  // 新格式： paragraphs 数组 + images 可选
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = "";

  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  const images = Array.isArray(data.images) ? data.images : [];

  // 先按段落渲染
  paragraphs.forEach((p, idx)=>{
    const para = document.createElement("p");
    para.innerHTML = p.html || "";

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

    // 如果有带 after 的图片，就插在指定段落后（1 开始计数）
    images
      .filter(img => Number.isInteger(img.after) && img.after === (idx + 1))
      .forEach(img => {
        const el = document.createElement("img");
        el.src = img.src;
        el.alt = img.alt || "";
        contentEl.appendChild(el);
      });
  });

  // 其余（未指定 after）的图片，统一插到最后
  images
    .filter(img => !Number.isInteger(img.after))
    .forEach(img => {
      const el = document.createElement("img");
      el.src = img.src;
      el.alt = img.alt || "";
      contentEl.appendChild(el);
    });
}

// ========== 加载目录与课文 ==========
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

  // 标题（兼容 coverAudio / title_audio）
  renderTitle(data, id);

  // 内容（兼容新老两种格式）
  if (data.content_html){
    // 老格式：整段 HTML
    renderContentOldFormat(data);
  }else if (data.paragraphs){
    // 新格式：按段落 + 图片
    renderContentNewFormat(data);
  }else{
    const contentEl = document.getElementById("content");
    if (contentEl) contentEl.textContent = "（本课暂无内容）";
  }

  // 生词表（两种格式都支持）
  renderVocabTable(data.vocab || []);
}

// ========== 入口 ==========
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
