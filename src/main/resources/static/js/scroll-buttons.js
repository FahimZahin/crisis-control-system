(function () {
    document.addEventListener("DOMContentLoaded", function () {
        createScrollButtons();
        toggleScrollButtons();
    });

    window.addEventListener("scroll", toggleScrollButtons, { passive: true });

    function createScrollButtons() {
        if (document.getElementById("scrollTopBtn")) {
            return;
        }

        const box = document.createElement("div");
        box.className = "scroll-button-box";
        box.innerHTML = `
            <button id="scrollTopBtn" class="scroll-floating-btn" title="Go to top">↑</button>
            <button id="scrollBottomBtn" class="scroll-floating-btn" title="Go to bottom">↓</button>
        `;

        document.body.appendChild(box);

        document.getElementById("scrollTopBtn").addEventListener("click", function () {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });

        document.getElementById("scrollBottomBtn").addEventListener("click", function () {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: "smooth"
            });
        });
    }

    function toggleScrollButtons() {
        const topBtn = document.getElementById("scrollTopBtn");
        const bottomBtn = document.getElementById("scrollBottomBtn");

        if (!topBtn || !bottomBtn) {
            return;
        }

        const currentY = window.scrollY || document.documentElement.scrollTop;
        const pageHeight = document.documentElement.scrollHeight;
        const screenHeight = window.innerHeight;

        topBtn.style.display = currentY > 250 ? "block" : "none";
        bottomBtn.style.display = currentY + screenHeight < pageHeight - 250 ? "block" : "none";
    }
})();