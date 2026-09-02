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


/* =====================================================
   CREATORAI STUDIO PRO
   SERVER v4.0
===================================================== */

const __dirname =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

const execFileAsync =
  promisify(execFile);

const app =
  express();

const PORT =
  Number(
    process.env.PORT || 3000
  );


/* =====================================================
   DIRECTORIES
===================================================== */

const generatedDir =
  path.join(
    __dirname,
    "generated"
  );

const tmpDir =
  path.join(
    __dirname,
    "tmp"
  );


fs.mkdirSync(
  generatedDir,
  {
    recursive: true
  }
);

fs.mkdirSync(
  tmpDir,
  {
    recursive: true
  }
);


/* =====================================================
   UPLOAD
===================================================== */

const upload =
  multer({
    dest: tmpDir,

    limits: {
      fileSize:
        100 * 1024 * 1024
    }
  });


/* =====================================================
   MIDDLEWARE
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


/*
   IMPORTANT:
   Your index.html is in project root,
   not inside public/.
*/

app.use(
  express.static(
    __dirname
  )
);


/*
   Generated files
*/

app.use(
  "/generated",
  express.static(
    generatedDir,
    {
      maxAge: "1h"
    }
  )
);


/* =====================================================
   HELPERS
===================================================== */

function cleanText(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


function safeFileName(
  value
) {

  return (
    cleanText(
      value
    )
      .replace(
        /[^a-z0-9_-]/gi,
        "_"
      )
      .slice(
        0,
        80
      ) ||
    "creatorai"
  );

}


function clamp(
  number,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );

}


/* =====================================================
   FORMAT
===================================================== */

function getFormatInfo(
  format
) {

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


/* =====================================================
   VOICE
===================================================== */

function getVoiceName(
  requestedVoice
) {

  return (
    cleanText(
      requestedVoice
    ) ||
    process.env.TTS_VOICE ||
    "en-US-EmmaMultilingualNeural"
  );

}


/*
   Convert frontend speed:

   0.75 = -25%
   1.00 = normal
   1.25 = +25%
*/

function rateFromSpeed(
  speed
) {

  const value =
    clamp(
      Number(speed) || 1,
      0.75,
      1.25
    );

  const percent =
    Math.round(
      (value - 1) * 100
    );

  return (
    `${percent >= 0 ? "+" : ""}${percent}%`
  );

}


/* =====================================================
   REMOVE FILE
===================================================== */

async function removeFile(
  file
) {

  if (!file)
    return;

  try {

    await fs.promises.unlink(
      file
    );

  } catch {}

}


/* =====================================================
   FONT
===================================================== */

async function findFont(
  bold = false
) {

  const candidates =
    bold

      ? [
          "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
          "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
        ]

      : [
          "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
          "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
        ];


  for (
    const file of candidates
  ) {

    try {

      await fs.promises.access(
        file
      );

      return file;

    } catch {}

  }


  return "";

}


/* =====================================================
   FILTER ESCAPE
===================================================== */

function escapeFilterValue(
  value
) {

  return String(
    value
  )
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /:/g,
      "\\:"
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\[/g,
      "\\["
    )
    .replace(
      /\]/g,
      "\\]"
    );

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
        Boolean(
          ffmpegPath
        ),

      gemini:
        Boolean(
          process.env.GEMINI_API_KEY
        ),

      features: [

        "AI script",

        "AI voice",

        "scene video",

        "background music",

        "MP4 export",

        "WebM conversion",

        "9:16",

        "16:9"

      ]

    });

  }
);


/* =====================================================
   FALLBACK AI SCRIPT
===================================================== */

function fallbackScript(
  prompt,
  format
) {

  const topic =
    cleanText(
      prompt
    ) ||
    "this topic";


  const scenes = [

    {
      headline:
        "The hook",

      body:
        `Here is what you need to know about ${topic}.`,

      duration:
        5
    },

    {
      headline:
        "The key idea",

      body:
        `The most important part of ${topic} is understanding the main idea and how it works.`,

      duration:
        5
    },

    {
      headline:
        "Why it matters",

      body:
        `This matters because it can help you make smarter decisions and get better results.`,

      duration:
        5
    },

    {
      headline:
        "A simple step",

      body:
        `Start with one practical step, test the result, and improve from there.`,

      duration:
        5
    },

    {
      headline:
        "Final tip",

      body:
        `Keep learning and applying what works as you create more content.`,

      duration:
        5
    },

    {
      headline:
        "Call to action",

      body:
        `Follow, save and share for more useful creator tips.`,

      duration:
        4
    }

  ];


  return {

    title:
      topic.slice(
        0,
        80
      ),

    format,

    aspectRatio:
      getFormatInfo(
        format
      ).aspectRatio,

    voiceScript:
      scenes
        .map(
          scene =>
            scene.body
        )
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


  /*
     No API key:
     app still works.
  */

  if (!apiKey) {

    console.log(
      "Gemini key not configured. Using local fallback."
    );

    return fallbackScript(
      prompt,
      format
    );

  }


  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";


  const info =
    getFormatInfo(
      format
    );


  const instruction = `

You are the professional AI scriptwriter
inside CreatorAI Studio Pro.

Create a social media video plan.

TOPIC:
${prompt}

FORMAT:
${format}

ASPECT RATIO:
${info.aspectRatio}

Requirements:

- Create an original hook.
- Give useful information.
- Use natural spoken language.
- Make the narration engaging.
- Create 5 to 7 scenes.
- Every scene needs headline, body and duration.
- Duration must be between 3 and 10 seconds.
- Total narration should normally be 25 to 45 seconds.
- Finish with a natural call to action.
- Do not use markdown.
- Return ONLY valid JSON.

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

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey

          },

          body:
            JSON.stringify({

              contents: [

                {

                  parts: [

                    {
                      text:
                        instruction
                    }

                  ]

                }

              ],

              generationConfig: {

                temperature:
                  0.8,

                maxOutputTokens:
                  1800

              }

            })

        }
      );


    if (
      !response.ok
    ) {

      const errorText =
        await response.text();

      console.error(
        "Gemini API error:",
        response.status,
        errorText
      );

      throw new Error(
        `Gemini returned ${response.status}`
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

      throw new Error(
        "Empty Gemini response"
      );

    }


    const cleaned =
      text
        .replace(
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


    const result =
      JSON.parse(
        cleaned
      );


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


    const scenes =
      result.scenes
        .slice(
          0,
          8
        )
        .map(
          scene => ({

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
              clamp(
                Number(
                  scene.duration
                ) || 5,
                3,
                10
              )

          })
        )
        .filter(
          scene =>
            scene.body
        );


    if (
      !scenes.length
    ) {

      throw new Error(
        "No valid scenes"
      );

    }


    return {

      title:
        cleanText(
          result.title
        ) ||
        cleanText(
          prompt
        ).slice(
          0,
          80
        ),

      format,

      aspectRatio:
        info.aspectRatio,

      voiceScript:
        cleanText(
          result.voiceScript
        ),

      scenes

    };


  } catch (error) {

    console.error(
      "Gemini failed. Fallback used:",
      error.message
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
  async (
    req,
    res
  ) => {

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


      res.json(
        plan
      );


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
   AI VOICE FILE
===================================================== */

async function generateVoiceFile(
  text,
  voiceName,
  speed
) {

  const fileName =
    `voice-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.mp3`;


  const filePath =
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
          rateFromSpeed(
            speed
          ),

        volume:
          "+0%",

        pitch:
          "+0Hz"

      }
    );


  const result =
    await tts.synthesize();


  const audioBuffer =
    Buffer.from(
      await result.audio.arrayBuffer()
    );


  if (
    !audioBuffer.length
  ) {

    throw new Error(
      "TTS returned empty audio"
    );

  }


  await fs.promises.writeFile(
    filePath,
    audioBuffer
  );


  return {

    fileName,

    filePath,

    url:
      `/generated/${fileName}`

  };

}


/* =====================================================
   AI VOICE API
===================================================== */

app.post(
  "/api/ai/voice",
  async (
    req,
    res
  ) => {

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


      const speed =
        clamp(
          Number(
            req.body?.speed
          ) || 1,
          0.75,
          1.25
        );


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
    clamp(
      Number(
        duration
      ) || 35,
      5,
      120
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
   CREATE REAL SCENE VIDEO
===================================================== */

async function createSceneVideo({
  plan,
  voicePath,
  musicPath,
  format
}) {

  const info =
    getFormatInfo(
      format
    );


  const scenes =
    plan.scenes
      .slice(
        0,
        8
      );


  if (
    !scenes.length
  ) {

    throw new Error(
      "No scenes available"
    );

  }


  const headlineFont =
    await findFont(
      true
    );

  const bodyFont =
    await findFont(
      false
    );


  const palette = [

    "0x071a2a",

    "0x10152f",

    "0x102a2a",

    "0x21152f",

    "0x20250f",

    "0x15152a",

    "0x0c2030",

    "0x1c1230"

  ];


  const tempFiles = [];

  const inputArgs = [];

  const filters = [];


  const totalDuration =
    scenes.reduce(
      (
        total,
        scene
      ) => {

        return (
          total +
          clamp(
            Number(
              scene.duration
            ) || 5,
            3,
            10
          )
        );

      },
      0
    );


  try {

    /* ================================================
       CREATE EACH SCENE
    ================================================ */

    for (
      let i = 0;
      i < scenes.length;
      i++
    ) {

      const scene =
        scenes[i];


      const duration =
        clamp(
          Number(
            scene.duration
          ) || 5,
          3,
          10
        );


      const headlineFile =
        path.join(
          tmpDir,
          `headline-${Date.now()}-${i}.txt`
        );


      const bodyFile =
        path.join(
          tmpDir,
          `body-${Date.now()}-${i}.txt`
        );


      await fs.promises.writeFile(
        headlineFile,
        cleanText(
          scene.headline
        ),
        "utf8"
      );


      await fs.promises.writeFile(
        bodyFile,
        cleanText(
          scene.body
        ),
        "utf8"
      );


      tempFiles.push(
        headlineFile,
        bodyFile
      );


      /*
         Scene video input
      */

      inputArgs.push(
        "-f",
        "lavfi",
        "-t",
        String(duration),
        "-i",
        `color=c=${palette[i % palette.length]}:s=${info.width}x${info.height}:r=30`
      );


      const videoInput =
        `[${i}:v]`;


      const videoFilters = [];


      /*
         Headline
      */

      if (
        headlineFont
      ) {

        videoFilters.push(

          `drawtext=fontfile='${escapeFilterValue(
            headlineFont
          )}':textfile='${escapeFilterValue(
            headlineFile
          )}':fontcolor=white:fontsize=${Math.round(
            info.width * 0.062
          )}:line_spacing=10:x=70:y=${Math.round(
            info.height * 0.35
          )}:box=1:boxcolor=black@0.20:boxborderw=24`

        );

      } else {

        videoFilters.push(

          `drawtext=textfile='${escapeFilterValue(
            headlineFile
          )}':fontcolor=white:fontsize=${Math.round(
            info.width * 0.062
          )}:x=70:y=${Math.round(
            info.height * 0.35
          )}`

        );

      }


      /*
         Body
      */

      if (
        bodyFont
      ) {

        videoFilters.push(

          `drawtext=fontfile='${escapeFilterValue(
            bodyFont
          )}':textfile='${escapeFilterValue(
            bodyFile
          )}':fontcolor=0xb8c2d5:fontsize=${Math.round(
            info.width * 0.028
          )}:line_spacing=8:x=70:y=${Math.round(
            info.height * 0.60
          )}:box=1:boxcolor=black@0.15:boxborderw=18`

        );

      } else {

        videoFilters.push(

          `drawtext=textfile='${escapeFilterValue(
            bodyFile
          )}':fontcolor=0xb8c2d5:fontsize=${Math.round(
            info.width * 0.028
          )}:x=70:y=${Math.round(
            info.height * 0.60
          )}`

        );

      }


      /*
         CreatorAI label
      */

      videoFilters.push(

        `drawtext=text='CREATORAI  •  AI VIDEO':fontcolor=0x28d5f5:fontsize=${Math.round(
          info.width * 0.026
        )}:x=70:y=55`

      );


      /*
         Scene number
      */

      videoFilters.push(

        `drawtext=text='SCENE ${i + 1}':fontcolor=white@0.55:fontsize=${Math.round(
          info.width * 0.024
        )}:x=w-tw-70:y=h-90`

      );


      filters.push(

        `${videoInput}${videoFilters.join(
          ","
        )},format=yuv420p[v${i}]`

      );

    }


    /* ================================================
       CONCAT SCENES
    ================================================ */

    const concatInputs =
      scenes
        .map(
          (_, i) =>
            `[v${i}]`
        )
        .join("");


    filters.push(

      `${concatInputs}concat=n=${scenes.length}:v=1:a=0,format=yuv420p[v]`

    );


    /* ================================================
       AUDIO
    ================================================ */

    const voiceIndex =
      scenes.length;

    const musicIndex =
      scenes.length + 1;


    filters.push(

      `[${voiceIndex}:a]volume=1.0[voice]`

    );


    filters.push(

      `[${musicIndex}:a]volume=0.018[music]`

    );


    filters.push(

      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]`

    );


    /* ================================================
       OUTPUT
    ================================================ */

    const videoName =
      `creatorai-${safeFileName(
        plan.title
      )}-${Date.now()}.mp4`;


    const videoPath =
      path.join(
        generatedDir,
        videoName
      );


    const args = [

      "-y",

      ...inputArgs,

      "-i",
      voicePath,

      "-i",
      musicPath,

      "-filter_complex",
      filters.join(";"),

      "-map",
      "[v]",

      "-map",
      "[a]",

      "-t",
      String(
        Math.ceil(
          totalDuration
        )
      ),

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

    ];


    await execFileAsync(
      ffmpegPath,
      args,
      {
        maxBuffer:
          8 * 1024 * 1024
      }
    );


    return {

      fileName:
        videoName,

      filePath:
        videoPath,

      duration:
        Math.ceil(
          totalDuration
        )

    };


  } finally {

    await Promise.all(
      tempFiles.map(
        removeFile
      )
    );

  }

}


/* =====================================================
   COMPLETE AI VIDEO
===================================================== */

app.post(
  "/api/ai/video",
  async (
    req,
    res
  ) => {

    let voicePath =
      null;

    let musicPath =
      null;


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
        "================================"
      );

      console.log(
        "Creating CreatorAI video..."
      );

      console.log(
        "Prompt:",
        prompt
      );


      /* ==============================================
         IMPORTANT:
         USE EXISTING PLAN FROM FRONTEND
         instead of generating another one.
      ============================================== */

      let plan =
        req.body?.plan;


      if (
        !plan ||
        !Array.isArray(
          plan.scenes
        ) ||
        !plan.voiceScript
      ) {

        console.log(
          "No existing plan received. Generating one."
        );


        plan =
          await generateAIScript(
            prompt,
            format
          );

      } else {

        plan = {

          ...plan,

          format,

          aspectRatio:
            getFormatInfo(
              format
            ).aspectRatio,

          title:
            cleanText(
              plan.title
            ) ||
            cleanText(
              prompt
            ).slice(
              0,
              80
            ),

          voiceScript:
            cleanText(
              plan.voiceScript
            ),

          scenes:
            plan.scenes
              .slice(
                0,
                8
              )
              .map(
                scene => ({

                  headline:
                    cleanText(
                      scene.headline
                    ) ||
                    "Scene",

                  body:
                    cleanText(
                      scene.body
                    ),

                  duration:
                    clamp(
                      Number(
                        scene.duration
                      ) || 5,
                      3,
                      10
                    )

                })
              )
              .filter(
                scene =>
                  scene.body
              )

        };

      }


      if (
        !plan.scenes.length
      ) {

        throw new Error(
          "Video plan contains no scenes"
        );

      }


      /* ==============================================
         VOICE
      ============================================== */

      const voice =
        getVoiceName(
          req.body?.voice
        );


      const speed =
        clamp(
          Number(
            req.body?.voiceSpeed
          ) || 1,
          0.75,
          1.25
        );


      /*
         Try to reuse voice generated
         by /api/ai/voice.
      */

      const requestedVoiceUrl =
        cleanText(
          req.body?.voiceUrl
        );


      if (
        requestedVoiceUrl.startsWith(
          "/generated/"
        )
      ) {

        const fileName =
          path.basename(
            requestedVoiceUrl
          );


        const candidate =
          path.join(
            generatedDir,
            fileName
          );


        try {

          await fs.promises.access(
            candidate
          );

          voicePath =
            candidate;


          console.log(
            "Using existing AI voice:",
            fileName
          );

        } catch {

          console.log(
            "Existing voice not found. Generating new voice."
          );

        }

      }


      /*
         Generate only if required.
      */

      if (!voicePath) {

        console.log(
          "Generating AI voice..."
        );


        const voiceResult =
          await generateVoiceFile(
            plan.voiceScript,
            voice,
            speed
          );


        voicePath =
          voiceResult.filePath;

      }


      /* ==============================================
         MUSIC
      ============================================== */

      const musicName =
        `music-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.wav`;


      musicPath =
        path.join(
          generatedDir,
          musicName
        );


      const sceneDuration =
        plan.scenes.reduce(
          (
            total,
            scene
          ) =>
            total +
            (
              Number(
                scene.duration
              ) || 5
            ),
          0
        );


      console.log(
        "Creating background music..."
      );


      await createBackgroundMusic(
        musicPath,
        sceneDuration
      );


      /* ==============================================
         VIDEO
      ============================================== */

      console.log(
        "Rendering scene video..."
      );


      const video =
        await createSceneVideo({

          plan,

          voicePath,

          musicPath,

          format

        });


      /* ==============================================
         RESPONSE
      ============================================== */

      console.log(
        "Video complete:",
        video.fileName
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

        voiceUrl:
          `/generated/${path.basename(
            voicePath
          )}`,

        musicUrl:
          `/generated/${musicName}`,

        videoUrl:
          `/generated/${video.fileName}`,

        duration:
          video.duration

      });


    } catch (error) {

      console.error(
        "================================"
      );

      console.error(
        "VIDEO GENERATION ERROR"
      );

      console.error(
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

    }

  }
);


/* =====================================================
   MP4 CONVERSION
===================================================== */

app.post(
  "/api/convert/mp4",
  upload.single(
    "video"
  ),
  async (
    req,
    res
  ) => {

    if (
      !req.file
    ) {

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


      if (
        !res.headersSent
      ) {

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
   GENERATED FILES
===================================================== */

app.get(
  "/api/generated",
  async (
    _,
    res
  ) => {

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
   EXPRESS 5 COMPATIBLE
===================================================== */

app.get(
  "/{*splat}",
  (
    _,
    res
  ) => {

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
          "Internal server error",

        details:
          error?.message ||
          "Unknown error"

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
      "CreatorAI Studio Pro v4.0"
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
