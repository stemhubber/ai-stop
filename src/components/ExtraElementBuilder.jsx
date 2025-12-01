import { motion } from "framer-motion";
import "./styles/ExtraElementBuilder.css";
import MapPicker from "./MapPicker";
import StreetViewPicker from "./StreetViewPicker";
import GalleryUploader from "./GalleryUploader";
import ProductManager from "./ProductManager";
import VideoUploader from "./VideoUploader";
import GoogleFormInput from "./GoogleFormInput";

export default function ExtraElementBuilder({ type, onClose, onInsert, siteId }) {
  const renderTool = () => {
    switch (type) {
      case "map": return <MapPicker onGenerated={onInsert} siteId={siteId}/>;
      case "street": return <StreetViewPicker onGenerated={onInsert} siteId={siteId}/>;
      case "gallery": return <GalleryUploader onGenerated={onInsert} siteId={siteId}/>;
      case "products": return <ProductManager onGenerated={onInsert} siteId={siteId}/>;
      case "video": return <VideoUploader onGenerated={onInsert} siteId={siteId}/>;
      case "gform": return <GoogleFormInput onGenerated={onInsert} siteId={siteId} />;
      default: return <p>Unknown Tool</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="builder2030-container"
    >
      {/* Header */}
      <div className="builder2030-header">
        <h2>Create {type.charAt(0).toUpperCase() + type.slice(1)} for {siteId}</h2>
        <button className="builder2030-close" onClick={onClose}>
          <i className="fa fa-times"></i>
        </button>
      </div>

      {/* Body */}
      <div className="builder2030-body">
        {renderTool()}
      </div>
    </motion.div>
  );
}
