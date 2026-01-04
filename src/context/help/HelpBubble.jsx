import { useHelp } from "./HelpContext";
import { motion, AnimatePresence } from "framer-motion";
import "./HelpBubble.css";

export default function HelpBubble() {
  const { queue, activeIndex, activeHelp, nextHelp, prevHelp, endHelp } = useHelp();
  if (!activeHelp) return null;

  const el = activeHelp.element;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const bubbleMaxWidth = Math.min(280, vw - 24); // mobile safe margin
  const bubbleHeight = 100; // approx height
  const margin = 12;

  // Calculate horizontal position
  let left = rect.left;
  if (left + bubbleMaxWidth + margin > vw) left = vw - bubbleMaxWidth - margin;
  if (left < margin) left = margin;

  // Calculate vertical position
  let top = rect.bottom + 8;
  if (top + bubbleHeight + margin > vh) top = rect.top - bubbleHeight - 8;
  if (top < margin) top = margin;

  return (
    <AnimatePresence>
      <motion.div
        key={activeHelp.id}
        className="help-bubble"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "fixed", // fixed ensures mobile scroll works
          top,
          left,
          maxWidth: bubbleMaxWidth,
          width: "auto",
        }}
      >
        <div className="help-bubble-buttons">
  <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: 'auto' }}>
    {activeIndex + 1} of {queue?.length}
  </span>
  {/* buttons... */}
</div>
        <div className="help-bubble-text">{activeHelp.text}</div>
        <div className="help-bubble-buttons">
          <button onClick={prevHelp} disabled={activeHelp === undefined || prevHelp === undefined}>
            Prev
          </button>
          <button
            onClick={nextHelp}
            disabled={
              !nextHelp || !activeHelp?.id || activeHelp.id === undefined
            }
          >
            Next
          </button>
          <button onClick={endHelp}>Close</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
