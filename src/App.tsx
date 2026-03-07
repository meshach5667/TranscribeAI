import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Paperclip,
  FileAudio,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
  Sun,
  Moon,
  LogOut,
  Trash2,
} from "lucide-react";
import { endpoints } from "./services/api";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Message = {
  id: string;
  type: "user" | "bot";
  content: string;
  status?: "pending" | "processing" | "completed" | "failed";
  jobId?: string;
  transcript?: string;
  summary?: string;
  error?: string;
  fileName?: string;
};

type UserProfile = {
  name: string;
  email: string;
  picture: string;
  access_token: string;
  refresh_token: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toPlainText(val: any): string {
  if (typeof val === "string") return val.trim();
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    for (const key of ["text", "transcript", "summary", "content", "value", "result"]) {
      if (typeof val[key] === "string") return val[key].trim();
    }
    return JSON.stringify(val, null, 2);
  }
  return String(val).trim();
}

/* ------------------------------------------------------------------ */
/*  Welcome / Landing Page                                             */
/* ------------------------------------------------------------------ */
function WelcomePage({
  onLogin,
  theme,
  toggleTheme,
}: {
  onLogin: () => void;
  theme: string;
  toggleTheme: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 24,
        position: "relative",
        transition: "background 0.3s",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="glass-btn"
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: 10,
          borderRadius: 12,
          display: "flex",
          color: "var(--text-secondary)",
        }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-strong"
        style={{
          borderRadius: 28,
          padding: "48px 40px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            border: "1px solid var(--glass-border)",
          }}
        >
          <FileAudio size={28} color="var(--accent)" />
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "0 0 6px",
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
          }}
        >
          TranscrybeAI
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}
        >
          Paste any cloud media link — Google Drive, Dropbox, OneDrive — and get
          an AI-powered transcript with summaries, highlights, and speaker
          labels.
        </p>

        {/* Features */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          {[
            "🔗  Private & public cloud link support",
            "🎙️  Voice recording & file upload",
            "⚡  Real-time transcription updates",
            "📋  Summaries, highlights & action items",
            "📄  Export to PDF or TXT",
          ].map((feat, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--bg-subtle)",
              }}
            >
              {feat}
            </div>
          ))}
        </div>

        {/* Google Sign-In */}
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 14,
            border: "1px solid var(--glass-border)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-primary)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--glass-strong)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--glass-bg)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Sign in with Google
        </button>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>
          We use your Google account to access private Drive files on your
          behalf. No data is stored on our servers.
        </p>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
          <a href="/privacy" style={{ marginRight: 12, color: "var(--accent)" }}>Privacy Policy</a>
          <a href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</a>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                           */
/* ------------------------------------------------------------------ */
export default function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  if (pathname === "/privacy") return <PrivacyPage />;
  if (pathname === "/terms") return <TermsPage />;
  /* ---- Theme ---- */
  const [theme, setTheme] = useState(
    () => localStorage.getItem("transcrybe_theme") || "light",
  );

  /* ---- Auth ---- */
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("transcrybe_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return null;
  });

  /* ---- Messages ---- */
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("transcrybe_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return [
      {
        id: "welcome",
        type: "bot" as const,
        content:
          "Hello! I'm TranscrybeAI. Paste a Google Drive, Dropbox, or OneDrive link, upload a file, or ask me anything.",
      },
    ];
  });

  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /* ---- Apply theme to <html> ---- */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("transcrybe_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  /* ---- Handle OAuth callback from hash ---- */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("auth-callback")) {
      const params = new URLSearchParams(hash.split("?")[1] || "");
      const access_token = params.get("access_token");
      if (access_token) {
        const profile: UserProfile = {
          name: params.get("name") || "",
          email: params.get("email") || "",
          picture: params.get("picture") || "",
          access_token,
          refresh_token: params.get("refresh_token") || "",
        };
        setUser(profile);
        localStorage.setItem("transcrybe_user", JSON.stringify(profile));
        window.history.replaceState(null, "", "/");
      }
    }
  }, []);

  /* ---- Socket.IO ---- */
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => {
      newSocket.disconnect();
    };
  }, []);

  /* ---- Scroll + persist messages ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("transcrybe_messages", JSON.stringify(messages));
  }, [messages]);

  /* ---- Auth helpers ---- */
  const handleLogin = () => {
    window.location.href = endpoints.authGoogle;
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("transcrybe_user");
  };

  /* ---- Message helpers ---- */
  const updateMessage = (id: string, updates: Partial<Message>) =>
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    );

  const listenToJob = (jobId: string, msgId: string) => {
    if (!socket) return;
    const ev = `job-${jobId}`;
    socket.on(ev, (data: any) => {
      if (data.status === "processing") {
        updateMessage(msgId, { status: "processing", content: data.message });
      } else if (data.status === "completed") {
        updateMessage(msgId, {
          status: "completed",
          content: "Transcription complete.",
          transcript: toPlainText(data.result?.transcript),
          summary: toPlainText(data.result?.summary),
        });
        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("TranscrybeAI", {
            body: "Transcription complete!",
            icon: "/favicon.ico",
          });
        }
        socket.off(ev);
      } else if (data.status === "failed") {
        updateMessage(msgId, {
          status: "failed",
          content: "Transcription failed.",
          error: data.error,
        });
        socket.off(ev);
      }
    });
  };

  /* ---- Send message ---- */
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue("");

    const userMsgId = Date.now().toString();
    const newMsgs: Message[] = [
      ...messages,
      { id: userMsgId, type: "user", content: text },
    ];
    setMessages(newMsgs);

    const cloudPatterns = [
      /drive\.google\.com/i,
      /dropbox\.com/i,
      /1drv\.ms/i,
      /sharepoint\.com/i,
      /onedrive\.live\.com/i,
    ];
    const isLink =
      /^https?:\/\/.+/i.test(text) ||
      cloudPatterns.some((p) => p.test(text));

    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        type: "bot",
        content: isLink ? "Analyzing link…" : "Thinking…",
        status: "pending",
      },
    ]);

    if (isLink) {
      try {
        const res = await fetch(endpoints.transcribeLink, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            link: text,
            access_token: user?.access_token || "",
          }),
        });
        const data = await res.json();
        if (data.jobId && socket) {
          listenToJob(data.jobId, botMsgId);
        } else {
          updateMessage(botMsgId, {
            status: "failed",
            content: "Failed to start job.",
            error: data.error || "Unknown",
          });
        }
      } catch (err: any) {
        updateMessage(botMsgId, {
          status: "failed",
          content: "Server connection failed.",
          error: err.message,
        });
      }
    } else {
      try {
        const skip = [
          "Thinking…",
          "Analyzing link",
          "Uploading",
          "Transcription complete",
          "Transcription failed",
          "Failed to",
          "Uploading recording",
          "Voice recording",
          "Uploaded:",
        ];
        const hist = newMsgs
          .filter(
            (m) =>
              m.id !== "welcome" &&
              !m.transcript &&
              !m.summary &&
              !m.jobId &&
              !skip.some((p) => m.content.startsWith(p)) &&
              m.content,
          )
          .map((m) => ({
            role: m.type === "bot" ? "model" : "user",
            content: m.content,
          }));

        const res = await fetch(endpoints.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: hist }),
        });
        const data = await res.json();
        updateMessage(botMsgId, {
          status: "completed",
          content: data.response || "No response.",
        });
      } catch (err: any) {
        updateMessage(botMsgId, {
          status: "failed",
          content: "Chat failed.",
          error: err.message,
        });
      }
    }
  };

  /* ---- File upload ---- */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "user",
        content: `Uploaded: ${file.name}`,
        fileName: file.name,
      },
    ]);
    const botId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: botId, type: "bot", content: "Uploading file…", status: "pending" },
    ]);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(endpoints.transcribeFile, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.jobId && socket) {
        listenToJob(data.jobId, botId);
      } else {
        updateMessage(botId, {
          status: "failed",
          content: "Upload failed.",
          error: data.error || "Unknown",
        });
      }
    } catch (err: any) {
      updateMessage(botId, {
        status: "failed",
        content: "Server error.",
        error: err.message,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---- Recording ---- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", {
          type: "audio/webm",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            type: "user",
            content: "Voice recording",
            fileName: "recording.webm",
          },
        ]);
        const botId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            type: "bot",
            content: "Processing recording…",
            status: "pending",
          },
        ]);
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch(endpoints.transcribeFile, {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (data.jobId && socket) {
            listenToJob(data.jobId, botId);
          } else {
            updateMessage(botId, {
              status: "failed",
              content: "Failed.",
              error: data.error || "Unknown",
            });
          }
        } catch (err: any) {
          updateMessage(botId, {
            status: "failed",
            content: "Server error.",
            error: err.message,
          });
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ---- Exports ---- */
  const exportTxt = (t: string, s: string) => {
    const c = `SUMMARY & HIGHLIGHTS\n${"─".repeat(40)}\n\n${s}\n\n${"─".repeat(40)}\nFULL TRANSCRIPT\n${"─".repeat(40)}\n\n${t}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([c], { type: "text/plain" }));
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
  };

  const exportPdf = (t: string, s: string) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      const m = 14;
      const pw = doc.internal.pageSize.getWidth() - m * 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Summary & Highlights", m, 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const sl = doc.splitTextToSize(s, pw);
      doc.text(sl, m, 32);
      let y = 32 + sl.length * 6.5 + 14;
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 22;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Transcript", m, y);
      y += 12;
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      for (const line of doc.splitTextToSize(t, pw)) {
        if (y > doc.internal.pageSize.getHeight() - 18) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, m, y);
        y += 5.2;
      }
      doc.save(`transcript-${Date.now()}.pdf`);
    });
  };

  /* ---- Render bot text (plain formatted — never JSON) ---- */
  const renderText = (content: string) => {
    const lines = content.split(/\r?\n/);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {lines.map((raw, i) => {
          const line = raw.trimEnd();
          if (!line) return <div key={i} style={{ height: 6 }} />;
          // Bold headings like **Summary**
          const hm = line.match(/^\*\*(.+?)\*\*$/);
          if (hm)
            return (
              <p
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  margin: "8px 0 2px",
                }}
              >
                {hm[1]}
              </p>
            );
          // Section labels like SUMMARY, HIGHLIGHTS, ACTION ITEMS
          if (
            /^(SUMMARY|HIGHLIGHTS|ACTION ITEMS|FULL TRANSCRIPT|TRANSCRIPT)/i.test(
              line,
            )
          )
            return (
              <p
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  margin: "8px 0 2px",
                }}
              >
                {line}
              </p>
            );
          // Bullet
          if (/^[•\-\*]\s/.test(line))
            return (
              <div
                key={i}
                style={{ display: "flex", gap: 8, paddingLeft: 2 }}
              >
                <span
                  style={{
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
                  }}
                >
                  {line.replace(/^[•\-\*]\s*/, "")}
                </span>
              </div>
            );
          // Regular text
          return (
            <p
              key={i}
              style={{
                fontSize: 14,
                color: "var(--text-primary)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  /* ================================================================ */
  /*  Welcome gate — show landing if not signed in                     */
  /* ================================================================ */
  if (!user)
    return (
      <WelcomePage
        onLogin={handleLogin}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );

  /* ================================================================ */
  /*  Chat UI                                                          */
  /* ================================================================ */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-base)",
        position: "relative",
        transition: "background 0.3s",
      }}
    >
      {/* ---- Header ---- */}
      <header
        className="glass-strong"
        style={{
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--glass-border)",
            }}
          >
            <FileAudio size={17} color="var(--accent)" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              TranscrybeAI
            </h1>
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                margin: 0,
                letterSpacing: "0.04em",
              }}
            >
              Audio · Video · Transcription
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* User avatar */}
          {user.picture && (
            <img
              src={user.picture}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid var(--glass-border)",
              }}
            />
          )}
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              maxWidth: 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name?.split(" ")[0]}
          </span>

          <button
            onClick={toggleTheme}
            className="glass-btn"
            style={{
              padding: 8,
              borderRadius: 10,
              display: "flex",
              color: "var(--text-muted)",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => {
              if (window.confirm("Clear chat?")) {
                localStorage.removeItem("transcrybe_messages");
                window.location.reload();
              }
            }}
            className="glass-btn"
            style={{
              padding: 8,
              borderRadius: 10,
              display: "flex",
              color: "var(--text-muted)",
            }}
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={handleLogout}
            className="glass-btn"
            style={{
              padding: 8,
              borderRadius: 10,
              display: "flex",
              color: "var(--text-muted)",
            }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ---- Messages ---- */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          maxWidth: 780,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "flex",
                justifyContent:
                  msg.type === "user" ? "flex-end" : "flex-start",
                marginBottom: 14,
              }}
            >
              <div
                className={msg.type === "user" ? "glass-user" : "glass"}
                style={{
                  maxWidth: "82%",
                  borderRadius:
                    msg.type === "user"
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                  padding: "14px 18px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {(msg.status === "pending" ||
                  msg.status === "processing") && (
                  <div
                    className="shimmer"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {msg.type === "user" ? (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {msg.fileName && (
                      <Paperclip size={14} color="var(--accent)" />
                    )}
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--text-primary)",
                        margin: 0,
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {/* Status + content */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <div style={{ marginTop: 3, flexShrink: 0 }}>
                        {msg.status === "pending" ||
                        msg.status === "processing" ? (
                          <Loader2
                            size={15}
                            color="var(--accent)"
                            style={{
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        ) : msg.status === "completed" ? (
                          <CheckCircle2
                            size={15}
                            color="var(--success)"
                          />
                        ) : msg.status === "failed" ? (
                          <AlertCircle size={15} color="var(--danger)" />
                        ) : null}
                      </div>
                      <div style={{ flex: 1 }}>
                        {renderText(msg.content)}
                      </div>
                    </div>

                    {msg.error && (
                      <div
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "var(--danger)",
                        }}
                      >
                        {msg.error}
                      </div>
                    )}

                    {/* Summary */}
                    {msg.summary && (
                      <div>
                        <div
                          style={{
                            height: 1,
                            background: "var(--glass-border)",
                            margin: "8px 0",
                          }}
                        />
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--accent)",
                            marginBottom: 8,
                          }}
                        >
                          Summary & Highlights
                        </p>
                        <div
                          className="glass"
                          style={{
                            borderRadius: 12,
                            padding: "14px 16px",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            lineHeight: 1.8,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.summary}
                        </div>
                      </div>
                    )}

                    {/* Transcript */}
                    {msg.transcript && (
                      <div>
                        <div
                          style={{
                            height: 1,
                            background: "var(--glass-border)",
                            margin: "8px 0",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--accent)",
                              margin: 0,
                            }}
                          >
                            Transcript
                          </p>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() =>
                                exportPdf(
                                  msg.transcript!,
                                  msg.summary || "",
                                )
                              }
                              className="glass-btn"
                              style={{
                                padding: "4px 10px",
                                borderRadius: 8,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Download size={11} /> PDF
                            </button>
                            <button
                              onClick={() =>
                                exportTxt(
                                  msg.transcript!,
                                  msg.summary || "",
                                )
                              }
                              className="glass-btn"
                              style={{
                                padding: "4px 10px",
                                borderRadius: 8,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Download size={11} /> TXT
                            </button>
                          </div>
                        </div>
                        <div
                          className="glass"
                          style={{
                            borderRadius: 12,
                            padding: "14px 16px",
                            fontSize: 12.5,
                            fontFamily:
                              "'JetBrains Mono', monospace",
                            color: "var(--text-secondary)",
                            lineHeight: 1.85,
                            maxHeight: 360,
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.transcript}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* ---- Input ---- */}
      <footer
        className="glass-strong"
        style={{ padding: "14px 16px 10px" }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div
            style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: "none" }}
              accept="audio/*,video/*"
            />

            <button
              className="glass-btn"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: 11,
                borderRadius: 12,
                color: "var(--text-muted)",
                display: "flex",
              }}
              title="Upload file"
            >
              <Paperclip size={18} />
            </button>

            <button
              className={isRecording ? "record-ring" : "glass-btn"}
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                padding: 11,
                borderRadius: 12,
                display: "flex",
                color: isRecording
                  ? "var(--danger)"
                  : "var(--text-muted)",
                background: isRecording
                  ? "rgba(239,68,68,0.08)"
                  : undefined,
                border: isRecording
                  ? "1px solid rgba(239,68,68,0.25)"
                  : undefined,
              }}
              title={isRecording ? "Stop" : "Record"}
            >
              {isRecording ? (
                <Square size={18} fill="currentColor" />
              ) : (
                <Mic size={18} />
              )}
            </button>

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a Drive / Dropbox link, or ask a question…"
              className="glass-input"
              style={{
                flex: 1,
                borderRadius: 14,
                padding: "12px 16px",
                resize: "none",
                height: 48,
                minHeight: 48,
                maxHeight: 120,
                fontSize: 14,
                lineHeight: 1.5,
                fontFamily: "'Inter', sans-serif",
              }}
              rows={1}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="glass-btn"
              style={{
                padding: 13,
                borderRadius: 12,
                display: "flex",
                color: inputValue.trim()
                  ? "white"
                  : "var(--text-muted)",
                background: inputValue.trim()
                  ? "var(--accent)"
                  : undefined,
                border: inputValue.trim()
                  ? "1px solid var(--accent)"
                  : undefined,
                opacity: inputValue.trim() ? 1 : 0.5,
                cursor: inputValue.trim()
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              <Send size={18} />
            </button>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 8,
            }}
          >
            Supports public & private links, file uploads, and voice
            recording
          </p>
        </div>
      </footer>
    </div>
  );
}