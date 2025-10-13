// ========== 1) 播放器：单实例复用 ==========
const player = document.getElementById("player");
let currentButton = null;

const iconPlay  = "▶︎";
const iconPause = "⏸";

function togglePlay(button) {
  const src = button.getAttribute("data-audio");
  if (!src) return;

  // 点同一个按钮=暂停
  if (currentButton === button && !player.paused) {
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

  player.play().catch(err => {
    console.error("播放失败:", err);
    alert("音频播放失败：请检查路径或文件名。");
    button.textContent = iconPlay;
    currentButton = null;
  });
}

player.addEventListener("ended", () => {
  if (currentButton) {
    currentButton.textContent = iconPlay;
    currentButton = null;
  }
});
player.addEventListener("error", () => {
  if (currentButton) {
    currentButton.textContent = iconPlay;
    currentButton = null;
  }
});
window.togglePlay = togglePlay; // 允许内联 onclick 调用

// ========== 2) 工具函数 ==========
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function setParam(name, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  history.replaceState({}, "", url.toString());
}

// ========== 3) 渲染函数 ==========
function renderVocabTable(vocab) {
  const tbody = document.querySelector("#vocabTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  (vocab || []).forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.hz || ""}</td><td>${row.py || ""}</td><td>${row.en || ""}</td>`;
    tbody.appendChild(tr);
  });
}

function renderTitle(data, fallbackId) {
  const titleEl = document.getElementById("title");
  if (!titleEl) return;

  const title = data.title || fallbackId || "";
  const audioSrc = data.title_audio || data.coverAudio;

  titleEl.innerHTML = title;
  if (audioSrc) {
    const btn = document.createElement("button");
    btn.className = "play-button";
    btn.setAttribute("data-audio", audioSrc);
    btn.textContent = iconPlay;
    btn.onclick = function () { togglePlay(btn); };
    titleEl.appendChild(document.createTextNode(" "));
    titleEl.appendChild(btn);
  }
}

function renderContentOldFormat(data) {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = data.content_html || "";
}

function renderContentNewFormat(data) {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;
  contentEl.innerHTML = "";

  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
  const images = Array.isArray(data.images) ? data.images : [];

  paragraphs.forEach((p, idx) => {
    const para = document.createElement("p");
    if (p.html) para.innerHTML = p.html;      // 允许内联 HTML（含 .vocab / .vocab-word）
    else if (p.text) para.textContent = p.text;

    if (p.audio) {
      const btn = document.createElement("button");
      btn.className = "play-button";
      btn.setAttribute("data-audio", p.audio);
      btn.textContent = iconPlay;
      btn.onclick = function () { togglePlay(btn); };
      para.appendChild(document.createTextNode(" "));
      para.appendChild(btn);
    }
    contentEl.appendChild(para);

    // 段落专属图
    if (p.image) {
      const img = document.createElement("img");
      img.src = p.image.src;
      img.alt = p.image.alt || "";
      img.className = "para-img";
      contentEl.appendChild(img);
    }

    // 指定 after 的图
    images
      .filter(img => Number.isInteger(img.after) && img.after === (idx + 1))
      .forEach(img => {
        const el = document.createElement("img");
        el.src = img.src;
        el.alt = img.alt || "";
        contentEl.appendChild(el);
      });
  });

  // 其余图片统一追加
  images
    .filter(img => !Number.isInteger(img.after))
    .forEach(img => {
      const el = document.createElement("img");
      el.src = img.src;
      el.alt = img.alt || "";
      contentEl.appendChild(el);
    });
}

// ========== 4) 生词浮层相关 ==========
/** 把老 .vocab 改成 .vocab-word（兼容老数据） */
function normalizeVocabClasses(root = document.getElementById("content")) {
  if (!root) return;
  root.querySelectorAll(".vocab").forEach(el => {
    el.classList.remove("vocab");
    el.classList.add("vocab-word");
  });
}

/** 把 "词[可无空格]拼音 — 英文" 或 data-* 转成 tooltip 悬浮结构（更稳健版） */
function ensureTooltipStructure(root = document.getElementById("content")) {
  if (!root) return;

  // CJK 块（常用中日韩表意文字）
  const CJK = "\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF";
  // 拼音可用的拉丁字符 + 扩展音调 + 常见分隔（空格、中点、撇号等）
  const LATN = "A-Za-z\u00C0-\u024F\u02C6\u02CA\u02CB\u02D9\u0300-\u0304\u0308\u030C\u00B7'`\\s";

  root.querySelectorAll(".vocab-word").forEach(el => {
    // 已有 tooltip 跳过
    if (el.querySelector(".vocab-tooltip")) return;

    // 1) data-* 属性优先（最稳）
    const pyAttr = el.getAttribute("data-py");
    const enAttr = el.getAttribute("data-en");
    if (pyAttr || enAttr) {
      const tip = document.createElement("span");
      tip.className = "vocab-tooltip";
      tip.textContent = [pyAttr, enAttr].filter(Boolean).join(" — ");
      el.appendChild(tip);
      return;
    }

    // 2) 解析纯文本：形如  汉字[可无空格]拼音 — 英文
    let raw = el.textContent;
    if (!raw) return;

    // 找到第一处 “—” 或 "-"（英文释义分隔符）
    let dashIdx = raw.indexOf("—");
    if (dashIdx === -1) dashIdx = raw.indexOf("-");

    if (dashIdx === -1) return; // 没有分隔符，放弃解析

    const left = raw.slice(0, dashIdx).trimEnd();   // 汉字+拼音
    const right = raw.slice(dashIdx + 1).trim();    // 英文释义（允许包含分号、逗号等）

    // 在 left 里定位“最后一段拼音”，允许汉字与拼音之间 0~多空格
    const m = left.match(new RegExp(
      `^([${CJK}《》“”「」『』·]+?)\\s*([${LATN}]+)$`
    ));

    if (m) {
      const hanzi  = m[1].trim();
      const pinyin = m[2].trim();

      // 重写元素内容为“只显示汉字”
      el.textContent = hanzi;

      // 补 tooltip
      const tip = document.createElement("span");
      tip.className = "vocab-tooltip";
      tip.textContent = `${pinyin} — ${right}`;
      el.appendChild(tip);

      // 同步到 data-* 以便后续复用
      el.setAttribute("data-py", pinyin);
      el.setAttribute("data-en", right);
    }
    // 没匹配到则保持原状（防误杀）
  });
}

/** 根据 vocab 表自动把正文中的匹配词包上 .vocab-word 并生成 tooltip */
function autoAnnotateWithVocab(root = document.getElementById("content"), vocabList = []) {
  if (!root || !Array.isArray(vocabList) || vocabList.length === 0) return;

  // 词长降序，避免“北京”先被“京”截断
  const items = vocabList
    .filter(x => x && x.hz)
    .sort((a, b) => (b.hz.length || 0) - (a.hz.length || 0));

  // 只遍历纯文本节点，跳过已经包过的生词
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement && node.parentElement.closest(".vocab-word,.vocab,.vocab-tooltip")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    let text = node.nodeValue;
    let replaced = false;

    items.forEach(({ hz, py, en }) => {
      if (!hz) return;
      const safeHz = hz.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // 转义正则特殊字符
      const re = new RegExp(safeHz, "g");
      text = text.replace(re, match => {
        replaced = true;
        const tipHtml = `<span class="vocab-tooltip">${[py, en].filter(Boolean).join(" — ")}</span>`;
        return `<span class="vocab-word" data-py="${py || ""}" data-en="${en || ""}">${match}${tipHtml}</span>`;
      });
    });

    if (replaced) {
      const wrapper = document.createElement("span");
      wrapper.innerHTML = text;
      node.parentNode.replaceChild(wrapper, node);
    }
  });
}

// ========== 5) 数据加载 ==========
async function loadIndex() {
  const res = await fetch("data/index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("无法加载 index.json");
  const data = await res.json(); // { lessons: [{id,title}, ...] }
  return data.lessons || [];
}

function fillLessonSelect(lessons, currentId) {
  const sel = document.getElementById("lessonSelect");
  if (!sel) return;

  sel.innerHTML = "";
  lessons.forEach(ls => {
    const opt = document.createElement("option");
    opt.value = ls.id;
    opt.textContent = ls.title || ls.id;
    if (ls.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.onchange = () => {
    const id = sel.value;
    setParam("lesson", id);
    loadLesson(id);
  };
}

async function loadLesson(id) {
  const contentEl = document.getElementById("content");
  try {
    const res = await fetch(`data/${id}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`无法加载 ${id}.json`);
    const data = await res.json();

    renderTitle(data, id);

    if (data.content_html) {
      renderContentOldFormat(data);
    } else if (data.paragraphs) {
      renderContentNewFormat(data);
    } else {
      if (contentEl) contentEl.textContent = "（本课暂无内容）";
    }

    // 生词表
    renderVocabTable(data.vocab || []);

    // —— 正文生词强化（顺序很重要）——
    normalizeVocabClasses(contentEl);                 // 1) 兼容老 .vocab
    autoAnnotateWithVocab(contentEl, data.vocab || []); // 2) 纯文本自动标注
    ensureTooltipStructure(contentEl);                // 3) 统一悬浮结构（含无空格情况）

  } catch (e) {
    console.error(e);
    if (contentEl) contentEl.textContent = "加载失败，请检查 data/ 目录与 JSON 文件。";
  }
}

// ========== 6) 入口 ==========
(async function init() {
  try {
    const lessons = await loadIndex();
    const defaultId = lessons[0]?.id;
    const id = getParam("lesson") || defaultId;
    fillLessonSelect(lessons, id);
    if (id) await loadLesson(id);
  } catch (e) {
    console.error(e);
    const contentEl = document.getElementById("content");
    if (contentEl) contentEl.textContent = "加载失败，请检查 data/ 目录与 JSON 文件。";
  }
})();
