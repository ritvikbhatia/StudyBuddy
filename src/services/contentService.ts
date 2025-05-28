export interface PwVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string; // Can be a real or mock YouTube link/ID
  description?: string;
  channel: string; 
  duration?: string; // e.g., "12:35"
  views?: string; // e.g., "1.2M views"
  uploadDate?: string; // e.g., "2 weeks ago"
}

const mockPwVideos: PwVideo[] = [
  {
    id: 'pw1',
    title: 'Newton\'s Laws of Motion - Complete Chapter | Class 11 Physics',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/0284C7/FFFFFF?text=PW+Physics+1',
    youtubeUrl: 'mock://pw_newtons_laws',
    channel: 'Physics Wallah - Alakh Pandey',
    description: 'Understand Newton\'s Laws of Motion in detail. Covers all concepts for Class 11 and NEET/JEE.',
    duration: "1:25:30",
    views: "5.2M views",
    uploadDate: "1 year ago"
  },
  {
    id: 'pw2',
    title: 'Introduction to Calculus - Limits & Derivatives | Class 12 Maths',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/059669/FFFFFF?text=PW+Maths+1',
    youtubeUrl: 'mock://pw_calculus_intro',
    channel: 'Physics Wallah - Foundation',
    description: 'Master the basics of calculus, including limits, continuity, and derivatives. Essential for Class 12 boards and competitive exams.',
    duration: "2:10:15",
    views: "3.8M views",
    uploadDate: "10 months ago"
  },
  {
    id: 'pw3',
    title: 'Organic Chemistry - Nomenclature & Isomerism | NEET / JEE',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/7C3AED/FFFFFF?text=PW+Chemistry+1',
    youtubeUrl: 'mock://pw_organic_chem',
    channel: 'Physics Wallah - JEE Wallah',
    description: 'Learn IUPAC nomenclature and different types of isomerism in organic compounds. Crucial for NEET and JEE preparation.',
    duration: "1:45:50",
    views: "4.1M views",
    uploadDate: "8 months ago"
  },
  {
    id: 'pw4',
    title: 'Cell Structure and Functions - Complete Biology | Class 9 / 10',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/DB2777/FFFFFF?text=PW+Biology+1',
    youtubeUrl: 'mock://pw_cell_biology',
    channel: 'Physics Wallah - Foundation',
    description: 'A comprehensive guide to cell structure, organelles, and their functions. Perfect for Class 9 and 10 students.',
    duration: "55:20",
    views: "2.5M views",
    uploadDate: "6 months ago"
  },
  {
    id: 'pw5',
    title: 'Modern Physics - Dual Nature of Matter & Radiation | JEE Advanced',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/0284C7/FFFFFF?text=PW+Physics+2',
    youtubeUrl: 'mock://pw_modern_physics',
    channel: 'Physics Wallah - JEE Wallah',
    description: 'Deep dive into modern physics concepts like the dual nature of matter, photoelectric effect, and De Broglie hypothesis.',
    duration: "2:30:00",
    views: "1.9M views",
    uploadDate: "3 months ago"
  },
  {
    id: 'pw6',
    title: 'Trigonometry Formulas & Problem Solving | Class 10 / 11 Maths',
    thumbnailUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/320x180/059669/FFFFFF?text=PW+Maths+2',
    youtubeUrl: 'mock://pw_trigonometry',
    channel: 'Physics Wallah - Foundation',
    description: 'All important trigonometry formulas and techniques for solving problems. Useful for board exams and NTSE.',
    duration: "1:15:45",
    views: "3.1M views",
    uploadDate: "11 months ago"
  },
];

class ContentService {
  getAllPwVideos(): PwVideo[] {
    return mockPwVideos;
  }

  searchPwVideos(searchTerm: string): PwVideo[] {
    if (!searchTerm.trim()) {
      return mockPwVideos;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return mockPwVideos.filter(video => 
      video.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      (video.description && video.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
      video.channel.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  getPwVideoById(id: string): PwVideo | undefined {
    return mockPwVideos.find(video => video.id === id);
  }
}

export const contentService = new ContentService();
