# Sheng-Yang Fan's Personal Website

這是一個專注於個人背景展示與技術/閱讀筆記的純靜態個人網站，部署於 GitHub Pages。

## 專案概述與協作說明
- 本專案採用 AI 輔助軟體工程模式，大部分初始雛形與頁面架構透過 **Google Jules AI Agent** 協同生成。
- 專案由本人（Sheng-Yang Fan）主導需求規格設計，並親自進行細部程式碼重構、樣式微調（HTML/CSS/JS）與分支歷史校準。

## 架構特點
- **Zero Dependencies / Vanilla Stack**：本架構僅僅使用 HTML5、CSS3 與 JavaScript。

## 目錄結構
```text
.
├── index.html        # 首頁（筆記與專欄清單）
├── about.html        # 關於頁（精簡自介）
├── resume.html       # 履歷頁（詳細學術經歷）
├── posts/            # 文章與筆記存放目錄
│   └── how-we-learn.html
├── style.css         # 全站共用樣式表
├── script.js         # 前端腳本
└── README.md         # 專案說明文件
```

## 開發指南 (Development Guide)
### KaTeX 數學公式撰寫與渲染
本網站已整合 KaTeX 自動渲染模組，撰寫新文章時無需手動引入額外腳本，只需依照下列分隔符號撰寫：
- **行內公式 (Inline Math)：** 使用 `\( ... \)` 包裹 LaTeX 語法。例如 `\( E = mc^2 \)`。
- **區塊公式 (Display Math)：** 使用 `\[ ... \]` 或 `$$ ... $$` 包裹 LaTeX 語法。例如 `\[ \frac{a}{b} = c \]`。
- **網路需求：** 文章頁面會在瀏覽器端載入 jsDelivr CDN 託管的 KaTeX 樣式與腳本（版本 pinned 於 0.16.11）。
- **程式碼保護：** 所有的 `<pre>` 與 `<code>` 標籤皆被設為排除解析，其中的 LaTeX 語法不會被解析為數學公式。
