import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, Mic, Video as VideoIcon, Youtube, Brain, Film, FileCheck, Wand2, Languages, ListFilter, Tags, ChevronRight, Search, CheckCircle, PlayCircle, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { contentService, PwVideo } from '../../services/contentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { InitialStudyDataType } from '../../App'; 
import { InputContent } from '../../types'; 
import { useTranslation } from '../../hooks/useTranslation';

interface StudyPageProps {
  onStudyGenerated: (data: any) => void;
  initialData?: InitialStudyDataType;
  onInitialDataConsumed?: () => void;
}

type InputType = 'text' | 'document' | 'audio' | 'video' | 'youtube' | 'videolecture';
type InputSubType = 'manual' | 'ai-generate' | 'image' | 'pdf' | 'word' | 'other-doc' | 'record' | 'upload-audio' | 'pw-recommendations' | 'external-link' | null;
type VideoLectureStep = 'batch' | 'subject' | 'tags' | 'videos';

interface VideoLecture { 
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  batch: string;
  subject: string;
  tags: string[];
}

const mockVideoLectures: VideoLecture[] = [
  { id: 'v1', title: 'Newton\'s First Law Explained', thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/3B82F6/FFFFFF?text=Physics+Lecture+1', videoUrl: 'mock://newton1', batch: 'Physics XI', subject: 'Physics', tags: ['Mechanics', 'Newton\'s Laws'] },
  { id: 'v2', title: 'Introduction to Calculus', thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/10B981/FFFFFF?text=Maths+Lecture+1', videoUrl: 'mock://calculus_intro', batch: 'Maths XII', subject: 'Mathematics', tags: ['Calculus', 'Basics'] },
];

const languageOptions = [
    { value: 'english', labelKey: 'languageOptions.en' },
    { value: 'hindi', labelKey: 'languageOptions.hi' },
    { value: 'tamil', labelKey: 'languageOptions.ta' },
    { value: 'telugu', labelKey: 'languageOptions.te' },
    { value: 'bengali', labelKey: 'languageOptions.bn' },
    { value: 'marathi', labelKey: 'languageOptions.mr' },
];

const inputTypesConfig = [
  { id: 'text' as InputType, icon: FileText, labelKey: 'studyPage.inputTypeLabels.text', descKey: 'studyPage.inputTypeDescs.text' },
  { id: 'document' as InputType, icon: FileCheck, labelKey: 'studyPage.inputTypeLabels.document', descKey: 'studyPage.inputTypeDescs.document' },
  { id: 'audio' as InputType, icon: Mic, labelKey: 'studyPage.inputTypeLabels.audio', descKey: 'studyPage.inputTypeDescs.audio' },
  { id: 'video' as InputType, icon: VideoIcon, labelKey: 'studyPage.inputTypeLabels.video', descKey: 'studyPage.inputTypeDescs.video' },
  { id: 'youtube' as InputType, icon: Youtube, labelKey: 'studyPage.inputTypeLabels.youtube', descKey: 'studyPage.inputTypeDescs.youtube' },
  { id: 'videolecture' as InputType, icon: Film, labelKey: 'studyPage.inputTypeLabels.videolecture', descKey: 'studyPage.inputTypeDescs.videolecture' }
];


export const StudyPage: React.FC<StudyPageProps> = ({ onStudyGenerated, initialData, onInitialDataConsumed }) => {
  const { t } = useTranslation();
  const { user, preferredLanguage } = useAuth(); 
  const [selectedInputType, setSelectedInputType] = useState<InputType | null>(null);
  const [selectedInputSubType, setSelectedInputSubType] = useState<InputSubType>(null);
  
  const [inputContentString, setInputContentString] = useState(''); 
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputLanguage, setOutputLanguage] = useState(preferredLanguage || 'english'); 

  const [videoLectureStep, setVideoLectureStep] = useState<VideoLectureStep>('batch');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredLocalVideos, setFilteredLocalVideos] = useState<VideoLecture[]>([]); 
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  const [pwVideoSearch, setPwVideoSearch] = useState('');
  const [filteredPwVideos, setFilteredPwVideos] = useState<PwVideo[]>([]);
  const [selectedPwVideo, setSelectedPwVideo] = useState<PwVideo | null>(null);

  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isGeneratingAIText, setIsGeneratingAIText] = useState(false);

  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoGenerateRef = useRef(true);

  const loadingSteps = [
    { messageKey: 'loadingSteps.analyzing', icon: <Brain size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.extracting', icon: <FileText size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.structuring', icon: <ListFilter size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.crafting', icon: <Tags size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.developingQuiz', icon: <Wand2 size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.preparingTutor', icon: <Languages size={24} className="animate-pulse" /> },
    { messageKey: 'loadingSteps.finalizing', icon: <CheckCircle size={24} /> }
  ];

  useEffect(() => {
    setOutputLanguage(preferredLanguage || 'english');
  }, [preferredLanguage]);

  useEffect(() => {
    const componentMountTime = new Date();
    return () => {
      const studyDurationMinutes = Math.floor((new Date().getTime() - componentMountTime.getTime()) / (1000 * 60));
      if (studyDurationMinutes > 0) {
        storageService.addStudyTime(studyDurationMinutes);
      }
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (isGenerating) {
      setCurrentLoadingStep(0);
      loadingIntervalRef.current = setInterval(() => {
        setCurrentLoadingStep(prevStep => {
          const nextStep = prevStep + 1;
          if (nextStep >= loadingSteps.length -1) { 
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
            return loadingSteps.length -1;
          }
          return nextStep;
        });
      }, 2000); 
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [isGenerating, loadingSteps.length]);

  useEffect(() => {
    if (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations') {
      setFilteredPwVideos(contentService.searchPwVideos(pwVideoSearch));
    }
  }, [pwVideoSearch, selectedInputType, selectedInputSubType]);

  useEffect(() => {
    if (initialData && autoGenerateRef.current) {
      setSelectedInputType(initialData.inputType as InputType);
      if (initialData.inputSubType) setSelectedInputSubType(initialData.inputSubType);
      setInputContentString(initialData.content);
      if (initialData.outputLanguage) setOutputLanguage(initialData.outputLanguage);
      if (initialData.topic) setCustomTopic(initialData.topic);

      if (initialData.inputType === 'youtube' && initialData.inputSubType === 'pw-recommendations') {
        const allPwVideos = contentService.getAllPwVideos();
        setFilteredPwVideos(allPwVideos);
        const video = allPwVideos.find(v => v.title === initialData.content || v.id === initialData.content || v.youtubeUrl === initialData.content);
        if (video) setSelectedPwVideo(video);
      }
      
      if (initialData.inputType === 'youtube' || initialData.inputType === 'text') { 
        autoGenerateRef.current = false; 
        handleGenerate(); 
      } else if (onInitialDataConsumed) {
        onInitialDataConsumed(); 
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); 

  const handleInputTypeSelect = (type: InputType) => {
    setSelectedInputType(type);
    setSelectedInputSubType(null);
    setInputContentString('');
    setSelectedFile(null);
    setAiTextPrompt('');
    setVideoLectureStep('batch');
    setSelectedBatch('');
    setSelectedSubject('');
    setSelectedTags([]);
    setFilteredLocalVideos([]);
    setVideoSearchTerm('');
    setPwVideoSearch('');
    setFilteredPwVideos(contentService.getAllPwVideos()); 
    setSelectedPwVideo(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`${t('toast.fileSelected', { fileName: file.name })}`);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateAIText = async () => {
    if (!aiTextPrompt.trim()) {
      toast.error(t('toast.enterAIPrompt'));
      return;
    }
    setIsGeneratingAIText(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const generatedText = `${t('studyPage.aiGeneratedContentLabel', { prompt: aiTextPrompt })}\n\n${Array.from({ length: 3 }).map(() => `${t('studyPage.aiGeneratedParagraph', { prompt: aiTextPrompt })} ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(Math.floor(Math.random() * 3) + 2)}`).join('\n\n')}`;
      setInputContentString(generatedText);
      toast.success(t('toast.aiTextGenerated'));
    } catch (error) {
      toast.error(t('toast.aiTextGenerationFailed'));
    } finally {
      setIsGeneratingAIText(false);
    }
  };

  const batches = Array.from(new Set(mockVideoLectures.map(v => v.batch)));
  const subjectsForBatch = selectedBatch ? Array.from(new Set(mockVideoLectures.filter(v => v.batch === selectedBatch).map(v => v.subject))) : [];
  const tagsForSubject = selectedSubject ? Array.from(new Set(mockVideoLectures.filter(v => v.subject === selectedSubject).flatMap(v => v.tags))) : [];

  useEffect(() => {
    if (selectedInputType === 'videolecture' && videoLectureStep === 'videos') {
      let videos = mockVideoLectures.filter(v => v.batch === selectedBatch && v.subject === selectedSubject);
      if (selectedTags.length > 0) {
        videos = videos.filter(v => selectedTags.every(tag => v.tags.includes(tag)));
      }
      if (videoSearchTerm) {
        videos = videos.filter(v => v.title.toLowerCase().includes(videoSearchTerm.toLowerCase()));
      }
      setFilteredLocalVideos(videos);
    }
  }, [selectedBatch, selectedSubject, selectedTags, videoSearchTerm, videoLectureStep, selectedInputType]);


  const handleGenerate = async () => {
    if (!user) {
      toast.error(t('toast.loginToGenerate'));
      return;
    }
    if (!selectedInputType) {
        // toast.error(t('toast.selectInputType'));
        return;
    }

    let finalContentTypeForAPI: 'text' | 'ytVideo' | 'audio' | 'doc' = 'text';
    let contentForService: string | File = inputContentString;
    let originalInputContentForHistory: string = inputContentString; // For localStorage
    let originalInputContentForResponse: string = inputContentString; // For immediate preview (can be blob URL)

    let metadata: InputContent['metadata'] = { 
        outputLanguage, 
        title: customTopic, 
        thumbnailUrl: initialData?.thumbnailUrl 
    };
    
    switch (selectedInputType) {
        case 'text':
            finalContentTypeForAPI = 'text';
            if (selectedInputSubType === 'ai-generate' && !inputContentString && aiTextPrompt) {
                toast.error(t('toast.generateAITextFirst')); return;
            }
            contentForService = inputContentString;
            originalInputContentForHistory = inputContentString;
            originalInputContentForResponse = inputContentString;
            if (selectedInputSubType === 'ai-generate') metadata.aiPrompt = aiTextPrompt;
            break;
        case 'youtube':
            finalContentTypeForAPI = 'ytVideo';
            if (selectedInputSubType === 'pw-recommendations') {
                if (!selectedPwVideo && !initialData?.content) { toast.error(t('toast.selectPWVideo')); return; }
                contentForService = selectedPwVideo?.youtubeUrl || initialData?.content || '';
                originalInputContentForHistory = selectedPwVideo?.youtubeUrl || initialData?.content || '';
                originalInputContentForResponse = selectedPwVideo?.youtubeUrl || initialData?.content || '';
                metadata.title = selectedPwVideo?.title || initialData?.topic;
                metadata.thumbnailUrl = selectedPwVideo?.thumbnailUrl || initialData?.thumbnailUrl;
            } else { 
                if (!inputContentString.trim()) { toast.error(t('toast.pasteYoutubeUrl')); return; }
                contentForService = inputContentString;
                originalInputContentForHistory = inputContentString;
                originalInputContentForResponse = inputContentString;
                metadata.title = customTopic || t('studyPage.youtubeVideoTitleDefault', { urlSnippet: inputContentString.substring(0,30) });
            }
            break;
        case 'audio':
            finalContentTypeForAPI = 'audio';
            if (!selectedFile) { toast.error(t('toast.uploadAudioFile')); return; }
            contentForService = selectedFile;
            originalInputContentForHistory = selectedFile.name;
            originalInputContentForResponse = URL.createObjectURL(selectedFile); // Create blob URL for preview
            metadata.fileName = selectedFile.name;
            metadata.fileSize = selectedFile.size;
            break;
        case 'document':
            finalContentTypeForAPI = 'doc';
            if (!selectedFile) { toast.error(t('toast.uploadDocumentFile')); return; }
            contentForService = selectedFile;
            originalInputContentForHistory = selectedFile.name;
            originalInputContentForResponse = URL.createObjectURL(selectedFile); // Create blob URL for preview
            metadata.fileName = selectedFile.name;
            metadata.fileSize = selectedFile.size;
            if (selectedInputSubType) metadata.documentType = selectedInputSubType as 'image' | 'pdf' | 'word' | 'other-doc';
            break;
        case 'videolecture': 
            if (!inputContentString) { toast.error(t('toast.selectVideoLecture')); return; }
            contentForService = inputContentString; 
            originalInputContentForHistory = inputContentString;
            originalInputContentForResponse = inputContentString; // Assuming this is a title/identifier, not a direct URL
            metadata.title = inputContentString;
            break;
        case 'video': 
            if (!selectedFile) { toast.error(t('toast.uploadVideoFile')); return; }
            contentForService = selectedFile; 
            originalInputContentForHistory = selectedFile.name; 
            originalInputContentForResponse = URL.createObjectURL(selectedFile); // Create blob URL for preview
            metadata.fileName = selectedFile.name;
            metadata.fileSize = selectedFile.size;
            finalContentTypeForAPI = 'doc'; 
            break;
        default:
            toast.error(t('toast.invalidInputType'));
            return;
    }

    if ((typeof contentForService === 'string' && !contentForService.trim()) && !(contentForService instanceof File)) {
      toast.error(t('toast.provideContent'));
      return;
    }
    
    setIsGenerating(true);
    setCurrentLoadingStep(0); 
    
    try {
      const topic = customTopic.trim() || aiService.extractTopic(originalInputContentForHistory, selectedInputType);
      metadata.title = metadata.title || topic; 

      let studyResponse;

      if (['text', 'ytVideo', 'audio', 'doc'].includes(finalContentTypeForAPI)) {
        studyResponse = await aiService.generateStudyMaterialsFromExternalAPI(
          finalContentTypeForAPI,
          contentForService,
          topic,
          outputLanguage
        );
      } else { 
        studyResponse = await aiService.generateCompleteStudyResponse(
          originalInputContentForHistory, 
          selectedInputType, 
          topic,
          outputLanguage, 
          metadata 
        );
      }
      
      const responseWithCorrectedInput = {
        ...studyResponse,
        originalInput: {
          type: selectedInputType,
          content: originalInputContentForResponse, // Use blob URL for response page
          metadata: {
            ...metadata, 
            outputLanguage: outputLanguage, 
            title: metadata.title || topic, 
            fileName: selectedFile?.name, 
            documentType: selectedInputType === 'document' ? selectedInputSubType as InputContent['metadata']['documentType'] : undefined
          }
        }
      };
      
      responseWithCorrectedInput.materials.forEach(material => {
        storageService.saveStudyMaterial({...material, userId: user.id, language: outputLanguage});
      });

      if (responseWithCorrectedInput.quiz) {
        storageService.saveQuiz({...responseWithCorrectedInput.quiz, language: outputLanguage});
      }
      
      const inputHistoryEntry: InputContent & { topic: string } = {
        type: selectedInputType,
        content: originalInputContentForHistory, // Save file name/URL to history
        metadata: {
          ...metadata, 
          outputLanguage: outputLanguage, 
          title: metadata.title || topic, 
          fileName: selectedFile?.name,
        },
        topic: topic,
      };
      storageService.saveInputHistory(inputHistoryEntry);

      storageService.updateTopicFrequency(topic);
      const langLabelKey = languageOptions.find(l=>l.value === outputLanguage)?.labelKey || outputLanguage;
      storageService.addActivity({
        type: 'study',
        title: t('activity.generatedMaterials', { topic, language: t(langLabelKey, outputLanguage) }),
        points: 50,
        metadata: { topic, materialsCount: responseWithCorrectedInput.materials.length, language: outputLanguage },
      });
      storageService.updateUserStats(50, 'study');

      toast.success(t('toast.materialsGeneratedSuccess'), { id: 'generating-final' });
      onStudyGenerated(responseWithCorrectedInput); 
      
      setInputContentString('');
      setCustomTopic('');
      setSelectedFile(null);
      setSelectedInputType(null);
      setSelectedInputSubType(null);
      setSelectedPwVideo(null);
      setPwVideoSearch('');
      if (onInitialDataConsumed) onInitialDataConsumed(); 
      autoGenerateRef.current = true; 
      
    } catch (error: any) {
      console.error('Error generating materials:', error);
      const errorMessage = error.response?.data?.message || error.message || t('toast.materialsGenerationFailed');
      toast.error(errorMessage, { id: 'generating-error', duration: 5000 });
      if (onInitialDataConsumed) onInitialDataConsumed(); 
      autoGenerateRef.current = true; 
    } finally {
      setIsGenerating(false);
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
  };

  const renderInputContentArea = () => {
    if (!selectedInputType) return null;

    switch (selectedInputType) {
      case 'text':
        return ( <>
            <div className="flex space-x-2 mb-4">
              <Button variant={selectedInputSubType === 'manual' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('manual')}><FileText size={16} className="mr-2"/>{t('studyPage.pasteManually')}</Button>
              <Button variant={selectedInputSubType === 'ai-generate' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('ai-generate')}>
                <Wand2 size={16} className="mr-2"/>{t('studyPage.generateWithAI')}
              </Button>
            </div>
            {selectedInputSubType === 'manual' && (
              <textarea
                value={inputContentString}
                onChange={(e) => setInputContentString(e.target.value)}
                placeholder={t('studyPage.pasteTextPlaceholder')}
                className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            )}
            {selectedInputSubType === 'ai-generate' && (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={aiTextPrompt}
                  onChange={(e) => setAiTextPrompt(e.target.value)}
                  placeholder={t('studyPage.aiPromptPlaceholder')}
                />
                <Button onClick={handleGenerateAIText} loading={isGeneratingAIText} size="sm">{t('studyPage.generateAITextButton')}</Button>
                <textarea
                  value={inputContentString}
                  readOnly
                  placeholder={t('studyPage.aiGeneratedTextPlaceholder')}
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg bg-gray-50 resize-none"
                />
              </div>
            )}
          </>
        );
      case 'document':
        return ( <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('studyPage.documentTypeLabel')}</label>
              <select 
                value={selectedInputSubType || ''} 
                onChange={(e) => setSelectedInputSubType(e.target.value as InputSubType)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>{t('studyPage.selectDocumentType')}</option>
                <option value="image">{t('studyPage.docTypeImage')}</option>
                <option value="pdf">{t('studyPage.docTypePdf')}</option>
                <option value="word">{t('studyPage.docTypeWord')}</option>
                <option value="other-doc">{t('studyPage.docTypeOther')}</option>
              </select>
            </div>
            {renderFileUploadArea('image/*,application/pdf,.doc,.docx,.txt')}
          </>
        );
      case 'audio':
        return ( <>
            <div className="flex space-x-2 mb-4">
              <Button variant={selectedInputSubType === 'record' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('record')}><Mic size={16} className="mr-2"/>{t('studyPage.recordAudio')}</Button>
              <Button variant={selectedInputSubType === 'upload-audio' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('upload-audio')}><Upload size={16} className="mr-2"/>{t('studyPage.uploadAudioFile')}</Button>
            </div>
            {selectedInputSubType === 'record' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-3">
                <Mic size={48} className="mx-auto text-gray-400" />
                <p className="text-gray-600">{t('studyPage.audioRecordingSimulated')}</p>
                <Button onClick={() => {setInputContentString(`${t('studyPage.recordedAudioLabel')} - ${new Date().toLocaleTimeString()}`); toast.success(t('toast.audioRecordingSimulated'));}} size="md">{t('studyPage.startRecording')}</Button>
              </div>
            )}
            {selectedInputSubType === 'upload-audio' && renderFileUploadArea('audio/*')}
          </>
        );
      case 'video':
        return renderFileUploadArea('video/*');
      case 'youtube':
        return (
          <>
            <div className="flex space-x-2 mb-4">
              <Button 
                variant={selectedInputSubType === 'pw-recommendations' ? 'primary' : 'outline'} 
                onClick={() => {
                  setSelectedInputSubType('pw-recommendations');
                  setFilteredPwVideos(contentService.getAllPwVideos()); 
                  setInputContentString(''); 
                  setSelectedPwVideo(null);
                }}
              >
                <Youtube size={16} className="mr-2"/> {t('studyPage.pwRecommendations')}
              </Button>
              <Button 
                variant={selectedInputSubType === 'external-link' ? 'primary' : 'outline'} 
                onClick={() => {
                  setSelectedInputSubType('external-link');
                  setInputContentString(''); 
                  setSelectedPwVideo(null);
                }}
              >
                <FileText size={16} className="mr-2"/> {t('studyPage.addExternalLink')}
              </Button>
            </div>

            {selectedInputSubType === 'pw-recommendations' && (
              <div className="space-y-4">
                <Input
                  type="text"
                  value={pwVideoSearch}
                  onChange={(e) => setPwVideoSearch(e.target.value)}
                  placeholder={t('studyPage.searchPWVideosPlaceholder')}
                  icon={<Search size={18}/>}
                />
                {filteredPwVideos.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-1">
                    {filteredPwVideos.map(video => (
                      <Card 
                        key={video.id} 
                        hover 
                        onClick={() => { 
                          setSelectedPwVideo(video); 
                          setInputContentString(video.youtubeUrl); 
                          setCustomTopic(video.title); 
                          toast.success(`${t('toast.videoSelected', { videoTitle: video.title })}`); 
                        }}
                        className={`p-3 cursor-pointer ${selectedPwVideo?.id === video.id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-32 object-cover rounded-md mb-2"/>
                        <h5 className="font-medium text-sm truncate" title={video.title}>{video.title}</h5>
                        <p className="text-xs text-gray-500 truncate">{video.channel}</p>
                         <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                            <span>{video.views}</span>
                            <span>{video.duration}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-center">{t('studyPage.noPWVideosFound', { searchTerm: pwVideoSearch })}</p>}
              </div>
            )}

            {selectedInputSubType === 'external-link' && (
              <Input
                type="url"
                value={inputContentString}
                onChange={(e) => setInputContentString(e.target.value)}
                placeholder={t('studyPage.pasteYoutubeUrlPlaceholder')}
                className="w-full"
              />
            )}
          </>
        );
      case 'videolecture': 
        return renderVideoLectureSelector();
      default:
        return null;
    }
  };

  const renderFileUploadArea = (acceptTypes: string) => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <Upload className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600 mb-4">
        {selectedFile ? t('studyPage.fileSelectedLabel', { fileName: selectedFile.name }) : t('studyPage.dragDropOrBrowse')}
      </p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={acceptTypes}
        className="hidden"
        id="file-upload-input-study-page" 
      />
      <Button variant="outline" size="md" onClick={handleChooseFileClick}>
        <Upload size={16} className="mr-2"/>{t('studyPage.chooseFileButton')}
      </Button>
    </div>
  );

  const renderVideoLectureSelector = () => { 
    return (
      <div className="space-y-4">
        {videoLectureStep === 'batch' && ( <div>
            <h4 className="font-semibold mb-2">{t('studyPage.selectBatch')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {batches.map(batch => (
                <Button key={batch} variant="outline" onClick={() => { setSelectedBatch(batch); setVideoLectureStep('subject'); }}>{batch}</Button>
              ))}
            </div>
          </div>
        )}
        {videoLectureStep === 'subject' && selectedBatch && ( <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('batch')} className="mb-2">← {t('studyPage.backToBatches')}</Button>
            <h4 className="font-semibold mb-2">{t('studyPage.selectSubjectFor', { batchName: selectedBatch })}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjectsForBatch.map(subject => (
                <Button key={subject} variant="outline" onClick={() => { setSelectedSubject(subject); setVideoLectureStep('tags'); }}>{subject}</Button>
              ))}
            </div>
          </div>
        )}
        {videoLectureStep === 'tags' && selectedSubject && ( <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('subject')} className="mb-2">← {t('studyPage.backToSubjects')}</Button>
            <h4 className="font-semibold mb-2">{t('studyPage.selectTagsFor', { subjectName: selectedSubject })}</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {tagsForSubject.map(tag => (
                <Button 
                  key={tag} 
                  size="sm" 
                  variant={selectedTags.includes(tag) ? 'primary' : 'outline'}
                  onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                >
                  {tag}
                </Button>
              ))}
            </div>
            <Button onClick={() => setVideoLectureStep('videos')}>{t('studyPage.showVideos')} <ChevronRight size={16} className="ml-1"/></Button>
          </div>
        )}
        {videoLectureStep === 'videos' && selectedSubject && ( <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('tags')} className="mb-2">← {t('studyPage.backToTags')}</Button>
            <h4 className="font-semibold mb-2">{t('studyPage.selectVideoLectureFor', { subjectName: selectedSubject })}</h4>
            <Input 
              type="text" 
              placeholder={t('studyPage.searchVideosByTitle')} 
              value={videoSearchTerm} 
              onChange={(e) => setVideoSearchTerm(e.target.value)}
              icon={<Search size={18}/>}
              className="mb-4"
            />
            {filteredLocalVideos.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-1">
                {filteredLocalVideos.map(video => (
                  <Card 
                    key={video.id} 
                    hover 
                    onClick={() => { setInputContentString(video.title); toast.success(`${t('toast.videoSelected', { videoTitle: video.title })}`); }}
                    className={`p-3 cursor-pointer ${inputContentString === video.title ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-32 object-cover rounded-md mb-2"/>
                    <h5 className="font-medium text-sm truncate">{video.title}</h5>
                    <p className="text-xs text-gray-500">{video.tags.join(', ')}</p>
                  </Card>
                ))}
              </div>
            ) : <p className="text-gray-500">{t('studyPage.noVideosFoundSelection')}</p>}
          </div>
        )}
      </div>
    );
  };

  if (isGenerating) {
    const currentStepData = loadingSteps[currentLoadingStep];
    const progressPercent = ((currentLoadingStep + 1) / loadingSteps.length) * 100;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <motion.div 
          key={currentLoadingStep} 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3 text-xl font-semibold text-blue-600 mb-6"
        >
          {React.cloneElement(currentStepData.icon, { className: `${currentStepData.icon.props.className} text-blue-600`})}
          <span>{t(currentStepData.messageKey)} {outputLanguage !== 'english' && currentLoadingStep === loadingSteps.length - 2 ? ` (${t('loadingSteps.translatingTo', { language: t(languageOptions.find(l=>l.value === outputLanguage)?.labelKey || 'English', outputLanguage) })})` : ''}</span>
        </motion.div>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
          <motion.div 
            className="bg-blue-600 h-2.5 rounded-full" 
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <p className="text-gray-500">{t('loadingSteps.waitMessage')}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('studyPage.title')}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('studyPage.subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {inputTypesConfig.map((type, index) => { 
          const Icon = type.icon;
          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full" 
            >
              <Card
                hover
                onClick={() => handleInputTypeSelect(type.id)}
                className={`p-4 text-center cursor-pointer transition-all duration-200 h-full flex flex-col justify-center ${
                  selectedInputType === type.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon className={`mx-auto mb-2 ${selectedInputType === type.id ? 'text-blue-600' : 'text-gray-600'}`} size={28} />
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{t(type.labelKey)}</h3>
                <p className="text-xs text-gray-500">{t(type.descKey)}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedInputType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <Upload className="text-blue-600 mr-2" size={24} />
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('studyPage.provideContentFor', { inputTypeLabel: t(`studyPage.inputTypeLabels.${selectedInputType}`) })}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('studyPage.topicNameLabel')}
                  </label>
                  <Input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder={t('studyPage.topicNamePlaceholder')}
                    className="w-full"
                  />
                </div>

                {renderInputContentArea()}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('studyPage.outputLanguageLabel')}
                  </label>
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {languageOptions.map(lang => (
                      <option key={lang.value} value={lang.value}>{t(lang.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={
                    ((typeof inputContentString === 'string' && !inputContentString.trim()) && !selectedFile && selectedInputType !== 'videolecture' && !(selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && selectedPwVideo)) || 
                    !user || 
                    (selectedInputType === 'videolecture' && !inputContentString) ||
                    (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && !selectedPwVideo) ||
                    (selectedInputType === 'youtube' && selectedInputSubType === 'external-link' && !inputContentString.trim()) ||
                    ((selectedInputType === 'audio' || selectedInputType === 'document' || selectedInputType === 'video') && !selectedFile && selectedInputSubType !== 'record')
                  }
                  size="lg"
                  className="flex items-center"
                >
                  <Brain className="mr-2" size={20} />
                  {t('studyPage.generatePackageButton')}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
