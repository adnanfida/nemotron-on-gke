import React, { useState, useRef, useEffect } from "react";
import { GKEConfig, Message } from "../types";
import { Bot, User, Loader2, Sparkles, AlertCircle, Send } from "lucide-react";

interface ChatConsultantProps {
  config: GKEConfig;
}

// Render a string with **bold** spans as React nodes (no HTML injection).
function renderBoldInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function ChatConsultant({ config }: ChatConsultantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "ai",
      text: "👋 Hello! I am your GKE & LLM Deployment Architect. Tell me what is on your mind! You can ask questions such as:\n\n* *'How do I create a GKE Node Pool specifically for L4 GPUs?'*\n* *'Can you write a horizontal pod autoscaler (HPA) for vLLM?'*\n* *'What IAM permissions are required for GCS FUSE?'*\n\nAsk anything about Nemotron-3, Triton, or vLLM deployments!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setErrorMsg(null);
    const userText = inputText;
    setInputText("");

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userText,
          config
        })
      });

      if (!response.ok) {
        throw new Error("Could not speak to AI. Please verify that server.ts or GEMINI_API_KEY is configured.");
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: data.reply || "I didn't receive a clear answer. Please verify.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[680px]">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-none">
              Nemotron GKE Advisor
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1">POWERED BY GEMINI 3.5 FLASH</p>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-50/30">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${
              m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                m.sender === "user"
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                  : "bg-white border-slate-200 text-indigo-600 shadow-xs"
              }`}
            >
              {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-xl p-3 text-xs leading-relaxed ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white whitespace-pre-wrap font-medium shadow-sm"
                  : "bg-white border border-slate-200 text-slate-800 font-normal shadow-xs prose prose-slate max-w-full"
              }`}
            >
              {m.sender === "ai" ? (
                <div className="space-y-2 whitespace-pre-wrap">
                  {m.text.split("\n\n").map((para, pIdx) => {
                    if (para.startsWith("* ") || para.startsWith("- ")) {
                      return (
                        <ul key={pIdx} className="list-disc pl-4 space-y-1.5 my-1.5 text-slate-700">
                          {para.split("\n").map((li, lIdx) => (
                            <li key={lIdx}>{renderBoldInline(li.replace(/^[\s*-]+/, ""))}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={pIdx} className="text-slate-700 font-sans">
                        {renderBoldInline(para)}
                      </p>
                    );
                  })}
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-slate-200 text-indigo-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Architect is analyzing requirements...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Connection issue:</strong> {errorMsg}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input container */}
      <form onSubmit={handleSend} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder="Ask how to deploy, scale, or customize configs..."
          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/10 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-600 text-white flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-50 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
