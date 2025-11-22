"use client";
import React from 'react';
import { Menu, Plus, MessageSquare, Settings, Gem } from 'lucide-react';
import { User } from 'firebase/auth';
import { Chat } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  onNewChat, 
  chats, 
  currentChatId, 
  onSelectChat, 
  user 
}) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1e1f20] transition-all duration-300 ${isOpen ? 'w-[280px]' : 'w-0 -translate-x-full md:w-[72px] md:translate-x-0'} border-r border-[#333]`}>
      <div className="flex items-center p-4 h-16">
        <button onClick={toggleSidebar} className="p-2 hover:bg-[#333] rounded-full text-[#e3e3e3] mr-2">
          <Menu size={20} />
        </button>
      </div>

      <div className="px-3 mb-6">
        <button 
          onClick={onNewChat}
          className={`flex items-center gap-3 bg-[#131314] hover:bg-[#28292a] text-[#e3e3e3] rounded-full p-3 transition-colors ${!isOpen && 'justify-center w-10 h-10 p-0'}`}
        >
          <Plus size={20} className="text-[#8e918f]" />
          {isOpen && <span className="text-sm font-medium">New chat</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {isOpen && <div className="text-xs font-medium text-[#e3e3e3] mb-2 px-2">Recent</div>}
        <div className="flex flex-col gap-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`flex items-center gap-3 p-2 rounded-full text-sm text-[#e3e3e3] hover:bg-[#282a2c] transition-colors group ${currentChatId === chat.id ? 'bg-[#004a77] text-blue-100' : ''}`}
            >
              <MessageSquare size={16} className="min-w-[16px]" />
              {isOpen && (
                <span className="truncate flex-1 text-left">
                  {chat.title || "New Chat"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 mt-auto">
        <button className={`flex items-center gap-3 p-2 rounded-full text-[#e3e3e3] hover:bg-[#282a2c] w-full ${!isOpen && 'justify-center'}`}>
          <Gem size={20} className="text-[#c58af9]" />
          {isOpen && (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">Gemini Advanced</span>
              <span className="text-[10px] text-gray-400">Upgrade</span>
            </div>
          )}
        </button>
        <button className={`flex items-center gap-3 p-2 rounded-full text-[#e3e3e3] hover:bg-[#282a2c] w-full mt-1 ${!isOpen && 'justify-center'}`}>
          <Settings size={20} />
          {isOpen && <span className="text-sm">Settings</span>}
        </button>
        {user && isOpen && (
           <div className="text-[10px] text-gray-500 text-center mt-2 px-2 truncate">
             {user.email || user.uid.slice(0, 8)}
           </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;