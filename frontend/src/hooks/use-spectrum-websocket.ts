import { useEffect, useState, useRef } from 'react'

interface SpectrumData {
  type: 'spectrum'
  data: number[]
}

export function useSpectrumWebSocket() {
  const [spectrum, setSpectrum] = useState<number[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/spectrum')
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket connected for spectrum data')
          setIsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const message: SpectrumData = JSON.parse(event.data)
            if (message.type === 'spectrum' && Array.isArray(message.data)) {
              setSpectrum(message.data)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting in 2s...')
          setIsConnected(false)
          
          // Attempt to reconnect after 2 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 2000)
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        setIsConnected(false)
      }
    }

    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return { spectrum, isConnected }
}

