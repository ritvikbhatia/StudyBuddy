import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BookOpen, Trophy, Users, Clock, Target, Zap, Award, Calendar, RadioTower, Youtube as YoutubeIcon } from 'lucide-react'; // Removed ArrowRight
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { NavParamsType } from '../layout/Navbar'; 
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DashboardProps {
  onTabChange: (tab: string, navParams?: NavParamsType) => void; 
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
  id: number; 
  channel_id: string; 
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 

  const loadDashboardData = () => {
    const activities = storageService.getRecentActivities(3); // Limit to 3
    const topics = storageService.getTrendingTopics(4); // Limit to 4
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
        toast.error(t('toast.failedToFetchChannels'));
        console.error('API error fetching channels:', response.data);
      }
    } catch (error) {
      toast.error(t('toast.errorFetchingChannels'));
      console.error('Network error fetching channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleChannelClick = (channel: ChannelData) => {
    onTabChange('dashboard', { 
      channelId: channel.channel_id, 
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
          {t('dashboard.welcomeMessage', { name: user?.name || t('dashboard.defaultStudentName') })}
        </h1>
        <p className="text-blue-100 mb-4">
          {t('dashboard.welcomeSubtitle')}
        </p>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>{t('dashboard.joinedDate', { date: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : t('dashboard.joinedRecently') })}</span>
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
              <Card className="p-6 text-center h-full flex flex-col justify-center">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value.toLocaleString()}{stat.unitKey? " "+ t(stat.unitKey) : ''}
                </div>
                <div className="text-gray-600 text-sm">{t(stat.labelKey)}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <RadioTower className="mr-2 text-red-600" size={24} />
            {t('dashboard.recommendedChannelsTitle')}
          </h3>
          {loadingChannels ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
          ) : recommendedChannels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedChannels.map((channel) => (
                <Card 
                  key={channel.id} 
                  hover 
                  onClick={() => handleChannelClick(channel)}
                  className="p-3 cursor-pointer flex flex-col items-center text-center h-full"
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
                  <Button size="sm" variant="ghost" className="w-full mt-auto text-blue-600 hover:bg-blue-50 text-xs">
                    <YoutubeIcon size={14} className="mr-1.5" /> {t('dashboard.viewChannelButton')}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">{t('dashboard.noChannelsToRecommend')}</div>
          )}
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8 lg:items-stretch"> 
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="h-full" 
        >
          <Card className="p-6 h-full flex flex-col"> 
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" size={24} />
              {t('dashboard.recentActivityTitle')}
            </h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-4 flex-grow"> 
                {recentActivity.slice(0,3).map((activity) => (
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
              <div className="text-center py-8 text-gray-500 flex-grow flex flex-col justify-center items-center">
                <BookOpen className="mx-auto mb-2" size={48} />
                <p>{t('dashboard.noActivitiesMessage')}</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="h-full" 
        >
          <Card className="p-6 h-full flex flex-col"> 
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <BookOpen className="mr-2 text-green-600" size={24} />
              {t('dashboard.yourStudyTopicsTitle')}
            </h3>
            {trendingTopics.length > 0 ? (
              <div className="space-y-3 flex-grow"> 
                {trendingTopics.slice(0,4).map((topic, index) => (
                  <motion.div
                    key={topic}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onTabChange('my-topics')}
                  >
                    <span className="font-medium text-gray-900 truncate" title={topic}>{topic}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">#{index + 1}</span>
                      <TrendingUp className="text-green-500" size={16} />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 flex-grow flex flex-col justify-center items-center">
                <Target className="mx-auto mb-2" size={48} />
                <p>{t('dashboard.noTopicsMessage')}</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {user && user.points > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('dashboard.progressTitle')} 🎉</h3>
                <p className="text-gray-600">
                  {t('dashboard.pointsToNextLevel', { points: (1000 - (user.points % 1000)), level: (user.level + 1) })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{user.points % 1000}/1000</div>
                <div className="text-sm text-gray-600">{t('dashboard.pointsToNextLevelLabel')}</div>
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
