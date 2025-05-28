import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, Brain } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { StudyMaterial, Quiz, InputContent } from '../../types'; // Added InputContent

interface MyTopicsPageProps {
  onTopicSelect: (topicData: { 
    topic: string; 
    materials: StudyMaterial[]; 
    quiz: Quiz | null;
    content: string; // This should be the original input content string
    outputLanguage: string;
    originalInput: InputContent; // Added originalInput
  }) => void;
}

export const MyTopicsPage: React.FC<MyTopicsPageProps> = ({ onTopicSelect }) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInputHistory, setTopicInputHistory] = useState<Record<string, InputContent>>({});


  useEffect(() => {
    if (user) {
      loadTopicsAndHistory();
    }
  }, [user]);

  const loadTopicsAndHistory = () => {
    const allMaterials = storageService.getStudyMaterials();
    const uniqueTopics = Array.from(new Set(allMaterials.map(material => material.topic)));
    setTopics(uniqueTopics.sort());

    const history = storageService.getInputHistory();
    const historyMap: Record<string, InputContent> = {};
    history.forEach(item => {
      if (item.topic && !historyMap[item.topic]) { // Store the first input found for a topic
        historyMap[item.topic] = {
          type: item.type,
          content: item.content,
          metadata: item.metadata,
        };
      }
    });
    setTopicInputHistory(historyMap);
  };

  const handleTopicClick = (topic: string) => {
    const materials = storageService.getStudyMaterialsByTopic(topic);
    const determinedLanguage = (materials.length > 0 && materials[0].language) 
                               ? materials[0].language 
                               : 'english';
    
    const originalInputForTopic = topicInputHistory[topic] || { 
      type: 'text', 
      content: `Materials for topic: ${topic}`, 
      metadata: { outputLanguage: determinedLanguage } 
    };


    onTopicSelect({
      topic: topic,
      materials: materials,
      quiz: null, 
      content: originalInputForTopic.content, // Use content from stored input
      outputLanguage: determinedLanguage,
      originalInput: originalInputForTopic, // Pass the full originalInput object
    });
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Brain size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Your Topics</h2>
        <p className="text-gray-500">Please log in to view your personalized study topics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">My Study Topics</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore all the subjects you've studied. Click on a topic to review your personalized materials.
        </p>
      </motion.div>

      {topics.length === 0 ? (
        <Card className="p-8 text-center">
          <Folder size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Topics Yet</h3>
          <p className="text-gray-600">Start studying by generating materials, and your topics will appear here!</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {topics.map((topic) => (
            <motion.div
              key={topic}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <Card
                hover
                onClick={() => handleTopicClick(topic)}
                className="p-6 text-center cursor-pointer transition-all duration-200 h-full hover:bg-gray-50 flex flex-col justify-between"
              >
                <div>
                  <Folder className="mx-auto mb-3 text-gray-500" size={32} />
                  <h3 className="font-semibold text-gray-800 truncate" title={topic}>{topic}</h3>
                </div>
                <span className="text-xs text-gray-500 mt-2">
                  {storageService.getStudyMaterialsByTopic(topic).length} materials
                </span>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
