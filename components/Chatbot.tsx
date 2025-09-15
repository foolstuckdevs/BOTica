'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Bot, X } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  content: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      content:
        'Hi there! How can I help you with your medicine or stock inquiry today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionRef = useRef<string>('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const outgoing = input;
    const userMessage: Message = { sender: 'user', content: outgoing };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Initialize a session id once per widget lifetime
      if (!sessionRef.current) {
        sessionRef.current = Math.random().toString(36).slice(2);
      }
      const res = await fetch('/api/chatbot/dialogflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: outgoing,
          sessionId: sessionRef.current,
          languageCode: 'en',
        }),
      });
      const data = (await res.json()) as {
        fulfillmentText?: string;
        sessionId?: string;
        intent?: string | null;
      };
      if (data?.sessionId) sessionRef.current = data.sessionId;
      const content =
        data?.fulfillmentText || "I didn't catch that. Could you rephrase?";
      const botReply: Message = { sender: 'bot', content };
      setMessages((prev) => [...prev, botReply]);
    } catch (e: unknown) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Chatbot send error:', e);
      }
      const botReply: Message = {
        sender: 'bot',
        content:
          'Sorry, I had trouble connecting to the assistant. Please try again.',
      };
      setMessages((prev) => [...prev, botReply]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-[360px] h-[500px] rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-3 flex items-center justify-between">
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
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 bg-white">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-xl px-4 py-2 text-sm max-w-[85%] ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-xl rounded-tl-none px-4 py-2 max-w-[85%] text-sm shadow">
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
              className="flex items-center gap-2 border-t border-gray-200 px-3 py-3 bg-white"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 text-sm rounded-full bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              <Button
                type="submit"
                size="sm"
                className="rounded-full bg-blue-600 hover:bg-blue-700"
                disabled={!input.trim()}
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
