import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Lightbulb, Brain, Users, MessageSquareText, PlayCircle, ArrowRight, ShieldCheck, BookOpen, BarChart3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTranslation } from '../../hooks/useTranslation';

interface LandingPageProps {
  onOpenAuthModal: () => void;
}

const featureVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const textVariant = (delay: number = 0) => ({
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay, duration: 0.6, ease: "easeOut" } }
});

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuthModal }) => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Brain size={32} className="text-purple-500" />,
      titleKey: "landing.feature1Title",
      descriptionKey: "landing.feature1Desc"
    },
    {
      icon: <Lightbulb size={32} className="text-yellow-500" />,
      titleKey: "landing.feature2Title",
      descriptionKey: "landing.feature2Desc"
    },
    {
      icon: <ShieldCheck size={32} className="text-green-500" />,
      titleKey: "landing.feature3Title",
      descriptionKey: "landing.feature3Desc"
    },
    {
      icon: <Users size={32} className="text-red-500" />,
      titleKey: "landing.feature4Title",
      descriptionKey: "landing.feature4Desc"
    },
    {
      icon: <PlayCircle size={32} className="text-pink-500" />,
      titleKey: "landing.feature5Title",
      descriptionKey: "landing.feature5Desc"
    },
    {
      icon: <MessageSquareText size={32} className="text-teal-500" />,
      titleKey: "landing.feature6Title",
      descriptionKey: "landing.feature6Desc"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 text-gray-800 overflow-x-hidden">
      {/* Hero Section */}
      <motion.section 
        className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="absolute inset-0 opacity-10"
          animate={{ 
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at top left, rgba(168, 85, 247, 0.1) 0%, transparent 40%), radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.1) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10">
          <motion.div variants={textVariant(0.2)} className="inline-block bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 shadow-sm">
            {t('landing.heroTag')}
          </motion.div>
          <motion.h1 
            variants={textVariant(0.4)} 
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-6 leading-tight"
          >
            {t('landing.heroTitle')}
          </motion.h1>
          <motion.p 
            variants={textVariant(0.6)} 
            className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-10"
          >
            {t('landing.heroSubtitle')}
          </motion.p>
          <motion.div variants={textVariant(0.8)} className="flex justify-center"> {/* Centered button */}
            <Button size="lg" onClick={onOpenAuthModal} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transform hover:scale-105 transition-transform duration-300 px-10 py-4 text-lg">
              {t('landing.heroCta')} <ArrowRight size={20} className="ml-2" />
            </Button>
          </motion.div>
        </div>
         <motion.div 
            className="absolute -bottom-1/4 left-0 right-0 h-1/2 bg-white opacity-50"
            style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 50% 20%, 0 0)'}}
        />
      </motion.section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" animate="visible" variants={textVariant()}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">{t('landing.featuresSubtitle')}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div key={index} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={featureVariants}>
                <Card className="p-6 sm:p-8 h-full hover:shadow-blue-200 transition-shadow duration-300 border-gray-200 hover:border-blue-300">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl mb-6 shadow-md">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(feature.titleKey)}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{t(feature.descriptionKey)}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section (Simplified) */}
      <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <motion.h2 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={textVariant()}
                className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              >
                {t('landing.howItWorksTitle')}
              </motion.h2>
              <motion.p 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={textVariant(0.2)}
                className="text-lg text-gray-600 mb-12"
              >
                {t('landing.howItWorksSubtitle')}
              </motion.p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                      { icon: <BookOpen size={36} className="text-blue-500"/>, titleKey: "landing.step1Title", descKey: "landing.step1Desc" },
                      { icon: <Zap size={36} className="text-purple-500"/>, titleKey: "landing.step2Title", descKey: "landing.step2Desc" },
                      { icon: <BarChart3 size={36} className="text-green-500"/>, titleKey: "landing.step3Title", descKey: "landing.step3Desc" }
                  ].map((step, index) => (
                      <motion.div 
                        key={index} 
                        custom={index} 
                        initial="hidden" 
                        whileInView="visible" 
                        viewport={{ once: true, amount: 0.5 }} 
                        variants={featureVariants}
                        className="p-6"
                      >
                          <div className="flex justify-center mb-4">
                              {step.icon}
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t(step.titleKey)}</h3>
                          <p className="text-gray-600 text-sm">{t(step.descKey)}</p>
                      </motion.div>
                  ))}
              </div>
          </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={textVariant()}
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.ctaTitle')}</h2>
          <p className="text-lg md:text-xl text-blue-200 mb-10"> {/* Changed text color */}
            {t('landing.ctaSubtitle')}
          </p>
          <div className="flex justify-center"> {/* Centered button */}
            <Button size="lg" onClick={onOpenAuthModal} className="bg-white !text-black hover:bg-gray-100 shadow-lg transform hover:scale-105 transition-transform duration-300 px-10 py-4 text-lg font-semibold">
              {t('landing.ctaButton')} <Zap size={20} className="ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 text-gray-400 text-center">
        <p>&copy; {new Date().getFullYear()} {t('landing.footerText', { appName: "Study Room" })}. {t('landing.footerRights')}</p>
      </footer>
    </div>
  );
};
