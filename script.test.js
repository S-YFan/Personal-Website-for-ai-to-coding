const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

// Load and execute script.js in a VM context
const scriptContent = fs.readFileSync('./script.js', 'utf8');

const context = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    document: {
        head: { appendChild: () => {} },
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({
            dataset: {},
            addEventListener: () => {},
            removeEventListener: () => {}
        }),
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
const loadStylesheet = context.loadStylesheet;

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
describe('loadStylesheet', () => {
    let mockElement;

    beforeEach(() => {
        mockElement = {
            dataset: {},
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            removeEventListener(event, handler) {
                if (this.listeners[event] === handler) {
                    delete this.listeners[event];
                }
            }
        };

        context.document.querySelector = () => null;
        context.document.createElement = () => mockElement;
        context.document.head.appendChild = () => {};
    });

    test('should resolve immediately if stylesheet is already loaded', async () => {
        context.document.querySelector = (selector) => {
            if (selector === 'link[href="test.css"]') {
                return { dataset: { loaded: 'true' } };
            }
            return null;
        };
        await assert.doesNotReject(loadStylesheet('test.css'));
    });

    test('should reject immediately if stylesheet previously failed', async () => {
        context.document.querySelector = (selector) => {
            if (selector === 'link[href="test.css"]') {
                return { dataset: { failed: 'true' } };
            }
            return null;
        };
        await assert.rejects(
            loadStylesheet('test.css'),
            /Stylesheet previously failed to load: test.css/
        );
    });

    test('should resolve when new stylesheet loads successfully', async () => {
        const promise = loadStylesheet('test.css');

        // Simulate load event
        assert.ok(mockElement.listeners.load);
        mockElement.listeners.load();

        await promise;
        assert.strictEqual(mockElement.dataset.loaded, 'true');
    });

    test('should reject when new stylesheet fails to load', async () => {
        const promise = loadStylesheet('test.css');

        // Simulate error event
        assert.ok(mockElement.listeners.error);
        mockElement.listeners.error();

        await assert.rejects(
            promise,
            /Failed to load stylesheet: test.css/
        );
        assert.strictEqual(mockElement.dataset.failed, 'true');
    });

    test('should reject on timeout', async () => {
        const promise = loadStylesheet('test.css', 10);

        await assert.rejects(
            promise,
            /Timeout loading stylesheet: test.css/
        );
        assert.strictEqual(mockElement.dataset.failed, 'true');
    });
});
