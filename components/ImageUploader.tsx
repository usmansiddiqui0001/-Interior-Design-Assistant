import React, { useCallback, useState, useRef, useEffect } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  imagePreview: string | null;
}

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const UploadIconSimple: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


const CameraIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round"d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SwitchCameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 19v-5h-5M4 9a9 9 0 0118 0v0M20 15a9 9 0 01-18 0v0" />
    </svg>
);

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, imagePreview }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getAvailableCameras = async () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (err) {
        console.error("Could not enumerate devices:", err);
        return [];
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser.");
        setIsCameraOpen(false);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
        }
        const cameras = await getAvailableCameras();
        setAvailableCameras(cameras);
    } catch (err) {
        console.error("Error accessing camera:", err);
        const error = err as Error;

        if (error.name === 'NotAllowedError') {
            setCameraError("Camera permission was denied. Please allow camera access in your browser settings to use this feature.");
            setIsCameraOpen(false);
        } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
            const fallbackMode = mode === 'environment' ? 'user' : 'environment';
            console.warn(`Camera for '${mode}' not found, trying '${fallbackMode}'`);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fallbackMode } });
                setFacingMode(fallbackMode);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                }
                const cameras = await getAvailableCameras();
                setAvailableCameras(cameras);
            } catch (fallbackErr) {
                console.error("Fallback camera access also failed.", fallbackErr);
                setCameraError("No suitable camera found on your device. It might be in use by another application.");
                setIsCameraOpen(false);
            }
        } else {
            setCameraError("Could not access camera. Please ensure it has permission and is not in use.");
            setIsCameraOpen(false);
        }
    }
  }, [stopCamera]);

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraOpen, facingMode, startCamera, stopCamera]);


  const handleCapture = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onImageUpload(file);
          }
          setIsCameraOpen(false);
        }, 'image/jpeg', 0.95);
      }
    }
  }, [onImageUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">1. Upload Your Room Photo</h3>
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative group flex flex-col items-center justify-center w-full aspect-[16/9] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200
        ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      >
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Room preview" className="object-cover h-full w-full rounded-lg" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 rounded-lg">
                <label htmlFor="dropzone-file" className="cursor-pointer inline-flex items-center bg-white/90 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-white transition-all duration-200 shadow-md">
                    <UploadIconSimple />
                    <span className="ml-2">Change File</span>
                </label>
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCameraOpen(true); }}
                    className="inline-flex items-center bg-white/90 text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-white transition-all duration-200 shadow-md">
                    <CameraIcon />
                    <span className="ml-2">Use Camera</span>
                </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full p-4">
              <UploadIcon />
              <p className="mb-4 text-slate-500 dark:text-slate-400 text-sm">
                  Drag & drop your image or choose an option
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4">
                  <label
                      htmlFor="dropzone-file"
                      className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md"
                  >
                      <UploadIconSimple />
                      <span className="ml-2">Upload File</span>
                  </label>
                  <button
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCameraOpen(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2 px-5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600/80 transition-all duration-200 shadow-sm"
                  >
                      <CameraIcon />
                      <span className="ml-2">Use Camera</span>
                  </button>
              </div>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                  Supports: PNG, JPG, WEBP
              </p>
          </div>
        )}
        <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
      </label>
      {cameraError && <p className="mt-2 text-xs text-red-500 text-center">{cameraError}</p>}
      
      {isCameraOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
          aria-modal="true"
          role="dialog"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full w-auto h-auto max-h-[calc(100vh-150px)] rounded-lg shadow-2xl bg-slate-900"
          ></video>

          <div className="absolute bottom-0 left-0 right-0 h-[150px] flex items-center justify-center">
            <div className="relative w-full max-w-xs flex justify-center items-center">
                {availableCameras.length > 1 && (
                    <button
                        onClick={handleSwitchCamera}
                        className="absolute right-0 w-16 h-16 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        aria-label="Switch camera"
                    >
                        <SwitchCameraIcon className="h-8 w-8" />
                    </button>
                )}
                <button
                    onClick={handleCapture}
                    className="group w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-slate-400 hover:border-white transition-colors"
                    aria-label="Take photo"
                >
                    <div className="w-16 h-16 bg-white rounded-full group-hover:bg-red-500 transition-colors"></div>
                </button>
            </div>
          </div>

          <button
              onClick={() => setIsCameraOpen(false)}
              className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors"
              aria-label="Close camera"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </div>
      )}
    </div>
  );
};
