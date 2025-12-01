import axios from "axios";

const PEXELS_API_KEY = process.env.REACT_APP_PEXELS_API_KEY;

export async function searchPexels(query) {
  try {
    const response = await axios.get(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    return response.data.photos || [];
  } catch (err) {
    console.error("❌ Pexels API failed:", err.response || err);
    return [];
  }
}
