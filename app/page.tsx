'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Twin {
  id: string;
  name: string;
  handle: string;
  channelUrl: string;
  avatar: string;
  description: string;
  topics: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const router = useRouter();
  const [twins, setTwins] = useState<Twin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/twins.json')
      .then(res => res.json())
      .then(data => {
        setTwins(data.filter((twin: Twin) => twin.isActive));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading twins:', err);
        setLoading(false);
      });
  }, []);

  const handleTwinSelect = (twinId: string) => {
    router.push(`/twins/${twinId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            YouTube Digital Twins
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Chat with AI versions of your favorite YouTube creators. Select a twin below to start a conversation.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Twins Grid */}
        {!loading && twins.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {twins.map((twin) => (
              <button
                key={twin.id}
                onClick={() => handleTwinSelect(twin.id)}
                className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 text-left group"
              >
                <div className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative mb-4">
                    <Image
                      src={twin.avatar}
                      alt={twin.name}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full border-4 border-indigo-500 shadow-lg group-hover:border-indigo-600 transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                  </div>

                  {/* Name & Handle */}
                  <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">
                    {twin.name}
                  </h2>
                  <p className="text-sm text-indigo-600 font-medium mb-4">
                    {twin.handle}
                  </p>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 text-center line-clamp-2">
                    {twin.description}
                  </p>

                  {/* Topics */}
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {twin.topics.slice(0, 3).map((topic, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="w-full">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 group-hover:from-indigo-600 group-hover:to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all text-center flex items-center justify-center gap-2">
                      <span>Start Chatting</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && twins.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Twins Available</h2>
            <p className="text-gray-600">Check back soon for new YouTube Digital Twins!</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by Together AI & Next.js</p>
        </div>
      </div>
    </div>
  );
}
