import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Gift, ShoppingBag, Zap, Star, ChevronRight, CheckCircle, Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';

const mockPromotionalBanners = [
  { id: 'banner1', titleKey: 'redeem.banner1Title', descKey: 'redeem.banner1Desc', imageUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x200/3B82F6/FFFFFF?text=Special+Offer!', ctaKey: 'redeem.bannerCtaExplore' },
  { id: 'banner2', titleKey: 'redeem.banner2Title', descKey: 'redeem.banner2Desc', imageUrl: 'https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x200/10B981/FFFFFF?text=New+Batch+Alert!', ctaKey: 'redeem.bannerCtaLearnMore' },
];

const mockBatchPromotions = [
  { id: 'batch1', titleKey: 'redeem.batch1Title', descKey: 'redeem.batch1Desc', icon: Zap, originalPrice: "₹10,000", offerPrice: "₹7,500", tagKey: 'redeem.batchTagBestSeller' },
  { id: 'batch2', titleKey: 'redeem.batch2Title', descKey: 'redeem.batch2Desc', icon: Star, originalPrice: "₹12,000", offerPrice: "₹9,000", tagKey: 'redeem.batchTagPopular' },
  { id: 'batch3', titleKey: 'redeem.batch3Title', descKey: 'redeem.batch3Desc', icon: Gift, originalPrice: "₹8,000", offerPrice: "₹6,000", tagKey: 'redeem.batchTagLimitedTime' },
];

export const RedeemPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeemPoints = () => {
    if (!user) {
      toast.error(t('toast.loginRequired'));
      return;
    }
    const amount = parseInt(pointsToRedeem, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('toast.invalidPointsAmount'));
      return;
    }
    if (amount > user.points) {
      toast.error(t('toast.insufficientPoints'));
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newPoints = user.points - amount;
      const newPwCoins = (user.pwCoins || 0) + amount; // Assuming 1 point = 1 PW Coin
      updateUser({ points: newPoints, pwCoins: newPwCoins });
      toast.success(t('toast.pointsRedeemedSuccess', { amount, coins: amount }));
      setPointsToRedeem('');
      setLoading(false);
    }, 1500);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Coins size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('redeem.loginPromptTitle')}</h2>
        <p className="text-gray-500">{t('redeem.loginPromptSubtitle')}</p>
      </div>
    );
  }
  
  const conversionRate = 1; // 1 Point = 1 PW Coin

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3 flex items-center justify-center">
            <Gift size={32} className="mr-3 text-yellow-500"/>
            {t('redeem.pageTitle')}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{t('redeem.pageSubtitle')}</p>
      </div>

      {/* User Points & Coins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100 uppercase tracking-wider">{t('redeem.currentPoints')}</p>
              <p className="text-4xl font-bold">{user.points.toLocaleString()}</p>
            </div>
            <Trophy size={40} className="text-yellow-300 opacity-80" />
          </div>
        </Card>
        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100 uppercase tracking-wider">{t('redeem.pwCoinsBalance')}</p>
              <p className="text-4xl font-bold">{(user.pwCoins || 0).toLocaleString()}</p>
            </div>
            <Coins size={40} className="text-yellow-300 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Redeem Section */}
      <Card className="p-6 md:p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">{t('redeem.redeemSectionTitle')}</h2>
        <div className="max-w-md mx-auto space-y-4">
          <Input
            type="number"
            label={t('redeem.pointsToRedeemLabel')}
            placeholder={t('redeem.pointsToRedeemPlaceholder')}
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(e.target.value)}
            min="1"
            icon={<Coins size={18} className="text-gray-400" />}
          />
          <p className="text-sm text-gray-600 text-center">
            {t('redeem.conversionRateText', { rate: conversionRate })}
          </p>
          <Button
            onClick={handleRedeemPoints}
            loading={loading}
            disabled={loading || !pointsToRedeem || parseInt(pointsToRedeem) <= 0}
            className="w-full"
            size="lg"
          >
            <CheckCircle size={20} className="mr-2" />
            {t('redeem.redeemNowButton')}
          </Button>
        </div>
      </Card>

      {/* Promotional Banners */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1 text-center">{t('redeem.promotionalBannersTitle')}</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockPromotionalBanners.map(banner => (
            <Card key={banner.id} className="p-0 overflow-hidden group cursor-pointer" onClick={() => toast.info(t(banner.ctaKey))}>
              <img src={banner.imageUrl} alt={t(banner.titleKey)} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"/>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600">{t(banner.titleKey)}</h3>
                <p className="text-sm text-gray-600 mb-3">{t(banner.descKey)}</p>
                <span className="text-xs text-blue-600 font-medium flex items-center group-hover:underline">
                  {t(banner.ctaKey)} <ChevronRight size={14} className="ml-1"/>
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Active Batch Promotions */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1 text-center">{t('redeem.activeBatchesTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockBatchPromotions.map(batch => {
            const Icon = batch.icon;
            return (
              <Card key={batch.id} className="p-6 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Icon size={28} className="text-blue-600" />
                    <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{t(batch.tagKey)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(batch.titleKey)}</h3>
                  <p className="text-sm text-gray-600 mb-4 h-16 overflow-hidden">{t(batch.descKey)}</p>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline space-x-2 mb-3">
                    <p className="text-2xl font-bold text-blue-600">{batch.offerPrice}</p>
                    <p className="text-sm text-gray-500 line-through">{batch.originalPrice}</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => toast.info(t('redeem.enrollToast', { batchTitle: t(batch.titleKey) }))}>
                    <ShoppingBag size={16} className="mr-2" />
                    {t('redeem.enrollNowButton')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
};
