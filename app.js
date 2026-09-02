const $ = id =>
  document.getElementById(id);

let project = {
  title: "",
  format: "reel",
  aspectRatio: "9:16",
  scenes: [],
  voiceScript: "",
  voiceUrl: "",
  videoUrl: "",
  musicUrl: "",
  voice: "",
  voiceSpeed: 1,
  duration: 0
};

let index = 0;

let recording = null;
let chunks = [];

let generatedVoiceBlob = null;
let generatedVoiceUrl = "";

const canvas = $("canvas");

const ctx =
  canvas?.getContext("2d");

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
   FORMAT
===================================================== */

function updateFormat() {
  const format =
    $("format")?.value ||
    "reel";

  project.format =
    format;

  project.aspectRatio =
    format === "youtube" ||
    format === "long"
      ? "16:9"
      : "9:16";

  draw();
}

/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {
  if (!canvas) {
    return;
  }

  if (
    project.aspectRatio ===
    "16:9"
  ) {
    canvas.width = 1280;
    canvas.height = 720;
  } else {
    canvas.width = 720;
    canvas.height = 1280;
  }
}

/* =====================================================
   TEXT WRAP
===================================================== */

function wrapText(
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {
  if (!ctx) {
    return;
  }

  const words =
    String(text || "")
      .split(/\s+/);

  let line = "";
  let currentY = y;

  for (
    const word of words
  ) {
    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      ctx.measureText(test)
        .width > maxWidth &&
      line
    ) {
      ctx.fillText(
        line,
        x,
        currentY
      );

      line = word;

      currentY +=
        lineHeight;

    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(
      line,
      x,
      currentY
    );
  }
}

/* =====================================================
   DRAW SCENE
===================================================== */

function draw() {
  if (!canvas || !ctx) {
    return;
  }

  resizeCanvas();

  const scene =
    project.scenes[index] || {
      headline:
        "Create your first video",

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
    0.6,
    "#07111f"
  );

  gradient.addColorStop(
    1,
    "#03050a"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  /* Grid */

  ctx.strokeStyle =
    "#123b4a";

  ctx.globalAlpha =
    0.35;

  for (
    let x = 0;
    x < canvas.width;
    x += 80
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x,
      canvas.height
    );

    ctx.stroke();
  }

  for (
    let y = 0;
    y < canvas.height;
    y += 80
  ) {
    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      canvas.width,
      y
    );

    ctx.stroke();
  }

  ctx.globalAlpha =
    1;

  /* CreatorAI label */

  ctx.fillStyle =
    "#28d5f5";

  ctx.fillRect(
    45,
    45,
    300,
    58
  );

  ctx.fillStyle =
    "#001018";

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
    canvas.height * 0.4,
    canvas.width - 140,
    Math.round(
      canvas.width *
        0.075
    )
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
      canvas.width *
        0.042
    )
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
      `Scene ${
        project.scenes.length
          ? index + 1
          : 0
      } / ${
        project.scenes.length
      }`;
  }
}

/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {
  return String(
    value || ""
  ).replace(
    /[&<>"']/g,
    char =>
      ({
        "&":
          "&amp;",
        "<":
          "&lt;",
        ">":
          "&gt;",
        '"':
          "&quot;",
        "'":
          "&#39;"
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
                ${escapeHTML(
                  scene.headline
                )}
              </b>

              <small>
                ${
                  scene.duration ||
                  4
                }s
              </small>
            </div>
            `
        )
        .join("");

    document
      .querySelectorAll(
        ".scene"
      )
      .forEach(
        element => {
          element.onclick =
            () => {
              index =
                Number(
                  element.dataset.i
                );

              render();
            };
        }
      );
  }

  draw();
}

/* =====================================================
   SAFE JSON FETCH
===================================================== */

async function jsonFetch(
  url,
  options
) {
  const response =
    await fetch(
      url,
      options
    );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `Server error ${response.status}`
    );
  }

  return data;
}

/* =====================================================
   AI PLAN
===================================================== */

async function createAIPlan(
  prompt,
  format
) {
  return jsonFetch(
    "/api/ai/plan",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          prompt,
          format
        })
    }
  );
}

/* =====================================================
   AI VOICE
===================================================== */

async function createAIVoice(
  text
) {
  const voice =
    $("aiVoice")?.value ||
    "en-US-AndrewMultilingualNeural";

  const speed =
    Number(
      $("voiceSpeed")?.value ||
      1
    );

  const data =
    await jsonFetch(
      "/api/ai/voice",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            text,
            voice,
            speed
          })
      }
    );

  Object.assign(
    project,
    {
      voice,
      voiceSpeed:
        speed,
      voiceScript:
        text,
      voiceUrl:
        data.url
    }
  );

  generatedVoiceUrl =
    data.url;

  if ($("audio")) {
    $("audio").src =
      data.url;

    $("audio").hidden =
      false;

    $("audio").load();
  }

  return data;
}

/* =====================================================
   GENERATE VOICE BUTTON
===================================================== */

if (
  $("generateVoice")
) {
  $("generateVoice")
    .onclick =
    async () => {
      const voiceText =
        $("voiceText")
          ?.value
          ?.trim() ||
        project.voiceScript ||
        $("prompt")
          ?.value
          ?.trim() ||
        "";

      if (!voiceText) {
        status(
          "❌ ਪਹਿਲਾਂ text ਜਾਂ prompt ਲਿਖੋ।"
        );

        return;
      }

      try {
        $("generateVoice")
          .disabled =
          true;

        status(
          "🗣️ AI voice ਬਣ ਰਹੀ ਹੈ..."
        );

        await createAIVoice(
          voiceText
        );

        status(
          "✅ AI Voice ਤਿਆਰ ਹੈ।"
        );

      } catch (error) {
        console.error(
          error
        );

        status(
          "❌ AI Voice failed: " +
          error.message
        );

      } finally {
        $("generateVoice")
          .disabled =
          false;
      }
    };
}

/* =====================================================
   COMPLETE AI VIDEO
===================================================== */

async function generateCompleteVideo() {
  const prompt =
    $("prompt")
      ?.value
      ?.trim();

  const format =
    $("format")
      ?.value ||
    "reel";

  if (!prompt) {
    status(
      "❌ ਪਹਿਲਾਂ topic/prompt ਲਿਖੋ।"
    );

    return;
  }

  const button =
    $("generate");

  if (button) {
    button.disabled =
      true;
  }

  try {
    /* STEP 1 */

    status(
      "🧠 AI script ਬਣਾ ਰਿਹਾ ਹੈ..."
    );

    const plan =
      await createAIPlan(
        prompt,
        format
      );

    project = {
      ...project,
      ...plan,

      format,

      aspectRatio:
        format === "youtube" ||
        format === "long"
          ? "16:9"
          : "9:16",

      scenes:
        Array.isArray(
          plan.scenes
        )
          ? plan.scenes
          : [],

      voiceScript:
        plan.voiceScript ||
        ""
    };

    index = 0;

    render();

    /* STEP 2 */

    status(
      "🗣️ AI voice ਬਣ ਰਹੀ ਹੈ..."
    );

    const voice =
      await createAIVoice(
        project.voiceScript
      );

    /* STEP 3 */

    status(
      "🎬 scenes + music + MP4 ਬਣ ਰਹੀ ਹੈ..."
    );

    /*
     * IMPORTANT:
     * Send the already generated
     * plan and voice URL.
     */

    const video =
      await jsonFetch(
        "/api/ai/video",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              prompt,
              format,

              plan: {
                title:
                  project.title,

                voiceScript:
                  project.voiceScript,

                scenes:
                  project.scenes
              },

              voice:
                project.voice,

              voiceSpeed:
                project.voiceSpeed,

              voiceUrl:
                voice.url
            })
        }
      );

    Object.assign(
      project,
      {
        title:
          video.title ||
          project.title,

        scenes:
          Array.isArray(
            video.scenes
          )
            ? video.scenes
            : project.scenes,

        voiceScript:
          video.voiceScript ||
          project.voiceScript,

        voiceUrl:
          video.voiceUrl ||
          project.voiceUrl,

        musicUrl:
          video.musicUrl ||
          "",

        videoUrl:
          video.videoUrl ||
          "",

        duration:
          video.duration ||
          0
      }
    );

    render();

    showGeneratedVideo(
      project.videoUrl
    );

    status(
      "✅ Complete! Script + AI Voice + Scenes + Music + MP4 ਤਿਆਰ ਹੈ।"
    );

  } catch (error) {
    console.error(
      "VIDEO ERROR:",
      error
    );

    status(
      "❌ Video generation failed: " +
        error.message
    );

  } finally {
    if (button) {
      button.disabled =
        false;
    }
  }
}

/* =====================================================
   GENERATE BUTTON
===================================================== */

if ($("generate")) {
  $("generate")
    .onclick =
    generateCompleteVideo;
}

/* =====================================================
   FORMAT
===================================================== */

if ($("format")) {
  $("format")
    .onchange =
    updateFormat;
}

/* =====================================================
   SHOW GENERATED VIDEO
===================================================== */

function showGeneratedVideo(
  url
) {
  const video =
    $("generatedVideo");

  if (!video || !url) {
    return;
  }

  video.src =
    url;

  video.hidden =
    false;

  video.load();

  if (
    $("downloadGenerated")
  ) {
    $("downloadGenerated")
      .hidden =
      false;
  }
}

/* =====================================================
   DOWNLOAD
===================================================== */

if (
  $("downloadGenerated")
) {
  $("downloadGenerated")
    .onclick =
    () => {
      if (
        !project.videoUrl
      ) {
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
    };
}

/* =====================================================
   PREVIOUS
===================================================== */

if ($("prev")) {
  $("prev")
    .onclick =
    () => {
      if (
        !project.scenes.length
      ) {
        return;
      }

      index =
        (
          index -
          1 +
          project.scenes.length
        ) %
        project.scenes.length;

      render();
    };
}

/* =====================================================
   NEXT
===================================================== */

if ($("next")) {
  $("next")
    .onclick =
    () => {
      if (
        !project.scenes.length
      ) {
        return;
      }

      index =
        (
          index + 1
        ) %
        project.scenes.length;

      render();
    };
}

/* =====================================================
   MICROPHONE
===================================================== */

if ($("mic")) {
  $("mic")
    .onclick =
    async () => {
      try {
        if (
          !navigator
            .mediaDevices
            ?.getUserMedia
        ) {
          throw new Error(
            "Microphone is not supported."
          );
        }

        chunks = [];

        recording =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio: true
            });

        const mime =
          MediaRecorder
            .isTypeSupported(
              "audio/webm"
            )
              ? "audio/webm"
              : "";

        const recorder =
          new MediaRecorder(
            recording,
            mime
              ? {
                  mimeType:
                    mime
                }
              : undefined
          );

        window.__creatorRecorder =
          recorder;

        recorder.ondataavailable =
          event => {
            if (
              event.data &&
              event.data.size
            ) {
              chunks.push(
                event.data
              );
            }
          };

        recorder.onstop =
          () => {
            const blob =
              new Blob(
                chunks,
                {
                  type:
                    recorder.mimeType ||
                    "audio/webm"
                }
              );

            const url =
              URL.createObjectURL(
                blob
              );

            generatedVoiceBlob =
              blob;

            generatedVoiceUrl =
              url;

            if ($("audio")) {
              $("audio").src =
                url;

              $("audio").hidden =
                false;
            }

            if (recording) {
              recording
                .getTracks()
                .forEach(
                  track =>
                    track.stop()
                );

              recording =
                null;
            }

            if (
              $("recordStatus")
            ) {
              $("recordStatus")
                .textContent =
                "✅ Recording ready.";
            }
          };

        recorder.start();

        $("mic").disabled =
          true;

        if ($("stopMic")) {
          $("stopMic").disabled =
            false;
        }

        if (
          $("recordStatus")
        ) {
          $("recordStatus")
            .textContent =
            "🔴 Recording...";
        }

      } catch (error) {
        console.error(
          error
        );

        if (
          $("recordStatus")
        ) {
          $("recordStatus")
            .textContent =
            "❌ " +
            error.message;
        }
      }
    };
}

/* =====================================================
   STOP MIC
===================================================== */

if ($("stopMic")) {
  $("stopMic")
    .onclick =
    () => {
      const recorder =
        window.__creatorRecorder;

      if (
        recorder &&
        recorder.state !==
          "inactive"
      ) {
        recorder.stop();
      }

      if ($("mic")) {
        $("mic").disabled =
          false;
      }

      $("stopMic").disabled =
        true;
    };
}

/* =====================================================
   AUDIO FILE
===================================================== */

if ($("audioFile")) {
  $("audioFile")
    .onchange =
    event => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      const url =
        URL.createObjectURL(
          file
        );

      generatedVoiceBlob =
        file;

      generatedVoiceUrl =
        url;

      if ($("audio")) {
        $("audio").src =
          url;

        $("audio").hidden =
          false;
      }

      if (
        $("recordStatus")
      ) {
        $("recordStatus")
          .textContent =
          "✅ Audio file loaded.";
      }
    };
}

/* =====================================================
   CANVAS VIDEO
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
    canvas.captureStream(
      30
    );

  const mime =
    MediaRecorder
      .isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

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
    new Promise(
      resolve => {
        recorder.onstop =
          () => {
            resolve(
              new Blob(
                output,
                {
                  type:
                    mime
                }
              )
            );
          };
      }
    );

  recorder.start(
    250
  );

  for (
    let i = 0;
    i <
      project.scenes.length;
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
          duration *
            1000
        )
    );
  }

  recorder.stop();

  return finished;
}

/* =====================================================
   WEBM EXPORT
===================================================== */

if ($("export")) {
  $("export")
    .onclick =
    async () => {
      try {
        status(
          "🎬 Rendering WebM..."
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

        link.href =
          url;

        link.download =
          "creatorai-video.webm";

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        status(
          "✅ WebM exported."
        );

      } catch (error) {
        console.error(
          error
        );

        status(
          "❌ Export failed: " +
            error.message
        );
      }
    };
}

/* =====================================================
   MP4 EXPORT
===================================================== */

if ($("mp4")) {
  $("mp4")
    .onclick =
    async () => {
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
              method:
                "POST",
              body:
                form
            }
          );

        if (
          !response.ok
        ) {
          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            data.error ||
              `MP4 conversion failed: ${response.status}`
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

        link.href =
          url;

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
        console.error(
          error
        );

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
  $("save")
    .onclick =
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

      link.href =
        url;

      link.download =
        "creatorai-project.json";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );

      status(
        "✅ Project saved."
      );
    };
}

/* =====================================================
   LOAD PROJECT
===================================================== */

if ($("load")) {
  $("load")
    .onchange =
    async event => {
      try {
        const file =
          event.target
            .files?.[0];

        if (!file) {
          return;
        }

        project = {
          ...project,
          ...JSON.parse(
            await file.text()
          )
        };

        if (
          !Array.isArray(
            project.scenes
          )
        ) {
          project.scenes =
            [];
        }

        index = 0;

        if (
          $("format")
        ) {
          $("format").value =
            project.format ||
            "reel";
        }

        if (
          $("aiVoice") &&
          project.voice
        ) {
          $("aiVoice").value =
            project.voice;
        }

        if (
          $("voiceSpeed") &&
          project.voiceSpeed
        ) {
          $("voiceSpeed").value =
            String(
              project.voiceSpeed
            );
        }

        render();

        if (
          project.videoUrl
        ) {
          showGeneratedVideo(
            project.videoUrl
          );
        }

        if (
          project.voiceUrl &&
          $("audio")
        ) {
          $("audio").src =
            project.voiceUrl;

          $("audio").hidden =
            false;
        }

        status(
          "✅ Project loaded."
        );

      } catch (error) {
        console.error(
          error
        );

        status(
          "❌ Invalid project file."
        );
      }
    };
}

/* =====================================================
   PWA INSTALL
===================================================== */

let deferredInstall =
  null;

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
  $("installBtn")
    .onclick =
    async () => {
      if (
        !deferredInstall
      ) {
        return;
      }

      deferredInstall.prompt();

      deferredInstall =
        null;

      $("installBtn").hidden =
        true;
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
    .register("/sw.js")
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

updateFormat();
render();
