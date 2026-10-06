/**
 * @jest-environment jsdom
 */

describe('Smooth scrolling', () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div class="navbar"></div>
            <a href="#section1" id="link1">Go to Section 1</a>
            <a href="#" id="link-empty">Empty</a>
            <a href="#missing" id="link-missing">Missing</a>
            <div id="section1">Section 1</div>
        `;

        // Require script.js
        // To avoid multiple event listeners if required multiple times,
        // we can isolate modules using jest.isolateModules
        jest.isolateModules(() => {
            require('./script.js');
        });

        // Mock getBoundingClientRect
        const navbar = document.querySelector('.navbar');
        Object.defineProperty(navbar, 'offsetHeight', { value: 50, writable: true });

        const section1 = document.getElementById('section1');
        section1.getBoundingClientRect = jest.fn(() => ({ top: 200 }));

        // Mock window.scrollTo
        window.scrollTo = jest.fn();
        Object.defineProperty(window, 'pageYOffset', { value: 10, writable: true });

        // Dispatch DOMContentLoaded to trigger the script's logic
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    it('should prevent default and scroll to target element with offset', () => {
        const link = document.getElementById('link1');
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });

        jest.spyOn(clickEvent, 'preventDefault');

        link.dispatchEvent(clickEvent);

        expect(clickEvent.preventDefault).toHaveBeenCalled();
        expect(window.scrollTo).toHaveBeenCalledWith({
            top: 200 + 10 - 50, // elementPosition + window.pageYOffset - navbarHeight
            behavior: 'smooth'
        });
    });

    it('should return early if href is just "#"', () => {
        const link = document.getElementById('link-empty');
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });

        jest.spyOn(clickEvent, 'preventDefault');

        link.dispatchEvent(clickEvent);

        expect(clickEvent.preventDefault).toHaveBeenCalled();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('should do nothing if target element does not exist', () => {
        const link = document.getElementById('link-missing');
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });

        jest.spyOn(clickEvent, 'preventDefault');

        link.dispatchEvent(clickEvent);

        expect(clickEvent.preventDefault).toHaveBeenCalled();
        expect(window.scrollTo).not.toHaveBeenCalled();
    });
});
