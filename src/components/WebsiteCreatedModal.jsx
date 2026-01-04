import { motion, AnimatePresence } from "framer-motion";
import './styles/WebsiteCreatedModal.css';

export default function WebsiteCreatedModal({ show, onClose, step, siteLink }) {
  const stepsContent = {
    intro: {
      title: "Welcome!",
      icon: "fa fa-rocket", // Changed to rocket for intro
      texts: [
        "You are about to create <strong>Page 1</strong> of your website.",
        "Follow the steps to build your website and add more pages later.",
        "1. Describe the site in detail.<br/>2. Choose your theme.<br/>3. Your site will be ready in 2 minutes!",
      ],
    },
    created: {
      title: "Congratulations!",
      icon: "fa fa-magic",
      texts: [
        "You have successfully created <strong>Page 1</strong>.",
        "Add more pages like <strong>Products</strong> or <strong>Gallery</strong> whenever you need<br/> Publish it first.",
      ],
    },
    publishing: {
      title: "Publishing...",
      icon: "fa fa-refresh fa-spin",
      texts: [
        "Your website is almost ready to go live!",
        "Create your unique link for the world to see."
      ],
    },
    published: {
      title: "Website Published!",
      icon: "fa fa-check-circle",
      texts: [
        "Your website is now live!",
        `Share it: <a href="${siteLink}" target="_blank" class="wcm-link">${siteLink}</a>`
      ],
    }
  };

  const current = stepsContent[step] || stepsContent.intro;

  // Animation Variants
  const backdropVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVars = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { opacity: 0, scale: 0.95, y: 10 }
  };

  const contentVars = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.1 + i * 0.1 }
    })
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="wcm-backdrop"
          variants={backdropVars}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="wcm-container"
            variants={modalVars}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step-specific key ensures animation re-runs on step change */}
            <div key={step}>
              <motion.div 
                className="wcm-icon-wrapper"
                custom={0}
                variants={contentVars}
              >
                <i className={`${current.icon} wcm-icon`}></i>
              </motion.div>

              <motion.h2 
                className="wcm-title"
                custom={1}
                variants={contentVars}
              >
                {current.title}
              </motion.h2>

              <div className="wcm-body">
                {current.texts.map((text, index) => (
                  <motion.p
                    key={index}
                    custom={index + 2}
                    variants={contentVars}
                    className="wcm-text"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                ))}
              </div>

              <motion.button 
                className="wcm-btn" 
                onClick={onClose}
                custom={current.texts.length + 2}
                variants={contentVars}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Got it!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}