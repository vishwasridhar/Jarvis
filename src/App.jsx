import { useState, useRef, useEffect } from "react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SYSTEM = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), a highly intelligent, loyal, and witty AI assistant inspired by Tony Stark's AI.
- Speak with calm confidence, subtle British wit
- Address the user respectfully 
- If the user's gender is male, occasionally use "sir"
- If the user's gender is female, occasionally use "madam"
- If gender is unknown, use neutral terms such as "boss", "captain", or simply avoid titles
- Be concise but insightful
- Use phrases like "Right away", "Certainly", "As you wish"
- Help with coding, math, science, questions, advice`
  - Always use Markdown formatting.
- Use headings (##) for sections.
- Use bullet points for lists.
- Use numbered lists for steps.
- Leave a blank line between paragraphs.
- Format code using triple backticks.
- Never return large walls of text.
  ;

export default function Jarvis() {
  const [messages, setMessages] = useState([
    { role: "jarvis", text: "Good day, sir. I am J.A.R.V.I.S — online and fully operational. How may I assist you?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const chatRef = useRef(null);
  const history = useRef([]);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === "en-GB") || voices.find(v => v.lang.startsWith("en"));
    if (v) u.voice = v;
    u.rate = 0.92; u.pitch = 0.82;
    speechSynthesis.speak(u);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text }]);
    history.current.push({ role: "user", content: text });

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM },
            ...history.current
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "I encountered a system error, sir. Please try again.";
      history.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "jarvis", text: reply }]);
      speak(reply);
    } catch  {
      setMessages(prev => [...prev, { role: "jarvis", text: "Connectivity issue detected, sir. Please check your API key and try again." }]);
    }
    setLoading(false);
  };

  // ── Click once to START, click again to STOP ──
  const toggleMic = async () => {
    if (listening) {
      // STOP recording
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
      setListening(false);
      setTranscript("Processing your voice...");
    } else {
      // START recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRef.current = mr;

        mr.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          await transcribeAudio(blob);
        };

        mr.start();
        setListening(true);
        setTranscript("");
      } catch  {
        alert("Microphone access denied. Please allow mic permission and try again.");
      }
    }
  };

  const transcribeAudio = async (blob) => {
    setTranscript("Transcribing...");
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "en");

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: formData
      });
      const data = await res.json();
      const text = data.text?.trim();
      if (text) {
        setTranscript("");
        await sendMessage(text);
      } else {
        setTranscript("Could not understand. Try again.");
        setTimeout(() => setTranscript(""), 2000);
      }
    } catch {
      setTranscript("Transcription failed. Try again.");
      setTimeout(() => setTranscript(""), 2000);
    }
  };

  const C = {
    bg: "#020b18", core: "#00d4ff", dim: "#4a7a99",
    panel: "rgba(0,60,100,0.25)", border: "rgba(0,212,255,0.18)",
    warn: "#ff6a00", text: "#cce8ff"
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Courier New', monospace", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* Header */}
      <div style={{ width: "100%", padding: "13px 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,10,25,0.95)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.core, boxShadow: `0 0 10px ${C.core}` }}/>
        <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: 6, color: C.core, textShadow: `0 0 18px ${C.core}` }}>J.A.R.V.I.S</span>
        <span style={{ fontSize: "0.6rem", color: C.dim, letterSpacing: 2 }}>ONLINE · GROQ POWERED</span>
      </div>

      {/* Arc Reactor */}
      <div style={{ margin: "24px auto 4px", position: "relative", width: 130, height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="130" height="130" style={{ position: "absolute", animation: "spin 3s linear infinite" }}>
          <circle cx="65" cy="65" r="60" fill="none" stroke={listening ? C.warn : C.core} strokeWidth="1.5" strokeDasharray="150 80"/>
        </svg>
        <svg width="106" height="106" style={{ position: "absolute", animation: "spinR 5s linear infinite" }}>
          <circle cx="53" cy="53" r="48" fill="none" stroke="#0055aa" strokeWidth="1.5" strokeDasharray="90 60"/>
        </svg>
        <div style={{
          width: 65, height: 65, borderRadius: "50%",
          background: listening
            ? `radial-gradient(circle, ${C.warn} 0%, #aa3300 60%, #1a0800 100%)`
            : loading
            ? "radial-gradient(circle, #ffaa00 0%, #664400 60%, #1a1000 100%)"
            : `radial-gradient(circle, ${C.core} 0%, #005577 60%, #001a2e 100%)`,
          boxShadow: listening ? `0 0 30px ${C.warn}` : `0 0 30px ${C.core}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.45rem", fontWeight: 700, letterSpacing: 1, color: "#fff", transition: "all 0.3s"
        }}>
          {listening ? "REC" : loading ? "THINK" : "ACTIVE"}
        </div>
      </div>

      {/* Transcript hint */}
      {transcript && (
        <div style={{ fontSize: "0.7rem", color: C.warn, letterSpacing: 1, marginBottom: 4, padding: "0 12px", textAlign: "center" }}>{transcript}</div>
      )}

      {/* Mic status hint */}
      {listening && (
        <div style={{ fontSize: "0.68rem", color: C.warn, letterSpacing: 1, marginBottom: 4, animation: "pulse 1s infinite" }}>
          🔴 Recording... Click 🎤 again to stop & send
        </div>
      )}

      {/* Chat */}
      <div ref={chatRef} style={{ width: "100%", maxWidth: 680, padding: "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "42vh", marginTop: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            padding: "10px 13px", borderRadius: 4, fontSize: "0.78rem", lineHeight: 1.65,whiteSpace: "pre-wrap",
wordBreak: "break-word",
            borderLeft: `3px solid ${m.role === "jarvis" ? C.core : "#0055aa"}`,
            background: m.role === "jarvis" ? C.panel : "rgba(0,80,140,0.18)",
            textAlign: m.role === "user" ? "right" : "left"
          }}>
            <span style={{ color: m.role === "jarvis" ? C.core : "#0077cc", fontWeight: 700, fontSize: "0.62rem", letterSpacing: 2 }}>
              {m.role === "jarvis" ? "JARVIS › " : "YOU › "}
            </span>
            <div style={{ whiteSpace: "pre-wrap" }}>
  {m.text}
</div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: "10px 13px", borderRadius: 4, fontSize: "0.78rem", borderLeft: `3px solid ${C.warn}`, background: "rgba(50,20,0,0.2)", color: C.dim }}>
            <span style={{ color: C.warn, fontSize: "0.62rem", letterSpacing: 2 }}>PROCESSING › </span>
            Analyzing your request...
          </div>
        )}
      </div>

      {/* Input Row */}
      <div style={{ width: "100%", maxWidth: 680, padding: "12px", display: "flex", gap: 8, alignItems: "flex-end", marginTop: "auto" }}>

        {/* MIC BUTTON — Click once to start, click again to stop */}
        <button
          onClick={toggleMic}
          disabled={loading}
          style={{
            background: listening ? "rgba(255,100,0,0.25)" : "transparent",
            border: `2px solid ${listening ? C.warn : C.dim}`,
            color: listening ? C.warn : C.dim,
            borderRadius: 4, padding: "10px 13px", cursor: loading ? "not-allowed" : "pointer",
            fontSize: "1rem", transition: "all 0.2s",
            boxShadow: listening ? `0 0 16px rgba(255,100,0,0.6)` : "none",
            opacity: loading ? 0.4 : 1
          }}
          title={listening ? "Click to STOP recording" : "Click to START recording"}
        >🎤</button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder={listening ? "🔴 Recording... click 🎤 to stop" : "Type your message or click 🎤 to speak..."}
          rows={1}
          disabled={listening || loading}
          style={{
            flex: 1, background: "rgba(0,30,60,0.6)",
            border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.text, fontFamily: "'Courier New', monospace",
            fontSize: "0.78rem", padding: "10px 12px", resize: "none", outline: "none", minHeight: 42,
            opacity: listening ? 0.5 : 1
          }}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={loading || listening || !input.trim()}
          style={{
            background: "transparent", border: `1px solid ${C.core}`, color: C.core,
            fontFamily: "monospace", fontWeight: 700, fontSize: "0.62rem", letterSpacing: 2,
            padding: "10px 14px", borderRadius: 4, cursor: "pointer",
            opacity: loading || listening || !input.trim() ? 0.35 : 1, transition: "all 0.2s"
          }}
        >SEND</button>
      </div>

      {/* Mic instructions */}
      <div style={{ fontSize: "0.6rem", color: C.dim, marginBottom: 6, letterSpacing: 1, textAlign: "center" }}>
        🎤 Click ONCE to record · Click AGAIN to stop & send
      </div>

      {/* Footer */}
      <div style={{ width: "100%", padding: "8px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 16, fontSize: "0.56rem", color: C.dim, letterSpacing: 1 }}>
        {["NEURAL NET READY", "GROQ · LLAMA 3.3 70B", "WHISPER VOICE AI"].map(t => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.core, display: "inline-block" }}/>
            {t}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinR { to { transform: rotate(-360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
