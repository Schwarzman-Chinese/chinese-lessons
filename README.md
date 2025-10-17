# 📘 中文课文网页使用说明书（教师版）

> 部署平台：GitHub Pages  
> 功能：在线阅读课文、播放音频、查看生词表  

---

## 🌐 一、网页简介

本网页是一个教学工具，用于展示课文、生词表与音频。  
教师和学生都可以在浏览器中直接打开，无需安装任何软件。

**特点：**
- 可在线阅读课文内容  
- 每段均可播放配套音频  
- 鼠标悬停在生词上可查看拼音和英文释义  
- **可轻松在 GitHub 上添加新课文** 

---

## 📂 二、文件结构说明

| 名称 | 说明 |
|------|------|
| `index.html` | 网页首页（主页面） |
| `styles.css` | 样式文件：控制颜色、字体、排版 |
| `script.js` | 网页逻辑：加载课文、播放音频、生词提示 |
| `data/` | 存放每课的内容（每课一个 `.json` 文件） |
| `audio/` | 存放音频文件 |
| `img/` | 存放插图或封面图片 |
| `README.md` | 本说明文件 |

---

## 🧭 三、如何访问网页

打开浏览器，输入网页地址即可访问：
https://schwarzman-chinese.github.io/chinese-lessons/
💡 每当在 GitHub 上更新文件，网页会在 1–2 分钟后自动同步更新。

---

## ✏️ 四、如何添加新的课文

可以 **直接在 GitHub 网站上操作**，不需要安装任何软件。

### 步骤 1️⃣：打开仓库
进入github项目网页

### 步骤 2️⃣：进入 `data/` 文件夹
点击 `data` 文件夹，会看到现有的课文文件，例如：
lesson1.json

### 步骤 3️⃣：新增一个课文文件
1. 点击右上角 **“Add file → Create new file”**  
2. 命名为：
data/lesson？.json
3. 按照以下模板写课文（可以直接让chatgpt帮忙写）：

```json
{
"id": "lesson2",
"title": "是鞍山，不是洛杉矶（二）",
"title_audio": "audio/lesson2-title.mp3",
"paragraphs": [
 {
   "html": "这是第二课的第一段内容。",
   "audio": "audio/lesson2-1.mp3"
 },
 {
   "html": "这是第二课的第二段内容。"
 }
],
"vocab": [
 { "hz": "地理", "py": "dì lǐ", "en": "geography" },
 { "hz": "物产资源", "py": "wù chǎn zī yuán", "en": "local products; natural resources" }
]
}
4. 滚动到页面底部 → 点击 Commit new file（保存）

### 步骤 4：更新目录文件 index.json
