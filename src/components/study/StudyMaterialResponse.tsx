import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence here
import { ArrowLeft, MessageSquare, PlayCircle, BookOpen, Brain, Share2, Download, Trophy, Clock, ChevronRight, Send, Bot, User as UserIcon, AlertTriangle, Languages, Film, Youtube as YoutubeIcon, FileText, CheckSquare, Zap, Maximize, Menu, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StudyMaterial, Quiz, InputContent } from '../../types';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { contentService, PwVideo } from '../../services/contentService';
import toast from 'react-hot-toast';

interface StudyMaterialResponseProps {
  data: {
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    content: string; 
    outputLanguage: string;
    originalInput: InputContent;
  };
  onBack: () => void;
  onNewStudy: () => void;
  isTopicView?: boolean;
}

const getYoutubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    }
  } catch (e) {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
      videoId = match[1];
    } else if (url.length === 11 && !url.includes('.')) {
        videoId = url;
    }
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

type ActiveToolModal = 'flashcards' | 'mindmap' | 'summary' | 'quiz' | null;

export const StudyMaterialResponse: React.FC<StudyMaterialResponseProps> = ({ data, onBack, onNewStudy, isTopicView = false }) => {
  const [activeToolModal, setActiveToolModal] = useState<ActiveToolModal>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const effectiveOutputLanguage = (data?.outputLanguage?.trim() !== '') ? data.outputLanguage : 'english';
  const languageLabel = effectiveOutputLanguage.charAt(0).toUpperCase() + effectiveOutputLanguage.slice(1);
  const initialChatMessageText = isTopicView
    ? `Viewing materials for ${data.topic} (in ${languageLabel}). Ask me about this topic!`
    : `Hi! I'm your AI tutor for ${data.topic} (in ${languageLabel}). How can I help you learn better?`;
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; type: 'user' | 'ai'; content: string; timestamp: Date }>>([
    { id: 'initial-ai-message', type: 'ai', content: initialChatMessageText, timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  
  const [recommendedVideo, setRecommendedVideo] = useState<PwVideo | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (data.originalInput.type !== 'youtube' && data.originalInput.type !== 'video' && data.originalInput.type !== 'videolecture') {
      const videos = contentService.searchPwVideos(data.topic);
      if (videos.length > 0) {
        setRecommendedVideo(videos[0]);
      } else {
        setRecommendedVideo(contentService.getAllPwVideos()[0]); 
      }
    }
  }, [data.topic, data.originalInput.type]);

  const handleQuizStart = () => {
    if (!data.quiz) return;
    setQuizStarted(true);
    setCurrentQuizQuestion(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    storageService.addActivity({ type: 'quiz', title: `Started quiz: ${data.quiz.title}`, points: 0, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
  };

  const handleQuizAnswer = (questionId: string, answer: any) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (!data.quiz) return;
    if (currentQuizQuestion < data.quiz.questions.length - 1) {
      setCurrentQuizQuestion(prev => prev + 1);
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = () => {
    if (!data.quiz) return;
    let score = 0;
    let totalPoints = 0;
    data.quiz.questions.forEach(question => {
      totalPoints += question.points;
      const userAnswer = quizAnswers[question.id];
      if (question.type === 'mcq') {
        if (userAnswer === question.correctAnswer) score += question.points;
      } else {
        if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim().length > 10) score += Math.floor(question.points * 0.7);
      }
    });
    setQuizScore(score);
    setQuizCompleted(true);
    storageService.saveQuizResult({ quizId: data.quiz.id, quizTitle: data.quiz.title, topic: data.topic, score, totalPoints, answers: quizAnswers, completedAt: new Date(), language: effectiveOutputLanguage });
    storageService.addActivity({ type: 'quiz', title: `Completed quiz: ${data.quiz.title}`, score: `${score}/${totalPoints}`, points: score, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
    storageService.updateUserStats(score, 'quiz');
    toast.success(`Quiz completed! You scored ${score}/${totalPoints} points.`);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = { id: Date.now().toString(), type: 'user' as const, content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    const currentChatInput = chatInput;
    setChatInput('');
    setIsAITyping(true);
    try {
      const chatContextContent = data.originalInput?.content || data.topic;
      const aiResponse = await aiService.generateChatResponse(currentChatInput, data.topic, chatContextContent, effectiveOutputLanguage);
      const aiMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: aiResponse, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast.error('Failed to get AI response.');
    } finally {
      setIsAITyping(false);
    }
  };

  const openToolModal = (tool: ActiveToolModal) => {
    if (tool === 'flashcards') {
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
    }
    if (tool === 'quiz' && data.quiz) {
      handleQuizStart();
    }
    setActiveToolModal(tool);
  };

  const flashcardMaterial = data.materials.find(m => m.type === 'flashcards');
  const mindMapMaterial = data.materials.find(m => m.type === 'mindmap');
  const summaryMaterial = data.materials.find(m => m.type === 'summary');

  const renderVideoPlayer = () => {
    const { type, content, metadata } = data.originalInput;
    if (type === 'youtube') {
      const embedUrl = getYoutubeEmbedUrl(content);
      return embedUrl ? (
        <iframe className="w-full h-full rounded-lg" src={embedUrl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
      ) : <p className="text-red-500">Invalid YouTube URL.</p>;
    }
    if (type === 'videolecture') {
      return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><Film size={48} className="mb-2" /><p className="font-semibold">{metadata?.title || content}</p><p className="text-sm">Video Lecture (Playback N/A)</p></div>;
    }
    if (type === 'video') {
       return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><VideoIcon size={48} className="mb-2" /><p className="font-semibold">{content}</p><p className="text-sm">Uploaded Video (Playback N/A)</p></div>;
    }
    if (recommendedVideo) {
        const embedUrl = getYoutubeEmbedUrl(recommendedVideo.youtubeUrl);
        return embedUrl ? (
            <iframe className="w-full h-full rounded-lg" src={embedUrl} title={recommendedVideo.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        ) : <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><YoutubeIcon size={48} className="mb-2" /><p className="font-semibold">{recommendedVideo.title}</p><p className="text-sm">Recommended Video</p></div>;
    }
    return <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg"><p>No video content for this input type.</p></div>;
  };

  const interactiveTools = [
    { id: 'flashcards' as ActiveToolModal, label: 'Flashcards', icon: CheckSquare, disabled: !flashcardMaterial },
    { id: 'mindmap' as ActiveToolModal, label: 'Mind Map', icon: Brain, disabled: !mindMapMaterial },
    { id: 'summary' as ActiveToolModal, label: 'Summary', icon: FileText, disabled: !summaryMaterial },
    { id: 'quiz' as ActiveToolModal, label: 'Quiz', icon: Trophy, disabled: !data.quiz || (isTopicView && !data.quiz) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2"><ArrowLeft size={20} /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.topic}</h1>
            <div className="flex items-center text-sm text-gray-500">
              <Languages size={14} className="mr-1.5" /><span>{languageLabel}</span>
              <span className="mx-1.5">•</span>
              <span>{isTopicView ? "Viewing saved materials" : "Complete study package"}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-center">
          <Button variant="outline" size="md" onClick={onNewStudy}>{isTopicView ? `Generate New for ${data.topic}` : "Start New Study"}</Button>
          <Button variant="primary" size="md" onClick={() => toast.success("Share functionality coming soon!")}><Share2 size={16} className="mr-2" /> Share</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="lg:flex-[2] space-y-4 flex flex-col">
          <Card className="p-2 sm:p-4 flex-shrink-0" ref={videoPlayerRef}>
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
              {renderVideoPlayer()}
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Interactive Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {interactiveTools.map(tool => {
                const Icon = tool.icon;
                return (
                  <Button key={tool.id} variant="outline" size="md" onClick={() => openToolModal(tool.id)} disabled={tool.disabled} className="flex flex-col items-center justify-center h-20 sm:h-24 text-xs sm:text-sm">
                    <Icon size={20} className="mb-1" /> {tool.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>

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
                ? `${videoPlayerRef.current.offsetHeight + document.querySelector('.interactive-tools-card')?.clientHeight || 0}px` 
                : 'calc(100vh - 4rem)',
              maxHeight: 'calc(100vh - 4rem)'
            }}
          >
            <Card className="p-0 flex flex-col flex-grow h-full">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Bot size={20} className="mr-2 text-blue-600" /> AI Tutor
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="lg:hidden p-1">
                  <ChevronRight size={20} />
                </Button>
              </div>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg shadow-sm text-sm ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}>
                      <div className="flex items-start space-x-1.5">
                        {msg.type === 'ai' && <Bot size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                        <p>{msg.content}</p>
                        {msg.type === 'user' && <UserIcon size={14} className="text-blue-200 mt-0.5 flex-shrink-0" />}
                      </div>
                    </div>
                  </div>
                ))}
                {isAITyping && ( <div className="flex justify-start"><div className="bg-white text-gray-800 border px-3 py-2 rounded-lg shadow-sm"><div className="flex items-center space-x-1.5"><Bot size={14} className="text-blue-500" /><div className="flex space-x-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`}}></div>)}</div></div></div></div>)}
              </div>
              <div className="p-4 border-t sticky bottom-0 bg-white z-10">
                <div className="flex space-x-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder={!isTopicView || data.quiz ? "Ask about the materials..." : "AI Tutor available with new study packages."} className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" disabled={isTopicView && !data.quiz} />
                  <Button onClick={handleChatSend} size="md" disabled={!chatInput.trim() || (isTopicView && !data.quiz)}><Send size={16} /></Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
      
      {!isChatOpen && (
        <Button variant="primary" onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 z-30 lg:hidden rounded-full p-3 shadow-lg flex items-center justify-center" aria-label="Open AI Chat">
          <MessageSquare size={24} />
        </Button>
      )}

      <Modal isOpen={activeToolModal === 'flashcards'} onClose={() => setActiveToolModal(null)} title="Flashcards">
        {flashcardMaterial && flashcardMaterial.content.cards && flashcardMaterial.content.cards.length > 0 ? (
          <div className="text-center">
            <AnimatePresence mode="wait">
            <motion.div
              key={`${currentFlashcardIndex}-${isFlashcardFlipped}`}
              initial={{ opacity: 0, rotateY: isFlashcardFlipped ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: isFlashcardFlipped ? 90 : -90 }}
              transition={{ duration: 0.3 }}
              className={`w-full h-64 p-6 rounded-lg shadow-lg border flex items-center justify-center cursor-pointer perspective ${isFlashcardFlipped ? 'bg-blue-100' : 'bg-white'}`}
              onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className={`text-lg font-semibold ${isFlashcardFlipped ? 'text-blue-800' : 'text-gray-900'}`}>
                {isFlashcardFlipped 
                  ? flashcardMaterial.content.cards[currentFlashcardIndex].answer 
                  : flashcardMaterial.content.cards[currentFlashcardIndex].question}
              </div>
            </motion.div>
            </AnimatePresence>
            <p className="text-sm text-gray-500 mt-2">Click card to flip. Card {currentFlashcardIndex + 1} of {flashcardMaterial.content.cards.length}</p>
            <div className="flex justify-between mt-4">
              <Button onClick={() => setCurrentFlashcardIndex(prev => Math.max(0, prev - 1))} disabled={currentFlashcardIndex === 0}>Previous</Button>
              <Button onClick={() => setCurrentFlashcardIndex(prev => Math.min(flashcardMaterial.content.cards.length - 1, prev + 1))} disabled={currentFlashcardIndex === flashcardMaterial.content.cards.length - 1}>Next</Button>
            </div>
          </div>
        ) : <p>No flashcards available for this topic.</p>}
      </Modal>

      <Modal isOpen={activeToolModal === 'mindmap'} onClose={() => setActiveToolModal(null)} title="Mind Map">
        {mindMapMaterial && mindMapMaterial.content.central ? (
          <div className="text-center">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mb-6 inline-block text-xl shadow-md">{mindMapMaterial.content.central}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mindMapMaterial.content.branches?.map((branch: any, index: number) => (
                <Card key={index} className="p-4 bg-gray-50">
                  <h4 className="font-semibold text-blue-700 mb-2 text-lg">{branch.title}</h4>
                  <ul className="space-y-1 list-disc list-inside text-left pl-2">
                    {branch.subtopics?.map((subtopic: string, i: number) => (
                      <li key={i} className="text-gray-700 text-sm">{subtopic}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        ) : <p>Mind map not available for this topic.</p>}
      </Modal>

      <Modal isOpen={activeToolModal === 'summary'} onClose={() => setActiveToolModal(null)} title="Summary">
        {summaryMaterial ? (
          <div className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto p-1">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{summaryMaterial.content}</pre>
          </div>
        ) : <p>Summary not available for this topic.</p>}
      </Modal>

      <Modal isOpen={activeToolModal === 'quiz'} onClose={() => setActiveToolModal(null)} title="Interactive Quiz">
        {data.quiz && quizStarted ? (
          quizCompleted ? (
            <div className="text-center space-y-4">
              <Trophy size={48} className="mx-auto text-yellow-500" />
              <h3 className="text-xl font-bold">Quiz Completed!</h3>
              <p className="text-2xl font-bold text-green-600">{quizScore}/{data.quiz.questions.reduce((sum, q) => sum + q.points, 0)}</p>
              <Button onClick={handleQuizStart}>Retake Quiz</Button>
            </div>
          ) : data.quiz.questions[currentQuizQuestion] ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Question {currentQuizQuestion + 1} of {data.quiz.questions.length}</p>
              <h4 className="text-lg font-semibold">{data.quiz.questions[currentQuizQuestion].question}</h4>
              {data.quiz.questions[currentQuizQuestion].type === 'mcq' ? (
                <div className="space-y-2">
                  {data.quiz.questions[currentQuizQuestion].options?.map((option, index) => (
                    <label key={index} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-100 ${quizAnswers[data.quiz.questions[currentQuizQuestion].id] === index ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}>
                      <input type="radio" name={`q-${currentQuizQuestion}`} value={index} checked={quizAnswers[data.quiz.questions[currentQuizQuestion].id] === index} onChange={() => handleQuizAnswer(data.quiz.questions[currentQuizQuestion].id, index)} className="text-blue-600 focus:ring-blue-500" />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea value={quizAnswers[data.quiz.questions[currentQuizQuestion].id] || ''} onChange={(e) => handleQuizAnswer(data.quiz.questions[currentQuizQuestion].id, e.target.value)} placeholder="Your answer..." className="w-full h-24 p-2 border rounded-lg" />
              )}
              <div className="flex justify-end">
                <Button onClick={handleNextQuestion} disabled={quizAnswers[data.quiz.questions[currentQuizQuestion].id] === undefined}>
                  {currentQuizQuestion === data.quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </Button>
              </div>
            </div>
          ) : null
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-orange-500" />
            <p>{data.quiz ? "Start the quiz to test your knowledge." : "No quiz available for this topic."}</p>
            {data.quiz && <Button onClick={handleQuizStart}>Start Quiz</Button>}
            {isTopicView && !data.quiz && <Button onClick={onNewStudy}>Generate New Study Package with Quiz</Button>}
          </div>
        )}
      </Modal>
    </div>
  );
};
