import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY가 없습니다. .env 파일에 API 키를 설정하세요.");
}
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "40kb" }));
app.use(express.static(path.join(__dirname, "public"), { index: "index.html", dotfiles: "deny", etag: true, maxAge: "1h" }));

// Render 및 배포 상태 확인용
app.get("/health", (_req, res) => res.json({ ok: true, aiConfigured: !!process.env.OPENAI_API_KEY }));

// 간단한 메모리 기반 요청 제한: 과도한 반복 호출을 줄이기 위한 기본 보호 장치
const requestWindows = new Map();
app.use("/api", (req, res, next) => {
  if (req.method !== "POST" || req.path !== "/chat") return next();
  const key = req.ip || "unknown";
  const now = Date.now();
  for (const [k, v] of requestWindows) if (now - v.start >= 60000) requestWindows.delete(k);
  const windowMs = 60 * 1000;
  const maxRequests = 8;
  const entry = requestWindows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    requestWindows.set(key, { start: now, count: 1 });
    return next();
  }
  if (entry.count >= maxRequests) {
    return res.status(429).json({ error: "요청이 너무 많아요. 1분 정도 기다린 뒤 다시 시도해 주세요." });
  }
  entry.count += 1;
  next();
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI 키가 아직 설정되지 않았어요. Render의 Environment에 OPENAI_API_KEY를 추가해 주세요. 내장 답변은 키 없이 사용할 수 있어요." });
    }
    const body = req.body || {};
    if (JSON.stringify(body).length > 35000) {
      return res.status(413).json({ error: "요청이 너무 커요. 대화 내용을 줄여 다시 시도해 주세요." });
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));
    if (!safeMessages.length || !safeMessages.some((m) => m.role === "user")) {
      return res.status(400).json({ error: "질문을 입력해 주세요." });
    }
    const p = body.profile && typeof body.profile === "object" ? body.profile : {};
    const system = [
      "너는 쑥쑥 스터디의 친절한 AI 학습 도우미다. 자연스러운 한국어로 답하고, 학생이 이해할 수 있게 설명한다.",
      body.studyMode ? "공부 모드가 켜져 있다. 학교 공부, 시험, 학습법, 진로 등 학습과 관련된 질문에 집중한다. 관련 없는 질문은 짧게 안내하고 공부와 연결할 수 있는 도움을 제안한다." : "공부뿐 아니라 일반 주제도 자유롭게 답한다.",
      "대화의 앞뒤 문맥을 고려한다. 사용자가 요청하면 기존 계획을 조정하고, 모르는 정보는 지어내지 않는다. 진단 점수는 참고 자료일 뿐 학생의 능력을 확정적으로 단정하지 않는다.",
      "학생의 저장된 학습 정보를 참고하되, 관련 없는 경우 억지로 언급하지 않는다. 비밀번호나 API 키 같은 비밀정보를 요구하지 않는다.",
      "학습 정보(JSON): " + JSON.stringify(p).slice(0, 10000),
    ].join("\n\n");
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: system,
        input: safeMessages,
        max_output_tokens: 900,
        store: false,
      }),
    });
    if (!upstream.ok) {
      const err = new Error("OpenAI request failed");
      err.status = upstream.status;
      throw err;
    }
    const result = await upstream.json();
    const reply = (result.output || []).flatMap(item => item.content || [])
      .filter(item => item.type === "output_text").map(item => item.text).join("\n").trim();
    res.json({ reply: reply || "답변을 만들지 못했어요. 질문을 조금 바꿔 다시 시도해 주세요." });
  } catch (err) {
    console.error("/api/chat error:", err?.status || "", err?.message || err);
    const message = err?.status === 401
      ? "API 키가 올바른지 확인해 주세요."
      : err?.status === 429
        ? "API 사용 한도나 결제 설정을 확인해 주세요."
        : "AI 요청에 실패했어요. 서버 설정과 인터넷 연결을 확인해 주세요.";
    res.status(err?.status === 429 ? 429 : 502).json({ error: message });
  }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "없는 API 주소예요. /api/chat을 확인해 주세요." }));
app.get(["/study.html", "/ai.html"], (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((err, _req, res, _next) => {
  const status = err.type === "entity.too.large" ? 413 : 400;
  res.status(status).json({ error: status === 413 ? "대화 내용이 너무 커요. 새 대화를 시작해 주세요." : "요청 형식을 확인해 주세요." });
});
app.listen(port, "0.0.0.0", () => console.log(`쑥쑥 스터디 실행 중: http://localhost:${port}`));
