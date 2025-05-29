import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, PlayCircle, BookOpen, Brain, Share2, Trophy, Clock, ChevronRight, Send, Bot, User as UserIcon, AlertTriangle, Languages, Film, Youtube as YoutubeIcon, FileText as FileTextIcon, CheckSquare, Zap, Menu, X, Edit3, Copy, Swords, Image as ImageIconLucide, FileType, Loader2, Volume2, Sparkles, Video as VideoLucideIcon, Mic as MicLucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StudyMaterial, Quiz, InputContent, User, Question as AppQuestionType, ActiveToolModalType } from '../../types';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { NavParamsType } from '../layout/Navbar';
import { faker } from '@faker-js/faker';
import { useTranslation } from '../../hooks/useTranslation';

interface StudyMaterialResponseProps {
  data: {
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    outputLanguage: string;
    originalInput: InputContent; 
  };
  onBack: () => void;
  onNewStudy: () => void;
  isTopicView?: boolean;
  onTabChange?: (tab: string, navParams?: NavParamsType) => void; 
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


export const StudyMaterialResponse: React.FC<StudyMaterialResponseProps> = ({ data, onBack, onNewStudy, isTopicView = false, onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeToolModal, setActiveToolModal] = useState<ActiveToolModalType>(null);
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

  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [audioPlayerSrc, setAudioPlayerSrc] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const lang = data?.originalInput?.metadata?.outputLanguage || data?.outputLanguage; 
  const effectiveOutputLanguage = (lang && lang.trim() !== '') ? lang : 'english';
  
  const languageLabel = t(`languageOptions.${effectiveOutputLanguage}`, effectiveOutputLanguage.charAt(0).toUpperCase() + effectiveOutputLanguage.slice(1));
  
  const [aiTutorChatId, setAiTutorChatId] = useState<string | null>(null); 
  const initialChatMessageText = isTopicView
    ? t('studyMaterialResponse.aiTutorInitialTopicView', { topic: data.topic, language: languageLabel })
    : t('studyMaterialResponse.aiTutorInitialNewStudy', { topic: data.topic, language: languageLabel });
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; type: 'user' | 'ai'; content: string; timestamp: Date }>>([
    { id: 'initial-ai-message', type: 'ai', content: initialChatMessageText, timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  const mockBatches = [
    "Lakshya JEE 2025", "Arjuna NEET 2025", "UPSC Prahar 2026", 
    "Yakeen Dropper Batch (NEET)", "Prayas Dropper Batch (JEE)", "Banking Foundation 2.0",
    "SSC CGL Achievers Batch", "GATE CSE Rankers Batch"
  ];


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  useEffect(() => {
    setAiTutorChatId(faker.string.uuid()); 
    
     setChatMessages([{ id: 'initial-ai-message-reset', type: 'ai', content: 
        isTopicView 
        ? t('studyMaterialResponse.aiTutorInitialTopicView', { topic: data.topic, language: languageLabel })
        : t('studyMaterialResponse.aiTutorInitialNewStudy', { topic: data.topic, language: languageLabel }), 
     timestamp: new Date() }]);

  }, [data.topic, user, isTopicView, languageLabel, t]); 

  useEffect(() => {
    setLocalQuizData(data.quiz);
  }, [data.quiz]);

  useEffect(() => {
    // Cleanup blob URL for original input if it was a blob
    const currentOriginalContent = data.originalInput.content;
    if (currentOriginalContent && currentOriginalContent.startsWith('blob:')) {
      return () => {
        URL.revokeObjectURL(currentOriginalContent);
        console.log("Revoked blob URL for original input:", currentOriginalContent);
      };
    }
  }, [data.originalInput.content]);


  useEffect(() => {
    // Cleanup blob URL for listen-summary audio
    return () => {
      if (audioPlayerSrc) {
        URL.revokeObjectURL(audioPlayerSrc);
        console.log("Revoked blob URL for listen-summary audio:", audioPlayerSrc);
      }
    };
  }, [audioPlayerSrc]);

  const handleQuizStart = (quizToStart: Quiz | null) => {
    if (!quizToStart) return;
    setQuizStarted(true);
    setCurrentQuizQuestion(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    storageService.addActivity({ type: 'quiz', title: t('activity.quizStarted', { quizTitle: quizToStart.title }), points: 0, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
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
        if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim().length > 5) score += Math.floor(question.points * 0.7); 
      }
    });
    setQuizScore(score);
    setQuizCompleted(true);
    storageService.saveQuizResult({ quizId: currentQuiz.id, quizTitle: currentQuiz.title, topic: data.topic, score, totalPoints, answers: quizAnswers, completedAt: new Date(), language: effectiveOutputLanguage });
    storageService.addActivity({ type: 'quiz', title: t('activity.quizCompleted', { quizTitle: currentQuiz.title }), score: `${score}/${totalPoints}`, points: score, metadata: { topic: data.topic, language: effectiveOutputLanguage } });
    storageService.updateUserStats(score, 'quiz');
    toast.success(t('toast.quizCompleted', { score, totalPoints }));
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !aiTutorChatId) {
      if(!aiTutorChatId) toast.error(t('toast.chatNotInitialized'));
      return;
    }
    const userMessage = { id: Date.now().toString(), type: 'user' as const, content: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    const currentChatInput = chatInput;
    setChatInput('');
    setIsAITyping(true);
    try {
      const summaryMaterialContent = data.materials.find(m => m.type === 'summary')?.content;
      const context = typeof summaryMaterialContent === 'string' ? summaryMaterialContent : data.topic; 
      
      const aiResponseText = await aiService.getAIChatResponse(context, currentChatInput, aiTutorChatId);
      const aiMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: aiResponseText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage = error.message || t('toast.aiResponseFailed');
      toast.error(errorMessage);
      const aiErrorMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: t('studyMaterialResponse.aiErrorResponse', { errorMessage }), timestamp: new Date() };
      setChatMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleListenToSummary = async () => {
    const summary = data.materials.find(m => m.type === 'summary');
    if (!summary || typeof summary.content !== 'string' || !summary.content.trim()) {
      toast.error(t('toast.noSummaryToListen'));
      return;
    }
    setIsFetchingAudio(true);
    setActiveToolModal('listen-summary');
    try {
      const audioBlob = await aiService.generateAudioFromText(summary.content);
      if (audioPlayerSrc) { 
        URL.revokeObjectURL(audioPlayerSrc);
      }
      const newAudioSrc = URL.createObjectURL(audioBlob);
      setAudioPlayerSrc(newAudioSrc);
    } catch (error: any) {
      toast.error(error.message || t('toast.audioGenerationFailed'));
      setActiveToolModal(null); 
    } finally {
      setIsFetchingAudio(false);
    }
  };

  const handleCloseListenModal = () => {
    setActiveToolModal(null);
    if (audioPlayerSrc) {
      URL.revokeObjectURL(audioPlayerSrc);
      setAudioPlayerSrc(null);
    }
  };

  const openToolModal = async (tool: ActiveToolModalType) => {
    if (tool === 'flashcards') {
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
    }
    if (tool === 'quiz') {
      if (localQuizData && localQuizData.questions.length > 0) {
        handleQuizStart(localQuizData);
      } else {
        setIsGeneratingQuiz(true);
        try {
          const summaryMaterialContent = data.materials.find(m => m.type === 'summary')?.content;
          const context = typeof summaryMaterialContent === 'string' ? summaryMaterialContent : data.topic; 
          const questions: AppQuestionType[] = await aiService.generateLiveQuestionsAPI(context, 5, effectiveOutputLanguage);
          if (questions.length > 0) {
            const newQuiz: Quiz = {
              id: `live-quiz-${Date.now()}`,
              title: t('studyMaterialResponse.generatedQuizTitle', { topic: data.topic }),
              topic: data.topic,
              questions,
              difficulty: 'medium',
              timeLimit: questions.length * 90,
              createdAt: new Date(),
              language: effectiveOutputLanguage,
            };
            setLocalQuizData(newQuiz);
            handleQuizStart(newQuiz);
            toast.success(t('toast.quizGenerated'));
          } else {
            toast.error(t('toast.quizGenerationFailedNoQuestions'));
            setLocalQuizData(null); 
          }
        } catch (error: any) {
          toast.error(error.message || t('toast.quizGenerationFailed'));
          setLocalQuizData(null);
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
    if (tool === 'listen-summary') {
      handleListenToSummary(); 
      return; 
    }
    setActiveToolModal(tool);
  };

  const handleSaveNote = () => {
    if (user) {
      storageService.saveUserNote(user.id, data.topic, currentNoteContent);
      toast.success(t('toast.noteSaved'));
      setActiveToolModal(null);
    } else {
      toast.error(t('toast.loginToSaveNotes'));
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => toast.success(t('toast.linkCopied')))
      .catch(() => toast.error(t('toast.linkCopyFailed')));
  };

  const handleBattleButtonClick = () => {
    if (onTabChange) {
      const summaryMaterialContent = data.materials.find(m => m.type === 'summary')?.content;
      const context = typeof summaryMaterialContent === 'string' ? summaryMaterialContent : data.topic; 
      onTabChange('battle', { battleParams: { topic: data.topic, context } });
    } else {
      toast(t('toast.battleNavigationUnavailable'));
    }
  };

  const flashcardMaterial = data.materials.find(m => m.type === 'flashcards');
  const mindMapMaterial = data.materials.find(m => m.type === 'mindmap');
  const summaryMaterial = data.materials.find(m => m.type === 'summary');

  const renderOriginalInputContent = () => {
    const { type, content, metadata } = data.originalInput;

    if (!content) {
      return <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg"><p>{t('studyMaterialResponse.noPreviewAvailable')}</p></div>;
    }

    switch (type) {
      case 'text':
        return (
          <div className="bg-gray-100 p-4 rounded-lg h-full overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('studyMaterialResponse.originalTextContent')}</h4>
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{content}</pre>
          </div>
        );
      case 'youtube':
        const embedUrl = getYoutubeEmbedUrl(content);
        return embedUrl ? (
          <iframe className="w-full h-full rounded-lg" src={embedUrl} title={metadata?.title || t('studyMaterialResponse.youtubePlayerTitle')} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        ) : <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><YoutubeIcon size={48} className="mb-2 text-red-500" /><p className="font-semibold text-center">{t('studyMaterialResponse.invalidYoutubeUrl', { url: content })}</p></div>;
      
      case 'document':
        if (content.startsWith('blob:') || content.startsWith('http')) {
          if (metadata?.documentType === 'image') {
            return (
              <div className="bg-gray-100 p-2 rounded-lg h-full flex items-center justify-center overflow-hidden">
                <img src={content} alt={metadata?.fileName || data.topic || t('studyMaterialResponse.uploadedImageAlt')} className="max-w-full max-h-full object-contain rounded"/>
              </div>
            );
          }
          if (metadata?.documentType === 'pdf') {
            return (
              <iframe src={content} className="w-full h-full rounded-lg" title={metadata?.fileName || data.topic || t('studyMaterialResponse.pdfDocument')}>
                <p className="p-4">{t('studyMaterialResponse.pdfNotSupported')} <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('studyMaterialResponse.downloadPdf')}</a></p>
              </iframe>
            );
          }
        }
        return <div className="bg-gray-200 p-4 rounded-lg h-full flex flex-col items-center justify-center"><FileType size={48} className="mb-2 text-gray-500" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm text-gray-600">{t('studyMaterialResponse.documentTypeGeneric', { type: metadata?.documentType || 'File' })}</p></div>;

      case 'audio':
        if (content.startsWith('blob:') || content.startsWith('http')) {
          return (
            <div className="bg-gray-100 p-4 rounded-lg h-full flex flex-col items-center justify-center">
              <MicLucideIcon size={48} className="mb-2 text-blue-500" />
              <p className="font-semibold mb-2">{metadata?.fileName || t('studyMaterialResponse.audioPlaybackTitle')}</p>
              <audio controls src={content} className="w-full max-w-sm">
                {t('studyMaterialResponse.audioNotSupported')}
              </audio>
            </div>
          );
        }
        return <div className="bg-gray-200 p-4 rounded-lg h-full flex flex-col items-center justify-center"><MicLucideIcon size={48} className="mb-2 text-gray-500" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm text-gray-600">{t('studyMaterialResponse.uploadedAudioPlaybackNA')}</p></div>;
      
      case 'video':
        if (content.startsWith('blob:') || content.startsWith('http')) {
           return (
            <div className="bg-gray-100 p-4 rounded-lg h-full flex flex-col items-center justify-center">
              <VideoLucideIcon size={48} className="mb-2 text-blue-500" />
              <p className="font-semibold mb-2">{metadata?.fileName || t('studyMaterialResponse.videoPlaybackTitle')}</p>
              <video controls src={content} className="w-full max-w-md rounded-lg">
                {t('studyMaterialResponse.videoNotSupported')}
              </video>
            </div>
          );
        }
        return <div className="bg-gray-200 p-4 rounded-lg h-full flex flex-col items-center justify-center"><VideoLucideIcon size={48} className="mb-2 text-gray-500" /><p className="font-semibold">{metadata?.fileName || content}</p><p className="text-sm text-gray-600">{t('studyMaterialResponse.uploadedVideoPlaybackNA')}</p></div>;

      case 'videolecture':
        return <div className="bg-gray-800 text-white p-4 rounded-lg h-full flex flex-col items-center justify-center"><Film size={48} className="mb-2" /><p className="font-semibold">{metadata?.title || content}</p><p className="text-sm">{t('studyMaterialResponse.videoLecturePlaybackNA')}</p></div>;
      
      default: // Fallback for image type if not handled by document
        if (type === 'image' && (content.startsWith('blob:') || content.startsWith('http'))) {
             return (
              <div className="bg-gray-100 p-2 rounded-lg h-full flex items-center justify-center overflow-hidden">
                <img src={content} alt={metadata?.fileName || data.topic || t('studyMaterialResponse.uploadedImageAlt')} className="max-w-full max-h-full object-contain rounded"/>
              </div>
            );
        }
        return <div className="bg-gray-200 h-full flex items-center justify-center rounded-lg"><p>{t('studyMaterialResponse.noPreviewAvailable')}</p></div>;
    }
  };

  const interactiveTools = [
    { id: 'summary' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.readSummary', icon: FileTextIcon, disabled: !summaryMaterial },
    { id: 'listen-summary' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.listenSummary', icon: Volume2, disabled: !summaryMaterial || isFetchingAudio },
    { id: 'flashcards' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.flashcards', icon: CheckSquare, disabled: !flashcardMaterial },
    { id: 'mindmap' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.mindMap', icon: Brain, disabled: !mindMapMaterial },
    { id: 'quiz' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.quiz', icon: Trophy, disabled: isGeneratingQuiz },
    { id: 'notes' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.notes', icon: Edit3, disabled: !user },
    { id: 'battle' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.battle', icon: Swords, disabled: !onTabChange || !summaryMaterial }, 
    { id: 'recommendations' as ActiveToolModalType, labelKey: 'studyMaterialResponse.tools.recommendations', icon: Sparkles, disabled: false },
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
              <span>{isTopicView ? t('studyMaterialResponse.viewingSavedMaterials') : t('studyMaterialResponse.completeStudyPackage')}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-center">
          <Button variant="outline" size="md" onClick={onNewStudy}>{isTopicView ? t('studyMaterialResponse.generateNewForTopic', { topic: data.topic }) : t('studyMaterialResponse.startNewStudy')}</Button>
          <Button variant="primary" size="md" onClick={() => openToolModal('share')}><Share2 size={16} className="mr-2" /> {t('studyMaterialResponse.tools.share')}</Button>
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
            <h3 className="text-md font-semibold text-gray-800 mb-3">{t('studyMaterialResponse.interactiveToolsTitle')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                    loading={(tool.id === 'quiz' && isGeneratingQuiz) || (tool.id === 'listen-summary' && isFetchingAudio)}
                  >
                    <Icon size={20} className="mb-1" /> {t(tool.labelKey)}
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
                  <Bot size={20} className="mr-2 text-blue-600" /> {t('studyMaterialResponse.aiTutorTitle')}
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
                    placeholder={data.topic ? t('studyMaterialResponse.aiTutorPlaceholder') : t('studyMaterialResponse.aiTutorDisabledPlaceholder')} 
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
        <Button variant="primary" onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 z-30 lg:hidden rounded-full p-3 shadow-lg flex items-center justify-center" aria-label={t('studyMaterialResponse.openAIChatLabel')}>
          <MessageSquare size={24} />
        </Button>
      )}

      <AnimatePresence>
      <Modal key="flashcards-modal" isOpen={activeToolModal === 'flashcards'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.flashcardsModalTitle')}>
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
            <p className="text-sm text-gray-500 mt-2">{t('studyMaterialResponse.flashcardFlipPrompt', { current: currentFlashcardIndex + 1, total: flashcardMaterial.content.cards.length })}</p>
            <div className="flex justify-between mt-4">
              <Button onClick={() => setCurrentFlashcardIndex(prev => Math.max(0, prev - 1))} disabled={currentFlashcardIndex === 0}>{t('common.previous')}</Button>
              <Button onClick={() => setCurrentFlashcardIndex(prev => Math.min(flashcardMaterial.content.cards.length - 1, prev + 1))} disabled={currentFlashcardIndex === flashcardMaterial.content.cards.length - 1}>{t('common.next')}</Button>
            </div>
          </div>
        ) : <p>{t('studyMaterialResponse.noFlashcards')}</p>}
      </Modal>

      <Modal key="mindmap-modal" isOpen={activeToolModal === 'mindmap'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.mindMapModalTitle')}>
        {mindMapMaterial && mindMapMaterial.content.id ? ( 
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
        ) : <p>{t('studyMaterialResponse.noMindMap')}</p>}
      </Modal>

      <Modal key="summary-modal" isOpen={activeToolModal === 'summary'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.summaryModalTitle')}>
        {summaryMaterial ? (
          <div className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto p-1">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{typeof summaryMaterial.content === 'string' ? summaryMaterial.content : JSON.stringify(summaryMaterial.content, null, 2)}</pre>
          </div>
        ) : <p>{t('studyMaterialResponse.noSummary')}</p>}
      </Modal>
      
      <Modal key="listen-summary-modal" isOpen={activeToolModal === 'listen-summary'} onClose={handleCloseListenModal} title={t('studyMaterialResponse.listenSummaryModalTitle')}>
        {isFetchingAudio ? (
          <div className="text-center py-10">
            <Loader2 size={32} className="mx-auto animate-spin text-blue-500 mb-2" />
            <p className="text-gray-600">{t('studyMaterialResponse.generatingAudio')}</p>
          </div>
        ) : audioPlayerSrc ? (
          <div className="flex flex-col items-center justify-center p-4">
            <audio controls autoPlay src={audioPlayerSrc} className="w-full max-w-md">
              {t('studyMaterialResponse.audioNotSupported')}
            </audio>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10">{t('studyMaterialResponse.audioLoadFailed')}</p>
        )}
      </Modal>

      <Modal key="quiz-modal" isOpen={activeToolModal === 'quiz'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.quizModalTitle')}>
        {isGeneratingQuiz ? (
          <div className="text-center py-10"><Loader2 size={32} className="mx-auto animate-spin text-blue-500 mb-2" /> {t('studyMaterialResponse.generatingQuiz')}</div>
        ) : localQuizData && quizStarted ? (
          quizCompleted ? (
            <div className="text-center space-y-4">
              <Trophy size={48} className="mx-auto text-yellow-500" />
              <h3 className="text-xl font-bold">{t('studyMaterialResponse.quizCompletedTitle')}</h3>
              <p className="text-2xl font-bold text-green-600">{quizScore}/{localQuizData.questions.reduce((sum, q) => sum + q.points, 0)}</p>
              <Button onClick={() => handleQuizStart(localQuizData)}>{t('studyMaterialResponse.retakeQuiz')}</Button>
            </div>
          ) : localQuizData.questions[currentQuizQuestion] ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('studyMaterialResponse.quizQuestionProgress', { current: currentQuizQuestion + 1, total: localQuizData.questions.length })}</p>
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
                <textarea value={quizAnswers[localQuizData.questions[currentQuizQuestion].id] || ''} onChange={(e) => handleQuizAnswer(localQuizData.questions[currentQuizQuestion].id, e.target.value)} placeholder={t('studyMaterialResponse.yourAnswerPlaceholder')} className="w-full h-24 p-2 border rounded-lg" />
              )}
              <div className="flex justify-end">
                <Button onClick={handleNextQuestion} disabled={quizAnswers[localQuizData.questions[currentQuizQuestion].id] === undefined && localQuizData.questions[currentQuizQuestion].type === 'mcq'}>
                  {currentQuizQuestion === localQuizData.questions.length - 1 ? t('studyMaterialResponse.finishQuiz') : t('studyMaterialResponse.nextQuestion')}
                </Button>
              </div>
            </div>
          ) : null
        ) : (
          <div className="text-center space-y-3">
            <AlertTriangle size={32} className="mx-auto text-orange-500" />
            <p>{t('studyMaterialResponse.startQuizPrompt', { topic: data.topic })}</p>
            <Button onClick={() => openToolModal('quiz')} loading={isGeneratingQuiz}>{t('studyMaterialResponse.startQuizButton')}</Button>
          </div>
        )}
      </Modal>

      <Modal key="notes-modal" isOpen={activeToolModal === 'notes'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.notesModalTitle', { topic: data.topic })}>
        <textarea
          value={currentNoteContent}
          onChange={(e) => setCurrentNoteContent(e.target.value)}
          placeholder={t('studyMaterialResponse.notesPlaceholder')}
          className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveNote}>{t('studyMaterialResponse.saveNoteButton')}</Button>
        </div>
      </Modal>

      <Modal key="share-modal" isOpen={activeToolModal === 'share'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.shareModalTitle')}>
        <p className="text-sm text-gray-600 mb-2">{t('studyMaterialResponse.shareModalSubtitle')}</p>
        <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
          <input
            type="text"
            value={shareableLink}
            readOnly
            className="flex-1 bg-transparent outline-none text-sm text-gray-700"
          />
          <Button onClick={handleCopyToClipboard} size="sm" variant="ghost">
            <Copy size={16} className="mr-1.5" /> {t('studyMaterialResponse.copyLinkButton')}
          </Button>
        </div>
      </Modal>

      <Modal key="recommendations-modal" isOpen={activeToolModal === 'recommendations'} onClose={() => setActiveToolModal(null)} title={t('studyMaterialResponse.recommendationsModalTitle')}>
        <div className="space-y-3">
            <p className="text-sm text-gray-600">{t('studyMaterialResponse.recommendationsSubtitle', { topic: data.topic })}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
                {mockBatches.map((batch, index) => (
                    <li key={index} className="text-gray-700 hover:text-blue-600 cursor-pointer" onClick={() => toast.info(`${t('studyMaterialResponse.exploreBatchToast', { batchName: batch })}`)}>
                        {batch}
                    </li>
                ))}
            </ul>
            <p className="text-xs text-gray-500 mt-2">{t('studyMaterialResponse.recommendationsNote')}</p>
        </div>
      </Modal>

      </AnimatePresence>
    </div>
  );
};
