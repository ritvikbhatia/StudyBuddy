import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageCircle, PlayCircle, BookOpen, Brain, Share2, Download, Trophy, Clock, ChevronRight, Send, Bot, User, AlertTriangle, Languages, FileText, Image as ImageIcon, Mic, Video as VideoIcon, Youtube, Film, ListChecks } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StudyMaterial, Quiz, InputContent } from '../../types';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import toast from 'react-hot-toast';

interface StudyMaterialResponseProps {
  data: {
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    content: string; // This is originalInput.content for Quick Reference
    outputLanguage: string;
    originalInput: InputContent; // Added originalInput
  };
  onBack: () => void;
  onNewStudy: () => void;
  isTopicView?: boolean;
}

// Helper to get YouTube Embed URL
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
    // Fallback for cases where URL might be just an ID or malformed
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
      videoId = match[1];
    } else if (url.length === 11 && !url.includes('.')) { // Simple check for an 11-char ID
        videoId = url;
    }
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};


export const StudyMaterialResponse: React.FC<StudyMaterialResponseProps> = ({ data, onBack, onNewStudy, isTopicView = false }) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'quiz' | 'chat' | 'quick-reference'>('materials');
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const effectiveOutputLanguage = (data && data.outputLanguage && typeof data.outputLanguage === 'string' && data.outputLanguage.trim() !== '')
                                ? data.outputLanguage
                                : 'english';
  const languageLabel = effectiveOutputLanguage.charAt(0).toUpperCase() + effectiveOutputLanguage.slice(1);

  const initialChatMessageText = isTopicView 
    ? `Viewing materials for ${data.topic} (in ${languageLabel}). You can review your saved notes and original input here. To get a new quiz or AI tutor session for this topic, please generate a new study package.`
    : `Hi! I'm your AI tutor for ${data.topic} (in ${languageLabel}). Feel free to ask me any questions about the study materials, concepts, or anything related to this topic. How can I help you learn better?`;

  const [chatMessages, setChatMessages] = useState<Array<{ id: string; type: 'user' | 'ai'; content: string; timestamp: Date }>>([
    {
      id: 'initial-ai-message',
      type: 'ai',
      content: initialChatMessageText,
      timestamp: new Date(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const formatMaterialContent = (material: StudyMaterial) => {
    if (material.type === 'flashcards') {
      const flashcardData = typeof material.content === 'string' ? JSON.parse(material.content) : material.content;
      return (
        <div className="space-y-3">
          {flashcardData.cards?.map((card: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="font-semibold text-gray-900 mb-2">Q: {card.question}</div>
              <div className="text-gray-700">A: {card.answer}</div>
              {card.difficulty && (
                <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                  card.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {card.difficulty}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } else if (material.type === 'mindmap') {
      const mindmapData = typeof material.content === 'string' ? JSON.parse(material.content) : material.content;
      return (
        <div className="text-center">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold mb-4 inline-block">
            {mindmapData.central}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mindmapData.branches?.map((branch: any, index: number) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="font-semibold text-gray-900 mb-2">{branch.title}</div>
                <div className="space-y-1">
                  {branch.subtopics?.map((subtopic: string, i: number) => (
                    <div key={i} className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                      {subtopic}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
          {typeof material.content === 'string' ? material.content : JSON.stringify(material.content, null, 2)}
        </pre>
      );
    }
  };

  const handleQuizStart = () => {
    if (!data.quiz) return;
    setQuizStarted(true);
    setCurrentQuizQuestion(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    
    storageService.addActivity({
      type: 'quiz',
      title: `Started quiz: ${data.quiz.title}`,
      points: 0,
      metadata: { topic: data.topic, questionCount: data.quiz.questions.length, language: effectiveOutputLanguage },
    });
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
        if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim().length > 10) { 
          score += Math.floor(question.points * 0.7); 
        }
      }
    });

    setQuizScore(score);
    setQuizCompleted(true);

    storageService.saveQuizResult({
      quizId: data.quiz.id,
      quizTitle: data.quiz.title,
      topic: data.topic,
      score,
      totalPoints,
      answers: quizAnswers,
      completedAt: new Date(),
      language: effectiveOutputLanguage,
    });

    storageService.addActivity({
      type: 'quiz',
      title: `Completed quiz: ${data.quiz.title}`,
      score: `${score}/${totalPoints}`,
      points: score,
      metadata: { topic: data.topic, accuracy: (totalPoints > 0 ? (score / totalPoints) * 100 : 0), language: effectiveOutputLanguage },
    });

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
      // Use originalInput.content for context if available, otherwise fallback to data.content (topic name)
      const chatContextContent = data.originalInput?.content || data.content;
      const aiResponse = await aiService.generateChatResponse(currentChatInput, data.topic, chatContextContent, effectiveOutputLanguage);
      const aiMessage = { id: (Date.now() + 1).toString(), type: 'ai' as const, content: aiResponse, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsAITyping(false);
    }
  };
  
  const renderQuickReferenceContent = () => {
    if (!data.originalInput) {
      return <p className="text-gray-500">Original input details not available.</p>;
    }
    const { type, content, metadata } = data.originalInput;

    switch (type) {
      case 'text':
        return (
          <div>
            <h4 className="font-semibold mb-1">Text Input:</h4>
            {metadata?.aiPrompt && <p className="text-sm text-gray-600 mb-1">AI Prompt: <span className="italic">{metadata.aiPrompt}</span></p>}
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded text-sm">{content}</pre>
          </div>
        );
      case 'document':
        return (
          <div>
            <h4 className="font-semibold mb-1">Document:</h4>
            <p>Type: <span className="font-medium">{metadata?.documentType || 'Unknown'}</span></p>
            <p>File: <span className="font-medium">{content}</span></p>
            {metadata?.fileName && metadata.fileName !== content && <p className="text-xs text-gray-500">(Original: {metadata.fileName})</p>}
          </div>
        );
      case 'audio':
        return (
          <div>
            <h4 className="font-semibold mb-1">Audio Input:</h4>
            <p>{content.startsWith('Recorded Audio') ? content : `Uploaded File: ${content}`}</p>
            {/* If content were a URL, an <audio> player could be here */}
          </div>
        );
      case 'video': // Video file upload
        return (
          <div>
            <h4 className="font-semibold mb-1">Video File Input:</h4>
            <p>Uploaded File: {content}</p>
            {/* If content were a URL, a <video> player could be here */}
          </div>
        );
      case 'youtube':
        const embedUrl = getYoutubeEmbedUrl(content);
        return (
          <div>
            <h4 className="font-semibold mb-1">YouTube Video:</h4>
            {metadata?.title && <p className="mb-1">Title: {metadata.title}</p>}
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={embedUrl}
                  title="YouTube video player - Quick Reference"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <p className="text-red-500">Could not display YouTube video. URL: {content}</p>
            )}
          </div>
        );
      case 'videolecture': // Local library video
         return (
          <div>
            <h4 className="font-semibold mb-1">Video Lecture:</h4>
            <p>Title: <span className="font-medium">{metadata?.title || content}</span></p>
            {metadata?.videoLectureDetails && (
                <div className="text-sm text-gray-600">
                    <p>Batch: {metadata.videoLectureDetails.batch}</p>
                    <p>Subject: {metadata.videoLectureDetails.subject}</p>
                    {metadata.videoLectureDetails.tags && metadata.videoLectureDetails.tags.length > 0 && (
                        <p>Tags: {metadata.videoLectureDetails.tags.join(', ')}</p>
                    )}
                </div>
            )}
            <div className="mt-2 p-4 bg-gray-100 rounded-lg text-center">
                <Film size={48} className="mx-auto text-gray-400 mb-2"/>
                <p className="text-sm text-gray-600">Video lecture selected from library.</p>
            </div>
          </div>
        );
      default:
        return <p>Original input type: {type}, Content: {content}</p>;
    }
  };


  const currentQuestion = data.quiz?.questions[currentQuizQuestion];
  const canTakeQuiz = !isTopicView && data.quiz;
  const canUseChat = !isTopicView;

  const tabsConfig = [
    { id: 'materials', label: `Materials (${data.materials.length})`, icon: BookOpen },
    { id: 'quick-reference', label: 'Original Input', icon: ListChecks },
    { id: 'quiz', label: `Quiz ${data.quiz ? `(${data.quiz.questions.length})` : ''}`, icon: Trophy },
    { id: 'chat', label: 'AI Tutor', icon: MessageCircle },
  ];


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.topic}</h1>
            <div className="flex items-center text-sm text-gray-500">
              <Languages size={14} className="mr-1.5" />
              <span>{languageLabel}</span>
              <span className="mx-1.5">•</span>
              <span>{isTopicView ? "Viewing saved materials" : "Complete study package"}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 self-start sm:self-center">
          <Button variant="outline" size="md" onClick={onNewStudy}>
            {isTopicView ? `Generate New for ${data.topic}` : "Start New Study"}
          </Button>
          <Button variant="primary" size="md">
            <Share2 size={16} className="mr-2" /> Share
          </Button>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabsConfig.map(tabInfo => {
          const Icon = tabInfo.icon;
          return (
            <button
              key={tabInfo.id}
              onClick={() => setActiveTab(tabInfo.id as any)}
              className={`flex-shrink-0 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === tabInfo.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              <span>{tabInfo.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'materials' && (
          <motion.div key="materials" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid lg:grid-cols-2 gap-6">
            {data.materials.map((material, index) => (
              <motion.div key={material.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="h-full">
                <Card className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{material.title}</h3>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="p-1.5"><Download size={16} /></Button>
                      <Button variant="ghost" size="sm" className="p-1.5"><Share2 size={16} /></Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto flex-grow text-sm">
                    {formatMaterialContent(material)}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'quick-reference' && (
            <motion.div key="quick-reference" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Original Input Details</h2>
                    {renderQuickReferenceContent()}
                </Card>
            </motion.div>
        )}

        {activeTab === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-6 max-w-4xl mx-auto">
              {(!canTakeQuiz && isTopicView) || !data.quiz ? (
                <div className="text-center space-y-4 py-8">
                  <AlertTriangle size={48} className="mx-auto text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-800">Quiz Not Available</h3>
                  <p className="text-gray-600">Interactive quizzes are generated with new study packages.</p>
                  <Button onClick={onNewStudy} size="md">Generate New Study Package for {data.topic}</Button>
                </div>
              ) : !quizStarted ? (
                <div className="text-center space-y-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <Trophy className="mx-auto text-blue-600 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{data.quiz.title}</h3>
                    <p className="text-gray-600 mb-4">Test your knowledge with this interactive quiz.</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded"><div className="font-semibold">{data.quiz.questions.length}</div><div className="text-gray-600">Questions</div></div>
                      <div className="bg-white p-3 rounded"><div className="font-semibold">{Math.floor(data.quiz.timeLimit / 60)}</div><div className="text-gray-600">Minutes</div></div>
                      <div className="bg-white p-3 rounded"><div className="font-semibold capitalize">{data.quiz.difficulty}</div><div className="text-gray-600">Difficulty</div></div>
                    </div>
                  </div>
                  <Button onClick={handleQuizStart} size="lg" className="px-8"><PlayCircle className="mr-2" size={20} /> Start Quiz</Button>
                </div>
              ) : quizCompleted ? (
                <div className="text-center space-y-6">
                   <div className="bg-green-50 p-6 rounded-lg">
                    <Trophy className="mx-auto text-green-600 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Completed!</h3>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {quizScore}/{data.quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                    </div>
                    <p className="text-gray-600">Accuracy: {Math.round((quizScore / (data.quiz.questions.reduce((sum, q) => sum + q.points, 0) || 1)) * 100)}%</p>
                  </div>
                  <div className="flex space-x-4 justify-center">
                    <Button variant="outline" size="md" onClick={() => { setQuizStarted(true); setQuizCompleted(false); setCurrentQuizQuestion(0); setQuizAnswers({}); }}>Review Questions</Button>
                    <Button size="md" onClick={onNewStudy}>{isTopicView ? `Generate New for ${data.topic}` : "Study More Topics"}</Button>
                  </div>
                </div>
              ) : currentQuestion ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">Question {currentQuizQuestion + 1} of {data.quiz.questions.length}</div>
                      <div className="bg-gray-200 rounded-full h-2 flex-1 max-w-xs">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuizQuestion + 1) / data.quiz.questions.length) * 100}%` }}/>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600"><Clock size={16} /><span>{currentQuestion.points} pts</span></div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{currentQuestion.question}</h4>
                    {currentQuestion.type === 'mcq' ? (
                      <div className="space-y-3">
                        {currentQuestion.options?.map((option, index) => (
                          <label key={index} className={`flex items-center space-x-3 p-3 bg-white rounded border cursor-pointer hover:bg-gray-50 ${quizAnswers[currentQuestion.id] === index ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}>
                            <input type="radio" name={`question-${currentQuestion.id}`} value={index} checked={quizAnswers[currentQuestion.id] === index} onChange={() => handleQuizAnswer(currentQuestion.id, index)} className="text-blue-600 focus:ring-blue-500"/>
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea value={quizAnswers[currentQuestion.id] || ''} onChange={(e) => handleQuizAnswer(currentQuestion.id, e.target.value)} placeholder="Write your answer here..." className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"/>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" size="md" disabled={currentQuizQuestion === 0} onClick={() => setCurrentQuizQuestion(prev => prev - 1)}>Previous</Button>
                    <Button size="md" disabled={quizAnswers[currentQuestion.id] === undefined || quizAnswers[currentQuestion.id] === null || (typeof quizAnswers[currentQuestion.id] === 'string' && quizAnswers[currentQuestion.id].trim() === '')} onClick={handleNextQuestion}>
                      {currentQuizQuestion === data.quiz.questions.length - 1 ? 'Complete Quiz' : 'Next Question'} <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-0 max-w-4xl mx-auto h-[32rem] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Brain className="mr-2 text-blue-600" size={20} /> AI Tutor for {data.topic} ({languageLabel})
                </h3>
              </div>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${ message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900' }`}>
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && <Bot size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />}
                        <div className="text-sm">{message.content}</div>
                        {message.type === 'user' && <User size={16} className="text-blue-200 mt-0.5 flex-shrink-0" />}
                      </div>
                    </div>
                  </div>
                ))}
                {isAITyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Bot size={16} className="text-blue-600" />
                        <div className="flex space-x-1">
                          {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-2">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder={canUseChat ? "Ask me anything..." : "AI Tutor available with new study packages."} className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={!canUseChat} />
                  <Button onClick={handleChatSend} disabled={!chatInput.trim() || !canUseChat} size="md" className="p-3"><Send size={16} /></Button>
                </div>
                {!canUseChat && isTopicView && (
                  <p className="text-xs text-gray-500 mt-2 text-center">To chat with the AI Tutor for {data.topic}, please <button onClick={onNewStudy} className="text-blue-600 hover:underline">generate a new study package</button>.</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
