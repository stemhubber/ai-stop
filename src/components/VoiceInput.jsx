import { useState, useRef } from "react";
import axios from "axios";
import './styles/VoiceInput.css';

export default function VoiceInput({ onTranscribed }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic permission denied:", err);
      alert("Microphone permission is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendToWhisper = async (audioBlob) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");

      // 🔥 USE YOUR AI CONTROLLER ENDPOINT
      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            "Authorization": `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const text = response.data.text;
      onTranscribed(text); // send text back to parent
    } catch (err) {
      console.error("Whisper error:", err);
      alert("Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      className="voice-btn"
      disabled={loading}
    >
      {loading ? (
        <i className="fa fa-spinner fa-spin"></i>
      ) : recording ? (
        <i className="fa fa-microphone" style={{ color: "red" }}></i>
      ) : (
        <i className="fa fa-microphone-slash"></i>
      )}
    </button>
  );
}
