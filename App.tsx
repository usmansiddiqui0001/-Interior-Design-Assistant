
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { StyleSelector } from './components/StyleSelector';
import { DimensionsInput } from './components/DimensionsInput';
import { Loader } from './components/Loader';
import { DesignSuggestions } from './components/DesignSuggestions';
import { generateDesignIdeas, generateRedesignedImage, generateMorePalettes } from './services/geminiService';
import { DESIGN_STYLES, ROOM_TYPES } from './constants';
import type { DesignPlan, RoomDimensions, ColorPalette } from './types';
import { RoomTypeSelector } from './components/RoomTypeSelector';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [selectedRoomType, setSelectedRoomType] = useState<string>(ROOM_TYPES[0]);
  const [selectedStyle, setSelectedStyle] = useState<string>(DESIGN_STYLES[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // base64
  const [imagePreview, setImagePreview] = useState<string | null>(null); // object URL
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({ width: '', length: '', unit: 'ft' });
  const [designPlan, setDesignPlan] = useState<DesignPlan | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); // data URL for AI image
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isFetchingPalettes, setIsFetchingPalettes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };


  // Fix: Add explicit type annotation to useCallback.
  const handleImageUpload = useCallback<(file: File) => void>((file: File) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setUploadedImage(base64String);
    };
    reader.onerror = (err) => {
      console.error("Error reading file:", err);
      setError("Failed to read the image file. Please try uploading it again.");
    };
  }, [imagePreview]);

  // Fix: Add explicit type annotation to useCallback.
  const handleGenerateClick = useCallback<() => Promise<void>>(async () => {
    if (!uploadedImage || !selectedStyle || !selectedRoomType) {
      setError("Please upload an image, select a room type, and a design style.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setDesignPlan(null);
    setGeneratedImage(null);
    setFeedbackSubmitted(false); // Reset feedback on new generation

    let newPlan: DesignPlan | null = null;
    try {
      newPlan = await generateDesignIdeas(uploadedImage, selectedStyle, roomDimensions, selectedRoomType);
      setDesignPlan(newPlan);

      if (!uploadedImage) throw new Error("Original image not available for redesign.");
      const imageBytes = await generateRedesignedImage(newPlan, selectedStyle, selectedRoomType, uploadedImage);
      setGeneratedImage(`data:image/jpeg;base64,${imageBytes}`);

    } catch (err) {
      console.error("Error during design generation process:", err); // Log for debugging
      if (newPlan) {
        // This means generateDesignIdeas succeeded but generateRedesignedImage failed
        setError("I've created the design plan, but couldn't visualize the room. You can still see the ideas below!");
      } else {
        // This means generateDesignIdeas failed
        setError("Sorry, I couldn't generate a design plan. This can happen if the AI is under heavy load or if the image is unsuitable for analysis. Please try again in a few moments, or with a different photo.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, selectedStyle, roomDimensions, selectedRoomType]);

  // Fix: Add explicit type annotation to useCallback.
  const handleColorChange = useCallback<(newColors: ColorPalette) => Promise<void>>(async (newColors: ColorPalette) => {
    if (!designPlan || !uploadedImage) return;

    setIsRegenerating(true);
    setGeneratedImage(null); // Clear old image to show loader
    setError(null);

    const updatedPlan = { ...designPlan, wallColor: newColors };
    setDesignPlan(updatedPlan);

    try {
        const imageBytes = await generateRedesignedImage(updatedPlan, selectedStyle, selectedRoomType, uploadedImage, newColors);
        setGeneratedImage(`data:image/jpeg;base64,${imageBytes}`);
    } catch (err) {
        console.error("Failed to regenerate image with new colors:", err); // Log for debugging
        setError("Sorry, I couldn't visualize the new colors. The AI might be busy. Please try selecting them again in a moment.");
    } finally {
        setIsRegenerating(false);
    }
  }, [designPlan, selectedStyle, uploadedImage, selectedRoomType]);

  // Fix: Add explicit type annotation to useCallback.
  const handleSuggestMorePalettes = useCallback<() => Promise<void>>(async () => {
    if (!designPlan) return;
    setIsFetchingPalettes(true);
    setError(null);
    try {
      const newPalettes = await generateMorePalettes(designPlan, selectedStyle);
      setDesignPlan(prevPlan => {
        if (!prevPlan) return null;
        const existingPalettes = prevPlan.alternativePalettes.map(p => JSON.stringify(p));
        const uniqueNewPalettes = newPalettes.filter(p => !existingPalettes.includes(JSON.stringify(p)));
        return {
          ...prevPlan,
          alternativePalettes: [...prevPlan.alternativePalettes, ...uniqueNewPalettes],
        };
      });
    } catch (err) {
      console.error("Failed to fetch more palettes:", err); // Log for debugging
      setError("Sorry, couldn't fetch more color ideas right now. The AI might be busy. Please try again in a bit.");
    } finally {
      setIsFetchingPalettes(false);
    }
  }, [designPlan, selectedStyle]);

  const handleFeedbackSubmit = useCallback((rating: 'up' | 'down', comment: string) => {
    if (!designPlan) return;

    const feedbackData = {
        rating,
        comment,
        designPlan,
        timestamp: Date.now(),
    };

    try {
        const existingFeedbackJSON = localStorage.getItem('designFeedback');
        const existingFeedback = existingFeedbackJSON ? JSON.parse(existingFeedbackJSON) : [];
        existingFeedback.push(feedbackData);
        localStorage.setItem('designFeedback', JSON.stringify(existingFeedback));
        setFeedbackSubmitted(true);
    } catch (error) {
        console.error("Failed to save feedback to localStorage:", error);
    }
  }, [designPlan]);


  // Fix: Add explicit type annotation to useCallback.
  const handleReset = useCallback<() => void>(() => {
    setSelectedRoomType(ROOM_TYPES[0]);
    setSelectedStyle(DESIGN_STYLES[0]);
    setUploadedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setRoomDimensions({ width: '', length: '', unit: 'ft' });
    setDesignPlan(null);
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
    setIsRegenerating(false);
    setIsFetchingPalettes(false);
    setFeedbackSubmitted(false);
  }, [imagePreview]);

  const isButtonDisabled = !uploadedImage || isLoading;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200">
      <Header theme={theme} onToggle={handleThemeToggle} />
      <main className="container mx-auto p-4 md:p-8">
        {!designPlan && !isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-700 dark:text-slate-100 mb-2">Upload Your Room, Reimagine Your Space</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Let our AI give you a complete interior design makeover. Start by uploading a photo of your room and choosing your favorite design style.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col space-y-8">
                <ImageUploader onImageUpload={handleImageUpload} imagePreview={imagePreview} />
                <DimensionsInput 
                  dimensions={roomDimensions}
                  onDimensionsChange={setRoomDimensions}
                />
              </div>
              <div className="flex flex-col space-y-6">
                 <RoomTypeSelector
                  selectedRoomType={selectedRoomType}
                  onRoomTypeChange={setSelectedRoomType}
                 />
                 <StyleSelector
                  selectedStyle={selectedStyle}
                  onStyleChange={setSelectedStyle}
                />
                 <button
                  onClick={handleGenerateClick}
                  disabled={isButtonDisabled}
                  className={`w-full text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${
                    isButtonDisabled
                      ? 'bg-indigo-300 dark:bg-indigo-800/50 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl dark:bg-indigo-500 dark:hover:bg-indigo-600'
                  }`}
                >
                  Generate Makeover Ideas
                </button>
              </div>
            </div>

            {error && <div className="mt-6 text-center text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">{error}</div>}
          </div>
        )}
        
        {isLoading && <Loader />}

        {designPlan && (
           <div className="max-w-7xl mx-auto">
            {error && <div className="mb-6 text-center text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">{error}</div>}
            <DesignSuggestions 
                plan={designPlan} 
                originalImage={imagePreview} 
                generatedImage={generatedImage}
                onColorChange={handleColorChange}
                isRegenerating={isRegenerating}
                onSuggestMorePalettes={handleSuggestMorePalettes}
                isFetchingPalettes={isFetchingPalettes}
                onFeedbackSubmit={handleFeedbackSubmit}
                feedbackSubmitted={feedbackSubmitted}
            />
            <div className="text-center mt-12">
              <button 
                onClick={handleReset} 
                className="bg-slate-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors duration-300">
                  Start a New Project
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-slate-400 dark:text-slate-500 text-sm">
        <p>Powered by AI. Designs are for inspiration.</p>
      </footer>
    </div>
  );
};

export default App;
