import { useNavigate } from 'react-router';
import { ShoppingBag, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { setUserRole } from '../utils/session';

export function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'customer' | 'partner') => {
    setUserRole(role);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Global Shreni
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose how you'd like to continue
          </p>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={() => handleRoleSelect('customer')}
              className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-primary group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-semibold mb-1">I'm a Customer</h3>
                  <p className="text-sm text-muted-foreground">
                    Book services from verified professionals
                  </p>
                </div>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => handleRoleSelect('partner')}
              className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-accent group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-pink-600 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-semibold mb-1">I'm a Service Partner</h3>
                  <p className="text-sm text-muted-foreground">
                    Grow your business and earn more
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
