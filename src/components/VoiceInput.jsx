import { useRef, useState } from "react";
import { transcribeAudio } from "../services/aiService";
import "./styles/VoiceInput.css";

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

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          setLoading(true);
          const response = await transcribeAudio(audioBlob);
          onTranscribed(response.text);
        } catch (error) {
          console.error("Transcription failed:", error.message);
          window.alert("The recording could not be transcribed.");
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Microphone permission denied:", error.message);
      window.alert("Microphone permission is required.");
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      className="voice-btn"
      disabled={loading}
      aria-label={recording ? "Stop recording" : "Describe the website by voice"}
    >
      {loading ? (
        <i className="fa fa-spinner fa-spin" />
      ) : recording ? (
        <i className="fa fa-microphone" style={{ color: "red" }} />
      ) : (
        <i className="fa fa-microphone-slash" />
      )}
    </button>
  );
}
