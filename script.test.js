const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

// Load and execute script.js in a VM context
const scriptContent = fs.readFileSync('./script.js', 'utf8');

const context = {
    document: {
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            className: '',
            attributes: {},
            childNodes: [],
            setAttribute: function(name, value) { this.attributes[name] = value; },
            appendChild: function(child) { this.childNodes.push(child); },
        }),
        createTextNode: (text) => ({ nodeType: 3, textContent: text }),
        body: { appendChild: () => {} },
        getElementById: () => null // initial mock
    },
    window: {
        addEventListener: () => {},
        matchMedia: () => ({ matches: false }),
        location: { hash: '' },
        innerWidth: 1024
    },
    NodeFilter: { SHOW_TEXT: 4 },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    console: console,
};

vm.createContext(context);
vm.runInContext(scriptContent, context);

const slugify = context.slugify;
const getCleanHeadingText = context.getCleanHeadingText;
const getElementByHash = context.getElementByHash;
const showKaTeXErrorNotice = context.showKaTeXErrorNotice;

const createElement = (childNodes = [], classList = []) => ({
    nodeType: 1, // Node.ELEMENT_NODE
    childNodes,
    classList: {
        contains: (className) => classList.includes(className)
    }
});

const createTextNode = (textContent) => ({
    nodeType: 3, // Node.TEXT_NODE
    textContent
});

describe('slugify', () => {
    test('should lowercase strings', () => {
        assert.strictEqual(slugify('HELLO'), 'hello');
        assert.strictEqual(slugify('Mixed CASE'), 'mixed-case');
    });

    test('should replace spaces and underscores with hyphens', () => {
        assert.strictEqual(slugify('hello world'), 'hello-world');
        assert.strictEqual(slugify('hello_world'), 'hello-world');
        assert.strictEqual(slugify('hello   world'), 'hello-world');
        assert.strictEqual(slugify('hello___world'), 'hello-world');
    });

    test('should remove non-alphanumeric and non-Chinese characters', () => {
        assert.strictEqual(slugify('hello!@#world'), 'helloworld');
        assert.strictEqual(slugify('special $%^ chars'), 'special-chars');
    });

    test('should preserve Chinese characters', () => {
        assert.strictEqual(slugify('中文測試'), '中文測試');
        assert.strictEqual(slugify('Hello 中文 World'), 'hello-中文-world');
        assert.strictEqual(slugify('標題一（Title 1）'), '標題一title-1');
    });

    test('should trim leading and trailing hyphens', () => {
        assert.strictEqual(slugify('---hello---'), 'hello');
        assert.strictEqual(slugify('  -hello-  '), 'hello');
        assert.strictEqual(slugify('___hello___'), 'hello');
    });

    test('should return "section" fallback when string becomes empty', () => {
        assert.strictEqual(slugify(''), 'section');
        assert.strictEqual(slugify('   '), 'section');
        assert.strictEqual(slugify('!@#$%^'), 'section');
        assert.strictEqual(slugify('___'), 'section');
        assert.strictEqual(slugify('---'), 'section');
    });

    test('should handle numbers', () => {
        assert.strictEqual(slugify('Section 123'), 'section-123');
        assert.strictEqual(slugify('12345'), '12345');
    });
});

describe('getCleanHeadingText', () => {
    test('should handle null or undefined', () => {
        assert.strictEqual(getCleanHeadingText(null), '');
        assert.strictEqual(getCleanHeadingText(undefined), '');
    });

    test('should extract text from a basic element with text nodes', () => {
        const el = createElement([
            createTextNode('Hello World')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Hello World');
    });

    test('should concatenate multiple text nodes', () => {
        const el = createElement([
            createTextNode('Hello'),
            createTextNode(' '),
            createTextNode('World')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Hello World');
    });

    test('should extract text from nested elements', () => {
        const el = createElement([
            createTextNode('Hello '),
            createElement([
                createTextNode('Nested')
            ]),
            createTextNode(' World')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Hello Nested World');
    });

    test('should skip elements with heading-anchor class', () => {
        const el = createElement([
            createTextNode('Main Title'),
            createElement([createTextNode('#')], ['heading-anchor'])
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Main Title');
    });

    test('should skip elements with katex-mathml class', () => {
        const el = createElement([
            createTextNode('Equation'),
            createElement([createTextNode('E=mc^2')], ['katex-mathml']),
            createTextNode(' End')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Equation End');
    });

    test('should skip elements with both skipped classes', () => {
        const el = createElement([
            createTextNode('Title'),
            createElement([createTextNode('SkipMe1')], ['heading-anchor']),
            createElement([createTextNode('SkipMe2')], ['katex-mathml'])
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Title');
    });

    test('should ignore non-element, non-text nodes like comments', () => {
        const commentNode = { nodeType: 8, nodeValue: 'This is a comment' }; // Node.COMMENT_NODE
        const el = createElement([
            createTextNode('Text '),
            commentNode,
            createTextNode('Content')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Text Content');
    });

    test('should trim leading and trailing spaces', () => {
        const el = createElement([
            createTextNode('   Spaced Text   ')
        ]);
        assert.strictEqual(getCleanHeadingText(el), 'Spaced Text');
    });
});

describe('getElementByHash', () => {
    beforeEach(() => {
        // Reset document.getElementById before each test
        context.document.getElementById = () => null;
    });

    test('should return null for empty or non-string inputs', () => {
        assert.strictEqual(getElementByHash(null), null);
        assert.strictEqual(getElementByHash(undefined), null);
        assert.strictEqual(getElementByHash(''), null);
        assert.strictEqual(getElementByHash(123), null);
        assert.strictEqual(getElementByHash({}), null);
    });

    test('should return null if hash is only "#"', () => {
        assert.strictEqual(getElementByHash('#'), null);
    });

    test('should find element by normal id without hash prefix', () => {
        const mockEl = { id: 'section-1' };
        context.document.getElementById = (id) => id === 'section-1' ? mockEl : null;
        assert.strictEqual(getElementByHash('section-1'), mockEl);
    });

    test('should find element by normal id with hash prefix', () => {
        const mockEl = { id: 'section-1' };
        context.document.getElementById = (id) => id === 'section-1' ? mockEl : null;
        assert.strictEqual(getElementByHash('#section-1'), mockEl);
    });

    test('should handle url-encoded hash and find decoded id', () => {
        const mockEl = { id: '測試' };
        context.document.getElementById = (id) => id === '測試' ? mockEl : null;
        assert.strictEqual(getElementByHash('#%E6%B8%AC%E8%A9%A6'), mockEl);
    });

    test('should fallback to raw id if decoded id is not found', () => {
        const mockEl = { id: '%E6%B8%AC%E8%A9%A6' };
        context.document.getElementById = (id) => id === '%E6%B8%AC%E8%A9%A6' ? mockEl : null;
        assert.strictEqual(getElementByHash('#%E6%B8%AC%E8%A9%A6'), mockEl);
    });

    test('should handle malformed URI components gracefully', () => {
        const mockEl = { id: '%E6%B8' };
        context.document.getElementById = (id) => id === '%E6%B8' ? mockEl : null;
        assert.strictEqual(getElementByHash('#%E6%B8'), mockEl);
    });
});
describe('showKaTeXErrorNotice', () => {
    let mockArticle;

    beforeEach(() => {
        mockArticle = {
            childNodes: [],
            get firstChild() { return this.childNodes[0] || null; },
            querySelector: function(selector) {
                if (selector === '.katex-error-notice') {
                    return this.childNodes.find(c => c.className === 'katex-error-notice') || null;
                }
                if (selector === '.post-header') {
                    return this.childNodes.find(c => c.className === 'post-header') || null;
                }
                return null;
            },
            insertBefore: function(newNode, referenceNode) {
                if (!referenceNode) {
                    this.childNodes.unshift(newNode);
                } else {
                    const index = this.childNodes.indexOf(referenceNode);
                    if (index !== -1) {
                        this.childNodes.splice(index, 0, newNode);
                    } else {
                        this.childNodes.unshift(newNode);
                    }
                }
            }
        };
    });

    test('should insert notice at the top if no .post-header exists', () => {
        const dummyNode = { tagName: 'P', className: 'dummy' };
        mockArticle.childNodes.push(dummyNode);

        showKaTeXErrorNotice(mockArticle);

        assert.strictEqual(mockArticle.childNodes.length, 2);
        assert.strictEqual(mockArticle.childNodes[0].className, 'katex-error-notice');
        assert.strictEqual(mockArticle.childNodes[1], dummyNode);
    });

    test('should insert notice after .post-header if it exists', () => {
        const headerNode = { tagName: 'DIV', className: 'post-header', nextSibling: { tagName: 'P', className: 'dummy' } };
        mockArticle.childNodes.push(headerNode);
        mockArticle.childNodes.push(headerNode.nextSibling);

        showKaTeXErrorNotice(mockArticle);

        assert.strictEqual(mockArticle.childNodes.length, 3);
        assert.strictEqual(mockArticle.childNodes[0], headerNode);
        assert.strictEqual(mockArticle.childNodes[1].className, 'katex-error-notice');
        assert.strictEqual(mockArticle.childNodes[2], headerNode.nextSibling);
    });

    test('should insert notice after .post-header if it exists but has no nextSibling', () => {
        // Technically `script.js` checks `header.nextSibling` using the DOM property.
        // We simulate that by explicitly defining nextSibling.
        const headerNode = { tagName: 'DIV', className: 'post-header', nextSibling: null };
        mockArticle.childNodes.push(headerNode);

        showKaTeXErrorNotice(mockArticle);

        // In script.js:
        // const header = articleElement.querySelector('.post-header');
        // if (header && header.nextSibling) {
        //     articleElement.insertBefore(notice, header.nextSibling);
        // } else {
        //     articleElement.insertBefore(notice, articleElement.firstChild);
        // }
        //
        // If header.nextSibling is null, it falls back to the else branch
        // and inserts before firstChild. So it should be at index 0.

        assert.strictEqual(mockArticle.childNodes.length, 2);
        assert.strictEqual(mockArticle.childNodes[0].className, 'katex-error-notice');
        assert.strictEqual(mockArticle.childNodes[1], headerNode);
    });

    test('should not insert multiple notices if one already exists', () => {
        const existingNotice = { tagName: 'DIV', className: 'katex-error-notice' };
        mockArticle.childNodes.push(existingNotice);

        showKaTeXErrorNotice(mockArticle);

        assert.strictEqual(mockArticle.childNodes.length, 1);
        assert.strictEqual(mockArticle.childNodes[0], existingNotice);
    });

    test('should handle null/undefined article element safely', () => {
        // Should not throw
        showKaTeXErrorNotice(null);
        showKaTeXErrorNotice(undefined);
    });

    test('should construct the notice element with correct structure and attributes', () => {
        showKaTeXErrorNotice(mockArticle);

        const notice = mockArticle.childNodes[0];

        assert.strictEqual(notice.tagName, 'DIV');
        assert.strictEqual(notice.className, 'katex-error-notice');
        assert.strictEqual(notice.attributes['role'], 'status');
        assert.strictEqual(notice.attributes['aria-live'], 'polite');

        assert.strictEqual(notice.childNodes.length, 1);
        const p = notice.childNodes[0];
        assert.strictEqual(p.tagName, 'P');

        assert.strictEqual(p.childNodes.length, 2);
        const strong = p.childNodes[0];
        assert.strictEqual(strong.tagName, 'STRONG');
        assert.strictEqual(strong.textContent, '提示：');

        const textNode = p.childNodes[1];
        assert.strictEqual(textNode.nodeType, 3);
        assert.strictEqual(textNode.textContent, '數學公式元件載入失敗，頁面已保留原始 LaTeX 內容。');
    });
});
