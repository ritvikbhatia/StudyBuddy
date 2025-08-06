import { faker } from '@faker-js/faker';
import { StudyMaterial, Question, Quiz, InputContent, ApiGenerateStudyMaterialsResponse, ApiQuizQuestion, ApiFlashcard, ApiMindMapNode, ApiAIChatResponseTopLevel, ApiLiveQuestionsResponseTopLevel, ApiLiveQuestionItem, ApiStudyMaterialsData, ApiGenerateStudyMaterialsDataNested } from '../types';
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

  // AI Chat API
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

      if (response.data && response.data.status_code === 201 && response.data.data && response.data.data.success && typeof response.data.data.data === 'string') {
        return response.data.data.data; 
      } else {
        console.error('AI Chat API Error - Unexpected response structure:', response.data);
        const errorMsg = response.data?.message || response.data?.data?.message || 'Failed to get AI chat response due to unexpected data format.';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('AI Chat API Network/Request Error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.data?.message || error.message || 'Network error or server issue with AI Chat API.';
      throw new Error(errorMessage);
    }
  }

  // Live Questions API
  async generateLiveQuestionsAPI(context: string, count: number, outputLanguage: string = 'english'): Promise<Question[]> {
    const apiUrl = 'https://qbg-backend-stage.penpencil.co/qbg/internal/live-questions';
    const payload = {
      context,
      count: count.toString(), 
    };

    try {
      const response = await axios.post<ApiLiveQuestionsResponseTopLevel>(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.status_code === 201 && response.data.data && response.data.data.success && Array.isArray(response.data.data.data)) {
        const apiQuestions: ApiLiveQuestionItem[] = response.data.data.data;
        return apiQuestions.map((apiQ: ApiLiveQuestionItem, index: number): Question => {
          if (apiQ.type === 'mcq') {
            const correctAnswerIndex = apiQ.options?.findIndex(opt => opt === apiQ.answer) ?? -1;
            return {
              id: `live-q-${Date.now()}-${index}`,
              type: 'mcq',
              question: apiQ.question,
              options: apiQ.options || [],
              correctAnswer: correctAnswerIndex !== -1 ? correctAnswerIndex : 0, 
              explanation: getMockText(outputLanguage, 'sentence', `Explanation for API MCQ ${index + 1}`, 1),
              points: 5,
            };
          } else { // Assuming 'one-word' or other types are treated as subjective
            return {
              id: `live-q-${Date.now()}-${index}`,
              type: 'subjective',
              question: apiQ.question,
              correctAnswer: apiQ.answer,
              explanation: getMockText(outputLanguage, 'sentence', `Explanation for API Subjective ${index + 1}`, 1),
              points: 10,
            };
          }
        });
      } else {
        console.error('Live Questions API Error - Unexpected response structure:', response.data);
        const errorMsg = response.data?.message || response.data?.data?.message || 'Failed to generate live questions due to unexpected data format.';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Live Questions API Network/Request Error:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.data?.message || error.message || 'Network error or server issue with Live Questions API.';
      throw new Error(errorMessage);
    }
  }


  // External API for generating study materials from various content types
  async generateStudyMaterialsFromExternalAPI(
    inputType: 'text' | 'ytVideo' | 'audio' | 'doc',
    contentValue: string | File, 
    topic: string,
    language: string = 'english' 
  ): Promise<{
    topic: string;
    materials: StudyMaterial[];
    quiz: Quiz | null;
    originalInput: InputContent;
  }> {
    const apiUrl = 'https://qbg-backend-stage.penpencil.co/qbg/internal/generate-all-study-materials';
    const formData = new FormData();
    formData.append('contentType', inputType);
    formData.append('topic', topic); 
    formData.append('language', language);

    if (contentValue instanceof File) {
      formData.append('content', contentValue, contentValue.name);
    } else {
      formData.append('content', contentValue);
    }
    
    console.log("Calling External API with FormData fields:", {
        contentType: inputType,
        contentName: contentValue instanceof File ? contentValue.name : "string_content",
        contentSize: contentValue instanceof File ? contentValue.size : (contentValue as string).length,
        topic: topic,
        language: language
    });

    const originalInputData: InputContent = {
      type: inputType === 'ytVideo' ? 'youtube' : inputType,
      content: contentValue instanceof File ? contentValue.name : contentValue,
      metadata: {
          outputLanguage: language, title: topic, 
          fileName: contentValue instanceof File ? contentValue.name : undefined,
          fileSize: contentValue instanceof File ? contentValue.size : undefined,
      }
    };
    
    const response = await axios.post<ApiGenerateStudyMaterialsResponse>(apiUrl, formData, {
      // Axios automatically sets 'Content-Type': 'multipart/form-data' for FormData
    });
    
    console.log("Full API Response in generateStudyMaterialsFromExternalAPI:", JSON.stringify(response.data, null, 2));

    const apiTopLevelMessage = response.data?.message;
    const apiStatusCode = response.data?.status_code;
    
    const nestedResponseData = response.data?.data; // This is ApiGenerateStudyMaterialsDataNested
    const apiNestedSuccessFlag = nestedResponseData?.success;
    const apiNestedMessage = nestedResponseData?.message;
    const apiPayload = nestedResponseData?.data; // This is ApiStudyMaterialsData

    if (apiStatusCode !== 201 || apiNestedSuccessFlag !== true || !apiPayload || typeof apiPayload !== 'object') {
      let errorMessageToThrow = apiNestedMessage || apiTopLevelMessage || 'Failed to generate study materials. API response indicates failure or missing data.';
      if (apiStatusCode === 201 && apiNestedSuccessFlag === true && (!apiPayload || typeof apiPayload !== 'object')) {
        errorMessageToThrow = "API Error: Reported success but core data payload (mindmap, quiz etc.) is missing or not an object.";
      }
      console.error(errorMessageToThrow, "Full API Response:", response.data);
      throw new Error(errorMessageToThrow);
    }
    
    // At this point, API reported overall success and provided the main data structure
    const materials: StudyMaterial[] = [];
    let generatedQuiz: Quiz | null = null;
    const baseId = `api-${Date.now()}`;

    // Mindmap processing
    if (apiPayload.mindmap && typeof apiPayload.mindmap === 'object' && apiPayload.mindmap.id) {
      materials.push({
        id: `${baseId}-mindmap`, title: getMockText(language, 'title', `${topic} Mind Map`, 1), type: 'mindmap',
        content: apiPayload.mindmap, topic, createdAt: new Date(), userId: 'current-user', language: language,
      });
    } else {
      console.warn("Mindmap data missing or invalid in API response.", apiPayload.mindmap);
    }

    // Flashcards processing
    let parsedFlashcards: ApiFlashcard[] = [];
    if (apiPayload.flashcards) {
      if (typeof apiPayload.flashcards === 'string') {
        try {
          parsedFlashcards = JSON.parse(apiPayload.flashcards);
          if (!Array.isArray(parsedFlashcards)) {
            console.warn("Parsed flashcards from string is not an array, defaulting to empty. Original string:", apiPayload.flashcards);
            parsedFlashcards = [];
          }
        } catch (e) {
          console.warn("Failed to parse flashcards string from API, defaulting to empty. String was:", apiPayload.flashcards, "Error:", e);
          parsedFlashcards = [];
        }
      } else if (Array.isArray(apiPayload.flashcards)) {
        parsedFlashcards = apiPayload.flashcards;
      } else {
        console.warn("Flashcards data is not a string or array, skipping.", apiPayload.flashcards);
      }

      if (parsedFlashcards.length > 0) {
        materials.push({
          id: `${baseId}-flashcards`, title: getMockText(language, 'title', `${topic} Flashcards`, 1), type: 'flashcards',
          content: {
            cards: parsedFlashcards.map((fc: ApiFlashcard, index: number) => ({
              id: `${baseId}-fc-${index + 1}`, question: fc.question, answer: fc.answer,
              difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
            })),
          }, topic, createdAt: new Date(), userId: 'current-user', language: language,
        });
      }
    } else {
        console.warn("Flashcards data missing in API response.");
    }


    // Summary processing
    if (apiPayload.summary && typeof apiPayload.summary.text === 'string' && apiPayload.summary.text.trim() !== '') {
      materials.push({
        id: `${baseId}-summary`, title: getMockText(language, 'title', `${topic} Summary`, 1), type: 'summary',
        content: apiPayload.summary.text, topic, createdAt: new Date(), userId: 'current-user', language: language,
      });
    } else {
      console.warn("Summary data missing or invalid in API response.", apiPayload.summary);
    }
    
    // Quiz processing
    if (apiPayload.quiz && Array.isArray(apiPayload.quiz) && apiPayload.quiz.length > 0) {
      const questions: Question[] = [];
      apiPayload.quiz.forEach((apiQ: ApiQuizQuestion, index: number) => {
        if (!apiQ || !apiQ.question) {
          console.warn(`Malformed quiz question at index ${index}, skipping.`, apiQ);
          return;
        }
        if (apiQ.type === 'mcq') {
          if (!Array.isArray(apiQ.options) || apiQ.options.length === 0) {
            console.warn(`MCQ question "${apiQ.question}" at index ${index} has no options, skipping.`, apiQ);
            return;
          }
          const correctAnswerIndex = apiQ.options.findIndex(opt => opt === apiQ.answer);
          if (correctAnswerIndex === -1) {
            console.warn(`MCQ answer "${apiQ.answer}" not found in options for question "${apiQ.question}" at index ${index}. Defaulting to first option.`, apiQ);
          }
          questions.push({
            id: `${baseId}-q-${index + 1}`, type: 'mcq', question: apiQ.question, options: apiQ.options,
            correctAnswer: correctAnswerIndex !== -1 ? correctAnswerIndex : 0, 
            explanation: getMockText(language, 'sentence', `Explanation for API MCQ ${index + 1}`, 1), points: 5,
          });
        } else if (apiQ.type === 'one-word') {
          questions.push({
            id: `${baseId}-q-${index + 1}`, type: 'subjective', question: apiQ.question, correctAnswer: apiQ.answer,
            explanation: getMockText(language, 'sentence', `Explanation for API One-Word ${index + 1}`, 1), points: 10,
          });
        } else {
           console.warn(`Unknown quiz question type "${apiQ.type}" at index ${index}, skipping.`, apiQ);
        }
      });

      if (questions.length > 0) {
        generatedQuiz = {
          id: `${baseId}-quiz`, title: getMockText(language, 'title', `${topic} Quiz (API Generated)`, 1), topic, questions,
          difficulty: 'medium', timeLimit: questions.length * 90, createdAt: new Date(), language: language,
        };
      } else {
        console.warn("No valid quiz questions could be processed from API response despite quiz array being present.");
      }
    } else {
      console.warn("Quiz data missing or empty in API response.", apiPayload.quiz);
    }
    
    // If, after all processing, no materials or quiz were generated, return empty
    if (materials.length === 0 && !generatedQuiz) {
        console.warn("API indicated success, but no usable study materials or quiz could be generated from the payload. Returning empty structure.", apiPayload);
        return { topic, materials: [], quiz: null, originalInput: originalInputData };
    }

    return { topic, materials, quiz: generatedQuiz, originalInput: originalInputData };
  }

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
        type: inputType, content: content,
        metadata: { ...(metadata || {}), outputLanguage: outputLanguage, title: metadata?.title || topic }
    };
    return { topic, materials, quiz, originalInput: originalInputData };
  }

  async generateStudyMaterials(
    content: string, type: string, topic: string, outputLanguage: string, metadata: any 
  ): Promise<StudyMaterial[]> {
    await this.simulateProcessing(2000, 4000);
    const materials: StudyMaterial[] = [];
    const baseId = `mock-${Date.now()}`;
    materials.push({
      id: `${baseId}-summary`, title: getMockText(outputLanguage, 'title', `${topic} Summary`, 1), type: 'summary',
      content: this.generateSummaryContent(content, topic, outputLanguage), topic, createdAt: new Date(), userId: 'current-user', language: outputLanguage,
    });
    materials.push({
      id: `${baseId}-cheatsheet`, title: getMockText(outputLanguage, 'title', `${topic} Cheatsheet`, 1), type: 'cheatsheet',
      content: this.generateCheatsheetContent(content, topic, outputLanguage), topic, createdAt: new Date(), userId: 'current-user', language: outputLanguage,
    });
    materials.push({
      id: `${baseId}-flashcards`, title: getMockText(outputLanguage, 'title', `${topic} Flashcards`, 1), type: 'flashcards',
      content: this.generateFlashcardsContent(content, topic, outputLanguage), topic, createdAt: new Date(), userId: 'current-user', language: outputLanguage,
    });
    materials.push({
      id: `${baseId}-mindmap`, title: getMockText(outputLanguage, 'title', `${topic} Mind Map`, 1), type: 'mindmap',
      content: this.generateMindMapContent(content, topic, outputLanguage), topic, createdAt: new Date(), userId: 'current-user', language: outputLanguage,
    });
    return materials;
  }

  private generateSummaryContent(content: string, topic: string, language: string): string {
    return `# ${getMockText(language, 'title', `${topic} Summary`, 1)}\n\n## ${getMockText(language, 'words', 'Key Concepts', 2)}\n• ${getMockText(language, 'sentence', topic, 1)}\n• ${getMockText(language, 'sentence', topic, 1)}\n\n## ${getMockText(language, 'words', 'Important Points', 2)}\n${getMockText(language, 'paragraph', topic, 1)}\n\n## ${getMockText(language, 'words', 'Detailed Explanation', 2)}\n${getMockText(language, 'paragraph', topic, 2)}`;
  }

  private generateCheatsheetContent(content: string, topic: string, language: string): string {
    return `# ${getMockText(language, 'title', `${topic} Cheatsheet`, 1)}\n\n## ${getMockText(language, 'words', 'Formulas', 1)}\n• ${getMockText(language, 'sentence', 'Formula 1', 1)}\n• ${getMockText(language, 'sentence', 'Formula 2', 1)}\n\n## ${getMockText(language, 'words', 'Definitions', 1)}\n**${getMockText(language, 'words', 'Term 1', 1)}**: ${getMockText(language, 'sentence', 'Definition 1', 1)}\n**${getMockText(language, 'words', 'Term 2', 1)}**: ${getMockText(language, 'sentence', 'Definition 2', 1)}`;
  }

  private generateFlashcardsContent(content: string, topic: string, language: string): any {
    return {
      cards: Array.from({ length: 3 }).map((_, i) => ({
        id: `mock-fc-${i + 1}`, question: `${getMockText(language, 'sentence', `Question ${i+1} for ${topic}`, 1)}?`,
        answer: getMockText(language, 'sentence', `Answer ${i+1} for ${topic}`, 1),
        difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
      }))
    };
  }

  private generateMindMapContent(content: string, topic: string, language: string): any {
    return {
      id: "root", title: getMockText(language, 'words', topic, 1), x: 400, y: 300, color: "#3b82f6",
      children: Array.from({ length: 3 }).map((_, i) => ({
        id: `child${i+1}`, title: getMockText(language, 'words', `Branch ${i+1}`, 2), x: 200 + i * 100, y: 150 + i * 50, color: faker.color.rgb(),
        children: Array.from({ length: 2 }).map((__, j) => ({
          id: `subchild${i+1}-${j+1}`, title: getMockText(language, 'words', `Subtopic ${j+1}`, 2), x: 100 + j * 50, y: 100 + j * 30, color: faker.color.rgb(), children: []
        }))
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
          id: `mock-q-${i + 1}`, type: 'subjective', question: getMockText(language, 'sentence', `Explain concept ${i+1} in ${topic}`, 1),
          correctAnswer: getMockText(language, 'paragraph', `Correct answer for concept ${i+1}`, 1),
          explanation: getMockText(language, 'sentence', `Explanation for concept ${i+1}`, 1), points: 10,
        });
      } else { 
        questions.push({
          id: `mock-q-${i + 1}`, type: 'mcq', question: getMockText(language, 'sentence', `Which describes ${topic} aspect ${i+1}`, 1) + '?',
          options: Array.from({length: 4}).map((_, optIdx) => getMockText(language, 'sentence', `Option ${optIdx+1}`, 1)),
          correctAnswer: faker.number.int({ min: 0, max: 3 }),
          explanation: getMockText(language, 'sentence', `Explanation for MCQ ${i+1}`, 1), points: 5,
        });
      }
    }
    return {
      id: `mock-quiz-${Date.now()}`, title: getMockText(language, 'title', `${topic} Quiz (${difficulty})`, 1), topic, questions,
      difficulty, timeLimit: questionCount * 90, createdAt: new Date(), language: language,
    };
  }

  async generateAudioFromText(text: string): Promise<Blob> {
    const apiUrl = 'https://2382acbb9ef6.ngrok-free.app/v1/generate-audio-from-text';
    const payload = { text };
    try {
      const response = await axios.post<Blob>(apiUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'blob',
      });
      if (response.status === 200 && response.data instanceof Blob && response.data.type.startsWith('audio/')) {
        return response.data;
      } else {
        let errorMessage = 'API returned unexpected response or non-audio content.';
        if (response.data instanceof Blob && !response.data.type.startsWith('audio/')) {
            errorMessage = `API returned a Blob, but it's not an audio type. Received: ${response.data.type}`;
        } else if (response.data) {
            try {
                const errorText = await (response.data as any).text(); 
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) { /* ignore parsing error, stick with generic message */ }
        }
        console.error('Audio Generation API Error - Details:', { status: response.status, type: response.data?.type, data: response.data });
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Full Audio Generation API Error Object:', error);
      let errorMessage = 'Network error or server issue with Audio Generation API.';
      if (error.response) {
        console.error('Audio API Response Error Status:', error.response.status);
        console.error('Audio API Response Headers:', error.response.headers);
        if (error.response.data) {
          if (error.response.data instanceof Blob) {
            try {
              const errorText = await error.response.data.text();
              console.error('Audio API Error Blob Content (as text):', errorText);
              try {
                const jsonData = JSON.parse(errorText);
                errorMessage = jsonData?.message ? `Server Error: ${jsonData.message}` : `Server responded with an error (Blob): ${errorText.substring(0,150)}`;
              } catch (jsonParseError) {
                errorMessage = `Server responded with an unparseable error (Blob): ${errorText.substring(0,150)}`;
              }
            } catch (blobReadError) {
              errorMessage = `Server responded with an unreadable error (Blob, status ${error.response.status}).`;
            }
          } else if (typeof error.response.data === 'object' && error.response.data !== null && (error.response.data as any).message) {
            errorMessage = `Server Error: ${(error.response.data as any).message}`;
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          }
        }
      } else if (error.request) {
        errorMessage = 'No response from audio server. It might be down, unreachable (check ngrok), or a CORS issue.';
      } else {
        errorMessage = `Error setting up request: ${error.message}`;
      }
      throw new Error(errorMessage);
    }
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
