import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../services/aiService";
import "./styles/VoiceInput.css";

const MAX_RECORDING_MS = 60000;

export default function VoiceInput({
  onTranscribed,
  onError,
  label = "Describe your business by voice",
}) {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const releaseMedia = () => {
    clearInterval(timerRef.current);
    clearTimeout(timeoutRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(successTimeoutRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseMedia();
  }, []);

  const reportError = (message) => {
    releaseMedia();
    if (mountedRef.current) {
      setState("idle");
      onError?.(message);
    }
  };

  const startRecording = async () => {
    onError?.("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      reportError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => reportError("The microphone recording was interrupted.");
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || preferredType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        releaseMedia();
        if (!audioBlob.size) {
          reportError("No audio was captured. Check your microphone and try again.");
          return;
        }
        try {
          if (mountedRef.current) setState("transcribing");
          const response = await transcribeAudio(audioBlob);
          if (!mountedRef.current) return;
          onTranscribed(response.text.trim());
          setState("done");
          successTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setState("idle");
          }, 1400);
        } catch (error) {
          reportError(error.response?.data?.error || error.message || "The recording could not be transcribed.");
        }
      };

      recorder.start(500);
      setState("recording");
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORDING_MS);
    } catch (error) {
      reportError(error.name === "NotAllowedError"
        ? "Allow microphone access to describe your business by voice."
        : "The microphone could not be opened.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const recording = state === "recording";
  const busy = state === "transcribing";
  return (
    <div className={`voice-input voice-input--${state}`} role="status">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={busy}
        aria-label={recording ? "Stop voice recording" : label}
        aria-pressed={recording}
      >
        {busy ? <SpinnerIcon /> : recording ? <StopIcon /> : <MicrophoneIcon />}
      </button>
      <div>
        <strong>{recording ? `Listening · ${seconds}s` : busy ? "Whisper is transcribing…" : state === "done" ? "Voice added" : "Use your microphone"}</strong>
        <small>{recording ? "Speak naturally, then press stop." : busy ? "Your recording is processed securely." : "Describe what you do, your customers, and goals."}</small>
      </div>
      {recording && <span className="voice-input__wave" aria-hidden="true"><i /><i /><i /><i /></span>}
    </div>
  );
}

function MicrophoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" /></svg>;
}

function StopIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>;
}

function SpinnerIcon() {
  return <svg className="voice-input__spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>;
}
