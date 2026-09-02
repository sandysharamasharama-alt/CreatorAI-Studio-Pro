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
const exec = promisify(execFile);
const app = express();
const PORT = Number(process.env.PORT || 3000);

const tmp = path.join(__dirname, "tmp");
const generated = path.join(__dirname, "generated");

fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(generated, { recursive: true });

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(express.static(__dirname));
app.use("/generated", express.static(generated));

const upload = multer({
  dest: tmp,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

const clean = value =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const formatInfo = format =>
  format === "youtube" || format === "long"
    ? {
        aspectRatio: "16:9",
        width: 1280,
        height: 720
      }
    : {
        aspectRatio: "9:16",
        width: 720,
        height: 1280
      };

const generatedUrl = filename =>
  `/generated/${encodeURIComponent(filename)}`;

const removeFile = async file => {
  try {
    await fs.promises.unlink(file);
  } catch {}
};

const runFFmpeg = async args =>
  exec(ffmpegPath, args, {
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });

function voiceRate(speed) {
  const value = Math.max(
    0.75,
    Math.min(1.5, Number(speed) || 1)
  );

  const percent =
    Math.round((value - 1) * 100);

  return `${percent >= 0 ? "+" : ""}${percent}%`;
}

function voiceName(value) {
  return (
    clean(value) ||
    process.env.TTS_VOICE ||
    "en-US-AndrewMultilingualNeural"
  );
}

/* =====================================================
   FALLBACK SCRIPT
===================================================== */

function fallbackScript(prompt, format) {
  const topic =
    clean(prompt) || "this topic";

  const scenes = [
    {
      headline: "The hook",
      body:
        `Here is the simple idea behind ${topic}.`,
      duration: 5
    },
    {
      headline: "The key idea",
      body:
        `The most important part is understanding what makes ${topic} useful.`,
      duration: 5
    },
    {
      headline: "Why it matters",
      body:
        "This matters because it can help you learn faster and make better decisions.",
      duration: 5
    },
    {
      headline: "A practical step",
      body:
        "Start with one small step, test it, and improve the result.",
      duration: 5
    },
    {
      headline: "Creator tip",
      body:
        "Keep the message clear, visual and easy to remember.",
      duration: 5
    },
    {
      headline: "Call to action",
      body:
        "Save this video and follow for more useful creator content.",
      duration: 4
    }
  ];

  return {
    title: topic.slice(0, 80),
    format,
    aspectRatio: formatInfo(format).aspectRatio,
    voiceScript: scenes
      .map(scene => scene.body)
      .join(" "),
    scenes
  };
}

/* =====================================================
   NORMALIZE AI RESULT
===================================================== */

function normalizePlan(data, prompt, format) {
  const scenes = (
    Array.isArray(data?.scenes)
      ? data.scenes
      : []
  )
    .slice(0, 8)
    .map((scene, index) => ({
      headline:
        clean(scene?.headline) ||
        `Scene ${index + 1}`,

      body:
        clean(scene?.body),

      duration:
        Math.max(
          3,
          Math.min(
            12,
            Number(scene?.duration) || 5
          )
        )
    }))
    .filter(scene => scene.body);

  if (!scenes.length) {
    return fallbackScript(
      prompt,
      format
    );
  }

  return {
    title:
      clean(data?.title) ||
      clean(prompt).slice(0, 80),

    format,

    aspectRatio:
      formatInfo(format).aspectRatio,

    voiceScript:
      clean(data?.voiceScript) ||
      scenes.map(s => s.body).join(" "),

    scenes
  };
}

/* =====================================================
   GEMINI AI PLAN
===================================================== */

async function generateAIPlan(
  prompt,
  format
) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(
      "GEMINI_API_KEY not configured. Using fallback."
    );

    return fallbackScript(
      prompt,
      format
    );
  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  const instruction = `
Create a professional social-media video plan.

Topic:
${prompt}

Format:
${format}

Requirements:
- Create a strong hook.
- Give useful information.
- Use natural spoken language.
- Create 5 to 8 scenes.
- Each scene must contain headline, body and duration.
- Duration must be between 3 and 12 seconds.
- Create a complete narration.
- Finish with a natural call to action.
- Return ONLY valid JSON.
- Do not use markdown.

Return exactly:

{
  "title": "short title",
  "voiceScript": "complete narration",
  "scenes": [
    {
      "headline": "short headline",
      "body": "spoken text",
      "duration": 5
    }
  ]
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`,
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
            maxOutputTokens: 2200
          }
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status
      );

      return fallbackScript(
        prompt,
        format
      );
    }

    const data =
      await response.json();

    let text =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    text =
      text
        ?.replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();

    return normalizePlan(
      JSON.parse(text),
      prompt,
      format
    );

  } catch (error) {
    console.error(
      "Gemini error:",
      error.message
    );

    return fallbackScript(
      prompt,
      format
    );
  }
}

/* =====================================================
   AI VOICE
===================================================== */

async function generateVoiceFile(
  text,
  voice,
  speed
) {
  const filename =
    `voice-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.mp3`;

  const file =
    path.join(
      generated,
      filename
    );

  const tts =
    new EdgeTTS(
      text,
      voice,
      {
        rate: voiceRate(speed),
        volume: "+0%",
        pitch: "+0Hz"
      }
    );

  const result =
    await tts.synthesize();

  const buffer =
    Buffer.from(
      await result.audio.arrayBuffer()
    );

  if (!buffer.length) {
    throw new Error(
      "TTS returned empty audio."
    );
  }

  await fs.promises.writeFile(
    file,
    buffer
  );

  return {
    file,
    filename,
    url:
      generatedUrl(filename)
  };
}

/* =====================================================
   BACKGROUND MUSIC
===================================================== */

async function createMusic(
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

  await runFFmpeg([
    "-y",

    "-f",
    "lavfi",
    "-i",
    `sine=frequency=196:duration=${seconds}`,

    "-f",
    "lavfi",
    "-i",
    `sine=frequency=246.94:duration=${seconds}`,

    "-f",
    "lavfi",
    "-i",
    `sine=frequency=293.66:duration=${seconds}`,

    "-filter_complex",
    "[0:a]volume=.018[a];" +
      "[1:a]volume=.012[b];" +
      "[2:a]volume=.009[c];" +
      "[a][b][c]amix=3:duration=longest," +
      "lowpass=f=1800," +
      "afade=t=in:d=1," +
      `afade=t=out:st=${Math.max(
        1,
        seconds - 2
      )}:d=2`,

    "-ac",
    "2",

    "-ar",
    "44100",

    "-c:a",
    "pcm_s16le",

    output
  ]);
}

/* =====================================================
   FFMPEG TEXT HELPERS
===================================================== */

function escapeFFmpegText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

function wrapText(text, maxChars) {
  const lines = [];
  let line = "";

  for (
    const word of clean(text).split(" ")
  ) {
    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      test.length > maxChars &&
      line
    ) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.slice(0, 6);
}

function findFont(bold = true) {
  const fonts = bold
    ? [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
      ]
    : [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
      ];

  return (
    fonts.find(
      file => fs.existsSync(file)
    ) || null
  );
}

/* =====================================================
   CREATE ONE SCENE
===================================================== */

async function createSceneClip(
  scene,
  index,
  total,
  info,
  output
) {
  const duration =
    Math.max(
      3,
      Math.min(
        12,
        Number(scene.duration) || 5
      )
    );

  const font =
    findFont(true) ||
    findFont(false);

  const filters = [];

  const bodyLines =
    wrapText(
      scene.body,
      info.width > 1000
        ? 52
        : 30
    );

  if (font) {
    const fontFile =
      font.replace(/'/g, "\\'");

    filters.push(
      `drawtext=fontfile='${fontFile}':` +
        `text='CREATORAI • AI VIDEO':` +
        `x=55:y=50:` +
        `fontsize=${Math.round(
          info.width * 0.025
        )}:` +
        `fontcolor=0x07111f:` +
        `box=1:` +
        `boxcolor=0x28d5f5:` +
        `boxborderw=18`
    );

    filters.push(
      `drawtext=fontfile='${fontFile}':` +
        `text='${escapeFFmpegText(
          scene.headline
        )}':` +
        `x=70:` +
        `y=${Math.round(
          info.height * 0.34
        )}:` +
        `fontsize=${Math.round(
          info.width * 0.062
        )}:` +
        `fontcolor=white:` +
        `shadowx=2:` +
        `shadowy=2:` +
        `shadowcolor=black@.5`
    );

    bodyLines.forEach(
      (line, lineIndex) => {
        filters.push(
          `drawtext=fontfile='${fontFile}':` +
            `text='${escapeFFmpegText(
              line
            )}':` +
            `x=70:` +
            `y=${Math.round(
              info.height *
                0.58 +
                lineIndex *
                  info.height *
                  0.055
            )}:` +
            `fontsize=${Math.round(
              info.width * 0.028
            )}:` +
            `fontcolor=0xb8c2d5`
        );
      }
    );

    filters.push(
      `drawtext=fontfile='${fontFile}':` +
        `text='SCENE ${index + 1} / ${total}':` +
        `x=70:` +
        `y=${info.height - 135}:` +
        `fontsize=${Math.round(
          info.width * 0.018
        )}:` +
        `fontcolor=0xd7dbea`
    );
  }

  filters.push(
    `drawbox=x=70:y=${
      info.height - 90
    }:w=${
      info.width - 140
    }:h=6:color=0x28d5f5:t=fill`
  );

  filters.push(
    "format=yuv420p"
  );

  filters.push(
    "fade=t=in:d=.3"
  );

  filters.push(
    `fade=t=out:st=${Math.max(
      0.5,
      duration - 0.3
    )}:d=.3`
  );

  const backgrounds = [
    "0x07111f",
    "0x10182a",
    "0x0b2026",
    "0x17102a",
    "0x10201a",
    "0x20170d"
  ];

  await runFFmpeg([
    "-y",

    "-f",
    "lavfi",

    "-i",
    `color=c=${
      backgrounds[
        index % backgrounds.length
      ]
    }:s=${info.width}x${
      info.height
    }:r=30:d=${duration}`,

    "-vf",
    filters.join(","),

    "-an",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "21",

    "-pix_fmt",
    "yuv420p",

    output
  ]);
}

/* =====================================================
   CREATE COMPLETE VIDEO
===================================================== */

async function createVideoFile(
  plan,
  voicePath,
  musicPath,
  format
) {
  const info =
    formatInfo(format);

  const clips = [];

  try {
    for (
      let i = 0;
      i < plan.scenes.length;
      i++
    ) {
      const clip =
        path.join(
          tmp,
          `scene-${Date.now()}-${i}.mp4`
        );

      await createSceneClip(
        plan.scenes[i],
        i,
        plan.scenes.length,
        info,
        clip
      );

      clips.push(clip);
    }

    const list =
      path.join(
        tmp,
        `list-${Date.now()}.txt`
      );

    await fs.promises.writeFile(
      list,
      clips
        .map(
          file =>
            `file '${file.replace(
              /'/g,
              "'\\''"
            )}'`
        )
        .join("\n")
    );

    const silent =
      path.join(
        tmp,
        `silent-${Date.now()}.mp4`
      );

    await runFFmpeg([
      "-y",

      "-f",
      "concat",

      "-safe",
      "0",

      "-i",
      list,

      "-c",
      "copy",

      silent
    ]);

    await removeFile(list);

    const filename =
      `creatorai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.mp4`;

    const output =
      path.join(
        generated,
        filename
      );

    await runFFmpeg([
      "-y",

      "-i",
      silent,

      "-i",
      voicePath,

      "-i",
      musicPath,

      "-filter_complex",
      "[1:a]volume=1[v];" +
        "[2:a]volume=.18[m];" +
        "[v][m]amix=2:" +
        "duration=first:" +
        "dropout_transition=2[a]",

      "-map",
      "0:v",

      "-map",
      "[a]",

      "-c:v",
      "copy",

      "-c:a",
      "aac",

      "-b:a",
      "128k",

      "-shortest",

      "-movflags",
      "+faststart",

      output
    ]);

    await removeFile(
      silent
    );

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

    return {
      filename,
      duration
    };

  } finally {
    for (
      const clip of clips
    ) {
      await removeFile(
        clip
      );
    }
  }
}

/* =====================================================
   LOCAL GENERATED VOICE VALIDATION
===================================================== */

function getLocalGeneratedFile(
  fileUrl
) {
  if (!fileUrl) {
    return null;
  }

  try {
    const pathname =
      new URL(
        fileUrl,
        "http://localhost"
      ).pathname;

    const filename =
      decodeURIComponent(
        pathname.replace(
          "/generated/",
          ""
        )
      );

    if (
      !filename ||
      filename.includes("/") ||
      filename.includes("..")
    ) {
      return null;
    }

    const file =
      path.resolve(
        generated,
        filename
      );

    const root =
      path.resolve(
        generated
      ) + path.sep;

    if (
      !file.startsWith(root)
    ) {
      return null;
    }

    return file;

  } catch {
    return null;
  }
}

/* =====================================================
   HEALTH
===================================================== */

app.get(
  "/api/health",
  (_, res) => {
    res.json({
      ok: true,
      app:
        "CreatorAI Studio Pro",
      version:
        "4.0.0",
      ffmpeg:
        Boolean(ffmpegPath),
      gemini:
        Boolean(
          process.env.GEMINI_API_KEY
        ),
      tts: true,
      video: true,
      mp4: true
    });
  }
);

/* =====================================================
   AI PLAN API
===================================================== */

app.post(
  "/api/ai/plan",
  async (req, res) => {
    try {
      const prompt =
        clean(req.body?.prompt);

      const format =
        clean(
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
        await generateAIPlan(
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
            error.message
        });
    }
  }
);

/* =====================================================
   AI VOICE API
===================================================== */

app.post(
  "/api/ai/voice",
  async (req, res) => {
    try {
      const text =
        clean(
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
        voiceName(
          req.body?.voice
        );

      const speed =
        Number(
          req.body?.speed
        ) || 1;

      const result =
        await generateVoiceFile(
          text,
          voice,
          speed
        );

      res.json({
        ok: true,
        voice,
        speed,
        url:
          result.url
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
            error.message
        });
    }
  }
);

/* =====================================================
   COMPLETE AI VIDEO API
===================================================== */

app.post(
  "/api/ai/video",
  async (req, res) => {
    try {
      const prompt =
        clean(
          req.body?.prompt
        );

      const format =
        clean(
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
        "Creating CreatorAI video:",
        prompt
      );

      /*
       * IMPORTANT:
       * Use the plan already generated
       * by the frontend whenever possible.
       */

      const plan =
        req.body?.plan?.scenes
          ? normalizePlan(
              req.body.plan,
              prompt,
              format
            )
          : await generateAIPlan(
              prompt,
              format
            );

      /*
       * Reuse the already generated
       * voice file if it exists.
       */

      let voicePath =
        getLocalGeneratedFile(
          req.body?.voiceUrl
        );

      let voiceUrl =
        req.body?.voiceUrl || "";

      if (
        !voicePath ||
        !fs.existsSync(
          voicePath
        )
      ) {
        const voiceResult =
          await generateVoiceFile(
            plan.voiceScript,
            voiceName(
              req.body?.voice
            ),
            req.body?.voiceSpeed
          );

        voicePath =
          voiceResult.file;

        voiceUrl =
          voiceResult.url;
      }

      /*
       * Music
       */

      const totalDuration =
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

      const musicFilename =
        `music-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.wav`;

      const musicPath =
        path.join(
          generated,
          musicFilename
        );

      await createMusic(
        musicPath,
        totalDuration
      );

      /*
       * Final video
       */

      const video =
        await createVideoFile(
          plan,
          voicePath,
          musicPath,
          format
        );

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

        voiceUrl,

        musicUrl:
          generatedUrl(
            musicFilename
          ),

        videoUrl:
          generatedUrl(
            video.filename
          ),

        duration:
          Math.ceil(
            video.duration
          )
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
    }
  }
);

/* =====================================================
   WEBM -> MP4
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
      await runFFmpeg([
        "-y",

        "-i",
        input,

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-crf",
        "21",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-movflags",
        "+faststart",

        output
      ]);

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

      if (
        !res.headersSent
      ) {
        res
          .status(500)
          .json({
            error:
              "MP4 conversion failed.",
            details:
              error.message
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
    const files =
      await fs.promises
        .readdir(generated)
        .catch(() => []);

    res.json({
      files
    });
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
  (
    error,
    _,
    res,
    __
  ) => {
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
