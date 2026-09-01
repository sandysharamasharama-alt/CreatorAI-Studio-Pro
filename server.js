import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {execFile} from "child_process";
import ffmpegPath from "ffmpeg-static";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(), PORT=process.env.PORT||3000;
const tmp=path.join(__dirname,"tmp"); fs.mkdirSync(tmp,{recursive:true});
const upload=multer({dest:tmp});
app.use(express.json({limit:"10mb"})); app.use(express.static(path.join(__dirname,"public")));
app.get("/api/health",(_,r)=>r.json({ok:true,app:"CreatorAI Studio Pro",version:"1.0.0"}));
app.post("/api/ai/plan",(req,res)=>{
  const p=String(req.body?.prompt||"").trim(), format=req.body?.format||"reel";
  if(!p)return res.status(400).json({error:"Prompt is required"});
  const d=format==="status"?4:format==="long"?8:6;
  const scenes=[
    {headline:p.slice(0,90),body:"Hook the viewer immediately with a clear, useful idea.",duration:d},
    {headline:"The key idea",body:"Explain the most valuable point with fast, readable visuals.",duration:d},
    {headline:"Make it actionable",body:"Show the viewer exactly what to do next.",duration:d},
    {headline:"Call to action",body:"Follow, save and share for more.",duration:4}
  ];
  res.json({title:p.slice(0,90),format,aspectRatio:(format==="youtube"||format==="long")?"16:9":"9:16",
    voiceScript:scenes.map(s=>s.headline+". "+s.body).join(" "),scenes});
});
app.post("/api/convert/mp4",upload.single("video"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"No video uploaded"});
  const input=req.file.path, output=input+".mp4";
  execFile(ffmpegPath,["-y","-i",input,"-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart","-c:a","aac",output],err=>{
    try{fs.unlinkSync(input)}catch{}
    if(err)return res.status(500).json({error:"MP4 conversion failed"});
    res.download(output,"creatorai-video.mp4",()=>{try{fs.unlinkSync(output)}catch{}});
  });
});
app.get("*",(_,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("CreatorAI Studio Pro running on "+PORT));
