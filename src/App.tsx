import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import MainTabs from './components/MainTabs';
import dyaLogo from './assets/dya.svg';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-dark to-cyber-darker">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <div key="main" className="h-screen flex flex-col">
            {/* Header */}
            <header className="bg-cyber-darker/80 backdrop-blur-sm border-b border-cyber-blue/20">
              <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={dyaLogo} alt="DYA" className="w-12 h-12 cyber-glow" />
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyber-blue to-cyber-purple bg-clip-text text-transparent">
                      DYA STUDIO
                    </h1>
                    <p className="text-xs text-white/40 tracking-wider">KEYBOARD CONFIGURATION</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-white/40">Status</p>
                    <p className="text-sm text-cyber-blue">Not Connected</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-glow-pulse"></div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-hidden">
              <MainTabs />
            </main>

            {/* Footer */}
            <footer className="bg-cyber-darker/80 backdrop-blur-sm border-t border-cyber-blue/20 py-3">
              <div className="container mx-auto px-6">
                <p className="text-xs text-center text-white/40">
                  DYA Studio © 2026 | ZMK Keyboard Configuration Tool
                </p>
              </div>
            </footer>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
