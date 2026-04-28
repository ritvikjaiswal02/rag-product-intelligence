// components/Chatbot.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  id: number;
  from: "user" | "bot";
  text: string;
  sources?: any[];
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "bot",
      text: "Hi 👶, I'm the Natural Baby assistant. Ask me anything about our baby products!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      from: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg.text }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        from: "bot",
        text:
          data.answer ??
          "Sorry, something went wrong. Please try asking again about Natural Baby products.",
        sources: data.sourceChunks,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          from: "bot",
          text: "Oops, I had trouble replying. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        {!open && (
          <Button
            className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96">
          <Card className="flex flex-col h-[520px] shadow-xl border border-gray-200 py-2">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  Natural Baby Assistant
                </span>
                <span className="text-xs text-muted-foreground">
                  Ask about our baby products
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-3 py-2 h-[300px]">
              <div className="space-y-2 pr-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.from === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${
                        msg.from === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div>{msg.text}</div>
                      {msg.sources && msg.sources.length > 0 && (() => {
                        const topSrc = msg.sources[0];
                        const formatTitle = (text: string) => {
                          let title = text.split('\n')[0].trim();
                          title = title.replace(/Product \d+: /g, '')
                                       .replace(/Best Selling Product: /g, '')
                                       .replace(/Best Seller Features:/g, 'Top Features')
                                       .replace(/About Natural Baby:/g, 'Brand Guide')
                                       .replace(/^Natural Baby /g, '');
                          return title || "Product Detail";
                        };
                        const formatDesc = (text: string) => {
                           const parts = text.split('\n').filter(p => p.trim() !== '');
                           return parts.length > 1 ? parts[1].substring(0, 60) + "..." : "";
                        };
                        return (
                          <div className="mt-3 pt-3 border-t border-black/10 flex flex-col gap-2">
                            <div className="flex items-center gap-1 text-[10px] font-bold opacity-80 uppercase tracking-wider">
                              {topSrc.similarity > 0.6 ? "🟢 High Confidence" : topSrc.similarity > 0.25 ? "🟡 Moderate Confidence" : "🟡 Limited Context"}
                            </div>
                            <div className="flex flex-col gap-1 mt-1 bg-background/40 p-2 rounded border">
                              <span className="text-[10px] font-semibold text-muted-foreground">Primary Source:</span>
                              <div className="text-[11px] text-foreground/80 leading-snug">
                                • <span className="font-semibold">{formatTitle(topSrc.content)}</span> — {formatDesc(topSrc.content)}
                              </div>
                              {msg.sources.length > 1 && (
                                <>
                                  <span className="text-[10px] font-semibold text-muted-foreground mt-2">Secondary Sources:</span>
                                  {msg.sources.slice(1).map((src: any, i: number) => (
                                    <div key={i} className="text-[11px] text-foreground/80 leading-snug">
                                      • {formatTitle(src.content)}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2 text-sm bg-muted flex items-center gap-2">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t px-3 pt-3 pb-3 flex flex-col gap-2">
              <div className="flex justify-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-50">
                  ⚡ Grounded Answers Only
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Ask about ingredients, safety, or best products..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()}>
                Send
              </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
