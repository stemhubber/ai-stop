import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./styles/Home.css";

export default function Home() {
  return (
    <div className="home2030-container">

      {/* ---------------- HERO ---------------- */}
      <motion.section
        className="home2030-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="home2030-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Build Beautiful Websites  
          <span> In Seconds.</span>
        </motion.h1>

        <motion.p
          className="home2030-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Describe your idea… and watch AI instantly turn it into a clean, elegant,
          fully-editable website.  
          <strong>No coding. No stress. No limits.</strong>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Link to="/studio/new" className="home2030-cta">
            Create Your Website
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Link to="/studio" className="home2030-cta">
            Dashboad
          </Link>
        </motion.div>
      </motion.section>

      {/* ---------------- STORY ---------------- */}
      <motion.section
        className="home2030-story"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2>Your Vision Deserves to Be Online</h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Most great ideas never see the light of day — not because they aren’t good,
          but because building a website feels:
        </motion.p>

        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <li>❌ Confusing</li>
          <li>❌ Expensive</li>
          <li>❌ Time-consuming</li>
        </motion.ul>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          We removed all those barriers.  
          <strong>Just describe what you want — AI builds the rest.</strong>
        </motion.p>
      </motion.section>

      {/* ---------------- VALUE GRID ---------------- */}
      <motion.section
        className="home2030-value"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        viewport={{ once: true }}
      >
        <h2>Why Creators Love Our Builder</h2>

        <div className="home2030-value-grid">
          {[
            {
              title: "⚡ Lightning Fast",
              text: "From idea to full website in under 30 seconds.",
            },
            {
              title: "🎨 Beautiful Designs",
              text: "AI builds smooth, modern, premium-quality sections.",
            },
            {
              title: "🧩 Fully Editable",
              text: "Customize everything — text, images, themes, layout.",
            },
            {
              title: "🚀 Publish Instantly",
              text: "Your site goes live with a single click.",
            },
          ].map((card, index) => (
            <motion.div
              key={index}
              className="value-card"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.15,
                duration: 0.7,
              }}
              viewport={{ once: true }}
            >
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ---------------- SUBSCRIPTION ---------------- */}
      <motion.section
        className="home2030-subscribe"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        viewport={{ once: true }}
      >
        <h2>Take Your Idea to the World</h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          Free users can create unlimited sites.  
          But publishing — making your site go live — unlocks your true potential.
        </motion.p>

        <motion.p
          className="home2030-highlight"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          For less than the price of a meal, you unlock unlimited publishing,
          premium themes, and priority AI generation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Link to="/pricing" className="home2030-cta-secondary">
            View Pricing
          </Link>
        </motion.div>
      </motion.section>

    </div>
  );
}
