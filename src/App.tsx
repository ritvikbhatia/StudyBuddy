import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './components/dashboard/Dashboard';
import { StudyPage } from './components/study/StudyPage';
import { StudyMaterialResponse } from './components/study/StudyMaterialResponse';
import { MyTopicsPage } from './components/topics/MyTopicsPage';
import { BattlePage } from './components/battle/BattlePage';
import { CommunityPage } from './components/community/CommunityPage';
import { LiveClassesPage } from './components/live/LiveClassesPage';
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
} | null;

const InnerApp = () => {
  const { preferredLanguage } = useAuth();
  const { loadingTranslations } = useTranslation(); // Use hook for loading state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStudyResponse, setCurrentStudyResponse] = useState<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz;
    content: string;
    outputLanguage: string;
    originalInput: InputContent;
  } | null>(null);
  const [currentTopicDetails, setCurrentTopicDetails] = useState<TopicDetailsData | null>(null);
  const [initialStudyData, setInitialStudyData] = useState<InitialStudyDataType>(null);

  useEffect(() => {
    if (!loadingTranslations && preferredLanguage) {
      console.log("App language set to:", preferredLanguage, "Translations loaded:", !loadingTranslations);
      // You can set document lang attribute here if needed:
      // document.documentElement.lang = preferredLanguage;
    }
  }, [preferredLanguage, loadingTranslations]);

  const handleTabChange = (tab: string, studyParams?: InitialStudyDataType) => {
    setCurrentStudyResponse(null);
    setCurrentTopicDetails(null);
    if (studyParams) {
      setInitialStudyData(studyParams);
    } else {
      setInitialStudyData(null); 
    }
    setActiveTab(tab);
  };

  const handleInitialDataConsumed = () => {
    setInitialStudyData(null);
  };

  // If translations for InnerApp (and thus globally) are loading, show a simple non-translated message
  if (loadingTranslations) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-lg text-gray-700">Loading application...</p>
      </div>
    );
  }

  const renderActiveTab = () => {
    // No need for individual loading checks here if the global one above is sufficient
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
                inputType: currentTopicDetails.originalInput?.type || 'text', 
                content: currentTopicDetails.originalInput?.content || '', 
                topic: currentTopicDetails.topic,
                outputLanguage: currentTopicDetails.outputLanguage,
              });
            }}
            isTopicView={true}
          />
        ) : (
          <MyTopicsPage onTopicSelect={(topicData) => {
            setCurrentTopicDetails(topicData);
          }} />
        );
      case 'battle':
        return <BattlePage />;
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
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
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
