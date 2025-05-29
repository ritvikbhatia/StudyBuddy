import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PlayCircle, Calendar, Users, Loader2, AlertTriangle, Radio } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LatestLiveVideoApiResponse, LatestLiveVideoData } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface UpcomingLiveClassesPageProps {
  onJoinLiveClass: (videoId: string, streamId: string) => void;
}

const mockUpcomingClasses = [
  { id: 'uc1', titleKey: 'upcomingLive.mockClass1Title', instructor: 'Dr. Quantum', timeKey: 'upcomingLive.mockClass1Time', thumbnail: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/6D28D9/FFFFFF?text=Quantum+Physics' },
  { id: 'uc2', titleKey: 'upcomingLive.mockClass2Title', instructor: 'Prof. Chem', timeKey: 'upcomingLive.mockClass2Time', thumbnail: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/059669/FFFFFF?text=Organic+Chemistry' },
  { id: 'uc3', titleKey: 'upcomingLive.mockClass3Title', instructor: 'Historian Jane', timeKey: 'upcomingLive.mockClass3Time', thumbnail: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/D97706/FFFFFF?text=Ancient+History' },
];

export const UpcomingLiveClassesPage: React.FC<UpcomingLiveClassesPageProps> = ({ onJoinLiveClass }) => {
  const { t } = useTranslation();
  const [latestLiveVideo, setLatestLiveVideo] = useState<LatestLiveVideoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestLiveVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<LatestLiveVideoApiResponse>('https://qbg-backend-stage.penpencil.co/qbg/internal/get-latest-live-video');
      if (response.data && response.data.status_code === 200 && response.data.data) {
        setLatestLiveVideo(response.data.data);
      } else {
        throw new Error(t('upcomingLive.fetchErrorGeneric'));
      }
    } catch (err) {
      console.error('Error fetching latest live video:', err);
      setError(t('upcomingLive.fetchErrorNetwork'));
      toast.error(t('toast.failedToFetchLatestLive'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestLiveVideo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoinClick = () => {
    if (latestLiveVideo) {
      onJoinLiveClass(latestLiveVideo.video_id, latestLiveVideo.stream_id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center">
            <Radio size={32} className="mr-3 text-red-600"/>
            {t('upcomingLive.pageTitle')}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{t('upcomingLive.pageSubtitle')}</p>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={48} className="animate-spin text-blue-600" />
          <p className="ml-3 text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      )}

      {error && !loading && (
        <Card className="p-8 text-center bg-red-50 border-red-200">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-red-700 mb-2">{t('upcomingLive.errorTitle')}</h3>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={fetchLatestLiveVideo} className="mt-6">
            {t('upcomingLive.tryAgainButton')}
          </Button>
        </Card>
      )}

      {latestLiveVideo && !loading && !error && (
        <Card className="overflow-hidden shadow-xl border border-blue-200">
          <div className="md:flex">
            <div className="md:flex-shrink-0 md:w-1/2">
              <img 
                className="h-64 w-full object-cover md:h-full" 
                src={`https://img.youtube.com/vi/${latestLiveVideo.video_id}/hqdefault.jpg`}
                alt={t('upcomingLive.latestClassThumbnailAlt')}
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center md:w-1/2">
              <div className="uppercase tracking-wide text-xs text-blue-600 font-semibold mb-1">{t('upcomingLive.latestClassLabel')}</div>
              <h2 className="block mt-1 text-2xl leading-tight font-bold text-gray-900 mb-3">{t('upcomingLive.latestClassTitlePlaceholder')}</h2>
              <p className="mt-2 text-gray-600 mb-6">{t('upcomingLive.latestClassDescriptionPlaceholder')}</p>
              <Button size="lg" onClick={handleJoinClick} className="w-full md:w-auto self-start">
                <PlayCircle size={20} className="mr-2" />
                {t('upcomingLive.joinButton')}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {!loading && !latestLiveVideo && !error && (
         <Card className="p-8 text-center">
          <Radio size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('upcomingLive.noLiveClassTitle')}</h3>
          <p className="text-gray-500">{t('upcomingLive.noLiveClassSubtitle')}</p>
        </Card>
      )}

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('upcomingLive.otherClassesTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockUpcomingClasses.map((cls) => (
            <Card key={cls.id} hover className="p-0 overflow-hidden group">
              <div className="relative">
                <img src={cls.thumbnail} alt={t(cls.titleKey)} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PlayCircle size={48} className="text-white" />
                  </div>
              </div>
              <div className="p-4">
                <h3 className="text-md font-semibold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors truncate" title={t(cls.titleKey)}>{t(cls.titleKey)}</h3>
                <p className="text-xs text-gray-500 mb-1 flex items-center">
                  <Users size={12} className="mr-1.5 flex-shrink-0 text-gray-400" /> {cls.instructor}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar size={12} className="mr-1.5 flex-shrink-0 text-gray-400" /> {t(cls.timeKey)}
                </p>
                <Button size="sm" variant="ghost" className="w-full mt-3 text-blue-600 hover:bg-blue-50 text-xs" onClick={() => toast.info(t('upcomingLive.notifyMeToast', { classTitle: t(cls.titleKey) }))}>
                  {t('upcomingLive.notifyMeButton')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
