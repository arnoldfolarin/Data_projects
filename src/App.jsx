import { useState } from 'react'
import Hero from './components/Hero'
import Quiz from './components/Quiz'
import Result from './components/Result'
import './App.css'

const PERSONALITY_TYPES = {
  hype: {
    name: 'The Hype Machine',
    emoji: '🔥',
    color: '#fd1d1d',
    description: 'You bring ALL the energy. Every reel deserves maximum hype from you.',
    replies: [
      'THIS IS EVERYTHING 🔥🔥🔥',
      'I literally cannot stop watching this!!',
      'Obsessed. Sharing this with everyone I know 💯',
      'You just broke the internet fr fr 🚀',
      'Main character energy right here ✨',
    ],
  },
  witty: {
    name: 'The Witty Observer',
    emoji: '😏',
    color: '#833ab4',
    description: 'Your replies are clever, sharp, and always land. Comedy gold every time.',
    replies: [
      'My therapist is going to hear about this one 😂',
      'POV: me pretending I didn\'t just watch this 47 times',
      'The algorithm really said "here, you need this" 💀',
      'This is the content I pay my wifi bill for',
      'Saving this for when someone asks why I\'m on my phone',
    ],
  },
  supportive: {
    name: 'The Cheerleader',
    emoji: '💛',
    color: '#f77737',
    description: 'You lift people up with genuine, heartfelt replies that make their day.',
    replies: [
      'This genuinely made my whole day better 💛',
      'You are so talented, never stop creating!',
      'The world needs more content like this 🙌',
      'I love how authentic this is. Keep shining! ✨',
      'Sending this so much love — you\'re amazing!',
    ],
  },
  mysterious: {
    name: 'The Cryptic Sage',
    emoji: '🌙',
    color: '#405de6',
    description: 'Your replies are intriguing and leave people wanting more. Deep vibes only.',
    replies: [
      'This hit different at 3am... 🌙',
      'There\'s a deeper meaning here and I\'m here for it',
      'The universe definitely wanted me to see this ✨',
      'This awakened something in me I can\'t explain',
      'Bookmarking this for my future self to understand 🔮',
    ],
  },
}

function App() {
  const [screen, setScreen] = useState('landing')
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null)

  const handleStart = () => setScreen('quiz')

  const handleQuizComplete = (quizAnswers) => {
    setAnswers(quizAnswers)
    const counts = { hype: 0, witty: 0, supportive: 0, mysterious: 0 }
    quizAnswers.forEach((a) => counts[a]++)
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    setResult(PERSONALITY_TYPES[topType])
    setScreen('result')
  }

  const handleRestart = () => {
    setScreen('landing')
    setAnswers([])
    setResult(null)
  }

  return (
    <div className="app">
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      {screen === 'landing' && <Hero onStart={handleStart} />}
      {screen === 'quiz' && <Quiz onComplete={handleQuizComplete} />}
      {screen === 'result' && <Result result={result} onRestart={handleRestart} />}
    </div>
  )
}

export default App
