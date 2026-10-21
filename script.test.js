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
        createElement: () => ({}),
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

const showKaTeXErrorNotice = context.showKaTeXErrorNotice;

describe('showKaTeXErrorNotice', () => {
    beforeEach(() => {
        // Reset document methods for this suite
        context.document.createElement = (tagName) => {
            const el = {
                tagName: tagName.toUpperCase(),
                className: '',
                attributes: {},
                childNodes: [],
                setAttribute(name, value) {
                    this.attributes[name] = value;
                },
                appendChild(child) {
                    this.childNodes.push(child);
                }
            };
            return el;
        };
        context.document.createTextNode = (text) => {
            return { nodeType: context.Node.TEXT_NODE, textContent: text };
        };
    });

    test('should do nothing if articleElement is null or undefined', () => {
        // Should not throw
        assert.doesNotThrow(() => showKaTeXErrorNotice(null));
        assert.doesNotThrow(() => showKaTeXErrorNotice(undefined));
    });

    test('should do nothing if katex-error-notice already exists', () => {
        let queriedClass = null;
        const articleElement = {
            querySelector(selector) {
                queriedClass = selector;
                return {}; // Simulate element found
            }
        };
        showKaTeXErrorNotice(articleElement);
        assert.strictEqual(queriedClass, '.katex-error-notice');
        // Notice should not be created (we can't assert this directly but no errors mean we successfully returned)
    });

    test('should insert notice after post-header if it exists', () => {
        const header = { nextSibling: { isNextSibling: true } };
        let querySelectorCallCount = 0;
        let insertedNode = null;
        let referenceNode = null;

        const articleElement = {
            querySelector(selector) {
                querySelectorCallCount++;
                if (selector === '.katex-error-notice') return null;
                if (selector === '.post-header') return header;
                return null;
            },
            insertBefore(newNode, refNode) {
                insertedNode = newNode;
                referenceNode = refNode;
            }
        };

        showKaTeXErrorNotice(articleElement);

        assert.strictEqual(querySelectorCallCount, 2);
        assert.ok(insertedNode);
        assert.strictEqual(insertedNode.className, 'katex-error-notice');
        assert.strictEqual(insertedNode.attributes['role'], 'status');
        assert.strictEqual(insertedNode.attributes['aria-live'], 'polite');

        // Check paragraph and text
        const p = insertedNode.childNodes[0];
        assert.strictEqual(p.tagName, 'P');
        const strong = p.childNodes[0];
        assert.strictEqual(strong.tagName, 'STRONG');
        assert.strictEqual(strong.textContent, '提示：');
        const textNode = p.childNodes[1];
        assert.strictEqual(textNode.nodeType, context.Node.TEXT_NODE);
        assert.strictEqual(textNode.textContent, '數學公式元件載入失敗，頁面已保留原始 LaTeX 內容。');

        assert.strictEqual(referenceNode, header.nextSibling);
    });

    test('should insert notice at beginning if post-header does not exist', () => {
        let insertedNode = null;
        let referenceNode = null;
        const firstChild = { isFirstChild: true };

        const articleElement = {
            firstChild,
            querySelector(selector) {
                return null; // Both .katex-error-notice and .post-header return null
            },
            insertBefore(newNode, refNode) {
                insertedNode = newNode;
                referenceNode = refNode;
            }
        };

        showKaTeXErrorNotice(articleElement);

        assert.ok(insertedNode);
        assert.strictEqual(insertedNode.className, 'katex-error-notice');
        assert.strictEqual(referenceNode, firstChild);
    });

    test('should insert notice at beginning if post-header exists but has no nextSibling', () => {
        let insertedNode = null;
        let referenceNode = null;
        const firstChild = { isFirstChild: true };
        const header = { nextSibling: null }; // Exists but no nextSibling

        const articleElement = {
            firstChild,
            querySelector(selector) {
                if (selector === '.katex-error-notice') return null;
                if (selector === '.post-header') return header;
                return null;
            },
            insertBefore(newNode, refNode) {
                insertedNode = newNode;
                referenceNode = refNode;
            }
        };

        showKaTeXErrorNotice(articleElement);

        assert.ok(insertedNode);
        assert.strictEqual(insertedNode.className, 'katex-error-notice');
        assert.strictEqual(referenceNode, firstChild);
    });
});
