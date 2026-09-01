import "dotenv/config";

mport express from "express";
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

const tmpDir = path.join(__dirname, "tmp");
const generatedDir = path.join(__dirname, "generated");

fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

const upload = multer({
  dest: tmpDir,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

/* =====================================================
   BASIC MIDDLEWARE
===================================================== */

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
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
    "en-US-EmmaMultilingualNeural"
  );
}

async function removeFile(file) {
  try {
    await fs.promises.unlink(file);
  } catch {}
}

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (_, res) => {
    res.json({
      ok: true,
      app: "CreatorAI Studio Pro",
      version: "3.0.0",
      ffmpeg: Boolean(ffmpegPath),
      gemini:
        Boolean(process.env.GEMINI_API_KEY),
      features: [
        "AI script",
        "AI voice",
        "automatic music",
        "automatic video",
        "MP4 export",
        "WebM conversion"
      ]
    });
  }
);

/* =====================================================
   FALLBACK AI SCRIPT
===================================================== */

function fallbackScript(prompt, format) {
  const topic =
    cleanText(prompt) ||
    "this topic";

  const scenes = [
    {
      headline: "Here's what you need to know",
      body:
        `Let's quickly understand ${topic} and why it matters.`,
      duration: 5
    },

    {
      headline: "The key idea",
      body:
        `The most important thing is to understand the main idea behind ${topic}.`,
      duration: 5
    },

    {
      headline: "Why it matters",
      body:
        `Knowing this can help you make better decisions and get more value from it.`,
      duration: 5
    },

    {
      headline: "Try this",
      body:
        `Start with one simple step and test what works best for you.`,
      duration: 5
    },

    {
      headline: "One final tip",
      body:
        `Keep learning, testing and improving as you create more content.`,
      duration: 5
    },

    {
      headline: "Follow for more",
      body:
        `Follow, save and share for more useful creator tips.`,
      duration: 4
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
   GEMINI AI SCRIPT
===================================================== */

async function generateAIScript(
  prompt,
  format
) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  /*
    No API key:
    use local fallback so the app
    does not completely break.
  */

  if (!apiKey) {
    console.log(
      "GEMINI_API_KEY not configured. Using fallback."
    );

    return fallbackScript(
      prompt,
      format
    );
  }

  /*
    You can change this in Render
    environment variables.

    Example:
    GEMINI_MODEL=gemini-2.5-flash
  */

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  const formatInfo =
    getFormatInfo(format);

  const instruction = `
You are the professional AI scriptwriter inside CreatorAI Studio Pro.

USER TOPIC:
${prompt}

FORMAT:
${format}

ASPECT RATIO:
${formatInfo.aspectRatio}

Create an engaging social-media video.

Requirements:

- Understand the topic.
- Create an original hook.
- Give useful information.
- Use natural spoken language.
- Make the narration engaging.
- Finish with a natural call to action.
- Do not use markdown.
- Return ONLY JSON.
- Create 5 to 7 scenes.
- Each scene should have headline, body and duration.
- Total narration should normally be around 25 to 45 seconds.

Return exactly:

{
  "title": "short title",
  "voiceScript": "complete narration",
  "scenes": [
    {
      "headline": "short headline",
      "body": "short scene text",
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
              maxOutputTokens: 1800
            }
          })
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Gemini API error:",
        response.status,
        errorText
      );

      return fallbackScript(
        prompt,
        format
      );
    }

    const data =
      await response.json();

    const text =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(
          part =>
            part.text || ""
        )
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

    if (
      !result.voiceScript ||
      !Array.isArray(
        result.scenes
      )
    ) {
      throw new Error(
        "Invalid AI response"
      );
    }

    return {
      title:
        cleanText(
          result.title
        ) ||
        cleanText(prompt)
          .slice(0, 80),

      format,

      aspectRatio:
        formatInfo.aspectRatio,

      voiceScript:
        cleanText(
          result.voiceScript
        ),

      scenes:
        result.scenes
          .slice(0, 8)
          .map(scene => ({
            headline:
              cleanText(
                scene.headline
              ) ||
              "Key idea",

            body:
              cleanText(
                scene.body
              ),

            duration:
              Math.max(
                3,
                Math.min(
                  10,
                  Number(
                    scene.duration
                  ) || 5
                )
              )
          }))
    };

  } catch (error) {
    console.error(
      "Gemini parsing error:",
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
        req.body?.format ||
        "reel";

      if (!prompt) {
        return res
          .status(400)
          .json({
            error:
              "Prompt is required"
          });
      }

      const plan =
        await generateAIScript(
          prompt,
          format
        );

      res.json(plan);

    } catch (error) {
      console.error(
        "AI PLAN ERROR:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "AI planning failed",
          details:
            error.message
        });
    }
  }
);

/* =====================================================
   EDGE TTS
===================================================== */

async function generateVoiceFile(
  text,
  voiceName
) {
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
        rate: "+5%",
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

/* =====================================================
   AI VOICE API
===================================================== */

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
              "Voice text is required"
          });
      }

      const voice =
        getVoiceName(
          req.body?.voice
        );

      const result =
        await generateVoiceFile(
          text,
          voice
        );

      res.json({
        ok: true,
        voice,
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
            "AI voice generation failed",
          details:
            error.message
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
        Number(duration) || 35
      )
    );

  await execFileAsync(
    ffmpegPath,
    [
      "-y",

      "-f",
      "lavfi",

      "-i",
      `sine=frequency=220:duration=${seconds}`,

      "-af",
      "volume=0.025",

      "-ac",
      "2",

      "-ar",
      "44100",

      output
    ]
  );
}

/* =====================================================
   CREATE VIDEO
===================================================== */

async function createVideoFile({
  plan,
  voicePath,
  musicPath,
  format
}) {
  const info =
    getFormatInfo(format);

  const duration =
    plan.scenes.reduce(
      (total, scene) =>
        total +
        (
          Number(
            scene.duration
          ) || 5
        ),
      0
    );

  const finalDuration =
    Math.max(
      5,
      Math.min(
        120,
        Math.ceil(duration)
      )
    );

  const videoFile =
    `creatorai-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.mp4`;

  const videoPath =
    path.join(
      generatedDir,
      videoFile
    );

  /*
    Background video with
    AI voice + generated music.

    The frontend canvas already
    shows the individual scenes.
  */

  await execFileAsync(
    ffmpegPath,
    [
      "-y",

      "-f",
      "lavfi",

      "-i",
      `color=c=0x07111f:s=${info.width}x${info.height}:r=30`,

      "-i",
      voicePath,

      "-i",
      musicPath,

      "-filter_complex",

      "[2:a]volume=0.025[music];" +
      "[1:a]volume=1.0[voice];" +
      "[voice][music]amix=inputs=2:duration=first:dropout_transition=2[audio]",

      "-map",
      "0:v",

      "-map",
      "[audio]",

      "-t",
      String(finalDuration),

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

      videoPath
    ]
  );

  return {
    videoFile,
    videoPath,
    duration: finalDuration
  };
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
        req.body?.format ||
        "reel";

      if (!prompt) {
        return res
          .status(400)
          .json({
            error:
              "Prompt is required"
          });
      }

      console.log(
        "Creating AI video:",
        prompt
      );

      /* 1. AI script */

      const plan =
        await generateAIScript(
          prompt,
          format
        );

      /* 2. AI voice */

      const voice =
        getVoiceName(
          req.body?.voice
        );

      const voiceResult =
        await generateVoiceFile(
          plan.voiceScript,
          voice
        );

      voicePath =
        voiceResult.filePath;

      /* 3. Music */

      const musicFile =
        `music-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.wav`;

      musicPath =
        path.join(
          generatedDir,
          musicFile
        );

      const sceneDuration =
        plan.scenes.reduce(
          (total, scene) =>
            total +
            (
              Number(
                scene.duration
              ) || 5
            ),
          0
        );

      await createBackgroundMusic(
        musicPath,
        sceneDuration
      );

      /* 4. Video */

      const video =
        await createVideoFile({
          plan,
          voicePath,
          musicPath,
          format
        });

      /* 5. Response */

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
            "Automatic video generation failed",

          details:
            error?.message ||
            "Unknown error"
        });

    } finally {

      /*
        Do NOT delete voice/music
        immediately because the frontend
        needs their URLs.
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
            "No video uploaded"
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

          "-pix_fmt",
          "yuv420p",

          "-movflags",
          "+faststart",

          "-c:a",
          "aac",

          "-b:a",
          "128k",

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
              "MP4 conversion failed",
            details:
              error.message
          });
      }
    }
  }
);

/* =====================================================
   GENERATED FILE INFO
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
        files
      });

    } catch {
      res.json({
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
          "Internal server error",
        details:
          error.message
      });
  }
);

/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      "CreatorAI Studio Pro"
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
