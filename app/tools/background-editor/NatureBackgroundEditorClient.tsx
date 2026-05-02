"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_SOURCE_FILE_SIZE = 50 * 1024 * 1024;
const MAX_SERVER_FILE_SIZE = 10 * 1024 * 1024;
const MAX_UPLOAD_DIMENSION = 2500;
const MAX_OUTPUT_EDGE = 1800;
const UPLOAD_QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64];
const ALPHA_TRIM_THRESHOLD = 4;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const DEFAULT_SCALE = 54;
const DEFAULT_OFFSET_X = 0;
const DEFAULT_OFFSET_Y = 0;
const DEFAULT_ROTATION = 0;
const DEFAULT_OPACITY = 100;
const DEFAULT_SHADOW = 42;
const DEFAULT_TEXT_SIZE = 5.5;
const DEFAULT_TEXT_OFFSET_Y = -25;
const MIN_SCALE = 5;
const MAX_SCALE = 260;
const MIN_TEXT_SIZE = 1.2;
const MAX_TEXT_SIZE = 22;
const MIN_OFFSET_X = -100;
const MAX_OFFSET_X = 100;
const MIN_OFFSET_Y = -95;
const MAX_OFFSET_Y = 100;
const CUSTOM_BACKGROUND_ID = "custom-background";

type ApiResponse = {
  image?: string;
  filename?: string;
  error?: string;
};

type NatureBackground = {
  id: string;
  name: string;
  src: string;
};

type SubjectLayer = {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  cutoutImage: string | null;
  isProcessing: boolean;
  scalePercent: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
};

type TextLayer = {
  id: string;
  text: string;
  color: string;
  fontFamily: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  sizePercent: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
};

type SubjectInteraction = {
  mode: "move" | "resize";
  target: "image" | "text";
  layerId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  startScale: number;
  centerX: number;
  centerY: number;
  startDistance: number;
  startFontSizePx: number;
  textResizeSensitivity: number;
};

const FONT_OPTIONS = [
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', Courier, monospace" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
];

const TEXT_COLOR_SWATCHES = [
  "#ffffff",
  "#0f172a",
  "#1f2937",
  "#e11d48",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#38bdf8",
  "#6366f1",
  "#a855f7",
];

const NATURE_BACKGROUNDS: NatureBackground[] = [
  {
    id: "river-camera",
    name: "River View",
    src: "/nature_image/camera-man-river-7411236_1920.jpg",
  },
  {
    id: "desert-road",
    name: "Desert Road",
    src: "/nature_image/carlos_ramon_bonilla-desert-2646209_1920.jpg",
  },
  {
    id: "girl-field",
    name: "Girl Field",
    src: "/nature_image/greyerbaby-girl-358771_1920.jpg",
  },
  {
    id: "forest-path",
    name: "Forest Path",
    src: "/nature_image/helgaka-path-6514885_1920.jpg",
  },
  {
    id: "city-street",
    name: "City Street",
    src: "/nature_image/herrte-street-5030692.jpg",
  },
  {
    id: "bachalpsee-lake",
    name: "Bachalpsee Lake",
    src: "/nature_image/himmelstraeume-bachalpsee-7572681_1920.jpg",
  },
  {
    id: "arc-constant",
    name: "Arc Coast",
    src: "/nature_image/julius_silver-arc-of-constant-3044634_1920.jpg",
  },
  {
    id: "bora-bora",
    name: "Bora Bora",
    src: "/nature_image/julius_silver-bora-bora-3023437_1920.jpg",
  },
  {
    id: "lofoten",
    name: "Lofoten",
    src: "/nature_image/julius_silver-lofoten-6819659_1920.jpg",
  },
  {
    id: "manarola",
    name: "Manarola",
    src: "/nature_image/julius_silver-manarola-6200837_1920.jpg",
  },
  {
    id: "polynesia",
    name: "Polynesia",
    src: "/nature_image/julius_silver-polynesia-3021072_1920.jpg",
  },
  {
    id: "valencia",
    name: "Valencia",
    src: "/nature_image/julius_silver-valencia-4377331_1920.jpg",
  },
  {
    id: "vienna",
    name: "Vienna",
    src: "/nature_image/julius_silver-vienna-2989778_1920.jpg",
  },
  {
    id: "sunset-shore",
    name: "Sunset Shore",
    src: "/nature_image/kanenori-sunset-7133867_1920.jpg",
  },
  {
    id: "snow-mountain",
    name: "Snow Mountain",
    src: "/nature_image/kuang-jj-snow-mountain-9614087_1920.jpg",
  },
  {
    id: "open-field",
    name: "Open Field",
    src: "/nature_image/tieubaotruong-field-9295186_1920.jpg",
  },
  {
    id: "old-building",
    name: "Old Building",
    src: "/nature_image/travelwithzhuk-building-6467081.jpg",
  },
  {
    id: "blue-water",
    name: "Blue Water",
    src: "/nature_image/trondmyhre4-water-6579313_1920.jpg",
  },
];

function cleanErrorText(text: string) {
  const cleaned = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 300 ? `${cleaned.slice(0, 300)}...` : cleaned;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function createLayerId() {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getUploadFileName(fileName: string) {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExtension || "upload"}-optimized.jpg`;
}

function getConstrainedSize(width: number, height: number) {
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getOutputSize(width: number, height: number) {
  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  if (!responseText) return {};

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText) as ApiResponse;
    } catch {
      return { error: cleanErrorText(responseText) };
    }
  }

  return { error: cleanErrorText(responseText) };
}

function getValidImageFiles(files: File[]) {
  const accepted: File[] = [];
  let hasUnsupported = false;
  let hasOversized = false;

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      hasUnsupported = true;
      continue;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      hasOversized = true;
      continue;
    }

    accepted.push(file);
  }

  return { accepted, hasUnsupported, hasOversized };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load the image."));
    };

    image.src = url;
  });
}

function loadImageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the image."));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not optimize the image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header?.match(/data:(.*?);/);
  const mimeType = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function flattenCanvasForJpeg(canvas: HTMLCanvasElement) {
  const flattenedCanvas = document.createElement("canvas");
  flattenedCanvas.width = canvas.width;
  flattenedCanvas.height = canvas.height;

  const ctx = flattenedCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flattenedCanvas.width, flattenedCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  return flattenedCanvas;
}

async function createUploadFileFromCanvas(
  canvas: HTMLCanvasElement,
  sourceFileName: string,
) {
  const flattenedCanvas = flattenCanvasForJpeg(canvas);
  let smallestBlob: Blob | null = null;

  for (const quality of UPLOAD_QUALITY_STEPS) {
    const blob = await canvasToBlob(flattenedCanvas, quality);
    smallestBlob = blob;

    if (blob.size <= MAX_SERVER_FILE_SIZE) {
      return new File([blob], getUploadFileName(sourceFileName), {
        type: "image/jpeg",
      });
    }
  }

  if (smallestBlob) {
    return new File([smallestBlob], getUploadFileName(sourceFileName), {
      type: "image/jpeg",
    });
  }

  throw new Error("Could not optimize the image.");
}

async function optimizeImageForUpload(file: File) {
  const image = await loadImageFromFile(file);
  const shouldResize =
    Math.max(image.naturalWidth, image.naturalHeight) > MAX_UPLOAD_DIMENSION;

  if (!shouldResize && file.size <= MAX_SERVER_FILE_SIZE) {
    return file;
  }

  const { width, height } = getConstrainedSize(
    image.naturalWidth,
    image.naturalHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const optimizedFile = await createUploadFileFromCanvas(canvas, file.name);

  if (optimizedFile.size > MAX_SERVER_FILE_SIZE) {
    throw new Error(
      "Could not compress this image below 10MB. Try a smaller file.",
    );
  }

  return optimizedFile;
}

async function trimTransparentImage(source: string) {
  const image = await loadImageFromSource(source);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return source;

  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > ALPHA_TRIM_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return source;

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  if (trimmedWidth === width && trimmedHeight === height) {
    return source;
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  const trimmedCtx = trimmedCanvas.getContext("2d");
  if (!trimmedCtx) return source;

  trimmedCtx.drawImage(
    canvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight,
  );

  return trimmedCanvas.toDataURL("image/png");
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const sourceRatio = imageWidth / imageHeight;
  const targetRatio = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imageWidth;
  let sourceHeight = imageHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = imageHeight * targetRatio;
    sourceX = (imageWidth - sourceWidth) / 2;
  } else {
    sourceHeight = imageWidth / targetRatio;
    sourceY = (imageHeight - sourceHeight) / 2;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

async function composeNatureImage({
  backgroundSrc,
  layers,
  textLayers,
}: {
  backgroundSrc: string;
  layers: SubjectLayer[];
  textLayers: TextLayer[];
}) {
  const background = await loadImageFromSource(backgroundSrc);
  const renderLayers = layers.filter((layer) => layer.cutoutImage);
  const subjects = await Promise.all(
    renderLayers.map((layer) => loadImageFromSource(layer.cutoutImage ?? "")),
  );

  const { width, height } = getOutputSize(
    background.naturalWidth || background.width,
    background.naturalHeight || background.height,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not render the image.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawCoverImage(ctx, background, width, height);

  renderLayers.forEach((layer, index) => {
    const subject = subjects[index];
    const subjectWidth = subject.naturalWidth || subject.width;
    const subjectHeight = subject.naturalHeight || subject.height;
    const subjectRatio = subjectWidth / subjectHeight;
    const targetWidth = width * (layer.scalePercent / 100);
    const targetHeight = targetWidth / subjectRatio;
    const centerX = width / 2 + (layer.offsetX / 100) * width * 0.7;
    const bottomY = height - height * 0.04 + (layer.offsetY / 100) * height * 0.7;

    ctx.save();
    ctx.filter = `blur(${Math.max(6, height * 0.012)}px)`;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.0048 * DEFAULT_SHADOW * (layer.opacity / 100)})`;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      Math.min(height - height * 0.025, bottomY - targetHeight * 0.04),
      targetWidth * 0.3,
      Math.max(5, targetHeight * 0.03),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, bottomY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.opacity / 100;
    ctx.scale(layer.flipX ? -1 : 1, 1);
    ctx.drawImage(subject, -targetWidth / 2, -targetHeight, targetWidth, targetHeight);
    ctx.restore();
  });

  textLayers.forEach((layer) => {
    const fontSize = width * (layer.sizePercent / 100);
    const centerX = width / 2 + (layer.offsetX / 100) * width * 0.7;
    const bottomY = height - height * 0.04 + (layer.offsetY / 100) * height * 0.7;
    const lines = layer.text.split(/\r?\n/).filter((line) => line.length);
    const lineHeight = fontSize * 1.16;
    const totalHeight = Math.max(lineHeight, lines.length * lineHeight);

    ctx.save();
    ctx.translate(centerX, bottomY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.opacity / 100;
    ctx.font = `${layer.italic ? "italic " : ""}${layer.bold ? "700" : "500"} ${fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = layer.align;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = layer.color;
    ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = Math.max(2, fontSize * 0.06);
    ctx.shadowOffsetY = Math.max(1, fontSize * 0.04);

    lines.forEach((line, index) => {
      ctx.fillText(line, 0, -totalHeight + index * lineHeight + fontSize);
    });

    ctx.restore();
  });

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.94),
    width,
    height,
  };
}

export default function NatureBackgroundEditorClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<SubjectLayer[]>([]);
  const textLayersRef = useRef<TextLayer[]>([]);
  const customBackgroundUrlRef = useRef<string | null>(null);
  const addFilesRef = useRef<((files: File[]) => void) | null>(null);
  const setBackgroundFileRef = useRef<((file: File) => void) | null>(null);
  const pasteTargetRef = useRef<"subjects" | "background">("subjects");
  const interactionRef = useRef<SubjectInteraction | null>(null);

  const [selectedBackgroundId, setSelectedBackgroundId] = useState(
    NATURE_BACKGROUNDS[0].id,
  );
  const [customBackground, setCustomBackground] =
    useState<NatureBackground | null>(null);
  const [layers, setLayers] = useState<SubjectLayer[]>([]);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(
    null,
  );
  const [draftText, setDraftText] = useState("Your text");
  const [draftTextColor, setDraftTextColor] = useState("#ffffff");
  const [draftFontFamily, setDraftFontFamily] = useState(FONT_OPTIONS[0].value);
  const [draftTextBold, setDraftTextBold] = useState(true);
  const [draftTextItalic, setDraftTextItalic] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBackgroundDragging, setIsBackgroundDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [storedResultId, setStoredResultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backgroundOptions = useMemo(
    () =>
      customBackground
        ? [customBackground, ...NATURE_BACKGROUNDS]
        : NATURE_BACKGROUNDS,
    [customBackground],
  );

  const selectedBackground = useMemo(
    () =>
      backgroundOptions.find((item) => item.id === selectedBackgroundId) ??
      backgroundOptions[0],
    [backgroundOptions, selectedBackgroundId],
  );

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  );
  const selectedTextLayer = useMemo(
    () => textLayers.find((layer) => layer.id === selectedTextLayerId) ?? null,
    [textLayers, selectedTextLayerId],
  );

  const preparedLayerCount = layers.filter((layer) => layer.cutoutImage).length;
  const hasUnpreparedLayers = layers.some((layer) => !layer.cutoutImage);
  const canDownload = preparedLayerCount > 0 || textLayers.length > 0;
  const isBusy = isProcessing || isDownloading;
  const downloadName = useMemo(
    () => `lumina-nature-${selectedBackground.id}.jpg`,
    [selectedBackground.id],
  );
  const textEditorText = selectedTextLayer?.text ?? draftText;
  const textEditorColor = selectedTextLayer?.color ?? draftTextColor;
  const textEditorFontFamily =
    selectedTextLayer?.fontFamily ?? draftFontFamily;
  const textEditorBold = selectedTextLayer?.bold ?? draftTextBold;
  const textEditorItalic = selectedTextLayer?.italic ?? draftTextItalic;

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    textLayersRef.current = textLayers;
  }, [textLayers]);

  useEffect(() => {
    setStoredResultId(null);
  }, [layers, textLayers, selectedBackgroundId]);

  useEffect(() => {
    return () => {
      layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));

      if (customBackgroundUrlRef.current) {
        URL.revokeObjectURL(customBackgroundUrlRef.current);
      }
    };
  }, []);

  const addSubjectFiles = useCallback((files: File[]) => {
    const { accepted, hasUnsupported, hasOversized } = getValidImageFiles(files);

    if (!accepted.length) {
      if (hasUnsupported) {
        setError("Please choose JPG, PNG, or WebP images.");
      } else if (hasOversized) {
        setError("Please choose images smaller than 50MB.");
      }
      return;
    }

    const newLayers = accepted.map((file, index) => {
      const centerOffset = index - (accepted.length - 1) / 2;

      return {
        id: createLayerId(),
        file,
        fileName: file.name || "uploaded-image",
        previewUrl: URL.createObjectURL(file),
        cutoutImage: null,
        isProcessing: false,
        scalePercent: DEFAULT_SCALE,
        offsetX: clamp(centerOffset * 16, MIN_OFFSET_X, MAX_OFFSET_X),
        offsetY: DEFAULT_OFFSET_Y,
        rotation: DEFAULT_ROTATION,
        opacity: DEFAULT_OPACITY,
        flipX: false,
      };
    });

    setError(
      hasUnsupported || hasOversized
        ? "Some files were skipped. Only JPG, PNG, and WebP under 50MB are supported."
        : null,
    );
    setLayers((currentLayers) => [...currentLayers, ...newLayers]);
    setSelectedLayerId(newLayers[newLayers.length - 1].id);
    setSelectedTextLayerId(null);
  }, []);

  useEffect(() => {
    addFilesRef.current = addSubjectFiles;
  }, [addSubjectFiles]);

  useEffect(() => {
    setBackgroundFileRef.current = setCustomBackgroundFile;
  });

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];

      for (let index = 0; index < items.length; index++) {
        if (items[index].type.startsWith("image/")) {
          const pastedFile = items[index].getAsFile();
          if (pastedFile) pastedFiles.push(pastedFile);
        }
      }

      if (pastedFiles.length && addFilesRef.current) {
        if (
          pasteTargetRef.current === "background" &&
          setBackgroundFileRef.current
        ) {
          setBackgroundFileRef.current(pastedFiles[0]);
        } else {
          addFilesRef.current(pastedFiles);
        }
      }
    };

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      updatePointerInteraction(event.pointerId, event.clientX, event.clientY);
    }

    function handlePointerUp(event: PointerEvent) {
      finishPointerInteraction(event.pointerId);
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
    // The pointer helpers read refs and use functional state updates, so the
    // first registered listener stays current without re-subscribing on drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLayer(layerId: string, patch: Partial<SubjectLayer>) {
    setLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function updateTextLayer(layerId: string, patch: Partial<TextLayer>) {
    setTextLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    );
  }

  function updateTextEditorText(value: string) {
    if (selectedTextLayer) {
      updateTextLayer(selectedTextLayer.id, { text: value });
      return;
    }

    setDraftText(value);
  }

  function updateTextEditorColor(value: string) {
    if (selectedTextLayer) {
      updateTextLayer(selectedTextLayer.id, { color: value });
      return;
    }

    setDraftTextColor(value);
  }

  function updateTextEditorFont(value: string) {
    if (selectedTextLayer) {
      updateTextLayer(selectedTextLayer.id, { fontFamily: value });
      return;
    }

    setDraftFontFamily(value);
  }

  function updateTextEditorBold(value: boolean) {
    if (selectedTextLayer) {
      updateTextLayer(selectedTextLayer.id, { bold: value });
      return;
    }

    setDraftTextBold(value);
  }

  function updateTextEditorItalic(value: boolean) {
    if (selectedTextLayer) {
      updateTextLayer(selectedTextLayer.id, { italic: value });
      return;
    }

    setDraftTextItalic(value);
  }

  function updatePointerInteraction(
    pointerId: number,
    clientX: number,
    clientY: number,
  ) {
    const interaction = interactionRef.current;
    const stage = stageRef.current;

    if (!interaction || !stage || pointerId !== interaction.pointerId) {
      return;
    }

    if (interaction.mode === "move") {
      const rect = stage.getBoundingClientRect();
      const nextOffsetX =
        interaction.startOffsetX +
        ((clientX - interaction.startX) / rect.width) * (100 / 0.7);
      const nextOffsetY =
        interaction.startOffsetY +
        ((clientY - interaction.startY) / rect.height) * (100 / 0.7);

      const patch = {
        offsetX: clamp(nextOffsetX, MIN_OFFSET_X, MAX_OFFSET_X),
        offsetY: clamp(nextOffsetY, MIN_OFFSET_Y, MAX_OFFSET_Y),
      };

      if (interaction.target === "image") {
        updateLayer(interaction.layerId, patch);
      } else {
        updateTextLayer(interaction.layerId, patch);
      }
      return;
    }

    if (interaction.target === "image") {
      const nextDistance = getDistance(
        clientX,
        clientY,
        interaction.centerX,
        interaction.centerY,
      );
      const nextScale =
        interaction.startScale * (nextDistance / interaction.startDistance);

      updateLayer(interaction.layerId, {
        scalePercent: clamp(nextScale, MIN_SCALE, MAX_SCALE),
      });
    } else {
      const deltaX = clientX - interaction.startX;
      const deltaY = clientY - interaction.startY;
      const directionX = interaction.startX >= interaction.centerX ? 1 : -1;
      const directionY = interaction.startY >= interaction.centerY ? 1 : -1;
      const directedDelta =
        deltaX * directionX * 0.85 + deltaY * directionY * 0.65;
      const nextScale =
        interaction.startScale +
        directedDelta * interaction.textResizeSensitivity;

      updateTextLayer(interaction.layerId, {
        sizePercent: clamp(nextScale, MIN_TEXT_SIZE, MAX_TEXT_SIZE),
      });
    }
  }

  function finishPointerInteraction(pointerId: number) {
    if (interactionRef.current?.pointerId === pointerId) {
      interactionRef.current = null;
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    addSubjectFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addSubjectFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function setCustomBackgroundFile(file: File) {
    const { accepted, hasUnsupported, hasOversized } = getValidImageFiles([file]);
    const backgroundFile = accepted[0];

    if (!backgroundFile) {
      setError(
        hasUnsupported
          ? "Background must be a JPG, PNG, or WebP image."
          : hasOversized
            ? "Background image must be smaller than 50MB."
            : "Please choose a valid background image.",
      );
      return;
    }

    if (customBackgroundUrlRef.current) {
      URL.revokeObjectURL(customBackgroundUrlRef.current);
    }

    const url = URL.createObjectURL(backgroundFile);
    customBackgroundUrlRef.current = url;
    setCustomBackground({
      id: CUSTOM_BACKGROUND_ID,
      name: backgroundFile.name || "Custom Background",
      src: url,
    });
    setSelectedBackgroundId(CUSTOM_BACKGROUND_ID);
    setError(null);

    // Save custom background async
    try {
      const formData = new FormData();
      formData.append("file", backgroundFile);
      fetch("/api/nature-background-editor/upload-background", {
        method: "POST",
        body: formData,
      });
    } catch {
      // Background save error is non-blocking
    }
  }

  function handleBackgroundInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setCustomBackgroundFile(file);
    event.target.value = "";
  }

  function handleBackgroundDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsBackgroundDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) setCustomBackgroundFile(file);
  }

  function startSubjectMove(
    event: ReactPointerEvent<HTMLElement>,
    layer: SubjectLayer,
  ) {
    if (!layer.cutoutImage || !stageRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedLayerId(layer.id);
    setSelectedTextLayerId(null);

    interactionRef.current = {
      mode: "move",
      target: "image",
      layerId: layer.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: layer.offsetX,
      startOffsetY: layer.offsetY,
      startScale: layer.scalePercent,
      centerX: 0,
      centerY: 0,
      startDistance: 1,
      startFontSizePx: 0,
      textResizeSensitivity: 0,
    };
  }

  function startSubjectResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    layer: SubjectLayer,
  ) {
    const subject = event.currentTarget.parentElement;

    if (!layer.cutoutImage || !subject) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedLayerId(layer.id);
    setSelectedTextLayerId(null);

    const rect = subject.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    interactionRef.current = {
      mode: "resize",
      target: "image",
      layerId: layer.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: layer.offsetX,
      startOffsetY: layer.offsetY,
      startScale: layer.scalePercent,
      centerX,
      centerY,
      startDistance: Math.max(
        1,
        getDistance(event.clientX, event.clientY, centerX, centerY),
      ),
      startFontSizePx: 0,
      textResizeSensitivity: 0,
    };
  }

  function resizeWithWheel(
    event: ReactWheelEvent<HTMLElement>,
    layer: SubjectLayer,
  ) {
    if (!layer.cutoutImage) return;

    event.preventDefault();
    setSelectedLayerId(layer.id);
    setSelectedTextLayerId(null);
    updateLayer(layer.id, {
      scalePercent: clamp(
        layer.scalePercent - event.deltaY * 0.035,
        MIN_SCALE,
        MAX_SCALE,
      ),
    });
  }

  function addTextLayer() {
    const text = textEditorText.trim();

    if (!text) {
      setError("Please write some text first.");
      return;
    }

    const layer: TextLayer = {
      id: createLayerId(),
      text,
      color: textEditorColor,
      fontFamily: textEditorFontFamily,
      align: "center",
      bold: textEditorBold,
      italic: textEditorItalic,
      sizePercent: DEFAULT_TEXT_SIZE,
      offsetX: DEFAULT_OFFSET_X,
      offsetY: DEFAULT_TEXT_OFFSET_Y,
      rotation: DEFAULT_ROTATION,
      opacity: DEFAULT_OPACITY,
    };

    setTextLayers((currentLayers) => [...currentLayers, layer]);
    setSelectedTextLayerId(layer.id);
    setSelectedLayerId(null);
    setError(null);
  }

  function startTextMove(
    event: ReactPointerEvent<HTMLElement>,
    layer: TextLayer,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedTextLayerId(layer.id);
    setSelectedLayerId(null);

    interactionRef.current = {
      mode: "move",
      target: "text",
      layerId: layer.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: layer.offsetX,
      startOffsetY: layer.offsetY,
      startScale: layer.sizePercent,
      centerX: 0,
      centerY: 0,
      startDistance: 1,
      startFontSizePx: 0,
      textResizeSensitivity: 0,
    };
  }

  function startTextResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    layer: TextLayer,
  ) {
    const subject = event.currentTarget.parentElement;
    if (!subject) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedTextLayerId(layer.id);
    setSelectedLayerId(null);

    const stageRect = stageRef.current?.getBoundingClientRect();
    const rect = subject.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentFontSize = Number.parseFloat(
      window.getComputedStyle(subject).fontSize,
    );
    const startFontSizePx = Number.isFinite(currentFontSize)
      ? currentFontSize
      : Math.max(12, (stageRect?.width ?? 640) * (layer.sizePercent / 100));
    const textResizeSensitivity =
      (MAX_TEXT_SIZE - MIN_TEXT_SIZE) / Math.max(260, stageRect?.width ?? 640);

    interactionRef.current = {
      mode: "resize",
      target: "text",
      layerId: layer.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: layer.offsetX,
      startOffsetY: layer.offsetY,
      startScale: layer.sizePercent,
      centerX,
      centerY,
      startDistance: Math.max(
        1,
        getDistance(event.clientX, event.clientY, centerX, centerY),
      ),
      startFontSizePx,
      textResizeSensitivity,
    };
  }

  function resizeTextWithWheel(
    event: ReactWheelEvent<HTMLElement>,
    layer: TextLayer,
  ) {
    event.preventDefault();
    setSelectedTextLayerId(layer.id);
    setSelectedLayerId(null);
    updateTextLayer(layer.id, {
      sizePercent: clamp(
        layer.sizePercent - event.deltaY * 0.006,
        MIN_TEXT_SIZE,
        MAX_TEXT_SIZE,
      ),
    });
  }

  async function prepareImages() {
    if (!layers.length) {
      setError("Please upload at least one image.");
      return;
    }

    const targets = layers.filter((layer) => !layer.cutoutImage);

    if (!targets.length) {
      setError(null);
      return;
    }

    setIsProcessing(true);
    setError(null);

    for (const layer of targets) {
      updateLayer(layer.id, { isProcessing: true });

      try {
        const uploadFile = await optimizeImageForUpload(layer.file);
        const formData = new FormData();
        formData.append("image", uploadFile, uploadFile.name || "upload.jpg");

        const response = await fetch("/api/remove-background", {
          method: "POST",
          body: formData,
        });
        const data = await readApiResponse(response);

        if (!response.ok || !data.image) {
          throw new Error(data.error ?? "Could not remove the background.");
        }

        const cutoutImage = await trimTransparentImage(data.image);
        updateLayer(layer.id, { cutoutImage, isProcessing: false });
      } catch (caughtError) {
        updateLayer(layer.id, { isProcessing: false });
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Something went wrong. Please try again.",
        );
      }
    }

    setIsProcessing(false);
  }

  async function saveGeneratedImage(
    dataUrl: string,
    width: number,
    height: number,
  ) {
    const blob = dataUrlToBlob(dataUrl);
    const formData = new FormData();
    formData.append("file", blob, downloadName);
    formData.append("outputName", downloadName);
    formData.append("backgroundId", selectedBackground.id);
    formData.append("backgroundName", selectedBackground.name);
    formData.append("width", String(width));
    formData.append("height", String(height));

    const response = await fetch("/api/nature-background-editor/results", {
      method: "POST",
      body: formData,
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "Could not save this image to storage.";

      throw new Error(message);
    }

    if (
      payload &&
      typeof payload === "object" &&
      "id" in payload &&
      typeof payload.id === "string"
    ) {
      setStoredResultId(payload.id);
    }
  }

  async function downloadFinalImage() {
    if (!canDownload || isBusy) return;

    setIsDownloading(true);
    setError(null);

    try {
      const renderedImage = await composeNatureImage({
        backgroundSrc: selectedBackground.src,
        layers,
        textLayers,
      });
      if (!storedResultId) {
        await saveGeneratedImage(
          renderedImage.dataUrl,
          renderedImage.width,
          renderedImage.height,
        );
      }
      const link = document.createElement("a");
      link.href = renderedImage.dataUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not prepare the image for download.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function removeLayer(layerId: string) {
    const layerToRemove = layersRef.current.find((layer) => layer.id === layerId);
    if (!layerToRemove) return;

    URL.revokeObjectURL(layerToRemove.previewUrl);

    setLayers((currentLayers) => {
      const nextLayers = currentLayers.filter(
        (layer) => layer.id !== layerId,
      );

      if (selectedLayerId === layerId) {
        setSelectedLayerId(nextLayers[nextLayers.length - 1]?.id ?? null);
      }

      return nextLayers;
    });
  }

  function removeSelectedLayer() {
    if (!selectedLayer) return;
    removeLayer(selectedLayer.id);
  }

  function removeSelectedTextLayer() {
    if (!selectedTextLayer) return;

    setTextLayers((currentLayers) => {
      const nextLayers = currentLayers.filter(
        (layer) => layer.id !== selectedTextLayer.id,
      );
      setSelectedTextLayerId(nextLayers[nextLayers.length - 1]?.id ?? null);
      return nextLayers;
    });
  }

  function resetSelectedLayer() {
    if (!selectedLayer) return;

    updateLayer(selectedLayer.id, {
      scalePercent: DEFAULT_SCALE,
      offsetX: DEFAULT_OFFSET_X,
      offsetY: DEFAULT_OFFSET_Y,
      rotation: DEFAULT_ROTATION,
      opacity: DEFAULT_OPACITY,
      flipX: false,
    });
  }

  function resetSelectedTextLayer() {
    if (!selectedTextLayer) return;

    updateTextLayer(selectedTextLayer.id, {
      sizePercent: DEFAULT_TEXT_SIZE,
      offsetX: DEFAULT_OFFSET_X,
      offsetY: DEFAULT_TEXT_OFFSET_Y,
      rotation: DEFAULT_ROTATION,
      opacity: DEFAULT_OPACITY,
      align: "center",
      bold: true,
      italic: false,
    });
  }

  function moveSelectedLayer(direction: "back" | "front") {
    if (!selectedLayer) return;

    setLayers((currentLayers) => {
      const index = currentLayers.findIndex(
        (layer) => layer.id === selectedLayer.id,
      );

      if (index < 0) return currentLayers;

      const targetIndex =
        direction === "front"
          ? Math.min(currentLayers.length - 1, index + 1)
          : Math.max(0, index - 1);

      if (targetIndex === index) return currentLayers;

      const nextLayers = [...currentLayers];
      const [item] = nextLayers.splice(index, 1);
      nextLayers.splice(targetIndex, 0, item);
      return nextLayers;
    });
  }

  function resetTool() {
    layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.previewUrl));
    setLayers([]);
    setTextLayers([]);
    setSelectedLayerId(null);
    setSelectedTextLayerId(null);
    setStoredResultId(null);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={handleInputChange}
      />
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleBackgroundInputChange}
      />

      <section className="w-full space-y-4">
        <div
          ref={stageRef}
          className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm [container-type:inline-size] sm:max-w-[720px] sm:mx-auto lg:mx-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${selectedBackground.src}")` }}
          />

          {layers.map((layer, index) => {
            if (!layer.cutoutImage) return null;

            const isSelected = layer.id === selectedLayerId;

            return (
              <div
                key={layer.id}
                onPointerDown={(event) => startSubjectMove(event, layer)}
                onPointerMove={(event) => {
                  event.preventDefault();
                  updatePointerInteraction(
                    event.pointerId,
                    event.clientX,
                    event.clientY,
                  );
                }}
                onPointerUp={(event) => finishPointerInteraction(event.pointerId)}
                onPointerCancel={(event) =>
                  finishPointerInteraction(event.pointerId)
                }
                onWheel={(event) => resizeWithWheel(event, layer)}
                className={`absolute cursor-move touch-none select-none ${
                  isSelected ? "outline outline-2 outline-emerald-400" : ""
                }`}
                style={{
                  zIndex: 20 + index,
                  left: `calc(50% + ${layer.offsetX * 0.7}%)`,
                  bottom: `calc(4% - ${layer.offsetY * 0.7}%)`,
                  width: `${layer.scalePercent}%`,
                  opacity: layer.opacity / 100,
                  transform: `translateX(-50%) rotate(${layer.rotation}deg)`,
                  transformOrigin: "center bottom",
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute bottom-[3%] left-[18%] right-[18%] h-[8%] rounded-full bg-black/25 blur-md"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.cutoutImage}
                  alt={layer.fileName}
                  draggable={false}
                  className="relative z-10 block w-full touch-none select-none"
                  style={{ transform: `scaleX(${layer.flipX ? -1 : 1})` }}
                />
                {isSelected ? (
                  <button
                    type="button"
                    aria-label="Resize photo"
                    title="Resize photo"
                    onPointerDown={(event) => startSubjectResize(event, layer)}
                    className="absolute -bottom-3 -right-3 z-20 h-9 w-9 cursor-nwse-resize rounded-full border-2 border-white bg-emerald-600 shadow-lg outline-none ring-1 ring-emerald-900/20 transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-200"
                  >
                    <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white/95" />
                    <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-white/95" />
                  </button>
                ) : null}
              </div>
            );
          })}

          {textLayers.map((layer, index) => {
            const isSelected = layer.id === selectedTextLayerId;

            return (
              <div
                key={layer.id}
                onPointerDown={(event) => startTextMove(event, layer)}
                onPointerMove={(event) => {
                  event.preventDefault();
                  updatePointerInteraction(
                    event.pointerId,
                    event.clientX,
                    event.clientY,
                  );
                }}
                onPointerUp={(event) => finishPointerInteraction(event.pointerId)}
                onPointerCancel={(event) =>
                  finishPointerInteraction(event.pointerId)
                }
                onWheel={(event) => resizeTextWithWheel(event, layer)}
                className={`absolute min-w-16 max-w-[86%] cursor-move touch-none select-none whitespace-pre-wrap rounded-md px-3 py-2 leading-tight ${
                  isSelected
                    ? "bg-black/10 outline outline-2 outline-sky-300"
                    : "bg-transparent"
                }`}
                style={{
                  zIndex: 120 + index,
                  left: `calc(50% + ${layer.offsetX * 0.7}%)`,
                  bottom: `calc(4% - ${layer.offsetY * 0.7}%)`,
                  opacity: layer.opacity / 100,
                  color: layer.color,
                  fontFamily: layer.fontFamily,
                  fontSize: `${layer.sizePercent}cqw`,
                  fontWeight: layer.bold ? 700 : 500,
                  fontStyle: layer.italic ? "italic" : "normal",
                  textAlign: layer.align,
                  textShadow: "0 2px 12px rgba(0,0,0,0.38)",
                  transform: `translateX(-50%) rotate(${layer.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                {layer.text}
                {isSelected ? (
                  <button
                    type="button"
                    aria-label="Resize text"
                    title="Resize text"
                    onPointerDown={(event) => startTextResize(event, layer)}
                    className="absolute -bottom-4 -right-4 z-20 h-10 w-10 cursor-nwse-resize rounded-full border-2 border-white bg-sky-600 shadow-lg outline-none ring-1 ring-sky-900/20 transition hover:bg-sky-700 focus-visible:ring-4 focus-visible:ring-sky-200"
                  >
                    <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full bg-white/95" />
                    <span className="absolute bottom-2.5 right-2.5 h-2 w-2 rounded-full bg-white/95" />
                  </button>
                ) : null}
              </div>
            );
          })}

          {isBusy ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {isProcessing ? "Preparing images..." : "Preparing download..."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Custom Background
          </h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              pasteTargetRef.current = "background";
              backgroundInputRef.current?.click();
            }}
            onFocus={() => {
              pasteTargetRef.current = "background";
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                pasteTargetRef.current = "background";
                backgroundInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsBackgroundDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsBackgroundDragging(false)}
            onDrop={handleBackgroundDrop}
            className={`flex min-h-20 cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-3 text-center transition ${
              isBackgroundDragging
                ? "border-sky-600 bg-sky-50"
                : "border-slate-300 bg-white hover:border-sky-400"
            }`}
          >
            <p className="text-sm font-semibold text-slate-700">
              {customBackground
                ? customBackground.name
                : "Upload Background"}
            </p>
          </div>
        </div>

        {selectedLayer?.cutoutImage ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Selected Image
              </h2>
              <span className="max-w-[180px] truncate text-sm font-semibold text-slate-700">
                {selectedLayer.fileName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    scalePercent: clamp(
                      selectedLayer.scalePercent - 8,
                      MIN_SCALE,
                      MAX_SCALE,
                    ),
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Smaller
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    scalePercent: clamp(
                      selectedLayer.scalePercent + 8,
                      MIN_SCALE,
                      MAX_SCALE,
                    ),
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Bigger
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    rotation: selectedLayer.rotation - 15,
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Rotate L
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    rotation: selectedLayer.rotation + 15,
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Rotate R
              </button>
              <button
                type="button"
                onClick={() =>
                  updateLayer(selectedLayer.id, { flipX: !selectedLayer.flipX })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Flip
              </button>
              <button
                type="button"
                onClick={() => moveSelectedLayer("back")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => moveSelectedLayer("front")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Front
              </button>
              <button
                type="button"
                onClick={resetSelectedLayer}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  Opacity{" "}
                  <span className="text-slate-500">
                    {Math.round(selectedLayer.opacity)}%
                  </span>
                </span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedLayer.opacity}
                  onChange={(event) =>
                    updateLayer(selectedLayer.id, {
                      opacity: Number(event.target.value),
                    })
                  }
                  className="w-full accent-emerald-600"
                />
              </label>
              <button
                type="button"
                onClick={removeSelectedLayer}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}

        {selectedTextLayer ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Selected Text
              </h2>
              <button
                type="button"
                onClick={removeSelectedTextLayer}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>

            <textarea
              value={selectedTextLayer.text}
              onChange={(event) =>
                updateTextLayer(selectedTextLayer.id, {
                  text: event.target.value,
                })
              }
              className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              style={{
                color: selectedTextLayer.color,
                fontFamily: selectedTextLayer.fontFamily,
                fontWeight: selectedTextLayer.bold ? 700 : 500,
                fontStyle: selectedTextLayer.italic ? "italic" : "normal",
              }}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Color
                <input
                  type="color"
                  value={selectedTextLayer.color}
                  onChange={(event) =>
                    updateTextLayer(selectedTextLayer.id, {
                      color: event.target.value,
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                />
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() =>
                        updateTextLayer(selectedTextLayer.id, { color: swatch })
                      }
                      aria-label={`Set text color ${swatch}`}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        selectedTextLayer.color.toLowerCase() ===
                        swatch.toLowerCase()
                          ? "border-slate-900 ring-2 ring-slate-900/40 ring-offset-2"
                          : "border-slate-200 hover:border-slate-400"
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Font
                <select
                  value={selectedTextLayer.fontFamily}
                  onChange={(event) =>
                    updateTextLayer(selectedTextLayer.id, {
                      fontFamily: event.target.value,
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  Opacity{" "}
                  <span className="text-slate-500">
                    {Math.round(selectedTextLayer.opacity)}%
                  </span>
                </span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedTextLayer.opacity}
                  onChange={(event) =>
                    updateTextLayer(selectedTextLayer.id, {
                      opacity: Number(event.target.value),
                    })
                  }
                  className="w-full accent-sky-600"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    sizePercent: clamp(
                      selectedTextLayer.sizePercent - 0.6,
                      MIN_TEXT_SIZE,
                      MAX_TEXT_SIZE,
                    ),
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Smaller
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    sizePercent: clamp(
                      selectedTextLayer.sizePercent + 0.6,
                      MIN_TEXT_SIZE,
                      MAX_TEXT_SIZE,
                    ),
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Bigger
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    rotation: selectedTextLayer.rotation - 15,
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Rotate L
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    rotation: selectedTextLayer.rotation + 15,
                  })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Rotate R
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    bold: !selectedTextLayer.bold,
                  })
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedTextLayer.bold
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, {
                    italic: !selectedTextLayer.italic,
                  })
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedTextLayer.italic
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Italic
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, { align: "left" })
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedTextLayer.align === "left"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Left
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, { align: "center" })
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedTextLayer.align === "center"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Center
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextLayer(selectedTextLayer.id, { align: "right" })
                }
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  selectedTextLayer.align === "right"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Right
              </button>
              <button
                type="button"
                onClick={resetSelectedTextLayer}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={downloadFinalImage}
            disabled={!canDownload || isBusy}
            className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isDownloading ? "Preparing..." : "Download JPG"}
          </button>
          <button
            type="button"
            onClick={resetTool}
            disabled={isBusy || (!layers.length && !textLayers.length)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
        {storedResultId ? (
          <p className="text-sm font-semibold text-emerald-700">
            
          </p>
        ) : null}
      </section>

      <aside className="w-full space-y-5">
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Your Images
          </h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              pasteTargetRef.current = "subjects";
              inputRef.current?.click();
            }}
            onFocus={() => {
              pasteTargetRef.current = "subjects";
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                pasteTargetRef.current = "subjects";
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
            className={`flex min-h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition ${
              isDragging
                ? "border-emerald-600 bg-emerald-50"
                : "border-slate-300 bg-white hover:border-emerald-400"
            }`}
          >
            <div>
              <p className="text-lg font-bold text-slate-900">Upload Images</p>
              <p className="mt-1 text-sm text-slate-500">JPG, PNG, or WebP</p>
            </div>
          </div>

          {layers.length ? (
            <div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {layers.map((layer) => {
                const isSelected = layer.id === selectedLayerId;

                return (
                  <div
                    key={layer.id}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-sky-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLayerId(layer.id);
                        setSelectedTextLayerId(null);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="relative h-14 w-14 flex-none overflow-hidden rounded-md bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={layer.cutoutImage ?? layer.previewUrl}
                          alt={layer.fileName}
                          className="h-full w-full object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800">
                          {layer.fileName}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                          {layer.isProcessing
                            ? "Preparing"
                            : layer.cutoutImage
                              ? "Ready"
                              : "Waiting"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLayer(layer.id)}
                      className="h-8 w-8 rounded-md border border-slate-200 text-sm font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${layer.fileName}`}
                      title="Remove"
                    >
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={prepareImages}
            disabled={!layers.length || !hasUnpreparedLayers || isBusy}
            className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isProcessing ? "Preparing..." : "Prepare Images"}
          </button>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Nature Gallery
          </h2>
          <div className="max-h-[260px] overflow-y-auto overscroll-contain pr-1 sm:max-h-[360px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {backgroundOptions.map((background) => {
                const isSelected = background.id === selectedBackground.id;

                return (
                  <button
                    key={background.id}
                    type="button"
                    onClick={() => setSelectedBackgroundId(background.id)}
                    className={`relative aspect-[4/3] overflow-hidden rounded-lg border text-left shadow-sm transition ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-200"
                        : "border-slate-200 hover:border-sky-300"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {background.id === CUSTOM_BACKGROUND_ID ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={background.src}
                        alt={background.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={background.src}
                        alt={background.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-slate-950/55 px-2 py-1 text-xs font-semibold text-white">
                      {background.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>



        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {selectedTextLayer ? "Text Selected" : "Text"}
          </h2>
          <textarea
            value={textEditorText}
            onChange={(event) => updateTextEditorText(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            style={{
              color: textEditorColor,
              fontFamily: textEditorFontFamily,
              fontWeight: textEditorBold ? 700 : 500,
              fontStyle: textEditorItalic ? "italic" : "normal",
            }}
          />
          <div className="flex flex-wrap gap-2">
            {TEXT_COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => updateTextEditorColor(swatch)}
                aria-label={`Set text color ${swatch}`}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  textEditorColor.toLowerCase() === swatch.toLowerCase()
                    ? "border-slate-900 ring-2 ring-slate-900/40 ring-offset-2"
                    : "border-slate-200 hover:border-slate-400"
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <input
              type="color"
              value={textEditorColor}
              onChange={(event) => updateTextEditorColor(event.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              aria-label="Text color"
            />
            <select
              value={textEditorFontFamily}
              onChange={(event) => updateTextEditorFont(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
              aria-label="Text font"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateTextEditorBold(!textEditorBold)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                textEditorBold
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => updateTextEditorItalic(!textEditorItalic)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                textEditorItalic
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Italic
            </button>
          </div>
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preview
            </p>
            <p
              className="mt-1 text-base"
              style={{
                color: textEditorColor,
                fontFamily: textEditorFontFamily,
                fontWeight: textEditorBold ? 700 : 500,
                fontStyle: textEditorItalic ? "italic" : "normal",
              }}
            >
              {textEditorText || "Your text"}
            </p>
          </div>
          <button
            type="button"
            onClick={addTextLayer}
            className="w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {selectedTextLayer ? "Duplicate Text" : "Add Text"}
          </button>
        </div>


        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
