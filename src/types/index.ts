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
  academicLevel?: string; // e.g., 'class_1_5', 'class_6_8', 'class_9_10', 'class_11_12', 'dropper', 'graduate'
  examPreferences?: string[]; // e.g., ['JEE', 'NEET']
  preferredLanguage?: string; // e.g., 'en', 'hi'
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
  type: 'mcq' | 'subjective';
  question: string;
  options?: string[];
  correctAnswer: string | number;
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
  };
}
