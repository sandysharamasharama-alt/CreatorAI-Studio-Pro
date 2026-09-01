const $ = id =>
  document.getElementById(id);


/* =====================================================
   CREATORAI STUDIO PRO
   AI SCRIPT + AI VOICE + VIDEO
===================================================== */

let project = {
  title: "",
  format: "reel",
  aspectRatio: "9:16",
  scenes: [],
  voiceScript: "",
  voiceUrl: "",
  videoUrl: "",
  voice: "",
  voiceSpeed: 1
};

let index = 0;

let generatedVoiceBlob = null;
let generatedVoiceUrl = "";

let recording = null;
let chunks = [];

const canvas = $("canvas");

const ctx = canvas
  ? canvas.getContext("2d")
  : null;


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
    (
      format === "youtube" ||
      format === "long"
    )
      ? "16:9"
      : "9:16";

  draw();

}


/* =====================================================
   CANVAS SIZE
===================================================== */

function resize() {

  if (!canvas)
    return;

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

  if (!ctx)
    return;

  const words =
    String(text || "")
      .split(/\s+/);

  let line = "";

  for (
    const word of words
  ) {

    const test =
      line
        ? line + " " + word
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
   DRAW VIDEO
===================================================== */

function draw() {

  if (
    !canvas ||
    !ctx
  )
    return;

  resize();


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
    0.55,
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
        canvas.width * 0.065
      )
    }px system-ui`;


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
    `500 ${
      Math.round(
        canvas.width * 0.028
      )
    }px system-ui`;


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
   RENDER
===================================================== */

function render() {

  if ($("scenes")) {

    $("scenes").innerHTML =
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


  if (!response.ok) {

    throw new Error(
      "AI planning failed: " +
      response.status
    );

  }


  return response.json();

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


  if (!response.ok) {

    let message = "";

    try {

      const data =
        await response.json();

      message =
        data.error ||
        data.message ||
        "";

    } catch {}


    throw new Error(
      "AI voice failed: " +
      response.status +
      (
        message
          ? " — " + message
          : ""
      )
    );

  }


  const data =
    await response.json();


  if (!data.url) {

    throw new Error(
      "AI voice server returned no audio URL."
    );

  }


  project.voice =
    voice;

  project.voiceSpeed =
    speed;

  project.voiceUrl =
    data.url;


  generatedVoiceUrl =
    data.url;


  if ($("audio")) {

    $("audio").src =
      data.url;

    $("audio").hidden =
      false;

  }


  return data;

}


/* =====================================================
   GENERATE AI VOICE BUTTON
===================================================== */

if ($("generateVoice")) {

  $("generateVoice").onclick =
    async () => {

      const text =
        project.voiceScript ||
        $("prompt")
          ?.value
          ?.trim();


      if (!text) {

        status(
          "❌ ਪਹਿਲਾਂ prompt ਜਾਂ script ਦਿਓ।"
        );

        return;

      }


      try {

        status(
          "🗣️ AI voice ਬਣ ਰਹੀ ਹੈ..."
        );


        await createAIVoice(
          text
        );


        status(
          "✅ AI voice ਤਿਆਰ ਹੈ।"
        );

      } catch (error) {

        console.error(
          error
        );

        status(
          "❌ " +
          error.message
        );

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
      "🎬 AI video ਬਣ ਰਹੀ ਹੈ..."
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

              voice:
                $("aiVoice")
                  ?.value ||
                "en-US-AndrewMultilingualNeural",

              voiceSpeed:
                Number(
                  $("voiceSpeed")
                    ?.value ||
                  1
                ),

              voiceUrl:
                project.voiceUrl,

              scenes:
                project.scenes,

              voiceScript:
                project.voiceScript

            })

        }
      );


    if (!response.ok) {

      let message = "";

      try {

        const data =
          await response.json();

        message =
          data.error ||
          data.message ||
          "";

      } catch {}


      throw new Error(
        "Automatic video failed: " +
        response.status +
        (
          message
            ? " — " + message
            : ""
        )
      );

    }


    const videoData =
      await response.json();


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


    render();


    showGeneratedVideo(
      project.videoUrl
    );


    status(
      "✅ Video ਤਿਆਰ ਹੈ! Script + AI voice + video complete."
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
   FORMAT CHANGE
===================================================== */

if ($("format")) {

  $("format").onchange =
    updateFormat;

}


/* =====================================================
   SHOW VIDEO
===================================================== */

function showGeneratedVideo(
  url
) {

  const video =
    $("generatedVideo");


  if (
    !video ||
    !url
  )
    return;


  video.src =
    url;

  video.hidden =
    false;

  video.load();


  if ($("downloadGenerated")) {

    $("downloadGenerated")
      .hidden = false;

  }

}


/* =====================================================
   DOWNLOAD VIDEO
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
      )
        return;


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
      )
        return;


      index =
        (
          index + 1
        ) %
        project.scenes.length;


      render();

    };

}


/* =====================================================
   MICROPHONE RECORDING
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


            if ($("audio")) {

              $("audio").src =
                url;

              $("audio").hidden =
                false;

            }


            generatedVoiceBlob =
              blob;

            generatedVoiceUrl =
              url;


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


        $("stopMic").disabled =
          false;


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
   STOP RECORDING
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


      if (!file)
        return;


      const url =
        URL.createObjectURL(
          file
        );


      if ($("audio")) {

        $("audio").src =
          url;

        $("audio").hidden =
          false;

      }


      generatedVoiceBlob =
        file;

      generatedVoiceUrl =
        url;


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
    canvas.captureStream(
      30
    );


  let audioContext =
    null;


  if (
    project.voiceUrl
  ) {

    try {

      const audioElement =
        new Audio();


      audioElement.src =
        project.voiceUrl;


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
        "Could not attach voice to export:",
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

          throw new Error(
            "MP4 conversion failed: " +
            response.status
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
          event.target
            .files?.[0];


        if (!file)
          return;


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
      )
        return;


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
