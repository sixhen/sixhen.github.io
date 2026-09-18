/**
 * sixhen · Awwwards / Apple-grade 3D WebGL Centerpiece
 * Iridescent Geometric Sculpture with Specular Reflections,
 * Momentum Inertia Drag, Mouse Light Tracking, and Scroll Parallax.
 */

(function initAwwwards3D() {
    function start() {
        const canvas = document.getElementById("threeCanvas3D");
        if (!canvas) return;

        if (!window.THREE) {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
            script.onload = start;
            document.head.appendChild(script);
            return;
        }

        let scene, camera, renderer;
        let sculptureGroup, outerMesh, innerCore, wireframeMesh, particleSystem;
        let pointLight1, pointLight2, ambientLight;

        // Interaction & Physics state
        let isDragging = false;
        let previousMouseX = 0, previousMouseY = 0;
        let velocityX = 0, velocityY = 0;
        let targetRotationX = 0, targetRotationY = 0;

        let mouseX = 0, mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;

        function init() {
            // 1. Scene & Camera
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 28;

            // 2. High-Performance WebGL Renderer
            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true,
                powerPreference: "high-performance"
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // 3. Cinematic Lighting System
            ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            // Dynamic tracking key light (Soft violet/white)
            pointLight1 = new THREE.PointLight(0xa855f7, 3.2, 80);
            pointLight1.position.set(15, 12, 15);
            scene.add(pointLight1);

            // Cyan fill light from opposite angle
            pointLight2 = new THREE.PointLight(0x38bdf8, 2.5, 80);
            pointLight2.position.set(-15, -12, 12);
            scene.add(pointLight2);

            // Top rim light
            const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
            rimLight.position.set(0, 20, 10);
            scene.add(rimLight);

            // 4. The 3D Sculpture Group
            sculptureGroup = new THREE.Group();
            scene.add(sculptureGroup);

            // Positioning: placed elegantly behind the hero
            updateGroupPosition();

            // A. Outer Geometric Shell (Detailed Icosahedron)
            const outerGeo = new THREE.IcosahedronGeometry(7, 2);
            const outerMat = new THREE.MeshPhysicalMaterial({
                color: 0x111116,
                emissive: 0x1a102f,
                roughness: 0.15,
                metalness: 0.9,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                wireframe: false,
                transparent: true,
                opacity: 0.72,
                reflectivity: 0.9
            });
            outerMesh = new THREE.Mesh(outerGeo, outerMat);
            sculptureGroup.add(outerMesh);

            // B. Outer Delicate Wireframe Lattice
            const wireGeo = new THREE.IcosahedronGeometry(7.08, 2);
            const wireMat = new THREE.MeshBasicMaterial({
                color: 0xa855f7,
                wireframe: true,
                transparent: true,
                opacity: 0.35
            });
            wireframeMesh = new THREE.Mesh(wireGeo, wireMat);
            sculptureGroup.add(wireframeMesh);

            // C. Inner Floating Luminous Core (Dodecahedron)
            const innerGeo = new THREE.DodecahedronGeometry(3.6, 1);
            const innerMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.6,
                roughness: 0.2,
                metalness: 0.8,
                wireframe: true,
                transparent: true,
                opacity: 0.65
            });
            innerCore = new THREE.Mesh(innerGeo, innerMat);
            sculptureGroup.add(innerCore);

            // D. Subtle Floating Luminous Dust Particles
            const particleCount = 450;
            const particleGeo = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            const particleColors = new Float32Array(particleCount * 3);

            const col1 = new THREE.Color(0xa855f7);
            const col2 = new THREE.Color(0x38bdf8);

            for (let i = 0; i < particleCount * 3; i += 3) {
                particlePositions[i] = (Math.random() - 0.5) * 60;
                particlePositions[i + 1] = (Math.random() - 0.5) * 60;
                particlePositions[i + 2] = (Math.random() - 0.5) * 40;

                const mixedCol = col1.clone().lerp(col2, Math.random());
                particleColors[i] = mixedCol.r;
                particleColors[i + 1] = mixedCol.g;
                particleColors[i + 2] = mixedCol.b;
            }

            particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
            particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

            const particleMat = new THREE.PointsMaterial({
                size: 0.8,
                vertexColors: true,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending
            });

            particleSystem = new THREE.Points(particleGeo, particleMat);
            scene.add(particleSystem);

            // 5. Interactive Event Listeners
            initInteraction();

            window.addEventListener("resize", onWindowResize);
            window.addEventListener("scroll", onScroll, { passive: true });

            animate();
        }

        function updateGroupPosition() {
            if (!sculptureGroup) return;
            const width = window.innerWidth;
            if (width <= 768) {
                // Mobile: Centered, smaller, slightly elevated
                sculptureGroup.position.set(0, 3.5, -4);
                sculptureGroup.scale.set(0.65, 0.65, 0.65);
            } else {
                // Desktop: Positioned artfully on the right side behind hero
                sculptureGroup.position.set(9.5, 1.5, 0);
                sculptureGroup.scale.set(1, 1, 1);
            }
        }

        function initInteraction() {
            // Mouse Drag Interaction with Momentum Inertia
            window.addEventListener("mousedown", (e) => {
                if (e.target.tagName === "BUTTON" || e.target.tagName === "A" || e.target.tagName === "INPUT") return;
                isDragging = true;
                previousMouseX = e.clientX;
                previousMouseY = e.clientY;
            });

            window.addEventListener("mousemove", (e) => {
                mouseX = (e.clientX - windowHalfX) * 0.05;
                mouseY = (e.clientY - windowHalfY) * 0.05;

                // Move point light smoothly with cursor
                if (pointLight1) {
                    pointLight1.position.x += (mouseX - pointLight1.position.x) * 0.08;
                    pointLight1.position.y += (-mouseY - pointLight1.position.y) * 0.08;
                }

                if (isDragging) {
                    const deltaX = e.clientX - previousMouseX;
                    const deltaY = e.clientY - previousMouseY;

                    velocityX = deltaX * 0.005;
                    velocityY = deltaY * 0.005;

                    targetRotationY += velocityX;
                    targetRotationX += velocityY;

                    previousMouseX = e.clientX;
                    previousMouseY = e.clientY;
                }
            }, { passive: true });

            window.addEventListener("mouseup", () => {
                isDragging = false;
            });

            // Touch interaction for mobile
            window.addEventListener("touchstart", (e) => {
                if (e.touches.length === 1) {
                    isDragging = true;
                    previousMouseX = e.touches[0].clientX;
                    previousMouseY = e.touches[0].clientY;
                }
            }, { passive: true });

            window.addEventListener("touchmove", (e) => {
                if (isDragging && e.touches.length === 1) {
                    const deltaX = e.touches[0].clientX - previousMouseX;
                    const deltaY = e.touches[0].clientY - previousMouseY;

                    velocityX = deltaX * 0.006;
                    velocityY = deltaY * 0.006;

                    targetRotationY += velocityX;
                    targetRotationX += velocityY;

                    previousMouseX = e.touches[0].clientX;
                    previousMouseY = e.touches[0].clientY;
                }
            }, { passive: true });

            window.addEventListener("touchend", () => {
                isDragging = false;
            });
        }

        function onScroll() {
            if (!sculptureGroup) return;
            const scrollY = window.scrollY;
            // Smooth subtle elevation and camera drift on scroll
            sculptureGroup.position.y = (window.innerWidth <= 768 ? 3.5 : 1.5) - (scrollY * 0.004);
            sculptureGroup.rotation.z = scrollY * 0.0006;
        }

        function onWindowResize() {
            if (!camera || !renderer) return;
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            updateGroupPosition();
        }

        function animate() {
            requestAnimationFrame(animate);

            // 1. Natural idle rotation
            if (!isDragging) {
                targetRotationY += 0.0035;
                targetRotationX += 0.0015;

                // Friction on drag velocity
                velocityX *= 0.94;
                velocityY *= 0.94;
            }

            // 2. Smooth physical dampening (Linear interpolation)
            if (sculptureGroup) {
                sculptureGroup.rotation.y += (targetRotationY - sculptureGroup.rotation.y) * 0.1;
                sculptureGroup.rotation.x += (targetRotationX - sculptureGroup.rotation.x) * 0.1;
            }

            // 3. Counter-rotate inner core for mesmerizing optical depth
            if (innerCore) {
                innerCore.rotation.y -= 0.006;
                innerCore.rotation.x += 0.004;
            }

            // 4. Subtle dust drift
            if (particleSystem) {
                particleSystem.rotation.y += 0.0004;
                particleSystem.rotation.x += 0.0002;
            }

            renderer.render(scene, camera);
        }

        init();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
