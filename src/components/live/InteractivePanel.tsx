import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, HelpCircle, BarChart3, CheckCircle, XCircle, Clock, Award, Bell } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { mockTranscript, TranscriptSegment, liveClassMockMcqs, MCQ } from './LiveClassesPage'; // Import shared types/data

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  avgTime: number; // in seconds
}

interface InteractivePanelProps {
  currentSimulatedTime: number;
  currentMCQ: MCQ | null;
  mcqTimer: number;
  leaderboardData: LeaderboardEntry[];
  newQuestionIndicator: boolean;
  onQuizAnswerSubmit: (isCorrect: boolean) => void;
}

export const InteractivePanel: React.FC<InteractivePanelProps> = ({
  currentSimulatedTime,
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
  const [currentTranscriptSegment, setCurrentTranscriptSegment] = useState<TranscriptSegment | null>(mockTranscript[0]);

  useEffect(() => {
    // Update transcript based on simulated time
    const nextTranscriptSegment = mockTranscript.find(
      segment => currentSimulatedTime >= segment.startTime && 
                 (mockTranscript.findIndex(s => s.id === segment.id) === mockTranscript.length - 1 || 
                  currentSimulatedTime < mockTranscript[mockTranscript.findIndex(s => s.id === segment.id) + 1].startTime)
    );
    if (nextTranscriptSegment && nextTranscriptSegment.id !== currentTranscriptSegment?.id) {
      setCurrentTranscriptSegment(nextTranscriptSegment);
    }
  }, [currentSimulatedTime, currentTranscriptSegment?.id]);

  useEffect(() => {
    if (transcriptContainerRef.current && currentTranscriptSegment) {
      const activeElement = transcriptContainerRef.current.querySelector(`[data-segment-id="${currentTranscriptSegment.id}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTranscriptSegment]);
  
  // Reset MCQ feedback when a new MCQ loads
  useEffect(() => {
    setSelectedMCQAnswer(null);
    setMcqFeedback(null);
  }, [currentMCQ]);

  const handleMCQSelect = (selectedIndex: number) => {
    if (!currentMCQ || mcqFeedback) return; // Don't allow re-answer or answer if no feedback yet
    setSelectedMCQAnswer(selectedIndex);
    const correct = selectedIndex === currentMCQ.correctAnswerIndex;
    setMcqFeedback({ correct, explanation: currentMCQ.explanation });
    onQuizAnswerSubmit(correct); // Notify parent
  };

  const tabs = [
    { id: 'transcription' as const, label: 'Transcription', icon: ListChecks },
    { id: 'quiz' as const, label: 'Quiz', icon: HelpCircle, notification: newQuestionIndicator },
    { id: 'leaderboard'as const, label: 'Leaderboard', icon: BarChart3 },
  ];

  return (
    <Card className="p-0 flex flex-col h-full interactive-panel-actual-height"> {/* Added class for height query */}
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
              ref={transcriptContainerRef} className="space-y-2 h-[calc(100%-0px)] overflow-y-auto pr-2" // Ensure full height for scroll
            >
              {mockTranscript.map(segment => (
                <motion.p
                  key={segment.id}
                  data-segment-id={segment.id}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: currentTranscriptSegment?.id === segment.id ? 1 : 0.7, 
                             fontWeight: currentTranscriptSegment?.id === segment.id ? '600' : '400',
                             backgroundColor: currentTranscriptSegment?.id === segment.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                           }}
                  className={`text-sm transition-all duration-300 p-1.5 rounded ${
                    currentTranscriptSegment?.id === segment.id ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span className="font-semibold text-blue-600 mr-1">{`[${Math.floor(segment.startTime/60)}:${(segment.startTime%60).toString().padStart(2,'0')}]`}</span>
                  {segment.text}
                </motion.p>
              ))}
            </motion.div>
          )}

          {activeTab === 'quiz' && currentMCQ && (
            <motion.div 
              key={`quiz-${currentMCQ.id}`} // Key change to force re-animation
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
