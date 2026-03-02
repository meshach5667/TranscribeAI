import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Paperclip,
  FileAudio,
  FileVideo,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
} from "lucide-react";

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

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "bot",
      content:
        "Hello! I am your All-Link AI Transcription Assistant. Paste a link from Google Drive, Dropbox, or OneDrive, or upload an audio/video file to get started.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendLink = async () => {
    if (!inputValue.trim()) return;

    const link = inputValue.trim();
    setInputValue("");

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "user", content: link },
    ]);

    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        type: "bot",
        content: "Analyzing link...",
        status: "pending",
      },
    ]);

    try {
      const res = await fetch("/api/transcribe/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const data = await res.json();

      if (data.jobId && socket) {
        listenToJob(data.jobId, botMsgId);
      } else {
        updateMessage(botMsgId, {
          status: "failed",
          content: "Failed to start job.",
          error: data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      updateMessage(botMsgId, {
        status: "failed",
        content: "Failed to connect to server.",
        error: error.message,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, type: "user", content: `Uploaded: ${file.name}`, fileName: file.name },
    ]);

    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        type: "bot",
        content: "Uploading file...",
        status: "pending",
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/transcribe/file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.jobId && socket) {
        listenToJob(data.jobId, botMsgId);
      } else {
        updateMessage(botMsgId, {
          status: "failed",
          content: "Failed to upload file.",
          error: data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      updateMessage(botMsgId, {
        status: "failed",
        content: "Failed to connect to server.",
        error: error.message,
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        
        const userMsgId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          { id: userMsgId, type: "user", content: "Voice recording", fileName: "recording.webm" },
        ]);

        const botMsgId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            type: "bot",
            content: "Uploading recording...",
            status: "pending",
          },
        ]);

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch("/api/transcribe/file", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (data.jobId && socket) {
            listenToJob(data.jobId, botMsgId);
          } else {
            updateMessage(botMsgId, {
              status: "failed",
              content: "Failed to process recording.",
              error: data.error || "Unknown error",
            });
          }
        } catch (error: any) {
          updateMessage(botMsgId, {
            status: "failed",
            content: "Failed to connect to server.",
            error: error.message,
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const listenToJob = (jobId: string, msgId: string) => {
    if (!socket) return;

    const eventName = `job-${jobId}`;
    socket.on(eventName, (data: any) => {
      if (data.status === "processing") {
        updateMessage(msgId, {
          status: "processing",
          content: data.message,
        });
      } else if (data.status === "completed") {
        updateMessage(msgId, {
          status: "completed",
          content: "Transcription complete.",
          transcript: data.result.transcript,
          summary: data.result.summary,
        });
        
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Transcription Complete", {
            body: "Your audio/video file has been successfully transcribed.",
            icon: "/favicon.ico"
          });
        }
        
        socket.off(eventName);
      } else if (data.status === "failed") {
        updateMessage(msgId, {
          status: "failed",
          content: "Transcription failed.",
          error: data.error,
        });
        socket.off(eventName);
      }
    });
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendLink();
    }
  };

  const exportAsTxt = (transcript: string, summary: string) => {
    const content = `SUMMARY & HIGHLIGHTS\n\n${summary}\n\n---\n\nTRANSCRIPT\n\n${transcript}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPdf = (transcript: string, summary: string) => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      
      doc.setFontSize(16);
      doc.text("Summary & Highlights", margin, 20);
      
      doc.setFontSize(12);
      const summaryLines = doc.splitTextToSize(summary, pageWidth);
      doc.text(summaryLines, margin, 30);
      
      let y = 30 + summaryLines.length * 7 + 10;
      
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(16);
      doc.text("Transcript", margin, y);
      y += 10;
      
      doc.setFontSize(10);
      const transcriptLines = doc.splitTextToSize(transcript, pageWidth);
      
      for (let i = 0; i < transcriptLines.length; i++) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(transcriptLines[i], margin, y);
        y += 5;
      }
      
      doc.save(`transcript-${Date.now()}.pdf`);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <FileAudio className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Transcribe AI
          </h1>
        </div>
        <div className="text-sm text-zinc-500 font-medium">
          Powered by Gemini
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                msg.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-5 ${
                  msg.type === "user"
                    ? "bg-zinc-900 text-white rounded-br-sm"
                    : "bg-white border border-zinc-200 shadow-sm rounded-bl-sm"
                }`}
              >
                {msg.type === "user" ? (
                  <div className="flex items-center gap-2">
                    {msg.fileName && <Paperclip className="w-4 h-4 opacity-70" />}
                    <p className="break-all">{msg.content}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {msg.status === "pending" ||
                      msg.status === "processing" ? (
                        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                      ) : msg.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : msg.status === "failed" ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        </div>
                      )}
                      <p className="font-medium text-zinc-800">{msg.content}</p>
                    </div>

                    {msg.error && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                        {msg.error}
                      </div>
                    )}

                    {msg.summary && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Summary & Highlights
                        </h3>
                        <div className="bg-zinc-50 p-4 rounded-xl text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap border border-zinc-100">
                          {msg.summary}
                        </div>
                      </div>
                    )}

                    {msg.transcript && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Transcript
                          </h3>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                exportAsPdf(msg.transcript!, msg.summary || "")
                              }
                              className="text-xs flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Export PDF
                            </button>
                            <button
                              onClick={() =>
                                exportAsTxt(msg.transcript!, msg.summary || "")
                              }
                              className="text-xs flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Export TXT
                            </button>
                          </div>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-xl text-sm leading-relaxed text-zinc-700 max-h-96 overflow-y-auto whitespace-pre-wrap border border-zinc-100 font-mono">
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

      {/* Input Area */}
      <footer className="bg-white border-t border-zinc-200 p-4">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="audio/*,video/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors shrink-0"
            title="Upload File"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl transition-colors shrink-0 ${
              isRecording 
                ? "bg-red-100 text-red-600 hover:bg-red-200" 
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
          </button>

          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a Google Drive, Dropbox link, or type a message..."
              className="w-full bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-0 rounded-2xl py-3 px-4 resize-none h-[52px] min-h-[52px] max-h-32 text-sm transition-all"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendLink}
            disabled={!inputValue.trim()}
            className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-4xl mx-auto mt-2 text-center">
          <p className="text-xs text-zinc-400">
            Supports public links, private links (requests access), and direct file uploads.
          </p>
        </div>
      </footer>
    </div>
  );
}
