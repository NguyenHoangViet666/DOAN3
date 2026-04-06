import React from 'react';

export const Logo = ({ className = "w-9 h-9" }: { className?: string }) => {
    return (
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Ambient Glow for Dark Mode */}
            <circle cx="100" cy="100" r="80" className="hidden dark:block fill-purple-900/40 blur-xl animate-pulse" />
            
            {/* Left Wing / Pages */}
            <path 
                d="M100 40C80 30 50 35 30 50V150C50 135 80 130 100 140V40Z" 
                className="fill-indigo-100/50 dark:fill-indigo-950/80 stroke-indigo-600 dark:stroke-fuchsia-500 stroke-[8] stroke-linejoin-round transition-colors duration-500"
            />
            {/* Right Wing / Pages */}
            <path 
                d="M100 40C120 30 150 35 170 50V150C150 135 120 130 100 140V40Z" 
                className="fill-indigo-50/50 dark:fill-purple-950/80 stroke-indigo-500 dark:stroke-purple-400 stroke-[8] stroke-linejoin-round transition-colors duration-500"
            />
            
            {/* The letter B abstraction - Top Loop */}
            <path 
                d="M100 40C130 40 150 50 150 65C150 80 130 90 100 90" 
                className="stroke-blue-600 dark:stroke-fuchsia-300 stroke-[12] stroke-linecap-round drop-shadow-md transition-colors duration-500"
            />
            {/* The letter B abstraction - Bottom Loop */}
            <path 
                d="M100 90C140 90 160 105 160 120C160 135 130 140 100 140" 
                className="stroke-blue-500 dark:stroke-purple-300 stroke-[12] stroke-linecap-round drop-shadow-md transition-colors duration-500"
            />
            
            {/* Center Spine */}
            <path 
                d="M100 30V150" 
                className="stroke-indigo-800 dark:stroke-white stroke-[8] stroke-linecap-round transition-colors duration-500"
            />
            
            {/* Magic Dust (Animations) */}
            <circle cx="45" cy="45" r="6" className="fill-amber-400 animate-pulse" />
            <circle cx="155" cy="155" r="5" className="fill-fuchsia-400 animate-pulse delay-150" />
            <circle cx="20" cy="100" r="3" className="fill-indigo-400 dark:fill-purple-200 animate-pulse delay-300" />
        </svg>
    );
};
