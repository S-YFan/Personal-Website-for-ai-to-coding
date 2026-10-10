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

function initKaTeX(articleElement) {
    if (!articleElement) return;

    const KATEX_VERSION = '0.16.11';
    const cssUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
    const katexJsUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
    const autoRenderJsUrl = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js`;

    // Inject KaTeX stylesheet
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }

    // Helper to dynamically load script sequentially
    function loadScript(src, callback) {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            if (existingScript.dataset.loaded === 'true') {
                callback();
            } else {
                existingScript.addEventListener('load', callback);
            }
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            script.dataset.loaded = 'true';
            callback();
        };
        document.head.appendChild(script);
    }

    loadScript(katexJsUrl, () => {
        loadScript(autoRenderJsUrl, () => {
            if (window.renderMathInElement) {
                window.renderMathInElement(articleElement, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '\\(', right: '\\)', display: false }
                    ],
                    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                    throwOnError: false
                });
            }
        });
    });
}

function initArticleFeatures(articleElement, navbar) {
    const headings = Array.from(articleElement.querySelectorAll('h2, h3'));
    if (headings.length === 0) return;

    // Helper to generate slug from heading text
    function slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'section';
    }

    const existingIds = new Set();
    headings.forEach(h => {
        if (h.id) {
            existingIds.add(h.id);
        }
    });

    // Ensure all headings have unique IDs & Add Heading Anchors
    headings.forEach(h => {
        if (!h.id) {
            let baseSlug = slugify(h.textContent);
            let slug = baseSlug;
            let counter = 1;
            while (existingIds.has(slug)) {
                slug = `${baseSlug}-${counter++}`;
            }
            h.id = slug;
            existingIds.add(slug);
        }

        // Add anchor link next to heading
        const anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = `#${h.id}`;
        anchor.setAttribute('aria-label', `Link to ${h.textContent.trim()}`);
        anchor.innerHTML = '🔗';
        h.appendChild(anchor);
    });

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
        // Clone text without the anchor icon
        const textContent = Array.from(h.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent)
            .join('')
            .trim();
        link.textContent = textContent || h.textContent.replace('🔗', '').trim();

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
                        if (link.getAttribute('href') === `#${id}`) {
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

    // Smooth scroll handling for internal hash links with navbar offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const navbarHeight = navbar ? navbar.offsetHeight : 70;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - 10;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: prefersReducedMotion ? 'auto' : 'smooth'
                });

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
        const hashTarget = document.querySelector(window.location.hash);
        if (hashTarget) {
            setTimeout(() => {
                const navbarHeight = navbar ? navbar.offsetHeight : 70;
                const elementPosition = hashTarget.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - 10;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'auto'
                });
            }, 100);
        }
    }
}
