import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, User, Trophy, BookOpen, Users, LogOut, Settings, ListChecks, Radio, Menu as MenuIcon, X as XIcon, Coins } from 'lucide-react'; 
import { useAuth } from '../../context/AuthContext';
import { InitialStudyDataType } from '../../App';
import { useTranslation } from '../../hooks/useTranslation';
import { SettingsModal } from '../settings/SettingsModal';

export type NavParamsType = {
  studyParams?: InitialStudyDataType;
  channelId?: string;
  channelName?: string;
  battleParams?: { topic: string; context: string; }; 
};

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string, navParams?: NavParamsType) => void; 
  onOpenAuthModal: () => void; 
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, onOpenAuthModal }) => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', labelKey: 'navbar.dashboard', icon: Brain },
    { id: 'study', labelKey: 'navbar.study', icon: BookOpen },
    { id: 'my-topics', labelKey: 'navbar.topics', icon: ListChecks }, 
    { id: 'live-classes', labelKey: 'navbar.live', icon: Radio }, 
    { id: 'battle', labelKey: 'navbar.battle', icon: Users }, 
    { id: 'community', labelKey: 'navbar.community', icon: Users }, 
  ];

  const handleAuthClick = () => {
    if (isAuthenticated) {
      setShowUserMenu(!showUserMenu);
    } else {
      onOpenAuthModal(); 
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  const handleOpenSettings = () => {
    setShowSettingsModal(true);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  const handleTabClick = (tabId: string, navParams?: NavParamsType) => {
    onTabChange(tabId, navParams);
    setMobileMenuOpen(false); // Close mobile menu on tab click
  };

  const handleRedeemClick = () => {
    onTabChange('redeem');
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleTabClick('dashboard')}>
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
                      onClick={() => handleTabClick(tab.id)} 
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={18} className="mr-1.5" />
                      <span>{t(tab.labelKey)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center">
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAuthClick}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  {isAuthenticated && user ? (
                    <>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-blue-200"
                      />
                      <span className="hidden md:block font-medium text-gray-700">{user.name}</span>
                      <div className="hidden md:flex items-center space-x-2 bg-blue-100 px-2 py-1 rounded-full">
                        <Trophy size={14} className="text-blue-600" />
                        <span className="text-blue-700 text-xs font-medium">{user.points}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <User size={20} className="text-gray-700 mr-1.5"/>
                      <span className="font-medium text-gray-700">{t('navbar.login')}</span>
                    </>
                  )}
                </motion.button>

                {showUserMenu && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-50"
                  >
                    <button 
                      onClick={handleOpenSettings}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2.5"
                    >
                      <Settings size={16} className="mr-1.5" />
                      <span>{t('common.settings')}</span>
                    </button>
                    <button 
                      onClick={handleRedeemClick}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2.5"
                    >
                      <Coins size={16} className="mr-1.5" />
                      <span>{t('navbar.redeem')}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2.5"
                    >
                      <LogOut size={16} className="mr-1.5" />
                      <span>{t('common.logout')}</span>
                    </button>
                  </motion.div>
                )}
              </div>
              <div className="md:hidden ml-2">
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                      {mobileMenuOpen ? <XIcon size={24}/> : <MenuIcon size={24}/>}
                  </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
        {mobileMenuOpen && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-gray-200 bg-white shadow-md"
            >
              <div className="py-2 px-2 space-y-1">
                {tabs.map((tab) => { 
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} className="mr-1.5" />
                      <span>{t(tab.labelKey)}</span>
                    </button>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-gray-200">
                   {isAuthenticated && (
                     <>
                        <button 
                            onClick={handleOpenSettings}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Settings size={20} className="mr-1.5" />
                            <span>{t('common.settings')}</span>
                        </button>
                        <button 
                            onClick={handleRedeemClick}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Coins size={20} className="mr-1.5" />
                            <span>{t('navbar.redeem')}</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <LogOut size={20} className="mr-1.5" />
                            <span>{t('common.logout')}</span>
                        </button>
                     </>
                   )}
                </div>
              </div>
            </motion.div>
        )}
        </AnimatePresence>
      </nav>
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  );
};
