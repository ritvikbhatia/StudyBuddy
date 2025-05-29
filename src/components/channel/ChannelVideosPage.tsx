import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Youtube, PlayCircle, Calendar, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { VideoItem, ChannelVideosApiResponse } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ChannelVideosPageProps {
  channelId: string;
  channelName: string;
  onBack: () => void;
  onVideoSelect: (videoData: {
    youtubeUrl: string;
    title: string;
    description: string;
    thumbnailUrl: string;
  }) => void;
}

export const ChannelVideosPage: React.FC<ChannelVideosPageProps> = ({
  channelId,
  channelName,
  onBack,
  onVideoSelect,
}) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);

  const fetchVideos = async (token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://qbg-backend-stage.penpencil.co/qbg/youtube-videos/${channelId}/channel-videos?limit=12${token ? `&nextPageToken=${token}` : ''}`;
      const response = await axios.get<ChannelVideosApiResponse>(url);
      if (response.data && response.data.status_code === 200 && response.data.data) {
        setVideos(prevVideos => token ? [...prevVideos, ...response.data.data.items] : response.data.data.items);
        setNextPageToken(response.data.data.nextPageToken);
      } else {
        throw new Error('Failed to fetch videos');
      }
    } catch (err) {
      console.error('Error fetching channel videos:', err);
      setError('Could not load videos for this channel. Please try again later.');
      toast.error('Failed to load videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [channelId]);

  const handleVideoClick = (video: VideoItem) => {
    onVideoSelect({
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.medium.url,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Youtube size={28} className="mr-2 text-red-600" />
              {channelName}
            </h1>
            <p className="text-sm text-gray-500">Videos from this channel</p>
          </div>
        </div>
      </div>

      {loading && videos.length === 0 && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={48} className="animate-spin text-blue-600" />
          <p className="ml-3 text-lg text-gray-600">Loading videos...</p>
        </div>
      )}

      {error && (
        <Card className="p-8 text-center bg-red-50 border-red-200">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h3>
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={() => fetchVideos()} className="mt-6">
            Try Again
          </Button>
        </Card>
      )}

      {!loading && !error && videos.length === 0 && (
        <Card className="p-8 text-center">
          <Youtube size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Videos Found</h3>
          <p className="text-gray-500">This channel might not have any videos yet, or there was an issue fetching them.</p>
        </Card>
      )}

      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <motion.div
              key={video.id.videoId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: videos.indexOf(video) * 0.05 }}
            >
              <Card
                hover
                onClick={() => handleVideoClick(video)}
                className="p-0 overflow-hidden flex flex-col h-full group"
              >
                <div className="relative">
                  <img
                    src={video.snippet.thumbnails.medium.url}
                    alt={video.snippet.title}
                    className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PlayCircle size={48} className="text-white" />
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug h-10 overflow-hidden group-hover:text-blue-600 transition-colors" title={video.snippet.title}>
                    {video.snippet.title.length > 60 ? video.snippet.title.substring(0, 60) + '...' : video.snippet.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2 flex items-center">
                    <Calendar size={12} className="mr-1 flex-shrink-0" /> Published {formatDistanceToNow(new Date(video.snippet.publishedAt), { addSuffix: true })}
                  </p>
                  {/* Description can be added if needed, but might make cards too long
                  <p className="text-xs text-gray-600 mb-3 h-12 overflow-hidden">
                    {video.snippet.description.length > 80 ? video.snippet.description.substring(0, 80) + '...' : video.snippet.description}
                  </p> 
                  */}
                  <div className="mt-auto pt-2 border-t border-gray-100">
                    <Button size="sm" variant="ghost" className="w-full text-blue-600 hover:bg-blue-50 text-xs">
                      Watch & Study
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {nextPageToken && !loading && (
        <div className="text-center mt-8">
          <Button onClick={() => fetchVideos(nextPageToken)} loading={loading} size="lg">
            Load More Videos
          </Button>
        </div>
      )}
    </motion.div>
  );
};
