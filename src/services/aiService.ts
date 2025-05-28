import { faker } from '@faker-js/faker';
import { StudyMaterial, Question, Quiz } from '../types';

// Helper for language-specific mock text
const getMockText = (language: string, type: 'title' | 'sentence' | 'paragraph' | 'words', topic: string, count: number = 1): string => {
  const langPrefix = language !== 'english' ? `[${language.toUpperCase()}] ` : '';
  
  switch (language.toLowerCase()) {
    case 'hindi':
      if (type === 'title') return `${langPrefix}${topic} - शीर्षक`;
      if (type === 'sentence') return `${langPrefix}${topic} पर एक वाक्य। `.repeat(count);
      if (type === 'paragraph') return `${langPrefix}${topic} पर एक अनुच्छेद। इसमें कई वाक्य हैं। `.repeat(count);
      if (type === 'words') return `${langPrefix}${topic} शब्द `.repeat(count);
      break;
    case 'bengali':
      if (type === 'title') return `${langPrefix}${topic} - শিরোনাম`;
      if (type === 'sentence') return `${langPrefix}${topic} সম্পর্কিত একটি বাক্য। `.repeat(count);
      if (type === 'paragraph') return `${langPrefix}${topic} সম্পর্কিত একটি অনুচ্ছেদ। এতে একাধিক বাক্য রয়েছে। `.repeat(count);
      if (type === 'words') return `${langPrefix}${topic} শব্দ `.repeat(count);
      break;
    // Add more languages as needed
    default: // English
      if (type === 'title') return `${topic} - Title`;
      if (type === 'sentence') return `${faker.lorem.sentence()} `.repeat(count);
      if (type === 'paragraph') return `${faker.lorem.paragraphs(count > 3 ? 3 : count, '\n\n')}`;
      if (type === 'words') return `${faker.lorem.words(count)} `;
      break;
  }
  return `${langPrefix}Mock text for ${topic}`;
};


class AIService {
  private async simulateProcessing(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = faker.number.int({ min: minMs, max: maxMs });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Generate complete study response with materials, quiz, and chat context
  async generateCompleteStudyResponse(
    content: string, 
    type: string, 
    topic: string,
    outputLanguage: string = 'english',
    metadata: any = {} // Added metadata
  ): Promise<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz;
    content: string; // Original or processed input content
    outputLanguage: string;
  }> {
    await this.simulateProcessing(4000, 7000); // Increased simulation time

    const materials = await this.generateStudyMaterials(content, type, topic, outputLanguage, metadata);
    const quiz = await this.generateQuiz(topic, 'medium', outputLanguage);

    return {
      topic,
      materials,
      quiz,
      content, // Pass back original content or derived content (e.g. video title)
      outputLanguage,
    };
  }

  // Generate study materials from content
  async generateStudyMaterials(
    content: string, 
    type: string, 
    topic: string, 
    outputLanguage: string,
    metadata: any 
  ): Promise<StudyMaterial[]> {
    await this.simulateProcessing(2000, 4000);

    const materials: StudyMaterial[] = [];
    const baseId = Date.now();

    materials.push({
      id: `${baseId}-summary`,
      title: getMockText(outputLanguage, 'title', `${topic} Summary`, 1),
      type: 'summary',
      content: this.generateSummaryContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage, // Added language
    });

    materials.push({
      id: `${baseId}-cheatsheet`,
      title: getMockText(outputLanguage, 'title', `${topic} Cheatsheet`, 1),
      type: 'cheatsheet',
      content: this.generateCheatsheetContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage, // Added language
    });

    materials.push({
      id: `${baseId}-flashcards`,
      title: getMockText(outputLanguage, 'title', `${topic} Flashcards`, 1),
      type: 'flashcards',
      content: this.generateFlashcardsContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage, // Added language
    });

    materials.push({
      id: `${baseId}-mindmap`,
      title: getMockText(outputLanguage, 'title', `${topic} Mind Map`, 1),
      type: 'mindmap',
      content: this.generateMindMapContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage, // Added language
    });

    return materials;
  }

  async generateChatResponse(question: string, topic: string, content: string, outputLanguage: string): Promise<string> {
    await this.simulateProcessing(1000, 2500);
    const langPrefix = outputLanguage !== 'english' ? `[${outputLanguage.toUpperCase()}] ` : '';
    return `${langPrefix}AI Tutor response for '${question}' regarding ${topic}: ${getMockText(outputLanguage, 'paragraph', topic, 1)}`;
  }

  private generateSummaryContent(content: string, topic: string, language: string): string {
    return `# ${getMockText(language, 'title', `${topic} Summary`, 1)}

## ${getMockText(language, 'words', 'Key Concepts', 2)}
• ${getMockText(language, 'sentence', topic, 1)}
• ${getMockText(language, 'sentence', topic, 1)}

## ${getMockText(language, 'words', 'Important Points', 2)}
${getMockText(language, 'paragraph', topic, 1)}

## ${getMockText(language, 'words', 'Detailed Explanation', 2)}
${getMockText(language, 'paragraph', topic, 2)}`;
  }

  private generateCheatsheetContent(content: string, topic: string, language: string): string {
    return `# ${getMockText(language, 'title', `${topic} Cheatsheet`, 1)}

## ${getMockText(language, 'words', 'Formulas', 1)}
• ${getMockText(language, 'sentence', 'Formula 1', 1)}
• ${getMockText(language, 'sentence', 'Formula 2', 1)}

## ${getMockText(language, 'words', 'Definitions', 1)}
**${getMockText(language, 'words', 'Term 1', 1)}**: ${getMockText(language, 'sentence', 'Definition 1', 1)}
**${getMockText(language, 'words', 'Term 2', 1)}**: ${getMockText(language, 'sentence', 'Definition 2', 1)}`;
  }

  private generateFlashcardsContent(content: string, topic: string, language: string): any {
    return {
      cards: Array.from({ length: 3 }).map((_, i) => ({
        id: `${i + 1}`,
        question: `${getMockText(language, 'sentence', `Question ${i+1} for ${topic}`, 1)}?`,
        answer: getMockText(language, 'sentence', `Answer ${i+1} for ${topic}`, 1),
        difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
      }))
    };
  }

  private generateMindMapContent(content: string, topic: string, language: string): any {
    return {
      central: getMockText(language, 'words', topic, 1),
      branches: Array.from({ length: 3 }).map((_, i) => ({
        title: getMockText(language, 'words', `Branch ${i+1}`, 2),
        subtopics: Array.from({ length: 2 }).map((__, j) => getMockText(language, 'words', `Subtopic ${j+1}`, 2))
      }))
    };
  }

  async generateQuiz(topic: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', language: string): Promise<Quiz> {
    await this.simulateProcessing(1500, 3000);
    const questions: Question[] = [];
    const questionCount = 5; // Fixed for consistency

    for (let i = 0; i < questionCount; i++) {
      if (i % 2 === 0) { // Mix of MCQ and subjective
        questions.push({
          id: `q${i + 1}`,
          type: 'subjective',
          question: getMockText(language, 'sentence', `Explain concept ${i+1} in ${topic}`, 1),
          correctAnswer: getMockText(language, 'paragraph', `Correct answer for concept ${i+1}`, 1),
          explanation: getMockText(language, 'sentence', `Explanation for concept ${i+1}`, 1),
          points: 10,
        });
      } else {
        questions.push({
          id: `q${i + 1}`,
          type: 'mcq',
          question: getMockText(language, 'sentence', `Which describes ${topic} aspect ${i+1}`, 1) + '?',
          options: Array.from({length: 4}).map((_, optIdx) => getMockText(language, 'sentence', `Option ${optIdx+1}`, 1)),
          correctAnswer: faker.number.int({ min: 0, max: 3 }),
          explanation: getMockText(language, 'sentence', `Explanation for MCQ ${i+1}`, 1),
          points: 5,
        });
      }
    }

    return {
      id: `quiz-${Date.now()}`,
      title: getMockText(language, 'title', `${topic} Quiz (${difficulty})`, 1),
      topic,
      questions,
      difficulty,
      timeLimit: questionCount * 90, // 90 seconds per question
      createdAt: new Date(),
      language: language, // Added language
    };
  }

  extractTopic(content: string, type: string): string {
    // Basic topic extraction, can be improved
    if (type === 'videolecture' && content.startsWith('mock://')) { // Assuming content is a mock URL or title
        return content.replace('mock://', '').split(/[\s_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Video Lecture';
    }
    const words = content.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
    const commonWords = ['the', 'a', 'an', 'is', 'are', 'what', 'how', 'explain', 'define'];
    const significantWords = words.filter(w => w.length > 3 && !commonWords.includes(w)).slice(0, 3);
    if (significantWords.length > 0) return significantWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Content';
  }
}

export const aiService = new AIService();
