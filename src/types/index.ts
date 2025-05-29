export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  streak: number;
  joinedAt: Date;
  role?: 'student' | 'teacher' | 'parent';
  academicLevel?: string; 
  examPreferences?: string[]; 
  preferredLanguage?: string; 
  isProfileComplete?: boolean;
}

export interface StudyMaterial {
  id: string;
  title: string;
  type: 'summary' | 'mindmap' | 'cheatsheet' | 'flashcards';
  content: any;
  topic: string;
  createdAt: Date;
  userId: string;
  language?: string; 
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  questions: Question[];
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  createdAt: Date;
  language?: string; 
}

export interface Question {
  id: string;
  type: 'mcq' | 'subjective'; // 'one-word' from API will be mapped to 'subjective'
  question: string;
  options?: string[];
  correctAnswer: string | number; // For MCQ, this will be the index of the correct option
  explanation?: string;
  points: number;
}

export interface Battle {
  id: string;
  title: string;
  topic: string;
  participants: User[];
  quiz: Quiz;
  status: 'waiting' | 'ongoing' | 'completed';
  maxParticipants: number;
  createdAt: Date;
  startTime?: Date;
  endTime?: Date;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  topic: string;
  author: User;
  likes: number;
  dislikes: number;
  createdAt: Date;
  tags: string[];
}

export interface InputContent {
  type: 'text' | 'image' | 'audio' | 'video' | 'youtube' | 'document' | 'videolecture';
  content: string; 
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number; 
    title?: string; 
    documentType?: 'image' | 'pdf' | 'word' | 'other-doc'; 
    videoLectureDetails?: { 
        batch: string;
        subject: string;
        tags: string[];
    };
    outputLanguage: string; 
    aiPrompt?: string; 
    thumbnailUrl?: string;
  };
}

// New types for Channel Videos API
export interface VideoThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface VideoThumbnails {
  default: VideoThumbnail;
  medium: VideoThumbnail;
  high: VideoThumbnail;
}

export interface VideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: VideoThumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime: string;
}

export interface VideoId {
  kind: string;
  videoId: string;
}

export interface VideoItem {
  kind: string;
  etag: string;
  id: VideoId;
  snippet: VideoSnippet;
}

export interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface ChannelVideosApiResponseData {
  kind:string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode: string;
  pageInfo: PageInfo;
  items: VideoItem[];
}

export interface ChannelVideosApiResponse {
  status_code: number;
  data: ChannelVideosApiResponseData;
}

// New types for Live Transcription API
export interface ApiTranscriptItem {
  text: string;
  timeline: string; 
}

export interface LiveTranscriptionData {
  stream_id: string;
  transcripts: ApiTranscriptItem[];
}

export interface LiveTranscriptionApiResponse {
  status_code: number;
  data: LiveTranscriptionData;
}

// Types for the Study Materials Generation API (from text)
export interface ApiMindMapNode {
  id: string;
  title: string;
  x: number;
  y: number;
  color: string;
  children: ApiMindMapNode[];
}

export interface ApiQuizQuestion { // Used by text-gen API
  type: 'mcq' | 'one-word';
  question: string;
  options?: string[]; // Only for MCQ
  answer: string;    // For MCQ, this is the text of the correct option; for one-word, it's the answer
}

export interface ApiFlashcard {
  question: string;
  answer: string;
}

export interface ApiSummary {
  text: string;
}

export interface ApiStudyMaterialsData {
  mindmap: ApiMindMapNode;
  quiz: ApiQuizQuestion[];
  flashcards: ApiFlashcard[];
  summary: ApiSummary;
}

export interface ApiGenerateStudyMaterialsResponse {
  success: boolean;
  message: string;
  data: ApiStudyMaterialsData;
}

// Types for the AI Chat API
export interface ApiAIChatResponseDataInternal {
  success: boolean;
  message: string;
  data: string; // This is the AI's answer string
}

export interface ApiAIChatResponseTopLevel {
  status_code: number;
  data: ApiAIChatResponseDataInternal;
  totalCount?: number; 
  message: string;
  error_messages?: string[]; 
  error: boolean;
}

// Types for the Live Questions API
export interface ApiLiveQuestionItem { 
  type: 'mcq' | 'one-word' | string; 
  question: string;
  options?: string[];
  answer: string; 
}

export interface ApiLiveQuestionsResponseDataInternal {
  success: boolean;
  message: string;
  data: ApiLiveQuestionItem[]; 
}

export interface ApiLiveQuestionsResponseTopLevel {
  status_code: number;
  data: ApiLiveQuestionsResponseDataInternal;
  totalCount?: number;
  message: string;
  error_messages?: string[];
  error: boolean;
}

export type ActiveToolModalType = 
  | 'flashcards' 
  | 'mindmap' 
  | 'summary' 
  | 'quiz' 
  | 'notes' 
  | 'share' 
  | 'listen-summary' 
  | 'recommendations' // Added recommendations
  | null;
