import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { AIStatus } from '@/types'

export function useAIStatus(pollInterval = 500) {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const fetchStatus = async () => {
      try {
        const data = await api.getAIStatus()
        if (mounted) {
          setStatus(data)
          setError(null)
          setIsLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setIsLoading(false)
        }
      } finally {
        if (mounted) {
          timeoutId = setTimeout(fetchStatus, pollInterval)
        }
      }
    }

    fetchStatus()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [pollInterval])

  return { status, error, isLoading }
}

