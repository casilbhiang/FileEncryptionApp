import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface TopBarProps {
  onNavClick?: (sectionId: string) => void;
  logoSrc?: string;
}

const TopBar: React.FC<TopBarProps> = ({ onNavClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
    
    // Call parent callback if provided
    if (onNavClick) {
      onNavClick(sectionId);
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with Image */}
          <div 
            onClick={() => scrollToSection('hero')}
            className="flex items-center space-x-2 md:space-x-3 cursor-pointer hover:opacity-80 transition flex-shrink-0"
          >
            <img 
              src="/simncrypt.jpg"
              alt="SIM NCRYPT Logo"
              className="w-10 h-10 md:w-26 md:h-16"
            />
            
          </div>

          {/* Nav Links - Hidden on tablet and below */}
          <div className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('hero')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition cursor-pointer"
            >
              How it works
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition cursor-pointer"
            >
              Features
            </button>

          </div>

          {/* Right Section - Sign In Button + Mobile Menu */}
          <div className="flex items-center space-x-3">
            {/* CTA Button - Always Visible */}
            <button
              onClick={() => scrollToSection('register')}
              className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs md:text-sm font-medium transition whitespace-nowrap"
            >
              Sign In
            </button>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 -mr-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-200 bg-white">
            <button
              onClick={() => scrollToSection('hero')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium"
            >
              Features
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default TopBar;