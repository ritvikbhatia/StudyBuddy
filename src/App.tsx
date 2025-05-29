import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavParamsType } from './components/layout/Navbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudyPage } from './components/study/StudyPage';
import { StudyMaterialResponse } from './components/study/StudyMaterialResponse';
import { MyTopicsPage } from './components/topics/MyTopicsPage';
import { BattlePage } from './components/battle/BattlePage';
import { CommunityPage } from './components/community/CommunityPage';
import { LiveClassesPage } from './components/live/LiveClassesPage';
import { ChannelVideosPage } from './components/channel/ChannelVideosPage';
import { LandingPage } from './components/landing/LandingPage'; // Import LandingPage
import { AuthModal } from './components/auth/AuthModal'; // Import AuthModal
import { StudyMaterial, Quiz, InputContent } from './types'; 
import { useTranslation } from './hooks/useTranslation';

interface TopicDetailsData {
  topic: string;
  materials: StudyMaterial[];
  quiz: Quiz | null; 
  content: string; 
  outputLanguage: string; 
  originalInput: InputContent;
}

export type InitialStudyDataType = {
  inputType: InputContent['type'];
  inputSubType?: 'pw-recommendations' | 'external-link' | 'manual' | 'ai-generate' | 'image' | 'pdf' | 'word' | 'other-doc' | 'record' | 'upload-audio' | null;
  content: string;
  outputLanguage?: string;
  topic?: string;
  thumbnailUrl?: string; 
} | null;

const InnerApp = () => {
  const { user, isAuthenticated, preferredLanguage } = useAuth(); // Added isAuthenticated
  const { loadingTranslations } = useTranslation(); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStudyResponse, setCurrentStudyResponse] = useState<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    content: string; 
    outputLanguage: string;
    originalInput: InputContent; 
  } | null>(null);
  const [currentTopicDetails, setCurrentTopicDetails] = useState<TopicDetailsData | null>(null);
  const [initialStudyData, setInitialStudyData] = useState<InitialStudyDataType>(null);
  const [selectedChannelInfo, setSelectedChannelInfo] = useState<{ id: string; name: string; } | null>(null);
  const [currentBattleParams, setCurrentBattleParams] = useState<{ topic: string; context: string; } | null>(null); 
  const [showAuthModal, setShowAuthModal] = useState(false); // State for AuthModal

  useEffect(() => {
    if (!loadingTranslations && preferredLanguage) {
      console.log("App language set to:", preferredLanguage, "Translations loaded:", !loadingTranslations);
    }
  }, [preferredLanguage, loadingTranslations]);

  const handleTabChange = (tab: string, navParams?: NavParamsType) => {
    setCurrentStudyResponse(null);
    setCurrentTopicDetails(null);
    setInitialStudyData(null); 
    setSelectedChannelInfo(null);
    setCurrentBattleParams(null); 

    if (navParams?.channelId && navParams?.channelName) {
      setSelectedChannelInfo({ id: navParams.channelId, name: navParams.channelName });
    } else if (navParams?.studyParams) {
      setInitialStudyData(navParams.studyParams);
      setActiveTab(tab);
    } else if (navParams?.battleParams) { 
      setCurrentBattleParams(navParams.battleParams);
      setActiveTab(tab); 
    } else {
      setActiveTab(tab);
    }
  };

  const handleInitialDataConsumed = () => {
    setInitialStudyData(null);
  };
  
  const handleVideoSelectFromChannelPage = (videoData: { youtubeUrl: string; title: string; description: string; thumbnailUrl: string; }) => {
    setInitialStudyData({
      inputType: 'youtube',
      inputSubType: 'external-link', 
      content: videoData.youtubeUrl,
      topic: videoData.title,
      outputLanguage: preferredLanguage || 'english',
      thumbnailUrl: videoData.thumbnailUrl,
    });
    setSelectedChannelInfo(null); 
    setActiveTab('study'); 
  };

  if (loadingTranslations) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-lg text-gray-700">Loading application...</p>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) { // Show LandingPage if not authenticated
    return (
      <>
        <LandingPage onOpenAuthModal={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <Toaster position="top-right" />
      </>
    );
  }
  
  // Authenticated user view
  if (selectedChannelInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} onOpenAuthModal={() => setShowAuthModal(true)} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ChannelVideosPage
            channelId={selectedChannelInfo.id}
            channelName={selectedChannelInfo.name}
            onBack={() => {
              setSelectedChannelInfo(null);
              // Optionally set activeTab back to 'dashboard' or previous tab
              // setActiveTab('dashboard'); 
            }}
            onVideoSelect={handleVideoSelectFromChannelPage}
          />
        </main>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <Toaster position="top-right" />
      </div>
    );
  }


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={handleTabChange} />;
      case 'study':
        return currentStudyResponse ? (
          <StudyMaterialResponse 
            data={currentStudyResponse} 
            onBack={() => {
              setCurrentStudyResponse(null);
            }}
            onNewStudy={() => {
              setCurrentStudyResponse(null);
              handleTabChange('study');
            }}
            onTabChange={handleTabChange} 
          />
        ) : (
          <StudyPage 
            onStudyGenerated={(data) => {
              setCurrentStudyResponse(data);
            }} 
            initialData={initialStudyData}
            onInitialDataConsumed={handleInitialDataConsumed}
          />
        );
      case 'my-topics':
        return currentTopicDetails ? (
          <StudyMaterialResponse
            data={currentTopicDetails}
            onBack={() => {
              setCurrentTopicDetails(null);
            }}
            onNewStudy={() => { 
              setCurrentStudyResponse(null); 
              setCurrentTopicDetails(null); 
              handleTabChange('study', { 
                studyParams: {
                  inputType: currentTopicDetails.originalInput?.type || 'text', 
                  content: currentTopicDetails.originalInput?.content || '', 
                  topic: currentTopicDetails.topic,
                  outputLanguage: currentTopicDetails.outputLanguage,
                }
              });
            }}
            isTopicView={true}
            onTabChange={handleTabChange} 
          />
        ) : (
          <MyTopicsPage onTopicSelect={(topicData) => {
            setCurrentTopicDetails(topicData);
          }} />
        );
      case 'battle':
        return <BattlePage battleParams={currentBattleParams} />; 
      case 'community':
        return <CommunityPage />;
      case 'live-classes':
        return <LiveClassesPage />;
      default:
        return <Dashboard onTabChange={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} onOpenAuthModal={() => setShowAuthModal(true)} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}

export default App;
