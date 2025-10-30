import React from 'react';

export const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.18,13.44a6.43,6.43,0,0,1-2.65,3.37,5.34,5.34,0,0,1-3.23,1.11,2.83,2.83,0,0,1-2.14-.88,3.22,3.22,0,0,1-1.22-2.34H14a3.1,3.1,0,0,0,1.21-2.43,3.07,3.07,0,0,0-1.21-2.44,3.58,3.58,0,0,0-2.58-.9,5.34,5.34,0,0,0-4,1.88,8.4,8.4,0,0,0-1.5,4.42,7.33,7.33,0,0,0,2,5.2,5.65,5.65,0,0,0,3.84,1.6,3.61,3.61,0,0,0,2.65-.95,3.33,3.33,0,0,1,1.51-1,3.42,3.42,0,0,1,2.15.8,5,5,0,0,0,3.38-1.55,5.83,5.83,0,0,0,1.35-3.61A1,1,0,0,1,19.18,13.44Zm-6-7.56a3.1,3.1,0,0,1,1.17-2.31,3.19,3.19,0,0,1,2.26-1,1,1,0,0,0,.43,0,4.89,4.89,0,0,0-2.4,4.24,4.68,4.68,0,0,0,1,3.12,3.45,3.45,0,0,1-2.48,1.06,3.1,3.1,0,0,1-2.34-1.16A4.82,4.82,0,0,1,8.3,6.4,5.22,5.22,0,0,1,13.14,5.88Z" />
  </svg>
);

export const AndroidIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19,10.5a1,1,0,0,0-1-1H16.5V6.75a.75.75,0,0,0-1.5,0V9.5H9V6.75a.75.75,0,0,0-1.5,0V9.5H6a1,1,0,0,0,0,2h1.5v4H6a1,1,0,0,0,0,2H7.5v2.75a.75.75,0,0,0,1.5,0V17.5h6v2.75a.75.75,0,0,0,1.5,0V17.5H18a1,1,0,0,0,0-2H16.5v-4H18A1,1,0,0,0,19,10.5ZM15,14.5H9v-4h6Z" />
    <path d="M7,5.5a1,1,0,1,0-1-1A1,1,0,0,0,7,5.5Z" />
    <path d="M18,4.5a1,1,0,1,0,1,1A1,1,0,0,0,18,4.5Z" />
  </svg>
);

export const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

export const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

export const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

export const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export const ArrowLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4"></path>
        <path d="M3 6.1h18"></path>
        <path d="M7 21.9l-4-4 4-4"></path>
        <path d="M21 17.9H3"></path>
    </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L9.5 8.5 4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5z"></path>
    </svg>
);

export const CombineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12 M12 12V2 M12 12H2 M12 12H22"></path>
        <path d="M17 2l5 5-5 5"></path><path d="M7 2L2 7l5 5"></path>
        <path d="M17 22l5-5-5-5"></path><path d="M7 22L2 17l5-5"></path>
    </svg>
);

export const ExtractIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20M12 2v20"></path><path d="M17 7l5-5-5-5"></path>
        <path d="M7 7l-5-5 5-5"></path><path d="M17 17l5 5-5 5"></path>
        <path d="M7 17l-5 5 5 5"></path>
    </svg>
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);