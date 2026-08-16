import Link from 'next/link';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Global Shreni</h3>
            <p className="text-gray-400 mb-4">Connecting skilled professionals with opportunities worldwide.</p>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center gap-2"><FiMapPin /> San Francisco, CA</div>
              <div className="flex items-center gap-2"><FiPhone /> +1 (555) 123-4567</div>
              <div className="flex items-center gap-2"><FiMail /> support@globalshreni.com</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/opportunities" className="hover:text-white transition">Browse Opportunities</Link></li>
              <li><Link href="/experts" className="hover:text-white transition">Find Experts</Link></li>
              <li><Link href="/post-project" className="hover:text-white transition">Post Project</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-white transition">Careers</Link></li>
              <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="/security" className="hover:text-white transition">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-400 text-center">© 2024 Global Shreni. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
