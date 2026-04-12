import { useRef, useState } from 'react'

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

function getSupportedMimeType() {
  if (!window.MediaRecorder) {
    return ''
  }

  return MIME_TYPES.find((type) => window.MediaRecorder.isTypeSupported(type)) ?? ''
}

function createIdleBars() {
  return Array.from({ length: 18 }, (_, index) => (index % 2 === 0 ? 0.14 : 0.08))
}

export function useAudioRecorder({ onRecordingComplete }) {
  const [status, setStatus] = useState('idle')
  const [bars, setBars] = useState(createIdleBars())
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const startedAtRef = useRef(0)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const frameRef = useRef(0)

  async function cleanup() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    analyserRef.current = null

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    recorderRef.current = null
    chunksRef.current = []
    setBars(createIdleBars())
  }

  function startMeter(stream) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      return
    }

    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 64

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const buffer = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(buffer)
      const nextBars = Array.from({ length: 18 }, (_, index) => {
        const sliceStart = Math.floor((index / 18) * buffer.length)
        const sliceEnd = Math.floor(((index + 1) / 18) * buffer.length)
        const values = buffer.slice(sliceStart, sliceEnd)
        const total = values.reduce((sum, value) => sum + value, 0)
        const average = values.length ? total / values.length : 0
        return Math.max(0.08, average / 255)
      })

      setBars(nextBars)
      frameRef.current = requestAnimationFrame(tick)
    }

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    frameRef.current = requestAnimationFrame(tick)
  }

  async function startRecording() {
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder is not available in this browser.')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    const mimeType = getSupportedMimeType()
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

    streamRef.current = stream
    recorderRef.current = recorder
    chunksRef.current = []
    startedAtRef.current = performance.now()

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    })

    recorder.start()
    startMeter(stream)
    setStatus('recording')
  }

  async function stopRecording() {
    if (!recorderRef.current) {
      return
    }

    const recorder = recorderRef.current

    setStatus('processing')

    const blob = await new Promise((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          const durationMs = performance.now() - startedAtRef.current
          const audioBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          })

          resolve({
            blob: audioBlob,
            durationMs,
            mimeType: recorder.mimeType || 'audio/webm',
          })
        },
        { once: true },
      )

      recorder.stop()
    })

    await cleanup()

    try {
      await onRecordingComplete(blob)
    } finally {
      setStatus('idle')
    }
  }

  return {
    status,
    bars,
    isSupported: Boolean(window.MediaRecorder),
    startRecording,
    stopRecording,
  }
}
