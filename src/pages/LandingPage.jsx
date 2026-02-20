import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Calendar, Users, Heart, Phone, Brain, Stethoscope, 
  Clock, MapPin, Shield, Zap, Globe, Bell, QrCode, 
  ChevronRight, Check, Star, TrendingUp, MessageSquare,
  Pill, FileText, Camera, Mic, Video, Receipt, UserPlus,
  Sparkles, ArrowRight, Menu, X
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate featured features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Calendar,
      title: 'Smart Appointments',
      description: 'Book appointments with real-time queue management and get notified when it\'s your turn',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      icon: Brain,
      title: 'AI Health Assistant',
      description: 'Get instant health insights powered by AI with voice support in multiple languages',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      icon: Activity,
      title: 'Health Tracking',
      description: 'Monitor vitals, track recovery, and manage chronic conditions with smart reminders',
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      icon: Users,
      title: 'Family Profiles',
      description: 'Manage health records for your entire family with genetic health analysis',
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      icon: Receipt,
      title: 'Billing & Payments',
      description: 'Transparent billing with digital invoices and secure payment processing',
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      icon: Pill,
      title: 'Medicine Reminders',
      description: 'Never miss a dose with smart medication reminders and refill alerts',
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    },
    {
      icon: QrCode,
      title: 'QR Code Check-in',
      description: 'Contactless hospital check-in with instant queue position updates',
      color: 'bg-teal-500',
      lightColor: 'bg-teal-50',
      textColor: 'text-teal-600'
    },
    {
      icon: Camera,
      title: 'Document Scanner',
      description: 'Scan and digitize medical reports with OCR technology',
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      icon: MapPin,
      title: 'Location-Based Services',
      description: 'Find nearby hospitals and get navigation to your appointment',
      color: 'bg-cyan-500',
      lightColor: 'bg-cyan-50',
      textColor: 'text-cyan-600'
    },
    {
      icon: Bell,
      title: 'Real-Time Notifications',
      description: 'Stay updated with instant alerts about appointments, queue status, and health reminders',
      color: 'bg-violet-500',
      lightColor: 'bg-violet-50',
      textColor: 'text-violet-600'
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description: 'Available in English, Telugu, and more languages for better accessibility',
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Active Users', icon: Users },
    { number: '50+', label: 'Partner Hospitals', icon: Stethoscope },
    { number: '95%', label: 'Satisfaction Rate', icon: Star },
    { number: '24/7', label: 'Support Available', icon: Clock }
  ];

  const benefits = [
    { text: 'Reduce waiting time by up to 70%', icon: Clock },
    { text: 'Access healthcare from anywhere', icon: MapPin },
    { text: 'Secure & encrypted health data', icon: Shield },
    { text: 'AI-powered health insights', icon: Brain },
    { text: 'Completely free for patients', icon: Sparkles },
    { text: 'Works offline with sync', icon: Zap }
  ];

  const howItWorksSteps = [
    {
      step: '1',
      title: 'Register & Create Profile',
      description: 'Sign up in seconds and add your family members',
      icon: UserPlus,
      color: 'bg-blue-500'
    },
    {
      step: '2',
      title: 'Book Appointment',
      description: 'Choose hospital, doctor, and time slot that works for you',
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      step: '3',
      title: 'Get Smart Updates',
      description: 'Receive real-time queue position and estimated wait time',
      icon: Bell,
      color: 'bg-green-500'
    },
    {
      step: '4',
      title: 'Attend Consultation',
      description: 'Visit hospital or join video call for your consultation',
      icon: Stethoscope,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MedAssist AI
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">How It Works</a>
              <a href="#benefits" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Benefits</a>
              <button 
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-medium"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">Features</a>
                <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 transition-colors">How It Works</a>
                <a href="#benefits" className="text-slate-600 hover:text-blue-600 transition-colors">Benefits</a>
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 text-left"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Medical Assistant for Everyone</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Your Health,
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Simplified</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Manage appointments, track health records, and access AI-powered medical guidance—your all-in-one platform for modern healthcare.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => navigate('/register')}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all flex items-center space-x-2"
              >
                <span>Start For Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => navigate('/login')}
                className="bg-white text-slate-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all"
              >
                Sign In
              </button>
            </div>

            {/* Floating Feature Cards */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Calendar, text: 'Smart Queue Management', gradient: 'from-blue-500 to-blue-600' },
                { icon: Brain, text: 'AI Health Assistant', gradient: 'from-purple-500 to-purple-600' },
                { icon: Activity, text: 'Health Tracking', gradient: 'from-red-500 to-red-600' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={`bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${activeFeature === idx ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mb-4`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-slate-800">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-blue-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Better Healthcare</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              A comprehensive suite of tools designed to make healthcare accessible, efficient, and patient-friendly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-2 border border-slate-100"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get started in minutes and experience hassle-free healthcare management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200"></div>
            
            {howItWorksSteps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all text-center relative z-10">
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold`}>
                    {step.step}
                  </div>
                  <step.icon className="w-10 h-10 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Why Choose
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> MedAssist AI?</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                We're revolutionizing healthcare with technology that's powerful yet simple to use
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">Ready to Transform Your Healthcare Experience?</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <p>No credit card required</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <p>Setup in less than 2 minutes</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <p>24/7 support available</p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/register')}
                  className="w-full bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  Create Free Account
                </button>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-400 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-slate-600">
              See what our users have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Rajesh Kumar',
                role: 'Patient',
                text: 'This app changed how I manage my family\'s health. No more long waits at hospitals!',
                rating: 5
              },
              {
                name: 'Dr. Priya Sharma',
                role: 'Doctor',
                text: 'The queue management system has made my OPD much more efficient. Highly recommend!',
                rating: 5
              },
              {
                name: 'Lakshmi Devi',
                role: 'Patient',
                text: 'Voice assistant in Telugu is a game-changer. My grandmother can now easily use it!',
                rating: 5
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all">
                <div className="flex space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of users who are already experiencing better healthcare
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Sign Up Now
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-800 transition-all border-2 border-white/20"
              >
                Already Have an Account?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">MedAssist AI</span>
              </div>
              <p className="text-slate-400">
                Making healthcare accessible for everyone through technology
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors">How It Works</a>
                <a href="#benefits" className="block text-slate-400 hover:text-white transition-colors">Benefits</a>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <div className="space-y-2">
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">About Us</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Contact</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Careers</a>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <div className="space-y-2">
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="block text-slate-400 hover:text-white transition-colors">Security</a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2026 MedAssist AI - Medical AI Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
