'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function DetectionPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [detection, setDetection] = useState<{id: number, name: string} | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        await fetch('http://127.0.0.1:5000/ensure-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id })
        })
      }
    }
    checkUser()

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        console.error('Error accessing camera:', err)
      }
    }
    setupCamera()
    
    const interval = setInterval(captureAndDetect, 2000)
    return () => clearInterval(interval)
  }, [])

  const captureAndDetect = async () => {
    if (detection || isLoading) return 
    
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || video.paused || video.ended) return

    setIsLoading(true)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsLoading(false)
        return
      }
      const formData = new FormData()
      formData.append('image', blob)

      try {
        const res = await fetch('http://127.0.0.1:5000/detect', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.detected) {
          setDetection({ id: data.ingredientId, name: data.name })
        }
      } catch (err) {
        console.error('Detection error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 'image/jpeg')
  }

  const confirmIngredient = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !detection) return

    try {
      await fetch('http://127.0.0.1:5000/add-ingredient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ingredientId: detection.id })
      })
    } catch (err) {
      console.error('Error adding ingredient:', err)
    }
    setDetection(null)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        {isLoading && (
          <div className="absolute top-4 right-4 bg-white/80 px-3 py-1 rounded-full text-xs font-medium animate-pulse">
            Scanning...
          </div>
        )}

        {detection && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
            <div className="bg-white p-8 rounded-3xl text-center shadow-2xl transform scale-110 transition-transform">
              <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Ingredient Detected</p>
              <p className="text-3xl font-bold mb-6 text-gray-900">Is this {detection.name}?</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setDetection(null)} 
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  No
                </button>
                <button 
                  onClick={confirmIngredient} 
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                >
                  Yes, add it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-gray-500 text-sm">Point your camera at an ingredient to identify it.</p>
    </div>
  )
}