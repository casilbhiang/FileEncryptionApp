'use client';

import React from 'react';
import {
  ArrowRight,
  Lock,
  Shield,
  CheckCircle,
  FileText,
  BarChart3,
  KeyRound,
  Cloud,
  MapPin,
  Users,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: Lock,
      title: 'Client-Side Encryption',
      description:
        'Files are encrypted using AES-GCM on your device before upload. Your encryption keys never leave your control—even admins can\'t access your data.',
      color: 'from-blue-500 to-purple-500',
    },
    {
      icon: Shield,
      title: 'PDPA Compliant',
      description:
        'Designed to meet Singapore\'s Personal Data Protection Act requirements, with tamper-evident audit trails and role-based access control.',
      color: 'from-green-500 to-teal-500',
    },
    {
      icon: BarChart3,
      title: 'Clinic-Focused',
      description:
        'Purpose-built for small clinics in Singapore. Secure file exchange between doctors and patients within and across different healthcare providers.',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const advancedFeatures = [
    {
      icon: Users,
      title: 'Role-Based Access',
      description:
        'Clear separation between doctors, patients, and administrators. Each role has specific permissions to maintain security and privacy.',
    },
    {
      icon: FileText,
      title: 'Audit Trail',
      description:
        'Every file access, upload, and download is logged with timestamps and user information. Complete visibility for compliance and security monitoring.',
    },
    {
      icon: CheckCircle,
      title: 'Simple & Seamless',
      description:
        'No complex setup. Just select → upload for doctors, and view → decrypt for patients. Security shouldn\'t be complicated.',
    },
  ];

  const workflowSteps = [
    {
      icon: KeyRound,
      title: 'Key Generation',
      description:
        'Admin generates AES-GCM encryption keys for doctor-patient pairs. Keys are distributed via secure QR code + PIN mechanism.',
      color: 'from-blue-600 to-blue-400',
    },
    {
      icon: FileText,
      title: 'Upload & Encrypt',
      description:
        'When doctors upload files, they\'re automatically encrypted on the device using 256-bit AES-GCM before being sent to the cloud.',
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Cloud,
      title: 'Secure Storage',
      description:
        'Encrypted files are stored in the cloud. Even if the cloud is compromised, files remain unreadable without decryption keys.',
      color: 'from-cyan-400 to-teal-400',
    },
    {
      icon: Lock,
      title: 'Download & Decrypt',
      description:
        'Patients download encrypted files and they\'re automatically decrypted on their device using their secure encryption key.',
      color: 'from-teal-400 to-green-400',
    },
  ];

  const additionalWorkflow = [
    {
      icon: FileText,
      title: 'Audit Logging',
      description:
        'Every action is logged with timestamps and user information. Complete transparency for compliance and security monitoring.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: KeyRound,
      title: 'Key Rotation',
      description:
        'Encryption keys can be rotated periodically for enhanced security. Seamless transition with grace periods for uninterrupted access.',
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  const registrationSteps = [
    {
      number: 1,
      title: 'Visit Your Clinic',
      description: 'Go to your registered clinic/healthcare provider in person with valid identification (NRIC/FIN).',
    },
    {
      number: 2,
      title: 'Staff Registration',
      description: 'Clinic staff/admin will create your account and provide you with a permanent User ID and temporary password.',
    },
    {
      number: 3,
      title: 'First Login',
      description: 'Go to the MediSecure web app and sign in using your permanent User ID and temporary password.',
    },
    {
      number: 4,
      title: 'Reset Password',
      description: 'You\'ll be prompted to create a new, secure password. Choose a strong password that you\'ll remember.',
    },
    {
      number: 5,
      title: 'QR Code Pairing',
      description: 'Staff will generate a QR code for secure key exchange. Scan the QR code and enter the PIN to complete setup.',
    },
    {
      number: 6,
      title: 'Start Using MediSecure',
      description: 'Your account is now fully set up! You can securely upload, access, and share encrypted medical records.',
    },
  ];

  const clinics = [
    {
      name: 'Downtown Medical Clinic',
      address: '123 Orchard Road, Singapore 238801',
      phone: '+65 6123 4567',
      hours: 'Mon-Fri: 9AM-6PM, Sat: 9AM-1PM',
    },
    {
      name: 'East Coast Health Center',
      address: '456 East Coast Road, Singapore 428992',
      phone: '+65 6234 5678',
      hours: 'Mon-Sun: 8AM-8PM',
    },
    {
      name: 'Bukit Timah Medical Practice',
      address: '789 Bukit Timah Road, Singapore 269752',
      phone: '+65 6456 7890',
      hours: 'Mon-Fri: 10AM-7PM, Sat: 10AM-2PM',
    },
  ];

  const scrollToSection = (sectionId: string) => {
    // If it's 'register', navigate to login page instead
    if (sectionId === 'register') {
      window.location.href = '/login';
      return;
    }
    
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* TopBar Component */}
      <TopBar 
        onNavClick={scrollToSection}
      />

      {/* SECTION 1: HERO / HOME */}
      <section id="hero" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Secure Medical Records with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  End-to-End Encryption
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                MediSecure is a healthcare file encryption platform that enables small clinics in Singapore to securely store and share medical records between doctors and patients. All files are encrypted on your device before upload—ensuring complete privacy and compliance with PDPA.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={() => scrollToSection('register')}
                  className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium group transition"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Learn More
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold text-gray-900">256-bit</div>
                  <div className="text-sm text-gray-600">AES-GCM Encryption</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">PDPA</div>
                  <div className="text-sm text-gray-600">Compliant</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <div className="text-sm text-gray-600">Private</div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative hidden md:block">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Lock className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-gray-700 font-semibold">Encrypted Cloud Storage</p>
                  <p className="text-sm text-gray-600 mt-2">Your medical data, protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose MediSecure?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built specifically for Singapore's healthcare providers with security, compliance, and simplicity at its core.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Advanced Features */}
          <div className="grid md:grid-cols-3 gap-8">
            {advancedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-lg text-blue-100">
              End-to-end encryption made simple for healthcare professionals and patients
            </p>
          </div>

          {/* Main Workflow */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div
                    className={`bg-gradient-to-br ${step.color} rounded-xl p-8 h-full text-white`}
                  >
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-white text-opacity-90 text-sm">
                      {step.description}
                    </p>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 gap-6">
            {additionalWorkflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${step.color} rounded-xl p-8 text-white`}
                >
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-white text-opacity-90">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: REGISTRATION */}
      <section
        id="register"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get Started with MediSecure
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Registration is done in-person at your clinic to ensure secure identity verification and proper encryption key distribution.
            </p>
          </div>

          {/* Registration Steps */}
          <div className="max-w-5xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              How to Register
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registrationSteps.map((step) => (
                <div
                  key={step.number}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold text-sm mb-4">
                    {step.number}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h4>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Clinics */}
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Partner Clinics
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              {clinics.map((clinic, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition"
                >
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {clinic.name}
                  </h4>

                  <div className="space-y-3 mb-6">
                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{clinic.address}</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-gray-900 min-w-fit">
                        Phone:
                      </span>
                      <a
                        href={`tel:${clinic.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {clinic.phone}
                      </a>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-sm font-medium text-gray-900 min-w-fit">
                        Hours:
                      </span>
                      <p className="text-sm text-gray-600">{clinic.hours}</p>
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition">
                    Visit Clinic
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Secure Your Medical Records?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join healthcare providers and patients across Singapore who trust MediSecure for secure, compliant medical file management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection('register')}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">SIM NCRYPT</span>
              </div>
              <p className="text-sm">Secure medical records for Singapore.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className="hover:text-white transition cursor-pointer"
                  >
                    How it Works
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm">
                © 2025 MediSecure. Built for Singapore's healthcare providers with privacy and security in mind.
              </p>
              <p className="text-sm">
                Client-side encryption • PDPA compliant • Audit trails • Role-based access
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;