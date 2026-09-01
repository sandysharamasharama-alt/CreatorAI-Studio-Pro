const $ = id => document.getElementById(id);

/* =====================================================
   CREATORAI STUDIO PRO
   Automatic AI Script + AI Voice + Video
===================================================== */

let project = {
  title: "",
  format: "reel",
  aspectRatio: "9:16",
  scenes: [],
  voiceScript: "",
  voiceUrl: "",
  videoUrl: ""
};

let index = 0;
let generatedVoiceBlob = null;

let recording = null;
let chunks = [];

const canvas = $("canvas");
const ctx = canvas
  ? canvas.getContext("2d")
  : null;

/* =====================================================
   CANVAS
===================================================== */

function resize() {
  if (!canvas) return;

  if (project.aspectRatio === "16:9") {
    canvas.width = 1280;
    canvas.height = 720;
  } else {
    canvas.width = 720;
    canvas.height = 1280;
  }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  if (!ctx) return;

  const words =
    String(text || "").split(/\s+/);

  let line = "";

  for (const word of words) {
    const test =
      line ? line + " " + word : word;

    if (
      ctx.measureText(test).width >
        maxWidth &&
      line
    ) {
      ctx.fillText(line, x, y);

      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(line, x, y);
  }
}

/* =====================================================
   DRAW VIDEO SCENE
===================================================== */

function draw() {
  if (!canvas || !ctx) return;

  resize();

  const scene =
    project.scenes[index] || {
      headline: "Create your first video",
      body:
        "Enter a topic and let CreatorAI create the video."
    };

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );

  gradient.addColorStop(
    0,
    "#071a2a"
  );

  gradient.addColorStop(
    0.55,
    "#07111f"
  );

  gradient.addColorStop(
    1,
    "#03050a"
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  /* Grid */

  ctx.strokeStyle =
    "#123b4a";

  ctx.globalAlpha = 0.35;

  for (
    let x = 0;
    x < canvas.width;
    x += 80
  ) {
    ctx.beginPath();

    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);

    ctx.stroke();
  }

  for (
    let y = 0;
    y < canvas.height;
    y += 80
  ) {
    ctx.beginPath();

    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);

    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  /* CreatorAI label */

  ctx.fillStyle =
    "#28d5f5";

  if (ctx.roundRect) {
    ctx.beginPath();

    ctx.roundRect(
      45,
      45,
      300,
      58,
      29
    );

    ctx.fill();
  } else {
    ctx.fillRect(
      45,
      45,
      300,
      58
    );
  }

  ctx.fillStyle = "#001018";

  ctx.font =
    "800 23px system-ui";

  ctx.fillText(
    "CREATORAI • AI VIDEO",
    68,
    82
  );

  /* Headline */

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    `800 ${Math.round(
      canvas.width * 0.065
    )}px system-ui`;

  wrapText(
    scene.headline,
    70,
    canvas.height * 0.40,
    canvas.width - 140,
    Math.round(
      canvas.width * 0.065
    ) * 1.15
  );

  /* Body */

  ctx.fillStyle =
    "#b8c2d5";

  ctx.font =
    `500 ${Math.round(
      canvas.width * 0.028
    )}px system-ui`;

  wrapText(
    scene.body,
    70,
    canvas.height * 0.67,
    canvas.width - 140,
    Math.round(
      canvas.width * 0.028
    ) * 1.5
  );

  /* Bottom bar */

  ctx.fillStyle =
    "#28d5f5";

  ctx.fillRect(
    70,
    canvas.height - 80,
    canvas.width - 140,
    6
  );

  ctx.fillStyle =
    "#d7dbea";

  ctx.font =
    "600 18px system-ui";

  ctx.fillText(
    "FOLLOW • SAVE • SHARE",
    70,
    canvas.height - 105
  );

  if ($("sceneNum")) {
    $("sceneNum").textContent =
      `Scene ${index + 1} / ${
        project.scenes.length || 1
      }`;
  }
}

/* =====================================================
   ESCAPE HTML
===================================================== */

function esc(value) {
  return String(value || "")
    .replace(
      /[&<>"']/g,
      char =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]
    );
}

/* =====================================================
   RENDER
===================================================== */

function render() {
  if ($("scenes")) {
    $("scenes").innerHTML =
      project.scenes
        .map(
          (scene, i) =>
            `
            <div
              class="scene ${
                i === index
                  ? "active"
                  : ""
              }"
              data-i="${i}"
              style="cursor:pointer"
            >
              <b>
                ${i + 1}.
                ${esc(scene.headline)}
              </b>

              <small>
                ${scene.duration || 4}s
              </small>
            </div>
            `
        )
        .join("");

    document
      .querySelectorAll(".scene")
      .forEach(element => {
        element.onclick = () => {
          index =
            Number(
              element.dataset.i
            );

          render();
        };
      });
  }

  draw();
}

/* =====================================================
   STATUS
===================================================== */

function status(message) {
  if ($("status")) {
    $("status").textContent =
      message;
  }
}

/* =====================================================
   AI PLAN
===================================================== */

async function createAIPlan(prompt, format) {
  const response =
    await fetch(
      "/api/ai/plan",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          prompt,
          format
        })
      }
    );

  if (!response.ok) {
    throw new Error(
      "AI planning failed: " +
        response.status
    );
  }

  return await response.json();
}

/* =====================================================
   AI VOICE
===================================================== */

async function createAIVoice(text) {
  const response =
    await fetch(
      "/api/ai/voice",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          text,
          voice:
            "en-US-AndrewMultilingualNeural"
        })
      }
    );

  if (!response.ok) {
    throw new Error(
      "AI voice failed: " +
        response.status
    );
  }

  return await response.json();
}

/* =====================================================
   COMPLETE AUTOMATIC VIDEO
===================================================== */

async function generateCompleteVideo() {
  const prompt =
    $("prompt")?.value?.trim();

  const format =
    $("format")?.value ||
    "reel";

  if (!prompt) {
    status(
      "❌ ਪਹਿਲਾਂ topic/prompt ਲਿਖੋ।"
    );

    return;
  }

  try {
    status(
      "🧠 AI script ਬਣਾ ਰਿਹਾ ਹੈ..."
    );

    /* 1. AI script */

    const plan =
      await createAIPlan(
        prompt,
        format
      );

    project = {
      ...plan,
      format,
      scenes:
        Array.isArray(
          plan.scenes
        )
          ? plan.scenes
          : [],
      voiceScript:
        plan.voiceScript || ""
    };

    index = 0;

    render();

    /* 2. AI voice */

    status(
      "🗣️ AI voice ਬਣ ਰਹੀ ਹੈ..."
    );

    const voice =
      await createAIVoice(
        project.voiceScript
      );

    project.voiceUrl =
      voice.url || "";

    /* 3. Get voice file */

    if (voice.url) {
      try {
        const audioResponse =
          await fetch(
            voice.url
          );

        if (audioResponse.ok) {
          generatedVoiceBlob =
            await audioResponse.blob();

          if ($("audio")) {
            $("audio").src =
              URL.createObjectURL(
                generatedVoiceBlob
              );

            $("audio").hidden =
              false;
          }
        }
      } catch (error) {
        console.warn(
          "Voice preview failed:",
          error
        );
      }
    }

    /* 4. Ask server to create video */

    status(
      "🎬 AI video ਬਣ ਰਹੀ ਹੈ..."
    );

    const videoResponse =
      await fetch(
        "/api/ai/video",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt,
            format
          })
        }
      );

    if (!videoResponse.ok) {
      throw new Error(
        "Automatic video failed: " +
          videoResponse.status
      );
    }

    const videoData =
      await videoResponse.json();

    project.title =
      videoData.title ||
      project.title;

    project.scenes =
      videoData.scenes ||
      project.scenes;

    project.voiceScript =
      videoData.voiceScript ||
      project.voiceScript;

    project.videoUrl =
      videoData.videoUrl ||
      "";

    project.voiceUrl =
      videoData.voiceUrl ||
      project.voiceUrl;

    render();

    /* 5. Show generated video */

    showGeneratedVideo(
      project.videoUrl
    );

    status(
      "✅ Video ਤਿਆਰ ਹੈ! AI ਨੇ script, voice ਅਤੇ video ਆਪਣੇ ਆਪ ਬਣਾਈ।"
    );

  } catch (error) {
    console.error(
      "COMPLETE VIDEO ERROR:",
      error
    );

    status(
      "❌ Video generation failed: " +
        (error.message ||
          "Unknown error")
    );
  }
}

/* =====================================================
   SHOW GENERATED VIDEO
===================================================== */

function showGeneratedVideo(url) {
  if (!url) return;

  let video =
    $("generatedVideo");

  if (!video) {
    video =
      document.createElement(
        "video"
      );

    video.id =
      "generatedVideo";

    video.controls =
      true;

    video.playsInline =
      true;

    video.style.width =
      "100%";

    video.style.maxHeight =
      "650px";

    video.style.borderRadius =
      "18px";

    video.style.marginTop =
      "20px";

    const parent =
      canvas?.parentElement ||
      document.body;

    parent.appendChild(
      video
    );
  }

  video.src = url;

  video.style.display =
    "block";

  video.load();
}

/* =====================================================
   GENERATE BUTTON
===================================================== */

if ($("generate")) {
  $("generate").onclick =
    async () => {

      const prompt =
        $("prompt")?.value?.trim();

      if (!prompt) {
        status(
          "Write a topic first."
        );

        return;
      }

      /*
        Instead of the old
        fake 4-scene generator,
        run the complete AI system.
      */

      await generateCompleteVideo();
    };
}

/* =====================================================
   AUTO VIDEO BUTTON
===================================================== */

function createAutoVideoButton() {
  if ($("autoVideo")) {
    return;
  }

  const generate =
    $("generate");

  if (!generate) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "autoVideo";

  button.type =
    "button";

  button.textContent =
    "🎬 Generate Complete AI Video";

  button.style.marginLeft =
    "10px";

  button.onclick =
    generateCompleteVideo;

  generate.parentElement
    ?.appendChild(button);
}

/* =====================================================
   PREVIOUS / NEXT
===================================================== */

if ($("prev")) {
  $("prev").onclick =
    () => {
      if (
        !project.scenes.length
      ) return;

      index =
        (index -
          1 +
          project.scenes.length) %
        project.scenes.length;

      render();
    };
}

if ($("next")) {
  $("next").onclick =
    () => {
      if (
        !project.scenes.length
      ) return;

      index =
        (index + 1) %
        project.scenes.length;

      render();
    };
}

/* =====================================================
   PLAY GENERATED VIDEO
===================================================== */

function downloadVideo() {
  if (!project.videoUrl) {
    status(
      "❌ ਪਹਿਲਾਂ video generate ਕਰੋ।"
    );

    return;
  }

  const link =
    document.createElement(
      "a"
    );

  link.href =
    project.videoUrl;

  link.download =
    "creatorai-video.mp4";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();
}

function createDownloadButton() {
  if (
    $("downloadGenerated")
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "downloadGenerated";

  button.textContent =
    "📥 Download AI Video";

  button.style.marginTop =
    "12px";

  button.onclick =
    downloadVideo;

  const video =
    $("generatedVideo");

  if (video) {
    video.parentElement
      ?.appendChild(button);
  }
}

/* =====================================================
   CANVAS VIDEO RECORDING
===================================================== */

async function recordCanvasVideo() {
  if (!canvas) {
    throw new Error(
      "Canvas not found."
    );
  }

  if (
    !project.scenes.length
  ) {
    throw new Error(
      "No scenes available."
    );
  }

  draw();

  const stream =
    canvas.captureStream(30);

  let audioContext = null;
  let source = null;
  let audioElement = null;

  /*
    Use AI generated voice.
  */

  if (project.voiceUrl) {
    try {
      audioElement =
        new Audio();

      audioElement.src =
        project.voiceUrl;

      audioElement.crossOrigin =
        "anonymous";

      await audioElement
        .play()
        .catch(() => {});

      audioContext =
        new AudioContext();

      source =
        audioContext
          .createMediaElementSource(
            audioElement
          );

      const destination =
        audioContext
          .createMediaStreamDestination();

      source.connect(
        destination
      );

      source.connect(
        audioContext.destination
      );

      destination.stream
        .getAudioTracks()
        .forEach(track => {
          stream.addTrack(
            track
          );
        });

    } catch (error) {
      console.warn(
        "Could not attach AI voice:",
        error
      );
    }
  }

  let mime =
    "video/webm";

  if (
    MediaRecorder.isTypeSupported(
      "video/webm;codecs=vp9,opus"
    )
  ) {
    mime =
      "video/webm;codecs=vp9,opus";
  }

  const recorder =
    new MediaRecorder(
      stream,
      {
        mimeType: mime
      }
    );

  const output = [];

  recorder.ondataavailable =
    event => {
      if (
        event.data &&
        event.data.size
      ) {
        output.push(
          event.data
        );
      }
    };

  const finished =
    new Promise(resolve => {
      recorder.onstop =
        () => {
          resolve(
            new Blob(
              output,
              {
                type: mime
              }
            )
          );
        };
    });

  recorder.start(250);

  for (
    let i = 0;
    i < project.scenes.length;
    i++
  ) {
    index = i;

    render();

    const duration =
      Number(
        project.scenes[i]
          .duration
      ) || 4;

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          duration * 1000
        )
    );
  }

  recorder.stop();

  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
  }

  return finished;
}

/* =====================================================
   WEBM EXPORT
===================================================== */

if ($("export")) {
  $("export").onclick =
    async () => {

      if (
        !project.scenes.length
      ) {
        status(
          "Generate a project first."
        );

        return;
      }

      try {
        status(
          "🎬 Rendering video..."
        );

        const blob =
          await recordCanvasVideo();

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          "creatorai-video.webm";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        status(
          "✅ WebM video exported."
        );

      } catch (error) {
        console.error(error);

        status(
          "❌ Export failed."
        );
      }
    };
}

/* =====================================================
   MP4 EXPORT
===================================================== */

if ($("mp4")) {
  $("mp4").onclick =
    async () => {

      if (
        !project.scenes.length
      ) {
        status(
          "Generate a project first."
        );

        return;
      }

      try {
        status(
          "🎬 Rendering and converting to MP4..."
        );

        const blob =
          await recordCanvasVideo();

        const form =
          new FormData();

        form.append(
          "video",
          blob,
          "creatorai-video.webm"
        );

        const response =
          await fetch(
            "/api/convert/mp4",
            {
              method: "POST",
              body: form
            }
          );

        if (!response.ok) {
          throw new Error(
            "MP4 conversion failed."
          );
        }

        const mp4 =
          await response.blob();

        const url =
          URL.createObjectURL(
            mp4
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          "creatorai-video.mp4";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        status(
          "✅ MP4 exported successfully."
        );

      } catch (error) {
        console.error(error);

        status(
          "❌ MP4 export failed: " +
            error.message
        );
      }
    };
}

/* =====================================================
   SAVE PROJECT
===================================================== */

if ($("save")) {
  $("save").onclick =
    () => {

      const blob =
        new Blob(
          [
            JSON.stringify(
              project,
              null,
              2
            )
          ],
          {
            type:
              "application/json"
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        "creatorai-project.json";

      link.click();

      URL.revokeObjectURL(
        url
      );
    };
}

/* =====================================================
   LOAD PROJECT
===================================================== */

if ($("load")) {
  $("load").onchange =
    async event => {

      try {
        const file =
          event.target.files[0];

        if (!file) return;

        project =
          JSON.parse(
            await file.text()
          );

        index = 0;

        render();

        status(
          "✅ Project loaded."
        );

      } catch (error) {
        console.error(error);

        status(
          "❌ Invalid project file."
        );
      }
    };
}

/* =====================================================
   PWA
===================================================== */

let deferredInstall = null;

window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredInstall =
      event;

    if ($("installBtn")) {
      $("installBtn").hidden =
        false;
    }
  }
);

if ($("installBtn")) {
  $("installBtn").onclick =
    async () => {

      if (
        !deferredInstall
      ) {
        return;
      }

      deferredInstall.prompt();

      deferredInstall = null;
    };
}

/* =====================================================
   SERVICE WORKER
===================================================== */

if (
  "serviceWorker" in
  navigator
) {
  navigator.serviceWorker
    .register(
      "/sw.js"
    )
    .catch(
      error =>
        console.warn(
          "Service worker:",
          error
        )
    );
}

/* =====================================================
   START
===================================================== */

render();

createAutoVideoButton();

setTimeout(
  createDownloadButton,
  1000
);
