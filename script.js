// 简单图标文案
const iconPlay  = "▶︎";
const iconPause = "⏸";

const player = document.getElementById("player");
let currentBtn = null;

// 读取 URL 参数
function getQuery(name, fallback=null){
  const v = new URLSearchParams(location.search).get(name);
  return v ?? fallback;
}

// 渲染顶部下拉（来自 data/index.json）
async function loadLessonList(){
  const sel = document.getElementById("lesson-select");
  const res = await fetch(`data/index.json?v=${Date.now()}`);
  const list = await res.json();

  sel.innerHTML = "";
  for(const it of list.lessons){
    const opt = document.createElement("option");
    opt.value = it.id; opt.textContent = it.title;
    sel.appendChild(opt);
  }

  const cur = getQuery("lesson", list.lessons[0]?.id || "");
  sel.value = cur;
  sel.onchange = () => {
    const id = sel.value;
    const url = new URL(location.href);
    url.searchParams.set("lesson", id);
    location.href = url.toString();
  };
  return cur;
}

// 统一播放控制
function play(btn, src){
  if (!src) return;

  // 同一按钮 => 切换暂停
  if (currentBtn === btn && !player.paused){
    player.pause();
    btn.textContent = iconPlay;
    currentBtn = null;
    return;
  }

  // 切换按钮状态
  if (currentBtn && currentBtn !== btn) currentBtn.textContent = iconPlay;
  currentBtn = btn;
  btn.textContent = iconPause;

  const abs = new URL(src, location).href;
  if (player.src !== abs) player.src = abs;
  player.currentTime = 0;

  player.play().catch(err=>{
    console.error("播放失败", err);
    alert("音频播放失败，请检查路径或文件名。");
    btn.textContent = iconPlay;
    currentBtn = null;
  });
}

player.addEventListener("ended", ()=>{
  if (currentBtn){ currentBtn.textContent = iconPlay; currentBtn = null; }
});
player.addEventListener("error", ()=>{
  if (currentBtn){ currentBtn.textContent = iconPlay; currentBtn = null; }
});

// 渲染课文（来自 data/{lesson}.json）
async function renderLesson(lessonId){
  const app = document.getElementById("app");
  app.innerHTML = `<p class="note">加载中…</p>`;
  try{
    const res = await fetch(`data/${lessonId}.json?v=${Date.now()}`);
    if(!res.ok) throw new Error(res.status);
    const data = await res.json();

    const frag = document.createDocumentFragment();

    // 标题 + 封面按钮
    const header = document.createElement("div");
    header.className = "header-row";
    const h2 = document.createElement("h2");
    h2.textContent = data.title;
    header.appendChild(h2);

    if (data.coverAudio){
      const hb = document.createElement("button");
      hb.className = "play-button";
      hb.textContent = iconPlay;
      hb.onclick = () => play(hb, data.coverAudio);
      header.appendChild(hb);
    }
    frag.appendChild(header);

    if (data.subtitle){
      const sub = document.createElement("div");
      sub.className = "note";
      sub.textContent = data.subtitle;
      frag.appendChild(sub);
    }

    frag.appendChild(document.createElement("hr"));

    // 段落
    (data.paragraphs || []).forEach(p=>{
      const el = document.createElement("p");
      if (p.html) el.innerHTML = p.html;     // 支持你原来的 tooltip 结构
      else if (p.text) el.textContent = p.text;

      if (p.audio){
        const b = document.createElement("button");
        b.className = "play-button";
        b.textContent = iconPlay;
        b.onclick = () => play(b, p.audio);
        el.appendChild(b);
      }
      frag.appendChild(el);
    });

    // 可选：图片
    (data.images || []).forEach(img=>{
      const im = document.createElement("img");
      im.src = img.src; im.alt = img.alt || "";
      frag.appendChild(im);
    });

    // 可选：生词表 HTML（你可以直接在 JSON 里给一段表格 HTML）
    if (data.vocabTableHtml){
      const wrap = document.createElement("div");
      wrap.innerHTML = data.vocabTableHtml;
      frag.appendChild(wrap);
    }

    app.innerHTML = "";
    app.appendChild(frag);
  }catch(e){
    console.error(e);
    app.innerHTML = `
      <div class="note">
        加载失败（${e.message}）。请确认 <code>data/${lessonId}.json</code> 是否存在、路径是否正确。
      </div>`;
  }
}

// 入口
(async function(){
  const lessonId = await loadLessonList();
  await renderLesson(lessonId);
})();
