$("mic").onclick = async () => {
  try {
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $("status").textContent =
        "Microphone is not supported in this browser.";
      return;
    }

    // Check secure connection
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
      $("status").textContent =
        "Microphone requires HTTPS. Open the Render HTTPS website.";
      return;
    }

    $("status").textContent = "Requesting microphone permission…";

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    chunks = [];

    let mimeType = "audio/webm";

    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    }

    recording = new MediaRecorder(stream, {
      mimeType: mimeType
    });

    recording.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recording.onerror = (event) => {
      console.error("Recorder error:", event);
      $("status").textContent = "Recording error. Please try again.";
    };

    recording.onstop = () => {
      recordedAudio = new Blob(chunks, {
        type: mimeType
      });

      if (recordedAudio.size > 0) {
        const url = URL.createObjectURL(recordedAudio);

        $("audio").src = url;
        $("audio").hidden = false;

        $("status").textContent =
          "✅ Voice recorded successfully!";
      } else {
        $("status").textContent =
          "No audio was recorded.";
      }

      stream.getTracks().forEach(track => track.stop());

      recording = null;
      chunks = [];

      $("mic").disabled = false;
      $("stopMic").disabled = true;
    };

    recording.start(250);

    $("mic").disabled = true;
    $("stopMic").disabled = false;

    $("status").textContent =
      "🔴 Recording… Speak now.";
      
  } catch (error) {
    console.error("Microphone error:", error);

    $("mic").disabled = false;
    $("stopMic").disabled = true;

    if (error.name === "NotAllowedError") {
      $("status").textContent =
        "❌ Microphone blocked. Allow Microphone in Chrome site permissions, then reload.";
    } else if (error.name === "NotFoundError") {
      $("status").textContent =
        "❌ No microphone was found on this device.";
    } else if (error.name === "NotReadableError") {
      $("status").textContent =
        "❌ Microphone is being used by another app.";
    } else if (error.name === "SecurityError") {
      $("status").textContent =
        "❌ Browser security blocked microphone access.";
    } else {
      $("status").textContent =
        "❌ Microphone error: " + error.name;
    }
  }
};


$("stopMic").onclick = () => {
  if (recording && recording.state !== "inactive") {
    $("status").textContent = "Finishing recording…";
    recording.stop();
  }
};
