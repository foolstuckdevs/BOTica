'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, SendHorizonal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Sender = 'user' | 'bot';
type Message = { sender: Sender; content: string; ts: number };

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      content:
        'Hi! I’m BOTica, your pharmacy assistant. How can I help you today?',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(dist > 160);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const outgoing = input.trim();
    setInput('');
    setMessages((m) => [
      ...m,
      { sender: 'user', content: outgoing, ts: Date.now() },
    ]);
    setIsTyping(true);

    try {
      // Use the new simplified chatbot endpoint
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: outgoing,
          pharmacyId: 1, // Default pharmacy ID - you can make this dynamic
          userId: 'staff-user', // Optional user ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const content = `Assistant error: ${
          errorData.error ?? 'Request failed'
        }`;
        setMessages((m) => [...m, { sender: 'bot', content, ts: Date.now() }]);
        return;
      }

      const chatbotResponse = await response.json();

      // Format the response for display (plain text, no markdown)
      let content = '';

      // 1) Staff summary
      if (chatbotResponse.ui?.staffMessage) {
        content += chatbotResponse.ui.staffMessage;
      }

      // 2) Stock list (if present)
      const items = chatbotResponse.inventory;
      if (Array.isArray(items) && items.length > 0) {
        content += '\n\nStock Information:\n';
        items.forEach(
          (
            item: {
              name: string;
              genericName?: string;
              brandName?: string;
              dosageForm?: string;
              quantity: number;
              unit: string;
              sellingPrice: string;
              expiryDate?: string;
            },
            index: number,
          ) => {
            const price = `₱${Number(item.sellingPrice).toFixed(2)}`;
            content += `${index + 1}. ${item.name}${
              item.genericName ? ` (${item.genericName})` : ''
            }${item.brandName ? ` - ${item.brandName}` : ''}\n`;
            if (item.brandName) content += `   - Brand: ${item.brandName}\n`;
            if (item.dosageForm)
              content += `   - Dosage form: ${item.dosageForm}\n`;
            content += `   - Quantity: ${item.quantity} ${item.unit}\n`;
            content += `   - Price: ${price}\n`;
            if (item.expiryDate) content += `   - Expiry: ${item.expiryDate}\n`;
          },
        );
      } else if (items && !Array.isArray(items)) {
        const item = items;
        const price = `₱${Number(item.sellingPrice).toFixed(2)}`;
        content += '\n\nStock Information:\n';
        content += `${item.name}${
          item.genericName ? ` (${item.genericName})` : ''
        }${item.brandName ? ` - ${item.brandName}` : ''}\n`;
        if (item.brandName) content += `- Brand: ${item.brandName}\n`;
        if (item.dosageForm) content += `- Dosage form: ${item.dosageForm}\n`;
        content += `- Quantity: ${item.quantity} ${item.unit}\n`;
        content += `- Price: ${price}`;
        if (item.expiryDate) content += `\n- Expiry: ${item.expiryDate}`;
      }

      // 5) Only show detailedNotes if both inventory and clinical are missing
      const hasInventory = Array.isArray(items)
        ? items.length > 0
        : Boolean(items);
      const hasClinical = Boolean(chatbotResponse.clinical);
      if (!hasInventory && !hasClinical && chatbotResponse.ui?.detailedNotes) {
        content += '\n\nNotes:\n';
        content += chatbotResponse.ui.detailedNotes;
      }

      setMessages((m) => [...m, { sender: 'bot', content, ts: Date.now() }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages((m) => [
        ...m,
        {
          sender: 'bot',
          content: 'Sorry, I had trouble connecting. Please try again.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-[380px] h-[560px] rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col p-0">
          <div className="sticky pt-2 z-10 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-blue-700">
                <Bot className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold">
                  BOTica Assistant
                </div>
                <p className="text-[11px] text-blue-100">
                  {isTyping ? 'Typing…' : 'Online'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full h-7 w-7"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <CardContent className="flex-1 p-0 bg-white flex min-h-0">
            <div
              ref={scrollerRef}
              className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 bg-gray-50"
              role="log"
              aria-live="polite"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-3 py-1.5 text-[13px] leading-snug shadow-sm whitespace-pre-line ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] ${
                        m.sender === 'user'
                          ? 'text-blue-300 text-right'
                          : 'text-gray-400'
                      }`}
                    >
                      {new Date(m.ts).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 max-w-[85%] text-sm shadow">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}

              {showScrollDown && (
                <div className="sticky bottom-1 flex justify-end pointer-events-none">
                  <Button
                    type="button"
                    size="sm"
                    className="pointer-events-auto rounded-full bg-blue-600 hover:bg-blue-700 shadow"
                    onClick={() => scrollToBottom()}
                    aria-label="Scroll to latest message"
                  >
                    Jump to latest
                  </Button>
                </div>
              )}
            </div>
          </CardContent>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="sticky bottom-0 bg-white flex items-center gap-2 border-t border-gray-200 px-3 py-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 text-sm rounded-full bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-blue-500 h-9"
              aria-label="Message"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full bg-blue-600 hover:bg-blue-700 h-9 px-3"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <SendHorizonal className="w-4 h-4 text-white" />
            </Button>
          </form>
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
