'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Users, GraduationCap, Calculator, ArrowRight } from 'lucide-react';

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1e3a8a] to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Your Peer-to-Peer University Help Platform
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Connect with peers, find study buddies, browse faculty reviews, and track your academic
            performance all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/study-buddy"
              className="px-8 py-3 bg-white text-[#1e3a8a] rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Browse Study Requests
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/faculty"
              className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-[#1e3a8a] transition-colors inline-flex items-center justify-center gap-2"
            >
              View Faculty Directory
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#1e3a8a]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Study Buddy </h3>
              <p className="text-gray-600">
                Connect with peers who need help or offer assistance in subjects you excel at.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Faculty Directory</h3>
              <p className="text-gray-600">
                Browse faculty members, view office hours, and read student reviews to help you
                choose the right professors.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">GPA Calculator</h3>
              <p className="text-gray-600">
                Track your academic performance with our easy-to-use GPA calculator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join UniEase today and connect with your university community.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-[#1e3a8a] text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
    <footer className="bg-gray-900 text-white py-8 mt-auto">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <p className="text-gray-400">
      &copy; 2025 UniEase. All rights reserved.
    </p>
    <p className="text-gray-500 text-sm mt-2">
       Developed by <span className="text-blue-400 font-medium">Sarim</span>
    </p>
  </div>
</footer>
    </div>
  );
}
