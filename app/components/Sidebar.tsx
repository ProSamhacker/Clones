"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Plus, MessageSquare, Settings, Gem, Trash2, LogOut, MoreVertical } from 'lucide-react';
import { User } from 'firebase/auth';
import { Chat } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onLogout: () => void;
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  onNewChat, 
  chats, 
  currentChatId, 
  onSelectChat, 
  onDeleteChat,
  onLogout,
  user 
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              className={`flex items-center gap-3 p-2 rounded-full text-sm text-[#e3e3e3] hover:bg-[#282a2c] transition-colors group relative ${currentChatId === chat.id ? 'bg-[#004a77] text-blue-100' : ''}`}
            >
              <MessageSquare size={16} className="min-w-[16px]" />
              {isOpen && (
                <>
                  <span className="truncate flex-1 text-left pr-6">
                    {chat.title || "New Chat"}
                  </span>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3c4043] rounded-md text-gray-400 hover:text-red-400 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 mt-auto relative" ref={settingsRef}>
        {/* Settings Menu Popover */}
        {showSettings && isOpen && (
          <div className="absolute bottom-full left-3 w-60 bg-[#28292a] rounded-xl shadow-xl border border-[#333] mb-2 overflow-hidden py-1 z-50">
             <div className="px-4 py-3 border-b border-[#333]">
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Free Plan</p>
             </div>
             <button 
               onClick={() => {
                 onLogout();
                 setShowSettings(false);
               }}
               className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#333] flex items-center gap-2 transition-colors"
             >
               <LogOut size={16} />
               Log out
             </button>
          </div>
        )}

        <button className={`flex items-center gap-3 p-2 rounded-full text-[#e3e3e3] hover:bg-[#282a2c] w-full ${!isOpen && 'justify-center'}`}>
          <Gem size={20} className="text-[#c58af9]" />
          {isOpen && (
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">Gemini Advanced</span>
              <span className="text-[10px] text-gray-400">Upgrade</span>
            </div>
          )}
        </button>
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-3 p-2 rounded-full text-[#e3e3e3] hover:bg-[#282a2c] w-full mt-1 ${!isOpen && 'justify-center'} ${showSettings ? 'bg-[#282a2c]' : ''}`}
        >
          <Settings size={20} />
          {isOpen && <span className="text-sm flex-1 text-left">Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;