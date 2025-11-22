"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Send, Loader2, Image as ImageIcon, Mic, Code, PenTool, Compass, X } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGeminiResponse, generateImage } from '@/lib/gemini';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import { Chat, Message } from '@/types';

interface SuggestionCardProps {
  icon: React.ElementType;
  text: string;
  onClick: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ icon: Icon, text, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col p-4 bg-[#1e1f20] hover:bg-[#282a2c] rounded-xl transition-all h-[140px] w-full sm:w-[180px] text-left border border-transparent hover:border-[#444] group"
  >
    <div className="flex-1">
      <div className="bg-[#131314] w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-[#333] transition-colors">
        <Icon size={20} className="text-[#a8c7fa]" />
      </div>
      <span className="text-[#e3e3e3] text-sm font-medium line-clamp-2">{text}</span>
    </div>
  </button>
);

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Chats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'chats'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Messages
  useEffect(() => {
    if (!user || !currentChatId) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'chats', currentChatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgList);
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsubscribe();
  }, [user, currentChatId]);

  // File Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Main Logic
  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
    clearFile();
  };

  const handleSendMessage = async (textOverride: string | null = null) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !selectedFile) || !user || isProcessing) return;

    setIsProcessing(true);
    setInput('');
    
    // Snapshot current file state before clearing UI
    const currentFile = selectedFile;
    const currentPreview = imagePreview;
    clearFile();

    let chatId = currentChatId;

    // 1. Create chat if needed
    if (!chatId) {
      const chatRef = await addDoc(collection(db, 'users', user.uid, 'chats'), {
        title: textToSend.slice(0, 30) || "Image Analysis",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      chatId = chatRef.id;
      setCurrentChatId(chatId);
    }

    const messagesCollection = collection(db, 'users', user.uid, 'chats', chatId, 'messages');
    
    // 2. Upload Image to Vercel Blob (if exists)
    let uploadedImageUrl = null;
    if (currentFile) {
      try {
        const response = await fetch(`/api/upload?filename=${currentFile.name}`, {
          method: 'POST',
          body: currentFile,
        });
        const newBlob = await response.json();
        uploadedImageUrl = newBlob.url;
      } catch (error) {
        console.error("Upload failed", error);
      }
    }

    // 3. Save User Message
    await addDoc(messagesCollection, { 
      role: 'user', 
      content: textToSend, 
      imageUrl: uploadedImageUrl, // Store the Vercel Blob URL
      createdAt: serverTimestamp() 
    });

    // 4. AI Processing
    const thinkingRef = await addDoc(messagesCollection, { 
      role: 'model', 
      isLoading: true, 
      createdAt: serverTimestamp() 
    });

    const isImageRequest = textToSend.toLowerCase().match(/generate image|create an image|draw/);

    if (isImageRequest && !currentFile) {
      // --- Image Generation Mode ---
      const imageUrl = await generateImage(textToSend);
      await updateDoc(doc(messagesCollection, thinkingRef.id), {
        content: imageUrl ? "Here is the image." : "Failed to generate image.",
        imageUrl: imageUrl,
        isLoading: false,
        createdAt: serverTimestamp()
      });
    } else {
      // --- Text/Vision Analysis Mode ---
      // Get recent history (text only for now to keep payload small)
      const recentHistory = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      
      // Call Gemini with text + optional base64 image
      const { text, grounding } = await generateGeminiResponse(
        textToSend, 
        recentHistory,
        currentPreview, // Pass base64 for analysis
        currentFile?.type || "image/png"
      );

      await updateDoc(doc(messagesCollection, thinkingRef.id), {
        content: text,
        grounding,
        isLoading: false,
        createdAt: serverTimestamp()
      });
    }
    
    await updateDoc(doc(db, 'users', user.uid, 'chats', chatId), { updatedAt: serverTimestamp() });
    setIsProcessing(false);
  };

  return (
    <div className="flex h-screen bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        onNewChat={handleNewChat}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          setIsSidebarOpen(window.innerWidth >= 768);
        }}
        user={user}
      />

      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[72px]'}`}>
        <div className="flex justify-between items-center p-4 sticky top-0 z-10 bg-[#131314]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-[#e3e3e3] opacity-90">Gemini</span>
            <span className="flex items-center gap-1 text-xs font-bold text-[#c58af9] border border-[#c58af9] px-2 py-0.5 rounded-full ml-1">PRO</span>
          </div>
          <div className="flex items-center gap-2">
             <button className="p-2 bg-[#282a2c] text-[#a8c7fa] rounded-full">
               <div className="w-6 h-6 flex items-center justify-center font-bold">S</div>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-0">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-start pt-20 pb-10">
                <div className="mb-12">
                  <h1 className="text-5xl md:text-6xl font-medium mb-2">
                    <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">Hello, User</span>
                  </h1>
                  <h2 className="text-3xl md:text-4xl text-[#444746] font-medium">How can I help you today?</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                  <SuggestionCard icon={ImageIcon} text="Create an image of a futuristic city" onClick={() => handleSendMessage("Create an image of a neon futuristic city")} />
                  <SuggestionCard icon={Code} text="Write a React component" onClick={() => handleSendMessage("Write a responsive React Navbar")} />
                  <SuggestionCard icon={PenTool} text="Draft an email" onClick={() => handleSendMessage("Draft a professional email")} />
                  <SuggestionCard icon={Compass} text="Plan a trip" onClick={() => handleSendMessage("Plan a trip to Tokyo")} />
                </div>
              </div>
            ) : (
              <div className="py-6 min-h-0">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#131314] w-full">
          <div className="max-w-3xl mx-auto">
            {/* File Preview Area */}
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg border border-[#444]" />
                <button 
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-[#333] rounded-full p-1 text-gray-300 hover:text-white border border-[#555]"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="relative bg-[#1e1f20] rounded-3xl border border-[#444] hover:border-[#666] transition-colors focus-within:border-[#8e918f] focus-within:bg-[#282a2c]">
              <div className="flex flex-col p-2">
                 <textarea 
                   rows={1}
                   value={input}
                   onChange={(e) => {
                     e.target.style.height = 'auto';
                     e.target.style.height = `${e.target.scrollHeight}px`;
                     setInput(e.target.value);
                   }}
                   placeholder={selectedFile ? "Ask something about this image..." : "Ask Gemini"}
                   className="w-full bg-transparent text-[#e3e3e3] placeholder-gray-400 p-3 outline-none resize-none max-h-[200px] overflow-y-auto"
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage();
                     }
                   }}
                 />
                 <div className="flex justify-between items-center mt-2 pl-2 pr-1">
                   <div className="flex items-center gap-1">
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       accept="image/*" 
                       onChange={handleFileSelect}
                     />
                     <button 
                       onClick={() => fileInputRef.current?.click()}
                       className={`p-2 rounded-full transition-colors ${selectedFile ? 'text-[#c58af9] bg-[#333]' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                     >
                       <ImageIcon size={20} />
                     </button>
                     <button className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-full transition-colors"><Mic size={20} /></button>
                   </div>
                   <button 
                     onClick={() => handleSendMessage()}
                     disabled={(!input.trim() && !selectedFile) || isProcessing}
                     className={`p-2 rounded-full transition-all ${
                       (input.trim() || selectedFile)
                         ? 'bg-white text-black hover:bg-gray-200' 
                         : 'bg-transparent text-gray-500 cursor-not-allowed'
                     }`}
                   >
                     {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                   </button>
                 </div>
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-500 mt-3">Gemini may display inaccurate info, so double-check its responses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}