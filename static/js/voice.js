(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  window.SecondOpinionVoice = {
    listen(onText, onStatus, onError) {
      if (!SpeechRecognition) {
        onError("Voice input needs Chrome or Edge on this machine.");
        return null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => onStatus("Listening... speak your idea.");
      recognition.onerror = (event) => {
        if (event.error !== "aborted") {
          onError("Mic error: " + event.error);
        }
      };
      recognition.onend = () => onStatus("");
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript + " ";
        }
        onText(text.trim());
      };

      recognition.start();
      return recognition;
    },

    speak(text) {
      window.speechSynthesis.cancel();
      if (!text) {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    },

    stopSpeaking() {
      window.speechSynthesis.cancel();
    },
  };
})();
