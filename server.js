import "dotenv/config";

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import { EdgeTTS } from "edge-tts-universal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const app = express();

const PORT = process.env.PORT || 3000;

const generatedDir = path.join(__dirname, "generated");
const tmpDir = path.join(__dirname, "tmp");

fs.mkdirSync(generatedDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  dest: tmpDir,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
  express.json({
    limit: "20mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb"
  })
);

app.use(express.static(__dirname));

app.use(
  "/generated",
  express.static(generatedDir)
);

/* =====================================================
   HELPERS
===================================================== */

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeFileName(value) {
  return String(value || "creatorai")
    .replace(/[^a-z0-9_-]/gi, "_")
    .slice(0, 80);
}

function getFormatInfo(format) {
  if (
    format === "youtube" ||
    format === "long"
  ) {
    return {
      aspectRatio: "16:9",
      width: 1280,
      height: 720
    };
  }

  return {
    aspectRatio: "9:16",
    width: 720,
    height: 1280
  };
}

function getVoiceName(requestedVoice) {
  return (
    cleanText(requestedVoice) ||
    process.env.TTS_VOICE ||
    "en-US-AndrewMultilingualNeural"
  );
}

function getTTSRate(speed) {
  const value = Number(speed);

  if (!Number.isFinite(value)) {
    return "+0%";
  }

  const percent = Math.round(
    (value - 1) * 100
  );

  if (percent > 50) {
    return "+50%";
  }

  if (percent < -50) {
    return "-50%";
  }

  if (percent === 0) {
    return "+0%";
  }

  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function escapeDrawtext(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function normalizeScenes(scenes, fallbackText = "") {
  if (!Array.isArray(scenes) || !scenes.length) {
    return [
      {
        headline: "CreatorAI Studio",
        body:
          cleanText(fallbackText) ||
          "Create amazing videos automatically.",
        duration: 5
      }
    ];
  }

  return scenes
    .slice(0, 8)
    .map((scene, index) => ({
      headline:
        cleanText(scene?.headline) ||
        `Scene ${index + 1}`,

      body:
        cleanText(scene?.body) ||
        "Create engaging content with CreatorAI Studio Pro.",

      duration:
        Math.max(
          3,
          Math.min(
            12,
            Number(scene?.duration) || 5
          )
        )
    }));
}

async function removeFile(file) {
  if (!file) return;

  try {
    await fs.promises.unlink(file);
  } catch {}
}

/* =====================================================
   HEALTH
===================================================== */

app.get(
  "/api/health",
  (_, res) => {
    res.json({
      ok: true,
      app: "CreatorAI Studio Pro",
      version: "4.0.0",
      ffmpeg: Boolean(ffmpegPath),
      gemini: Boolean(
        process.env.GEMINI_API_KEY
      ),
      features: [
        "AI script planning",
        "AI voice",
        "scene video rendering",
        "animated scene transitions",
        "background music",
        "automatic video",
        "MP4 export",
        "WebM to MP4 conversion",
        "PWA"
      ]
    });
  }
);

/* =====================================================
   FALLBACK SCRIPT
===================================================== */

function fallbackScript(
  prompt,
  format
) {
  const topic =
    cleanText(prompt) ||
    "this topic";

  const scenes = [
    {
      headline: "The big idea",
      body:
        `Let's quickly understand ${topic} and why it matters.`,
      duration: 5
    },

    {
      headline: "What you should know",
      body:
        `The key is to understand the most useful part of ${topic} before taking action.`,
      duration: 5
    },

    {
      headline: "Why it matters",
      body:
        `This can help you make smarter decisions and create better results.`,
      duration: 5
    },

    {
      headline: "A simple step",
      body:
        `Start with one small step, test it and improve your result.`,
      duration: 5
    },

    {
      headline: "Creator tip",
      body:
        `Keep your content simple, useful and easy for people to remember.`,
      duration: 5
    },

    {
      headline: "Follow for more",
      body:
        `Save this video and follow CreatorAI Studio for more useful ideas.`,
      duration: 5
    }
  ];

  return {
    title: topic.slice(0, 80),
    format,
    aspectRatio:
      getFormatInfo(format).aspectRatio,
    voiceScript:
      scenes
        .map(scene => scene.body)
        .join(" "),
    scenes
  };
}

/* =====================================================
   GEMINI SCRIPT
===================================================== */

async function generateAIScript(
  prompt,
  format
) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(
      "Gemini API key not configured. Using local fallback."
    );

    return fallbackScript(
      prompt,
      format
    );
  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  const formatInfo =
    getFormatInfo(format);

  const instruction = `
You are the professional scriptwriter inside CreatorAI Studio Pro.

Create a short social-media video about:

${prompt}

Format:
${format}

Aspect ratio:
${formatInfo.aspectRatio}

Rules:

- Create a strong hook.
- Make the information useful.
- Use natural spoken language.
- Keep each scene short.
- Create 5 to 7 scenes.
- Each scene needs headline, body and duration.
- Total video should normally be 25 to 45 seconds.
- End with a natural call to action.
- Do not use markdown.
- Return ONLY valid JSON.

Return:

{
  "title": "short title",
  "voiceScript": "complete spoken narration",
  "scenes": [
    {
      "headline": "short headline",
      "body": "spoken scene text",
      "duration": 5
    }
  ]
}
`;

  try {
    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            "x-goog-api-key":
              apiKey
          },

          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: instruction
                  }
                ]
              }
            ],

            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 2000
            }
          })
        }
      );

    if (!response.ok) {
      console.error(
        "Gemini HTTP error:",
        response.status,
        await response.text()
      );

      return fallbackScript(
        prompt,
        format
      );
    }

    const data =
      await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
      return fallbackScript(
        prompt,
        format
      );
    }

    const cleaned =
      text
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

    const result =
      JSON.parse(cleaned);

    const scenes =
      normalizeScenes(
        result.scenes,
        result.voiceScript
      );

    const voiceScript =
      cleanText(
        result.voiceScript
      ) ||
      scenes
        .map(scene => scene.body)
        .join(" ");

    return {
      title:
        cleanText(result.title) ||
        cleanText(prompt).slice(0, 80),

      format,

      aspectRatio:
        formatInfo.aspectRatio,

      voiceScript,

      scenes
    };

  } catch (error) {
    console.error(
      "Gemini generation error:",
      error
    );

    return fallbackScript(
      prompt,
      format
    );
  }
}

/* =====================================================
   AI PLAN API
===================================================== */

app.post(
  "/api/ai/plan",
  async (req, res) => {
    try {
      const prompt =
        cleanText(
          req.body?.prompt
        );

      const format =
        cleanText(
          req.body?.format
        ) || "reel";

      if (!prompt) {
        return res
          .status(400)
          .json({
            error:
              "Prompt is required."
          });
      }

      const plan =
        await generateAIScript(
          prompt,
          format
        );

      res.json({
        ok: true,
        ...plan
      });

    } catch (error) {
      console.error(
        "AI PLAN ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "AI planning failed.",
          details:
            error?.message
        });
    }
  }
);

/* =====================================================
   AI VOICE
===================================================== */

async function generateVoiceFile({
  text,
  voiceName,
  speed
}) {
  const fileName =
    `voice-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.mp3`;

  const output =
    path.join(
      generatedDir,
      fileName
    );

  const tts =
    new EdgeTTS(
      text,
      voiceName,
      {
        rate:
          getTTSRate(speed),
        volume: "+0%",
        pitch: "+0Hz"
      }
    );

  const result =
    await tts.synthesize();

  const audioBuffer =
    Buffer.from(
      await result.audio.arrayBuffer()
    );

  await fs.promises.writeFile(
    output,
    audioBuffer
  );

  return {
    fileName,
    filePath: output,
    url:
      `/generated/${fileName}`
  };
}

app.post(
  "/api/ai/voice",
  async (req, res) => {
    try {
      const text =
        cleanText(
          req.body?.text
        );

      if (!text) {
        return res
          .status(400)
          .json({
            error:
              "Voice text is required."
          });
      }

      const voice =
        getVoiceName(
          req.body?.voice
        );

      const speed =
        Number(
          req.body?.speed ||
          1
        );

      console.log(
        `Generating voice: ${voice}, speed: ${speed}`
      );

      const result =
        await generateVoiceFile({
          text,
          voiceName: voice,
          speed
        });

      res.json({
        ok: true,
        voice,
        speed,
        url: result.url
      });

    } catch (error) {
      console.error(
        "VOICE ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "AI voice generation failed.",
          details:
            error?.message ||
            "Unknown voice error."
        });
    }
  }
);

/* =====================================================
   BACKGROUND MUSIC
===================================================== */

async function createBackgroundMusic(
  output,
  duration
) {
  const seconds =
    Math.max(
      5,
      Math.min(
        120,
        Number(duration) || 30
      )
    );

  await execFileAsync(
    ffmpegPath,
    [
      "-y",

      "-f",
      "lavfi",

      "-i",
      `sine=frequency=196:duration=${seconds}`,

      "-af",
      "volume=0.018",

      "-ac",
      "2",

      "-ar",
      "44100",

      output
    ]
  );
}

/* =====================================================
   CREATE SCENE VIDEO
===================================================== */

async function createSceneVideo({
  scene,
  index,
  total,
  width,
  height,
  output
}) {
  const duration =
    Math.max(
      3,
      Number(scene.duration) || 5
    );

  const headline =
    escapeDrawtext(
      scene.headline
    );

  const body =
    escapeDrawtext(
      scene.body
    );

  /*
    Different background per scene.
    This makes the final video an actual
    multi-scene rendered video rather
    than one solid screen.
  */

  const backgrounds = [
    "0x071a2a",
    "0x10152d",
    "0x17202b",
    "0x20152d",
    "0x102820",
    "0x291b14",
    "0x161b28",
    "0x0b2230"
  ];

  const background =
    backgrounds[
      index % backgrounds.length
    ];

  const fontSize =
    width >= 1000
      ? 58
      : 42;

  const bodySize =
    width >= 1000
      ? 32
      : 25;

  const filter =
    `drawtext=` +
    `text='CREATORAI STUDIO PRO':` +
    `fontcolor=0x28d5f5:` +
    `fontsize=${Math.round(fontSize * 0.42)}:` +
    `x=50:y=45,` +

    `drawtext=` +
    `text='${headline}':` +
    `fontcolor=white:` +
    `fontsize=${fontSize}:` +
    `x=60:` +
    `y=(h-text_h)/2-90:` +
    `line_spacing=12:` +
    `box=1:` +
    `boxcolor=0x00000055:` +
    `boxborderw=20,` +

    `drawtext=` +
    `text='${body}':` +
    `fontcolor=0xd7dbea:` +
    `fontsize=${bodySize}:` +
    `x=60:` +
    `y=(h-text_h)/2+80:` +
    `line_spacing=10:` +
    `box=1:` +
    `boxcolor=0x00000035:` +
    `boxborderw=16,` +

    `drawtext=` +
    `text='SCENE ${index + 1} / ${total}':` +
    `fontcolor=0x28d5f5:` +
    `fontsize=${Math.round(fontSize * 0.38)}:` +
    `x=60:` +
    `y=h-70`;

  await execFileAsync(
    ffmpegPath,
    [
      "-y",

      "-f",
      "lavfi",

      "-i",
      `color=c=${background}:s=${width}x${height}:r=30`,

      "-t",
      String(duration),

      "-vf",
      filter,

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-pix_fmt",
      "yuv420p",

      "-an",

      output
    ]
  );
}

/* =====================================================
   CREATE FULL VIDEO
===================================================== */

async function createVideoFile({
  plan,
  voicePath,
  musicPath,
  format
}) {
  const info =
    getFormatInfo(format);

  const scenes =
    normalizeScenes(
      plan.scenes,
      plan.voiceScript
    );

  const sceneFiles = [];

  try {
    /*
      1. Render every scene separately.
    */

    for (
      let i = 0;
      i < scenes.length;
      i++
    ) {
      const sceneFile =
        path.join(
          tmpDir,
          `scene-${Date.now()}-${i}-${Math.random()
            .toString(36)
            .slice(2, 7)}.mp4`
        );

      await createSceneVideo({
        scene:
          scenes[i],
        index: i,
        total:
          scenes.length,
        width:
          info.width,
        height:
          info.height,
        output:
          sceneFile
      });

      sceneFiles.push(
        sceneFile
      );
    }

    /*
      2. Create concat file.
    */

    const concatFile =
      path.join(
        tmpDir,
        `concat-${Date.now()}.txt`
      );

    const concatText =
      sceneFiles
        .map(
          file =>
            `file '${file.replace(/'/g, "'\\''")}'`
        )
        .join("\n");

    await fs.promises.writeFile(
      concatFile,
      concatText,
      "utf8"
    );

    /*
      3. Concatenate scenes.
    */

    const silentVideo =
      path.join(
        tmpDir,
        `silent-${Date.now()}.mp4`
      );

    await execFileAsync(
      ffmpegPath,
      [
        "-y",

        "-f",
        "concat",

        "-safe",
        "0",

        "-i",
        concatFile,

        "-c",
        "copy",

        silentVideo
      ]
    );

    /*
      4. Mix voice + music.
    */

    const finalFileName =
      `creatorai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.mp4`;

    const finalPath =
      path.join(
        generatedDir,
        finalFileName
      );

    await execFileAsync(
      ffmpegPath,
      [
        "-y",

        "-i",
        silentVideo,

        "-i",
        voicePath,

        "-i",
        musicPath,

        "-filter_complex",

        "[1:a]volume=1.0[voice];" +
        "[2:a]volume=0.018[music];" +
        "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]",

        "-map",
        "0:v",

        "-map",
        "[a]",

        "-shortest",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-movflags",
        "+faststart",

        finalPath
      ]
    );

    const duration =
      scenes.reduce(
        (sum, scene) =>
          sum +
          Number(scene.duration || 5),
        0
      );

    await removeFile(
      concatFile
    );

    await removeFile(
      silentVideo
    );

    return {
      videoFile:
        finalFileName,

      videoPath:
        finalPath,

      duration:
        Math.ceil(duration)
    };

  } finally {
    for (
      const file of sceneFiles
    ) {
      await removeFile(file);
    }
  }
}

/* =====================================================
   COMPLETE AI VIDEO
===================================================== */

app.post(
  "/api/ai/video",
  async (req, res) => {
    let voicePath = null;
    let musicPath = null;

    try {
      const prompt =
        cleanText(
          req.body?.prompt
        );

      const format =
        cleanText(
          req.body?.format
        ) || "reel";

      if (!prompt) {
        return res
          .status(400)
          .json({
            error:
              "Prompt is required."
          });
      }

      console.log(
        "======================================"
      );

      console.log(
        "CREATORAI VIDEO GENERATION"
      );

      console.log(
        "Topic:",
        prompt
      );

      /*
        IMPORTANT:
        If frontend already generated
        a plan, use it.

        This prevents duplicate AI
        script generation.
      */

      let plan;

      const suppliedScenes =
        Array.isArray(
          req.body?.scenes
        )
          ? req.body.scenes
          : [];

      const suppliedScript =
        cleanText(
          req.body?.voiceScript
        );

      if (
        suppliedScenes.length &&
        suppliedScript
      ) {
        plan = {
          title:
            cleanText(
              req.body?.title
            ) ||
            prompt.slice(0, 80),

          format,

          aspectRatio:
            getFormatInfo(
              format
            ).aspectRatio,

          voiceScript:
            suppliedScript,

          scenes:
            normalizeScenes(
              suppliedScenes,
              suppliedScript
            )
        };

        console.log(
          "Using existing AI plan."
        );

      } else {
        plan =
          await generateAIScript(
            prompt,
            format
          );

        console.log(
          "Generated new AI plan."
        );
      }

      /*
        1. AI VOICE
      */

      const voice =
        getVoiceName(
          req.body?.voice
        );

      const speed =
        Number(
          req.body?.voiceSpeed ||
          1
        );

      const voiceResult =
        await generateVoiceFile({
          text:
            plan.voiceScript,
          voiceName:
            voice,
          speed
        });

      voicePath =
        voiceResult.filePath;

      /*
        2. MUSIC
      */

      const musicFile =
        `music-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.wav`;

      musicPath =
        path.join(
          generatedDir,
          musicFile
        );

      const totalDuration =
        plan.scenes.reduce(
          (sum, scene) =>
            sum +
            Number(
              scene.duration || 5
            ),
          0
        );

      await createBackgroundMusic(
        musicPath,
        totalDuration
      );

      /*
        3. RENDER VIDEO
      */

      console.log(
        "Rendering scenes..."
      );

      const video =
        await createVideoFile({
          plan,
          voicePath,
          musicPath,
          format
        });

      console.log(
        "Video complete:",
        video.videoFile
      );

      /*
        4. RESPONSE
      */

      res.json({
        ok: true,

        title:
          plan.title,

        format,

        aspectRatio:
          plan.aspectRatio,

        voiceScript:
          plan.voiceScript,

        scenes:
          plan.scenes,

        voice:
          voice,

        voiceSpeed:
          speed,

        voiceUrl:
          voiceResult.url,

        musicUrl:
          `/generated/${musicFile}`,

        videoUrl:
          `/generated/${video.videoFile}`,

        duration:
          video.duration
      });

    } catch (error) {
      console.error(
        "VIDEO GENERATION ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Automatic video generation failed.",

          details:
            error?.message ||
            "Unknown error"
        });

    } finally {
      /*
        Keep generated files available
        for the current session.
      */
    }
  }
);

/* =====================================================
   MP4 CONVERSION
===================================================== */

app.post(
  "/api/convert/mp4",
  upload.single("video"),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            "No video uploaded."
        });
    }

    const input =
      req.file.path;

    const output =
      `${input}.mp4`;

    try {
      await execFileAsync(
        ffmpegPath,
        [
          "-y",

          "-i",
          input,

          "-c:v",
          "libx264",

          "-preset",
          "veryfast",

          "-pix_fmt",
          "yuv420p",

          "-c:a",
          "aac",

          "-b:a",
          "128k",

          "-movflags",
          "+faststart",

          output
        ]
      );

      await removeFile(
        input
      );

      res.download(
        output,
        "creatorai-video.mp4",
        async () => {
          await removeFile(
            output
          );
        }
      );

    } catch (error) {
      console.error(
        "MP4 ERROR:",
        error
      );

      await removeFile(
        input
      );

      await removeFile(
        output
      );

      if (!res.headersSent) {
        res
          .status(500)
          .json({
            error:
              "MP4 conversion failed.",
            details:
              error?.message
          });
      }
    }
  }
);

/* =====================================================
   GENERATED FILES
===================================================== */

app.get(
  "/api/generated",
  async (_, res) => {
    try {
      const files =
        await fs.promises.readdir(
          generatedDir
        );

      res.json({
        ok: true,
        files
      });

    } catch {
      res.json({
        ok: true,
        files: []
      });
    }
  }
);

/* =====================================================
   SPA FALLBACK
===================================================== */

app.get(
  "/{*splat}",
  (_, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
  (error, _, res, __) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    if (
      res.headersSent
    ) {
      return;
    }

    res
      .status(500)
      .json({
        error:
          "Internal server error.",
        details:
          error?.message
      });
  }
);

/* =====================================================
   START
===================================================== */

app.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      "CreatorAI Studio Pro v4"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `FFmpeg: ${
        ffmpegPath
          ? "READY"
          : "NOT FOUND"
      }`
    );

    console.log(
      `Gemini: ${
        process.env.GEMINI_API_KEY
          ? "CONFIGURED"
          : "FALLBACK MODE"
      }`
    );

    console.log(
      "======================================"
    );
  }
);
