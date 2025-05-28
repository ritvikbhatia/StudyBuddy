import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Plus, Filter, Search, TrendingUp, Clock, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { faker } from '@faker-js/faker';
import toast from 'react-hot-toast';

export const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', topic: '', tags: '' });

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = () => {
    let communityPosts = storageService.getCommunityPosts();
    
    if (communityPosts.length === 0) {
      // Generate mock posts
      communityPosts = generateMockPosts();
      communityPosts.forEach(post => storageService.saveCommunityPost(post));
    }
    
    setPosts(communityPosts);
    setMyPosts(communityPosts.filter(post => post.author.id === user?.id));
  };

  const generateMockPosts = () => {
    const topics = ['Mathematics', 'Science', 'History', 'Literature', 'Geography', 'Physics', 'Chemistry', 'Biology'];
    const posts = [];

    for (let i = 0; i < 20; i++) {
      const topic = faker.helpers.arrayElement(topics);
      const author = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        avatar: faker.image.avatar(),
        level: faker.number.int({ min: 1, max: 10 }),
        points: faker.number.int({ min: 100, max: 5000 }),
      };

      posts.push({
        id: faker.string.uuid(),
        title: `${faker.lorem.sentence()} - ${topic}`,
        content: faker.lorem.paragraphs(2),
        topic,
        author,
        likes: faker.number.int({ min: 0, max: 50 }),
        dislikes: faker.number.int({ min: 0, max: 5 }),
        comments: faker.number.int({ min: 0, max: 20 }),
        views: faker.number.int({ min: 10, max: 200 }),
        createdAt: faker.date.recent({ days: 7 }),
        tags: faker.lorem.words(3).split(' '),
        bookmarked: false,
      });
    }

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleCreatePost = () => {
    if (!user) {
      toast.error('Please log in to create posts');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    const post = {
      id: Date.now().toString(),
      title: newPost.title,
      content: newPost.content,
      topic: newPost.topic || 'General',
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        level: user.level,
        points: user.points,
      },
      likes: 0,
      dislikes: 0,
      comments: 0,
      views: 0,
      createdAt: new Date(),
      tags: newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      bookmarked: false,
    };

    storageService.saveCommunityPost(post);
    
    storageService.addActivity({
      type: 'study',
      title: `Posted: ${post.title}`,
      points: 30,
      metadata: { topic: post.topic, postId: post.id },
    });

    storageService.updateUserStats(30, 'study');
    
    setNewPost({ title: '', content: '', topic: '', tags: '' });
    setShowCreatePost(false);
    loadCommunityData();
    toast.success('Post created successfully!');
  };

  const handleLikePost = (postId: string) => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });

    setPosts(updatedPosts);
    storageService.updateCommunityPost(postId, { likes: updatedPosts.find(p => p.id === postId)?.likes });
    toast.success('Post liked!');
  };

  const handleBookmarkPost = (postId: string) => {
    if (!user) {
      toast.error('Please log in to bookmark posts');
      return;
    }

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return { ...post, bookmarked: !post.bookmarked };
      }
      return post;
    });

    setPosts(updatedPosts);
    const post = updatedPosts.find(p => p.id === postId);
    storageService.updateCommunityPost(postId, { bookmarked: post?.bookmarked });
    toast.success(post?.bookmarked ? 'Post bookmarked!' : 'Bookmark removed!');
  };

  const topics = ['all', ...Array.from(new Set(posts.map(post => post.topic)))];

  const filteredPosts = posts
    .filter(post => {
      const matchesTopic = selectedTopic === 'all' || post.topic === selectedTopic;
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTopic && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.likes - b.dislikes) - (a.likes - a.dislikes);
        case 'trending':
          return (b.likes + b.comments + b.views) - (a.likes + a.comments + a.views);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Learning Community</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Share your knowledge, ask questions, and learn from fellow students. Build a collaborative learning environment together.
        </p>
      </motion.div>

      {/* Community Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Users className="mx-auto mb-2 text-blue-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
          <div className="text-sm text-gray-600">Total Posts</div>
        </Card>
        <Card className="p-4 text-center">
          <Heart className="mx-auto mb-2 text-red-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{posts.reduce((sum, post) => sum + post.likes, 0)}</div>
          <div className="text-sm text-gray-600">Total Likes</div>
        </Card>
        <Card className="p-4 text-center">
          <MessageCircle className="mx-auto mb-2 text-green-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{posts.reduce((sum, post) => sum + post.comments, 0)}</div>
          <div className="text-sm text-gray-600">Total Comments</div>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="mx-auto mb-2 text-purple-600" size={24} />
          <div className="text-2xl font-bold text-gray-900">{myPosts.length}</div>
          <div className="text-sm text-gray-600">My Posts</div>
        </Card>
      </div>

      {/* Create Post Button */}
      <div className="flex justify-center">
        <Button onClick={() => setShowCreatePost(true)} size="lg">
          <Plus className="mr-2" size={20} />
          Create New Post
        </Button>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Post</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Post title..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={newPost.topic}
                onChange={(e) => setNewPost(prev => ({ ...prev, topic: e.target.value }))}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Topic</option>
                {topics.filter(t => t !== 'all').map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              <input
                type="text"
                value={newPost.tags}
                onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags (comma separated)"
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your post content..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex space-x-3">
              <Button onClick={handleCreatePost} size="md">
                Create Post
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePost(false)} size="md">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {topics.map(topic => (
              <option key={topic} value={topic}>
                {topic === 'all' ? 'All Topics' : topic}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="latest">Latest</option>
            <option value="popular">Most Popular</option>
            <option value="trending">Trending</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 flex-1">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{post.author.name}</span>
                          <span>•</span>
                          <span>Level {post.author.level}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                          <span>•</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                            {post.topic}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {post.content.length > 300 ? `${post.content.substring(0, 300)}...` : post.content}
                    </p>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag: string, index: number) => (
                          <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Heart size={16} className={post.likes > 0 ? 'fill-current text-red-600' : ''} />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <MessageCircle size={16} />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <span className="text-sm">{post.views} views</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleBookmarkPost(post.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            post.bookmarked ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Bookmark size={16} />
                        </button>
                        <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card className="p-8 text-center">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Posts Found</h3>
            <p className="text-gray-600 mb-4">Be the first to share your knowledge with the community!</p>
            <Button onClick={() => setShowCreatePost(true)}>
              Create First Post
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
