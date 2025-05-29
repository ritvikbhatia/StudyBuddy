import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Trophy, Users, Clock, Target, Zap, Award, Calendar, ArrowRight, Youtube as YoutubeIcon, PlayCircle, RadioTower } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { NavParamsType } from '../layout/Navbar'; // Import NavParamsType
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardProps {
  onTabChange: (tab: string, navParams?: NavParamsType) => void; // Use NavParamsType
}

interface ChannelThumbnail {
  url: string;
  width: number;
  height: number;
}

interface ChannelThumbnails {
  default: ChannelThumbnail;
  medium: ChannelThumbnail;
  high: ChannelThumbnail;
}

interface ChannelData {
  id: number; // Assuming API returns number, but channel_id is string for YouTube
  channel_id: string; // This is the actual YouTube channel ID
  channel_description: string;
  custom_url: string;
  channel_thumbnails: ChannelThumbnails;
  channel_name: string;
}


export const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [weeklyStudyTime, setWeeklyStudyTime] = useState(0);
  
  const [recommendedChannels, setRecommendedChannels] = useState<ChannelData[]>([]);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
    fetchRecommendedChannels();
  }, [user]); 

  const loadDashboardData = () => {
    const activities = storageService.getRecentActivities(5);
    const topics = storageService.getTrendingTopics(5);
    const todayTime = storageService.getTodayStudyTime();
    const weeklyTime = storageService.getWeeklyStudyTime();

    setRecentActivity(activities);
    setTrendingTopics(topics);
    setTodayStudyTime(todayTime);
    setWeeklyStudyTime(weeklyTime);
  };

  const fetchRecommendedChannels = async () => {
    setLoadingChannels(true);
    try {
      const response = await axios.get('https://qbg-backend-stage.penpencil.co/qbg/youtube-videos/channels?page=1&limit=4');
      if (response.data && response.data.status_code === 200 && response.data.data) {
        setRecommendedChannels(response.data.data);
      } else {
        toast.error('Failed to fetch recommended channels.');
        console.error('API error fetching channels:', response.data);
      }
    } catch (error) {
      toast.error('Error fetching recommended channels.');
      console.error('Network error fetching channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleChannelClick = (channel: ChannelData) => {
    onTabChange('dashboard', { // Keep current tab or choose a neutral one, App.tsx will handle view
      channelId: channel.channel_id, // Use channel_id from API
      channelName: channel.channel_name,
    });
  };

  const stats = [
    {
      labelKey: 'dashboard.studyStreak',
      value: user?.streak || 0,
      unitKey: 'dashboard.daysUnit',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      labelKey: 'dashboard.totalPoints',
      value: user?.points || 0,
      unitKey: 'dashboard.ptsUnit',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      labelKey: 'dashboard.level',
      value: user?.level || 1,
      unitKey: '', 
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      labelKey: 'dashboard.todayStudy',
      value: todayStudyTime,
      unitKey: 'dashboard.minUnit',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const formatActivityTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Trophy className="text-yellow-500" size={16} />;
      case 'study': return <BookOpen className="text-blue-500" size={16} />;
      case 'battle': return <Users className="text-purple-500" size={16} />;
      default: return <Target className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          {t('dashboard.welcomeMessage', { name: user?.name || 'Student' })}
        </h1>
        <p className="text-blue-100 mb-4">
          {t('dashboard.welcomeSubtitle')}
        </p>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>{t('dashboard.joinedDate', { date: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Recently' })}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={16} />
            <span>{t('dashboard.studyTimeThisWeek', { time: weeklyStudyTime })}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Card className="p-6 text-center h-full">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}{stat.unitKey ? t(stat.unitKey) : ''}
                </div>
                <div className="text-gray-600 text-sm">{t(stat.labelKey)}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recommended Channels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <RadioTower className="mr-2 text-red-600" size={24} />
            Recommended Channels
          </h3>
          {loadingChannels ? (
            <div className="text-center py-8 text-gray-500">Loading channels...</div>
          ) : recommendedChannels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedChannels.map((channel) => (
                <Card 
                  key={channel.id} 
                  hover 
                  onClick={() => handleChannelClick(channel)}
                  className="p-3 cursor-pointer flex flex-col items-center text-center"
                >
                  <img 
                    src={channel.channel_thumbnails.medium.url} 
                    alt={channel.channel_name} 
                    className="w-24 h-24 object-cover rounded-full mb-3 border-2 border-gray-200 shadow-sm"
                  />
                  <h5 className="font-semibold text-sm text-gray-900 truncate w-full mb-1" title={channel.channel_name}>
                    {channel.channel_name}
                  </h5>
                  <p className="text-xs text-blue-600 truncate w-full">{channel.custom_url}</p>
                  <Button size="sm" variant="ghost" className="w-full mt-2 text-blue-600 hover:bg-blue-50 text-xs">
                    <YoutubeIcon size={14} className="mr-1.5" /> View Channel
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No channels to recommend at the moment.</div>
          )}
        </Card>
      </motion.div>


      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" size={24} />
              Recent Activity
            </h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      {getActivityIcon(activity.type)}
                      <div>
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        <div className="text-sm text-gray-600">{formatActivityTime(activity.time)}</div>
                        {activity.score && (
                          <div className="text-sm text-green-600 font-medium">Score: {activity.score}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 font-bold">+{activity.points}</span>
                      <Trophy className="text-yellow-500" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="mx-auto mb-2" size={48} />
                <p>No activities yet. Start studying to see your progress!</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <BookOpen className="mr-2 text-green-600" size={24} />
              Your Study Topics
            </h3>
            {trendingTopics.length > 0 ? (
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <motion.div
                    key={topic}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onTabChange('my-topics')}
                  >
                    <span className="font-medium text-gray-900">{topic}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">#{index + 1}</span>
                      <TrendingUp className="text-green-500" size={16} />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="mx-auto mb-2" size={48} />
                <p>Start studying to see your favorite topics!</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-full">
            <Card hover onClick={() => onTabChange('study')} className="p-6 text-center cursor-pointer h-full flex flex-col justify-between">
              <div>
                <BookOpen className="mx-auto mb-4 text-blue-600" size={48} />
                <h4 className="font-bold text-gray-900 mb-2">Start Studying</h4>
                <p className="text-gray-600 text-sm mb-4">Upload content and generate study materials</p>
              </div>
              <Button size="sm" className="w-full mt-auto">
                Get Started
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>
          </div>
          <div className="h-full">
            <Card hover onClick={() => onTabChange('study', { studyParams: { inputType: 'text', content: '', topic: 'General Knowledge Quiz' }})} className="p-6 text-center cursor-pointer h-full flex flex-col justify-between">
              <div>
                <Trophy className="mx-auto mb-4 text-yellow-600" size={48} />
                <h4 className="font-bold text-gray-900 mb-2">Take Quiz</h4>
                <p className="text-gray-600 text-sm mb-4">Test your knowledge with AI-generated quizzes</p>
              </div>
              <Button size="sm" className="w-full mt-auto">
                Start Quiz
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>
          </div>
          <div className="h-full">
            <Card hover onClick={() => onTabChange('battle')} className="p-6 text-center cursor-pointer h-full flex flex-col justify-between">
              <div>
                <Users className="mx-auto mb-4 text-purple-600" size={48} />
                <h4 className="font-bold text-gray-900 mb-2">Join Battle</h4>
                <p className="text-gray-600 text-sm mb-4">Challenge friends in knowledge battles</p>
              </div>
              <Button size="sm" className="w-full mt-auto">
                Find Battle
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>
          </div>
        </div>
      </motion.div>

      {user && user.points > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Great Progress! 🎉</h3>
                <p className="text-gray-600">
                  You're only {1000 - (user.points % 1000)} points away from level {user.level + 1}!
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{user.points % 1000}/1000</div>
                <div className="text-sm text-gray-600">Points to next level</div>
              </div>
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(user.points % 1000) / 10}%` }}
              ></div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
