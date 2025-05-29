import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Users, Clock, Trophy, Star, Zap, Shield, UserCheck, HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { aiService } from '../../services/aiService';
import { faker } from '@faker-js/faker';
import toast from 'react-hot-toast';
import { Quiz, Question as QuizQuestionType } from '../../types';

interface Opponent {
  id: string;
  name: string;
  avatar: string;
  level: number;
}

type BattleState = 'idle' | 'matching' | 'battling' | 'results';

interface BattlePageProps {
  battleParams?: { topic: string; context: string; } | null; // Receive context from App.tsx
}

export const BattlePage: React.FC<BattlePageProps> = ({ battleParams }) => {
  const { user } = useAuth();
  const [battleState, setBattleState] = useState<BattleState>('idle');
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [battleQuiz, setBattleQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | number | null>(null);
  const [isOpponentAnswering, setIsOpponentAnswering] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'opponent' | 'draw' | null>(null);
  
  // Use battleParams if available, otherwise fall back to state or default
  const [battleTopic, setBattleTopic] = useState<string>(battleParams?.topic || 'General Knowledge');
  const [battleDifficulty, setBattleDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [answerSubmittedThisTurn, setAnswerSubmittedThisTurn] = useState<boolean>(false);
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);

  const [battleHistory, setBattleHistory] = useState<any[]>([]);
   useEffect(() => {
    if(user) {
      setBattleHistory(storageService.getBattleHistory(user.id));
    }
  }, [user, battleState]);

  useEffect(() => {
    // If battleParams change (e.g., user navigated here with new params), update local state
    if (battleParams) {
      setBattleTopic(battleParams.topic);
      // Potentially set difficulty based on context or keep default
    }
  }, [battleParams]);


  const startMatching = async (topic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    if (!user) {
      toast.error('Please log in to start a battle!');
      return;
    }
    setBattleState('matching');
    setIsPreparingBattle(true);
    setBattleTopic(topic); // Set topic for this specific battle
    setBattleDifficulty(difficulty);
    setUserScore(0);
    setOpponentScore(0);
    setCurrentQuestionIndex(0);
    setBattleWinner(null);
    setUserAnswer(null);
    setAnswerSubmittedThisTurn(false); 

    await new Promise(resolve => setTimeout(resolve, 1500)); 
    const newOpponent: Opponent = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      avatar: faker.image.avatarGitHub(),
      level: faker.number.int({ min: user.level - 2 > 0 ? user.level - 2 : 1, max: user.level + 2 }),
    };
    setOpponent(newOpponent);

    try {
      const contextForAPI = battleParams?.context || "General knowledge questions for a quiz battle."; // Use passed context or default
      const questions = await aiService.generateLiveQuestionsAPI(contextForAPI, 5, 'english');
      
      if (questions.length < 5) {
          toast.error("Could not generate enough questions for the battle. Please try another topic or difficulty.");
          setBattleState('idle');
          setIsPreparingBattle(false);
          return;
      }

      const newBattleQuiz: Quiz = {
        id: `battle-quiz-${Date.now()}`,
        title: `${topic} Battle Quiz`,
        topic: topic,
        questions: questions.slice(0, 5), // Ensure exactly 5 questions
        difficulty: difficulty,
        timeLimit: 5 * 60, // 5 minutes for 5 questions
        createdAt: new Date(),
        language: 'english',
      };
      setBattleQuiz(newBattleQuiz);
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      setBattleState('battling');
    } catch (error: any) {
      console.error("Battle Quiz Generation Error:", error);
      toast.error(error.message || "Failed to prepare battle quiz. Please try again.");
      setBattleState('idle');
    } finally {
        setIsPreparingBattle(false);
    }
  };

  const handleAnswer = async (answer: string | number) => {
    if (!battleQuiz || !user || answerSubmittedThisTurn || isOpponentAnswering) return;

    setAnswerSubmittedThisTurn(true);
    setIsOpponentAnswering(true);

    const question = battleQuiz.questions[currentQuestionIndex];
    let currentUserCorrect = false;
    if (question.type === 'mcq') {
      currentUserCorrect = answer === question.correctAnswer;
    } else { 
      currentUserCorrect = (answer as string).length > 0; // Simple check for subjective
    }
    if (currentUserCorrect) setUserScore(s => s + question.points);

    await new Promise(resolve => setTimeout(resolve, faker.number.int({min: 500, max: 1500})));
    const opponentCorrect = Math.random() < (battleDifficulty === 'easy' ? 0.5 : battleDifficulty === 'medium' ? 0.65 : 0.8);
    if (opponentCorrect) setOpponentScore(s => s + question.points);
    
    setIsOpponentAnswering(false);
    
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    if (currentQuestionIndex < battleQuiz.questions.length - 1) {
      setCurrentQuestionIndex(idx => idx + 1);
      setUserAnswer(null); 
      setAnswerSubmittedThisTurn(false); 
    } else {
      let winner: 'user' | 'opponent' | 'draw';
      if (userScore > opponentScore) winner = 'user';
      else if (opponentScore > userScore) winner = 'opponent';
      else winner = 'draw';
      setBattleWinner(winner);
      setBattleState('results');

      const reward = winner === 'user' ? (battleDifficulty === 'easy' ? 50 : battleDifficulty === 'medium' ? 100 : 150) : 0;
      if (winner === 'user' && reward > 0) {
        storageService.updateUserStats(reward, 'battle');
        toast.success(`You won ${reward} points!`);
      } else if (winner === 'opponent') {
        toast.error('Better luck next time!');
      } else {
        toast.info("It's a draw!");
      }
      
      storageService.saveBattleResult({
        id: faker.string.uuid(),
        userId: user.id,
        battleTitle: `${battleTopic} Battle vs ${opponent?.name}`,
        opponentName: opponent?.name,
        userScore,
        opponentScore,
        result: winner,
        reward,
        completedAt: new Date(),
        topic: battleTopic,
        difficulty: battleDifficulty,
      });
      setUserAnswer(null);
      setAnswerSubmittedThisTurn(false);
    }
  };
  
  const quickBattleOptions = [
    { topic: "General Knowledge", difficulty: "medium" as const, context: "General knowledge questions covering various fields." },
    { topic: "Science Trivia", difficulty: "easy" as const, context: "Basic science trivia questions suitable for beginners." },
    { topic: "History Facts", difficulty: "hard" as const, context: "Challenging history facts from around the world." },
  ];

  const currentQuestionData = battleQuiz?.questions[currentQuestionIndex];

  const userStats = {
    battlesWon: battleHistory.filter(b => b.result === 'user' && b.userId === user?.id).length,
    battlesPlayed: battleHistory.filter(b => b.userId === user?.id).length,
    totalRewards: battleHistory.filter(b => b.userId === user?.id).reduce((sum, b) => sum + (b.reward || 0), 0),
    winRate: 0,
  };
   userStats.winRate = userStats.battlesPlayed > 0 
      ? Math.round((userStats.battlesWon / userStats.battlesPlayed) * 100)
      : 0;


  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {battleState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Battles</h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Challenge an AI opponent and test your wits in a quick-fire quiz battle!
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center h-full">
                <Trophy className="mx-auto mb-2 text-yellow-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{userStats.battlesWon}</div>
                <div className="text-sm text-gray-600">Battles Won</div>
              </Card>
              <Card className="p-4 text-center h-full">
                <Sword className="mx-auto mb-2 text-red-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{userStats.battlesPlayed}</div>
                <div className="text-sm text-gray-600">Battles Played</div>
              </Card>
              <Card className="p-4 text-center h-full">
                <Star className="mx-auto mb-2 text-purple-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{userStats.winRate}%</div>
                <div className="text-sm text-gray-600">Win Rate</div>
              </Card>
              <Card className="p-4 text-center h-full">
                <Users className="mx-auto mb-2 text-blue-600" size={24} />
                <div className="text-2xl font-bold text-gray-900">{userStats.totalRewards}</div>
                <div className="text-sm text-gray-600">Total Rewards</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Start a Quick Battle!</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {quickBattleOptions.map(opt => (
                  <Button
                    key={opt.topic}
                    size="lg"
                    variant="outline"
                    className="flex flex-col h-auto py-4"
                    onClick={() => startMatching(opt.topic, opt.difficulty)} // Quick battles use default context
                    disabled={isPreparingBattle}
                  >
                    <span className="text-lg font-semibold">{opt.topic}</span>
                    <span className={`text-sm capitalize px-2 py-0.5 rounded-full mt-1 ${
                      opt.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 
                      opt.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'}`
                    }>{opt.difficulty}</span>
                  </Button>
                ))}
              </div>
            </Card>
             {battleHistory.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Battle Results</h2>
                {battleHistory.slice(0, 3).map((result: any) => (
                  <Card key={result.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{result.battleTitle}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(result.completedAt).toLocaleDateString()} - {result.topic} ({result.difficulty})
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          result.result === 'user' ? 'text-green-600' :
                          result.result === 'opponent' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {result.result === 'user' ? 'VICTORY' : result.result === 'opponent' ? 'DEFEAT' : 'DRAW'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Score: {result.userScore} vs {result.opponentScore}
                          {result.reward > 0 && <span className="ml-2 text-yellow-600">+{result.reward}pts</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {battleState === 'matching' && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-12 space-y-6"
          >
            <h2 className="text-2xl font-semibold text-gray-800">
              {isPreparingBattle ? "Preparing Battle..." : `Finding Opponent for ${battleTopic}...`}
            </h2>
            <div className="relative w-48 h-48 mx-auto">
              <motion.div 
                className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {isPreparingBattle ? <Loader2 size={64} className="absolute inset-0 m-auto text-blue-500 animate-spin" /> : <UserCheck size={64} className="absolute inset-0 m-auto text-blue-500" />}
            </div>
            {opponent && !isPreparingBattle && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-6">
                    <p className="text-lg text-gray-700">Opponent Found!</p>
                    <img src={opponent.avatar} alt={opponent.name} className="w-20 h-20 rounded-full mx-auto my-3 border-4 border-green-500"/>
                    <p className="font-semibold text-xl text-gray-900">{opponent.name}</p>
                    <p className="text-sm text-gray-600">Level {opponent.level}</p>
                </motion.div>
            )}
            <p className="text-gray-600">Get ready for battle!</p>
          </motion.div>
        )}

        {battleState === 'battling' && battleQuiz && currentQuestionData && user && opponent && (
          <motion.div
            key="battling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="flex justify-between items-center">
              <div className="text-center">
                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full mx-auto border-2 border-blue-500"/>
                <p className="font-semibold mt-1">{user.name} (You)</p>
                <p className="text-xl font-bold text-blue-600">{userScore} pts</p>
              </div>
              <div className="text-3xl font-bold text-gray-700">VS</div>
              <div className="text-center">
                <img src={opponent.avatar} alt={opponent.name} className="w-16 h-16 rounded-full mx-auto border-2 border-red-500"/>
                <p className="font-semibold mt-1">{opponent.name}</p>
                <p className="text-xl font-bold text-red-600">{opponentScore} pts</p>
              </div>
            </div>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2 text-center">
                Question {currentQuestionIndex + 1} of {battleQuiz.questions.length} ({currentQuestionData.points} pts)
              </div>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-6 min-h-[60px]">{currentQuestionData.question}</h3>
              
              {currentQuestionData.type === 'mcq' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentQuestionData.options?.map((option, index) => (
                    <Button
                      key={index}
                      variant={userAnswer === index ? "primary" : "outline"}
                      size="md"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => {
                        if (!isOpponentAnswering && !answerSubmittedThisTurn) {
                          setUserAnswer(index);
                          handleAnswer(index);
                        }
                      }}
                      disabled={isOpponentAnswering || answerSubmittedThisTurn}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    placeholder="Type your answer..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={typeof userAnswer === 'string' ? userAnswer : ''}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    disabled={isOpponentAnswering || answerSubmittedThisTurn}
                  />
                  <Button 
                    size="md" 
                    onClick={() => {
                        if (typeof userAnswer === 'string' && userAnswer.trim() !== '') {
                            handleAnswer(userAnswer);
                        }
                    }}
                    disabled={isOpponentAnswering || answerSubmittedThisTurn || typeof userAnswer !== 'string' || userAnswer.trim() === ''}
                  >
                    Submit Answer
                  </Button>
                </div>
              )}
              {isOpponentAnswering && !answerSubmittedThisTurn && <p className="text-center mt-4 text-gray-600 animate-pulse">Opponent is thinking...</p>}
              {answerSubmittedThisTurn && !isOpponentAnswering && <p className="text-center mt-4 text-green-600">Your answer submitted! Waiting for opponent...</p>}
            </Card>
          </motion.div>
        )}

        {battleState === 'results' && user && opponent && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="text-center py-10 space-y-6"
          >
            <Trophy size={64} className={`mx-auto mb-4 ${battleWinner === 'user' ? 'text-yellow-500' : battleWinner === 'opponent' ? 'text-red-500' : 'text-gray-500'}`} />
            <h2 className="text-3xl font-bold text-gray-900">
              {battleWinner === 'user' ? 'You Won!' : battleWinner === 'opponent' ? `${opponent.name} Won!` : "It's a Draw!"}
            </h2>
            <p className="text-xl text-gray-700">Final Score:</p>
            <div className="flex justify-center items-center space-x-6 text-2xl font-semibold">
              <div className={battleWinner === 'user' ? 'text-green-600' : 'text-gray-800'}>
                {user.name}: {userScore} pts
              </div>
              <div className={battleWinner === 'opponent' ? 'text-green-600' : 'text-gray-800'}>
                {opponent.name}: {opponentScore} pts
              </div>
            </div>
            {battleWinner === 'user' && <p className="text-lg text-yellow-600">You earned {battleDifficulty === 'easy' ? 50 : battleDifficulty === 'medium' ? 100 : 150} points!</p>}
            <Button onClick={() => setBattleState('idle')} size="lg" className="mt-6">
              Play Again <ChevronRight size={20} className="ml-1"/>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
