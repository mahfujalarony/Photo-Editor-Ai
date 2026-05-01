'use client';

import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';

export default function ImageToTextClient() {
  const apiBaseUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const handleFileRef = useRef<((nextFile: File) => void) | null>(null);

  const handleSelectedFile = (selectedFile: File) => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setExtractedText('');
    setCopySuccess(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleSelectedFile(selectedFile);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleSelectedFile(droppedFile);
    }
  };

  useEffect(() => {
    handleFileRef.current = handleSelectedFile;
  }, [preview]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let index = 0; index < items.length; index++) {
        if (items[index].type.startsWith('image/')) {
          const pastedFile = items[index].getAsFile();
          if (pastedFile && handleFileRef.current) {
            handleFileRef.current(pastedFile);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleExtractText = async () => {
    if (!file) return;
    setLoading(true);
    setExtractedText('');
    setCopySuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiBaseUrl}/extract-text`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to extract text');

      const data = await response.json();
      if (data.success) {
        setExtractedText(data.text);
      } else {
        setExtractedText("No text could be found in this image.");
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while connecting to the AI.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="mb-2 text-xl text-slate-700 font-bold">Upload an image with text</p>
            <p className="text-sm text-slate-500">Supports English, Bengali, Spanish, and 50+ languages.</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      ) : (
        // Processing State
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Left: Image Preview & Actions */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Source Image</h3>
              <button
                onClick={() => {
                  if (preview) {
                    URL.revokeObjectURL(preview);
                  }
                  setFile(null);
                  setPreview(null);
                  setExtractedText('');
                }}
                className="text-sm text-red-500 font-medium hover:underline"
              >
                Upload Another
              </button>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Upload" className="max-w-full h-auto max-h-[400px] object-contain rounded-lg" />
            </div>

            <button 
              onClick={handleExtractText}
              disabled={loading || !!extractedText}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Extracting Text via AI...
                </>
              ) : extractedText ? 'Extraction Complete' : 'Extract Text Now'}
            </button>
          </div>

          {/* Right: Extracted Text Result */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Extracted Text</h3>
              {extractedText && (
                <button 
                  onClick={copyToClipboard} 
                  className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${copySuccess ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {copySuccess ? 'Copied!' : 'Copy Text'}
                </button>
              )}
            </div>

            <div className="relative flex-1">
              <textarea 
                readOnly
                value={extractedText}
                placeholder={loading ? 'AI is analyzing the image...' : 'The extracted text will appear here. It automatically detects the language and formats the output cleanly.'}
                className={`w-full h-full min-h-[300px] lg:min-h-full p-5 border rounded-xl resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${extractedText ? 'bg-white border-indigo-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}