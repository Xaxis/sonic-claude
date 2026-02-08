import type { AIStatus } from '@/types'

const API_BASE = 'http://localhost:8000'

class APIClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // AI Agent
  async getAIStatus(): Promise<AIStatus> {
    return this.request<AIStatus>('/ai/status')
  }

  async toggleAI(): Promise<{ enabled: boolean }> {
    return this.request('/ai/toggle', { method: 'POST' })
  }

  async sendChat(message: string): Promise<{ response: string; reasoning: string }> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  // OSC Control
  async sendOSC(parameter: string, value: number | string): Promise<void> {
    await this.request('/osc/send', {
      method: 'POST',
      body: JSON.stringify({ parameter, value }),
    })
  }

  // Transport
  async play(): Promise<void> {
    await this.sendOSC('transport', 'play')
  }

  async stop(): Promise<void> {
    await this.sendOSC('transport', 'stop')
  }

  // Parameters
  async setBPM(bpm: number): Promise<void> {
    await this.sendOSC('bpm', bpm)
  }

  async setIntensity(intensity: number): Promise<void> {
    await this.sendOSC('intensity', intensity)
  }

  async setCutoff(cutoff: number): Promise<void> {
    await this.sendOSC('cutoff', cutoff)
  }

  async setReverb(reverb: number): Promise<void> {
    await this.sendOSC('reverb', reverb)
  }

  async setEcho(echo: number): Promise<void> {
    await this.sendOSC('echo', echo)
  }

  async setKey(key: string): Promise<void> {
    await this.sendOSC('key', key)
  }

  async setScale(scale: string): Promise<void> {
    await this.sendOSC('scale', scale)
  }
}

export const api = new APIClient()

