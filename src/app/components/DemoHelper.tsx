import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface DemoHelperProps {
  tips: string[];
}

export function DemoHelper({ tips }: DemoHelperProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (tips.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform"
      >
        <Info className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl p-6 w-full max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">💡 Demo Tips</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {tips.map((tip, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
