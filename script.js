// script.js

const posts = [
    {
        title: "《How We Learn》—— 大腦學習機制與四大核心支柱",
        date: "2024-05-15",
        tag: "Reading Notes",
        category: "認知科學 / 讀書心得",
        summary: "探討大腦學習機制的顛覆性概念，解析注意力、主動參與、錯誤反饋與睡眠固化等四大有效學習的核心支柱。",
        url: "./posts/how-we-learn.html"
    },
    {
        title: "時間調制環形共振腔之數值模擬分析",
        date: "2024-04-10",
        tag: "Optics",
        category: "光學工程",
        summary: "深入探討時間調制環形共振腔在光學系統中的應用與數值運算技巧，並透過 Python 進行數值模擬驗證。",
        url: "#"
    },
    {
        title: "Python 數據分析與視覺化實戰指南",
        date: "2024-03-22",
        tag: "Programming",
        category: "程式開發",
        summary: "這篇文章分享了如何使用 Python 的 Pandas 與 Matplotlib 等庫進行高效的數據處理和圖表視覺化。",
        url: "#"
    },
    {
        title: "傅立葉轉換在光學訊號處理的應用",
        date: "2024-02-18",
        tag: "Physics",
        category: "物理推導",
        summary: "解析傅立葉轉換的數學原理及其在光學信號濾波、影像處理上的實務案例。",
        url: "#"
    },
    {
        title: "線性代數基礎：矩陣運算與特徵值解析",
        date: "2024-01-30",
        tag: "Math",
        category: "數學演算法",
        summary: "回顧線性代數的核心概念，包含矩陣乘法、行列式，以及特徵值與特徵向量在物理系統中的意義。",
        url: "#"
    },
    {
        title: "初探 Web 前端開發：HTML/CSS 基礎",
        date: "2023-12-15",
        tag: "WebDev",
        category: "程式開發",
        summary: "給初學者的 HTML 與 CSS 入門指南，了解網頁結構與樣式設計的基本原則。",
        url: "#"
    },
    {
        title: "讀書心得：《原子習慣》的微小改變力量",
        date: "2023-11-05",
        tag: "SelfImprovement",
        category: "讀書心得",
        summary: "總結《原子習慣》書中的實用技巧，學會如何建立好習慣、戒除壞習慣，讓微小改變帶來巨大複利。",
        url: "#"
    }
];

const POSTS_PER_PAGE = 5;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Adjust scroll position for fixed navbar
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize pagination and post render
    renderPosts(currentPage);
    renderPagination();
});

function renderPosts(page) {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;

    blogList.innerHTML = '';

    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = posts.slice(startIndex, endIndex);

    currentPosts.forEach(post => {
        const postHTML = `
            <a href="${post.url}" class="blog-row-card">
                <div class="blog-row-content">
                    <h3 class="blog-title">${post.title}</h3>
                    <p class="blog-excerpt">${post.summary}</p>
                    <div class="blog-row-bottom">
                        <div class="blog-tags">
                            <span class="tag">${post.tag}</span>
                        </div>
                        <div class="blog-meta">
                            <span class="blog-date">${post.date}</span>
                            <span class="blog-category">${post.category}</span>
                        </div>
                    </div>
                </div>
                <div class="blog-row-action">
                    <span class="read-more-btn">Read More &rarr;</span>
                </div>
            </a>
        `;
        blogList.insertAdjacentHTML('beforeend', postHTML);
    });
}

function renderPagination() {
    const paginationControls = document.getElementById('pagination-controls');
    if (!paginationControls) return;

    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    // Hide controls if 1 or fewer pages
    if (totalPages <= 1) {
        return;
    }

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    paginationControls.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => changePage(i));
        paginationControls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => changePage(currentPage + 1));
    paginationControls.appendChild(nextBtn);
}

function changePage(newPage) {
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    if (newPage < 1 || newPage > totalPages) return;

    currentPage = newPage;
    renderPosts(currentPage);
    renderPagination();

    // Smooth scroll back to top of the blog list
    const blogSection = document.getElementById('blog');
    if (blogSection) {
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const elementPosition = blogSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}
