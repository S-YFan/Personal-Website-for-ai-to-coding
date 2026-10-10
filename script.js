// script.js
document.addEventListener("DOMContentLoaded", () => {
    // Cache navbar element to avoid redundant DOM queries on click
    const navbar = document.querySelector('.navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        function toggleMenu(open) {
            const isExpanded = open !== undefined ? open : navToggle.getAttribute('aria-expanded') !== 'true';
            navToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (isExpanded) {
                navMenu.classList.add('is-open');
            } else {
                navMenu.classList.remove('is-open');
            }
        }

        navToggle.addEventListener('click', () => {
            toggleMenu();
        });

        // Close menu on Escape key press and restore focus to toggle button
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Escape' || e.key === 'Esc') && navToggle.getAttribute('aria-expanded') === 'true') {
                toggleMenu(false);
                navToggle.focus();
            }
        });

        // Close menu when clicking any nav link on mobile screens
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    toggleMenu(false);
                }
            });
        });

        // Close menu if window is resized above mobile breakpoint (768px)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navToggle.getAttribute('aria-expanded') === 'true') {
                toggleMenu(false);
            }
        });
    }

    // Article Page Features (Table of Contents, Heading Anchors, Back-to-Top, KaTeX Math)
    const postArticle = document.querySelector('article.post-content');
    if (postArticle) {
        initArticleFeatures(postArticle, navbar);
        initKaTeX(postArticle);
    }
});

function hasMathContent(articleElement) {
    if (!articleElement) return false;
    const ignoredTags = ['SCRIPT', 'NOSCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE'];
    const walker = document.createTreeWalker(articleElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            let parent = node.parentElement;
            while (parent && parent !== articleElement) {
                if (ignoredTags.includes(parent.tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                parent = parent.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    let node;
    const mathPattern = /\\\(|\\\[|\$\$/;
    while ((node = walker.nextNode())) {
        if (mathPattern.test(node.nodeValue)) {
            return true;
        }
    }
    return false;
}

function loadStylesheet(href, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        let link = document.querySelector(`link[href="${href}"]`);
        if (link) {
            if (link.dataset.loaded === 'true') {
                return resolve();
            }
            if (link.dataset.failed === 'true') {
                return reject(new Error(`Stylesheet previously failed to load: ${href}`));
            }
        } else {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        }

        let finished = false;
        let timer = null;

        function cleanup() {
            finished = true;
            if (timer) clearTimeout(timer);
            link.removeEventListener('load', onLoad);
            link.removeEventListener('error', onError);
        }

        function onLoad() {
            if (finished) return;
            link.dataset.loaded = 'true';
            cleanup();
            resolve();
        }

        function onError() {
            if (finished) return;
            link.dataset.failed = 'true';
            cleanup();
            reject(new Error(`Failed to load stylesheet: ${href}`));
        }

        link.addEventListener('load', onLoad);
        link.addEventListener('error', onError);

        timer = setTimeout(() => {
            if (finished) return;
            link.dataset.failed = 'true';
            cleanup();
            reject(new Error(`Timeout loading stylesheet: ${href}`));
        }, timeoutMs);
    });
}

function loadScript(src, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        let script = document.querySelector(`script[src="${src}"]`);
        if (script) {
            if (script.dataset.loaded === 'true') {
                return resolve();
            }
            if (script.dataset.failed === 'true') {
                return reject(new Error(`Script previously failed to load: ${src}`));
            }
        } else {
            script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }

        let finished = false;
        let timer = null;

        function cleanup() {
            finished = true;
            if (timer) clearTimeout(timer);
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
        }

        function onLoad() {
            if (finished) return;
            script.dataset.loaded = 'true';
            cleanup();
            resolve();
        }

        function onError() {
            if (finished) return;
            script.dataset.failed = 'true';
            cleanup();
            reject(new Error(`Failed to load script: ${src}`));
        }

        script.addEventListener('load', onLoad);
        script.addEventListener('error', onError);

        timer = setTimeout(() => {
            if (finished) return;
            script.dataset.failed = 'true';
            cleanup();
            reject(new Error(`Timeout loading script: ${src}`));
        }, timeoutMs);
    });
}

function showKaTeXErrorNotice(articleElement) {
    if (!articleElement || articleElement.querySelector('.katex-error-notice')) {
        return;
    }

    const notice = document.createElement('div');
    notice.className = 'katex-error-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.innerHTML = `
        <p><strong>提示：</strong>數學公式元件載入失敗，頁面已保留原始 LaTeX 內容。</p>
    `;

    const header = articleElement.querySelector('.post-header');
    if (header && header.nextSibling) {
        articleElement.insertBefore(notice, header.nextSibling);
    } else {
        articleElement.insertBefore(notice, articleElement.firstChild);
    }
}

function initKaTeX(articleElement) {
    if (!articleElement) return;

    if (!hasMathContent(articleElement)) {
        return;
    }

    const KATEX_VERSION = '0.16.11';
    const cssUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
    const katexJsUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
    const autoRenderJsUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js`;

    const TIMEOUT_MS = 8000;

    Promise.all([
        loadStylesheet(cssUrl, TIMEOUT_MS),
        loadScript(katexJsUrl, TIMEOUT_MS).then(() => loadScript(autoRenderJsUrl, TIMEOUT_MS))
    ])
    .then(() => {
        if (typeof window.renderMathInElement === 'function') {
            window.renderMathInElement(articleElement, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                throwOnError: false
            });
        } else {
            showKaTeXErrorNotice(articleElement);
        }
    })
    .catch((err) => {
        console.warn('KaTeX loading failed or timed out:', err);
        showKaTeXErrorNotice(articleElement);
    });
}

// Helper functions for hash navigation, TOC generation, and slugifying
function getElementByHash(hash) {
    if (!hash || typeof hash !== 'string') return null;
    let rawId = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!rawId) return null;

    let decodedId = rawId;
    try {
        decodedId = decodeURIComponent(rawId);
    } catch (e) {
        decodedId = rawId;
    }

    let el = document.getElementById(decodedId);
    if (!el && decodedId !== rawId) {
        el = document.getElementById(rawId);
    }
    return el;
}

function getCleanHeadingText(element) {
    if (!element) return '';
    let text = '';
    element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('heading-anchor') || node.classList.contains('katex-mathml')) {
                return;
            }
            text += getCleanHeadingText(node);
        }
    });
    return text.trim();
}

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section';
}

function scrollToElement(targetElement, navbar, isInstant = false) {
    if (!targetElement) return;
    const navbarHeight = navbar ? navbar.offsetHeight : 70;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - 10;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
        top: offsetPosition,
        behavior: (isInstant || prefersReducedMotion) ? 'auto' : 'smooth'
    });
}

function createTocLabel(heading) {
    const fragment = document.createDocumentFragment();
    heading.childNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('heading-anchor') || node.classList.contains('katex-mathml')) {
                return;
            }
            const cloned = node.cloneNode(true);
            cloned.querySelectorAll?.('.heading-anchor, .katex-mathml').forEach(el => el.remove());
            fragment.appendChild(cloned);
        } else if (node.nodeType === Node.TEXT_NODE) {
            fragment.appendChild(node.cloneNode(true));
        }
    });
    return fragment;
}

function initArticleFeatures(articleElement, navbar) {
    const headings = Array.from(articleElement.querySelectorAll('h2, h3'));
    if (headings.length === 0) return;

    // Collect all existing IDs across the entire document to avoid collisions
    const existingIds = new Set();
    document.querySelectorAll('[id]').forEach(el => {
        if (el.id) {
            existingIds.add(el.id);
        }
    });

    // Ensure all headings have unique IDs & Add Heading Anchors
    headings.forEach(h => {
        if (!h.id) {
            const cleanText = getCleanHeadingText(h);
            let baseSlug = slugify(cleanText);
            let slug = baseSlug;
            let counter = 1;
            while (existingIds.has(slug)) {
                slug = `${baseSlug}-${counter++}`;
            }
            h.id = slug;
            existingIds.add(slug);
        }

        // Add anchor link next to heading if not already added
        if (!h.querySelector('a.heading-anchor')) {
            const anchor = document.createElement('a');
            anchor.className = 'heading-anchor';
            anchor.href = `#${h.id}`;
            const cleanText = getCleanHeadingText(h);
            anchor.setAttribute('aria-label', `Link to ${cleanText}`);
            anchor.innerHTML = '🔗';
            h.appendChild(anchor);
        }
    });

    // Remove existing TOC container if present to prevent duplication
    const existingToc = articleElement.querySelector('nav.toc');
    if (existingToc) {
        existingToc.remove();
    }

    // Build Dynamic Table of Contents (TOC)
    const tocContainer = document.createElement('nav');
    tocContainer.className = 'toc';
    tocContainer.setAttribute('aria-label', 'Table of Contents');

    const tocTitle = document.createElement('h2');
    tocTitle.className = 'toc-title';
    tocTitle.textContent = '目錄';
    tocContainer.appendChild(tocTitle);

    const rootList = document.createElement('ul');
    rootList.className = 'toc-list';

    let currentH2Li = null;
    let currentH3List = null;

    headings.forEach(h => {
        const item = document.createElement('li');
        item.className = 'toc-item';

        const link = document.createElement('a');
        link.href = `#${h.id}`;

        const tocLabelFragment = createTocLabel(h);
        if (tocLabelFragment.childNodes.length > 0) {
            link.appendChild(tocLabelFragment);
        } else {
            link.textContent = getCleanHeadingText(h) || h.id;
        }

        item.appendChild(link);

        if (h.tagName.toLowerCase() === 'h2') {
            currentH2Li = item;
            currentH3List = null;
            rootList.appendChild(item);
        } else if (h.tagName.toLowerCase() === 'h3') {
            if (!currentH2Li) {
                // H3 without prior H2
                rootList.appendChild(item);
            } else {
                if (!currentH3List) {
                    currentH3List = document.createElement('ul');
                    currentH3List.className = 'toc-sublist';
                    currentH2Li.appendChild(currentH3List);
                }
                currentH3List.appendChild(item);
            }
        }
    });

    tocContainer.appendChild(rootList);

    // Insert TOC before the first section or first heading
    const firstSection = articleElement.querySelector('section');
    const firstHeading = articleElement.querySelector('h2, h3');
    const insertTarget = firstSection || firstHeading;

    if (insertTarget) {
        insertTarget.parentNode.insertBefore(tocContainer, insertTarget);
    } else {
        articleElement.appendChild(tocContainer);
    }

    // Active Section Highlighting on Scroll
    const tocLinks = Array.from(tocContainer.querySelectorAll('a[href^="#"]'));
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0
        };

        const headingObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    tocLinks.forEach(link => {
                        const target = getElementByHash(link.getAttribute('href'));
                        if (target && target.id === id) {
                            link.classList.add('active');
                            link.setAttribute('aria-current', 'true');
                        } else {
                            link.classList.remove('active');
                            link.removeAttribute('aria-current');
                        }
                    });
                }
            });
        }, observerOptions);

        headings.forEach(h => headingObserver.observe(h));
    }

    // Back to Top Button
    if (!document.querySelector('button.back-to-top')) {
        const backToTopBtn = document.createElement('button');
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.setAttribute('aria-label', 'Back to top');
        backToTopBtn.setAttribute('type', 'button');
        backToTopBtn.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4l-8 8h5v8h6v-8h5z"/>
            </svg>
        `;
        document.body.appendChild(backToTopBtn);

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function handleScroll() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('is-visible');
            } else {
                backToTopBtn.classList.remove('is-visible');
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        });
    }

    // Smooth scroll handling for internal hash links with navbar offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = getElementByHash(targetId);
            if (targetElement) {
                e.preventDefault();
                scrollToElement(targetElement, navbar);

                if (history.pushState) {
                    history.pushState(null, '', targetId);
                } else {
                    location.hash = targetId;
                }
            }
        });
    });

    // Handle deep link scroll on initial page load
    if (window.location.hash) {
        const hashTarget = getElementByHash(window.location.hash);
        if (hashTarget) {
            setTimeout(() => {
                scrollToElement(hashTarget, navbar, true);
            }, 100);
        }
    }
}
