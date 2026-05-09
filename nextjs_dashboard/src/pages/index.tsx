import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900">
          CA Audit Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          AI-powered audit management system for CA firms
        </p>
        <div className="mt-8 space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
