import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

export function AIFloatingButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/customer')}
      className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg flex items-center justify-center z-40"
    >
      <Sparkles className="w-6 h-6" />
    </motion.button>
  );
}
