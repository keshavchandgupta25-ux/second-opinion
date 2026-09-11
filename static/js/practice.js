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

    loadingEl.classList.remove("hidden");
    try {
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, seconds: elapsed || 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not get feedback.");
      }
      feedbackEl.textContent = data.feedback;
      resultsEl.classList.remove("hidden");
    } catch (err) {
      showError(err.message || "Could not get feedback.");
    } finally {
      loadingEl.classList.add("hidden");
    }
  }

  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
})();
