import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube as YoutubeIcon, MessageSquare, Send, ChevronLeft, ChevronRight, Lightbulb, Bot, User as UserIcon, Play, Pause, Volume2, Maximize, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { InteractivePanel, LeaderboardEntry } from './InteractivePanel'; // Import new component
import { faker } from '@faker-js/faker';

const YOUTUBE_VIDEO_ID = 'sqdwl8nfUXA';

export interface TranscriptSegment { // Export for InteractivePanel
  id: number;
  startTime: number; // in seconds
  text: string;
}

export const mockTranscript: TranscriptSegment[] = [ // Export for InteractivePanel
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
  { id: 14, startTime: 110, text: "Moving on to performance optimization, memoization is key. React.memo and useMemo are your friends." },
  { id: 15, startTime: 120, text: "Virtualization for long lists can also significantly improve rendering performance." },
  { id: 16, startTime: 130, text: "Code splitting helps reduce initial load time by only loading the JavaScript needed for the current view." },
  { id: 17, startTime: 140, text: "Always profile your application using React DevTools to identify bottlenecks." },
  { id: 18, startTime: 150, text: "That concludes our main topics for today. We'll now open the floor for Q&A." },
];

export interface MCQ { // Export for InteractivePanel
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export const liveClassMockMcqs: MCQ[] = [ // Export for InteractivePanel
  {
    id: 1,
    question: "What is the primary purpose of custom hooks in React?",
    options: ["To replace Redux", "To extract component logic into reusable functions", "To style components", "To handle routing"],
    correctAnswerIndex: 1,
    explanation: "Custom hooks allow you to share stateful logic between components without changing component hierarchy."
  },
  {
    id: 2,
    question: "Which React feature is used to pass data through the component tree without manual prop drilling?",
    options: ["State", "Props", "Context API", "Refs"],
    correctAnswerIndex: 2,
    explanation: "The Context API is designed to share data that can be considered “global” for a tree of React components."
  },
  {
    id: 3,
    question: "What does `React.memo` help with?",
    options: ["State management", "Memoizing functional components to prevent re-renders", "Fetching data", "Creating context"],
    correctAnswerIndex: 1,
    explanation: "`React.memo` is a higher-order component that memoizes your component, skipping re-renders if props haven't changed."
  },
  {
    id: 4,
    question: "What is code splitting in React?",
    options: ["Splitting CSS into multiple files", "Splitting JavaScript bundles to load parts on demand", "Splitting components into smaller ones", "A way to manage state"],
    correctAnswerIndex: 1,
    explanation: "Code splitting helps reduce initial load time by loading only the JavaScript needed for the current view, improving performance."
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
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState(0); // Simulated video time
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); 
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // States for InteractivePanel
  const [currentLiveMCQ, setCurrentLiveMCQ] = useState<MCQ | null>(liveClassMockMcqs[0]);
  const [liveMCQTimer, setLiveMCQTimer] = useState(60);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [newQuestionIndicator, setNewQuestionIndicator] = useState(false);
  const [userQuizScore, setUserQuizScore] = useState(0); // User's score in the live quiz

  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null); // Ref for video player height

  // Generate initial leaderboard data
  useEffect(() => {
    const mockLeaderboard: LeaderboardEntry[] = Array.from({ length: 10 }).map((_, i) => ({
      id: faker.string.uuid(),
      name: faker.person.firstName() + " " + faker.person.lastName().charAt(0) + ".",
      avatar: faker.image.avatarGitHub(),
      score: faker.number.int({ min: 50, max: 500 }),
      correctAnswers: faker.number.int({ min: 5, max: 20 }),
      avgTime: parseFloat(faker.number.float({ min: 5, max: 25, precision: 0.1 }).toFixed(1)),
    })).sort((a, b) => b.score - a.score);
    setLeaderboardData(mockLeaderboard);
  }, []);

  // Simulate video playback and sync features for InteractivePanel
  useEffect(() => {
    let videoTimerId: NodeJS.Timeout;
    let mcqIntervalId: NodeJS.Timeout;

    if (isVideoPlaying) {
      // Video time simulation
      videoTimerId = setInterval(() => {
        setCurrentTimeInSeconds(prevTime => prevTime + 1);
      }, 1000);

      // MCQ rotation and timer
      mcqIntervalId = setInterval(() => {
        setLiveMCQTimer(prev => {
          if (prev === 1) { // Time for new question
            const currentIndex = liveClassMockMcqs.findIndex(mcq => mcq.id === currentLiveMCQ?.id);
            const nextIndex = (currentIndex + 1) % liveClassMockMcqs.length;
            setCurrentLiveMCQ(liveClassMockMcqs[nextIndex]);
            setNewQuestionIndicator(true); // Trigger notification
            setTimeout(() => setNewQuestionIndicator(false), 3000); // Hide after 3s
            return 60; // Reset timer
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(videoTimerId);
      clearInterval(mcqIntervalId);
    };
  }, [isVideoPlaying, currentLiveMCQ]);
  
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

    await new Promise(resolve => setTimeout(resolve, 1500));
    const aiResponseText = `AI response to: "${currentInput}". For this live class on Advanced React Patterns, this concept is crucial because...`;
    const newAiMessage: ChatMessage = { id: (Date.now() + 1).toString(), type: 'ai', text: aiResponseText, timestamp: new Date() };
    setChatMessages(prev => [...prev, newAiMessage]);
    setIsAiTyping(false);
  };

  const togglePlayPause = () => setIsVideoPlaying(!isVideoPlaying);

  const handleQuizAnswerSubmit = (isCorrect: boolean) => {
    if (isCorrect) {
      const points = 10; // Example points
      setUserQuizScore(prev => prev + points);
      toast.success(`Correct! +${points} points`);

      // Update user on leaderboard (or add if not present)
      setLeaderboardData(prevLeaderboard => {
        const userEntryIndex = prevLeaderboard.findIndex(entry => entry.name === (user?.name || "You"));
        let updatedLeaderboard;
        if (userEntryIndex > -1) {
          updatedLeaderboard = [...prevLeaderboard];
          updatedLeaderboard[userEntryIndex] = {
            ...updatedLeaderboard[userEntryIndex],
            score: updatedLeaderboard[userEntryIndex].score + points,
            correctAnswers: updatedLeaderboard[userEntryIndex].correctAnswers + 1,
          };
        } else {
          updatedLeaderboard = [...prevLeaderboard, {
            id: user?.id || faker.string.uuid(),
            name: user?.name || "You",
            avatar: user?.avatar || faker.image.avatarGitHub(),
            score: points,
            correctAnswers: 1,
            avgTime: 30, // Mock avg time
          }];
        }
        return updatedLeaderboard.sort((a, b) => b.score - a.score);
      });
    } else {
      toast.error("Incorrect. Try the next one!");
    }
    // Move to next question or show some feedback
    const currentIndex = liveClassMockMcqs.findIndex(mcq => mcq.id === currentLiveMCQ?.id);
    const nextIndex = (currentIndex + 1) % liveClassMockMcqs.length;
    setCurrentLiveMCQ(liveClassMockMcqs[nextIndex]);
    setLiveMCQTimer(60); // Reset timer
    setNewQuestionIndicator(true);
    setTimeout(() => setNewQuestionIndicator(false), 3000);
  };


  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Class: Advanced React Patterns</h1>
        <p className="text-gray-600">Join our interactive session. Engage with transcripts, quizzes, and AI chat.</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content Area: Video + Interactive Panel */}
        <div className="lg:flex-[2] space-y-6 flex flex-col"> {/* Make this flex column */}
          <Card className="p-2 sm:p-4" ref={videoPlayerRef}>
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&modestbranding=1&rel=0&controls=1`} // Enable controls
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
            {/* Simulated Player Controls - Basic (can be removed if YouTube controls are sufficient) */}
            <div className="mt-4 flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                    <Button onClick={togglePlayPause} variant="ghost" size="sm" className="p-2">
                        {isVideoPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </Button>
                    <div className="text-sm text-gray-600">
                        Simulated Time: {Math.floor(currentTimeInSeconds / 60)}:{(currentTimeInSeconds % 60).toString().padStart(2, '0')}
                    </div>
                </div>
                {/* <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-2"><Volume2 size={20} /></Button>
                    <Button variant="ghost" size="sm" className="p-2"><Maximize size={20} /></Button>
                </div> */}
            </div>
          </Card>

          {/* Interactive Panel (Transcription, Quiz, Leaderboard) */}
          <div className="flex-grow"> {/* Allow this panel to take remaining vertical space */}
            <InteractivePanel
              currentSimulatedTime={currentTimeInSeconds}
              currentMCQ={currentLiveMCQ}
              mcqTimer={liveMCQTimer}
              leaderboardData={leaderboardData}
              newQuestionIndicator={newQuestionIndicator}
              onQuizAnswerSubmit={handleQuizAnswerSubmit}
            />
          </div>
        </div>

        {/* AI Chatbot Panel */}
        <div className={`lg:flex-[1] transition-all duration-300 ease-in-out 
                       ${isChatOpen 
                         ? 'fixed inset-0 bg-black bg-opacity-50 z-40 lg:static lg:bg-transparent lg:z-auto' 
                         : 'hidden lg:block'}`} 
             onClick={() => { if (window.innerWidth < 1024) setIsChatOpen(false);}}>
          <motion.div 
            className={`h-full w-full max-w-md ml-auto lg:max-w-none bg-white shadow-xl lg:shadow-none lg:rounded-none flex flex-col 
                       ${isChatOpen ? 'rounded-l-xl' : 'lg:rounded-xl'}`}
            initial={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            animate={window.innerWidth < 1024 ? { x: isChatOpen ? "0%" : "100%" } : { opacity: 1 }}
            exit={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              height: videoPlayerRef.current && window.innerWidth >=1024 
                ? `${videoPlayerRef.current.offsetHeight + (document.querySelector('.interactive-panel-actual-height')?.clientHeight || 400)}px` // Match video + interactive panel height on desktop
                : 'calc(100vh - 4rem)', // Default for mobile or if ref not ready
              maxHeight: 'calc(100vh - 4rem)' // Ensure it doesn't overflow viewport
            }}
          >
            <Card className="p-0 flex flex-col h-full"> {/* Ensure card fills the motion.div */}
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
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
              <div className="p-4 border-t sticky bottom-0 bg-white z-10">
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
            className="fixed bottom-6 right-6 z-30 lg:hidden rounded-full p-3 shadow-lg flex items-center justify-center"
            aria-label="Open AI Chat"
          >
            <Bot size={24} />
          </Button>
        )}
      </div>
    </div>
  );
};
