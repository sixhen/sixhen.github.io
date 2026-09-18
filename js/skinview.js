/**
 * sixhen · Minecraft 3D Skin Viewer (WebGL using skinview3d)
 */

(function initSkinViewer() {
    const container = document.getElementById('mcSkinCanvasContainer');
    const animWalkBtn = document.getElementById('skinAnimWalk');
    const animWaveBtn = document.getElementById('skinAnimWave');
    const animIdleBtn = document.getElementById('skinAnimIdle');

    if (!container) return;

    function loadScript(src, callback) {
        if (window.skinview3d) {
            callback();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = callback;
        script.onerror = () => {
            console.warn('Could not load skinview3d from CDN, using 2D fallback');
        };
        document.head.appendChild(script);
    }

    loadScript('https://cdn.jsdelivr.net/npm/skinview3d@3.0.1/bundles/skinview3d.bundle.js', () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.id = 'skinCanvas3D';
            container.innerHTML = '';
            container.appendChild(canvas);

            const skinViewer = new skinview3d.SkinViewer({
                canvas: canvas,
                width: 150,
                height: 200,
                skin: 'https://minotar.net/skin/sixhen'
            });

            skinViewer.camera.position.set(0, 0, 60);
            skinViewer.zoom = 0.85;
            skinViewer.autoRotate = true;
            skinViewer.autoRotateSpeed = 0.8;

            let currentAnim = skinViewer.animations.add(skinview3d.WalkingAnimation);
            currentAnim.speed = 0.6;

            if (animWalkBtn) {
                animWalkBtn.addEventListener('click', () => {
                    skinViewer.animations.paused = false;
                    skinViewer.animations.resetAndClear();
                    currentAnim = skinViewer.animations.add(skinview3d.WalkingAnimation);
                    currentAnim.speed = 0.6;
                    updateActiveBtn(animWalkBtn);
                });
            }

            if (animWaveBtn) {
                animWaveBtn.addEventListener('click', () => {
                    skinViewer.animations.paused = false;
                    skinViewer.animations.resetAndClear();
                    currentAnim = skinViewer.animations.add(skinview3d.WaveAnimation);
                    currentAnim.speed = 0.8;
                    updateActiveBtn(animWaveBtn);
                });
            }

            if (animIdleBtn) {
                animIdleBtn.addEventListener('click', () => {
                    skinViewer.animations.paused = false;
                    skinViewer.animations.resetAndClear();
                    currentAnim = skinViewer.animations.add(skinview3d.IdleAnimation);
                    currentAnim.speed = 0.5;
                    updateActiveBtn(animIdleBtn);
                });
            }

            function updateActiveBtn(activeBtn) {
                [animWalkBtn, animWaveBtn, animIdleBtn].forEach(b => {
                    if (b) b.classList.toggle('active', b === activeBtn);
                });
            }
        } catch (e) {
            console.warn('SkinViewer 3D initialization error:', e);
        }
    });
})();
