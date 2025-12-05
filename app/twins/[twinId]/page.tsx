'use client';

import { useChat } from 'ai/react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ChannelMetadata {
  title: string;
  avatar: string;
  description: string;
  customUrl: string;
  statistics: {
    subscriberCount: string;
    videoCount: string;
  };
}

export default function TwinChat() {
  const params = useParams();
  const router = useRouter();
  const twinId = params.twinId as string;

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: `/api/chat/${twinId}`,
  });

  const [channelData, setChannelData] = useState<ChannelMetadata | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch twin metadata
    fetch(`/data/twins/${twinId}/metadata.json`)
      .then(res => {
        if (!res.ok) {
          router.push('/');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setChannelData(data);
      })
      .catch(err => {
        console.error('Error loading twin metadata:', err);
        router.push('/');
      });
  }, [twinId, router]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex flex-col w-full max-w-4xl mx-auto px-4 h-full">
        {/* Back Button */}
        <div className="flex-shrink-0 mt-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Twins
          </button>
        </div>

        {/* Channel Header - Compact */}
        {channelData && (
          <div className="flex-shrink-0 mt-4 mb-4 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={channelData.avatar}
                  alt={channelData.title}
                  className="w-16 h-16 rounded-full border-4 border-indigo-500 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{channelData.title}</h1>
                <p className="text-sm text-indigo-600 font-medium">{channelData.customUrl}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>{parseInt(channelData.statistics.subscriberCount).toLocaleString()} subscribers</div>
                <div>{parseInt(channelData.statistics.videoCount).toLocaleString()} videos</div>
              </div>
            </div>
          </div>
        )}

        {!channelData && (
          <div className="flex-shrink-0 mt-6 mb-4 bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
          </div>
        )}

        {/* Messages Container - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 scroll-smooth">
          {messages.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat with {channelData?.title || 'the Creator'}</h2>
                <p className="text-gray-600 mb-6">Ask me anything about my ideas, insights, and perspectives</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  onClick={() => {
                    const event = { target: { value: "What's your main philosophy?" } } as any;
                    handleInputChange(event);
                  }}
                  className="bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 rounded-xl p-4 text-left transition-all hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-indigo-700 mb-1">Philosophy</div>
                  <div className="text-xs text-gray-600">What's your main philosophy?</div>
                </button>
                <button
                  onClick={() => {
                    const event = { target: { value: "What advice would you give?" } } as any;
                    handleInputChange(event);
                  }}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-xl p-4 text-left transition-all hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-purple-700 mb-1">Advice</div>
                  <div className="text-xs text-gray-600">What advice would you give?</div>
                </button>
                <button
                  onClick={() => {
                    const event = { target: { value: "What's your perspective on this topic?" } } as any;
                    handleInputChange(event);
                  }}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-xl p-4 text-left transition-all hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-green-700 mb-1">Perspective</div>
                  <div className="text-xs text-gray-600">What's your perspective?</div>
                </button>
                <button
                  onClick={() => {
                    const event = { target: { value: "What should I know about your work?" } } as any;
                    handleInputChange(event);
                  }}
                  className="bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200 rounded-xl p-4 text-left transition-all hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-orange-700 mb-1">Insights</div>
                  <div className="text-xs text-gray-600">What should I know about your work?</div>
                </button>
              </div>
            </div>
          )}

          {messages.map(m => (
            <div
              key={m.id}
              className={`whitespace-pre-wrap p-5 rounded-2xl shadow-lg border ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white ml-12 border-indigo-600'
                  : 'bg-white text-gray-900 mr-12 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {m.role !== 'user' && channelData && (
                  <img
                    src={channelData.avatar}
                    alt={channelData.title}
                    className="w-7 h-7 rounded-full border-2 border-indigo-200"
                  />
                )}
                {m.role === 'user' && (
                  <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                    U
                  </div>
                )}
                <div className="font-bold text-sm">
                  {m.role === 'user' ? 'You' : channelData?.title || 'Channel AI'}
                </div>
              </div>
              <div className="text-sm leading-relaxed">{m.content}</div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-center items-center my-4">
              <div className="bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-sm text-gray-600 font-medium">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form - Fixed at Bottom */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-2 flex gap-2">
            <input
              className="flex-1 px-4 py-3 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
              value={input}
              placeholder="Ask me anything..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Send</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
