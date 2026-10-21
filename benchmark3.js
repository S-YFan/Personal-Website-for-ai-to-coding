const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./script.js', 'utf8');

function setupEnvironment() {
    const context = {
        console: console,
        document: {
            createDocumentFragment: () => ({ appendChild: () => {}, childNodes: [] }),
            createElement: (tag) => ({
                tagName: tag,
                className: '',
                childNodes: [],
                appendChild: function(child) { this.childNodes.push(child); },
                setAttribute: function() {},
                querySelector: function() { return null; },
                querySelectorAll: function() { return []; },
                classList: { contains: () => false }
            }),
            createElementNS: (ns, tag) => ({
                setAttribute: function() {},
                appendChild: function() {}
            }),
            body: { appendChild: function() {} },
            querySelectorAll: function() { return []; },
            addEventListener: function() {},
            getElementById: function() { return null; }
        },
        window: {
            matchMedia: () => ({ matches: false }),
            addEventListener: function() {},
            pageYOffset: 0,
            scrollTo: function() {},
            location: { hash: '' }
        },
        Node: {
            TEXT_NODE: 3,
            ELEMENT_NODE: 1
        },
        Set: Set,
        WeakMap: WeakMap,
        Array: Array,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        history: { pushState: function() {} }
    };

    // Keep track of getCleanHeadingText calls
    let originalGetCleanHeadingText;
    let callCount = 0;

    vm.createContext(context);
    vm.runInContext(code, context);

    originalGetCleanHeadingText = context.getCleanHeadingText;

    context.getCleanHeadingText = function(el) {
        callCount++;
        return originalGetCleanHeadingText(el);
    };

    return { context, getCallCount: () => callCount, resetCallCount: () => callCount = 0 };
}

function runBenchmark() {
    const { context, getCallCount, resetCallCount } = setupEnvironment();

    // Create 50 mock headings
    const headings = [];
    for (let i = 0; i < 50; i++) {
        headings.push({
            tagName: i % 2 === 0 ? 'H2' : 'H3',
            nodeType: 1,
            id: '', // no id initially
            childNodes: [
                { nodeType: 3, textContent: `Heading ${i} `, cloneNode: function() { return this; } },
                { nodeType: 1, childNodes: [{ nodeType: 3, textContent: 'Nested', cloneNode: function() { return this; } }], classList: { contains: () => false }, tagName: 'SPAN' }
            ],
            classList: { contains: () => false },
            querySelector: () => null,
            appendChild: function() {},
            setAttribute: function() {},
            hasAttribute: function() { return false; },
            removeAttribute: function() {}
        });
    }

    const articleElement = {
        querySelector: () => null,
        querySelectorAll: () => headings,
        appendChild: () => {},
        parentNode: { insertBefore: () => {} },
        _headingObserver: null
    };

    resetCallCount();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        // clear IDs for each run to simulate fresh run
        headings.forEach(h => h.id = '');
        const headingCleanTextCache = new WeakMap();
        context.initHeadingAnchors(headings, headingCleanTextCache);
        context.initTOC(articleElement, headings, headingCleanTextCache);
    }
    const end = performance.now();

    console.log(`Execution time: ${(end - start).toFixed(2)} ms`);
    console.log(`getCleanHeadingText calls: ${getCallCount()}`);
}

runBenchmark();
