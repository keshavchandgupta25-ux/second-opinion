(function () {
  const ideaInput = document.getElementById("idea");
  const analyzeBtn = document.getElementById("analyze-btn");
  const micBtn = document.getElementById("mic-btn");
  const speakBtn = document.getElementById("speak-btn");
  const charCount = document.getElementById("char-count");
  const errorEl = document.getElementById("error");
  const resultsEl = document.getElementById("results");
  const loadingEl = document.getElementById("loading");
  const micStatus = document.getElementById("mic-status");

  const sectionLabels = {
    assumptions: "Assumptions",
    riskiest: "Riskiest Assumption",
    question: "Tough Question",
    patch: "How to Patch It",
  };

  let recognition = null;
  let lastSpokenText = "";

  function stripHeader(text, label) {
    const pattern = new RegExp("^(?:\\d+\\.\\s*)?" + label + "\\s*:?\\s*", "i");
    return text.replace(pattern, "").trim();
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderMarkdownish(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  ideaInput.addEventListener("input", () => {
    charCount.textContent = ideaInput.value.length + " / 5000";
  });

  micBtn.addEventListener("click", () => {
    if (recognition) {
      recognition.stop();
      recognition = null;
      micBtn.textContent = "Mic";
      return;
    }

    recognition = window.SecondOpinionVoice.listen(
      (text) => {
        ideaInput.value = text;
        charCount.textContent = ideaInput.value.length + " / 5000";
      },
      (status) => {
        micStatus.textContent = status;
        micStatus.classList.toggle("hidden", !status);
      },
      (message) => {
        showError(message);
        recognition = null;
        micBtn.textContent = "Mic";
      }
    );

    if (recognition) {
      micBtn.textContent = "Stop mic";
    }
  });

  speakBtn.addEventListener("click", () => {
    window.SecondOpinionVoice.speak(lastSpokenText);
  });

  analyzeBtn.addEventListener("click", async () => {
    const idea = ideaInput.value.trim();
    errorEl.classList.add("hidden");
    resultsEl.classList.add("hidden");
    window.SecondOpinionVoice.stopSpeaking();

    if (!idea) {
      showError("Describe your idea first.");
      return;
    }

    analyzeBtn.disabled = true;
    loadingEl.classList.remove("hidden");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      const sections = data.sections || {};
      const scores = data.scores || {};

      document.getElementById("pitch-score").textContent =
        scores.pitch_readiness == null ? "—" : scores.pitch_readiness + " / 10";
      document.getElementById("win-score").textContent =
        scores.win_probability == null ? "—" : scores.win_probability + "%";
      document.getElementById("pitch-reason").textContent = scores.pitch_reason || "";
      document.getElementById("win-reason").textContent = scores.win_reason || "";

      const spokenParts = [];

      if (sections.raw) {
        document.querySelector('[data-section="assumptions"] .card-body').innerHTML =
          renderMarkdownish(sections.raw);
        document.querySelector('[data-section="riskiest"]').classList.add("hidden");
        document.querySelector('[data-section="question"]').classList.add("hidden");
        document.querySelector('[data-section="patch"]').classList.add("hidden");
        spokenParts.push(sections.raw);
      } else {
        for (const [key, label] of Object.entries(sectionLabels)) {
          const card = document.querySelector('[data-section="' + key + '"]');
          card.classList.remove("hidden");
          const content = stripHeader(sections[key] || "", label);
          card.querySelector(".card-body").innerHTML = content
            ? renderMarkdownish(content)
            : "<em>No content returned.</em>";
          if (content) {
            spokenParts.push(label + ". " + content);
          }
        }
      }

      lastSpokenText = [
        scores.pitch_readiness == null ? "" : "Pitch readiness " + scores.pitch_readiness + " out of 10. " + (scores.pitch_reason || ""),
        scores.win_probability == null ? "" : "Win probability " + scores.win_probability + " percent. " + (scores.win_reason || ""),
      ].concat(spokenParts).filter(Boolean).join(" ");

      resultsEl.classList.remove("hidden");
      resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showError(err.message || "Something went wrong.");
    } finally {
      analyzeBtn.disabled = false;
      loadingEl.classList.add("hidden");
    }
  });
})();