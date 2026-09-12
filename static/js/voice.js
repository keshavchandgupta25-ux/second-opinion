(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  window.SecondOpinionVoice = {
    listen: function (onText, onStatus, onError) {
      if (!SpeechRecognition) {
        onError("Voice input needs Chrome or Edge.");
        return null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onstart = function () {
        onStatus("Listening... speak your idea.");
      };
      recognition.onerror = function (event) {
        if (event.error !== "aborted") {
          onError("Mic error: " + event.error);
        }
      };
      recognition.onend = function () {
        onStatus("");
      };
      recognition.onresult = function (event) {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript + " ";
        }
        onText(text.trim());
      };
      recognition.start();
      return recognition;
    },

    speak: function (text) {
      if (!window.speechSynthesis) {
        return;
      }
      window.speechSynthesis.cancel();
      if (!text) {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    },

    stopSpeaking: function () {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
  };
})();
