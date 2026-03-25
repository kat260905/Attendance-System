import React from 'react';

export default function LoadingSpinner({ text = "Loading...", className = "min-h-[75vh]" }) {
    return (
        <div className={`flex flex-col items-center justify-center w-full h-full ${className}`}>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900 mb-4"></div>
            <p className="text-gray-600 font-medium">{text}</p>
        </div>
    );
}
