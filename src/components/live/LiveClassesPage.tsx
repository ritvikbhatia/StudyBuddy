import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, ChevronRight, Bot, User as UserIcon, Play, Pause, Loader2, AlertTriangle, PlayCircle as PlayCircleIcon, Languages } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { InteractivePanel, LeaderboardEntry, MCQ } from './InteractivePanel';
import { faker } from '@faker-js/faker';
import { contentService, PwVideo } from '../../services/contentService';
import axios from 'axios';
import { ApiTranscriptItem, LiveTranscriptionApiResponse, Question as AppQuestionType } from '../../types'; 
import { aiService } from '../../services/aiService';
import { useTranslation } from '../../hooks/useTranslation';

interface LiveClassesPageProps {
  youtubeVideoId: string;
  liveStreamKey: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

// Define language options locally or import from a shared constants file
const languageOptionsForTranscript = [
  { value: 'english', labelKey: 'languageOptions.en' },
  { value: 'hindi', labelKey: 'languageOptions.hi' },
  { value: 'marathi', labelKey: 'languageOptions.mr' },
  { value: 'tamil', labelKey: 'languageOptions.ta' },
  { value: 'telugu', labelKey: 'languageOptions.te' },
  { value: 'bengali', labelKey: 'languageOptions.bn' },
];


export const LiveClassesPage: React.FC<LiveClassesPageProps> = ({ youtubeVideoId, liveStreamKey }) => {
  const { t } = useTranslation();
  const { user, preferredLanguage } = useAuth();
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); 
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [liveChatId, setLiveChatId] = useState<string | null>(null); 

  const [currentLiveMCQ, setCurrentLiveMCQ] = useState<MCQ | null>(null);
  const [isFetchingMCQ, setIsFetchingMCQ] = useState<boolean>(false);
  const [mcqError, setMcqError] = useState<string | null>(null);
  const [liveMCQTimer, setLiveMCQTimer] = useState(60);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [newQuestionIndicator, setNewQuestionIndicator] = useState(false);

  const [recommendedVideos, setRecommendedVideos] = useState<PwVideo[]>([]);
  
  const [liveTranscripts, setLiveTranscripts] = useState<ApiTranscriptItem[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState<boolean>(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [selectedTranscriptLanguage, setSelectedTranscriptLanguage] = useState<string>(preferredLanguage );


  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const transcriptPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mcqTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTranscripts = async () => {
    if (!liveStreamKey) {
        setTranscriptError(t('liveClasses.noStreamKeyError'));
        setLoadingTranscripts(false);
        return;
    }
    if (liveTranscripts.length === 0 && !transcriptError && !loadingTranscripts) {
        setLoadingTranscripts(true);
    }

    try {
      const apiUrl = selectedTranscriptLanguage=='hindi'?`https://qbg-backend-stage.penpencil.co/qbg/internal/get-transcripts?stream_id=${liveStreamKey}&language=${selectedTranscriptLanguage}`:`https://qbg-backend-stage.penpencil.co/qbg/internal/get-transcripts?stream_id=${liveStreamKey}&language=${selectedTranscriptLanguage}&translate=true`;
      const response = await axios.get<LiveTranscriptionApiResponse>(apiUrl);
      
      if (response.data && response.data.status_code === 200 && 
          typeof response.data.data === 'object' && 
          response.data.data !== null &&            
          Array.isArray(response.data.data.transcripts)) {
        setLiveTranscripts(response.data.data.transcripts);
        setTranscriptError(null); 
      } else {
        if (!transcriptError || liveTranscripts.length > 0) { 
            //  setTranscriptError(t(''));
        }
        console.error('API error or malformed transcripts data:', response.data);
      }
    } catch (err) {
      console.error('Network error fetching transcripts:', err);
      if (!transcriptError || liveTranscripts.length > 0) {
        // setTranscriptError(t('liveClasses.transcriptLoadError'));
      }
    } finally {
      if (loadingTranscripts && (liveTranscripts.length === 0 && !transcriptError)) { // Only turn off initial global loading
          setLoadingTranscripts(false);
      }
    }
  };

  const fetchNextLiveQuestion = async () => {
    setIsFetchingMCQ(true);
    setMcqError(null);
    try {
      const context = liveTranscripts.map(t => t.text).join('\n') || t('liveClasses.defaultQuizContext');
      // Use selectedTranscriptLanguage for quiz generation as well for consistency
      const questions: AppQuestionType[] = await aiService.generateLiveQuestionsAPI(context, 1, selectedTranscriptLanguage); 
      
      if (questions.length > 0) {
        const apiQuestion = questions[0];
        const newMcq: MCQ = {
          id: parseInt(apiQuestion.id.split('-').pop() || '0', 10) || Date.now(),
          question: apiQuestion.question,
          options: apiQuestion.options || [],
          correctAnswerIndex: typeof apiQuestion.correctAnswer === 'number' ? apiQuestion.correctAnswer : 0,
          explanation: apiQuestion.explanation || t('liveClasses.noExplanation'),
        };
        setCurrentLiveMCQ(newMcq);
        setNewQuestionIndicator(true);
        setTimeout(() => setNewQuestionIndicator(false), 3000);
        setLiveMCQTimer(60); 
      } else {
        setMcqError(t('liveClasses.noNewQuestion'));
      }
    } catch (error: any) {
      console.error("Error fetching live MCQ:", error);
      setMcqError(error.message || t('liveClasses.fetchQuestionError'));
    } finally {
      setIsFetchingMCQ(false);
    }
  };
  
  useEffect(() => {
    setLiveChatId(faker.string.uuid()); 
    setChatMessages([{ id: 'live-initial-ai', type: 'ai', text: t('Welcome to the Live Doubt Solver! Ask anything about the ongoing class.'), timestamp: new Date() }]);

    const mockLeaderboard: LeaderboardEntry[] = Array.from({ length: 10 }).map((_, i) => ({
      id: faker.string.uuid(),
      name: faker.person.firstName() + " " + faker.person.lastName().charAt(0) + ".",
      avatar: faker.image.avatarGitHub(),
      score: faker.number.int({ min: 50, max: 500 }),
      correctAnswers: faker.number.int({ min: 5, max: 20 }),
      avgTime: parseFloat(faker.number.float({ min: 5, max: 25, precision: 0.1 }).toFixed(1)),
    })).sort((a, b) => b.score - a.score);
    setLeaderboardData(mockLeaderboard);
    setRecommendedVideos(contentService.getAllPwVideos().slice(0, 3));

    fetchTranscripts(); 
    if (transcriptPollIntervalRef.current) clearInterval(transcriptPollIntervalRef.current);
    transcriptPollIntervalRef.current = setInterval(fetchTranscripts, 5000); 

    if (isVideoPlaying) fetchNextLiveQuestion();

    return () => {
      if (transcriptPollIntervalRef.current) clearInterval(transcriptPollIntervalRef.current);
      if (mcqTimerRef.current) clearInterval(mcqTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStreamKey, selectedTranscriptLanguage]); // Add selectedTranscriptLanguage to dependencies

  useEffect(() => {
    let videoTimerId: NodeJS.Timeout;
    if (isVideoPlaying) {
      videoTimerId = setInterval(() => {
        setCurrentTimeInSeconds(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(videoTimerId);
  }, [isVideoPlaying]);

  useEffect(() => {
    if (mcqTimerRef.current) clearInterval(mcqTimerRef.current);
    if (isVideoPlaying && currentLiveMCQ) { 
      mcqTimerRef.current = setInterval(() => {
        setLiveMCQTimer(prev => {
          if (prev === 1) {
            fetchNextLiveQuestion(); 
            return 60; 
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (mcqTimerRef.current) clearInterval(mcqTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoPlaying, currentLiveMCQ]); 
  
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || !user || !liveChatId) {
      if(!user) toast.error(t('toast.loginToChat'));
      if(!liveChatId) toast.error(t('toast.chatNotInitialized'));
      return;
    }
    const newUserMessage: ChatMessage = { id: Date.now().toString(), type: 'user', text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsAiTyping(true);

    try {
      const context = liveTranscripts.map(t => t.text).join('\n') || t('liveClasses.defaultChatContext');
      const aiResponseText = await aiService.getAIChatResponse(context, currentInput, liveChatId);
      const newAiMessage: ChatMessage = { id: (Date.now() + 1).toString(), type: 'ai', text: aiResponseText, timestamp: new Date() };
      setChatMessages(prev => [...prev, newAiMessage]);
    } catch (error: any) {
      const errorMessage = error.message || t('toast.aiResponseFailedLive');
      toast.error(errorMessage);
      // @ts-ignore
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai' as const, text: t('liveClasses.aiErrorResponse', { errorMessage }), timestamp: new Date() }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const togglePlayPause = () => {
    const newPlayState = !isVideoPlaying;
    setIsVideoPlaying(newPlayState);
    if (newPlayState && !currentLiveMCQ && !isFetchingMCQ) { 
        fetchNextLiveQuestion();
    }
  };

  const handleQuizAnswerSubmit = (isCorrect: boolean) => {
    if (isCorrect) {
      const points = 10;
      toast.success(t('liveClasses.mcqCorrectToast', { points }));

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
            avgTime: 30,
          }];
        }
        return updatedLeaderboard.sort((a, b) => b.score - a.score);
      });
    } else {
      toast.error(t('liveClasses.mcqIncorrectToast'));
    }
    fetchNextLiveQuestion();
  };

  const handleRecommendedVideoClick = (video: PwVideo) => {
    toast(t('liveClasses.studyVideoToast', { videoTitle: video.title }));
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('liveClasses.pageTitle')}</h1>
        <p className="text-gray-600">{t('liveClasses.pageSubtitle')}</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="lg:flex-[2] space-y-6 flex flex-col">
          <Card className="p-2 sm:p-4" ref={videoPlayerRef}>
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&modestbranding=1&rel=0&controls=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
            <div className="mt-4 flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                    <Button onClick={togglePlayPause} variant="ghost" size="sm" className="p-2">
                        {isVideoPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </Button>
                    <div className="text-sm text-gray-600">
                        {t('liveClasses.simulatedTimeLabel')}: {Math.floor(currentTimeInSeconds / 60)}:{(currentTimeInSeconds % 60).toString().padStart(2, '0')}
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <label htmlFor="transcript-lang-select" className="text-sm text-gray-600 sr-only">{t('liveClasses.selectTranscriptLanguageLabel')}</label>
                    <Languages size={16} className="text-gray-500" />
                    <select
                        id="transcript-lang-select"
                        value={selectedTranscriptLanguage}
                        onChange={(e) => setSelectedTranscriptLanguage(e.target.value)}
                        className="text-sm p-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        aria-label={t('liveClasses.selectTranscriptLanguageLabel')}
                    >
                        {languageOptionsForTranscript.map(lang => (
                            <option key={lang.value} value={lang.value}>{t(lang.labelKey)}</option>
                        ))}
                    </select>
                </div>
            </div>
          </Card>

          <div className="flex-grow">
            <InteractivePanel
              currentSimulatedTime={currentTimeInSeconds}
              liveTranscripts={liveTranscripts}
              loadingTranscripts={loadingTranscripts}
              transcriptError={transcriptError}
              currentMCQ={currentLiveMCQ}
              isFetchingMCQ={isFetchingMCQ}
              mcqError={mcqError}
              mcqTimer={liveMCQTimer}
              leaderboardData={leaderboardData}
              newQuestionIndicator={newQuestionIndicator}
              onQuizAnswerSubmit={handleQuizAnswerSubmit}
            />
          </div>
        </div>

        <div className={`lg:flex-[1] transition-all duration-300 ease-in-out 
                       ${isChatOpen 
                         ? 'fixed inset-0 bg-black bg-opacity-50 z-40 lg:static lg:bg-transparent lg:z-auto' 
                         : 'hidden lg:block'}`} 
             onClick={() => { if (window.innerWidth < 1024) setIsChatOpen(false);}}>
          <motion.div 
            className={`h-full w-full max-w-md ml-auto lg:max-w-none bg-white shadow-xl lg:shadow-none lg:rounded-none flex flex-col overflow-y-auto
                       ${isChatOpen ? 'rounded-l-xl' : 'lg:rounded-xl'}`}
            initial={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            animate={window.innerWidth < 1024 ? { x: isChatOpen ? "0%" : "100%" } : { opacity: 1 }}
            exit={window.innerWidth < 1024 ? { x: "100%" } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              height: videoPlayerRef.current && window.innerWidth >=1024 
                ? `${videoPlayerRef.current.offsetHeight + (document.querySelector('.interactive-panel-actual-height')?.clientHeight || 400) + 24}px`
                : 'calc(100vh - 4rem)',
              maxHeight: 'calc(100vh - 4rem)'
            }}
          >
            <Card className="p-0 flex flex-col flex-grow">
              <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Bot size={20} className="mr-2 text-blue-600" /> {t('liveClasses.aiDoubtSolverTitle')}
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
                    placeholder={user ? t('liveClasses.chatPlaceholderUser') : t('liveClasses.chatPlaceholderGuest')}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={!user || !liveChatId}
                  />
                  <Button onClick={handleChatSend} size="md" disabled={!user || !chatInput.trim() || !liveChatId}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </Card>
            
            <div className="p-4 border-t bg-white">
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                    <PlayCircleIcon size={18} className="mr-2 text-red-600"/> {t('liveClasses.recommendedVideosTitle')}
                </h3>
                <div className="space-y-3">
                    {recommendedVideos.map(video => (
                        <Card key={video.id} className="p-2.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start space-x-2.5">
                                <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-12 object-cover rounded flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-semibold text-gray-900 truncate" title={video.title}>{video.title}</h4>
                                    <p className="text-xs text-gray-500 truncate">{video.channel}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
                                        <span>{video.views}</span>
                                        <span>{video.duration}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-blue-600 hover:bg-blue-50 px-1 py-0.5 text-xs mt-1"
                                        onClick={() => handleRecommendedVideoClick(video)}
                                    >
                                        {t('liveClasses.studyThisVideoButton')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
          </motion.div>
        </div>

        {!isChatOpen && (
          <Button
            variant="primary"
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-30 lg:hidden rounded-full p-3 shadow-lg flex items-center justify-center"
            aria-label={t('liveClasses.openChatAriaLabel')}
          >
            <Bot size={24} />
          </Button>
        )}
      </div>
    </div>
  );
};
