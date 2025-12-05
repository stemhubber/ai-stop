import React, { useState } from "react";
import "./styles/MoreElementPicker.css";

export default function MoreElementPicker({ onAddElement }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({});

  const elements = [
    { id: "map", label: "Google Map", icon: "fa-map", category: "Location" },
    { id: "street", label: "Street View", icon: "fa-street-view", category: "Location" },

    { id: "gallery", label: "Image Gallery", icon: "fa-picture-o", category: "Media" },
    { id: "video", label: "Video Upload", icon: "fa-film", category: "Media" },
    { id: "pdfViewer", label: "PDF Viewer", icon: "fa-file-pdf-o", category: "Media" },
    { id: "social", label: "Social Icons", icon: "fa-share-alt", category: "Media" },

    { id: "products", label: "Products", icon: "fa-archive", category: "Commerce" },
    { id: "cart", label: "Shopping Cart", icon: "fa-shopping-cart", category: "Commerce" },
    { id: "promo", label: "Promo Banner", icon: "fa-tag", category: "Commerce" },

    { id: "booking", label: "Booking", icon: "fa-calendar-check", category: "Business" },
    { id: "hours", label: "Business Hours", icon: "fa-clock-o", category: "Business" },
    { id: "pricingTable", label: "Pricing Table", icon: "fa-table", category: "Business" },
    { id: "services", label: "Services List", icon: "fa-cogs", category: "Business" },
    { id: "testimonials", label: "Testimonials", icon: "fa-commenting", category: "Business" },
    { id: "team", label: "Team Members", icon: "fa-users", category: "Business" },
    { id: "faq", label: "FAQ", icon: "fa-question-circle", category: "Business" },

    { id: "chatbot", label: "AI Chatbot", icon: "fa-android", category: "Engagement" },
    { id: "newsletter", label: "Newsletter Sign-up", icon: "fa-paper-plane", category: "Engagement" },
    { id: "countdown", label: "Countdown", icon: "fa-hourglass-half", category: "Engagement" },

    { id: "menu", label: "Food Menu", icon: "fa-cutlery", category: "Restaurant" },
    { id: "reservation", label: "Reservation", icon: "fa-calendar", category: "Restaurant" },
    { id: "staffBooking", label: "Staff Booking", icon: "fa-user-circle", category: "Restaurant" },
    { id: "openingSpecials", label: "Specials", icon: "fa-fire", category: "Restaurant" },

    { id: "deliveryAreas", label: "Delivery Areas", icon: "fa-map-o", category: "Logistics" },
    { id: "trackOrder", label: "Track Order", icon: "fa-location-arrow", category: "Logistics" },
    { id: "pricingCalculator", label: "Cost Calculator", icon: "fa-calculator", category: "Logistics" },
  ];

  const categories = [...new Set(elements.map(e => e.category))];

  const openModal = () => setOpen(true);
  const closeModal = () => {
    setOpen(false);
    setSelected(null);
    setFormData({});
  };

  const handleSelect = (el) => {
    setSelected(el);
    setFormData({});
  };

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onAddElement({ id: selected.id, label: selected.label, data: formData });
    closeModal();
  };

  // 🔥 Dynamic 2030 Form Builder
  const renderForm = () => {
    switch (selected.id) {
      case "booking":
        return (
          <>
            <label>Booking Title</label>
            <input name="title" onChange={handleInput} placeholder="e.g. Book a Table" />

            <label>Available Days</label>
            <input name="days" onChange={handleInput} placeholder="Mon - Sun" />

            <label>Time Slots</label>
            <input name="slots" onChange={handleInput} placeholder="e.g. 10:00, 12:00, 14:00" />
          </>
        );

      case "menu":
        return (
          <>
            <label>Dish Name</label>
            <input name="dish" onChange={handleInput} placeholder="e.g. Chicken Burger" />

            <label>Price</label>
            <input name="price" onChange={handleInput} placeholder="R45" />

            <label>Image URL</label>
            <input name="image" onChange={handleInput} placeholder="Link to image" />
          </>
        );

      case "pricingTable":
        return (
          <>
            <label>Package Name</label>
            <input name="package" onChange={handleInput} placeholder="e.g. Basic Plan" />

            <label>Price</label>
            <input name="price" onChange={handleInput} placeholder="R199 / month" />

            <label>Features (comma separated)</label>
            <textarea name="features" onChange={handleInput} placeholder="Feature1, Feature2..." />
          </>
        );

      case "services":
        return (
          <>
            <label>Service Name</label>
            <input name="service" onChange={handleInput} placeholder="e.g. Haircut" />

            <label>Description</label>
            <textarea name="desc" onChange={handleInput} placeholder="Short description" />
          </>
        );

      default:
        return (
          <>
            <label>Title</label>
            <input name="title" onChange={handleInput} placeholder={`Add ${selected.label} title`} />

            <label>Description</label>
            <textarea name="description" onChange={handleInput} placeholder="Write description" />
          </>
        );
    }
  };

  return (
    <div>
      <button className="more-button" onClick={openModal}>
        <i className="fa fa-ellipsis-h"></i>
      </button>

      {open && (
        <div className="modal-backdrop">
          <div className="modal-card">

            {/* LIST MODE */}
            {!selected && (
              <>
                <h2 className="modal-title">Add Element</h2>

                <div className="scroll-area">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <h4 className="category-label">{cat}</h4>

                      <div className="element-grid">
                        {elements
                          .filter(e => e.category === cat)
                          .map((el) => (
                            <div
                              key={el.id}
                              className="element-item"
                              onClick={() => handleSelect(el)}
                            >
                              <i className={`fa ${el.icon}`}></i>
                              <span>{el.label}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* FORM MODE */}
            {selected && (
              <>
                <h2 className="modal-title">Configure: {selected.label}</h2>

                <div className="scroll-area form-section">
                  {renderForm()}
                </div>

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={closeModal}>Cancel</button>
                  <button className="add-btn" onClick={handleSubmit}>Add</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
