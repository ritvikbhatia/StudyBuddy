import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, ArrowRight, GraduationCap, Briefcase, Users, BookCopy, Target, Check, Loader2, Languages as LanguageIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { storageService } from '../../services/storageService';
import { User } from '../../types';
import { faker } from '@faker-js/faker';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation'; // New import

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SignupStep = 'otpInput' | 'otpVerify' | 'role' | 'academicLevel' | 'examPreference' | 'languagePreference' | 'personalizing';

const academicLevels = [
  { id: 'class_1_5', key: 'academicLevel.class1_5', label: 'Class 1-5' },
  { id: 'class_6_8', key: 'academicLevel.class6_8', label: 'Class 6-8' },
  { id: 'class_9_10', key: 'academicLevel.class9_10', label: 'Class 9-10' },
  { id: 'class_11_12', key: 'academicLevel.class11_12', label: 'Class 11-12' },
  { id: 'dropper', key: 'academicLevel.dropper', label: 'Dropper' },
  { id: 'graduate', key: 'academicLevel.graduate', label: 'Graduate' },
];

const examPreferencesOptions = [
  { id: 'jee', key: 'exam.jee', label: 'JEE (Main & Advanced)' },
  { id: 'neet', key: 'exam.neet', label: 'NEET (UG)' },
  { id: 'ias', key: 'exam.ias', label: 'IAS (Civil Services)' },
  { id: 'cbse_boards', key: 'exam.cbse', label: 'CBSE Boards (X/XII)' },
  { id: 'state_boards', key: 'exam.state', label: 'State Boards' },
  { id: 'olympiads', key: 'exam.olympiads', label: 'Olympiads (Science/Math)' },
  { id: 'other_competitive', key: 'exam.other', label: 'Other Competitive Exams' },
];

const languageOptions = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'ta', label: 'தமிழ் (Tamil)' },
  { id: 'te', label: 'తెలుగు (Telugu)' },
  { id: 'bn', label: 'বাংলা (Bengali)' },
  { id: 'mr', label: 'मराठी (Marathi)' },
];

const personalizationMessagesKeys = [
  "personalizing.message1",
  "personalizing.message2",
  "personalizing.message3",
  "personalizing.message4"
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(); // Initialize translation hook
  const [signupStep, setSignupStep] = useState<SignupStep>('otpInput');
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user: authUser, setPreferredLanguageState: setGlobalPreferredLanguage } = useAuth();

  const [selectedRole, setSelectedRole] = useState<User['role'] | null>(null);
  const [selectedAcademicLevel, setSelectedAcademicLevel] = useState<string | null>(null);
  const [selectedExamPreferences, setSelectedExamPreferences] = useState<string[]>([]);
  const [selectedUiLanguage, setSelectedUiLanguage] = useState<string>('en');
  const [tempUserData, setTempUserData] = useState<Partial<User> | null>(null);
  const [personalizationMsgIndex, setPersonalizationMsgIndex] = useState(0);

  useEffect(() => {
    if (isOpen && authUser?.isProfileComplete) {
      onClose();
    }
  }, [isOpen, authUser, onClose]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (signupStep === 'personalizing') {
      setPersonalizationMsgIndex(0);
      interval = setInterval(() => {
        setPersonalizationMsgIndex(prevIndex => (prevIndex + 1) % personalizationMessagesKeys.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [signupStep]);

  const handleSendOTP = async () => {
    if (!contact) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setSignupStep('otpVerify');
    toast.success(`${t('toast.otpSentTo')} ${contact}`);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error(t('toast.invalidOtp'));
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    let userData = storageService.getUser(); 
    let isNewUser = !userData;

    if (isNewUser) {
      const newUserData: User = {
        id: faker.string.uuid(),
        [inputType]: contact,
        name: "Ritvik Bhatia",
        avatar: faker.image.avatar(),
        points: 0,
        level: 1,
        streak: 0,
        joinedAt: new Date(),
        isProfileComplete: false,
        preferredLanguage: 'en', // Default, will be set later
      };
      setTempUserData(newUserData);
      setSignupStep('academicLevel');
    } else if (userData && !userData.isProfileComplete) {
      setTempUserData(userData);
      setSelectedUiLanguage(userData.preferredLanguage || 'en'); // Pre-fill if exists
      setSignupStep('academicLevel');
    } else if (userData && userData.isProfileComplete) {
      login(userData);
      toast.success(`${t('toast.welcomeToApp')}, ${userData.name}!`);
      onClose();
      resetModalState();
    }
    setLoading(false);
  };

  const handleRoleSelect = (role: User['role']) => {
    setSelectedRole(role);
    if (role === 'student') {
      setSignupStep('academicLevel');
    } else {
      setSignupStep('languagePreference'); // Teacher/Parent go to language selection
    }
  };

  const handleAcademicLevelSelect = (level: string) => {
    setSelectedAcademicLevel(level);
    setSignupStep('examPreference');
  };
  
  const handleExamPreferenceToggle = (examLabelKey: string) => { // Use key for internal tracking
    const examLabel = t(examLabelKey); // Get translated label for storage
    setSelectedExamPreferences(prev => 
      prev.includes(examLabel) ? prev.filter(e => e !== examLabel) : [...prev, examLabel]
    );
  };

  const handleExamPreferenceContinue = () => {
    setSignupStep('languagePreference');
  };

  const handleLanguageSelect = (langId: string) => {
    setSelectedUiLanguage(langId);
  };
  
  const handleLanguagePreferenceContinue = () => {
    setSignupStep('personalizing');
    finalizeSignup(selectedRole, selectedAcademicLevel, selectedExamPreferences, selectedUiLanguage);
  };

  const finalizeSignup = async (
    role: User['role'] | null, 
    academicLevel: string | null, 
    examPreferences: string[],
    preferredLanguage: string
  ) => {
    if (!tempUserData) {
      toast.error(t('toast.genericError'));
      resetModalState();
      setSignupStep('otpInput');
      return;
    }

    const completeUserData: User = {
      ...tempUserData,
      role: role || undefined,
      academicLevel: academicLevel || undefined,
      examPreferences: examPreferences.length > 0 ? examPreferences : undefined,
      preferredLanguage: preferredLanguage,
      isProfileComplete: true,
    } as User;
    
    await new Promise(resolve => setTimeout(resolve, 4000)); 

    storageService.setUser(completeUserData);
    login(completeUserData); // This will also set global preferredLanguage in AuthContext
    setGlobalPreferredLanguage(preferredLanguage); // Explicitly set for immediate effect
    
    toast.success(t('toast.welcomeToApp'));
    if (tempUserData.name === "Ritvik Bhatia") {
        storageService.addActivity({
            type: 'study',
            title: t('activity.profileSetup'),
            points: 10,
        });
        storageService.updateUserStats(10, 'study');
    }
    onClose();
    resetModalState();
  };

  const resetModalState = () => {
    setSignupStep('otpInput');
    setContact('');
    setOtp('');
    setSelectedRole(null);
    setSelectedAcademicLevel(null);
    setSelectedExamPreferences([]);
    setSelectedUiLanguage('en');
    setTempUserData(null);
    setLoading(false);
  };
  
  const handleCloseAndReset = () => {
    resetModalState();
    onClose();
  };

  const renderOtpInputStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.welcome')}</h2>
      <div className="flex space-x-2">
        <Button
          variant={inputType === 'email' ? 'primary' : 'outline'}
          size="sm" onClick={() => setInputType('email')} className="flex-1"
        > <Mail size={16} className="mr-1" /> {t('authModal.email')} </Button>
        <Button
          variant={inputType === 'phone' ? 'primary' : 'outline'}
          size="sm" onClick={() => setInputType('phone')} className="flex-1"
        > <Phone size={16} className="mr-1" /> {t('authModal.phone')} </Button>
      </div>
      <Input
        type={inputType === 'email' ? 'email' : 'tel'}
        placeholder={inputType === 'email' ? t('authModal.enterEmail') : t('authModal.enterPhone')}
        value={contact} onChange={(e) => setContact(e.target.value)}
        icon={inputType === 'email' ? <Mail size={20} /> : <Phone size={20} />}
      />
      <Button onClick={handleSendOTP} className="w-full" loading={loading} disabled={!contact}>
        {t('authModal.sendOtp')} <ArrowRight size={16} className="ml-2" />
      </Button>
      <p className="text-sm text-gray-600 text-center">
        {t('authModal.newUserPrompt')}
      </p>
    </div>
  );

  const renderOtpVerifyStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.verifyOtpTitle')}</h2>
      <p className="text-gray-600">{t('authModal.otpSentTo')} {contact}</p>
      <Input
        type="text" placeholder={t('authModal.enterOtpPlaceholder')}
        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6} className="text-center text-2xl tracking-widest"
      />
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">{t('authModal.demoOtpInfo')}</p>
        <Button variant="ghost" size="sm" onClick={() => setOtp('123456')} className="text-blue-600">
          {t('authModal.useDemoOtp')}
        </Button>
      </div>
      <div className="flex space-x-3">
        <Button variant="outline" onClick={() => setSignupStep('otpInput')} className="flex-1">{t('common.back')}</Button>
        <Button onClick={handleVerifyOTP} className="flex-1" loading={loading} disabled={otp.length !== 6}>
          {t('authModal.verifyAndContinue')}
        </Button>
      </div>
    </div>
  );

  const renderRoleStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.selectRoleTitle')}</h2>
      <p className="text-gray-600">{t('authModal.selectRoleSubtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['student', 'teacher', 'parent'] as const).map((roleKey) => {
          const Icon = roleKey === 'student' ? GraduationCap : roleKey === 'teacher' ? Briefcase : Users;
          return (
            <Button
              key={roleKey} variant="outline" size="lg"
              className="flex flex-col items-center justify-center h-32 text-lg capitalize"
              onClick={() => handleRoleSelect(roleKey)}
            >
              <Icon size={32} className="mb-2" /> {t(`role.${roleKey}`)}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderAcademicLevelStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.academicLevelTitle')}</h2>
      <p className="text-gray-600">{t('authModal.academicLevelSubtitle')}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {academicLevels.map(level => (
          <Button
            key={level.id} variant={selectedAcademicLevel === level.id ? "primary" : "outline"} size="lg"
            className="h-20"
            onClick={() => handleAcademicLevelSelect(level.id)}
          >
            {t(level.key)}
          </Button>
        ))}
      </div>

    </div>
  );
  
  const renderExamPreferenceStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.examPreferenceTitle')}</h2>
      <p className="text-gray-600">{t('authModal.examPreferenceSubtitle')}</p>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {examPreferencesOptions.map(exam => (
          <label
            key={exam.id}
            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
              selectedExamPreferences.includes(t(exam.key)) ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedExamPreferences.includes(t(exam.key))}
              onChange={() => handleExamPreferenceToggle(exam.key)}
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-gray-700">{t(exam.key)}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={() => setSignupStep('academicLevel')}>{t('common.back')}</Button>
        <Button onClick={handleExamPreferenceContinue} size="md" disabled={selectedExamPreferences.length === 0}>
          {t('common.continue')} <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderLanguagePreferenceStep = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('authModal.languagePreferenceTitle')}</h2>
      <p className="text-gray-600">{t('authModal.languagePreferenceSubtitle')}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {languageOptions.map(lang => (
          <Button
            key={lang.id}
            variant={selectedUiLanguage === lang.id ? "primary" : "outline"}
            size="lg"
            className="h-20"
            onClick={() => handleLanguageSelect(lang.id)}
          >
            {lang.label}
          </Button>
        ))}
      </div>
      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={() => setSignupStep(selectedRole === 'student' ? 'examPreference' : 'role')}>{t('common.back')}</Button>
        <Button onClick={handleLanguagePreferenceContinue} size="md">
          {t('common.continue')} <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPersonalizingStep = () => (
    <div className="space-y-6 text-center py-10">
      <Loader2 size={48} className="mx-auto text-blue-600 animate-spin" />
      <h2 className="text-2xl font-bold text-gray-900">
        {t(personalizationMessagesKeys[personalizationMsgIndex])}
      </h2>
      <p className="text-gray-600">{t('personalizing.subtitle')}</p>
    </div>
  );

  const renderContent = () => {
    switch (signupStep) {
      case 'otpInput': return renderOtpInputStep();
      case 'otpVerify': return renderOtpVerifyStep();
      case 'role': return renderRoleStep();
      case 'academicLevel': return renderAcademicLevelStep();
      case 'examPreference': return renderExamPreferenceStep();
      case 'languagePreference': return renderLanguagePreferenceStep();
      case 'personalizing': return renderPersonalizingStep();
      default: return renderOtpInputStep();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={signupStep !== 'personalizing' ? handleCloseAndReset : undefined}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {signupStep !== 'personalizing' && (
              <button
                onClick={handleCloseAndReset}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label={t('common.close')}
              >
                <X size={24} />
              </button>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={signupStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
