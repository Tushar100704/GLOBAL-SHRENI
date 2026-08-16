import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, MapPin, Shield } from 'lucide-react';

const slides = [
  {
    icon: Sparkles,
    title: 'AI-Powered Service Discovery',
    description: 'Find the perfect service provider with our intelligent AI assistant. Just ask in natural language.',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Chat Your Way to Solutions',
    description: 'No complex forms. Simply chat with our AI to discover, compare, and book services instantly.',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    icon: MapPin,
    title: 'Nearby & Available',
    description: 'Get instant access to verified local service providers near you with real-time availability.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Shield,
    title: 'Trusted & Verified',
    description: 'All service partners are KYC-verified and rated by customers like you. Book with confidence.',
    gradient: 'from-rose-500 to-orange-600',
  },
];

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/role-selection');
    }
  };

  const handleSkip = () => {
    navigate('/role-selection');
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col h-screen p-6">
        {/* Skip Button */}
        <div className="flex justify-end mb-8">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className={`w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center`}>
                <Icon className="w-16 h-16 text-white" />
              </div>

              <h1 className="text-3xl font-bold mb-4 px-4">{slide.title}</h1>
              <p className="text-muted-foreground text-lg px-8 leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-gradient-to-r from-primary to-accent'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 mb-4"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
