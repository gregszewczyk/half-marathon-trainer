import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-700 bg-gray-900/50 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* App Info */}
          <div>
            <h3 className="font-semibold text-white mb-3">Half Marathon Trainer</h3>
            <p className="text-sm text-gray-400 mb-3">
              AI-powered training for your best half marathon performance.
            </p>
            <div className="text-xs text-gray-500">
              Built for Manchester Half Marathon 2025
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium text-white mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/training" className="text-gray-400 hover:text-white transition-colors">
                  Training Calendar
                </Link>
              </li>
              <li>
                <Link href="/progress" className="text-gray-400 hover:text-white transition-colors">
                  Progress Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-medium text-white mb-3">Features</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-400">🤖 AI Adaptations</li>
              <li className="text-gray-400">⌚ Garmin Integration</li>
              <li className="text-gray-400">📊 Performance Analytics</li>
              <li className="text-gray-400">📱 Mobile Responsive</li>
            </ul>
          </div>

          {/* Race Info */}
          <div>
            <h4 className="font-medium text-white mb-3">Race Details</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <div>📅 October 12, 2025</div>
              <div>📍 Manchester, UK</div>
              <div>🎯 Goal: Sub-2 hours</div>
              <div>👥 MadeRunning Club</div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-400">
            © {currentYear} Half Marathon Trainer. Built with ❤️ for runners.
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-xs text-gray-500">Powered by</span>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>Perplexity AI</span>
              <span>•</span>
              <span>Garmin Connect</span>
              <span>•</span>
              <span>Next.js</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}