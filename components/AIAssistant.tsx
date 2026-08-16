"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { askAssistant } from "@/app/actions/ai-assistant";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Resumo de desempenho da semana",
    "Quais itens tiveram mais perdas?",
    "Onde devo reduzir a aquisição para a estufa?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    // Call server action
    const response = await askAssistant(text);

    setIsLoading(false);

    if (response.success && response.text) {
      setMessages((prev) => [...prev, { role: "assistant", content: response.text as string }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.error || "Ocorreu um erro ao processar sua solicitação." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-transform ${
          isOpen ? "scale-0" : "scale-100"
        } z-50`}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Modal / Popover */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-surface">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Assistente Inteligente</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-70">
                  <Bot className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Olá! Sou seu assistente de gestão de perdas. Como posso ajudar hoje?
                  </p>
                </div>
                
                {/* Suggestions */}
                <div className="space-y-2 pb-2">
                  <p className="text-xs text-muted-foreground font-medium px-1">Sugestões:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-xs bg-surface hover:bg-surface-2 border px-3 py-1.5 rounded-full transition-colors text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                      msg.role === "user"
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-3 text-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`text-sm px-3 py-2 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-surface text-foreground rounded-tl-none border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-surface-3 text-foreground shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-surface text-foreground rounded-lg rounded-tl-none border px-4 py-3 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-surface/50">
            <div className="relative">
              <input
                type="text"
                placeholder="Faça uma pergunta..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full pl-3 pr-10 py-2 bg-background border rounded-full text-sm outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
              >
                <Send className="h-3.5 w-3.5 ml-px" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
