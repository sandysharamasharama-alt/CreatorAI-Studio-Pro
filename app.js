const $ = id =>
  document.getElementById(id);


/* =====================================================
   CREATORAI STUDIO PRO v4
===================================================== */

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
  voiceSpeed: 1
};

let index = 0;

let recording = null;
let chunks = [];

let generatedVoiceBlob = null;
let generatedVoiceUrl = "";

const canvas =
  $("canvas");

const ctx =
  canvas
    ? canvas.getContext("2d")
    : null;


/* =====================================================
   STATUS
===================================================== */

function status(message) {
  const element =
    $("status");

  if (element) {
    element.textContent =
      message;
  }

  console.log(
    "[CreatorAI]",
    message
  );
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
    (
      format === "youtube" ||
      format === "long"
    )
      ? "16:9"
      : "9:16";

  draw();
}


/* =====================================================
   CANVAS
===================================================== */

function resize() {
  if (!canvas) {
    return;
  }

  if (
    project.aspectRatio ===
    "16:9"
  ) {
    canvas.width =
      1280;

    canvas.height =
      720;

  } else {
    canvas.width =
      720;

    canvas.height =
      1280;
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
        y
      );

      line = word;
      y += lineHeight;

    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(
      line,
      x,
      y
    );
  }
}


/* =====================================================
   DRAW PREVIEW
===================================================== */

function draw() {
  if (
    !canvas ||
    !ctx
  ) {
    return;
  }

  resize();

  const scene =
    project.scenes[index] || {
      headline:
        "Create your first video",

      body:
        "Enter a topic and let CreatorAI Studio Pro create your video."
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
    0.5,
    "#10152d"
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
    0.28;

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

  /* Label */

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
    `800 ${
      Math.round(
        canvas.width *
        0.065
      )
    }px system-ui`;

  wrapText(
    scene.headline,
    70,
    canvas.height *
      0.40,
    canvas.width -
      140,
    Math.round(
      canvas.width *
      0.065
    ) * 1.15
  );

  /* Body */

  ctx.fillStyle =
    "#b8c2d5";

  ctx.font =
    `500 ${
      Math.round(
        canvas.width *
        0.028
      )
    }px system-ui`;

  wrapText(
    scene.body,
    70,
    canvas.height *
      0.67,
    canvas.width -
      140,
    Math.round(
      canvas.width *
      0.028
    ) * 1.5
  );

  /* Bottom */

  ctx.fillStyle =
    "#28d5f5";

  ctx.fillRect(
    70,
    canvas.height -
      80,
    canvas.width -
      140,
    6
  );

  ctx.fillStyle =
    "#d7dbea";

  ctx.font =
    "600 18px system-ui";

  ctx.fillText(
    "FOLLOW • SAVE • SHARE",
    70,
    canvas.height -
      105
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
   RENDER SCENES
===================================================== */

function render() {
  const scenesElement =
    $("scenes");

  if (scenesElement) {
    scenesElement.innerHTML =
      project.scenes
        .map(
          (
            scene,
            i
          ) => `
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
                ${esc(
                  scene.headline
                )}
              </b>

              <small>
                ${
                  scene.duration ||
                  5
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
   AI PLAN
===================================================== */

async function createAIPlan(
  prompt,
  format
) {
  const response =
    await fetch(
      "/api/ai/plan",
      {
        method: "POST",

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

  const raw =
    await response.text();

  let data = {};

  try {
    data =
      raw
        ? JSON.parse(raw)
        : {};

  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `AI planning failed (${response.status})`
    );
  }

  return data;
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

  const response =
    await fetch(
      "/api/ai/voice",
      {
        method: "POST",

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

  const raw =
    await response.text();

  let data = {};

  try {
    data =
      raw
        ? JSON.parse(raw)
        : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `AI voice failed (${response.status})`
    );
  }

  if (!data.url) {
    throw new Error(
      "Server ਨੇ audio URL ਨਹੀਂ ਭੇਜਿਆ।"
    );
  }

  project.voice =
    voice;

  project.voiceSpeed =
    speed;

  project.voiceScript =
    text;

  project.voiceUrl =
    data.url;

  generatedVoiceUrl =
    data.url;

  const audio =
    $("audio");

  if (audio) {
    audio.src =
      data.url;

    audio.hidden =
      false;

    audio.load();
  }

  return data;
}


/* =====================================================
   AI VOICE BUTTON
===================================================== */

const generateVoiceButton =
  $("generateVoice");

if (generateVoiceButton) {
  generateVoiceButton.onclick =
    async () => {
      const voiceText =
        $("voiceText");

      const voiceStatus =
        $("voiceStatus");

      let text =
        voiceText?.value?.trim() ||
        "";

      if (!text) {
        text =
          project.voiceScript ||
          $("prompt")
            ?.value
            ?.trim() ||
          "";
      }

      if (!text) {
        status(
          "❌ ਪਹਿਲਾਂ text ਜਾਂ prompt ਲਿਖੋ।"
        );

        if (voiceStatus) {
          voiceStatus.textContent =
            "❌ ਪਹਿਲਾਂ text ਲਿਖੋ।";
        }

        return;
      }

      try {
        generateVoiceButton.disabled =
          true;

        generateVoiceButton.textContent =
          "⏳ Generating AI Voice...";

        status(
          "🗣️ AI voice ਬਣ ਰਹੀ ਹੈ..."
        );

        if (voiceStatus) {
          voiceStatus.textContent =
            "🗣️ AI voice generating...";
        }

        await createAIVoice(
          text
        );

        status(
          "✅ AI Voice ਤਿਆਰ ਹੈ।"
        );

        if (voiceStatus) {
          voiceStatus.textContent =
            "✅ AI Voice ਤਿਆਰ ਹੈ।";
        }

      } catch (error) {
        console.error(
          error
        );

        status(
          "❌ AI Voice failed: " +
          error.message
        );

        if (voiceStatus) {
          voiceStatus.textContent =
            "❌ " +
            error.message;
        }

      } finally {
        generateVoiceButton.disabled =
          false;

        generateVoiceButton.textContent =
          "🗣️ Generate AI Voice";
      }
    };
}


/* =====================================================
   COMPLETE VIDEO
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

  const generateButton =
    $("generate");

  try {
    if (generateButton) {
      generateButton.disabled =
        true;

      generateButton.textContent =
        "⏳ Creating...";
    }

    /* STEP 1 */

    status(
      "🧠 AI script ਬਣ ਰਿਹਾ ਹੈ..."
    );

    const plan =
      await createAIPlan(
        prompt,
        format
      );

    project = {
      ...project,

      ...plan,

      title:
        plan.title ||
        prompt.slice(0, 80),

      format,

      aspectRatio:
        (
          format === "youtube" ||
          format === "long"
        )
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

    await createAIVoice(
      project.voiceScript
    );

    /* STEP 3 */

    status(
      "🎬 scenes render ਹੋ ਰਹੇ ਹਨ..."
    );

    const response =
      await fetch(
        "/api/ai/video",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              prompt,

              format,

              title:
                project.title,

              voice:
                $("aiVoice")
                  ?.value ||
                project.voice ||
                "en-US-AndrewMultilingualNeural",

              voiceSpeed:
                Number(
                  $("voiceSpeed")
                    ?.value ||
                  1
                ),

              voiceScript:
                project.voiceScript,

              scenes:
                project.scenes
            })
        }
      );

    const raw =
      await response.text();

    let videoData = {};

    try {
      videoData =
        raw
          ? JSON.parse(raw)
          : {};
    } catch {
      videoData = {};
    }

    if (!response.ok) {
      throw new Error(
        videoData.error ||
        videoData.message ||
        `Video failed (${response.status})`
      );
    }

    /* STEP 4 */

    project.title =
      videoData.title ||
      project.title;

    project.scenes =
      Array.isArray(
        videoData.scenes
      )
        ? videoData.scenes
        : project.scenes;

    project.voiceScript =
      videoData.voiceScript ||
      project.voiceScript;

    project.videoUrl =
      videoData.videoUrl ||
      "";

    project.voiceUrl =
      videoData.voiceUrl ||
      project.voiceUrl;

    project.musicUrl =
      videoData.musicUrl ||
      "";

    project.voice =
      videoData.voice ||
      project.voice;

    project.voiceSpeed =
      videoData.voiceSpeed ||
      project.voiceSpeed;

    render();

    if (
      project.videoUrl
    ) {
      showGeneratedVideo(
        project.videoUrl
      );
    }

    status(
      "✅ ਪੂਰਾ video ਤਿਆਰ ਹੈ — scenes + AI voice + music + MP4."
    );

  } catch (error) {
    console.error(
      "COMPLETE VIDEO ERROR:",
      error
    );

    status(
      "❌ Video generation failed: " +
      (
        error.message ||
        "Unknown error"
      )
    );

  } finally {
    if (generateButton) {
      generateButton.disabled =
        false;

      generateButton.textContent =
        "🎬 Generate Complete Video";
    }
  }
}


/* =====================================================
   GENERATE BUTTON
===================================================== */

if ($("generate")) {
  $("generate").onclick =
    generateCompleteVideo;
}


/* =====================================================
   FORMAT
===================================================== */

if ($("format")) {
  $("format").onchange =
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

  if (
    !video ||
    !url
  ) {
    return;
  }

  video.src =
    url;

  video.hidden =
    false;

  video.controls =
    true;

  video.load();

  if ($("downloadGenerated")) {
    $("downloadGenerated")
      .hidden = false;
  }
}


/* =====================================================
   DOWNLOAD GENERATED VIDEO
===================================================== */

if ($("downloadGenerated")) {
  $("downloadGenerated")
    .onclick = () => {
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
    };
}


/* =====================================================
   PREVIOUS
===================================================== */

if ($("prev")) {
  $("prev").onclick =
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
  $("next").onclick =
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
  $("mic").onclick =
    async () => {
      try {
        if (
          !navigator
            .mediaDevices
            ?.getUserMedia
        ) {
          throw new Error(
            "Microphone recording is not supported."
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
                  mimeType: mime
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

            if (
              $("recordStatus")
            ) {
              $("recordStatus")
                .textContent =
                "✅ Recording ready.";
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
            "❌ Microphone error: " +
            error.message;
        }
      }
    };
}


/* =====================================================
   STOP MICROPHONE
===================================================== */

if ($("stopMic")) {
  $("stopMic").onclick =
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
  $("audioFile").onchange =
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

  let audioContext =
    null;

  let audioElement =
    null;

  if (
    project.voiceUrl
  ) {
    try {
      audioElement =
        new Audio(
          project.voiceUrl
        );

      audioElement.crossOrigin =
        "anonymous";

      audioElement.preload =
        "auto";

      await audioElement
        .play()
        .catch(
          () => {}
        );

      audioContext =
        new AudioContext();

      const source =
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
        .forEach(
          track => {
            stream.addTrack(
              track
            );
          }
        );

    } catch (error) {
      console.warn(
        "Voice attachment failed:",
        error
      );
    }
  }

  let mime =
    "video/webm";

  if (
    MediaRecorder
      .isTypeSupported(
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
    new Promise(
      resolve => {
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
      }
    );

  recorder.start(250);

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
          ?.duration
      ) || 5;

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

  if (audioContext) {
    try {
      await audioContext.close();
    } catch {}
  }

  if (audioElement) {
    try {
      audioElement.pause();
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

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          5000
        );

        status(
          "✅ WebM video exported."
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
          const text =
            await response.text();

          throw new Error(
            text ||
            `MP4 conversion failed (${response.status})`
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

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          5000
        );

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

      link.href =
        url;

      link.download =
        "creatorai-project.json";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        1000
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
  $("load").onchange =
    async event => {
      try {
        const file =
          event.target
            .files?.[0];

        if (!file) {
          return;
        }

        const data =
          JSON.parse(
            await file.text()
          );

        project = {
          ...project,
          ...data
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
          $("format") &&
          project.format
        ) {
          $("format").value =
            project.format;
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
  $("installBtn").onclick =
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

updateFormat();
render();

console.log(
  "CreatorAI Studio Pro v4 frontend loaded."
);
