import { faker } from '@faker-js/faker';
import { StudyMaterial, Question, Quiz, InputContent, ApiGenerateStudyMaterialsResponse, ApiQuizQuestion, ApiFlashcard, ApiMindMapNode, ApiAIChatResponseTopLevel } from '../types';
import axios from 'axios';

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

  // New method for AI Chat API
  async getAIChatResponse(context: string, question: string, chatId: string): Promise<string> {
    const apiUrl = 'https://qbg-backend-stage.penpencil.co/qbg/internal/answer-question';
    const payload = {
      context,
      question,
      chatId,
    };

    try {
      const response = await axios.post<ApiAIChatResponseTopLevel>(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.status_code === 201 && response.data.data && response.data.data.success) {
        return response.data.data.data; // This is the AI's answer string
      } else {
        console.error('AI Chat API Error - Unexpected response structure:', response.data);
        const errorMsg = response.data?.message || 'Failed to get AI chat response due to unexpected data format.';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('AI Chat API Network/Request Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Network error or server issue with AI Chat API.';
      throw new Error(errorMessage);
    }
  }


  // Method to call the external API for text-based study material generation
  async generateStudyMaterialsFromTextAPI(
    textContent: string,
    topic: string,
    outputLanguage: string = 'english' 
  ): Promise<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    originalInput: InputContent;
  }> {
    const apiUrl = 'https://8d3c-69-48-236-229.ngrok-free.app/api/generate-all-study-materials';
    const formData = new FormData();
    formData.append('contentType', 'text');
    formData.append('content', textContent);
    formData.append('topic', topic);

    const response = await axios.post<ApiGenerateStudyMaterialsResponse>(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data.message || 'Failed to generate study materials from API');
    }

    const apiData = response.data.data;
    const materials: StudyMaterial[] = [];
    const baseId = `api-${Date.now()}`;

    if (apiData.mindmap) {
      materials.push({
        id: `${baseId}-mindmap`,
        title: getMockText(outputLanguage, 'title', `${topic} Mind Map`, 1),
        type: 'mindmap',
        content: apiData.mindmap,
        topic,
        createdAt: new Date(),
        userId: 'current-user', 
        language: outputLanguage,
      });
    }

    if (apiData.flashcards && apiData.flashcards.length > 0) {
      materials.push({
        id: `${baseId}-flashcards`,
        title: getMockText(outputLanguage, 'title', `${topic} Flashcards`, 1),
        type: 'flashcards',
        content: {
          cards: apiData.flashcards.map((fc: ApiFlashcard, index: number) => ({
            id: `${index + 1}`,
            question: fc.question,
            answer: fc.answer,
            difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
          })),
        },
        topic,
        createdAt: new Date(),
        userId: 'current-user',
        language: outputLanguage,
      });
    }

    if (apiData.summary && apiData.summary.text) {
      materials.push({
        id: `${baseId}-summary`,
        title: getMockText(outputLanguage, 'title', `${topic} Summary`, 1),
        type: 'summary',
        content: apiData.summary.text,
        topic,
        createdAt: new Date(),
        userId: 'current-user',
        language: outputLanguage,
      });
    }
    
    let generatedQuiz: Quiz | null = null;
    if (apiData.quiz && apiData.quiz.length > 0) {
      const questions: Question[] = apiData.quiz.map((apiQ: ApiQuizQuestion, index: number) => {
        if (apiQ.type === 'mcq') {
          const correctAnswerIndex = apiQ.options?.findIndex(opt => opt === apiQ.answer) ?? -1;
          return {
            id: `api-q-${index + 1}`,
            type: 'mcq',
            question: apiQ.question,
            options: apiQ.options || [],
            correctAnswer: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
            explanation: getMockText(outputLanguage, 'sentence', `Explanation for API MCQ ${index + 1}`, 1),
            points: 5,
          };
        } else { 
          return {
            id: `api-q-${index + 1}`,
            type: 'subjective',
            question: apiQ.question,
            correctAnswer: apiQ.answer,
            explanation: getMockText(outputLanguage, 'sentence', `Explanation for API One-Word ${index + 1}`, 1),
            points: 10,
          };
        }
      });

      generatedQuiz = {
        id: `api-quiz-${Date.now()}`,
        title: getMockText(outputLanguage, 'title', `${topic} Quiz (API Generated)`, 1),
        topic,
        questions,
        difficulty: 'medium',
        timeLimit: questions.length * 90,
        createdAt: new Date(),
        language: outputLanguage,
      };
    }
    
    const originalInputData: InputContent = {
        type: 'text',
        content: textContent,
        metadata: {
            outputLanguage: outputLanguage,
            title: topic,
        }
    };

    return {
      topic,
      materials,
      quiz: generatedQuiz,
      originalInput: originalInputData,
    };
  }


  // Generate complete study response with materials, quiz, and chat context (Mock version for other types)
  async generateCompleteStudyResponse(
    content: string, 
    inputType: InputContent['type'], 
    topic: string,
    outputLanguage: string = 'english',
    metadata: InputContent['metadata'] = { outputLanguage } 
  ): Promise<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    originalInput: InputContent;
  }> {
    await this.simulateProcessing(4000, 7000); 

    const materials = await this.generateStudyMaterials(content, inputType, topic, outputLanguage, metadata);
    const quiz = await this.generateQuiz(topic, 'medium', outputLanguage);
    
    const originalInputData: InputContent = {
        type: inputType,
        content: content,
        metadata: { // Ensure metadata is always an object
            ...(metadata || {}), // Spread existing metadata or an empty object
            outputLanguage: outputLanguage, // Explicitly set/override
            title: metadata?.title || topic, // Ensure title is set
        }
    };

    return {
      topic,
      materials,
      quiz,
      originalInput: originalInputData,
    };
  }

  // Generate study materials from content (Mock version)
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
      language: outputLanguage,
    });

    materials.push({
      id: `${baseId}-cheatsheet`,
      title: getMockText(outputLanguage, 'title', `${topic} Cheatsheet`, 1),
      type: 'cheatsheet',
      content: this.generateCheatsheetContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage,
    });

    materials.push({
      id: `${baseId}-flashcards`,
      title: getMockText(outputLanguage, 'title', `${topic} Flashcards`, 1),
      type: 'flashcards',
      content: this.generateFlashcardsContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage,
    });

    materials.push({
      id: `${baseId}-mindmap`,
      title: getMockText(outputLanguage, 'title', `${topic} Mind Map`, 1),
      type: 'mindmap',
      content: this.generateMindMapContent(content, topic, outputLanguage),
      topic,
      createdAt: new Date(),
      userId: 'current-user',
      language: outputLanguage,
    });

    return materials;
  }

  // This was the old mock chat response, now replaced by getAIChatResponse
  // async generateChatResponse(question: string, topic: string, content: string, outputLanguage: string): Promise<string> {
  //   await this.simulateProcessing(1000, 2500);
  //   const langPrefix = outputLanguage !== 'english' ? `[${outputLanguage.toUpperCase()}] ` : '';
  //   return `${langPrefix}AI Tutor response for '${question}' regarding ${topic}: ${getMockText(outputLanguage, 'paragraph', topic, 1)}`;
  // }

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
    const questionCount = 5; 

    for (let i = 0; i < questionCount; i++) {
      if (i % 2 === 0) { 
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
      timeLimit: questionCount * 90, 
      createdAt: new Date(),
      language: language,
    };
  }

  extractTopic(content: string, type: string): string {
    if (type === 'videolecture' && content.startsWith('mock://')) { 
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
