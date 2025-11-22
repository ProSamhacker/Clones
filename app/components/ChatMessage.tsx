import React from 'react';
import { User, Sparkles, Loader2, Copy, ThumbsUp, ThumbsDown, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600' : 'bg-gradient-to-tr from-blue-500 to-purple-500'}`}>
        {isUser ? <User size={18} className="text-white" /> : <Sparkles size={18} className="text-white" />}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`text-[#e3e3e3] leading-relaxed prose prose-invert prose-p:my-1 prose-pre:bg-[#1e1f20] prose-pre:p-4 prose-pre:rounded-lg`}>
          {message.isLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
               <Loader2 className="animate-spin" size={16} />
               <span>Thinking...</span>
            </div>
          ) : (
            <>
              {message.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-[#333]">
                  <img src={message.imageUrl} alt="Generated content" className="max-w-full h-auto max-h-[400px]" />
                </div>
              )}
              {message.content && <ReactMarkdown>{message.content}</ReactMarkdown>}
            </>
          )}
        </div>
        
        {!isUser && !message.isLoading && (
          <div className="flex items-center gap-2 mt-2 text-gray-500">
            <button className="p-1 hover:text-white transition-colors"><Copy size={14} /></button>
            <button className="p-1 hover:text-white transition-colors"><ThumbsUp size={14} /></button>
            <button className="p-1 hover:text-white transition-colors"><ThumbsDown size={14} /></button>
          </div>
        )}

        {message.grounding && message.grounding.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.grounding.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-xs bg-[#1e1f20] hover:bg-[#2c2d2e] text-blue-300 px-3 py-1.5 rounded-full transition-colors border border-[#333]"
              >
                <Search size={10} />
                <span className="truncate max-w-[150px]">{source.title || source.uri}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;