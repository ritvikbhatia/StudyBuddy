import { User, StudyMaterial, Quiz, CommunityPost, InputContent } from '../types';

class StorageService {
  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
    }
  }

  // User Management
  getUser(): User | null {
    return this.getItem<User>('user');
  }

  setUser(user: User): void {
    this.setItem('user', user);
  }

  updateUser(updates: Partial<User>): User | null {
    const user = this.getUser();
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.setUser(updatedUser);
      return updatedUser;
    }
    return null;
  }

  removeUser(): void {
    localStorage.removeItem('user');
  }

  // Study Materials
  getStudyMaterials(): StudyMaterial[] {
    return this.getItem<StudyMaterial[]>('studyMaterials') || [];
  }

  saveStudyMaterial(material: StudyMaterial): void {
    const materials = this.getStudyMaterials();
    const existingIndex = materials.findIndex(m => m.id === material.id);
    if (existingIndex > -1) {
      materials[existingIndex] = material;
    } else {
      materials.push(material);
    }
    this.setItem('studyMaterials', materials);
  }

  deleteStudyMaterial(materialId: string): void {
    const materials = this.getStudyMaterials();
    const filtered = materials.filter(m => m.id !== materialId);
    this.setItem('studyMaterials', filtered);
  }

  getStudyMaterialsByTopic(topic: string): StudyMaterial[] {
    const materials = this.getStudyMaterials();
    return materials.filter(m => m.topic.toLowerCase() === topic.toLowerCase());
  }
  
  getUniqueTopics(): string[] {
    const materials = this.getStudyMaterials();
    return Array.from(new Set(materials.map(m => m.topic))).sort();
  }


  // Quizzes
  getAvailableQuizzes(): Quiz[] {
    return this.getItem<Quiz[]>('availableQuizzes') || [];
  }

  saveQuiz(quiz: Quiz): void {
    const quizzes = this.getAvailableQuizzes();
    const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
    if (existingIndex > -1) {
      quizzes[existingIndex] = quiz;
    } else {
      quizzes.push(quiz);
    }
    this.setItem('availableQuizzes', quizzes);
  }

  getQuizHistory(): any[] { 
    return this.getItem<any[]>('quizHistory') || [];
  }

  saveQuizResult(result: any): void { 
    const history = this.getQuizHistory();
    history.unshift(result);
    if (history.length > 50) {
      history.splice(50);
    }
    this.setItem('quizHistory', history);
  }

  // Battles
  getActiveBattles(): any[] { 
    return this.getItem<any[]>('activeBattles') || [];
  }

  saveBattle(battle: any): void { 
    const battles = this.getActiveBattles();
    const existingIndex = battles.findIndex(b => b.id === battle.id);
    if (existingIndex >= 0) {
      battles[existingIndex] = battle;
    } else {
      battles.push(battle);
    }
    this.setItem('activeBattles', battles);
  }

  getBattleHistory(userId: string): any[] {
    const allHistory = this.getItem<any[]>('battleHistoryGlobal') || [];
    return allHistory.filter(bh => bh.userId === userId).sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  saveBattleResult(result: any): void { 
    const history = this.getItem<any[]>('battleHistoryGlobal') || [];
    history.unshift(result);
    if (history.length > 100) { 
      history.splice(100);
    }
    this.setItem('battleHistoryGlobal', history);
  }


  // Community Posts
  getCommunityPosts(): any[] {
    return this.getItem<any[]>('communityPosts') || [];
  }

  saveCommunityPost(post: any): void {
    const posts = this.getCommunityPosts();
    posts.unshift(post);
    this.setItem('communityPosts', posts);
  }

  updateCommunityPost(postId: string, updates: any): void {
    const posts = this.getCommunityPosts();
    const index = posts.findIndex(p => p.id === postId);
    if (index >= 0) {
      posts[index] = { ...posts[index], ...updates };
      this.setItem('communityPosts', posts);
    }
  }

  // Activities
  addActivity(activity: {
    type: 'quiz' | 'study' | 'battle';
    title: string;
    score?: string;
    points: number;
    metadata?: any;
  }): void {
    const activities = this.getItem<any[]>('activities') || [];
    const newActivity = {
      id: Date.now().toString(),
      ...activity,
      time: new Date().toISOString(),
    };
    activities.unshift(newActivity);
    
    if (activities.length > 50) {
      activities.splice(50);
    }
    
    this.setItem('activities', activities);
  }

  getRecentActivities(limit: number = 10): any[] {
    const activities = this.getItem<any[]>('activities') || [];
    return activities.slice(0, limit);
  }

  // Statistics
  updateUserStats(points: number, type: 'quiz' | 'study' | 'battle'): void {
    const user = this.getUser();
    if (user) {
      const updatedUser = {
        ...user,
        points: user.points + points,
      };

      const newLevel = Math.floor(updatedUser.points / 1000) + 1;
      if (newLevel > user.level) {
        updatedUser.level = newLevel;
      }

      if (type === 'study' || type === 'battle' || type === 'quiz') { 
        const lastActivityDate = this.getItem<string>('lastActivityDate');
        const today = new Date().toDateString();
        
        if (lastActivityDate !== today) { 
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastActivityDate === yesterday.toDateString()) {
            updatedUser.streak = (user.streak || 0) + 1;
          } else {
            updatedUser.streak = 1; 
          }
          this.setItem('lastActivityDate', today);
        }
      }
      this.setUser(updatedUser);
    }
  }

  // Topics and Trending
  updateTopicFrequency(topic: string): void {
    const topics = this.getItem<Record<string, number>>('topicFrequency') || {};
    topics[topic] = (topics[topic] || 0) + 1;
    this.setItem('topicFrequency', topics);
  }

  getTrendingTopics(limit: number = 5): string[] {
    const topics = this.getItem<Record<string, number>>('topicFrequency') || {};
    return Object.entries(topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([topic]) => topic);
  }

  // Input History
  saveInputHistory(content: InputContent & { topic: string }): void {
    const history = this.getItem<any[]>('inputHistory') || [];
    history.unshift({
      id: Date.now().toString(),
      ...content,
      createdAt: new Date().toISOString(),
    });
    
    if (history.length > 20) {
      history.splice(20);
    }
    
    this.setItem('inputHistory', history);
  }

  getInputHistory(): any[] {
    return this.getItem<any[]>('inputHistory') || [];
  }

  getRecentStudySessions(limit: number = 6): any[] {
    const history = this.getInputHistory();
    return history.slice(0, limit);
  }

  // Study Time Tracking
  addStudyTime(minutes: number): void {
    const today = new Date().toDateString();
    const studyTimes = this.getItem<Record<string, number>>('dailyStudyTimes') || {};
    studyTimes[today] = (studyTimes[today] || 0) + minutes;
    this.setItem('dailyStudyTimes', studyTimes);
  }

  getTodayStudyTime(): number {
    const today = new Date().toDateString();
    const studyTimes = this.getItem<Record<string, number>>('dailyStudyTimes') || {};
    return studyTimes[today] || 0;
  }

  getWeeklyStudyTime(): number {
    const studyTimes = this.getItem<Record<string, number>>('dailyStudyTimes') || {};
    const today = new Date();
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      total += studyTimes[date.toDateString()] || 0;
    }
    
    return total;
  }

  clearAllData(): void {
    const keysToKeep = ['user']; 
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    const user = this.getUser();
    if (user) {
        this.setUser({ ...user, points: 0, level: 1, streak: 0 });
    }
  }
}

export const storageService = new StorageService();
