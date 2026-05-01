"use client";

import { useState, useRef, MouseEvent } from "react";

export default function MagicEraser() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const brushSize = 30; // ব্রাশের সাইজ

  // ছবি আপলোড হ্যান্ডেল করা
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setResultImage(null);
      
      // ক্যানভাসে ছবি সেট করা
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // আমরা ক্যানভাসের ব্যাকগ্রাউন্ডে ছবিটা রাখব CSS দিয়ে, ক্যানভাসে শুধু ব্রাশের দাগ পড়বে
          }
        }
      };
    }
  };

  // মাউসের পজিশন বের করা (CSS স্কেলিং ঠিক রাখার জন্য)
  const getMousePos = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // ড্রয়িং শুরু
  const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  // ড্রয়িং কন্টিনিউ
  const draw = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = "rgba(255, 50, 50, 0.5)"; // ইউজারের দেখার জন্য লাল রঙের ব্রাশ
      ctx.stroke();
    }
  };

  // ড্রয়িং শেষ
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // এপিআই-তে রিকোয়েস্ট পাঠানো
  const handleErase = async () => {
    if (!imageFile || !canvasRef.current) return;
    setIsProcessing(true);

    const canvas = canvasRef.current;

    // ১. মাস্ক ইমেজ তৈরি করা (সাদাকালো)
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mCtx = maskCanvas.getContext("2d");
    
    if (mCtx) {
      // প্রথমে পুরো মাস্ক কালো রং করে দিই
      mCtx.fillStyle = "black";
      mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      // এবার ইউজারের আঁকা দাগগুলো সাদা রং দিয়ে আঁকি
      mCtx.drawImage(canvas, 0, 0);
      mCtx.globalCompositeOperation = "source-in";
      mCtx.fillStyle = "white";
      mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // ২. মাস্ক ক্যানভাসকে Blob (ফাইল) এ কনভার্ট করা
    maskCanvas.toBlob(async (maskBlob) => {
      if (!maskBlob) return;

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("mask", maskBlob, "mask.png");

      try {
        // ৩. FastAPI ব্যাকএন্ডে রিকোয়েস্ট পাঠানো
        const response = await fetch("http://localhost:8000/api/magic-brush", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const blob = await response.blob();
          setResultImage(URL.createObjectURL(blob));
        } else {
          alert("Something went wrong!");
        }
      } catch (error) {
        console.error("API Error:", error);
        alert("Failed to connect to the backend.");
      } finally {
        setIsProcessing(false);
      }
    }, "image/png");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Magic Eraser 🪄</h1>
      <p className="text-gray-500 mb-8">Upload an image, brush over unwanted objects, and erase them!</p>

      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col items-center">
        
        {/* ফাইল আপলোড বাটন */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload} 
          className="mb-6 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-start">
          
          {/* এডিটিং এরিয়া */}
          {imageUrl && (
            <div className="flex flex-col items-center w-full md:w-1/2">
              <h3 className="text-lg font-semibold mb-3">Original Image (Draw here)</h3>
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-crosshair max-w-full">
                {/* অরিজিনাল ছবি ব্যাকগ্রাউন্ড হিসেবে */}
                <img 
                  src={imageUrl} 
                  alt="Original" 
                  className="w-full h-auto object-contain pointer-events-none" 
                  style={{ display: "block" }}
                />
                {/* ড্রয়িং ক্যানভাস */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="absolute top-0 left-0 w-full h-full touch-none"
                />
              </div>
              
              <button 
                onClick={handleErase} 
                disabled={isProcessing}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
              >
                {isProcessing ? "Erasing with Magic..." : "✨ Erase Object"}
              </button>
            </div>
          )}

          {/* রেজাল্ট এরিয়া */}
          {resultImage && (
            <div className="flex flex-col items-center w-full md:w-1/2">
              <h3 className="text-lg font-semibold mb-3 text-green-600">Magic Result</h3>
              <div className="border-2 border-green-200 rounded-lg overflow-hidden max-w-full shadow-lg">
                <img 
                  src={resultImage} 
                  alt="Result" 
                  className="w-full h-auto object-contain" 
                />
              </div>
              <a 
                href={resultImage} 
                download="magic-result.png"
                className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all text-center"
              >
                ⬇️ Download Image
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}