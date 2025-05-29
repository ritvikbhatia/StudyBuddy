import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, HelpCircle, BarChart3, CheckCircle, XCircle, Clock, Award, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2, AlertTriangle
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ApiTranscriptItem } from '../../types'; // Import new type

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  avgTime: number; // in seconds
}

export interface MCQ { // Re-defining MCQ here if not imported from LiveClassesPage
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface InteractivePanelProps {
  currentSimulatedTime: number;
  liveTranscripts: ApiTranscriptItem[]; // Updated prop
  loadingTranscripts: boolean;
  transcriptError: string | null;
  currentMCQ: MCQ | null;
  mcqTimer: number;
  leaderboardData: LeaderboardEntry[];
  newQuestionIndicator: boolean;
  onQuizAnswerSubmit: (isCorrect: boolean) => void;
}

// Helper function to parse timeline string like "[0s - 10s]"
const parseTimeline = (timeline: string): { start: number; end: number } | null => {
  const match = timeline.match(/\[(\d+)s - (\d+)s\]/);
  if (match && match[1] && match[2]) {
    return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
  }
  return null;
};


export const InteractivePanel: React.FC<InteractivePanelProps> = ({
  currentSimulatedTime,
  liveTranscripts,
  loadingTranscripts,
  transcriptError,
  currentMCQ,
  mcqTimer,
  leaderboardData,
  newQuestionIndicator,
  onQuizAnswerSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'transcription' | 'quiz' | 'leaderboard'>('transcription');
  const [selectedMCQAnswer, setSelectedMCQAnswer] = useState<number | null>(null);
  const [mcqFeedback, setMcqFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [activeTranscriptIndex, setActiveTranscriptIndex] = useState<number>(-1);

  useEffect(() => {
    // Determine active transcript segment
    let foundActiveIndex = -1;
    for (let i = 0; i < liveTranscripts.length; i++) {
      const timelineRange = parseTimeline(liveTranscripts[i].timeline);
      if (timelineRange && currentSimulatedTime >= timelineRange.start && currentSimulatedTime <= timelineRange.end) {
        foundActiveIndex = i;
        break;
      }
      // If no exact match, highlight the one whose start time is closest but not past current time
      if (timelineRange && currentSimulatedTime >= timelineRange.start) {
        foundActiveIndex = i; 
      }
    }
    if (foundActiveIndex !== activeTranscriptIndex) {
      setActiveTranscriptIndex(foundActiveIndex);
    }
  }, [currentSimulatedTime, liveTranscripts, activeTranscriptIndex]);

  useEffect(() => {
    if (transcriptContainerRef.current && activeTranscriptIndex !== -1) {
      const activeElement = transcriptContainerRef.current.children[activeTranscriptIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeTranscriptIndex]);
  
  useEffect(() => {
    setSelectedMCQAnswer(null);
    setMcqFeedback(null);
  }, [currentMCQ]);

  const handleMCQSelect = (selectedIndex: number) => {
    if (!currentMCQ || mcqFeedback) return;
    setSelectedMCQAnswer(selectedIndex);
    const correct = selectedIndex === currentMCQ.correctAnswerIndex;
    setMcqFeedback({ correct, explanation: currentMCQ.explanation });
    onQuizAnswerSubmit(correct);
  };

  const tabs = [
    { id: 'transcription' as const, label: 'Transcription', icon: ListChecks },
    { id: 'quiz' as const, label: 'Quiz', icon: HelpCircle, notification: newQuestionIndicator },
    { id: 'leaderboard'as const, label: 'Leaderboard', icon: BarChart3 },
  ];

  return (
    <Card className="p-0 flex flex-col h-full interactive-panel-actual-height">
      <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium flex items-center justify-center space-x-1.5 relative transition-colors
                        ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.notification && (
              <motion.span 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute top-1 right-1 sm:right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'transcription' && (
            <motion.div 
              key="transcription"
              initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} exit={{ opacity: 0, y:-10 }}
              ref={transcriptContainerRef} className="space-y-2 h-[calc(100%-0px)] overflow-y-auto pr-2"
            >
              {loadingTranscripts && liveTranscripts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Loader2 size={32} className="animate-spin mb-2" />
                  <p>Loading transcripts...</p>
                </div>
              )}
              {transcriptError && (
                 <div className="flex flex-col items-center justify-center h-full text-red-500 p-4 bg-red-50 rounded-md">
                  <AlertTriangle size={32} className="mb-2" />
                  <p>{transcriptError}</p>
                </div>
              )}
              {!loadingTranscripts && !transcriptError && liveTranscripts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <ListChecks size={32} className="mb-2" />
                  <p>No transcripts available yet for this stream.</p>
                </div>
              )}
              {liveTranscripts.map((segment, index) => (
                <motion.p
                  key={index} // Use index as key since API might not provide unique IDs for transcripts
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: activeTranscriptIndex === index ? 1 : 0.7, 
                             fontWeight: activeTranscriptIndex === index ? '600' : '400',
                             backgroundColor: activeTranscriptIndex === index ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                           }}
                  className={`text-sm transition-all duration-300 p-1.5 rounded ${
                    activeTranscriptIndex === index ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span className="font-semibold text-blue-600 mr-1">{segment.timeline}</span>
                  {segment.text}
                </motion.p>
              ))}
            </motion.div>
          )}

          {activeTab === 'quiz' && currentMCQ && (
            <motion.div 
              key={`quiz-${currentMCQ.id}`}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md sm:text-lg font-semibold text-gray-800">Live Quiz Question</h3>
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <Clock size={14} />
                  <span>Time left: {mcqTimer}s</span>
                </div>
              </div>
              <p className="text-gray-700 font-medium text-sm sm:text-base mb-3">{currentMCQ.question}</p>
              <div className="space-y-2">
                {currentMCQ.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedMCQAnswer === index ? (mcqFeedback?.correct ? 'primary' : 'secondary') : 'outline'}
                    size="md"
                    className={`w-full justify-start text-left h-auto py-2 text-xs sm:text-sm
                                ${selectedMCQAnswer === index && mcqFeedback?.correct ? 'bg-green-500 hover:bg-green-600 border-green-500 text-white' : ''}
                                ${selectedMCQAnswer === index && mcqFeedback && !mcqFeedback.correct ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : ''}
                                ${mcqFeedback && selectedMCQAnswer !== index ? 'opacity-60 cursor-not-allowed' : ''}
                              `}
                    onClick={() => handleMCQSelect(index)}
                    disabled={!!mcqFeedback}
                  >
                    {mcqFeedback && selectedMCQAnswer === index && (mcqFeedback.correct ? <CheckCircle size={16} className="mr-1.5"/> : <XCircle size={16} className="mr-1.5"/>)}
                    {option}
                  </Button>
                ))}
              </div>
              {mcqFeedback && (
                <motion.div 
                  initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} 
                  className={`p-2.5 rounded-lg text-xs sm:text-sm mt-3 ${mcqFeedback.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                >
                  <p className="font-semibold">{mcqFeedback.correct ? 'Correct!' : 'Incorrect.'}</p>
                  <p>{mcqFeedback.explanation}</p>
                </motion.div>
              )}
              {!mcqFeedback && <p className="text-xs text-gray-500 mt-2 text-center">Select an answer. New question in {mcqTimer}s.</p>}
            </motion.div>
          )}
          {activeTab === 'quiz' && !currentMCQ && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1}} className="text-center py-10 text-gray-500">
                <HelpCircle size={32} className="mx-auto mb-2"/>
                <p>Quiz questions will appear here periodically.</p>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h3 className="text-md sm:text-lg font-semibold text-gray-800 mb-3">Class Leaderboard</h3>
              {leaderboardData.length > 0 ? (
                leaderboardData.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center space-x-3 p-2.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <span className={`font-bold w-6 text-center ${index < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                      {index + 1}
                    </span>
                    <img src={entry.avatar} alt={entry.name} className="w-8 h-8 rounded-full"/>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800 truncate">{entry.name}</p>
                      <p className="text-xs text-gray-500">
                        {entry.correctAnswers} correct answers
                      </p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-sm text-blue-600">{entry.score} pts</p>
                        <p className="text-xs text-gray-500">Avg: {entry.avgTime}s</p>
                    </div>
                    {index < 3 && <Award size={16} className="text-yellow-400"/>}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-5">Leaderboard is currently empty. Participate in quizzes to rank up!</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};
