import React, { useState, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { DesignPlan, FurnitureSuggestion, ColorPalette } from '../types';
import { Feedback } from './Feedback';
import { ModelViewer } from './ModelViewer';

interface DesignSuggestionsProps {
  plan: DesignPlan | null;
  originalImage: string | null;
  generatedImage: string | null;
  onColorChange: (palette: ColorPalette) => void;
  isRegenerating: boolean;
  onSuggestMorePalettes: () => Promise<void>;
  isFetchingPalettes: boolean;
  onFeedbackSubmit: (rating: 'up' | 'down', comment: string) => void;
  feedbackSubmitted: boolean;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; isAutoHeight?: boolean }> = ({ title, children, icon, isAutoHeight }) => (
  <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex flex-col ${isAutoHeight ? '' : 'h-full'}`}>
    <div className="flex items-center mb-3">
      <div className="w-8 h-8 flex items-center justify-center text-indigo-500">{icon}</div>
      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-100 ml-2">{title}</h3>
    </div>
    <div className="text-slate-600 dark:text-slate-300 space-y-2 flex-grow">{children}</div>
  </div>
);

interface FurnitureCardProps {
  item: FurnitureSuggestion;
  onViewIn3D: (url: string, name: string) => void;
}

const FurnitureCard: React.FC<FurnitureCardProps> = ({ item, onViewIn3D }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-lg h-full flex flex-col">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center min-w-0">
                <div className="w-8 h-8 mr-4 text-indigo-500 flex-shrink-0 flex items-center justify-center">
                    {getFurnitureIcon(item)}
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</h4>
            </div>
            {item.estimatedPrice > 0 && (
                <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap pl-4">
                    ~${item.estimatedPrice.toLocaleString()}
                </p>
            )}
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-3 flex-grow">{item.description}</p>
        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase">Placement</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{item.placement}</p>
            </div>
            <div className="flex items-start">
                <ScaleIcon className="w-4 h-4 mr-2 mt-0.5 text-indigo-700 dark:text-indigo-400 flex-shrink-0" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">Suggested dimensions are appropriately scaled for your room.</p>
            </div>
            {item.modelUrl && (
                <button 
                    onClick={() => onViewIn3D(item.modelUrl!, item.name)}
                    className="w-full mt-2 inline-flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/80 transition-colors duration-200"
                >
                    <CubeIcon className="w-5 h-5 mr-2" />
                    View in 3D
                </button>
            )}
        </div>
    </div>
);

const PaletteButton: React.FC<{ palette: ColorPalette; onClick: () => void; disabled: boolean; }> = ({ palette, onClick, disabled }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="group relative w-full h-28 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden text-left shadow-sm transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:border-slate-700"
            style={{ backgroundColor: palette.color }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-3 flex flex-col justify-end">
                <p className="text-white font-bold text-sm truncate">{palette.color}</p>
                <p className="text-white/80 text-xs truncate">{palette.accent}</p>
            </div>
            <div 
                className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 border-white/50 shadow-md" 
                style={{ backgroundColor: palette.accent }}
            ></div>
        </button>
    );
};

// Helper function to convert data URL to a File object for sharing
const dataURLtoFile = async (dataurl: string, filename: string): Promise<File | null> => {
    if (!dataurl.startsWith('data:')) return null;
    try {
        const res = await fetch(dataurl);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    } catch (error) {
        console.error("Error converting data URL to file:", error);
        return null;
    }
};

export const DesignSuggestions: React.FC<DesignSuggestionsProps> = ({ 
    plan, 
    originalImage, 
    generatedImage, 
    onColorChange, 
    isRegenerating, 
    onSuggestMorePalettes, 
    isFetchingPalettes,
    onFeedbackSubmit,
    feedbackSubmitted
}) => {
  if (!plan) return null;

  const [copied, setCopied] = useState(false);
  const [is3DViewEnabled, setIs3DViewEnabled] = useState(false);
  const [viewingModel, setViewingModel] = useState<{url: string; name: string} | null>(null);
  const image3DRef = useRef<HTMLImageElement>(null);

  const handleShare = useCallback(async () => {
    if (!plan) return;

    const furnitureHighlights = plan.furnitureSuggestions.slice(0, 2).map(f => f.name.toLowerCase()).join(' and a ');
    const shareText = `Check out the interior design plan I just created! It features ${plan.wallColor.color.toLowerCase()} walls, ${plan.flooring.toLowerCase()}, and key furniture like a ${furnitureHighlights}. You can create your own with the AI Interior Design Assistant!`;
    const shareTitle = 'My AI Interior Design Plan';

    const imageFile = generatedImage ? await dataURLtoFile(generatedImage, 'ai-design-makeover.jpeg') : null;

    if (navigator.share && imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: shareTitle,
          text: shareText,
        });
        return;
      } catch (error) {
        console.error('Error sharing image file:', error);
      }
    }
    
    const textSharePayload: { title: string; text: string; url?: string; } = {
        title: shareTitle,
        text: shareText,
    };
    
    try {
        textSharePayload.url = window.location.href;
    } catch (e) {
        console.warn("Could not access window.location.href, sharing without a URL.");
    }
    
    if (navigator.share) {
        try {
            await navigator.share(textSharePayload);
        } catch (error) {
            console.error('Error using Web Share API for text:', error);
        }
    } else {
        const clipboardText = `${shareText} ${textSharePayload.url || ''}`.trim();
        try {
            await navigator.clipboard.writeText(clipboardText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Failed to copy text to clipboard:', err);
            alert('Failed to copy to clipboard.');
        }
    }
  }, [plan, generatedImage]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'ai-design-makeover.jpeg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);
  
  const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.currentTarget || !image3DRef.current) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const xPercent = (x / width) - 0.5;
    const yPercent = (y / height) - 0.5;

    const rotateX = -yPercent * 25;
    const rotateY = xPercent * 25;

    image3DRef.current.style.transform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave3D = () => {
    if (image3DRef.current) {
        image3DRef.current.style.transform = 'scale(1) rotateX(0) rotateY(0)';
    }
  };


  return (
    <div className="animate-fade-in">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-100 mb-4">Your Personalized Design Plan ✨</h2>
            <div className="relative inline-block">
                <button
                    onClick={handleShare}
                    className="inline-flex items-center bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <ShareIcon />
                    <span className="ml-2">Share Plan</span>
                </button>
                {copied && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs rounded py-1 px-3 whitespace-nowrap opacity-100 transition-opacity duration-300 pointer-events-none">
                        Copied to clipboard!
                    </div>
                )}
            </div>
        </div>

        {/* Image Comparison Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
                <div className="flex items-center justify-center gap-4 mb-3">
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-100">Your New Design</h3>
                    <button
                        onClick={() => setIs3DViewEnabled(!is3DViewEnabled)}
                        className={`inline-flex items-center text-sm font-semibold py-1 px-3 rounded-full border-2 transition-colors duration-200 ${is3DViewEnabled ? 'bg-indigo-600 text-white border-transparent' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400'}`}
                    >
                        <CubeIcon className="w-4 h-4 mr-2" />
                        {is3DViewEnabled ? '2D View' : '3D View'}
                    </button>
                </div>

                <div className="aspect-[3/2] bg-slate-100 dark:bg-slate-700 rounded-lg flex-grow overflow-hidden">
                    {generatedImage && !isRegenerating ? (
                        is3DViewEnabled ? (
                            <div
                                className="w-full h-full"
                                style={{ perspective: '1200px' }}
                                onMouseMove={handleMouseMove3D}
                                onMouseLeave={handleMouseLeave3D}
                            >
                                <img
                                    ref={image3DRef}
                                    src={generatedImage}
                                    alt="AI generated design in 3D view"
                                    className="object-cover w-full h-full rounded-lg"
                                    style={{
                                        transition: 'transform 0.1s ease-out',
                                        transform: 'scale(1) rotateX(0) rotateY(0)',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="relative group w-full h-full">
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={1}
                                    maxScale={8}
                                    limitToBounds={true}
                                    doubleClick={{ disabled: true }}
                                >
                                    {(controls) => (
                                        <>
                                            <div className="absolute top-2 right-2 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg shadow-md flex flex-col items-center p-1 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button onClick={() => controls.zoomIn()} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors" aria-label="Zoom in"><ZoomInIcon /></button>
                                                <button onClick={() => controls.zoomOut()} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors" aria-label="Zoom out"><ZoomOutIcon /></button>
                                                <button onClick={() => controls.resetTransform()} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors" aria-label="Reset zoom"><ResetIcon /></button>
                                                <div className="w-4/5 border-t border-slate-200 dark:border-slate-600"></div>
                                                <button onClick={handleDownload} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors" aria-label="Download image"><DownloadIcon /></button>
                                            </div>
                                            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0">
                                                <MagnifyingGlassPlusIcon className="h-10 w-10" />
                                                <p className="font-semibold mt-2 text-sm">Use mouse to zoom & pan</p>
                                            </div>
                                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                                                <img src={generatedImage} alt="AI generated design" className="object-cover w-full h-full cursor-grab active:cursor-grabbing" />
                                            </TransformComponent>
                                        </>
                                    )}
                                </TransformWrapper>
                            </div>
                        )
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-700 animate-pulse">
                            <ImageIcon />
                            <p className="mt-4 text-md font-semibold text-slate-500 dark:text-slate-400">Generating your new design...</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="md:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-100 mb-3 text-center">Original Room</h3>
                {originalImage ? (
                     <img src={originalImage} alt="Original room" className="rounded-lg object-cover w-full aspect-[3/2] flex-grow" />
                ): <div className="rounded-lg bg-slate-100 dark:bg-slate-700 aspect-[3/2] flex-grow"></div>}
            </div>
        </div>

        {/* Alternative Colors Section */}
        {plan.alternativePalettes && plan.alternativePalettes.length > 0 && (
            <div className="mb-12">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                     <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-100 mb-6 text-center">Not feeling the colors? Try these!</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                        {plan.alternativePalettes.map((palette, index) => (
                           <PaletteButton 
                                key={index}
                                palette={palette}
                                onClick={() => onColorChange(palette)}
                                disabled={isRegenerating || isFetchingPalettes}
                           />
                        ))}
                     </div>
                     <div className="text-center">
                        <button
                            onClick={onSuggestMorePalettes}
                            disabled={isRegenerating || isFetchingPalettes}
                            className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-semibold py-2 px-5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/80 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isFetchingPalettes ? (
                                <>
                                    <SpinnerIcon />
                                    <span>Fetching Ideas...</span>
                                </>
                            ) : (
                                <span>Suggest More Palettes</span>
                            )}
                        </button>
                     </div>
                </div>
            </div>
        )}
        
        {/* Designer's Analysis & Rationale */}
        <div className="mb-12 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <InfoCard title="Designer's Analysis" icon={<AnalysisIcon />} isAutoHeight>
                <p>{plan.analysis}</p>
            </InfoCard>
            <InfoCard title="Design Rationale" icon={<RationaleIcon />} isAutoHeight>
                <p>{plan.designRationale}</p>
            </InfoCard>
        </div>


        {/* Key Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <InfoCard title="Estimated Budget" icon={<MoneyIcon />}>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-100">
                    ${plan.estimatedCost.min.toLocaleString()} - ${plan.estimatedCost.max.toLocaleString()}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">{plan.estimatedCost.currency}</span>
                </p>
            </InfoCard>
            <InfoCard title="Color Palette" icon={<PaletteIcon />}>
                <p><strong>Primary:</strong> {plan.wallColor.color}</p>
                <p><strong>Accent:</strong> {plan.wallColor.accent}</p>
            </InfoCard>
            <InfoCard title="Lighting" icon={<LightbulbIcon />}>
                <p>{plan.lighting}</p>
            </InfoCard>
            <InfoCard title="Flooring" icon={<FlooringIcon />}>
                <p>{plan.flooring}</p>
            </InfoCard>
        </div>

        {/* Furniture & Decor Section */}
        <div className="mb-12">
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-100 mb-6 text-center">Key Furniture & Decor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plan.furnitureSuggestions.map((item, index) => (
                    <FurnitureCard 
                      key={index} 
                      item={item} 
                      onViewIn3D={(url, name) => setViewingModel({url, name})}
                    />
                ))}
            </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-12">
            <Feedback onSubmit={onFeedbackSubmit} isSubmitted={feedbackSubmitted} />
        </div>

        {viewingModel && (
          <ModelViewer 
              modelUrl={viewingModel.url}
              itemName={viewingModel.name}
              onClose={() => setViewingModel(null)}
          />
        )}
    </div>
  );
};

// SVG Icons

const CubeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7v10l8 4" />
    </svg>
);
const SofaIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);
const LampIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.512 1.424L6.25 13.5h11.5l-2.988-3.258a2.25 2.25 0 01-.512-1.424V3.104a2.25 2.25 0 00-4.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21h-1.5m1.5 0h1.5M12 21v-3.375M12 6.75h.008v.008H12V6.75z" />
    </svg>
);
const TableIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5v8.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75L6 3.75h12l2.25 6M12 3.75v6" />
    </svg>
);
const ChairIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18v-3.75m12 3.75V14.25m-6 3.75v-6.75m0 0l-3-3m3 3l3-3m-3-3v-2.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V6.75m-6 0v-2.25a2.25 2.25 0 00-2.25-2.25h-1.5A2.25 2.25 0 006 4.5v2.25m6 0h.008v.008H12V6.75z" />
    </svg>
);
const BedIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 18.75V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25z" />
    </svg>
);
const ShelfIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
    </svg>
);
const RugIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75a2.25 2.25 0 012.25-2.25h10.5a2.25 2.25 0 012.25 2.25v16.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25h15M4.5 12h15m-15-8.25h15" />
    </svg>
);
const DefaultFurnitureIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M12 21l-2.25-4.5M12 21l2.25-4.5M12 21V3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

const getFurnitureIcon = (item: FurnitureSuggestion) => {
    const name = item.name.toLowerCase();
    if (name.includes('sofa') || name.includes('couch') || name.includes('sectional')) return <SofaIcon />;
    if (name.includes('lamp')) return <LampIcon />;
    if (name.includes('table') || name.includes('desk') || name.includes('console')) return <TableIcon />;
    if (name.includes('chair') || name.includes('stool') || name.includes('ottoman')) return <ChairIcon />;
    if (name.includes('bed')) return <BedIcon />;
    if (name.includes('shelf') || name.includes('bookcase') || name.includes('cabinet')) return <ShelfIcon />;
    if (name.includes('rug') || name.includes('carpet')) return <RugIcon />;
    return <DefaultFurnitureIcon />;
};


const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z" />
    </svg>
  );
const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-700 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const MoneyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h4z" />
    </svg>
);
const PaletteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h8a2 2 0 002-2v-4a2 2 0 00-2-2h-8a2 2 0 00-2 2v4a2 2 0 002 2z" />
  </svg>
);
const AnalysisIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const RationaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 16l-4 1 1-4 9.293-9.293a1 1 0 011.414 0z" />
    </svg>
);
const LightbulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);
const FlooringIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 16V8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 16V8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
  </svg>
);
const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);
const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);
const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
    </svg>
);
const MagnifyingGlassPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-20 h-20 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);