/**
 * sixhen · Minimalist Interactions Core
 * Handles: Copy to clipboard, QR modal, Scroll-to-top, Smooth navigation.
 */

function showToast(message, icon = "fas fa-check") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="${icon}" style="color:var(--accent);"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        toast.style.transition = "0.25s ease";
        setTimeout(() => toast.remove(), 250);
    }, 2400);
}

function copyText(text, label = "thông tin") {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Đã sao chép ${label}!`);
        }).catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
}

function fallbackCopy(text, label) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
        showToast(`Đã sao chép ${label}!`);
    } catch (err) {
        showToast("Không thể sao chép tự động!", "fas fa-exclamation");
    }
    document.body.removeChild(textArea);
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. VietQR Zoom Modal
    const qrImage = document.getElementById("qrImage");
    const qrModal = document.getElementById("qrModal");
    const qrModalImg = document.getElementById("qrModalImg");

    if (qrImage && qrModal && qrModalImg) {
        qrImage.addEventListener("click", () => {
            qrModalImg.src = qrImage.src;
            qrModal.classList.add("active");
        });

        qrModal.addEventListener("click", () => {
            qrModal.classList.remove("active");
        });
    }

    // 2. Back to Top Button
    const backToTop = document.getElementById("backToTop");
    if (backToTop) {
        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // 3. Smooth Anchor Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e) {
            const targetId = this.getAttribute("href");
            if (targetId === "#") return;
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: "smooth" });
            }
        });
    });

    // 4. Keyboard ESC to close modal
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && qrModal) {
            qrModal.classList.remove("active");
        }
    });
});
