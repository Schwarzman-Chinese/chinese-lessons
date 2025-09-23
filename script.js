// ========== 播放器：单实例播放 ==========
let currentAudio = null;
let currentButton = null;

const iconPlay  = "▶︎";
const iconPause = "⏸";

function togglePlay(button){
  const src = button.getAttribute("data-audio");
  if (!src) return;
  if (currentAudio && currentButton === button){
    currentAudio.pause();
    button.innerHTML = iconPlay();
    currentAudio = null; currentButton = null;
    return;
  }
  if (currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (currentButton) currentButton.innerHTML = iconPlay();
  }
  const audio = new Audio(src);
  button.innerHTML = iconPause();
  audio.play();
  audio.addEventListener("ended", ()=>{
    button.innerHTML = iconPlay();
    if (currentAudio === audio){ currentAudio = null; currentButton = null; }
  });
  currentAudio = audio;
  currentButton = button;
}

// 让 JSON 注入的 HTML 里的 onclick 能用
window.togglePlay = togglePlay;

// ========== 加载器 ==========
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

async function loadIndex(){
  const res = await fetch("data/index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("无法加载 index.json");
  const data = await res.json(); // { lessons: [{id,title}, ...] }
  return data.lessons || [];
}

function fillLessonSelect(lessons, currentId){
  const sel = document.getElementById("lessonSelect");
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

function renderVocabTable(vocab){
  const tbody = document.querySelector("#vocabTable tbody");
  tbody.innerHTML = "";
  (vocab || []).forEach(row=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.hz||""}</td><td>${row.py||""}</td><td>${row.en||""}</td>`;
    tbody.appendChild(tr);
  });
}

async function loadLesson(id){
  const res = await fetch(`data/${id}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`无法加载 ${id}.json`);
  const data = await res.json(); // { title, title_audio, content_html, vocab: [...] }

  // 标题（含可选的标题音频）
  const titleEl = document.getElementById("title");
  titleEl.innerHTML = `${data.title || id}
    ${data.title_audio ? `<button class="play-button" onclick="togglePlay(this)" data-audio="${data.title_audio}">${iconPlay()}</button>` : ""}`;

  // 正文（允许 <p>、<img>、.vocab + .tooltip、播放按钮等）
  document.getElementById("content").innerHTML = data.content_html || "";

  // 生词表
  renderVocabTable(data.vocab || []);
}

(async function init(){
  try{
    const lessons = await loadIndex();
    const defaultId = lessons[0]?.id;
    const id = getParam("lesson") || defaultId;
    fillLessonSelect(lessons, id);
    if (id) await loadLesson(id);
  }catch(e){
    console.error(e);
    document.getElementById("content").textContent = "加载失败，请检查 data/ 目录与 JSON 文件。";
  }
})();
