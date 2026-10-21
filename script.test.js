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
        getElementById: () => null, // initial mock
        createTreeWalker: (root, whatToShow, filter) => {
            const nodes = [];
            const traverse = (node) => {
                if (node.nodeType === 3) {
                    const result = filter && filter.acceptNode ? filter.acceptNode(node) : 1;
                    if (result === 1) { // NodeFilter.FILTER_ACCEPT
                        nodes.push(node);
                    }
                }
                if (node.childNodes) {
                    for (const child of node.childNodes) {
                        traverse(child);
                    }
                }
            };
            traverse(root);

            let index = -1;
            return {
                nextNode: () => {
                    index++;
                    return index < nodes.length ? nodes[index] : null;
                }
            };
        }
    },
    window: {
        addEventListener: () => {},
        matchMedia: () => ({ matches: false }),
        location: { hash: '' },
        innerWidth: 1024
    },
    NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    console: console,
};

vm.createContext(context);
vm.runInContext(scriptContent, context);

const slugify = context.slugify;
const getCleanHeadingText = context.getCleanHeadingText;
const getElementByHash = context.getElementByHash;
const hasMathContent = context.hasMathContent;

const createElement = (tagNameOrChildNodes, childNodesOrClassList, classListOrUndef) => {
    let tagName = 'DIV';
    let children = [];
    let classes = [];

    if (typeof tagNameOrChildNodes === 'string') {
        tagName = tagNameOrChildNodes;
        children = childNodesOrClassList || [];
        classes = classListOrUndef || [];
    } else {
        children = tagNameOrChildNodes || [];
        classes = childNodesOrClassList || [];
    }

    const el = {
        nodeType: 1, // Node.ELEMENT_NODE
        tagName: tagName.toUpperCase(),
        childNodes: children,
        classList: {
            contains: (className) => classes.includes(className)
        },
        parentElement: null
    };

    for (const child of children) {
        child.parentElement = el;
    }

    return el;
};

const createTextNode = (textContent) => ({
    nodeType: 3, // Node.TEXT_NODE
    textContent,
    nodeValue: textContent,
    parentElement: null
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
describe('hasMathContent', () => {
    test('should return false for null or undefined', () => {
        assert.strictEqual(hasMathContent(null), false);
        assert.strictEqual(hasMathContent(undefined), false);
    });

    test('should return false when there is no math', () => {
        const el = createElement('ARTICLE', [
            createElement('P', [
                createTextNode('This is just normal text.')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), false);
    });

    test('should return true for inline math', () => {
        const el = createElement('ARTICLE', [
            createElement('P', [
                createTextNode('This is inline math: \\( x = 1 \\)')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), true);
    });

    test('should return true for display math (bracket)', () => {
        const el = createElement('ARTICLE', [
            createElement('DIV', [
                createTextNode('\\[ y = x^2 \\]')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), true);
    });

    test('should return true for display math (dollar)', () => {
        const el = createElement('ARTICLE', [
            createElement('DIV', [
                createTextNode('$$ z = x + y $$')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), true);
    });

    test('should return true for math across inline elements sharing a block parent', () => {
        const el = createElement('ARTICLE', [
            createElement('P', [
                createTextNode('\\('),
                createElement('SPAN', [
                    createTextNode(' x = 1 ')
                ]),
                createTextNode('\\)')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), true);
    });

    test('should return false for math split across block boundaries', () => {
        const el = createElement('ARTICLE', [
            createElement('DIV', [
                createTextNode('\\( x = 1')
            ]),
            createElement('DIV', [
                createTextNode('y = 2 \\)')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), false);
    });

    test('should return false for math inside ignored tags', () => {
        const el = createElement('ARTICLE', [
            createElement('PRE', [
                createTextNode('\\( x = 1 \\)')
            ]),
            createElement('CODE', [
                createTextNode('\\[ y = x^2 \\]')
            ])
        ]);
        assert.strictEqual(hasMathContent(el), false);
    });
});
