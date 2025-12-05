import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import * as THREE from "three";
import "./styles/Home.css";

/* ----------------------------------------------- */
/*  FLOATING PARTICLES (CANVAS BACKGROUND)         */
/* ----------------------------------------------- */
function FloatingParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 1,
      dx: (Math.random() - 0.5) * 0.6,
      dy: (Math.random() - 0.5) * 0.6,
    }));

    const draw = () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = isDark
        ? "rgba(255,255,255,0.35)"
        : "rgba(0,0,0,0.2)";

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      });

      requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("resize", () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    });
  }, []);

  return <canvas ref={canvasRef} className="webilo-particles"></canvas>;
}


/* ----------------------------------------------- */
/*  MOVING GRADIENT BEAMS (BACKGROUND)             */
/* ----------------------------------------------- */
function GradientBeams() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";

  return (
    <div
      className="webilo-gradient-beams"
      style={{
        filter: isDark ? "blur(120px)" : "blur(90px)",
      }}
    >
      <div
        className="beam b1"
        style={{
          opacity: isDark ? 0.12 : 0.18,
          background: isDark
            ? "linear-gradient(135deg, #f3f4ff, #cdd8ff)"
            : "linear-gradient(135deg, #b8c0ff, #e0e7ff)",
        }}
      />
      <div
        className="beam b2"
        style={{
          opacity: isDark ? 0.1 : 0.15,
          background: isDark
            ? "linear-gradient(130deg, #eef1ff, #d6defd)"
            : "linear-gradient(130deg, #d0d4ff, #f5f7ff)",
        }}
      />
      <div
        className="beam b3"
        style={{
          opacity: isDark ? 0.09 : 0.14,
        }}
      />
    </div>
  );
}

/* ----------------------------------------------- */
/*  THREE.JS 3D GLOBE (INTERACTIVE)                */
/* ----------------------------------------------- */
function WebiloGlobe() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // GLOBE MATERIAL (Theme-Aware)
    const material = new THREE.MeshStandardMaterial({
      color: isDark ? 0x6a5dfd : 0x4f46e5,
      transparent: true,
      opacity: isDark ? 0.9 : 0.85,
      roughness: isDark ? 0.25 : 0.35,
      metalness: isDark ? 0.65 : 0.45,
    });

    const geometry = new THREE.SphereGeometry(1.5, 64, 64);
    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // LIGHTS (Theme-Aware)
    const ambient = new THREE.AmbientLight(isDark ? 0xffffff : 0x444444, 0.6);
    const point = new THREE.PointLight(
      isDark ? 0x4bbaff : 0x7f8cff,
      isDark ? 1 : 0.6
    );
    point.position.set(5, 3, 5);
    scene.add(ambient, point);

    const animate = () => {
      globe.rotation.y += 0.0025;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="webilo-globe"></div>;
}


/* ----------------------------------------------- */
/*  AI WEBSITE BUILD ANIMATION                     */
/* ----------------------------------------------- */
function AIShowcase() {
  const [text, setText] = useState("");
  const fullText = "Analyzing your prompt… Generating layout… Selecting visuals… Applying design system… Building your website… Done.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, index));
      index += 1;
      if (index > fullText.length) clearInterval(interval);
    }, 40); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ai-showcase">
      <p>{text}</p>

      {/* Section reveal */}
      <motion.div
        className="ai-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2 }}
      />
      <motion.div
        className="ai-section mid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2.3 }}
      />
      <motion.div
        className="ai-section small"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 2.6 }}
      />
    </div>
  );
}

/* ----------------------------------------------- */
/*  TESTIMONIAL CAROUSEL                          */
/* ----------------------------------------------- */
function TestimonialCarousel() {
  const testimonials = [
    {
      name: "Faith M.",
      text: "Webilo created a full business site for me in seconds. It’s insane.",
    },
    {
      name: "Thabo K.",
      text: "This is the future of web design. Nothing comes close.",
    },
    {
      name: "Mariah S.",
      text: "As a freelancer, Webilo saves me hours every day.",
    },
    {
      name: "Kenji R.",
      text: "I went from zero knowledge to having my e-commerce site launched in one afternoon.",
    },
    {
      name: "Alex B.",
      text: "The quality is what truly shocked me. It builds better code than I used to write myself.",
    },
    {
      name: "Priya L.",
      text: "It handles all the technical headaches. I just focus on the big ideas now.",
    },
    {
      name: "Javi G.",
      text: "I thought it would be a gimmick, but the AI understands my intent perfectly. Game changer.",
    },
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="testimonial-wrap">
      <motion.div
        key={index}
        className="testimonial-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <p className="t-text">“{testimonials[index].text}”</p>
        <p className="t-name">— {testimonials[index].name}</p>
      </motion.div>
    </div>
  );
}

/* ----------------------------------------------- */
/*  FULL WEBILO HOME COMPONENT                     */
/* ----------------------------------------------- */
export default function Home() {
  return (
    <div className="webilo-page">

      {/* BACKGROUND EFFECTS */}
      <FloatingParticles />
      <GradientBeams />

      {/* HERO */}
      <section className="webilo-hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3 }}
        >
          <h1 className="title">
            WEBILO  
            <span>Web Creation Reinvented</span>
          </h1>

          <p className="subtitle">
            Imagine it. Define it. Watch our AI design and launch your entire site, effortlessly.
          </p>
          <p className="subtitle">
            We design only pixel perfect websites.🤌
          </p>

          <div className="cta-row">
            <Link to="/studio/new" className="btn-primary">Start Creating</Link>
            <Link to="/studio" className="btn-outline">Dashboard</Link>
          </div>
        </motion.div>
      </section>

      {/* 3D GLOBE */}
      <section className="globe-section">
        <WebiloGlobe />
      </section>

      {/* AI WEBSITE BUILD ANIMATION */}
      <section className="ai-section-wrap">
        <h2>See AI Build in Real-Time</h2>
        <AIShowcase />
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <h2>Loved by Creators</h2>
        <TestimonialCarousel />
      </section>

    </div>
  );
}
