# CreatorAI Studio Pro

Current build includes a prompt-to-storyboard AI Brain endpoint, editable scenes, 9:16 and 16:9 formats, microphone/audio recording, WebM export, server MP4 conversion, PWA install, and JSON project save/load.

Run:
1. Install Node.js 20+
2. `npm install`
3. `npm start`
4. Open `http://localhost:3000`

Important: the local AI Brain is a working deterministic planner so no paid API is required. It is not a ChatGPT-class LLM. True LLM generation, neural text-to-speech, automatic lip-sync, AI image/video generation, stock media search and automatic YouTube/Instagram/Facebook publishing require external model/platform APIs and permissions.

GitHub Pages can host the frontend, but the Node server is required for MP4 conversion and server endpoints. Android Chrome can install the PWA. Play Store publication is a separate AAB/Play Console step.
