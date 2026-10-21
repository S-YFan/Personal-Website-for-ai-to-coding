const { test, describe, beforeEach, afterEach } = require('node:test');
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
const initHeadingAnchors = context.initHeadingAnchors;

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
describe('initHeadingAnchors', () => {
    let originalQuerySelectorAll;
    let originalCreateElement;

    beforeEach(() => {
        // Save originals
        originalQuerySelectorAll = context.document.querySelectorAll;
        originalCreateElement = context.document.createElement;

        // Reset document mocks
        context.document.querySelectorAll = () => [];
        context.document.createElement = (tagName) => {
            const el = {
                tagName: tagName.toUpperCase(),
                className: '',
                attributes: {},
                setAttribute(name, value) {
                    this.attributes[name] = value;
                }
            };
            return el;
        };
    });

    afterEach(() => {
        // Restore originals
        context.document.querySelectorAll = originalQuerySelectorAll;
        context.document.createElement = originalCreateElement;
    });

    const createMockHeading = (textContent, id = '', hasAnchor = false) => {
        const children = [];
        if (hasAnchor) {
            children.push({ classList: { contains: c => c === 'heading-anchor' }, nodeType: 1 });
        }

        return {
            id,
            nodeType: 1,
            childNodes: [
                { nodeType: 3, textContent } // Node.TEXT_NODE
            ],
            appendedChildren: [],
            appendChild(child) {
                this.appendedChildren.push(child);
            },
            querySelector(selector) {
                if (selector === 'a.heading-anchor' && hasAnchor) {
                    return {};
                }
                return null;
            }
        };
    };

    test('should assign unique IDs to headings without IDs based on their text content', () => {
        const headings = [
            createMockHeading('First Title'),
            createMockHeading('Second Title')
        ];

        initHeadingAnchors(headings);

        assert.strictEqual(headings[0].id, 'first-title');
        assert.strictEqual(headings[1].id, 'second-title');
        assert.strictEqual(headings[0].appendedChildren.length, 1);
        assert.strictEqual(headings[0].appendedChildren[0].className, 'heading-anchor');
    });

    test('should avoid collisions with existing document IDs', () => {
        // Mock existing IDs in the document
        context.document.querySelectorAll = (selector) => {
            if (selector === '[id]') {
                return [{ id: 'my-title' }, { id: 'my-title-1' }];
            }
            return [];
        };

        const headings = [
            createMockHeading('My Title')
        ];

        initHeadingAnchors(headings);

        // Should skip 'my-title' and 'my-title-1', using 'my-title-2'
        assert.strictEqual(headings[0].id, 'my-title-2');
    });

    test('should avoid collisions among newly generated headings', () => {
        const headings = [
            createMockHeading('Repeated Title'),
            createMockHeading('Repeated Title'),
            createMockHeading('Repeated Title')
        ];

        initHeadingAnchors(headings);

        assert.strictEqual(headings[0].id, 'repeated-title');
        assert.strictEqual(headings[1].id, 'repeated-title-1');
        assert.strictEqual(headings[2].id, 'repeated-title-2');
    });

    test('should preserve existing IDs on headings', () => {
        const headings = [
            createMockHeading('New Title', 'custom-id')
        ];

        initHeadingAnchors(headings);

        assert.strictEqual(headings[0].id, 'custom-id');
        assert.strictEqual(headings[0].appendedChildren.length, 1);
        assert.strictEqual(headings[0].appendedChildren[0].href, '#custom-id');
    });

    test('should append an anchor link if it does not exist', () => {
        const headings = [
            createMockHeading('Test Anchor')
        ];

        initHeadingAnchors(headings);

        const heading = headings[0];
        assert.strictEqual(heading.appendedChildren.length, 1);

        const anchor = heading.appendedChildren[0];
        assert.strictEqual(anchor.tagName, 'A');
        assert.strictEqual(anchor.className, 'heading-anchor');
        assert.strictEqual(anchor.href, '#test-anchor');
        assert.strictEqual(anchor.textContent, '🔗');
        assert.strictEqual(anchor.attributes['aria-label'], 'Link to Test Anchor');
    });

    test('should not append an anchor link if one already exists', () => {
        // hasAnchor = true
        const headings = [
            createMockHeading('Existing Anchor', 'some-id', true)
        ];

        initHeadingAnchors(headings);

        // Should not have appended any new children since one already existed
        assert.strictEqual(headings[0].appendedChildren.length, 0);
    });
});
