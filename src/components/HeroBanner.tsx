import heroBanner from '@/assets/hero-swimming-banner.jpg';
import { Waves } from 'lucide-react';

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
}

const HeroBanner = ({ 
  title = "游泳賽程管理系統", 
  subtitle = "即時追蹤比賽進度，掌握每一場賽事" 
}: HeroBannerProps) => {
  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden">
      {/* 背景圖片 */}
      <img
        src={heroBanner}
        alt="游泳比賽橫幅"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* 漸層遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
      
      {/* 文字內容 */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12">
        <div className="flex items-center gap-3 mb-2">
          <Waves className="w-8 h-8 md:w-10 md:h-10 text-white" />
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wide">
            {title}
          </h1>
        </div>
        <p className="text-white/90 text-sm md:text-lg max-w-xl">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default HeroBanner;
