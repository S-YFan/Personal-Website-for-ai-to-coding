require('./script.js');

describe('smooth scrolling', () => {
    let mockScrollTo;

    beforeEach(() => {
        mockScrollTo = jest.fn();
        window.scrollTo = mockScrollTo;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should scroll to the correct position when clicking a link and navbar exists', () => {
        document.body.innerHTML = `
            <div class="navbar" style="height: 50px;">Navbar</div>
            <a href="#target" id="link">Link</a>
            <div id="target" style="margin-top: 100px;">Target</div>
        `;

        // Mock getBoundingClientRect
        const target = document.getElementById('target');
        target.getBoundingClientRect = jest.fn(() => ({ top: 100 }));

        const navbar = document.querySelector('.navbar');
        Object.defineProperty(navbar, 'offsetHeight', { value: 50, configurable: true });

        // Dispatch DOMContentLoaded event
        document.dispatchEvent(new Event('DOMContentLoaded'));

        const link = document.getElementById('link');
        link.click();

        expect(mockScrollTo).toHaveBeenCalledWith({
            top: 50, // 100 + window.pageYOffset (0) - 50 (navbar height)
            behavior: 'smooth'
        });
    });

    test('should scroll to the correct position when clicking a link and navbar is missing', () => {
        document.body.innerHTML = `
            <a href="#target" id="link">Link</a>
            <div id="target" style="margin-top: 100px;">Target</div>
        `;

        // Mock getBoundingClientRect
        const target = document.getElementById('target');
        target.getBoundingClientRect = jest.fn(() => ({ top: 100 }));

        // Dispatch DOMContentLoaded event
        document.dispatchEvent(new Event('DOMContentLoaded'));

        const link = document.getElementById('link');
        link.click();

        expect(mockScrollTo).toHaveBeenCalledWith({
            top: 100, // 100 + window.pageYOffset (0) - 0 (navbar height fallback)
            behavior: 'smooth'
        });
    });
});
