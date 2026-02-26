import { useState } from 'react'
import './Quiz.css'

const QUESTIONS = [
  {
    id: 1,
    question: "A reel goes viral with 10M views. What's your first instinct?",
    icon: '📱',
    options: [
      { label: 'Drop 50 fire emojis and share it everywhere', value: 'hype' },
      { label: 'Write a perfectly timed joke in the comments', value: 'witty' },
      { label: 'Leave a genuine compliment for the creator', value: 'supportive' },
      { label: 'Contemplate what it says about society', value: 'mysterious' },
    ],
  },
  {
    id: 2,
    question: "Your friend posts a reel of their new hobby. You reply with...",
    icon: '🎨',
    options: [
      { label: '"YESSS go off!! This is incredible!!"', value: 'hype' },
      { label: '"So THIS is why you\'ve been ghosting the group chat"', value: 'witty' },
      { label: '"I\'m so proud of you for trying something new 💛"', value: 'supportive' },
      { label: '"There\'s something beautifully raw about beginnings..."', value: 'mysterious' },
    ],
  },
  {
    id: 3,
    question: "What matters most in a great comment section?",
    icon: '💬',
    options: [
      { label: 'Pure unfiltered hype and energy', value: 'hype' },
      { label: 'Clever threads that make you actually laugh', value: 'witty' },
      { label: 'People lifting each other up genuinely', value: 'supportive' },
      { label: 'Deep, thoughtful takes that make you think', value: 'mysterious' },
    ],
  },
  {
    id: 4,
    question: "Pick a vibe for your Instagram presence:",
    icon: '✨',
    options: [
      { label: 'The party — loud, proud, and always ON', value: 'hype' },
      { label: 'The comedy club — sharp and surprising', value: 'witty' },
      { label: 'The warm hug — safe space for everyone', value: 'supportive' },
      { label: 'The midnight journal — deep and poetic', value: 'mysterious' },
    ],
  },
]

export default function Quiz({ onComplete }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [animating, setAnimating] = useState(false)

  const question = QUESTIONS[current]
  const progress = ((current) / QUESTIONS.length) * 100

  const handleSelect = (value) => {
    if (animating) return
    setSelected(value)
    setAnimating(true)

    setTimeout(() => {
      const newAnswers = [...answers, value]
      setAnswers(newAnswers)

      if (current < QUESTIONS.length - 1) {
        setCurrent(current + 1)
        setSelected(null)
        setAnimating(false)
      } else {
        onComplete(newAnswers)
      }
    }, 500)
  }

  return (
    <section className="quiz" key={current}>
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-counter">
        Question {current + 1} of {QUESTIONS.length}
      </div>

      <div className="quiz-icon">{question.icon}</div>

      <h2 className="quiz-question">{question.question}</h2>

      <div className="quiz-options">
        {question.options.map((option, i) => (
          <button
            key={i}
            className={`quiz-option ${selected === option.value ? 'selected' : ''}`}
            onClick={() => handleSelect(option.value)}
            disabled={animating}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="option-text">{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
