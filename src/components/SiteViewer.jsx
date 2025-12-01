import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { useEffect, useState } from "react";

export default function SiteViewer() {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "sites", siteId));
      setSite(snap.data());
    }
    load();
  }, [siteId]);

  if (!site) return <p>Loading...</p>;

  return (
    <div>
      {site.blocks.map((b, i) => (
        <div key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
      ))}
    </div>
  );
}
