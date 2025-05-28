import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube as YoutubeIcon, MessageSquare, CheckCircle, XCircle, Send, ChevronLeft, ChevronRight, Lightbulb, Bot, User as UserIcon, Play, Pause, Volume2, Maximize } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const YOUTUBE_VIDEO_ID = 'sqdwl8nfUXA';

interface TranscriptSegment {
  id: number;
  startTime: number; // in seconds
  text: string;
}

const mockTranscript: TranscriptSegment[] = [
  { id: 1, startTime: 0, text: "Welcome to today's live class on Advanced React Patterns!" },
  { id: 2, startTime: 5, text: "We'll be covering hooks, context API, and performance optimization." },
  { id: 3, startTime: 10, text: "First, let's dive into custom hooks. They allow you to extract component logic into reusable functions." },
  { id: 4, startTime: 18, text: "Consider a scenario where you need to fetch data in multiple components." },
  { id: 5, startTime: 25, text: "Instead of repeating the fetching logic, you can create a `useFetch` custom hook." },
  { id: 6, startTime: 32, text: "This hook can handle loading states, error handling, and data memoization." },
  { id: 7, startTime: 40, text: "Let's look at an example. Here, `useFetch` takes a URL and returns data, loading, and error states." },
  { id: 8, startTime: 50, text: "Now, let's discuss the Context API. It provides a way to pass data through the component tree without having to pass props down manually at every level." },
  { id: 9, startTime: 60, text: "This is particularly useful for global data like themes, user authentication, or language preferences." },
  { id: 10, startTime: 70, text: "To use Context, you first create a Context object using `React.createContext`." },
  { id: 11, startTime: 80, text: "Then, you use a Provider component to make the context value available to all descendants." },
  { id: 12, startTime: 90, text: "And finally, consumer components can subscribe to this context using `useContext` hook or a Consumer component." },
  { id: 13, startTime: 100, text: "Remember, while Context is powerful, it can make component reuse more difficult, so use it judiciously." },
];

interface MCQ {
  id: number;
  startTime: number; // in seconds
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

const mockMCQs: MCQ[] = [
  {
    id: 1,
    startTime: 30,
    question: "What is the primary purpose of custom hooks in React?",
    options: ["To replace Redux", "To extract component logic into reusable functions", "To style components", "To handle routing"],
    correctAnswerIndex: 1,
    explanation: "Custom hooks allow you to share stateful logic between components without changing component hierarchy."
  },
  {
    id: 2,
    startTime: 75,
    question: "Which React feature is used to pass data through the component tree without manual prop drilling?",
    options: ["State", "Props", "Context API", "Refs"],
    correctAnswerIndex: 2,
    explanation: "The Context API is designed to share data that can be considered “global” for a tree of React components."
  },
];

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const LiveClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Simulated
  const [currentTranscriptSegment, setCurrentTranscriptSegment] = useState<TranscriptSegment | null>(mockTranscript[0]);
  const [showMCQModal, setShowMCQModal] = useState(false);
  const [activeMCQ, setActiveMCQ] = useState<MCQ | null>(null);
  const [selectedMCQAnswer, setSelectedMCQAnswer] = useState<number | null>(null);
  const [mcqFeedback, setMcqFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // Simulate video playback and sync features
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isVideoPlaying) {
      intervalId = setInterval(() => {
        setCurrentTimeInSeconds(prevTime => {
          const newTime = prevTime + 1;

          // Update transcript
          const nextTranscriptSegment = mockTranscript.find(
            segment => newTime >= segment.startTime && (mockTranscript.findIndex(s => s.id === segment.id) === mockTranscript.length - 1 || newTime < mockTranscript[mockTranscript.findIndex(s => s.id === segment.id) + 1].startTime)
          );
          if (nextTranscriptSegment && nextTranscriptSegment.id !== currentTranscriptSegment?.id) {
            setCurrentTranscriptSegment(nextTranscriptSegment);
          }

          // Trigger MCQ
          const mcqToShow = mockMCQs.find(mcq => mcq.startTime === newTime);
          if (mcqToShow && !activeMCQ) { // Show only if not already showing an MCQ
            setActiveMCQ(mcqToShow);
            setShowMCQModal(true);
            setSelectedMCQAnswer(null);
            setMcqFeedback(null);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isVideoPlaying, currentTranscriptSegment?.id, activeMCQ]);

  useEffect(() => {
    if (transcriptContainerRef.current && currentTranscriptSegment) {
      const activeElement = transcriptContainerRef.current.querySelector(`[data-segment-id="${currentTranscriptSegment.id}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTranscriptSegment]);
  
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);


  const handleMCQAnswer = (selectedIndex: number) => {
    if (!activeMCQ) return;
    setSelectedMCQAnswer(selectedIndex);
    const correct = selectedIndex === activeMCQ.correctAnswerIndex;
    setMcqFeedback({ correct, explanation: activeMCQ.explanation });
    toast(correct ? 'Correct Answer!' : 'Incorrect Answer.', { icon: correct ? '✅' : '❌' });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !user) {
      if(!user) toast.error("Please log in to use the chat.");
      return;
    }
    const newUserMessage: ChatMessage = { id: Date.now().toString(), type: 'user', text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsAiTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));
    const aiResponseText = `AI response to: "${currentInput}". For this live class on Advanced React Patterns, this concept is crucial because...`;
    const newAiMessage: ChatMessage = { id: (Date.now() + 1).toString(), type: 'ai', text: aiResponseText, timestamp: new Date() };
    setChatMessages(prev => [...prev, newAiMessage]);
    setIsAiTyping(false);
  };

  const togglePlayPause = () => setIsVideoPlaying(!isVideoPlaying);

  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Class: Advanced React Patterns</h1>
        <p className="text-gray-600">Join our interactive session. Engage with transcripts, quizzes, and AI chat.</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content: Video + Transcription */}
        <div className="lg:flex-[2] space-y-6">
          <Card className="p-2 sm:p-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&modestbranding=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            {/* Simulated Player Controls - Basic */}
            <div className="mt-4 flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                    <Button onClick={togglePlayPause} variant="ghost" size="sm" className="p-2">
                        {isVideoPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </Button>
                    <div className="text-sm text-gray-600">
                        Time: {Math.floor(currentTimeInSeconds / 60)}:{(currentTimeInSeconds % 60).toString().padStart(2, '0')}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-2"><Volume2 size={20} /></Button>
                    <Button variant="ghost" size="sm" className="p-2"><Maximize size={20} /></Button>
                </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <MessageSquare size={24} className="mr-2 text-blue-600" /> Live Transcription
            </h2>
            <div ref={transcriptContainerRef} className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg border">
              {mockTranscript.map(segment => (
                <motion.p
                  key={segment.id}
                  data-segment-id={segment.id}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: currentTranscriptSegment?.id === segment.id ? 1 : 0.6, scale: currentTranscriptSegment?.id === segment.id ? 1.02 : 1 }}
                  className={`text-sm transition-all duration-300 p-2 rounded ${
                    currentTranscriptSegment?.id === segment.id ? 'text-gray-900 font-medium bg-blue-50' : 'text-gray-600'
                  }`}
                >
                  <span className="font-semibold text-blue-600 mr-1.5">[{Math.floor(segment.startTime/60)}:{(segment.startTime%60).toString().padStart(2,'0')}]</span>
                  {segment.text}
                </motion.p>
              ))}
            </div>
          </Card>
        </div>

        {/* AI Chatbot - Collapsible on smaller screens, fixed on larger */}
        <div className={`lg:flex-[1] transition-all duration-300 ease-in-out ${isChatOpen ? 'fixed inset-0 bg-black bg-opacity-50 z-40 lg:static lg:bg-transparent lg:z-auto' : 'hidden lg:block'}`} onClick={() => { if (window.innerWidth < 1024) setIsChatOpen(false);}}>
          <motion.div 
            className={`h-full w-full max-w-md ml-auto lg:max-w-none bg-white shadow-xl lg:shadow-none lg:rounded-none flex flex-col ${isChatOpen ? 'rounded-l-xl' : 'rounded-xl'}`}
            initial={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            animate={window.innerWidth < 1024 ? { x: isChatOpen ? "0%" : "100%" } : { opacity: 1 }}
            exit={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-0 flex flex-col h-[calc(100vh-8rem)] lg:h-auto lg:max-h-[calc(48rem)]"> {/* Adjusted height */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Bot size={20} className="mr-2 text-blue-600" /> AI Doubt Solver
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="lg:hidden p-1">
                  <ChevronRight size={20} />
                </Button>
              </div>
              <div ref={chatMessagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg shadow-sm text-sm ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}>
                      <div className="flex items-start space-x-1.5">
                        {msg.type === 'ai' && <Bot size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                        <p>{msg.text}</p>
                        {msg.type === 'user' && <UserIcon size={14} className="text-blue-200 mt-0.5 flex-shrink-0" />}
                      </div>
                      <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-200 text-right' : 'text-gray-500'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-800 border px-3 py-2 rounded-lg shadow-sm">
                            <div className="flex items-center space-x-1.5">
                                <Bot size={14} className="text-blue-500" />
                                <div className="flex space-x-1">
                                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`}}></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder={user ? "Ask a question..." : "Login to chat"}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={!user}
                  />
                  <Button onClick={handleChatSend} size="md" disabled={!user || !chatInput.trim()}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Chat Toggle Button for Mobile/Tablet */}
        {!isChatOpen && (
          <Button
            variant="primary"
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-30 lg:hidden rounded-full p-3 shadow-lg"
            aria-label="Open AI Chat"
          >
            <Bot size={24} />
          </Button>
        )}
      </div>

      {/* MCQ Modal */}
      <AnimatePresence>
        {showMCQModal && activeMCQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            onClick={() => { /* setShowMCQModal(false); setActiveMCQ(null); */ }} // Prevent closing on overlay click until answered
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center text-blue-600 mb-4">
                <Lightbulb size={24} className="mr-2"/>
                <h3 className="text-xl font-bold">Quick Question!</h3>
              </div>
              <p className="text-gray-700 mb-1">Video Time: {Math.floor(activeMCQ.startTime / 60)}:{(activeMCQ.startTime % 60).toString().padStart(2, '0')}</p>
              <p className="text-gray-800 font-medium mb-5">{activeMCQ.question}</p>
              <div className="space-y-3 mb-5">
                {activeMCQ.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedMCQAnswer === index ? (mcqFeedback?.correct ? 'primary' : 'secondary') : 'outline'}
                    size="md"
                    className={`w-full justify-start text-left h-auto py-2.5 ${selectedMCQAnswer === index && mcqFeedback?.correct ? 'bg-green-500 hover:bg-green-600 border-green-500' : ''} ${selectedMCQAnswer === index && mcqFeedback && !mcqFeedback.correct ? 'bg-red-500 hover:bg-red-600 border-red-500' : ''}`}
                    onClick={() => !mcqFeedback && handleMCQAnswer(index)}
                    disabled={!!mcqFeedback}
                  >
                    {mcqFeedback && selectedMCQAnswer === index && (mcqFeedback.correct ? <CheckCircle size={18} className="mr-2"/> : <XCircle size={18} className="mr-2"/>)}
                    {option}
                  </Button>
                ))}
              </div>
              {mcqFeedback && (
                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className={`p-3 rounded-lg text-sm ${mcqFeedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <p className="font-semibold">{mcqFeedback.correct ? 'Correct!' : 'Incorrect.'}</p>
                  <p>{mcqFeedback.explanation}</p>
                </motion.div>
              )}
              {mcqFeedback && (
                <Button onClick={() => { setShowMCQModal(false); setActiveMCQ(null); setMcqFeedback(null); setSelectedMCQAnswer(null); }} className="w-full mt-5">
                  Continue Class
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
