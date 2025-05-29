import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, PlayCircle, BookOpen, Brain, Share2, Trophy, Clock, ChevronRight, Send, Bot, User as UserIcon, AlertTriangle, Languages, Film, Youtube as YoutubeIcon, FileText as FileTextIcon, CheckSquare, Zap, Maximize, Menu, X, Edit3, Copy, Swords, Image as ImageIconLucide, FileType } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StudyMaterial, Quiz, InputContent, User } from '../../types';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { contentService, PwVideo } from '../../services/contentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { InitialStudyDataType } from '../../App';
import { faker } from '@faker-js/faker'; // For generating chatId

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
  onTabChange?: (tab: string, params?: InitialStudyDataType) => void;
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

type ActiveToolModal = 'flashcards' | 'mindmap' | 'summary' | 'quiz' | 'notes' | 'share' | null;

export const StudyMaterialResponse: React.FC<StudyMaterialResponseProps> = ({ data, onBack, onNewStudy, isTopicView = false, onTabChange }) => {
  const { user } = useAuth();
  const [activeToolModal, setActiveToolModal] = useState<ActiveToolModal>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [localQuizData, setLocalQuizData] = useState<Quiz | null>(data.quiz);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  const [currentNoteContent, setCurrentNoteContent] = useState('');
  const [shareableLink, setShareableLink] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const lang = data?.outputLanguage;
  const effectiveOutputLanguage = (lang && lang.trim() !== '') ? lang : 'english';
  
  const languageLabel = effectiveOutputLanguage.charAt(0).toUpperCase() + effectiveOutputLanguage.slice(1);
  
  const [aiTutorChatId, setAiTutorChatId] = useState<string | null>(null); // For AI Tutor session
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
    // Generate a new chatId for the AI Tutor session when the topic or user changes
    const newChatId = user ? `user-${user.id}-${data.topic}-${Date.now()}` : `guest-${data.topic}-${Date.now()}`;
    setAiTutorChatId(faker.string.uuid()); // Or a more structured ID like above
    
    // Reset chat messages for new topic
     setChatMessages([{ id: 'initial-ai-message-reset', type: 'ai', content: 
        isTopicView 
        ? `Viewing materials for ${data.topic} (in ${languageLabel}). Ask me about this topic!`
        : `Hi! I'm your AI tutor for ${data.topic} (in ${languageLabel}). How can I help you learn better?`, 
     timestamp: new Date() }]);

  }, [data.topic, user, isTopicView, languageLabel]); // Rerun if topic or user changes

  useEffect(() => {
    if (data.originalInput.type !== 'youtube' && data.originalInput.type !== 'video' && data.originalInput.type !== 'videolecture') {
      const videos = contentService.searchPwVideos(data.topic);
      if (videos.length > 0) {
        setRecommendedVideo(videos[0]);
      } else {
        setRecommendedVideo(contentService.getAllPwVideos()[0]); 
      }
    } else {
      setRecommendedVideo(null); 
    }
    setLocalQuizData(data.quiz);
  }, [data.topic, data.originalInput.type, data.quiz]);

  const handleQuizStart = (quizToStart: Quiz | null) => {
    if (!quizToStart) return;
    setQuizStarted(true);
    setCurrentQuizQuestion(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    storageService.addActivity({ type: 'quiz', title: `Started quiz: ${quizToStart.title}`, points: 0, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
  };

  const handleQuizAnswer = (questionId: string, answer: any) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    const currentQuiz = localQuizData || data.quiz;
    if (!currentQuiz) return;
    if (currentQuizQuestion < currentQuiz.questions.length - 1) {
      setCurrentQuizQuestion(prev => prev + 1);
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = () => {
    const currentQuiz = localQuizData || data.quiz;
    if (!currentQuiz) return;
    let score = 0;
    let totalPoints = 0;
    currentQuiz.questions.forEach(question => {
      totalPoints += question.points;
      const userAnswer = quizAnswers[question.id];
      if (question.type === 'mcq') {
        if (userAnswer === question.correctAnswer) score += question.points;
      } else {
        if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim().length > 5) score += Math.floor(question.points * 0.7); // Simplified subjective scoring
      }
    });
    setQuizScore(score);
    setQuizCompleted(true);
    storageService.saveQuizResult({ quizId: currentQuiz.id, quizTitle: currentQuiz.title, topic: data.topic, score, totalPoints, answers: quizAnswers, completedAt: new Date(), language: effectiveOutputLanguage });
    storageService.addActivity({ type: 'quiz', title: `Completed quiz: ${currentQuiz.title}`, score: `${score}/${totalPoints}`, points: score, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
    storageService.updateUserStats(score, 'quiz');
    toast.success(`Quiz completed! You scored ${score}/${totalPoints} points.`);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !aiTutorChatId) {
      if(!aiTutorChatId) toast.error("Chat session not initialized. Please wait.");
      return;
    }
    const userMessage = { id: Date.now().toString(), type: 'user' as const, content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    const currentChatInput = chatInput;
    setChatInput('');
    setIsAITyping(true);
    try {
      const summaryMaterial = data.materials.find(m => m.type === 'summary');
      const context = summaryMaterial?.content || data.topic; // Use summary or topic as context
      
      const aiResponseText = await aiService.getAIChatResponse(context, currentChatInput, aiTutorChatId);
      const aiMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: aiResponseText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get AI response. Please try again.';
      toast.error(errorMessage);
      const aiErrorMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: `Sorry, I couldn't process that: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  const openToolModal = async (tool: ActiveToolModal) => {
    if (tool === 'flashcards') {
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
    }
    if (tool === 'quiz') {
      if (localQuizData) {
        handleQuizStart(localQuizData);
      } else {
        setIsGeneratingQuiz(true);
        try {
          const newQuiz = await aiService.generateQuiz(data.topic, 'medium', effectiveOutputLanguage);
          setLocalQuizData(newQuiz);
          handleQuizStart(newQuiz);
          toast.success("Quiz generated!");
        } catch (error) {
          toast.error("Failed to generate quiz.");
        } finally {
          setIsGeneratingQuiz(false);
        }
      }
    }
    if (tool === 'notes' && user) {
      const note = storageService.getUserNote(user.id, data.topic);
      setCurrentNoteContent(note || '');
    }
    if (tool === 'share') {
      const link = `${window.location.origin}/study?topic=${encodeURIComponent(data.topic)}&lang=${effectiveOutputLanguage}`;
      setShareableLink(link);
    }
    setActiveToolModal(tool);
  };

  const handleSaveNote = () => {
    if (user) {
      storageService.saveUserNote(user.id, data.topic, currentNoteContent);
      toast.success('Note saved!');
      setActiveToolModal(null);
    } else {
      toast.error('Please log in to save notes.');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link.'));
  };

  const handleBattleButtonClick = () => {
    if (onTabChange) {
      onTabChange('battle', { inputType: 'text', content: data.topic, topic: data.topic });
    } else {
      toast("Navigation to Battle page is not available in this context.");
    }
  };

  const flashcardMaterial = data.materials.find(m => m.type === 'flashcards');
  const mindMapMaterial = data.materials.find(m => m.type === 'mindmap');
  const summaryMaterial = data.materials.find(m => m.type === 'summary');

  const renderOriginalInputContent = () => {
    const { type, content, metadata } = data.originalInput;

    switch (type) {
      case 'text':
        return (
          <div className="bg-gray-100 p-4 rounded-lg h-full overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Original Text Content:</h4>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{content}</pre>
          </div>
        );
      case 'youtube':
        const embedUrl = getYoutubeEmbedUrl(content);
        return embedUrl ? (
          <iframe className="w-full h-full rounded-lg" src={embedUrl} title={metadata?.title || "YouTube video player"} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        ) : <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><YoutubeIcon size={48} className="mb-2 text-red-500" /><p className="font-semibold text-center">Invalid or unrenderable YouTube URL:<br/>{content}</p></div>;
      case 'image':
        return (
          <div className="bg-gray-100 p-2 rounded-lg h-full flex items-center justify-center overflow-hidden">
            <img src={content} alt={metadata?.fileName || data.topic || 'Uploaded Image'} className="max-w-full max-h-full object-contain rounded"/>
          </div>
        );
      case 'document':
        if (metadata?.documentType === 'pdf' && content) {
          // Basic check for common PDF hosting patterns that might block iframe
          const isLikelyBlocked = content.includes('drive.google.com') && !content.includes('/preview');
          if (isLikelyBlocked) {
             return <div className="bg-gray-200 p-4 rounded-lg h-full flex flex-col items-center justify-center"><FileType size={48} className="mb-2 text-gray-500" /><p className="font-semibold">{metadata?.fileName || 'PDF Document'}</p><p className="text-sm text-red-600 text-center">Direct embedding for this PDF might be restricted. <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open PDF in new tab</a>.</p></div>;
          }
          return (
            <iframe src={content} className="w-full h-full rounded-lg" title={metadata?.fileName || data.topic || 'PDF Document'}>
              <p className="p-4">Your browser does not support PDFs. Please download the PDF to view it: <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download PDF</a></p>
            </iframe>
          );
        }
        return <div className="bg-gray-200 p-4 rounded-lg h-full flex flex-col items-center justify-center"><FileType size={48} className="mb-2 text-gray-500" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm text-gray-600">Document: {metadata?.documentType || 'Generic'} (Preview N/A)</p></div>;
      case 'videolecture':
        return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><Film size={48} className="mb-2" /><p className="font-semibold">{metadata?.title || content}</p><p className="text-sm">Video Lecture (Playback N/A)</p></div>;
      case 'video':
         return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><VideoIcon size={48} className="mb-2" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm">Uploaded Video (Playback N/A)</p></div>;
      case 'audio':
         return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><Mic size={48} className="mb-2" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm">Audio Content (Playback N/A)</p></div>;
      default:
        if (recommendedVideo) {
            const recEmbedUrl = getYoutubeEmbedUrl(recommendedVideo.youtubeUrl);
            return recEmbedUrl ? (
                <iframe className="w-full h-full rounded-lg" src={recEmbedUrl} title={recommendedVideo.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            ) : <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><YoutubeIcon size={48} className="mb-2" /><p className="font-semibold">{recommendedVideo.title}</p><p className="text-sm">Recommended Video</p></div>;
        }
        return <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg"><p>No specific preview for this content type.</p></div>;
    }
  };

  const interactiveTools = [
    { id: 'flashcards' as ActiveToolModal, label: 'Flashcards', icon: CheckSquare, disabled: !flashcardMaterial },
    { id: 'mindmap' as ActiveToolModal, label: 'Mind Map', icon: Brain, disabled: !mindMapMaterial },
    { id: 'summary' as ActiveToolModal, label: 'Summary', icon: FileTextIcon, disabled: !summaryMaterial },
    { id: 'quiz' as ActiveToolModal, label: 'Quiz', icon: Trophy, disabled: isGeneratingQuiz },
    { id: 'notes' as ActiveToolModal, label: 'Notes', icon: Edit3, disabled: !user },
    { id: 'battle' as ActiveToolModal, label: 'Battle', icon: Swords, disabled: !onTabChange },
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
          <Button variant="primary" size="md" onClick={() => openToolModal('share')}><Share2 size={16} className="mr-2" /> Share</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-stretch">
        <div className="lg:flex-[2] space-y-4 flex flex-col">
          <Card className="p-2 sm:p-4 flex-shrink-0" ref={videoPlayerRef}>
            <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden shadow-lg">
              {renderOriginalInputContent()}
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0 interactive-tools-card">
            <h3 className="text-md font-semibold text-gray-800 mb-3">Interactive Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {interactiveTools.map(tool => {
                const Icon = tool.icon;
                return (
                  <Button 
                    key={tool.id} 
                    variant="outline" 
                    size="md" 
                    onClick={() => tool.id === 'battle' ? handleBattleButtonClick() : openToolModal(tool.id)} 
                    disabled={tool.disabled} 
                    className="flex flex-col items-center justify-center h-20 sm:h-24 text-xs sm:text-sm"
                    loading={tool.id === 'quiz' && isGeneratingQuiz}
                  >
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
            className={`w-full max-w-md ml-auto lg:max-w-none bg-white shadow-xl lg:shadow-none lg:rounded-none flex flex-col h-full
                       ${isChatOpen ? 'rounded-l-xl' : 'lg:rounded-xl'}`}
            initial={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            animate={window.innerWidth < 1024 ? { x: isChatOpen ? "0%" : "100%" } : { opacity: 1 }}
            exit={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
             style={{ 
              height: videoPlayerRef.current && window.innerWidth >=1024 
                ? `${videoPlayerRef.current.offsetHeight + (document.querySelector('.interactive-tools-card')?.clientHeight || 150) + 16}px` 
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
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} 
                    placeholder={data.topic ? "Ask about the materials..." : "Generate materials to enable AI Tutor."} 
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                    disabled={!data.topic || !aiTutorChatId} 
                  />
                  <Button onClick={handleChatSend} size="md" disabled={!chatInput.trim() || !data.topic || !aiTutorChatId}>
                    <Send size={16} />
                  </Button>
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

      <AnimatePresence>
      <Modal key="flashcards-modal" isOpen={activeToolModal === 'flashcards'} onClose={() => setActiveToolModal(null)} title="Flashcards">
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

      <Modal key="mindmap-modal" isOpen={activeToolModal === 'mindmap'} onClose={() => setActiveToolModal(null)} title="Mind Map">
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
        ) : mindMapMaterial && mindMapMaterial.content.id ? ( 
          <div className="text-center">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold mb-6 inline-block text-xl shadow-md">{mindMapMaterial.content.title}</div>
            {mindMapMaterial.content.children && mindMapMaterial.content.children.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mindMapMaterial.content.children.map((child: any, index: number) => (
                  <Card key={child.id || index} className="p-4 bg-gray-50" style={{borderColor: child.color}}>
                    <h4 className="font-semibold mb-2 text-lg" style={{color: child.color}}>{child.title}</h4>
                    {child.children && child.children.length > 0 && (
                      <ul className="space-y-1 list-disc list-inside text-left pl-2">
                        {child.children.map((subChild: any, i: number) => (
                          <li key={subChild.id || i} className="text-gray-700 text-sm" style={{color: subChild.color || 'inherit'}}>{subChild.title}</li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : <p>Mind map not available for this topic.</p>}
      </Modal>

      <Modal key="summary-modal" isOpen={activeToolModal === 'summary'} onClose={() => setActiveToolModal(null)} title="Summary">
        {summaryMaterial ? (
          <div className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto p-1">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{summaryMaterial.content}</pre>
          </div>
        ) : <p>Summary not available for this topic.</p>}
      </Modal>

      <Modal key="quiz-modal" isOpen={activeToolModal === 'quiz'} onClose={() => setActiveToolModal(null)} title="Interactive Quiz">
        {isGeneratingQuiz ? (
          <div className="text-center py-10"><Brain size={32} className="mx-auto animate-pulse text-blue-500 mb-2" /> Generating quiz...</div>
        ) : localQuizData && quizStarted ? (
          quizCompleted ? (
            <div className="text-center space-y-4">
              <Trophy size={48} className="mx-auto text-yellow-500" />
              <h3 className="text-xl font-bold">Quiz Completed!</h3>
              <p className="text-2xl font-bold text-green-600">{quizScore}/{localQuizData.questions.reduce((sum, q) => sum + q.points, 0)}</p>
              <Button onClick={() => handleQuizStart(localQuizData)}>Retake Quiz</Button>
            </div>
          ) : localQuizData.questions[currentQuizQuestion] ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Question {currentQuizQuestion + 1} of {localQuizData.questions.length}</p>
              <h4 className="text-lg font-semibold">{localQuizData.questions[currentQuizQuestion].question}</h4>
              {localQuizData.questions[currentQuizQuestion].type === 'mcq' ? (
                <div className="space-y-2">
                  {localQuizData.questions[currentQuizQuestion].options?.map((option, index) => (
                    <label key={index} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-100 ${quizAnswers[localQuizData.questions[currentQuizQuestion].id] === index ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}>
                      <input type="radio" name={`q-${currentQuizQuestion}`} value={index} checked={quizAnswers[localQuizData.questions[currentQuizQuestion].id] === index} onChange={() => handleQuizAnswer(localQuizData.questions[currentQuizQuestion].id, index)} className="text-blue-600 focus:ring-blue-500" />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea value={quizAnswers[localQuizData.questions[currentQuizQuestion].id] || ''} onChange={(e) => handleQuizAnswer(localQuizData.questions[currentQuizQuestion].id, e.target.value)} placeholder="Your answer..." className="w-full h-24 p-2 border rounded-lg" />
              )}
              <div className="flex justify-end">
                <Button onClick={handleNextQuestion} disabled={quizAnswers[localQuizData.questions[currentQuizQuestion].id] === undefined}>
                  {currentQuizQuestion === localQuizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </Button>
              </div>
            </div>
          ) : null
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-orange-500" />
            <p>Start the quiz to test your knowledge on {data.topic}.</p>
            <Button onClick={() => openToolModal('quiz')} loading={isGeneratingQuiz}>Start Quiz</Button>
          </div>
        )}
      </Modal>

      <Modal key="notes-modal" isOpen={activeToolModal === 'notes'} onClose={() => setActiveToolModal(null)} title={`My Notes for ${data.topic}`}>
        <textarea
          value={currentNoteContent}
          onChange={(e) => setCurrentNoteContent(e.target.value)}
          placeholder="Type your notes here..."
          className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveNote}>Save Note</Button>
        </div>
      </Modal>

      <Modal key="share-modal" isOpen={activeToolModal === 'share'} onClose={() => setActiveToolModal(null)} title="Share Study Material">
        <p className="text-sm text-gray-600 mb-2">Share this study material with others:</p>
        <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
          <input
            type="text"
            value={shareableLink}
            readOnly
            className="flex-1 bg-transparent outline-none text-sm text-gray-700"
          />
          <Button onClick={handleCopyToClipboard} size="sm" variant="ghost">
            <Copy size={16} className="mr-1.5" /> Copy
          </Button>
        </div>
      </Modal>
      </AnimatePresence>
    </div>
  );
};
