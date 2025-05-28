import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, Mic, Video as VideoIcon, Youtube, Brain, Film, FileCheck, Wand2, Languages, ListFilter, Tags, ChevronRight, Search, CheckCircle, PlayCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { aiService } from '../../services/aiService';
import { storageService } from '../../services/storageService';
import { contentService, PwVideo } from '../../services/contentService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { InitialStudyDataType } from '../../App'; // Import the type

interface StudyPageProps {
  onStudyGenerated: (data: any) => void;
  initialData?: InitialStudyDataType;
  onInitialDataConsumed?: () => void;
}

type InputType = 'text' | 'document' | 'audio' | 'video' | 'youtube' | 'videolecture';
type InputSubType = 'manual' | 'ai-generate' | 'image' | 'pdf' | 'word' | 'other-doc' | 'record' | 'upload-audio' | 'pw-recommendations' | 'external-link' | null;

interface VideoLecture { // This is for the 'Video Lecture' input type, not PW YouTube videos
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  batch: string;
  subject: string;
  tags: string[];
}

const mockVideoLectures: VideoLecture[] = [
  { id: 'v1', title: 'Newton\'s First Law Explained', thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/3B82F6/FFFFFF?text=Physics+Lecture+1', videoUrl: 'mock://newton1', batch: 'Physics XI', subject: 'Physics', tags: ['Mechanics', 'Newton\'s Laws'] },
  { id: 'v2', title: 'Introduction to Calculus', thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/10B981/FFFFFF?text=Maths+Lecture+1', videoUrl: 'mock://calculus_intro', batch: 'Maths XII', subject: 'Mathematics', tags: ['Calculus', 'Basics'] },
];


const loadingSteps = [
  { message: 'Analyzing your content...', icon: <Brain size={24} className="animate-pulse" /> },
  { message: 'Extracting key concepts...', icon: <FileText size={24} className="animate-pulse" /> },
  { message: 'Structuring study materials...', icon: <ListFilter size={24} className="animate-pulse" /> },
  { message: 'Crafting mind map & flashcards...', icon: <Tags size={24} className="animate-pulse" /> },
  { message: 'Developing interactive quiz...', icon: <Wand2 size={24} className="animate-pulse" /> },
  { message: 'Preparing AI tutor session...', icon: <Languages size={24} className="animate-pulse" /> },
  { message: 'Finalizing your study package...', icon: <CheckCircle size={24} /> }
];

export const StudyPage: React.FC<StudyPageProps> = ({ onStudyGenerated, initialData, onInitialDataConsumed }) => {
  const { user } = useAuth();
  const [selectedInputType, setSelectedInputType] = useState<InputType | null>(null);
  const [selectedInputSubType, setSelectedInputSubType] = useState<InputSubType>(null);
  
  const [inputContent, setInputContent] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [outputLanguage, setOutputLanguage] = useState('english');

  // Video Lecture State (for 'videolecture' type, not PW YouTube)
  const [videoLectureStep, setVideoLectureStep] = useState<'batch' | 'subject' | 'tags' | 'videos'>('batch');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredLocalVideos, setFilteredLocalVideos] = useState<VideoLecture[]>([]); // Renamed to avoid confusion
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  // PW YouTube Video State
  const [pwVideoSearch, setPwVideoSearch] = useState('');
  const [filteredPwVideos, setFilteredPwVideos] = useState<PwVideo[]>([]);
  const [selectedPwVideo, setSelectedPwVideo] = useState<PwVideo | null>(null);


  // AI Text Generation State
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isGeneratingAIText, setIsGeneratingAIText] = useState(false);

  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);

  useEffect(() => {
    if (initialData && onInitialDataConsumed) {
      setSelectedInputType(initialData.inputType);
      if (initialData.inputSubType) setSelectedInputSubType(initialData.inputSubType);
      setInputContent(initialData.content);
      if (initialData.outputLanguage) setOutputLanguage(initialData.outputLanguage);
      if (initialData.topic) setCustomTopic(initialData.topic);

      if (initialData.inputType === 'youtube' && initialData.inputSubType === 'pw-recommendations') {
        const allPwVideos = contentService.getAllPwVideos();
        setFilteredPwVideos(allPwVideos);
        const video = allPwVideos.find(v => v.title === initialData.content || v.id === initialData.content || v.youtubeUrl === initialData.content);
        if (video) setSelectedPwVideo(video);
      }
      onInitialDataConsumed(); 
    }
  }, [initialData, onInitialDataConsumed]);


  const inputTypesConfig = [
    { id: 'text' as InputType, label: 'Text', icon: FileText, description: 'Paste or generate text' },
    { id: 'document' as InputType, label: 'Document', icon: FileCheck, description: 'Upload images, PDFs, etc.' },
    { id: 'audio' as InputType, label: 'Audio', icon: Mic, description: 'Record or upload audio' },
    { id: 'video' as InputType, label: 'Video File', icon: VideoIcon, description: 'Upload local video files' },
    { id: 'youtube' as InputType, label: 'YouTube', icon: Youtube, description: 'PW videos or external links' },
    { id: 'videolecture' as InputType, label: 'Video Lecture', icon: Film, description: 'Select from local library' },
  ];

  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi (हिन्दी)' },
    { value: 'bengali', label: 'Bengali (বাংলা)' },
    { value: 'tamil', label: 'Tamil (தமிழ்)' },
    { value: 'telugu', label: 'Telugu (తెలుగు)' },
    { value: 'marathi', label: 'Marathi (मराठी)' },
  ];

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
  }, [isGenerating]);

  // PW Video Search
  useEffect(() => {
    if (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations') {
      setFilteredPwVideos(contentService.searchPwVideos(pwVideoSearch));
    }
  }, [pwVideoSearch, selectedInputType, selectedInputSubType]);

  const handleInputTypeSelect = (type: InputType) => {
    setSelectedInputType(type);
    setSelectedInputSubType(null);
    setInputContent('');
    setSelectedFile(null);
    setAiTextPrompt('');
    setVideoLectureStep('batch');
    setSelectedBatch('');
    setSelectedSubject('');
    setSelectedTags([]);
    setFilteredLocalVideos([]);
    setVideoSearchTerm('');
    setPwVideoSearch('');
    setFilteredPwVideos(contentService.getAllPwVideos()); // Initialize PW videos
    setSelectedPwVideo(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setInputContent(file.name); 
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleGenerateAIText = async () => {
    if (!aiTextPrompt.trim()) {
      toast.error('Please enter a prompt for AI text generation.');
      return;
    }
    setIsGeneratingAIText(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const generatedText = `AI Generated Content for: "${aiTextPrompt}"\n\n${Array.from({ length: 3 }).map(() => `This is a paragraph about ${aiTextPrompt}. ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(Math.floor(Math.random() * 3) + 2)}`).join('\n\n')}`;
      setInputContent(generatedText);
      toast.success('AI text generated!');
    } catch (error) {
      toast.error('Failed to generate text with AI.');
    } finally {
      setIsGeneratingAIText(false);
    }
  };

  // Video Lecture Logic (Local Library)
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
    let finalInputContent = inputContent;
    let finalInputType = selectedInputType;
    let metadata: any = { outputLanguage };

    if (selectedInputType === 'text' && selectedInputSubType === 'ai-generate' && !inputContent && aiTextPrompt) {
      toast.error('Please generate AI text first or switch to manual input.');
      return;
    }
    if (selectedInputType === 'videolecture' && !inputContent) {
        toast.error('Please select a video lecture from the local library.');
        return;
    }
    if (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && !selectedPwVideo) {
      toast.error('Please select a Physics Wallah video.');
      return;
    }
    if (selectedInputType === 'youtube' && selectedInputSubType === 'external-link' && !inputContent.trim()) {
      toast.error('Please paste a YouTube URL.');
      return;
    }


    if (selectedFile) {
      finalInputContent = selectedFile.name; 
      metadata.fileName = selectedFile.name;
      metadata.fileSize = selectedFile.size;
    }
    
    if (selectedInputType === 'document' && selectedInputSubType) {
        metadata.documentType = selectedInputSubType;
    }
    if (selectedInputType === 'videolecture' && inputContent) { 
        metadata.videoLectureTitle = inputContent; 
    }
    if (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && selectedPwVideo) {
        finalInputContent = selectedPwVideo.youtubeUrl; // Use URL for processing
        metadata.youtubeVideoTitle = selectedPwVideo.title;
        metadata.isPwVideo = true;
    }
    if (selectedInputType === 'youtube' && selectedInputSubType === 'external-link') {
        metadata.youtubeVideoUrl = finalInputContent;
        metadata.isPwVideo = false;
    }


    if (!finalInputContent.trim() && !selectedFile && !(selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && selectedPwVideo)) {
      toast.error('Please provide some content or select a file/video.');
      return;
    }
    if (!user) {
      toast.error('Please log in to generate study materials');
      return;
    }

    setIsGenerating(true);
    setCurrentLoadingStep(0); 
    
    try {
      const topic = customTopic.trim() || aiService.extractTopic(finalInputContent, finalInputType || 'text');
      
      const studyResponse = await aiService.generateCompleteStudyResponse(
        finalInputContent, 
        finalInputType || 'text', 
        topic,
        outputLanguage, 
        metadata
      );
      
      studyResponse.materials.forEach(material => {
        storageService.saveStudyMaterial(material);
      });

      if (studyResponse.quiz) {
        storageService.saveQuiz(studyResponse.quiz);
      }

      storageService.saveInputHistory({
        type: finalInputType || 'text',
        content: finalInputContent,
        topic,
        metadata,
      });

      storageService.updateTopicFrequency(topic);
      storageService.addActivity({
        type: 'study',
        title: `Generated study materials for ${topic} (in ${languageOptions.find(l=>l.value === outputLanguage)?.label || outputLanguage})`,
        points: 50,
        metadata: { topic, materialsCount: studyResponse.materials.length, language: outputLanguage },
      });
      storageService.updateUserStats(50, 'study');

      toast.success('Study materials generated successfully!', { id: 'generating-final' });
      onStudyGenerated(studyResponse);
      
      setInputContent('');
      setCustomTopic('');
      setSelectedFile(null);
      setSelectedInputType(null);
      setSelectedInputSubType(null);
      setOutputLanguage('english');
      setSelectedPwVideo(null);
      setPwVideoSearch('');
      
    } catch (error) {
      console.error('Error generating materials:', error);
      toast.error('Failed to generate study materials. Please try again.', { id: 'generating-error' });
    } finally {
      setIsGenerating(false);
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
  };

  const renderInputContentArea = () => {
    if (!selectedInputType) return null;

    switch (selectedInputType) {
      case 'text':
        return ( /* ... existing text input UI ... */ <>
            <div className="flex space-x-2 mb-4">
              <Button variant={selectedInputSubType === 'manual' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('manual')}>Paste Manually</Button>
              <Button variant={selectedInputSubType === 'ai-generate' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('ai-generate')}>
                <Wand2 size={16} className="mr-2"/>Generate with AI
              </Button>
            </div>
            {selectedInputSubType === 'manual' && (
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste your text content here..."
                className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            )}
            {selectedInputSubType === 'ai-generate' && (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={aiTextPrompt}
                  onChange={(e) => setAiTextPrompt(e.target.value)}
                  placeholder="Enter a prompt for AI to generate text (e.g., Explain photosynthesis)"
                />
                <Button onClick={handleGenerateAIText} loading={isGeneratingAIText} size="sm">Generate Text</Button>
                <textarea
                  value={inputContent}
                  readOnly
                  placeholder="AI generated text will appear here..."
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg bg-gray-50 resize-none"
                />
              </div>
            )}
          </>
        );
      case 'document':
        return ( /* ... existing document input UI ... */ <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select 
                value={selectedInputSubType || ''} 
                onChange={(e) => setSelectedInputSubType(e.target.value as InputSubType)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select document type</option>
                <option value="image">Image (JPG, PNG, GIF)</option>
                <option value="pdf">PDF Document</option>
                <option value="word">Word Document (DOC, DOCX)</option>
                <option value="other-doc">Other Document Type</option>
              </select>
            </div>
            {renderFileUploadArea('image/*,application/pdf,.doc,.docx')}
          </>
        );
      case 'audio':
        return ( /* ... existing audio input UI ... */ <>
            <div className="flex space-x-2 mb-4">
              <Button variant={selectedInputSubType === 'record' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('record')}>Record Audio</Button>
              <Button variant={selectedInputSubType === 'upload-audio' ? 'primary' : 'outline'} onClick={() => setSelectedInputSubType('upload-audio')}>Upload Audio File</Button>
            </div>
            {selectedInputSubType === 'record' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-3">
                <Mic size={48} className="mx-auto text-gray-400" />
                <p className="text-gray-600">Audio Recording (Simulated)</p>
                <Button onClick={() => {setInputContent(`Recorded Audio - ${new Date().toLocaleTimeString()}`); toast.success("Audio recording simulated!");}} size="md">Start Recording</Button>
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
                  setFilteredPwVideos(contentService.getAllPwVideos()); // Show all initially
                  setInputContent(''); // Clear external link
                  setSelectedPwVideo(null);
                }}
              >
                PW Recommendations
              </Button>
              <Button 
                variant={selectedInputSubType === 'external-link' ? 'primary' : 'outline'} 
                onClick={() => {
                  setSelectedInputSubType('external-link');
                  setInputContent(''); // Clear PW selection
                  setSelectedPwVideo(null);
                }}
              >
                Add External Link
              </Button>
            </div>

            {selectedInputSubType === 'pw-recommendations' && (
              <div className="space-y-4">
                <Input
                  type="text"
                  value={pwVideoSearch}
                  onChange={(e) => setPwVideoSearch(e.target.value)}
                  placeholder="Search Physics Wallah videos..."
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
                          setInputContent(video.title); // Use title for display, actual URL for processing
                          setCustomTopic(video.title); // Pre-fill topic
                          toast.success(`Selected: ${video.title}`); 
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
                ) : <p className="text-gray-500 text-center">No Physics Wallah videos found for "{pwVideoSearch}".</p>}
              </div>
            )}

            {selectedInputSubType === 'external-link' && (
              <Input
                type="url"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste any YouTube URL here..."
                className="w-full"
              />
            )}
          </>
        );
      case 'videolecture': // This is the local video library
        return renderVideoLectureSelector();
      default:
        return null;
    }
  };

  const renderFileUploadArea = (acceptTypes: string) => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <Upload className="mx-auto mb-4 text-gray-400" size={48} />
      <p className="text-gray-600 mb-4">
        {selectedFile ? `Selected: ${selectedFile.name}` : 'Drag and drop your file here or click to browse'}
      </p>
      <input
        type="file"
        onChange={handleFileSelect}
        accept={acceptTypes}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button variant="outline" size="md" className="cursor-pointer">
          Choose File
        </Button>
      </label>
    </div>
  );

  const renderVideoLectureSelector = () => { // For 'videolecture' type (local library)
    return (
      <div className="space-y-4">
        {videoLectureStep === 'batch' && ( /* ... existing video lecture UI ... */ <div>
            <h4 className="font-semibold mb-2">Select Batch:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {batches.map(batch => (
                <Button key={batch} variant="outline" onClick={() => { setSelectedBatch(batch); setVideoLectureStep('subject'); }}>{batch}</Button>
              ))}
            </div>
          </div>
        )}
        {videoLectureStep === 'subject' && selectedBatch && ( /* ... existing video lecture UI ... */ <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('batch')} className="mb-2">← Back to Batches</Button>
            <h4 className="font-semibold mb-2">Select Subject for {selectedBatch}:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjectsForBatch.map(subject => (
                <Button key={subject} variant="outline" onClick={() => { setSelectedSubject(subject); setVideoLectureStep('tags'); }}>{subject}</Button>
              ))}
            </div>
          </div>
        )}
        {videoLectureStep === 'tags' && selectedSubject && ( /* ... existing video lecture UI ... */ <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('subject')} className="mb-2">← Back to Subjects</Button>
            <h4 className="font-semibold mb-2">Select Tags for {selectedSubject} (Optional):</h4>
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
            <Button onClick={() => setVideoLectureStep('videos')}>Show Videos <ChevronRight size={16} className="ml-1"/></Button>
          </div>
        )}
        {videoLectureStep === 'videos' && selectedSubject && ( /* ... existing video lecture UI ... */ <div>
            <Button size="sm" variant="ghost" onClick={() => setVideoLectureStep('tags')} className="mb-2">← Back to Tags</Button>
            <h4 className="font-semibold mb-2">Select Video Lecture for {selectedSubject}:</h4>
            <Input 
              type="text" 
              placeholder="Search videos by title..." 
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
                    onClick={() => { setInputContent(video.title); toast.success(`Selected: ${video.title}`); }}
                    className={`p-3 cursor-pointer ${inputContent === video.title ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-32 object-cover rounded-md mb-2"/>
                    <h5 className="font-medium text-sm truncate">{video.title}</h5>
                    <p className="text-xs text-gray-500">{video.tags.join(', ')}</p>
                  </Card>
                ))}
              </div>
            ) : <p className="text-gray-500">No videos found for your selection.</p>}
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
          <span>{currentStepData.message} {outputLanguage !== 'english' && currentLoadingStep === loadingSteps.length - 2 ? ` (Translating to ${languageOptions.find(l=>l.value === outputLanguage)?.label || outputLanguage})` : ''}</span>
        </motion.div>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mb-4">
          <motion.div 
            className="bg-blue-600 h-2.5 rounded-full" 
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <p className="text-gray-500">Please wait while we prepare your personalized study package...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Study Assistant</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose your input method, provide content, select output language, and let AI generate your study package.
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
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{type.label}</h3>
                <p className="text-xs text-gray-500">{type.description}</p>
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
                  Provide Content for {inputTypesConfig.find(it => it.id === selectedInputType)?.label}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic Name (Optional - AI will try to detect if empty)
                  </label>
                  <Input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g., Quantum Physics, Indian History..."
                    className="w-full"
                  />
                </div>

                {renderInputContentArea()}

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Language
                  </label>
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {languageOptions.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={
                    (!inputContent.trim() && !selectedFile && selectedInputType !== 'videolecture' && !(selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && selectedPwVideo)) || 
                    !user || 
                    (selectedInputType === 'videolecture' && !inputContent) ||
                    (selectedInputType === 'youtube' && selectedInputSubType === 'pw-recommendations' && !selectedPwVideo) ||
                    (selectedInputType === 'youtube' && selectedInputSubType === 'external-link' && !inputContent.trim())
                  }
                  size="lg"
                  className="flex items-center"
                >
                  <Brain className="mr-2" size={20} />
                  Generate Complete Study Package
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
