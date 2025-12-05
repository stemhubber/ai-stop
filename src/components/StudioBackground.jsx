import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function StudioBackground() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    /* -----------------------------
       GET CURRENT THEME COLORS
    ----------------------------- */
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    const backgroundColor = isDark ? 0x0d0f12 : 0xf5f6fa;
    const particleColor = isDark ? "#4f7cff" : "#7a8cff";

    /* -----------------------------
       SCENE SETUP
    ----------------------------- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(backgroundColor, 1);

    mount.appendChild(renderer.domElement);

    /* -----------------------------
       PARTICLES
    ----------------------------- */
    const particlesCount = 9000;
    const posArr = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArr[i] = (Math.random() - 0.5) * 8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(posArr, 3));

    const material = new THREE.PointsMaterial({
      size: 0.012,
      color: particleColor,
      opacity: isDark ? 0.55 : 0.35,
      transparent: true,
    });

    materialRef.current = material;

    const particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    /* -----------------------------
       ANIMATION LOOP
    ----------------------------- */
    const animate = () => {
      particlesMesh.rotation.y += 0.0008;
      particlesMesh.rotation.x += 0.0004;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    /* -----------------------------
       HANDLE RESIZE
    ----------------------------- */
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* -----------------------------
       HANDLE THEME TOGGLE (LIVE)
    ----------------------------- */
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      const dark = theme === "dark";

      // update background
      renderer.setClearColor(dark ? 0x0d0f12 : 0xf5f6fa);

      // update particles
      material.color = new THREE.Color(dark ? "#4f7cff" : "#7a8cff");
      material.opacity = dark ? 0.55 : 0.35;
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    /* -----------------------------
       CLEANUP
    ----------------------------- */
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
