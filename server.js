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

const tmp = path.join(__dirname, "tmp");
const generated = path.join(__dirname, "generated");

fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(generated, { recursive: true });

const upload = multer({ dest: tmp });

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));
app.use("/generated", express.static(generated));

/* =====================================================
   HELPERS
===================================================== */

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeFileName(name) {
  return String(name || "file")
    .replace(/[^a-z0-9_-]/gi, "_")
    .slice(0, 80);
}

function getFormatInfo(format) {
  if (format === "youtube" || format === "long") {
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

/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    app: "CreatorAI Studio Pro",
    version: "2.0.0",
    features: [
      "AI script",
      "AI voice",
      "automatic music",
      "video generation",
      "MP4 export"
    ]
  });
});

/* =====================================================
   GEMINI AI SCRIPT
===================================================== */

async function generateAIScript(prompt, format) {
  const apiKey = process.env.GEMINI_API_KEY;

  /*
    If no Gemini key is configured, use a safe fallback.
    This keeps the app from completely breaking.
  */

  if (!apiKey) {
    return fallbackScript(prompt, format);
  }

  const model =
    process.env.GEMINI_MODEL || "gemini-3.7-flash";

  const formatInfo = getFormatInfo(format);

  const instruction = `
You are the professional AI scriptwriter inside CreatorAI Studio Pro.

Create a short-form social media video.

USER TOPIC:
${prompt}

FORMAT:
${format}

ASPECT RATIO:
${formatInfo.aspectRatio}

Requirements:
- Do NOT simply repeat the user's prompt.
- Understand the topic.
- Create an original engaging hook.
- Explain the topic naturally.
- Make the script sound like a human creator.
- Include useful information.
- End with a natural call to action.
- The voice should sound good when spoken aloud.
- Do not use markdown.
- Do not include explanations outside the JSON.

Return ONLY valid JSON in this exact structure:

{
  "title": "short title",
  "voiceScript": "complete narration",
  "scenes": [
    {
      "headline": "short visual headline",
      "body": "short scene text",
      "duration": 4
    }
  ]
}

Create 5 to 7 scenes.
Total narration should normally fit approximately 25 to 45 seconds.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
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
    const errorText = await response.text();

    console.error(
      "Gemini error:",
      response.status,
      errorText
    );

    return fallbackScript(prompt, format);
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

  if (!text) {
    return fallbackScript(prompt, format);
  }

  let jsonText = text;

  /*
    Sometimes models return:
    ```json
    {...}
    ```
  */

  jsonText = jsonText
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const result = JSON.parse(jsonText);

    if (
      !result.voiceScript ||
      !Array.isArray(result.scenes)
    ) {
      throw new Error("Invalid AI structure");
    }

    return {
      title:
        cleanText(result.title) ||
        cleanText(prompt).slice(0, 80),

      voiceScript:
        cleanText(result.voiceScript),

      scenes:
        result.scenes
          .slice(0, 8)
          .map(scene => ({
            headline:
              cleanText(scene.headline) ||
              "Key idea",

            body:
              cleanText(scene.body) ||
              "",

            duration:
              Math.max(
                3,
                Math.min(
                  10,
                  Number(scene.duration) || 5
                )
              )
          }))
    };
  } catch (error) {
    console.error(
      "Could not parse Gemini JSON:",
      error
    );

    return fallbackScript(prompt, format);
  }
}

/* =====================================================
   FALLBACK SCRIPT
===================================================== */

function fallbackScript(prompt, format) {
  const topic = cleanText(prompt);

  const scenes = [
    {
      headline: "Here's what you need to know",
      body:
        `Let's quickly break down ${topic} and why it matters.`,
      duration: 5
    },

    {
      headline: "The important part",
      body:
        `The key idea is to understand the most useful part of ${topic}.`,
      duration: 5
    },

    {
      headline: "Why it matters",
      body:
        `This can help you make better decisions and get more value from the idea.`,
      duration: 5
    },

    {
      headline: "Try this",
      body:
        `Start with one simple step and test the result for yourself.`,
      duration: 5
    },

    {
      headline: "Final tip",
      body:
        `Keep improving as you learn what works best for you.`,
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
    aspectRatio: getFormatInfo(format).aspectRatio,

    voiceScript: scenes
      .map(scene => scene.body)
      .join(" "),

    scenes
  };
}

/* =====================================================
   AI PLAN
===================================================== */

app.post("/api/ai/plan", async (req, res) => {
  try {
    const prompt =
      cleanText(req.body?.prompt);

    const format =
      req.body?.format || "reel";

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const plan =
      await generateAIScript(
        prompt,
        format
      );

    res.json({
      ...plan,
      format,
      aspectRatio:
        getFormatInfo(format).aspectRatio
    });

  } catch (error) {
    console.error(
      "AI PLAN ERROR:",
      error
    );

    res.status(500).json({
      error: "AI planning failed"
    });
  }
});

/* =====================================================
   AI VOICE
===================================================== */

app.post("/api/ai/voice", async (req, res) => {
  try {
    const text =
      cleanText(req.body?.text);

    const voice =
      req.body?.voice ||
      "en-US-AndrewMultilingualNeural";

    if (!text) {
      return res.status(400).json({
        error: "Voice text is required"
      });
    }

    const fileName =
      `voice-${Date.now()}.mp3`;

    const output =
      path.join(
        generated,
        fileName
      );

    const tts =
      new EdgeTTS(
        text,
        voice,
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

    res.json({
      ok: true,
      voice,
      url:
        `/generated/${fileName}`
    });

  } catch (error) {
    console.error(
      "VOICE ERROR:",
      error
    );

    res.status(500).json({
      error:
        "AI voice generation failed"
    });
  }
});

/* =====================================================
   AUTOMATIC MUSIC
===================================================== */

async function createBackgroundMusic(
  output,
  duration = 35
) {
  /*
    Generates simple royalty-free
    synthetic background music locally
    using FFmpeg.
  */

  const seconds =
    Math.max(
      5,
      Math.min(120, Number(duration) || 35)
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
      "volume=0.035",

      "-ac",
      "2",

      "-ar",
      "44100",

      output
    ]
  );
}

/* =====================================================
   AUTOMATIC VIDEO
===================================================== */

app.post(
  "/api/ai/video",
  async (req, res) => {
    try {
      const prompt =
        cleanText(req.body?.prompt);

      const format =
        req.body?.format || "reel";

      if (!prompt) {
        return res.status(400).json({
          error: "Prompt is required"
        });
      }

      console.log(
        "Creating AI video:",
        prompt
      );

      /*
        1. AI script
      */

      const plan =
        await generateAIScript(
          prompt,
          format
        );

      /*
        2. AI voice
      */

      const voiceName =
        req.body?.voice ||
        "en-US-AndrewMultilingualNeural";

      const voiceFile =
        `voice-${Date.now()}.mp3`;

      const voicePath =
        path.join(
          generated,
          voiceFile
        );

      const tts =
        new EdgeTTS(
          plan.voiceScript,
          voiceName,
          {
            rate: "+5%",
            volume: "+0%",
            pitch: "+0Hz"
          }
        );

      const voiceResult =
        await tts.synthesize();

      const voiceBuffer =
        Buffer.from(
          await voiceResult.audio.arrayBuffer()
        );

      await fs.promises.writeFile(
        voicePath,
        voiceBuffer
      );

      /*
        3. Background music
      */

      const musicFile =
        `music-${Date.now()}.wav`;

      const musicPath =
        path.join(
          generated,
          musicFile
        );

      await createBackgroundMusic(
        musicPath,
        60
      );

      /*
        4. Create simple video canvas
      */

      const info =
        getFormatInfo(format);

      const videoFile =
        `creatorai-${Date.now()}.mp4`;

      const videoPath =
        path.join(
          generated,
          videoFile
        );

      const title =
        safeFileName(
          plan.title || "CreatorAI"
        );

      /*
        Text file prevents complicated
        shell escaping problems.
      */

      const textFile =
        path.join(
          tmp,
          `video-text-${Date.now()}.txt`
        );

      const text =
        [
          plan.title,
          "",
          ...plan.scenes.map(
            s =>
              `${s.headline}\n${s.body}`
          )
        ].join("\n");

      await fs.promises.writeFile(
        textFile,
        text,
        "utf8"
      );

      /*
        5. Render video + voice + music
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

          `[2:a]volume=0.035[music];` +
          `[1:a]volume=1.0[voice];` +
          `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[audio]`,

          "-map",
          "0:v",

          "-map",
          "[audio]",

          "-t",
          "60",

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

      try {
        await fs.promises.unlink(
          textFile
        );
      } catch {}

      res.json({
        ok: true,

        title:
          plan.title,

        format,

        aspectRatio:
          info.aspectRatio,

        voiceScript:
          plan.voiceScript,

        scenes:
          plan.scenes,

        voiceUrl:
          `/generated/${voiceFile}`,

        musicUrl:
          `/generated/${musicFile}`,

        videoUrl:
          `/generated/${videoFile}`
      });

    } catch (error) {
      console.error(
        "VIDEO GENERATION ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Automatic video generation failed",
        details:
          error?.message || "Unknown error"
      });
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
      return res.status(400).json({
        error: "No video uploaded"
      });
    }

    const input =
      req.file.path;

    const output =
      input + ".mp4";

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

          output
        ]
      );

      try {
        await fs.promises.unlink(
          input
        );
      } catch {}

      res.download(
        output,
        "creatorai-video.mp4",
        async () => {
          try {
            await fs.promises.unlink(
              output
            );
          } catch {}
        }
      );

    } catch (error) {

      console.error(
        "MP4 ERROR:",
        error
      );

      try {
        await fs.promises.unlink(
          input
        );
      } catch {}

      res.status(500).json({
        error:
          "MP4 conversion failed"
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
   START
===================================================== */

app.listen(
  PORT,
  () => {
    console.log(
      `CreatorAI Studio Pro running on port ${PORT}`
    );
  }
);
