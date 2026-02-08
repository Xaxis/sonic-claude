import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { ChatMessage } from '@/types'

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isThinking) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    try {
      const response = await api.sendChat(input)
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsThinking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Start a conversation with the AI DJ...
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-primary/15 border border-primary/30 text-foreground'
                    : 'bg-secondary/15 border border-secondary/30 text-foreground'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
                <div className="text-xs opacity-40 mt-1.5 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in">
              <div className="bg-secondary/15 border border-secondary/30 rounded-lg px-4 py-2.5 flex items-center gap-2 shadow-lg">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                <span className="text-sm text-foreground">AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell the AI what you want..."
            disabled={isThinking}
            className="flex-1 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-colors"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            variant="primary"
            size="icon"
            className="shadow-lg shadow-primary/20"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
    </div>
  )
}

