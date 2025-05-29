import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Re-using options from AuthModal for consistency
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
  { id: 'en', labelKey: 'languageOptions.en', label: 'English' },
  { id: 'hi', labelKey: 'languageOptions.hi', label: 'Hindi (हिन्दी)' },
  { id: 'ta', labelKey: 'languageOptions.ta', label: 'Tamil (தமிழ்)' },
  { id: 'te', labelKey: 'languageOptions.te', label: 'Telugu (తెలుగు)' },
  { id: 'bn', labelKey: 'languageOptions.bn', label: 'Bengali (বাংলা)' },
  { id: 'mr', labelKey: 'languageOptions.mr', label: 'Marathi (मराठी)' },
];


export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, updateUser, preferredLanguage: globalPreferredLanguage, setPreferredLanguageState } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState(globalPreferredLanguage);
  const [selectedAcademicLevel, setSelectedAcademicLevel] = useState(user?.academicLevel || '');
  const [selectedExamPreferences, setSelectedExamPreferences] = useState<string[]>(user?.examPreferences || []);

  useEffect(() => {
    if (user && isOpen) { // Only update state when modal opens or user data changes
      setSelectedLanguage(user.preferredLanguage || globalPreferredLanguage);
      setSelectedAcademicLevel(user.academicLevel || '');
      setSelectedExamPreferences(user.examPreferences || []);
    }
  }, [user, globalPreferredLanguage, isOpen]);

  const handleExamPreferenceToggle = (examLabelKey: string) => {
    const examLabel = t(examLabelKey); 
    setSelectedExamPreferences(prev => 
      prev.includes(examLabel) ? prev.filter(e => e !== examLabel) : [...prev, examLabel]
    );
  };

  const handleSaveChanges = () => {
    if (user) {
      updateUser({
        preferredLanguage: selectedLanguage,
        academicLevel: selectedAcademicLevel,
        examPreferences: selectedExamPreferences,
      });
      setPreferredLanguageState(selectedLanguage); // Update global language state immediately
      toast.success(t('toast.settingsSaved'));
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settingsModal.title')} size="lg">
      <div className="space-y-6">
        {/* Language Preference */}
        <section>
          <h3 className="text-lg font-medium text-gray-800 mb-2">{t('settingsModal.languageTitle')}</h3>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {languageOptions.map(lang => (
              <option key={lang.id} value={lang.id}>{t(lang.labelKey)}</option>
            ))}
          </select>
        </section>

        {/* Academic Level */}
        {user.role === 'student' && (
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-2">{t('settingsModal.academicLevelTitle')}</h3>
            <select
              value={selectedAcademicLevel}
              onChange={(e) => setSelectedAcademicLevel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('settingsModal.selectLevelPlaceholder')}</option>
              {academicLevels.map(level => (
                <option key={level.id} value={level.id}>{t(level.key)}</option>
              ))}
            </select>
          </section>
        )}

        {/* Exam Preferences */}
        {user.role === 'student' && (
          <section>
            <h3 className="text-lg font-medium text-gray-800 mb-3">{t('settingsModal.examPreferencesTitle')}</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {examPreferencesOptions.map(exam => (
                <label
                  key={exam.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedExamPreferences.includes(t(exam.key)) 
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
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
          </section>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveChanges}>{t('settingsModal.saveButton')}</Button>
        </div>
      </div>
    </Modal>
  );
};
