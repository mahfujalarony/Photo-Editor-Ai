'use client';

import { type ChangeEvent, useEffect, useRef, useState, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const MAX_SOURCE_FILE_SIZE = 50 * 1024 * 1024;
const MAX_CANVAS_DIMENSION = 6000;
const MIN_CANVAS_DIMENSION = 96;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const FILE_SIZE_PRESETS = [
  { label: '50 KB', targetBytes: 50 * 1024 },
  { label: '100 KB', targetBytes: 100 * 1024 },
  { label: '150 KB', targetBytes: 150 * 1024 },
  { label: '250 KB', targetBytes: 250 * 1024 },
  { label: '300 KB', targetBytes: 300 * 1024 },
  { label: '500 KB', targetBytes: 500 * 1024 },
  { label: '750 KB', targetBytes: 750 * 1024 },
  { label: '900 KB', targetBytes: 900 * 1024 },
  { label: '1 MB', targetBytes: 1024 * 1024 },
  { label: '2 MB', targetBytes: 2 * 1024 * 1024 },
  { label: '5 MB', targetBytes: 5 * 1024 * 1024 },
  { label: '8 MB', targetBytes: 8 * 1024 * 1024 },
  { label: '10 MB', targetBytes: 10 * 1024 * 1024 },
  { label: '20 MB', targetBytes: 20 * 1024 * 1024 },
];

const OUTPUT_FORMATS = [
  { label: 'JPG', value: 'image/jpeg', ext: 'jpg' },
  { label: 'PNG', value: 'image/png', ext: 'png' },
  { label: 'WebP', value: 'image/webp', ext: 'webp' },
];

function CropIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3v12a3 3 0 0 0 3 3h12M3 6h12a3 3 0 0 1 3 3v12M9 9h6v6H9z"
      />
    </svg>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load this image.'));
    };

    image.src = url;
  });
}

async function getImageDimensions(blob: Blob) {
  const image = await loadImageFromBlob(blob);

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function drawImageToCanvas(image: HTMLImageElement, scale: number) {
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare this image.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

function canvasToFormatBlob(canvas: HTMLCanvasElement, format: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not export this image.'));
          return;
        }

        resolve(blob);
      },
      format,
      quality,
    );
  });
}

async function findBestFormatUnderTarget(
  canvas: HTMLCanvasElement,
  targetBytes: number,
  format: string
) {
  let low = 0.08;
  let high = 0.95;
  let bestUnder: Blob | null = null;
  let smallest: Blob | null = null;

  // For PNG, the quality parameter is not effective for size reduction
  if (format === 'image/png') {
    const blob = await canvasToFormatBlob(canvas, format, 1);
    if (blob.size <= targetBytes) {
      bestUnder = blob;
    }
    smallest = blob;
    return { bestUnder, smallest };
  }

  for (let index = 0; index < 10; index++) {
    const quality = (low + high) / 2;
    const blob = await canvasToFormatBlob(canvas, format, quality);

    if (!smallest || blob.size < smallest.size) {
      smallest = blob;
    }

    if (blob.size <= targetBytes) {
      bestUnder = blob;
      low = quality;
    } else {
      high = quality;
    }
  }

  return { bestUnder, smallest };
}

function padBlobToTarget(blob: Blob, targetBytes: number, format: string) {
  if (blob.size >= targetBytes) return blob;

  const padding = new Uint8Array(targetBytes - blob.size);
  return new Blob([blob, padding], { type: format });
}

async function createTargetSizedImage(sourceBlob: Blob, targetBytes: number, format: string) {
  const image = await loadImageFromBlob(sourceBlob);
  const maxSourceDimension = Math.max(image.naturalWidth, image.naturalHeight);
  let scale = Math.min(1, MAX_CANVAS_DIMENSION / maxSourceDimension);
  let lastSmallest: Blob | null = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const canvas = drawImageToCanvas(image, scale);
    const { bestUnder, smallest } = await findBestFormatUnderTarget(
      canvas,
      targetBytes,
      format
    );

    if (bestUnder) {
      return padBlobToTarget(bestUnder, targetBytes, format);
    }

    lastSmallest = smallest;

    const nextWidth = image.naturalWidth * scale * 0.82;
    const nextHeight = image.naturalHeight * scale * 0.82;

    if (
      Math.max(nextWidth, nextHeight) < MIN_CANVAS_DIMENSION ||
      Math.min(nextWidth, nextHeight) < 1
    ) {
      break;
    }

    scale *= 0.82;
  }

  if (lastSmallest) {
    return lastSmallest;
  }

  throw new Error('Could not create the selected file size.');
}

export default function ResizerClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [isCropMode, setIsCropMode] = useState(false);

  const [outputFormat, setOutputFormat] = useState(OUTPUT_FORMATS[0].value);
  const [fileSizePresetIndex, setFileSizePresetIndex] = useState(4);
  const [loading, setLoading] = useState(false);
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);
  const [finalResultBlob, setFinalResultBlob] = useState<Blob | null>(null);
  const [resultDimensions, setResultDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [resultSize, setResultSize] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState('lumina-ai-resized.jpg');
  const [savingResult, setSavingResult] = useState(false);
  const [storedResultId, setStoredResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedFileSize = FILE_SIZE_PRESETS[fileSizePresetIndex];
  const sourceSize = croppedBlob?.size ?? file?.size ?? 0;

  useEffect(() => {
    return () => {
      if (imgSrc) URL.revokeObjectURL(imgSrc);
    };
  }, [imgSrc]);

  useEffect(() => {
    return () => {
      if (croppedPreview) URL.revokeObjectURL(croppedPreview);
    };
  }, [croppedPreview]);

  useEffect(() => {
    return () => {
      if (finalResultUrl) URL.revokeObjectURL(finalResultUrl);
    };
  }, [finalResultUrl]);

  function resetProcessedState() {
    setFinalResultUrl(null);
    setFinalResultBlob(null);
    setResultDimensions(null);
    setResultSize(null);
    setStoredResultId(null);
    setSavingResult(false);
    setError(null);
  }

  function resetCropState() {
    setCrop(undefined);
    setCompletedCrop(null);
    setCroppedBlob(null);
    setCroppedPreview(null);
  }

  function clearAll() {
    setFile(null);
    setImgSrc('');
    setIsCropMode(false);
    resetCropState();
    resetProcessedState();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  // Wrap inside useCallback to avoid dependency warnings
  const handleSelectedFile = useCallback((selectedFile: File) => {
    if (!ALLOWED_TYPES.has(selectedFile.type)) {
      setFile(null);
      setImgSrc('');
      setIsCropMode(false);
      resetCropState();
      resetProcessedState();
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (selectedFile.size > MAX_SOURCE_FILE_SIZE) {
      setFile(null);
      setImgSrc('');
      setIsCropMode(false);
      resetCropState();
      resetProcessedState();
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setError('Please upload an image smaller than 50MB.');
      return;
    }

    setFile(selectedFile);
    setImgSrc(URL.createObjectURL(selectedFile));
    setIsCropMode(false);
    resetCropState();
    resetProcessedState();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) handleSelectedFile(selectedFile);
  }

  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLLabelElement | HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) handleSelectedFile(droppedFile);
  };

  // Add paste and global drag/drop support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (imgSrc) return; // Only if no image is currently uploaded

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

    const handleGlobalDragOver = (e: globalThis.DragEvent) => {
      e.preventDefault();
      if (!imgSrc) setIsDragging(true);
    };

    const handleGlobalDragLeave = (e: globalThis.DragEvent) => {
      e.preventDefault();
      if (!imgSrc) setIsDragging(false);
    };

    const handleGlobalDrop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (imgSrc) return;

      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile && droppedFile.type.includes("image/")) {
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
  }, [imgSrc, handleSelectedFile]);

  function toggleCropMode() {
    setIsCropMode((current) => {
      const nextCropMode = !current;

      if (!nextCropMode) {
        resetCropState();
        resetProcessedState();
      }

      return nextCropMode;
    });
  }

  function applyCrop() {
    if (
      !isCropMode ||
      !imgRef.current ||
      !completedCrop ||
      completedCrop.width <= 0 ||
      completedCrop.height <= 0
    ) {
      setError('Please select an area before applying crop.');
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not prepare this crop.');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropWidth = Math.max(1, Math.round(completedCrop.width * scaleX));
    const cropHeight = Math.max(1, Math.round(completedCrop.height * scaleY));

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cropWidth, cropHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not apply crop.');
          return;
        }

        setCroppedBlob(blob);
        setCroppedPreview(URL.createObjectURL(blob));
        resetProcessedState();
      },
      'image/jpeg',
      0.95,
    );
  }

  async function processImageInBrowser() {
    const sourceBlob = croppedBlob || file;

    if (!sourceBlob) {
      setError('Please upload an image first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFinalResultUrl(null);
      setFinalResultBlob(null);
      setResultDimensions(null);
      setResultSize(null);
      setStoredResultId(null);

      const blob = await createTargetSizedImage(
        sourceBlob,
        selectedFileSize.targetBytes,
        outputFormat
      );
      const dimensions = await getImageDimensions(blob);
      const resultUrl = URL.createObjectURL(blob);
      const ext = OUTPUT_FORMATS.find((f) => f.value === outputFormat)?.ext || 'jpg';
      const nextDownloadName = `lumina-ai-resized-${selectedFileSize.label
        .toLowerCase()
        .replace(/\s+/g, '-')}.${ext}`;

      setFinalResultUrl(resultUrl);
      setFinalResultBlob(blob);
      setResultDimensions(dimensions);
      setResultSize(formatBytes(blob.size));
      setDownloadName(nextDownloadName);
      
      // Auto save after processing finishes
      try {
        const formData = new FormData();
        formData.append('file', blob, nextDownloadName);
        formData.append('originalName', file?.name ?? '');
        formData.append('outputName', nextDownloadName);
        formData.append('originalSize', String(file?.size ?? 0));
        formData.append('sourceSize', String(sourceSize));
        formData.append('targetLabel', selectedFileSize.label);
        formData.append('targetBytes', String(selectedFileSize.targetBytes));
        formData.append('width', String(dimensions.width));
        formData.append('height', String(dimensions.height));
        formData.append('cropApplied', String(Boolean(croppedBlob)));

        const response = await fetch('/api/image-resizer/results', {
          method: 'POST',
          body: formData,
        });

        const payload: { id?: string } | null = await response.json().catch(() => null);
        if (response.ok && payload?.id) {
          setStoredResultId(payload.id);
        }
      } catch {
       // Silently fail if save error happens during auto processing 
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Error processing image.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveGeneratedResult() {
    if (!finalResultBlob || !resultDimensions) {
      throw new Error('Please finalize the image before downloading.');
    }

    const formData = new FormData();
    formData.append('file', finalResultBlob, downloadName);
    formData.append('originalName', file?.name ?? '');
    formData.append('outputName', downloadName);
    formData.append('originalSize', String(file?.size ?? 0));
    formData.append('sourceSize', String(sourceSize));
    formData.append('targetLabel', selectedFileSize.label);
    formData.append('targetBytes', String(selectedFileSize.targetBytes));
    formData.append('width', String(resultDimensions.width));
    formData.append('height', String(resultDimensions.height));
    formData.append('cropApplied', String(Boolean(croppedBlob)));

    const response = await fetch('/api/image-resizer/results', {
      method: 'POST',
      body: formData,
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string'
          ? payload.error
          : 'Could not save this image to storage.';

      throw new Error(message);
    }

    if (
      payload &&
      typeof payload === 'object' &&
      'id' in payload &&
      typeof payload.id === 'string'
    ) {
      setStoredResultId(payload.id);
    }
  }

  function triggerDownload() {
    if (!finalResultUrl) return;

    const link = document.createElement('a');
    link.href = finalResultUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleDownload() {
    if (!finalResultBlob || !finalResultUrl) {
      setError('Please finalize the image before downloading.');
      return;
    }

    try {
      setSavingResult(true);
      setError(null);

      if (!storedResultId) {
        await saveGeneratedResult();
      }

      triggerDownload();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Could not save this image before download.',
      );
    } finally {
      setSavingResult(false);
    }
  }

  function handleTargetChange(event: ChangeEvent<HTMLSelectElement>) {
    setFileSizePresetIndex(Number(event.target.value));
    resetProcessedState();
  }

  const mainPreviewImage = imgSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={imgSrc}
      alt="Original preview"
      className="max-h-[320px] max-w-full object-contain"
    />
  ) : null;

  const sourcePreviewImage = imgSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt="Source preview"
      className="max-h-full max-w-full object-contain"
    />
  ) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8">
      {!imgSrc ? (
        <label 
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition text-center ${
            isDragging
              ? 'border-blue-600 bg-blue-100'
              : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-lg font-semibold text-slate-700">Upload, paste, or drop an image</p>
          <p className="mt-2 text-sm text-slate-500">JPG, PNG, or WebP up to 50MB</p>
        </label>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b pb-4">
            <h3 className="text-xl font-bold text-slate-800">Edit Image</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCropMode}
                aria-pressed={isCropMode}
                aria-label={isCropMode ? 'Turn crop off' : 'Turn crop on'}
                title={isCropMode ? 'Turn crop off' : 'Turn crop on'}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isCropMode
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <CropIcon />
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-red-200 hover:text-red-600"
              >
                Upload New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-3">
                {isCropMode ? (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
                    className="max-h-full max-w-full"
                  >
                    {mainPreviewImage}
                  </ReactCrop>
                ) : (
                  mainPreviewImage
                )}
              </div>

              {isCropMode ? (
                <button
                  type="button"
                  onClick={applyCrop}
                  className="w-full rounded-lg bg-slate-800 px-4 py-2 font-medium text-white shadow-sm hover:bg-slate-900"
                >
                  Apply Crop
                </button>
              ) : null}
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Source
                  </p>
                  <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-white">
                    {croppedPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={croppedPreview}
                        alt="Cropped preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      sourcePreviewImage
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Result
                  </p>
                  <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-lg bg-white">
                    {finalResultUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={finalResultUrl}
                        alt="Processed result preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-slate-400">Preview</span>
                    )}

                    {loading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                        <p className="mt-3 text-xs font-semibold text-slate-700">
                          Processing...
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-semibold text-slate-700">
                  Output Format
                </h4>
                <select
                  value={outputFormat}
                  onChange={(e) => {
                    setOutputFormat(e.target.value);
                    resetProcessedState();
                  }}
                  className="mb-5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  {OUTPUT_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>

                <h4 className="mb-3 font-semibold text-slate-700">
                  Target File Size
                </h4>
                <select
                  value={fileSizePresetIndex}
                  onChange={handleTargetChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 outline-none focus:border-blue-500"
                >
                  {FILE_SIZE_PRESETS.map((preset, index) => (
                    <option key={preset.label} value={index}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">
                    Source: {formatBytes(sourceSize)}
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  Target: {selectedFileSize.label}
                </div>
              </div>

              <button
                type="button"
                onClick={processImageInBrowser}
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Processing...' : 'Finalize'}
              </button>

              {finalResultUrl ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                  <p className="mb-3 text-sm font-semibold text-green-700">
                    Ready{resultSize ? ` (${resultSize})` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={savingResult}
                    className="inline-block rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingResult ? 'Saving...' : 'Download'}
                  </button>
                  {storedResultId ? (
                    <p className="mt-2 text-xs font-medium text-green-700">
                      
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
