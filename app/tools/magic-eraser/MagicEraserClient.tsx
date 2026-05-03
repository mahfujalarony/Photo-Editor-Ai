"use client";

import { type ChangeEvent, type DragEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const MAX_SOURCE_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface Point {
  x: number;
  y: number;
}

export default function MagicEraserClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastPointRef = useRef<Point | null>(null);
  
  // History for undo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleSelectedFile = useCallback((selectedFile: File) => {
    if (preview) URL.revokeObjectURL(preview);

    if (!ALLOWED_TYPES.has(selectedFile.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (selectedFile.size > MAX_SOURCE_FILE_SIZE) {
      setError("Please choose an image smaller than 25MB.");
      return;
    }

    setError(null);
    setFile(selectedFile);
    setResultImage(null);
    setPreview(URL.createObjectURL(selectedFile));
    setHistory([]);
  }, [preview]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) handleSelectedFile(selectedFile);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) handleSelectedFile(droppedFile);
  };

  // Add paste and global drag/drop support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (preview) return; // Only if no image is currently uploaded

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            handleSelectedFile(pastedFile);
            break;
          }
        }
      }
    };

    const handleGlobalDragOver = (e: window.DragEvent) => {
      e.preventDefault();
      if (!preview) setIsDragging(true);
    };

    const handleGlobalDragLeave = (e: window.DragEvent) => {
      e.preventDefault();
      if (!preview) setIsDragging(false);
    };

    const handleGlobalDrop = (e: window.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (preview) return;

      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile && droppedFile.type.startsWith("image/")) {
        handleSelectedFile(droppedFile);
      }
    };

    document.addEventListener("paste", handlePaste);
    document.addEventListener("dragover", handleGlobalDragOver);
    document.addEventListener("dragleave", handleGlobalDragLeave);
    document.addEventListener("drop", handleGlobalDrop);

    return () => {
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("dragover", handleGlobalDragOver);
      document.removeEventListener("dragleave", handleGlobalDragLeave);
      document.removeEventListener("drop", handleGlobalDrop);
    };
  }, [preview, handleSelectedFile]);

  // Image load & Canvas initialization
  useEffect(() => {
    if (!preview || !canvasRef.current || !containerRef.current) return;

    const img = new window.Image();
    img.src = preview;
    img.onload = () => {
      imageRef.current = img;
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = window.innerHeight * 0.6; // max height
      
      const scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height,
        1
      );
      
      const width = img.width * scale;
      const height = img.height * scale;
      
      setCanvasSize({ width, height });
      
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height); // transparent initially
          // Save empty state to history
          setHistory([ctx.getImageData(0, 0, width, height)]);
        }
      }
    };
  }, [preview]);

  // Drawing handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (loading || resultImage) return;
    
    // Prevent scrolling on touch
    if ('touches' in e && e.cancelable) {
      // React synthetic events might need native event handling for preventDefault
    }
    
    setIsDrawing(true);
    const pos = getCoordinates(e);
    if (!pos || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Red-ish semi-transparent for mask visibility

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    lastPointRef.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPointRef.current || !canvasRef.current || loading || resultImage) return;
    
    // Prevent scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    const pos = getCoordinates(e);
    if (!pos) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPointRef.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    lastPointRef.current = null;

    // Save to history
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      setHistory(prev => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
    }
  };

  useEffect(() => {
    const preventTouchScroll = (e: TouchEvent) => {
      if (isDrawing && e.cancelable) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [isDrawing]);

  const undo = useCallback(() => {
    if (history.length <= 1 || !canvasRef.current) return;
    
    const newHistory = [...history];
    newHistory.pop(); // Remove current
    const previousState = newHistory[newHistory.length - 1];
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.putImageData(previousState, 0, 0);
    }
    
    setHistory(newHistory);
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const clearMask = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
    }
  };

  const createMaskImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!canvasRef.current || !imageRef.current) {
        reject(new Error("Canvas not ready"));
        return;
      }

      // We need to create a mask with the original image dimensions
      const originalWidth = imageRef.current.naturalWidth;
      const originalHeight = imageRef.current.naturalHeight;
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = originalWidth;
      maskCanvas.height = originalHeight;
      
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) {
        reject(new Error("Failed to get context"));
        return;
      }

      // Background must be pure black
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, originalWidth, originalHeight);

      // Draw the user mask scaled to original size
      maskCtx.drawImage(canvasRef.current, 0, 0, originalWidth, originalHeight);

      // Now we need to convert the alpha/red strokes to pure white
      const imageData = maskCtx.getImageData(0, 0, originalWidth, originalHeight);
      const data = imageData.data;
      
      let hasMask = false;
      for (let i = 0; i < data.length; i += 4) {
        // If there's any alpha/color, make it pure white
        if (data[i] > 0 || data[i+1] > 0 || data[i+2] > 0) {
          data[i] = 255;     // R
          data[i+1] = 255;   // G
          data[i+2] = 255;   // B
          data[i+3] = 255;   // A
          hasMask = true;
        }
      }

      if (!hasMask) {
        reject(new Error("No mask drawn. Please draw over the object you want to remove."));
        return;
      }

      maskCtx.putImageData(imageData, 0, 0);

      maskCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create mask blob"));
      }, 'image/jpeg', 0.95);
    });
  };

  const handleErase = async () => {
    if (!file || !preview) return;

    try {
      setLoading(true);
      setError(null);
      
      const maskBlob = await createMaskImage();
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('mask', maskBlob, 'mask.jpg');

      const response = await fetch('/api/magic-eraser', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      setResultImage(data.image);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong during erasure.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `lumina-erased-${file?.name || 'result.jpg'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="w-full">
      {!preview ? (
        // Upload State
        <label
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
            isDragging
              ? 'border-indigo-600 bg-indigo-100'
              : 'border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <svg className="w-12 h-12 mb-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mb-2 text-xl text-slate-700 font-bold">Upload, paste, or drop an image to erase objects</p>
            <p className="text-sm text-slate-500">JPG, PNG, WebP up to 25MB. Copy-paste works anywhere!</p>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="space-y-6">
           <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <h3 className="font-bold text-slate-800 text-lg">
                  {resultImage ? 'Result' : 'Draw over the object to remove it'}
                </h3>
                
                {!resultImage && (
                  <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Brush Size:</span>
                    <input 
                      type="range" 
                      min="5" 
                      max="100" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-24 accent-indigo-600"
                    />
                  </div>
                )}
             </div>

             <div className="flex items-center gap-2">
                {!resultImage ? (
                  <>
                    <button 
                      onClick={undo} 
                      disabled={history.length <= 1 || loading}
                      className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      Undo
                    </button>
                    <button 
                      onClick={clearMask} 
                      disabled={history.length <= 1 || loading}
                      className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setFile(null);
                      }}
                      className="text-sm text-red-500 hover:text-red-600 px-3 border border-transparent"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                   <button
                      onClick={() => {
                        setResultImage(null);
                        // Let them refine it optionally
                      }}
                      className="text-sm text-slate-600 hover:text-slate-800 px-3 font-medium"
                    >
                      Refine Again
                    </button>
                )}
             </div>
           </div>

           {error && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
               {error}
             </div>
           )}

           <div 
             ref={containerRef}
             className="relative flex items-center justify-center bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden touch-none"
             style={{ minHeight: '300px' }}
           >
              {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                   <div className="flex flex-col items-center">
                     <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <p className="text-slate-800 font-semibold bg-white px-4 py-2 rounded-full shadow-sm">AI is removing the object...</p>
                   </div>
                </div>
              )}

              {resultImage ? (
                 <div className="flex flex-col md:flex-row w-full h-full min-h-[400px]">
                   <div className="flex-1 w-full md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-col items-center justify-center bg-slate-50">
                     <span className="text-sm font-bold text-slate-500 mb-3 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">Original</span>
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={preview} alt="Original" className="max-w-full max-h-full object-contain rounded shadow-sm" style={{ maxHeight: '400px' }} />
                   </div>
                   <div className="flex-1 w-full md:w-1/2 p-4 flex flex-col items-center justify-center bg-white relative">
                     <span className="text-sm font-bold text-indigo-600 mb-3 bg-indigo-50 px-3 py-1 rounded-full shadow-sm border border-indigo-100">AI Result</span>
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain rounded shadow-sm" style={{ maxHeight: '400px' }} />
                   </div>
                 </div>
              ) : (
                <div 
                  className="relative touch-none select-none cursor-crosshair"
                  style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={preview} 
                    alt="Target" 
                    className="absolute inset-0 pointer-events-none w-full h-full object-contain" 
                  />
                  
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    className="absolute inset-0 z-10 opacity-60"
                  />
                </div>
              )}
           </div>

           <div className="flex justify-center mt-6">
              {!resultImage ? (
                <button
                  onClick={handleErase}
                  disabled={loading || history.length <= 1}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-12 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Erase Checked Area'}
                </button>
              ) : (
                 <div className="flex gap-4 w-full sm:w-auto">
                    <button
                      onClick={handleDownload}
                      className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download Image
                    </button>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setResultImage(null);
                      }}
                      className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-8 rounded-xl transition-all"
                    >
                      Upload New
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}