import React, { useEffect } from 'react';

// Fix: Replaced `declare global` with module augmentation for 'react'.
// This is a more robust way to extend JSX.IntrinsicElements and fixes the issue where
// the '<model-viewer>' custom element was not recognized by TypeScript.
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
                src?: string;
                alt?: string;
                ar?: boolean;
                'camera-controls'?: boolean;
                'auto-rotate'?: boolean;
                'shadow-intensity'?: string;
                exposure?: string;
            }, HTMLElement>;
        }
    }
}

interface ModelViewerProps {
    modelUrl: string;
    itemName: string;
    onClose: () => void;
}

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ARPhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2H17C18.1046 2 19 2.89543 19 4V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4C5 2.89543 5.89543 2 7 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 19H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 7.5L12 6L14.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.5 12.5V7.5L12 6V11L14.5 12.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 14L9.5 12.5L12 11L14.5 12.5L12 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const ModelViewer: React.FC<ModelViewerProps> = ({ modelUrl, itemName, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl h-full max-h-[80vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate pr-4">3D Model: {itemName}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close 3D viewer"
                    >
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                <main className="flex-grow bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <model-viewer
                        src={modelUrl}
                        alt={`A 3D model of ${itemName}`}
                        ar
                        camera-controls
                        auto-rotate
                        shadow-intensity="1"
                        exposure="1.2"
                        // Fix: Cast style object to React.CSSProperties to allow for CSS custom properties.
                        style={{ width: '100%', height: '100%', '--progress-bar-color': '#4f46e5' } as React.CSSProperties}
                    >
                       <div slot="poster" className="w-full h-full flex items-center justify-center text-slate-500">
                            Loading 3D model...
                        </div>
                    </model-viewer>
                </main>
                <footer className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-center text-center gap-4 max-w-md mx-auto">
                        <ARPhoneIcon className="w-12 h-12 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <div className="text-left">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">Want to see this in your room?</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                On a supported mobile device, tap the AR button to project this 3D model into your space.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};
