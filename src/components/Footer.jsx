// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { Mail, BarChart3 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-400 py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          {/* Brand column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">PollMeNow</span>
            </div>
            <p className="text-sm leading-relaxed max-w-[200px]">
              AI-powered real-time polling. Capture opinions instantly.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><Link to="/explore" className="hover:text-primary transition-colors">Explore polls</Link></li>
              <li><Link to="/search" className="hover:text-primary transition-colors">Search</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of service</Link></li>
            </ul>
          </div>

          {/* Support column */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Support</h4>
            <a href="mailto:support@pollmenow.com" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Mail className="w-4 h-4" />
              support@pollmenow.com
            </a>
            <p className="text-xs text-gray-600 mt-2">Response within 24 hours</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-7 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
          <span>© {currentYear} PollMeNow. All rights reserved.</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            Stripe-verified business
          </span>
        </div>
      </div>
    </footer>
  );
}