import React from 'react';
import { BookOpen } from 'lucide-react';

export const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/90 dark:bg-[#0f1016]/90 backdrop-blur-md animate-fadeIn">
            {/* Ambient magic glow */}
            <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute w-24 h-24 bg-fuchsia-500/20 rounded-full blur-xl animate-[pulse_2s_ease-in-out_infinite_reverse]"></div>
                
                {/* Floating book icon */}
                <div className="relative z-10 animate-float text-primary dark:text-purple-400">
                    <BookOpen size={48} className="drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
                </div>
            </div>
            
            {/* Loading text with animated dots */}
            <h3 className="mt-8 text-lg font-bold text-slate-800 dark:text-slate-100 tracking-widest uppercase flex items-center gap-1">
                BetoBook
                <span className="flex space-x-1 ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 tracking-wide">
                Đang chuẩn bị không gian truyện...
            </p>
        </div>
    );
};
