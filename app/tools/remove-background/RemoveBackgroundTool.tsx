"use client";

import Image from "next/image";
import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const BACKGROUND_COLORS = [
  "transparent",
  "#ffffff",
  "#000000",
  "#f3f4f6",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
];

type ApiResponse = {
  image?: string;
  filename?: string;
  error?: string;
};

type DownloadFormat = "png" | "jpeg" | "webp";

const FORMAT_OPTIONS: { label: string; value: DownloadFormat; mime: string }[] = [
  { label: "PNG", value: "png", mime: "image/png" },
  { label: "JPG", value: "jpeg", mime: "image/jpeg" },
  { label: "WebP", value: "webp", mime: "image/webp" },
];

export default function RemoveBackgroundTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);

  const [bgColor, setBgColor] = useState("transparent");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("png");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of handleFile so we can use it in the paste event securely
  const handleFileRef = useRef<((file: File) => void) | null>(null);

  function handleFile(file: File) {
    setError(null);
    setResultImage(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setSelectedFile(null);
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError("Please choose an image smaller than 10MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  handleFileRef.current = handleFile;

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file && handleFileRef.current) {
            handleFileRef.current(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function getCroppedImage(
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<File> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Use actual pixel dimensions for the canvas to maintain high resolution
    const pixelWidth = Math.floor(crop.width * scaleX);
    const pixelHeight = Math.floor(crop.height * scaleY);

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("No 2d context for cropping");
    
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      pixelWidth,
      pixelHeight,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(new File([blob], selectedFile?.name || "cropped.png", { type: selectedFile?.type || "image/png" }));
      }, selectedFile?.type || "image/png", 1.0);
    });
  }

  async function removeBackground() {
    if (!selectedFile) {
      setError("Please choose an image first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    let fileToSend: File = selectedFile;
    
    try {
      if (
        completedCrop &&
        completedCrop.width > 0 &&
        completedCrop.height > 0 &&
        imgRef.current
      ) {
        fileToSend = await getCroppedImage(imgRef.current, completedCrop);
      }
    } catch (err) {
      setError("Could not crop the image.");
      setIsProcessing(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", fileToSend);

    try {
      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.image) {
        throw new Error(data.error ?? "Could not remove the background.");
      }

      setResultImage(data.image);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function downloadResult() {
    if (!resultImage) return;

    const selectedFormat = FORMAT_OPTIONS.find(
      (item) => item.value === downloadFormat,
    );
    const mime = selectedFormat?.mime ?? "image/png";

    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = resultImage;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (bgColor === "transparent" || bgColor === "") {
        if (downloadFormat === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");

          link.href = url;
          link.download = `lumina-background.${downloadFormat === "jpeg" ? "jpg" : downloadFormat}`;
          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(url);
        },
        mime,
        downloadFormat === "png" ? undefined : 0.95,
      );
    };

    image.onerror = () => {
      setError("Could not prepare image for download.");
    };
  }

  function resetTool() {
    setSelectedFile(null);
    setResultImage(null);
    setError(null);
    setBgColor("transparent");
    setCustomColor("#ffffff");
    setCrop(undefined);
    setCompletedCrop(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl rounded-3xl border border-blue-100 bg-white p-4 shadow-2xl sm:p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleInputChange}
      />

      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-blue-200 bg-blue-50/50 hover:border-blue-400"
          }`}
        >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              aria-hidden="true"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>

          <p className="text-2xl font-bold text-gray-900">Upload Image</p>
          <p className="mt-2 text-gray-500">JPG, PNG, or WebP up to 10MB</p>

          <button
            type="button"
            className="mt-6 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            Choose Photo
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Original
              </h2>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Change
              </button>
            </div>

            <div className="flex aspect-square items-center justify-center overflow-auto rounded-2xl bg-gray-100">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                className="max-h-[500px]"
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Original upload preview"
                  className="max-h-[500px] w-auto object-contain"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Result
              </h2>

              {resultImage ? (
                <div className="flex items-center gap-2">
                  <select
                    value={downloadFormat}
                    onChange={(event) =>
                      setDownloadFormat(event.target.value as DownloadFormat)
                    }
                    className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 outline-none"
                  >
                    {FORMAT_OPTIONS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={downloadResult}
                    className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    Download
                  </button>
                </div>
              ) : null}
            </div>

            <div
              className={`relative flex w-full max-w-full flex-col sm:aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-200 ${
                bgColor === "transparent" || bgColor === ""
                  ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlNWU3ZWIiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+')] bg-repeat"
                  : ""
              }`}
              style={bgColor !== "transparent" && bgColor !== "" ? { backgroundColor: bgColor } : {}}
            >
              {resultImage ? (
                <Image
                  src={resultImage}
                  alt="Background removed result"
                  fill
                  unoptimized
                  className="object-contain object-bottom p-2 sm:p-4"
                />
              ) : (
                <div className="px-6 text-center">
                  <p className="font-semibold text-gray-700">
                    Transparent image will appear here.
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    The subject will be preserved and the background removed.
                  </p>
                </div>
              )}

              {isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                  <p className="mt-4 text-sm font-semibold text-gray-700">
                    Removing background...
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="mb-3 font-bold text-gray-900">
                Choose Preview Background Color
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setBgColor(color);
                      if (color !== "transparent") setCustomColor(color);
                    }}
                    className={`relative overflow-hidden h-9 w-9 rounded-full border-2 transition ${
                      bgColor === color
                        ? "border-blue-600 ring-2 ring-blue-200"
                        : "border-gray-200"
                    }`}
                    style={color !== "transparent" ? { backgroundColor: color } : {}}
                    aria-label={`Select ${color}`}
                  >
                    {color === "transparent" && (
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlNWU3ZWIiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+')] opacity-50" />
                    )}
                  </button>
                ))}

                <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                  Custom
                  <input
                    type="color"
                    value={customColor}
                    onChange={(event) => {
                      setCustomColor(event.target.value);
                      setBgColor(event.target.value);
                    }}
                    className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={removeBackground}
                disabled={isProcessing}
                className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isProcessing ? "Processing..." : "Remove Background"}
              </button>

              <button
                type="button"
                onClick={resetTool}
                disabled={isProcessing}
                className="rounded-full border border-gray-200 px-8 py-3 font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
