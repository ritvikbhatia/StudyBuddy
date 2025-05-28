import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Star, Play, Filter, Search, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { aiService } from '../../services/aiService';
import toast from 'react-hot-toast';

export const QuizPage: React.FC = () => {
  const { user } = useAuth();
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadQuizData();
  }, []);

  const loadQuizData = () => {
    const quizzes = storageService.getAvailableQuizzes();
    const history = storageService.getQuizHistory();
    setAvailableQuizzes(quizzes);
    setQuizHistory(history);
  };

  const handleGenerateQuiz = async (topic: string, difficulty: 'easy' | 'medium' | 'hard') => {
    if (!user) {
      toast.error('Please log in to generate quizzes');
      return;
    }

    setIsGenerating(true);
    try {
      const quiz = await aiService.generateQuiz(topic, difficulty);
      storageService.saveQuiz(quiz);
      
      storageService.addActivity({
        type: 'quiz',
        title: `Generated new quiz: ${quiz.title}`,
        points: 25,
        metadata: { topic, difficulty },
      });

      storageService.updateUserStats(25, 'quiz');
      loadQuizData();
      toast.success('New quiz generated successfully!');
    } catch (error) {
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartQuiz = (quiz: any) => {
    // This would typically navigate to quiz taking interface
    // For now, we can assume it's handled by StudyMaterialResponse or a dedicated quiz runner
    toast.success(`Starting quiz: ${quiz.title}`);
    // Example: onNavigateToQuiz(quiz.id); 
  };

  const filteredQuizzes = availableQuizzes.filter(quiz => {
    const matchesDifficulty = selectedDifficulty === 'all' || quiz.difficulty === selectedDifficulty;
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.topic.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const getScoreColor = (score: number, total: number) => {
    if (total === 0) return 'text-gray-600'; // Avoid division by zero
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const userStats = {
    totalQuizzes: quizHistory.length,
    averageScore: quizHistory.length > 0 
      ? Math.round(quizHistory.reduce((sum, result) => {
          const total = result.totalPoints || 1; // Avoid division by zero
          return sum + (result.score / total) * 100;
        }, 0) / quizHistory.length)
      : 0,
    bestScore: quizHistory.length > 0 
      ? Math.max(...quizHistory.map(result => {
          const total = result.totalPoints || 1; // Avoid division by zero
          return (result.score / total) * 100;
        }))
      : 0,
    streak: user?.streak || 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Interactive Quizzes</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Test your knowledge with AI-generated quizzes tailored to your study materials and interests.
        </p>
      </motion.div>

      {/* User Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Trophy className="mx-auto mb-2 text-yellow-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{userStats.totalQuizzes}</div>
          <div className="text-sm text-gray-600">Quizzes Taken</div>
        </Card>
        <Card className="p-4 text-center">
          <Star className="mx-auto mb-2 text-blue-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{userStats.averageScore}%</div>
          <div className="text-sm text-gray-600">Average Score</div>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{Math.round(userStats.bestScore)}%</div>
          <div className="text-sm text-gray-600">Best Score</div>
        </Card>
        <Card className="p-4 text-center">
          <Calendar className="mx-auto mb-2 text-purple-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{userStats.streak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </Card>
      </div>

      {/* Quick Generate */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Generate New Quiz</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {['Mathematics', 'Science', 'History'].map((topic) => (
            <div key={topic} className="space-y-3">
              <h4 className="font-semibold text-gray-900">{topic}</h4>
              <div className="flex space-x-2">
                {['easy', 'medium', 'hard'].map((difficulty) => (
                  <Button
                    key={`${topic}-${difficulty}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateQuiz(topic, difficulty as any)}
                    loading={isGenerating}
                    className="flex-1"
                  >
                    {difficulty}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 flex-1">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quizzes..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Available Quizzes */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
        
        {filteredQuizzes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card hover className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{quiz.title}</h3>
                      <p className="text-sm text-gray-600">Topic: {quiz.topic}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {quiz.difficulty}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Questions:</span>
                      <span>{quiz.questions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Time Limit:</span>
                      <span>{Math.floor(quiz.timeLimit / 60)} mins</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Total Points:</span>
                      <span>{quiz.questions.reduce((sum: number, q: any) => sum + q.points, 0)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartQuiz(quiz)}
                    className="w-full"
                    size="md"
                  >
                    <Play className="mr-2" size={16} />
                    Start Quiz
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Trophy className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Found</h3>
            <p className="text-gray-600 mb-4">Generate your first quiz or adjust your filters.</p>
            <Button onClick={() => handleGenerateQuiz('General Knowledge', 'medium')}>
              Generate Sample Quiz
            </Button>
          </Card>
        )}
      </div>

      {/* Quiz History */}
      {quizHistory.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Quiz Results</h2>
          
          <div className="space-y-3">
            {quizHistory.slice(0, 5).map((result) => (
              <Card 
                key={`${result.quizId}-${new Date(result.completedAt).toISOString()}`} 
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{result.quizTitle || `Quiz on ${result.topic || 'Unknown Topic'}`}</h4>
                    <p className="text-sm text-gray-600">
                      Completed on {new Date(result.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getScoreColor(result.score, result.totalPoints)}`}>
                      {result.score}/{result.totalPoints}
                    </div>
                    <div className="text-sm text-gray-600">
                      {result.totalPoints > 0 ? Math.round((result.score / result.totalPoints) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
