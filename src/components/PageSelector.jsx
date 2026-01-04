import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/PageSelector.css";

export const availablePages = [
  // Core
  { id: "home", label: "Home", category: "Core" },
  { id: "about", label: "About Us", category: "Core" },
  { id: "contact", label: "Contact", category: "Core" },
  { id: "faq", label: "FAQ", category: "Core" },

  // Business
  { id: "services", label: "Services", category: "Business" },
  { id: "pricing", label: "Plans / Pricing", category: "Business" },
  { id: "quote", label: "Request a Quote", category: "Business" },
  { id: "book_call", label: "Book a Call", category: "Business" },

  // Content
  { id: "gallery", label: "Gallery", category: "Content" },
  { id: "projects", label: "Projects / Portfolio", category: "Content" },
  { id: "blog", label: "Blog / Articles", category: "Content" },
  { id: "testimonials", label: "Testimonials", category: "Content" },

  // Commerce
  { id: "products", label: "Products", category: "Commerce" },
  { id: "menu", label: "Menu (Restaurant)", category: "Commerce" },
  { id: "bookings", label: "Bookings", category: "Commerce" },
  { id: "cart", label: "Cart", category: "Commerce" },
  { id: "checkout", label: "Checkout", category: "Commerce" },

  // Legal
  { id: "privacy", label: "Privacy Policy", category: "Legal" },
  { id: "terms", label: "Terms & Conditions", category: "Legal" },
];

export default function PageSelector({ selectedPages, setSelectedPages }) {
  const [isOpen, setIsOpen] = useState(false);

  const togglePage = (pageId) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  // Group pages by category
  const groupedPages = availablePages.reduce((acc, page) => {
    acc[page.category] = acc[page.category] || [];
    acc[page.category].push(page);
    return acc;
  }, {});

  return (
    <div className="page-selector">
      <button
        type="button"
        className="page-selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedPages.length
          ? `Pages selected: ${selectedPages.length}`
          : "Add pages"}
        <span className={`arrow ${isOpen ? "open" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="page-selector-options"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {Object.entries(groupedPages).map(([category, pages]) => (
              <div key={category} className="page-category">
                <p className="page-category-title">{category}</p>

                <div className="page-category-grid">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={`page-option-btn ${
                        selectedPages.includes(page.id) ? "selected" : ""
                      }`}
                      onClick={() => togglePage(page.id)}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
