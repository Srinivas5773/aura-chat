import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const peerConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
}

const TRANSLATION_LANGUAGES = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'zh-CN', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
]

const getSpeechLocale = (langCode) => {
  const map = {
    'hi': 'hi-IN',
    'te': 'te-IN',
    'ur': 'ur-PK',
    'de': 'de-DE',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'ar': 'ar-SA',
    'zh-CN': 'zh-CN',
    'ja': 'ja-JP',
    'ru': 'ru-RU',
    'pt': 'pt-BR',
    'it': 'it-IT',
    'bn': 'bn-IN',
    'ta': 'ta-IN',
    'kn': 'kn-IN',
    'mr': 'mr-IN',
    'ml': 'ml-IN',
  }
  return map[langCode] || langCode
}

const translateTextFree = async (text, targetLang) => {
  if (!text || !targetLang) return text
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    )
    const data = await response.json()
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('')
    }
  } catch (err) {
    console.error('Free Translation error:', err)
  }
  return text
}

// Web Audio API Call Ringtone & Sound Effects Synthesizer
class CallRingtoneManager {
  constructor() {
    this.audioCtx = null
    this.incomingInterval = null
    this.outgoingInterval = null
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) this.audioCtx = new AudioContextClass()
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
  }

  playIncomingRingtone() {
    this.stopAll()
    this.init()
    if (!this.audioCtx) return

    const playChime = () => {
      if (!this.audioCtx) return
      const now = this.audioCtx.currentTime

      // Realistic Smartphone Ringtone Chime Melody (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50]
      freqs.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator()
        const gain = this.audioCtx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.12)

        gain.gain.setValueAtTime(0, now + idx * 0.12)
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.12 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35)

        osc.connect(gain)
        gain.connect(this.audioCtx.destination)

        osc.start(now + idx * 0.12)
        osc.stop(now + idx * 0.12 + 0.36)
      })
    }

    playChime()
    this.incomingInterval = setInterval(playChime, 1800)
  }

  playOutgoingRingback() {
    this.stopAll()
    this.init()
    if (!this.audioCtx) return

    const playRingback = () => {
      if (!this.audioCtx) return
      const now = this.audioCtx.currentTime

      // Realistic Dual-Tone Telephone Ringback (440Hz + 480Hz)
      const osc1 = this.audioCtx.createOscillator()
      const osc2 = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()

      osc1.frequency.setValueAtTime(440, now)
      osc2.frequency.setValueAtTime(480, now)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.setValueAtTime(0.12, now + 1.8)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 2.0)
      osc2.stop(now + 2.0)
    }

    playRingback()
    this.outgoingInterval = setInterval(playRingback, 4000)
  }

  playCallEndedSound() {
    this.stopAll()
    this.init()
    if (!this.audioCtx) return

    const now = this.audioCtx.currentTime
    const osc = this.audioCtx.createOscillator()
    const gain = this.audioCtx.createGain()

    osc.frequency.setValueAtTime(480, now)
    osc.frequency.setValueAtTime(320, now + 0.15)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(this.audioCtx.destination)

    osc.start(now)
    osc.stop(now + 0.36)
  }

  stopAll() {
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval)
      this.incomingInterval = null
    }
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval)
      this.outgoingInterval = null
    }
  }
}

const ringtoneManager = new CallRingtoneManager()

function App() {
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [userName, setUserName] = useState('')
  const [currentMessage, setCurrentMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isJoined, setIsJoined] = useState(false)
  const [ghostMode, setGhostMode] = useState(false)
  const [ghostTimer, setGhostTimer] = useState(5000)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [otherUserName, setOtherUserName] = useState('Partner')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [timeString, setTimeString] = useState('')
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [roomUserCount, setRoomUserCount] = useState(1)
  const [isConnected, setIsConnected] = useState(true)
  const [roomError, setRoomError] = useState('')

  const userNameRef = useRef(userName)
  const roomIdRef = useRef(roomId)
  const isJoinedRef = useRef(isJoined)
  const socketRef = useRef(socket)
  const myTargetLanguageRef = useRef('en')
  const mySpokenLanguageRef = useRef('hi')
  const lastSentTextRef = useRef('')
  const translationDebounceRef = useRef(null)

  useEffect(() => {
    userNameRef.current = userName
    roomIdRef.current = roomId
    isJoinedRef.current = isJoined
    socketRef.current = socket
  }, [userName, roomId, isJoined, socket])

  // Check for room parameter in URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room')
    if (roomParam) {
      setRoomId(roomParam.trim())
    }
  }, [])

  // Real Audio Voice Recording States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [recordingSecs, setRecordingSecs] = useState(0)

  // Track bottom position via Ref so scrolling does NOT trigger re-render loops
  const userIsAtBottomRef = useRef(true)

  // Reply & Reaction States
  const [replyingToMessage, setReplyingToMessage] = useState(null)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null)
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null)

  const downloadImage = (mediaUrl, fileName = 'aura_photo.png') => {
    try {
      const link = document.createElement('a')
      link.href = mediaUrl
      link.download = fileName || `aura_photo_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error downloading image:', err)
      window.open(mediaUrl, '_blank')
    }
  }

  // Next-Gen Feature States
  const [selectedTheme, setSelectedTheme] = useState('aura')
  const [selfDestructSecs, setSelfDestructSecs] = useState(0)
  const [isBlurMode, setIsBlurMode] = useState(false)
  const [showCanvasModal, setShowCanvasModal] = useState(false)
  const [showPollModal, setShowPollModal] = useState(false)

  // Poll Form State
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])

  // WebRTC Call Overlay States & Camera Controls
  const [callState, setCallState] = useState(null) // null | 'outgoing' | 'incoming' | 'connected'
  const [callType, setCallType] = useState('video') // 'audio' | 'video'
  const [callDuration, setCallDuration] = useState(0)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [incomingSdpOffer, setIncomingSdpOffer] = useState(null)
  const [facingMode, setFacingMode] = useState('user') // 'user' (front) | 'environment' (back)
  const [activeVideoFilter, setActiveVideoFilter] = useState('none')
  const [showFilterPicker, setShowFilterPicker] = useState(false)

  // Live Call Voice Translator & Subtitle States
  const [isSubtitlesEnabled, setIsSubtitlesEnabled] = useState(false)
  const [mySpokenLanguage, setMySpokenLanguage] = useState('hi')
  const [myTargetLanguage, setMyTargetLanguage] = useState('en')
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [activeSubtitlePayload, setActiveSubtitlePayload] = useState(null)

  useEffect(() => {
    mySpokenLanguageRef.current = mySpokenLanguage
    myTargetLanguageRef.current = myTargetLanguage
  }, [mySpokenLanguage, myTargetLanguage])

  const speechRecognizerRef = useRef(null)
  const subtitleTimerRef = useRef(null)

  const videoFilterStyles = {
    none: 'none',
    aura: 'drop-shadow(0 0 15px #00f5c4) contrast(1.15) saturate(1.2)',
    vintage: 'sepia(0.4) contrast(1.15) brightness(1.05)',
    stealth: 'grayscale(1) contrast(1.3) brightness(0.9)',
    cyberpunk: 'hue-rotate(180deg) saturate(1.8) contrast(1.2)',
    beauty: 'brightness(1.1) saturate(1.1) blur(0.4px)',
    blur: 'blur(12px)'
  }

  const videoFilterLabels = [
    { id: 'none', label: 'Normal' },
    { id: 'aura', label: '✨ AURA Glow' },
    { id: 'vintage', label: '🌅 Retro Warm' },
    { id: 'stealth', label: '🕶️ Stealth B&W' },
    { id: 'cyberpunk', label: '👾 Cyberpunk' },
    { id: 'beauty', label: '💖 Soft Beauty' },
    { id: 'blur', label: '🔮 Bokeh Blur' }
  ]

  // WebRTC & Media Refs
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const canvasStrokesRef = useRef([])
  const [brushColor, setBrushColor] = useState('#00f5c4')
  const [brushSize, setBrushSize] = useState(4)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const callTimerRef = useRef(null)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const iceCandidatesQueueRef = useRef([])

  const processQueuedIceCandidates = async () => {
    const pc = peerConnectionRef.current
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) return
    console.log(`Processing ${iceCandidatesQueueRef.current.length} queued ICE candidates`)
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift()
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e)
      }
    }
  }

  const addOrQueueIceCandidate = async (candidate) => {
    if (!candidate) return
    const pc = peerConnectionRef.current
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('Error adding ICE candidate:', e)
      }
    } else {
      console.log('Queuing ICE candidate until remote description is set:', candidate)
      iceCandidatesQueueRef.current.push(candidate)
    }
  }

  // Voice Note Recorder Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  // Live Android Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setTimeString(`${hours}:${minutes}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 10000)
    return () => clearInterval(timer)
  }, [])

  // Self-Destruct Timer Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setMessages(prev => prev.filter(msg => !msg.expiresAt || msg.expiresAt > now))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Smart Auto-Scroll
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.isOwn || userIsAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // Initialize Canvas & replay stroke history when canvas modal opens
  useEffect(() => {
    if (showCanvasModal) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#071816'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        canvasStrokesRef.current.forEach(stroke => {
          ctx.strokeStyle = stroke.color
          ctx.lineWidth = stroke.size
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(stroke.x0, stroke.y0)
          ctx.lineTo(stroke.x1, stroke.y1)
          ctx.stroke()
        })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [showCanvasModal])

  // Call Timer Increment & Ringtone Audio Control
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      ringtoneManager.stopAll()
    } else if (callState === 'incoming') {
      ringtoneManager.playIncomingRingtone()
    } else if (callState === 'outgoing') {
      ringtoneManager.playOutgoingRingback()
    } else {
      clearInterval(callTimerRef.current)
      setCallDuration(0)
      ringtoneManager.stopAll()
    }
    return () => {
      clearInterval(callTimerRef.current)
      ringtoneManager.stopAll()
    }
  }, [callState])

  // Ensure Remote Audio & Video Stream Binding when call is connected
  useEffect(() => {
    if (callState === 'connected') {
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      if (remoteStreamRef.current) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current
          remoteAudioRef.current.muted = false
          remoteAudioRef.current.volume = 1.0
          remoteAudioRef.current.play().catch(e => console.error('Remote audio play error in callState useEffect:', e))
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          remoteVideoRef.current.play().catch(e => console.error('Remote video play error in callState useEffect:', e))
        }
      }
    }
  }, [callState])

  // Real-Time Speech Recognition & Free Translation Effect for Live Call Subtitles
  useEffect(() => {
    let recognition = null
    let isComponentMounted = true

    if (isSubtitlesEnabled && callState === 'connected' && !isMicMuted) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('Live Speech Recognition is not supported by your browser or device. Please use Google Chrome, Microsoft Edge, or Safari.')
        setIsSubtitlesEnabled(false)
        return
      }

      try {
        recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = getSpeechLocale(mySpokenLanguageRef.current || mySpokenLanguage)

        recognition.onresult = async (event) => {
          let combinedTranscript = ''
          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i][0] && event.results[i][0].transcript) {
              combinedTranscript += event.results[i][0].transcript + ' '
            }
          }

          const spokenText = combinedTranscript.trim()
          if (!spokenText || spokenText === lastSentTextRef.current) return

          lastSentTextRef.current = spokenText

          // Immediate local subtitle rendering for the speaker
          setActiveSubtitlePayload({
            senderName: userNameRef.current || 'You',
            originalText: spokenText,
            translatedText: spokenText,
            isMine: true
          })

          // Debounced free translation & socket relay
          if (translationDebounceRef.current) clearTimeout(translationDebounceRef.current)
          translationDebounceRef.current = setTimeout(async () => {
            const targetLang = myTargetLanguageRef.current || myTargetLanguage || 'en'
            const translated = await translateTextFree(spokenText, targetLang)

            const payload = {
              roomId: roomIdRef.current || roomId,
              senderName: userNameRef.current || 'Partner',
              originalText: spokenText,
              translatedText: translated,
              targetLang: targetLang
            }

            const activeSocket = socketRef.current || socket
            if (activeSocket) {
              activeSocket.emit('call_subtitle', payload)
            }

            setActiveSubtitlePayload({
              senderName: userNameRef.current || 'You',
              originalText: spokenText,
              translatedText: translated,
              isMine: true
            })

            if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current)
            subtitleTimerRef.current = setTimeout(() => {
              if (isComponentMounted) setActiveSubtitlePayload(null)
            }, 6000)
          }, 350)
        }

        recognition.onerror = (event) => {
          console.warn('Speech Recognition notice/error:', event.error)
          if (event.error === 'not-allowed') {
            alert('Microphone permission for Speech Recognition was denied. Please allow mic access in browser/device settings.')
            setIsSubtitlesEnabled(false)
          }
        }

        recognition.onend = () => {
          if (isComponentMounted && isSubtitlesEnabled && callState === 'connected' && !isMicMuted) {
            setTimeout(() => {
              try {
                if (speechRecognizerRef.current && isSubtitlesEnabled) {
                  speechRecognizerRef.current.start()
                }
              } catch (e) {
                console.warn('Speech recognition restart quiet fallback:', e)
              }
            }, 400)
          }
        }

        recognition.start()
        speechRecognizerRef.current = recognition
      } catch (err) {
        console.error('Error initializing SpeechRecognition:', err)
      }
    } else {
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.stop() } catch (e) {}
        speechRecognizerRef.current = null
      }
    }

    return () => {
      isComponentMounted = false
      if (recognition) {
        try { recognition.stop() } catch (e) {}
      }
    }
  }, [isSubtitlesEnabled, callState, isMicMuted, mySpokenLanguage, myTargetLanguage, roomId, socket, userName])

  // Cleanup WebRTC Call & Streams
  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop() } catch (e) {}
      speechRecognizerRef.current = null
    }
    if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current)
    if (translationDebounceRef.current) clearTimeout(translationDebounceRef.current)
    lastSentTextRef.current = ''
    setActiveSubtitlePayload(null)
    setIsSubtitlesEnabled(false)
    setShowLanguagePicker(false)
    remoteStreamRef.current = null
    iceCandidatesQueueRef.current = []
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    setCallState(null)
    setIncomingSdpOffer(null)
    setIsMicMuted(false)
    setIsVideoMuted(false)
    setFacingMode('user')
    setShowFilterPicker(false)
  }

  // Socket Setup & WebRTC Event Handlers
  useEffect(() => {
    const isCapacitorNative = Boolean(
      (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
      (window.Capacitor && window.Capacitor.platform && window.Capacitor.platform !== 'web') ||
      window.location.href.includes('capacitor://')
    );

    const isLocalHost = !isCapacitorNative && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.') || 
      window.location.hostname.startsWith('10.') || 
      window.location.hostname.endsWith('.local')
    );

    const socketUrl = isLocalHost
      ? `http://${window.location.hostname}:5000`
      : 'https://aura-chat-oz1f.onrender.com'

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setIsConnected(true)
      if (isJoinedRef.current && roomIdRef.current) {
        console.log(`Auto re-joining room ${roomIdRef.current} on reconnect`)
        newSocket.emit('join_room', {
          roomId: roomIdRef.current,
          userName: userNameRef.current || 'User'
        })
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
      setPartnerOnline(false)
    })

    newSocket.on('room_history', (history) => {
      if (Array.isArray(history)) {
        setMessages(history.map(msg => ({
          ...msg,
          isOwn: msg.senderName === userNameRef.current || msg.isOwn,
          expiresAt: msg.expiresIn ? Date.now() + msg.expiresIn * 1000 : null
        })));
      }
    });

    const handleRoomUsers = ({ users, userCount }) => {
      const activeUsers = users || []
      const currentCount = userCount || activeUsers.length
      setRoomUserCount(currentCount)

      const myId = newSocket.id
      const partner = activeUsers.find(u => u.id !== myId)

      if (partner) {
        setOtherUserName(partner.name || 'Partner')
        setPartnerOnline(true)
      } else if (currentCount > 1) {
        const fallbackPartner = activeUsers.find(u => u.name !== userNameRef.current)
        if (fallbackPartner) setOtherUserName(fallbackPartner.name || 'Partner')
        setPartnerOnline(true)
      } else {
        setPartnerOnline(false)
      }
    }

    newSocket.on('user_joined', handleRoomUsers)
    newSocket.on('room_users_updated', handleRoomUsers)

    newSocket.on('user_left', ({ userCount, users }) => {
      const count = userCount || (users ? users.length : 1)
      setRoomUserCount(count)
      if (count <= 1) {
        setPartnerOnline(false)
      } else if (users) {
        handleRoomUsers({ users, userCount: count })
      }
    })

    newSocket.on('receive_message', (msgObj) => {
      const processedObj = {
        ...msgObj,
        isOwn: false,
        isRead: true,
        expiresAt: msgObj.expiresIn ? Date.now() + msgObj.expiresIn * 1000 : null
      }
      setMessages(prev => [...prev, processedObj]);
      if (msgObj.roomId && msgObj.id) {
        newSocket.emit('mark_read', { roomId: msgObj.roomId, messageId: msgObj.id });
      }
    })

    newSocket.on('message_read', ({ messageId }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRead: true } : m));
    })

    newSocket.on('message_reacted', ({ messageId, emoji, userName: reactor }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || {}
          const existing = currentReactions[emoji] || []
          const updated = existing.includes(reactor) 
            ? existing.filter(r => r !== reactor)
            : [...existing, reactor]
          return { ...m, reactions: { ...currentReactions, [emoji]: updated } }
        }
        return m
      }))
    })

    newSocket.on('poll_voted', ({ messageId, optionIndex, userName: voter }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.poll) {
          const updatedOptions = m.poll.options.map((opt, idx) => {
            const votes = opt.votes || []
            if (idx === optionIndex) {
              return { ...opt, votes: votes.includes(voter) ? votes : [...votes, voter] }
            } else {
              return { ...opt, votes: votes.filter(v => v !== voter) }
            }
          })
          return { ...m, poll: { ...m.poll, options: updatedOptions } }
        }
        return m
      }))
    })

    newSocket.on('canvas_drawn', ({ strokeData }) => {
      canvasStrokesRef.current.push(strokeData)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = strokeData.color
      ctx.lineWidth = strokeData.size
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(strokeData.x0, strokeData.y0)
      ctx.lineTo(strokeData.x1, strokeData.y1)
      ctx.stroke()
    })

    newSocket.on('canvas_cleared', () => {
      canvasStrokesRef.current = []
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#071816'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })

    // WebRTC Signaling Events
    newSocket.on('incoming_call', ({ callType: incomingType, callerName, sdpOffer }) => {
      setCallType(incomingType)
      if (callerName) setOtherUserName(callerName)
      setIncomingSdpOffer(sdpOffer)
      setCallState('incoming')
    })

    newSocket.on('call_accepted', async ({ sdpAnswer }) => {
      setCallState('connected')
      if (peerConnectionRef.current && sdpAnswer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdpAnswer))
          await processQueuedIceCandidates()
        } catch (e) {
          console.error('Error setting remote description on caller:', e)
        }
      }
    })

    newSocket.on('webrtc_ice_candidate', async ({ candidate }) => {
      await addOrQueueIceCandidate(candidate)
    })

    newSocket.on('call_rejected', () => {
      cleanupCall()
    })

    newSocket.on('call_ended', () => {
      cleanupCall()
    })

    newSocket.on('call_subtitle', async (payload) => {
      let displayTranslated = payload.translatedText
      if (payload.originalText) {
        try {
          const myTarget = myTargetLanguageRef.current || 'en'
          displayTranslated = await translateTextFree(payload.originalText, myTarget)
        } catch (err) {
          console.error('Receiver auto-translation error:', err)
        }
      }

      setActiveSubtitlePayload({
        ...payload,
        translatedText: displayTranslated || payload.translatedText || payload.originalText,
        isMine: false
      })

      if (subtitleTimerRef.current) clearTimeout(subtitleTimerRef.current)
      subtitleTimerRef.current = setTimeout(() => {
        setActiveSubtitlePayload(null)
      }, 7000)
    })

    newSocket.on('ghost_mode_updated', ({ enabled, timer }) => {
      setGhostMode(enabled);
      setGhostTimer(timer);
    })

    newSocket.on('clear_chat', () => {
      setMessages([]);
    })

    newSocket.on('typing', ({ userName: partnerName }) => {
      setOtherUserTyping(true);
      if (partnerName) setOtherUserName(partnerName);
    })

    newSocket.on('stop_typing', () => {
      setOtherUserTyping(false);
    })

    newSocket.on('room_full', () => {
      setRoomError('This room is full (Max 2 users).')
      setIsJoined(false)
      setRoomId('')
    })

    return () => newSocket.close()
  }, [])

  // Initialize WebRTC PeerConnection
  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(peerConfig)

    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })
    }

    pc.ontrack = (event) => {
      console.log('WebRTC Remote Track Received:', event.track.kind, event.streams)
      let remoteStream = event.streams && event.streams[0]
      if (!remoteStream) {
        remoteStream = remoteStreamRef.current || new MediaStream()
        remoteStream.addTrack(event.track)
      }
      remoteStreamRef.current = remoteStream

      // 1. Dedicated Remote Audio Player (ALWAYS active in DOM for 100% sound playback)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.muted = false
        remoteAudioRef.current.volume = 1.0
        remoteAudioRef.current.play().catch(e => console.error('Remote audio play error:', e))
      }

      // 2. Remote Video Player
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
        remoteVideoRef.current.play().catch(e => console.error('Remote video play error:', e))
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && roomId) {
        socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate })
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  const getMediaStream = async (type, currentFacingMode = facingMode) => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }

    const videoConstraints = type === 'video' ? {
      facingMode: currentFacingMode,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    } : false

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: videoConstraints
    })

    // Force all audio tracks to be explicitly enabled
    stream.getAudioTracks().forEach(track => {
      track.enabled = true
    })

    return stream
  }

  const toggleCameraFacingMode = async () => {
    if (callType !== 'video' || !localStreamRef.current) return
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacingMode)

    try {
      const oldTrack = localStreamRef.current.getVideoTracks()[0]
      if (oldTrack) oldTrack.stop()

      const newStream = await getMediaStream('video', nextFacingMode)
      const newVideoTrack = newStream.getVideoTracks()[0]

      if (oldTrack) localStreamRef.current.removeTrack(oldTrack)
      if (newVideoTrack) localStreamRef.current.addTrack(newVideoTrack)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video')
        if (sender && newVideoTrack) {
          await sender.replaceTrack(newVideoTrack)
        }
      }
    } catch (err) {
      console.error('Error flipping camera:', err)
      alert('Could not switch camera. Device might not support back camera or permission blocked.')
    }
  }

  // Start WebRTC Call
  const startCall = async (type) => {
    if (!socket || !roomId) return
    iceCandidatesQueueRef.current = []
    setCallType(type)
    setCallState('outgoing')

    try {
      const stream = await getMediaStream(type, 'user')
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = createPeerConnection(stream)
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      })
      await pc.setLocalDescription(offer)

      socket.emit('call_user', {
        roomId,
        callType: type,
        callerName: userName || 'You',
        sdpOffer: offer
      })
    } catch (err) {
      console.error('Error starting WebRTC call:', err)
      alert('Could not access camera/microphone. Please verify permissions.')
      cleanupCall()
    }
  }

  // Accept Call
  const acceptCall = async () => {
    if (!socket || !roomId || !incomingSdpOffer) return
    setCallState('connected')

    try {
      const stream = await getMediaStream(callType, 'user')
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = createPeerConnection(stream)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSdpOffer))
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      })
      await pc.setLocalDescription(answer)

      await processQueuedIceCandidates()

      socket.emit('accept_call', { roomId, sdpAnswer: answer })
    } catch (err) {
      console.error('Error accepting WebRTC call:', err)
      cleanupCall()
    }
  }

  const rejectCall = () => {
    ringtoneManager.playCallEndedSound()
    if (socket && roomId) socket.emit('reject_call', { roomId })
    cleanupCall()
  }

  const endCall = () => {
    ringtoneManager.playCallEndedSound()
    if (socket && roomId) socket.emit('end_call', { roomId })
    cleanupCall()
  }

  const toggleMicMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMicMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideoMute = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoMuted(!videoTrack.enabled)
      }
    }
  }

  // REAL MediaRecorder Voice Note Recording Functions
  const startRealAudioRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      setIsRecordingAudio(true)
      setRecordingSecs(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSecs(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access denied or error:', err)
      alert('Could not access microphone for recording.')
    }
  }

  const stopAndSendAudioRecording = () => {
    if (!mediaRecorderRef.current || !socket || !roomId) return

    const recorder = mediaRecorderRef.current
    clearInterval(recordingTimerRef.current)

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        const audioUrl = reader.result
        const msgId = Date.now() + Math.random().toString(36).substring(2, 5)
        const durationStr = formatCallDuration(recordingSecs)
        
        const msgObj = {
          id: msgId,
          roomId,
          type: 'voice',
          audioUrl: audioUrl,
          duration: durationStr,
          senderName: userName || 'You',
          isOwn: true,
          isRead: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        setMessages(prev => [...prev, msgObj])
        socket.emit('send_message', msgObj)
      }
      reader.readAsDataURL(audioBlob)

      // Stop mic tracks
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => track.stop())
      }
    }

    recorder.stop()
    setIsRecordingAudio(false)
    setRecordingSecs(0)
  }

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current
      clearInterval(recordingTimerRef.current)
      recorder.onstop = null
      recorder.stop()
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => track.stop())
      }
    }
    setIsRecordingAudio(false)
    setRecordingSecs(0)
    audioChunksRef.current = []
  }

  // Auto-fill Room Code from URL query parameters (e.g. ?room=ctrvu4)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomFromUrl = params.get('room')
    if (roomFromUrl && roomFromUrl.trim()) {
      const cleanRoom = roomFromUrl.trim()
      setRoomId(cleanRoom)
    }
  }, [])

  const handleJoinRoomWithCode = (customCode) => {
    const targetCode = (customCode || roomId || '').trim() || Math.random().toString(36).substring(2, 8)
    const nameToUse = userName.trim() || 'User'
    setUserName(nameToUse)
    setRoomId(targetCode)
    setIsJoined(true)
    setRoomError('')
    window.history.pushState({}, '', `?room=${targetCode}`)
    if (socket) {
      socket.emit('join_room', { roomId: targetCode, userName: nameToUse })
    }
  }

  const handleCreateRandomRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8)
    handleJoinRoomWithCode(newRoomId)
  }

  const handleLeaveRoom = () => {
    setIsJoined(false)
    setRoomId('')
    setMessages([])
    setRoomError('')
    window.history.pushState({}, '', window.location.pathname)
  }

  const handleSendText = () => {
    if (!isJoined || !currentMessage.trim() || !socket) return
    
    const msgId = Date.now() + Math.random().toString(36).substring(2, 5)
    const expiresIn = selfDestructSecs > 0 ? selfDestructSecs : null
    
    const msgObj = { 
      id: msgId, 
      roomId,
      type: 'text',
      text: currentMessage.trim(), 
      senderName: userName || 'You',
      isOwn: true,
      isRead: false,
      isBlurred: isBlurMode,
      expiresIn: expiresIn,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      replyTo: replyingToMessage ? {
        senderName: replyingToMessage.senderName,
        text: replyingToMessage.text || replyingToMessage.type
      } : null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, msgObj]);
    socket.emit('send_message', msgObj);
    setCurrentMessage('');
    setReplyingToMessage(null);
    handleStopTyping();
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !socket || !isJoined) return

    const isVideo = file.type.startsWith('video/')
    const reader = new FileReader()
    reader.onload = () => {
      const msgId = Date.now() + Math.random().toString(36).substring(2, 5)
      const expiresIn = selfDestructSecs > 0 ? selfDestructSecs : null
      const msgObj = {
        id: msgId,
        roomId,
        type: isVideo ? 'video' : 'image',
        mediaUrl: reader.result,
        fileName: file.name,
        text: '',
        senderName: userName || 'You',
        isOwn: true,
        isRead: false,
        expiresIn: expiresIn,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, msgObj])
      socket.emit('send_message', msgObj)
    }
    reader.readAsDataURL(file)
  }

  // Poll Creation & Voting
  const handleCreatePoll = () => {
    if (!socket || !roomId || !pollQuestion.trim()) return
    const filteredOptions = pollOptions.filter(o => o.trim())
    if (filteredOptions.length < 2) return

    const msgId = Date.now() + Math.random().toString(36).substring(2, 5)
    const pollData = {
      question: pollQuestion.trim(),
      options: filteredOptions.map(opt => ({ text: opt.trim(), votes: [] }))
    }
    const msgObj = {
      id: msgId,
      roomId,
      type: 'poll',
      poll: pollData,
      senderName: userName || 'You',
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, msgObj])
    socket.emit('send_message', msgObj)
    setShowPollModal(false)
    setPollQuestion('')
    setPollOptions(['', ''])
  }

  const handleVotePoll = (msgId, optionIndex) => {
    if (!socket || !roomId) return
    socket.emit('vote_poll', { roomId, messageId: msgId, optionIndex, userName: userName || 'You' })
  }

  // Collaborative Drawing Canvas Controls (Universal Touch & Mouse Support)
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX
      clientY = e.changedTouches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    if (clientX === undefined || clientY === undefined) return null
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return
    isDrawingRef.current = true
    lastPosRef.current = coords
  }

  const draw = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return
    if (e.cancelable) e.preventDefault()
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const strokeData = {
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: coords.x,
      y1: coords.y,
      color: brushColor,
      size: brushSize
    }

    ctx.strokeStyle = strokeData.color
    ctx.lineWidth = strokeData.size
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(strokeData.x0, strokeData.y0)
    ctx.lineTo(strokeData.x1, strokeData.y1)
    ctx.stroke()

    canvasStrokesRef.current.push(strokeData)
    lastPosRef.current = coords

    if (socket && roomId) {
      socket.emit('draw_stroke', { roomId, strokeData })
    }
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#071816'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    canvasStrokesRef.current = []
    if (socket && roomId) socket.emit('clear_canvas', { roomId })
  }

  const sendCanvasDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas || !socket || !roomId) return
    const dataUrl = canvas.toDataURL()
    const msgId = Date.now() + Math.random().toString(36).substring(2, 5)
    const msgObj = {
      id: msgId,
      roomId,
      type: 'image',
      mediaUrl: dataUrl,
      text: '🎨 Collaborative Canvas Sketch',
      senderName: userName || 'You',
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, msgObj])
    socket.emit('send_message', msgObj)
    setShowCanvasModal(false)
  }

  const handleAddReaction = (msgId, emoji) => {
    if (!socket || !roomId) return
    socket.emit('react_message', { roomId, messageId: msgId, emoji, userName: userName || 'You' })
    setActiveReactionMsgId(null)
  }

  const toggleGhostMode = () => {
    if (!socket || !roomId) return
    const newMode = !ghostMode;
    setGhostMode(newMode);
    socket.emit('toggle_ghost_mode', { roomId, enabled: newMode, timer: ghostTimer });
  }

  const clearChat = () => {
    if (!socket || !roomId) return
    setMessages([]);
    socket.emit('clear_chat', { roomId });
  }

  const handleTyping = () => {
    if (!isTyping && socket && roomId) {
      setIsTyping(true);
      socket.emit('typing', { roomId, userName });
    }
  }

  const handleStopTyping = () => {
    if (isTyping && socket && roomId) {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId });
    }
  }

  // Theme Styling Configuration Map
  const themeColors = {
    aura: { primary: '#00f5c4', bg: '#051312', header: '#081d1a', bubbleOwn: '#093a32', bubblePartner: '#0f2723', text: '#e9edef' },
    whatsapp: { primary: '#00a884', bg: '#0b141a', header: '#202c33', bubbleOwn: '#005c4b', bubblePartner: '#202c33', text: '#e9edef' },
    cyberpunk: { primary: '#00f3ff', bg: '#0d0814', header: '#190e28', bubbleOwn: '#5a0066', bubblePartner: '#241438', text: '#00f3ff' },
    stealth: { primary: '#00ff9d', bg: '#000000', header: '#0a0a0a', bubbleOwn: '#052b1b', bubblePartner: '#141414', text: '#ffffff' }
  }
  const theme = themeColors[selectedTheme] || themeColors.aura

  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '😎', '🥳'],
    'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '✋', '👋', '🤝', '🙏', '💪', '🧠', '👀', '👄'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  }

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥']

  const formatCallDuration = (secs) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0')
    const remainingSecs = (secs % 60).toString().padStart(2, '0')
    return `${mins}:${remainingSecs}`
  }

  const insertEmoji = (emoji) => {
    setCurrentMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    userIsAtBottomRef.current = true
    setShowScrollButtons(false)
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= 80
      userIsAtBottomRef.current = isAtBottom
      setShowScrollButtons(!isAtBottom)
    }
  }

  return (
    <div className="android-wrapper">
      {/* Dedicated Remote Audio Player for 100% Guaranteed Sound across all call states */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      <div className="android-device" style={{ backgroundColor: theme.bg }}>
        {/* Camera Punch Hole Notch */}
        <div className="android-notch"></div>

        {/* Android Top Status Bar */}
        <div className="android-status-bar" style={{ backgroundColor: theme.header }}>
          <div>{timeString || '16:27'}</div>
          <div className="status-bar-icons">
            <span style={{ color: theme.primary }}>5G</span>
            <span>📶</span>
            <span>99% 🔋</span>
          </div>
        </div>

        {/* Inner Screen */}
        <div className="android-screen" style={{ backgroundColor: theme.bg }}>
          {!isJoined ? (
            /* Android Home / Setup Screen */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: theme.bg,
              color: theme.text,
              backgroundImage: 'radial-gradient(ellipse at top left, rgba(0, 245, 196, 0.1) 0%, transparent 70%)'
            }}>
              {/* Header */}
              <div style={{
                backgroundColor: theme.header,
                padding: '14px 20px',
                borderBottom: '1px solid rgba(0, 245, 196, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/aura-logo.png" alt="AURA" style={{ height: '24px', borderRadius: '4px' }} />
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: theme.primary, letterSpacing: '1px' }}>AURA</span>
                </div>

                <button
                  onClick={() => {
                    const themes = ['aura', 'whatsapp', 'cyberpunk', 'stealth']
                    const nextIdx = (themes.indexOf(selectedTheme) + 1) % themes.length
                    setSelectedTheme(themes[nextIdx])
                  }}
                  style={{
                    backgroundColor: 'rgba(0, 245, 196, 0.1)',
                    color: theme.primary,
                    border: `1px solid ${theme.primary}`,
                    borderRadius: '12px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🎨 {selectedTheme.toUpperCase()}
                </button>
              </div>

              {/* Main Branding Card */}
              <div style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ position: 'relative', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src="/aura-logo.png"
                    alt="AURA Logo"
                    className="aura-logo-img"
                    style={{
                      width: '180px',
                      height: 'auto',
                      borderRadius: '20px',
                      boxShadow: '0 10px 30px rgba(0, 245, 196, 0.3)'
                    }}
                  />
                </div>

                <div style={{
                  fontSize: '12px',
                  letterSpacing: '2px',
                  color: '#00f5c4',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  marginBottom: '20px'
                }}>
                  Messages • Moments • Closer
                </div>

                {roomError && (
                  <div style={{
                    backgroundColor: 'rgba(241, 92, 107, 0.15)',
                    color: '#f15c6b',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '14px',
                    border: '1px solid rgba(241, 92, 107, 0.3)'
                  }}>
                    ⚠️ {roomError}
                  </div>
                )}

                {/* Your Name Input */}
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="👤 Your Display Name (e.g. Teja)"
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(0, 245, 196, 0.05)',
                    color: theme.text,
                    border: `1px solid ${theme.primary}`,
                    borderRadius: '25px',
                    fontSize: '14px',
                    outline: 'none',
                    textAlign: 'center',
                    marginBottom: '10px',
                    boxShadow: 'inset 0 0 10px rgba(0, 245, 196, 0.1)'
                  }}
                />

                {/* Room Code Input */}
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toLowerCase())}
                  placeholder="🔑 Enter Room Code (e.g. ctrvu4)"
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(0, 245, 196, 0.05)',
                    color: theme.primary,
                    border: `1px solid ${theme.primary}`,
                    borderRadius: '25px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    outline: 'none',
                    textAlign: 'center',
                    marginBottom: '14px',
                    boxShadow: 'inset 0 0 10px rgba(0, 245, 196, 0.1)'
                  }}
                />

                <button
                  onClick={() => handleJoinRoomWithCode()}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '14px',
                    backgroundColor: theme.primary,
                    color: '#051312',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    boxShadow: `0 4px 18px ${theme.primary}55`
                  }}
                >
                  🚀 Enter Room
                </button>

                <button
                  onClick={handleCreateRandomRoom}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '12px',
                    backgroundColor: theme.header,
                    color: theme.primary,
                    border: `1px solid ${theme.primary}aa`,
                    borderRadius: '25px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🎲 Create New Random Room
                </button>

                <a
                  href="https://github.com/Srinivas5773/aura-chat/releases/download/v1.0.0/AURA-v1.0.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '12px',
                    backgroundColor: 'rgba(0, 245, 196, 0.08)',
                    color: theme.primary,
                    border: `1px dashed ${theme.primary}88`,
                    borderRadius: '25px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    textAlign: 'center',
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  <span>📲</span>
                  <span>Download Android APK</span>
                </a>
              </div>

              <div style={{
                padding: '16px 14px',
                textAlign: 'center',
                borderTop: '1px solid rgba(0, 245, 196, 0.15)',
                backgroundColor: 'rgba(0, 245, 196, 0.02)'
              }}>
                <span className="developer-shining-text">
                  ✨ Developed by Srinivas ✨
                </span>
              </div>
            </div>
          ) : (
            /* Android Chat Screen */
            <div style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: ghostMode ? '#0a1017' : theme.bg,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Chat Header */}
              <div style={{
                backgroundColor: theme.header,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(0, 245, 196, 0.15)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleLeaveRoom}
                    style={{ background: 'none', border: 'none', color: '#aebac1', fontSize: '20px', cursor: 'pointer' }}
                  >
                    ←
                  </button>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: theme.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#051312',
                    fontWeight: 'bold',
                    boxShadow: `0 0 12px ${theme.primary}66`
                  }}>
                    {otherUserName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{otherUserName}</span>
                      <span
                        onClick={() => {
                          const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`
                          navigator.clipboard.writeText(shareUrl).then(() => alert(`Room Link Copied!\nShare this link to join: ${shareUrl}`))
                        }}
                        title="Click to Copy Shareable Room Link"
                        style={{
                          fontSize: '10px',
                          color: theme.primary,
                          backgroundColor: 'rgba(0,245,196,0.15)',
                          border: `1px solid ${theme.primary}44`,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🏷️ {roomId} 📋
                      </span>
                    </div>
                    <div style={{ color: otherUserTyping ? theme.primary : (!isConnected ? '#ff4b4b' : (partnerOnline ? '#00f5c4' : '#eab308')), fontSize: '11px', fontWeight: '500' }}>
                      {otherUserTyping 
                        ? (ghostMode ? '👻 A ghost is typing...' : 'typing...') 
                        : (!isConnected 
                            ? '⚠️ Disconnected - Reconnecting...' 
                            : (ghostMode 
                                ? '👻 Ghost Mode' 
                                : (partnerOnline 
                                    ? '🟢 Online' 
                                    : '🟡 Waiting for partner to join...')))}
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowCanvasModal(true)}
                    title="Collaborative Whiteboard Canvas"
                    style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '18px', cursor: 'pointer' }}
                  >
                    🎨
                  </button>

                  <button
                    onClick={() => startCall('video')}
                    title="Start Live WebRTC Video Call"
                    style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '18px', cursor: 'pointer' }}
                  >
                    📹
                  </button>

                  <button
                    onClick={() => startCall('audio')}
                    title="Start Live WebRTC Audio Call"
                    style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '18px', cursor: 'pointer' }}
                  >
                    📞
                  </button>

                  <button
                    onClick={toggleGhostMode}
                    title="Toggle Ghost Mode"
                    style={{
                      padding: '4px 8px',
                      backgroundColor: ghostMode ? 'rgba(74, 158, 255, 0.2)' : 'rgba(0, 245, 196, 0.08)',
                      color: ghostMode ? '#4a9eff' : theme.primary,
                      border: ghostMode ? '1px solid #4a9eff' : `1px solid ${theme.primary}`,
                      borderRadius: '12px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    👻
                  </button>
                </div>
              </div>

              {/* Secondary Toolbar */}
              <div style={{
                backgroundColor: theme.header,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(0, 245, 196, 0.05)',
                fontSize: '11px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#8696a0' }}>🔥 Auto-Burn:</span>
                  <select
                    value={selfDestructSecs}
                    onChange={(e) => setSelfDestructSecs(Number(e.target.value))}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: selfDestructSecs > 0 ? '#f15c6b' : theme.primary,
                      border: selfDestructSecs > 0 ? '1px solid #f15c6b' : '1px solid #143530',
                      borderRadius: '8px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    <option value={0}>Off</option>
                    <option value={5}>5 sec</option>
                    <option value={15}>15 sec</option>
                    <option value={30}>30 sec</option>
                    <option value={60}>60 sec</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowPollModal(true)}
                  title="Create Instant Poll"
                  style={{
                    backgroundColor: 'rgba(0, 245, 196, 0.15)',
                    color: theme.primary,
                    border: `1px solid ${theme.primary}`,
                    borderRadius: '10px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📊 Create Poll
                </button>
              </div>

              {/* Chat Messages Scroll Area */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  padding: '14px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundImage: ghostMode 
                    ? 'radial-gradient(ellipse at center, rgba(74, 158, 255, 0.08) 0%, transparent 80%)'
                    : 'radial-gradient(circle at center, rgba(0, 245, 196, 0.03) 1px, transparent 1px)',
                  backgroundSize: ghostMode ? 'auto' : '20px 20px'
                }}
              >
                {messages.length === 0 && (
                  <div style={{
                    margin: 'auto',
                    backgroundColor: theme.header,
                    color: '#8696a0',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    textAlign: 'center',
                    border: '1px solid rgba(0, 245, 196, 0.15)'
                  }}>
                    🔒 AURA WebRTC Encrypted • Messages • Moments • Closer
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
                      position: 'relative'
                    }}
                  >
                    <div
                      onMouseEnter={() => setActiveReactionMsgId(msg.id)}
                      style={{
                        maxWidth: '84%',
                        padding: '8px 12px',
                        backgroundColor: msg.isOwn 
                          ? (ghostMode ? '#1e3a5f' : theme.bubbleOwn) 
                          : (ghostMode ? '#1c2836' : theme.bubblePartner),
                        color: theme.text,
                        borderRadius: msg.isOwn ? '12px 12px 0px 12px' : '12px 12px 12px 0px',
                        fontSize: '14px',
                        wordBreak: 'break-word',
                        position: 'relative',
                        boxShadow: ghostMode ? '0 0 15px rgba(74, 158, 255, 0.25)' : '0 2px 6px rgba(0,0,0,0.3)',
                        border: ghostMode ? '1px solid rgba(74, 158, 255, 0.3)' : `1px solid rgba(0, 245, 196, 0.15)`
                      }}
                    >
                      {!msg.isOwn && (
                        <div style={{ fontSize: '11px', color: theme.primary, fontWeight: 'bold', marginBottom: '3px' }}>
                          {msg.senderName || 'Partner'}
                        </div>
                      )}

                      {msg.expiresAt && (
                        <div style={{
                          fontSize: '10px',
                          color: '#f15c6b',
                          fontWeight: 'bold',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>🔥 Burns in {Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 1000))}s</span>
                        </div>
                      )}

                      {msg.replyTo && (
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          borderLeft: `4px solid ${theme.primary}`,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          fontSize: '12px',
                          color: '#aebac1'
                        }}>
                          <div style={{ fontWeight: 'bold', color: theme.primary, fontSize: '11px' }}>
                            {msg.replyTo.senderName}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.replyTo.text}
                          </div>
                        </div>
                      )}

                      {/* Render text / poll / image / REAL voice audio player */}
                      {msg.type === 'poll' ? (
                        <div style={{ width: '220px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: theme.primary }}>
                            📊 {msg.poll.question}
                          </div>
                          {msg.poll.options.map((opt, idx) => {
                            const totalVotes = msg.poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)
                            const voteCount = opt.votes?.length || 0
                            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                            const hasVoted = opt.votes?.includes(userName || 'You')

                            return (
                              <div
                                key={idx}
                                onClick={() => handleVotePoll(msg.id, idx)}
                                style={{
                                  backgroundColor: hasVoted ? 'rgba(0, 245, 196, 0.2)' : 'rgba(255,255,255,0.05)',
                                  border: hasVoted ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  padding: '6px 10px',
                                  marginBottom: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  width: `${percent}%`,
                                  backgroundColor: 'rgba(0, 245, 196, 0.2)',
                                  zIndex: 0
                                }}></div>
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{opt.text}</span>
                                  <span style={{ fontWeight: 'bold', color: theme.primary }}>{percent}% ({voteCount})</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : msg.type === 'image' ? (
                        <div style={{ position: 'relative', maxWidth: '260px' }}>
                          <div
                            onClick={() => setSelectedPreviewImage(msg)}
                            style={{
                              position: 'relative',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: `1px solid ${theme.primary}33`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="Shared photo"
                              style={{
                                width: '100%',
                                maxHeight: '260px',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadImage(msg.mediaUrl, msg.fileName || 'aura_image.png')
                              }}
                              title="Download Image"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                color: theme.primary,
                                border: `1px solid ${theme.primary}66`,
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                                zIndex: 5
                              }}
                            >
                              ⬇️
                            </button>
                          </div>

                          {msg.text && !msg.text.includes('.png') && !msg.text.includes('.jpg') && !msg.text.includes('Screenshot') && (
                            <div style={{ fontSize: '13px', marginTop: '4px', padding: '0 2px', color: theme.text }}>
                              {msg.text}
                            </div>
                          )}
                        </div>
                      ) : msg.type === 'video' ? (
                        <div style={{ position: 'relative', maxWidth: '280px' }}>
                          <div
                            onClick={() => setSelectedPreviewImage(msg)}
                            style={{
                              position: 'relative',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: `1px solid ${theme.primary}33`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              backgroundColor: '#000000'
                            }}
                          >
                            <video
                              src={msg.mediaUrl}
                              style={{
                                width: '100%',
                                maxHeight: '260px',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              border: `2px solid ${theme.primary}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              color: theme.primary,
                              pointerEvents: 'none'
                            }}>
                              ▶
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadImage(msg.mediaUrl, msg.fileName || 'aura_video.mp4')
                              }}
                              title="Download Video"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                color: theme.primary,
                                border: `1px solid ${theme.primary}66`,
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                                zIndex: 5
                              }}
                            >
                              ⬇️
                            </button>
                          </div>
                          {msg.text && !msg.text.includes('.mp4') && !msg.text.includes('.webm') && (
                            <div style={{ fontSize: '13px', marginTop: '4px', padding: '0 2px', color: theme.text }}>
                              {msg.text}
                            </div>
                          )}
                        </div>
                      ) : msg.type === 'voice' ? (
                        /* REAL Playable HTML5 Audio Voice Note */
                        <div style={{ minWidth: '200px', padding: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: theme.primary, fontWeight: 'bold', marginBottom: '6px' }}>
                            <span>🎙️ Real Voice Note ({msg.duration || '0:05'})</span>
                          </div>
                          {msg.audioUrl ? (
                            <audio
                              controls
                              src={msg.audioUrl}
                              style={{
                                width: '100%',
                                height: '36px',
                                borderRadius: '18px',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '11px', color: '#8696a0' }}>[Audio unavailable]</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {msg.text && msg.text.startsWith('```') ? (
                            <div className="code-block-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8696a0', fontSize: '10px', marginBottom: '4px' }}>
                                <span>CODE SNIPPET</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(msg.text.replace(/```/g, ''))}
                                  style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '10px', cursor: 'pointer' }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <code>{msg.text.replace(/```/g, '')}</code>
                            </div>
                          ) : (
                            <div className={msg.isBlurred ? 'blurred-text' : ''}>
                              {msg.text}
                              {msg.isBlurred && <span style={{ fontSize: '10px', color: '#8696a0', marginLeft: '6px' }}>(Hover/Tap)</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reaction Badges */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => users.length > 0 && (
                            <span
                              key={emoji}
                              style={{
                                backgroundColor: theme.bg,
                                border: '1px solid rgba(0, 245, 196, 0.2)',
                                borderRadius: '12px',
                                padding: '1px 6px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                            >
                              <span>{emoji}</span>
                              <span style={{ fontSize: '10px', color: '#8696a0' }}>{users.length}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Timestamp & Read Checkmarks */}
                      <div style={{
                        fontSize: '10px',
                        color: msg.isOwn ? 'rgba(255,255,255,0.6)' : '#8696a0',
                        textAlign: 'right',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}>
                        <button
                          onClick={() => setReplyingToMessage(msg)}
                          title="Quote & Reply"
                          style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                        >
                          ↩️
                        </button>
                        <span>{msg.time || '16:27'}</span>
                        {msg.isOwn && (
                          <span style={{ color: msg.isRead ? theme.primary : 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                            ✓✓
                          </span>
                        )}
                      </div>

                      {/* Quick Reaction Popover */}
                      {activeReactionMsgId === msg.id && (
                        <div style={{
                          position: 'absolute',
                          top: '-32px',
                          right: msg.isOwn ? '0' : 'auto',
                          left: msg.isOwn ? 'auto' : '0',
                          backgroundColor: theme.header,
                          border: `1px solid ${theme.primary}66`,
                          borderRadius: '20px',
                          padding: '2px 8px',
                          display: 'flex',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          zIndex: 30
                        }}>
                          {quickReactions.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '2px' }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {otherUserTyping && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '6px 12px',
                      backgroundColor: theme.header,
                      color: theme.primary,
                      borderRadius: '12px 12px 12px 0px',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      border: '1px solid rgba(0, 245, 196, 0.2)'
                    }}>
                      {ghostMode ? '👻 A ghost is typing...' : `${otherUserName} is typing...`}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quoted Reply Bar */}
              {replyingToMessage && (
                <div style={{
                  backgroundColor: theme.header,
                  borderLeft: `4px solid ${theme.primary}`,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div>
                    <div style={{ color: theme.primary, fontSize: '11px', fontWeight: 'bold' }}>
                      Replying to {replyingToMessage.senderName}
                    </div>
                    <div style={{ color: '#8696a0', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                      {replyingToMessage.text || 'Attachment'}
                    </div>
                  </div>
                  <button onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '14px', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              {/* Scroll To Bottom Button Indicator */}
              {showScrollButtons && (
                <button
                  onClick={scrollToBottom}
                  style={{
                    position: 'absolute',
                    bottom: '70px',
                    right: '16px',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: theme.header,
                    border: `1px solid ${theme.primary}`,
                    color: theme.primary,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 14px ${theme.primary}55`,
                    zIndex: 20
                  }}
                >
                  ↓
                </button>
              )}

              {/* Emoji Picker Overlay */}
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '65px',
                  left: '10px',
                  right: '10px',
                  backgroundColor: theme.header,
                  border: `1px solid ${theme.primary}44`,
                  borderRadius: '12px',
                  padding: '10px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#8696a0', fontSize: '11px', fontWeight: 'bold' }}>EMOJIS</span>
                    <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>✕</button>
                  </div>
                  {Object.entries(emojiCategories).map(([category, emojis]) => (
                    <div key={category} style={{ marginBottom: '6px' }}>
                      <div style={{ color: theme.primary, fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>{category}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {emojis.map((emoji, idx) => (
                          <button key={idx} onClick={() => insertEmoji(emoji)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '2px' }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <input type="file" ref={fileInputRef} accept="image/*,video/*" onChange={handleImageUpload} style={{ display: 'none' }} />

              {/* Bottom Input Bar with REAL MediaRecorder Audio Recording Controls */}
              <div style={{
                backgroundColor: theme.header,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderTop: '1px solid rgba(0, 245, 196, 0.08)'
              }}>
                {isRecordingAudio ? (
                  /* Active Live Audio Recording Bar */
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(241, 92, 107, 0.15)',
                    border: '1px solid #f15c6b',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    color: '#f15c6b'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                      <span style={{ fontSize: '16px', animation: 'sparkle 1s infinite' }}>🎙️</span>
                      <span>Recording... {formatCallDuration(recordingSecs)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={cancelAudioRecording}
                        title="Cancel Recording"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#8696a0',
                          fontSize: '16px',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        ✕
                      </button>

                      <button
                        onClick={stopAndSendAudioRecording}
                        title="Send Recorded Voice Note"
                        style={{
                          backgroundColor: theme.primary,
                          color: '#051312',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ➤
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Input Bar Controls */
                  <>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#8696a0' }}
                    >
                      😊
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach Image"
                      style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#8696a0' }}
                    >
                      📎
                    </button>

                    <button
                      onClick={() => setIsBlurMode(!isBlurMode)}
                      title="Toggle Blur-to-Reveal Peek Protection"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        color: isBlurMode ? '#f15c6b' : '#8696a0'
                      }}
                    >
                      👁️
                    </button>

                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => {
                        setCurrentMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                      onBlur={handleStopTyping}
                      placeholder={isBlurMode ? "Blurred Message..." : (replyingToMessage ? "Type reply..." : "Message")}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        backgroundColor: 'rgba(0, 245, 196, 0.05)',
                        color: theme.text,
                        border: isBlurMode ? '1px solid #f15c6b' : `1px solid ${theme.primary}33`,
                        borderRadius: '20px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />

                    {currentMessage.trim() ? (
                      <button
                        onClick={handleSendText}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: theme.primary,
                          color: '#051312',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          cursor: 'pointer',
                          boxShadow: `0 0 12px ${theme.primary}66`
                        }}
                      >
                        ➤
                      </button>
                    ) : (
                      <button
                        onClick={startRealAudioRecording}
                        title="Record Voice Note"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: theme.primary,
                          color: '#051312',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          cursor: 'pointer',
                          boxShadow: `0 0 12px ${theme.primary}66`
                        }}
                      >
                        🎙️
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Collaborative Whiteboard Canvas Modal */}
          {showCanvasModal && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#051312',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: theme.primary, fontWeight: 'bold', fontSize: '14px' }}>🎨 Live Collaborative Canvas</span>
                <button onClick={() => setShowCanvasModal(false)} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['#00f5c4', '#00a884', '#4a9eff', '#ff0055', '#ffcc00', '#ffffff'].map(color => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: brushColor === color ? '2px solid white' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <button onClick={clearCanvas} style={{ backgroundColor: '#081d1a', color: '#f15c6b', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>
                  🗑️ Clear
                </button>
                <button onClick={sendCanvasDrawing} style={{ backgroundColor: theme.primary, color: '#051312', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  📤 Send to Chat
                </button>
              </div>

              <canvas
                ref={canvasRef}
                width={400}
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
                style={{
                  flex: 1,
                  width: '100%',
                  backgroundColor: '#071816',
                  borderRadius: '12px',
                  border: `1px solid ${theme.primary}`,
                  cursor: 'crosshair',
                  touchAction: 'none'
                }}
              />
            </div>
          )}

          {/* Quick Poll Modal */}
          {showPollModal && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: theme.header,
                border: `1px solid ${theme.primary}`,
                borderRadius: '16px',
                padding: '16px',
                width: '100%',
                maxWidth: '320px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: theme.primary, fontWeight: 'bold' }}>📊 Create Instant Poll</span>
                  <button onClick={() => setShowPollModal(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>✕</button>
                </div>

                <input
                  type="text"
                  placeholder="Poll Question?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, border: '1px solid #333', borderRadius: '8px', marginBottom: '10px', outline: 'none' }}
                />

                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions]
                      updated[idx] = e.target.value
                      setPollOptions(updated)
                    }}
                    style={{ width: '100%', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, border: '1px solid #333', borderRadius: '8px', marginBottom: '6px', outline: 'none' }}
                  />
                ))}

                {pollOptions.length < 4 && (
                  <button
                    onClick={() => setPollOptions(prev => [...prev, ''])}
                    style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '12px', cursor: 'pointer', marginBottom: '12px' }}
                  >
                    ➕ Add Option
                  </button>
                )}

                <button
                  onClick={handleCreatePoll}
                  style={{ width: '100%', padding: '10px', backgroundColor: theme.primary, color: '#051312', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Send Poll
                </button>
              </div>
            </div>
          )}

          {/* Full-Screen WhatsApp-Style Video & Audio Call Overlay */}
          {callState && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#030d0c',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px 16px',
              color: '#e9edef',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              {/* Top Calling Status Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 30,
                backgroundColor: 'rgba(0,0,0,0.4)',
                padding: '10px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: theme.primary, fontWeight: 'bold', letterSpacing: '1px' }}>
                    🔒 END-TO-END ENCRYPTED {callType.toUpperCase()} CALL
                  </div>
                  <h2 style={{ margin: '2px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
                    {otherUserName}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#aebac1' }}>
                    {callState === 'outgoing' && 'Ringing...'}
                    {callState === 'incoming' && 'Incoming Call...'}
                    {callState === 'connected' && `🟢 Live • ${formatCallDuration(callDuration)}`}
                    {callState === 'connected' && isSubtitlesEnabled && (
                      <span style={{ marginLeft: '8px', color: theme.primary, fontWeight: 'bold' }}>
                        • 💬 Translator Active ({mySpokenLanguage.toUpperCase()} ➔ {myTargetLanguage.toUpperCase()})
                      </span>
                    )}
                  </div>
                </div>

                {callType === 'video' && callState === 'connected' && (
                  <button
                    onClick={() => setShowFilterPicker(!showFilterPicker)}
                    style={{
                      backgroundColor: showFilterPicker ? theme.primary : 'rgba(255,255,255,0.15)',
                      color: showFilterPicker ? '#051312' : '#ffffff',
                      border: `1px solid ${theme.primary}66`,
                      borderRadius: '20px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    ✨ Filters
                  </button>
                )}
              </div>

              {/* Live Video View Container */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#020908'
              }}>
                {/* Dedicated Remote Audio Player for 100% Guaranteed Sound */}
                <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

                {/* Remote Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: videoFilterStyles[activeVideoFilter] || 'none',
                    display: (callType === 'video' && callState === 'connected') ? 'block' : 'none'
                  }}
                />

                {/* PIP Picture-in-Picture Local Video Stream */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    top: '90px',
                    right: '16px',
                    width: '110px',
                    height: '160px',
                    objectFit: 'cover',
                    borderRadius: '16px',
                    border: `2px solid ${theme.primary}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                    filter: videoFilterStyles[activeVideoFilter] || 'none',
                    display: (callType === 'video' && !isVideoMuted && (callState === 'connected' || callState === 'outgoing')) ? 'block' : 'none',
                    zIndex: 25,
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                  }}
                />

                {/* Avatar Display when Camera Muted or Audio Call */}
                {(callType !== 'video' || isVideoMuted || callState === 'incoming') && (
                  <div style={{ textAlign: 'center', zIndex: 10 }}>
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: theme.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '56px',
                      margin: '0 auto 20px auto',
                      color: '#051312',
                      boxShadow: `0 0 40px ${theme.primary}88`
                    }}>
                      {otherUserName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '15px', color: '#aebac1', fontWeight: '500' }}>
                      {callType === 'video' ? 'Camera Muted' : 'AURA HD Audio Connection'}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Filter Picker Overlay */}
              {showFilterPicker && callType === 'video' && (
                <div style={{
                  position: 'absolute',
                  bottom: '110px',
                  left: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(5, 19, 18, 0.92)',
                  border: `1px solid ${theme.primary}66`,
                  borderRadius: '16px',
                  padding: '12px',
                  zIndex: 50,
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.primary, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🎨 LIVE VIDEO FILTERS</span>
                    <button onClick={() => setShowFilterPicker(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {videoFilterLabels.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveVideoFilter(f.id)
                          setShowFilterPicker(false)
                        }}
                        style={{
                          backgroundColor: activeVideoFilter === f.id ? theme.primary : 'rgba(255,255,255,0.08)',
                          color: activeVideoFilter === f.id ? '#051312' : '#e9edef',
                          border: activeVideoFilter === f.id ? 'none' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Multilingual Call Subtitle Banner */}
              {activeSubtitlePayload && callState === 'connected' && (
                <div style={{
                  position: 'absolute',
                  bottom: '105px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '92%',
                  maxWidth: '560px',
                  backgroundColor: 'rgba(5, 20, 18, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${theme.primary}66`,
                  borderRadius: '20px',
                  padding: '14px 20px',
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px ${theme.primary}22`,
                  zIndex: 40,
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: theme.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
                    <span>💬 {activeSubtitlePayload.senderName}</span>
                    <span>•</span>
                    <span style={{ color: '#aebac1', fontWeight: '400' }}>
                      {activeSubtitlePayload.isMine ? 'Your Speech' : 'Live Translation'}
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600', lineHeight: '1.4', wordBreak: 'break-word' }}>
                    {activeSubtitlePayload.translatedText || activeSubtitlePayload.originalText}
                  </div>
                  {activeSubtitlePayload.originalText && activeSubtitlePayload.originalText !== activeSubtitlePayload.translatedText && (
                    <div style={{ fontSize: '12px', color: '#90a0a9', marginTop: '4px', fontStyle: 'italic' }}>
                      "{activeSubtitlePayload.originalText}"
                    </div>
                  )}
                </div>
              )}

              {/* Language Selector Modal */}
              {showLanguagePicker && callState === 'connected' && (
                <div style={{
                  position: 'absolute',
                  bottom: '105px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  maxWidth: '380px',
                  backgroundColor: 'rgba(8, 28, 25, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${theme.primary}88`,
                  borderRadius: '24px',
                  padding: '20px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                  zIndex: 50,
                  color: '#ffffff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: theme.primary, fontWeight: '700' }}>
                      🌐 Live Translator Settings
                    </h3>
                    <button onClick={() => setShowLanguagePicker(false)} style={{ background: 'none', border: 'none', color: '#aebac1', fontSize: '18px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>

                  {/* Spoken Language */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#aebac1', marginBottom: '6px' }}>
                      🗣️ I will speak in:
                    </label>
                    <select
                      value={mySpokenLanguage}
                      onChange={(e) => setMySpokenLanguage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#ffffff',
                        border: `1px solid ${theme.primary}44`,
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    >
                      {TRANSLATION_LANGUAGES.map(lang => (
                        <option key={`spoken-${lang.code}`} value={lang.code} style={{ background: '#0a1d1a', color: '#fff' }}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Language */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#aebac1', marginBottom: '6px' }}>
                      🎯 Translate partner subtitles to:
                    </label>
                    <select
                      value={myTargetLanguage}
                      onChange={(e) => setMyTargetLanguage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#ffffff',
                        border: `1px solid ${theme.primary}44`,
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    >
                      {TRANSLATION_LANGUAGES.map(lang => (
                        <option key={`target-${lang.code}`} value={lang.code} style={{ background: '#0a1d1a', color: '#fff' }}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setIsSubtitlesEnabled(true)
                      setShowLanguagePicker(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      backgroundColor: theme.primary,
                      color: '#051312',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: `0 4px 15px ${theme.primary}44`
                    }}
                  >
                    ✅ Turn On Subtitles
                  </button>
                </div>
              )}

              {/* Bottom Control Bar */}
              <div style={{ zIndex: 30, display: 'flex', justifyContent: 'center' }}>
                {callState === 'incoming' ? (
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
                    <button onClick={rejectCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f15c6b', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(241, 92, 107, 0.4)' }}>
                      📞
                    </button>
                    <button onClick={acceptCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: theme.primary, color: '#051312', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: `0 4px 16px ${theme.primary}66` }}>
                      📞
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    backgroundColor: 'rgba(8, 29, 26, 0.85)',
                    padding: '12px 20px',
                    borderRadius: '32px',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${theme.primary}44`,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
                  }}>
                    {/* Mute Mic */}
                    <button onClick={toggleMicMute} title="Toggle Microphone" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isMicMuted ? '#f15c6b' : 'rgba(255,255,255,0.12)', color: 'white', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                      {isMicMuted ? '🔇' : '🎙️'}
                    </button>

                    {/* Toggle Video */}
                    {callType === 'video' && (
                      <button onClick={toggleVideoMute} title="Toggle Camera" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isVideoMuted ? '#f15c6b' : 'rgba(255,255,255,0.12)', color: 'white', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                        {isVideoMuted ? '🚫' : '📹'}
                      </button>
                    )}

                    {/* Live Translator & Subtitles Toggle */}
                    {callState === 'connected' && (
                      <button
                        onClick={() => {
                          if (!isSubtitlesEnabled) {
                            setShowLanguagePicker(true)
                          } else {
                            setIsSubtitlesEnabled(false)
                            setShowLanguagePicker(false)
                          }
                        }}
                        title="Live Call Subtitles & Real-Time Voice Translator"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: isSubtitlesEnabled ? theme.primary : 'rgba(255,255,255,0.12)',
                          color: isSubtitlesEnabled ? '#051312' : '#ffffff',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          boxShadow: isSubtitlesEnabled ? `0 0 14px ${theme.primary}aa` : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        💬
                      </button>
                    )}

                    {/* Language Settings Modal Toggle */}
                    {callState === 'connected' && isSubtitlesEnabled && (
                      <button
                        onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                        title="Language Translator Settings"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.12)',
                          color: theme.primary,
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer'
                        }}
                      >
                        🌐
                      </button>
                    )}

                    {/* Flip Camera (Front / Back) */}
                    {callType === 'video' && !isVideoMuted && (
                      <button onClick={toggleCameraFacingMode} title="Flip Camera (Front / Back)" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)', color: theme.primary, border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                        🔄
                      </button>
                    )}

                    {/* End Call */}
                    <button onClick={endCall} title="End Call" style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f15c6b', color: 'white', border: 'none', fontSize: '22px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(241, 92, 107, 0.5)' }}>
                      📞
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        {/* Full-Screen WhatsApp-Style Image Preview & Download Modal */}
        {selectedPreviewImage && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px'
          }}>
            {/* Top Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
              padding: '8px 14px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.primary }}>
                  {selectedPreviewImage.type === 'video' ? '🎥 Video' : '📷 Photo'} • {selectedPreviewImage.senderName || 'Media'}
                </div>
                <div style={{ fontSize: '11px', color: '#aebac1' }}>
                  {selectedPreviewImage.time}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => downloadImage(
                    selectedPreviewImage.mediaUrl,
                    selectedPreviewImage.fileName || (selectedPreviewImage.type === 'video' ? 'aura_video.mp4' : 'aura_photo.png')
                  )}
                  style={{
                    backgroundColor: theme.primary,
                    color: '#051312',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: `0 0 12px ${theme.primary}66`
                  }}
                >
                  <span>⬇️</span>
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setSelectedPreviewImage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e9edef',
                    fontSize: '22px',
                    cursor: 'pointer',
                    padding: '0 6px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Centered Large Media (Image or Video) */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0',
              overflow: 'hidden'
            }}>
              {selectedPreviewImage.type === 'video' ? (
                <video
                  src={selectedPreviewImage.mediaUrl}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100%',
                    maxHeight: '76vh',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
                  }}
                />
              ) : (
                <img
                  src={selectedPreviewImage.mediaUrl}
                  alt="Full Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '76vh',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
                  }}
                />
              )}
            </div>

            {/* Bottom Download Bar */}
            <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
              <button
                onClick={() => downloadImage(
                  selectedPreviewImage.mediaUrl,
                  selectedPreviewImage.fileName || (selectedPreviewImage.type === 'video' ? 'aura_video.mp4' : 'aura_photo.png')
                )}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '12px',
                  backgroundColor: theme.primary,
                  color: '#051312',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: `0 4px 18px ${theme.primary}55`
                }}
              >
                📥 Download {selectedPreviewImage.type === 'video' ? 'Video' : 'Image'} to Device
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
}

export default App
