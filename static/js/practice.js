(function () {
  const camera = document.getElementById("camera");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("practice-status");
  const errorEl = document.getElementById("practice-error");
  const transcriptEl = document.getElementById("transcript");
  const resultsEl = document.getElementById("practice-results");
  const feedbackEl = document.getElementById("practice-feedback");
  const loadingEl = document.getElementById("practice-loading");
  const deliveryScoreEl = document.getElementById("delivery-score");
  const deliveryReasonEl = document.getElementById("delivery-reason");

  const modeLiveBtn = document.getElementById("mode-live-btn");
  const modeUploadBtn = document.getElementById("mode-upload-btn");
  const livePanel = document.getElementById("live-panel");
  const uploadPanel = document.getElementById("upload-panel");
  const videoUploadInput = document.getElementById("video-upload");
  const uploadedVideo = document.getElementById("uploaded-video");
  const uploadStatusEl = document.getElementById("upload-status");
  const autoTranscribeBtn = document.getElementById("auto-transcribe-btn");
  const uploadFeedbackBtn = document.getElementById("upload-feedback-btn");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let stream = null;
  let recognition = null;
  let startedAt = 0;
  let tickId = 0;
  let elapsed = 0;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.toggle("hidden", !message);
  }

  function formatTime(total) {
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    camera.srcObject = null;
  }

  function stopRecognition() {
    if (recognition) {
      recognition.onend = null;
      recognition.stop();
      recognition = null;
    }
  }

  function updateTimer() {
    elapsed = Math.min(60, Math.floor((Date.now() - startedAt) / 1000));
    timerEl.textContent = formatTime(elapsed) + " / 1:00";
    if (elapsed >= 60) {
      stopRecording(true);
    }
  }

  async function startRecording() {
    showError("");
    resultsEl.classList.add("hidden");
    transcriptEl.value = "";

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      camera.srcObject = stream;
    } catch (err) {
      showError("Could not access the webcam or microphone. Check browser permissions.");
      return;
    }

    if (!SpeechRecognition) {
      showError("Live transcript needs Chrome or Edge. You can still see yourself on camera.");
    } else {
      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript + " ";
        }
        transcriptEl.value = text.trim();
      };
      recognition.onerror = (event) => {
        if (event.error !== "aborted") {
          showError("Speech recognition error: " + event.error);
        }
      };
      recognition.start();
    }

    startedAt = Date.now();
    elapsed = 0;
    tickId = window.setInterval(updateTimer, 250);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = "Recording... speak clearly.";
  }

  async function submitForFeedback(transcript, secondsValue) {
    if (!transcript) {
      showError("No transcript to send yet — record, type, or auto-transcribe first.");
      return;
    }

    showError("");
    loadingEl.classList.remove("hidden");
    try {
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, seconds: secondsValue || 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not get feedback.");
      }
      feedbackEl.textContent = data.feedback;
      deliveryScoreEl.textContent =
        data.delivery_score == null ? "—" : data.delivery_score + " / 10";
      deliveryReasonEl.textContent = data.delivery_reason || "";
      resultsEl.classList.remove("hidden");
    } catch (err) {
      showError(err.message || "Could not get feedback.");
    } finally {
      loadingEl.classList.add("hidden");
    }
  }

  async function stopRecording() {
    window.clearInterval(tickId);
    stopRecognition();
    stopTracks();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusEl.textContent = "Recording stopped.";
    updateTimer();

    const transcript = transcriptEl.value.trim();
    if (!transcript) {
      showError("No speech was captured. Try Chrome/Edge and speak closer to the mic.");
      return;
    }

    await submitForFeedback(transcript, elapsed || 1);
  }

  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);

  // --- Upload-video mode (additive; does not touch the live-recording flow above) ---

  function setActiveMode(mode) {
    const isLive = mode === "live";
    livePanel.classList.toggle("hidden", !isLive);
    uploadPanel.classList.toggle("hidden", isLive);
    modeLiveBtn.classList.toggle("ghost", !isLive);
    modeUploadBtn.classList.toggle("ghost", isLive);
    showError("");
  }

  if (modeLiveBtn && modeUploadBtn) {
    modeLiveBtn.addEventListener("click", () => setActiveMode("live"));
    modeUploadBtn.addEventListener("click", () => setActiveMode("upload"));
  }

  let uploadedObjectUrl = null;
  let uploadRecognition = null;
  let uploadDurationSeconds = 0;

  function stopUploadRecognition() {
    if (uploadRecognition) {
      uploadRecognition.onend = null;
      uploadRecognition.stop();
      uploadRecognition = null;
    }
  }

  if (videoUploadInput) {
    videoUploadInput.addEventListener("change", () => {
      const file = videoUploadInput.files && videoUploadInput.files[0];
      showError("");
      transcriptEl.value = "";
      resultsEl.classList.add("hidden");
      stopUploadRecognition();

      if (!file) {
        return;
      }

      if (uploadedObjectUrl) {
        URL.revokeObjectURL(uploadedObjectUrl);
      }
      uploadedObjectUrl = URL.createObjectURL(file);
      uploadedVideo.src = uploadedObjectUrl;
      uploadedVideo.load();
      uploadStatusEl.textContent = "Video loaded. Play it, or use auto-transcribe below.";
    });

    uploadedVideo.addEventListener("loadedmetadata", () => {
      const duration = Math.round(uploadedVideo.duration) || 1;
      uploadDurationSeconds = Math.max(1, Math.min(180, duration));
    });
  }

  if (autoTranscribeBtn) {
    autoTranscribeBtn.addEventListener("click", () => {
      if (!uploadedVideo.src) {
        showError("Upload a video first.");
        return;
      }
      if (!SpeechRecognition) {
        showError("Auto-transcribe needs Chrome or Edge. You can still type the transcript by hand.");
        return;
      }

      stopUploadRecognition();
      transcriptEl.value = "";
      uploadStatusEl.textContent =
        "Listening through your microphone as the video plays — turn the volume up and keep it quiet around you.";

      uploadRecognition = new SpeechRecognition();
      uploadRecognition.lang = "en-US";
      uploadRecognition.interimResults = true;
      uploadRecognition.continuous = true;
      uploadRecognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript + " ";
        }
        transcriptEl.value = text.trim();
      };
      uploadRecognition.onerror = (event) => {
        if (event.error !== "aborted") {
          showError("Speech recognition error: " + event.error);
        }
      };
      uploadRecognition.onend = () => {
        uploadStatusEl.textContent = "Auto-transcribe stopped. Edit the transcript if needed, then Get Feedback.";
      };

      uploadedVideo.currentTime = 0;
      uploadedVideo.muted = false;
      uploadedVideo.play().catch(() => {
        showError("Couldn't autoplay the video — press play on it yourself, then try auto-transcribe again.");
      });
      uploadRecognition.start();

      uploadedVideo.onended = () => {
        stopUploadRecognition();
      };
    });
  }

  if (uploadFeedbackBtn) {
    uploadFeedbackBtn.addEventListener("click", async () => {
      stopUploadRecognition();
      const transcript = transcriptEl.value.trim();
      const seconds = uploadDurationSeconds || 30;
      await submitForFeedback(transcript, seconds);
    });
  }
})();
