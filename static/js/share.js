(function () {
  function slugTitle(idea) {
    const firstLine = (idea || "").split("\n")[0].replace(/\s+/g, " ").trim();
    if (!firstLine) return "Untitled idea";
    return firstLine.length > 80 ? firstLine.slice(0, 77).trim() + "..." : firstLine;
  }

  function downloadCanvas(targetEl, filename, onError) {
    if (!targetEl) return;
    if (!window.html2canvas) {
      onError("PNG export isn't available right now (couldn't load html2canvas). Check your connection and try again.");
      return;
    }
    window
      .html2canvas(targetEl, { backgroundColor: "#0b0f1a", scale: 2, useCORS: true })
      .then((canvas) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
      })
      .catch(() => {
        onError("Couldn't generate the image. Try again.");
      });
  }

  function setupIndexShare() {
    const resultsEl = document.getElementById("results");
    if (!resultsEl) return;

    const header = resultsEl.querySelector(".results-header");
    if (!header || document.getElementById("share-link-btn")) return;

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.id = "share-link-btn";
    shareBtn.className = "ghost";
    shareBtn.textContent = "Share link";

    const pngBtn = document.createElement("button");
    pngBtn.type = "button";
    pngBtn.id = "download-png-btn";
    pngBtn.className = "ghost";
    pngBtn.textContent = "Download PNG";

    header.appendChild(pngBtn);
    header.appendChild(shareBtn);

    const shareStatus = document.createElement("p");
    shareStatus.id = "share-status";
    shareStatus.className = "muted hidden";
    resultsEl.insertBefore(shareStatus, resultsEl.querySelector(".score-row"));

    function showStatus(text) {
      shareStatus.textContent = text;
      shareStatus.classList.remove("hidden");
    }

    pngBtn.addEventListener("click", () => {
      downloadCanvas(resultsEl, "second-opinion-result.png", showStatus);
    });

    shareBtn.addEventListener("click", async () => {
      const ideaInput = document.getElementById("idea");
      const lastResult = window.SecondOpinionLastResult;

      if (!lastResult) {
        showStatus("Analyze an idea first, then share it.");
        return;
      }

      shareBtn.disabled = true;
      showStatus("Creating link...");

      try {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: slugTitle(ideaInput ? ideaInput.value : ""),
            sections: lastResult.sections || {},
            scores: lastResult.scores || {},
            raw: lastResult.raw || "",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not create a share link.");
        }

        shareStatus.innerHTML = "";
        shareStatus.appendChild(document.createTextNode("Shareable link: "));

        const link = document.createElement("a");
        link.href = data.url;
        link.textContent = data.url;
        link.target = "_blank";
        link.rel = "noopener";
        shareStatus.appendChild(link);
        shareStatus.classList.remove("hidden");

        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(data.url);
            shareStatus.appendChild(document.createTextNode(" (copied to clipboard)"));
          } catch (_) {
            /* clipboard permission denied — link is still shown, so no need to alert */
          }
        }
      } catch (err) {
        showStatus(err.message || "Could not create a share link.");
      } finally {
        shareBtn.disabled = false;
      }
    });
  }

  function setupSharePagePng() {
    const btn = document.getElementById("download-png-btn");
    const card = document.getElementById("share-card");
    const errorEl = document.getElementById("share-error");
    if (!btn || !card || btn.dataset.wired) return;

    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      downloadCanvas(card, "second-opinion-shared.png", (message) => {
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.classList.remove("hidden");
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupIndexShare();
    setupSharePagePng();
  });
})();
