import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, User, Trophy, BookOpen, Users, LogOut, Settings, ListChecks, Youtube as YoutubeIcon } from 'lucide-react'; 
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { InitialStudyDataType } from '../../App';
import { useTranslation } from '../../hooks/useTranslation'; // New import

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string, studyParams?: InitialStudyDataType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: 'dashboard', labelKey: 'navbar.dashboard', icon: Brain },
    { id: 'study', labelKey: 'navbar.study', icon: BookOpen },
    { id: 'my-topics', labelKey: 'navbar.myTopics', icon: ListChecks }, 
    { id: 'live-classes', labelKey: 'navbar.liveClasses', icon: YoutubeIcon },
    { id: 'battle', labelKey: 'navbar.battle', icon: Users }, 
    { id: 'community', labelKey: 'navbar.community', icon: Users }, 
  ];

  const handleAuthClick = () => {
    if (isAuthenticated) {
      setShowUserMenu(!showUserMenu);
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Brain className="text-blue-600" size={32} />
                <span className="text-xl font-bold text-gray-900">{t('navbar.title')}</span>
              </div>

              <div className="hidden md:flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onTabChange(tab.id)}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{t(tab.labelKey)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAuthClick}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                {isAuthenticated && user ? (
                  <>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="hidden md:block font-medium">{user.name}</span>
                    <div className="hidden md:flex items-center space-x-2 bg-blue-100 px-2 py-1 rounded-full">
                      <Trophy size={14} className="text-blue-600" />
                      <span className="text-blue-700 text-sm font-medium">{user.points}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <User size={20} />
                    <span>{t('navbar.login')}</span>
                  </>
                )}
              </motion.button>

              {showUserMenu && isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                >
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2">
                    <Settings size={16} />
                    <span>{t('common.settings')}</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                  >
                    <LogOut size={16} />
                    <span>{t('common.logout')}</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => { 
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
