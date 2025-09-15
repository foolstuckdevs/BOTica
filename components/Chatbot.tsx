'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Bot, X } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  content: string;
  ts?: number;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      content:
        'Hi! I’m BOTica, your pharmacy assistant. You can ask me things like checking stock, low stock alerts, expiring medicines, or finding alternatives.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionRef = useRef<string>('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const outgoing = input;
    const userMessage: Message = {
      sender: 'user',
      content: outgoing,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Initialize a session id once per widget lifetime
      if (!sessionRef.current) {
        sessionRef.current = Math.random().toString(36).slice(2);
      }
      const res = await fetch('/api/chatbot/dialogflow-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: outgoing,
          sessionId: sessionRef.current,
          languageCode: 'en',
        }),
      });
      // Try to parse JSON only if possible
      const data =
        (await (async () => {
          try {
            return (await res.json()) as {
              fulfillmentText?: string;
              sessionId?: string;
              intent?: string | null;
              error?: string;
            };
          } catch {
            return undefined;
          }
        })()) ||
        ({} as {
          fulfillmentText?: string;
          sessionId?: string;
          intent?: string | null;
          error?: string;
        });
      if (data?.sessionId) sessionRef.current = data.sessionId;
      if (!res.ok) {
        const errorMsg = data?.error || 'Assistant is unavailable right now.';
        throw new Error(errorMsg);
      }
      const content =
        data?.fulfillmentText || "I didn't catch that. Could you rephrase?";
      const botReply: Message = { sender: 'bot', content, ts: Date.now() };
      setMessages((prev) => [...prev, botReply]);
    } catch (e: unknown) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chatbot send error:', e);
      }
      const botReply: Message = {
        sender: 'bot',
        content:
          e instanceof Error
            ? `Assistant error: ${e.message}`
            : 'Sorry, I had trouble connecting to the assistant. Please try again.',
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, botReply]);
    } finally {
      setIsTyping(false);
    }
  };

  // Smooth auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    // Only auto-scroll if the user is near the bottom already
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const formatTime = (ts?: number) =>
    ts
      ? new Date(ts).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-[380px] h-[560px] rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <CardHeader className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-700">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  BOTica Assistant
                </CardTitle>
                <p className="text-xs text-blue-100">
                  {isTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-blue-500/20 rounded-full"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 bg-white">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50"
              role="log"
              aria-live="polite"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div
                      className={`mt-1 text-[10px] ${
                        msg.sender === 'user'
                          ? 'text-blue-300 text-right'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(msg.ts)}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] text-sm shadow">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-75"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="sticky bottom-0 bg-white flex items-center gap-2 border-t border-gray-200 px-3 py-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 text-sm rounded-full bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
                aria-label="Message"
              />
              <Button
                type="submit"
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <SendHorizonal className="w-4 h-4 text-white" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full p-4 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg transition-all hover:scale-105"
        >
          <Bot className="text-white w-6 h-6" />
          <span className="sr-only">Chat with us</span>
        </Button>
      )}
    </div>
  );
}
