import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getPageImageUrl } from "@/services/booksApi";
import type {
  ActivityReference,
  AudioReference,
  FillAnswerArea,
  Page,
  VideoReference,
} from "@/types/flowbook";
import { AnnotationCanvas } from "../annotation";
import { useZoomGestures } from "../hooks";
import {
  ActivityIcon,
  AudioIcon,
  FillAnswerOverlay,
  VideoIcon,
} from "../media";
import {
  useAnnotationStore,
  useFlowbookBookStore,
  useFlowbookUIStore,
} from "../stores";
import { getSpreadPages } from "../utils";

// Default page dimensions for positioning (will be overridden by actual image dimensions)
const DEFAULT_PAGE_WIDTH = 800;
const DEFAULT_PAGE_HEIGHT = 1100;

// Helper to collect all media from page and its sections
function collectAllMedia(page: Page) {
  // Start with page-level media
  const allAudio: AudioReference[] = [...(page.audio || [])];
  const allVideo: VideoReference[] = [...(page.video || [])];
  const allActivities: ActivityReference[] = [...(page.activities || [])];
  const allFillAnswers: FillAnswerArea[] = [...(page.fillAnswers || [])];

  // Add media from all sections
  if (page.sections) {
    for (const section of page.sections) {
      if (section.audio) allAudio.push(...section.audio);
      if (section.video) allVideo.push(...section.video);
      if (section.activities) allActivities.push(...section.activities);
      if (section.fillAnswers) allFillAnswers.push(...section.fillAnswers);
    }
  }

  return { allAudio, allVideo, allActivities, allFillAnswers };
}

interface PageImageProps {
  page: Page;
  pageIndex: number;
  viewMode: "single" | "double";
}

function PageImage({ page, pageIndex, viewMode }: PageImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
  });
  const [displayDimensions, setDisplayDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { showAnnotations, activeTool } = useAnnotationStore();

  // Collect all media from page and sections
  const { allAudio, allVideo, allActivities, allFillAnswers } =
    collectAllMedia(page);

  useEffect(() => {
    let isMounted = true;
    let blobUrl: string | null = null;

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch image through authenticated API and get blob URL
        const url = await getPageImageUrl(page.image);

        if (!isMounted) return;

        if (!url) {
          setError("Failed to load image");
          setIsLoading(false);
          return;
        }

        blobUrl = url;

        // Preload the image to get dimensions
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setImageDimensions({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
            setImageUrl(url);
            setIsLoading(false);
          }
        };
        img.onerror = () => {
          if (isMounted) {
            setError("Failed to load image");
            setIsLoading(false);
          }
        };
        img.src = url;
      } catch {
        if (isMounted) {
          setError("Failed to load image");
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      // Revoke blob URL on cleanup to free memory
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [page.image]);

  // Track display dimensions for annotation canvas
  useEffect(() => {
    if (!imageContainerRef.current || !imageUrl) return;

    const updateDisplayDimensions = () => {
      const img = imageContainerRef.current?.querySelector("img");
      if (img) {
        setDisplayDimensions({
          width: img.clientWidth,
          height: img.clientHeight,
        });
      }
    };

    // Initial update
    updateDisplayDimensions();

    // Update on resize
    const observer = new ResizeObserver(updateDisplayDimensions);
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current);
    }

    return () => observer.disconnect();
  }, [imageUrl]);

  // Determine if annotation canvas should be interactive
  const isAnnotationInteractive = showAnnotations && activeTool !== null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-white shadow-lg h-full aspect-[3/4]",
          viewMode === "single" ? "w-[300px]" : "w-[250px]",
        )}
      >
        {/* Skeleton page layout */}
        <div className="flex h-full flex-col gap-3 p-5">
          {/* Header bar */}
          <div className="h-5 w-3/4 rounded bg-slate-200 animate-pulse" />
          {/* Text lines */}
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse delay-75" />
          <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse delay-100" />
          {/* Image placeholder */}
          <div className="flex-1 rounded bg-slate-200 animate-pulse delay-150" />
          {/* Bottom text lines */}
          <div className="h-3 w-full rounded bg-slate-100 animate-pulse delay-200" />
          <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse delay-300" />
        </div>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        {/* Page number */}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-300 font-medium">
          {pageIndex + 1}
        </span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg bg-white shadow-lg h-full aspect-[3/4]",
          viewMode === "single" ? "w-[300px]" : "w-[250px]",
        )}
      >
        <span className="text-3xl font-bold text-slate-200">{pageIndex + 1}</span>
        <span className="mt-1 text-xs text-slate-400">{error || "Image not available"}</span>
      </div>
    );
  }

  return (
    <div
      ref={imageContainerRef}
      className="relative overflow-hidden rounded-lg bg-white p-0.5 shadow-lg h-full max-h-full"
    >
      <img
        src={imageUrl}
        alt={`Page ${pageIndex + 1}`}
        draggable={false}
        className={cn(
          "pointer-events-none select-none rounded object-contain h-full w-auto",
          viewMode === "double" && "max-w-[45vw]",
        )}
      />

      {/* Interactive Overlays - sized to match the actual rendered image area */}
      {imageUrl && displayDimensions.width > 0 && (
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            width: displayDimensions.width,
            height: displayDimensions.height,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Fill Answer Overlays - clickable areas that show text answers */}
          {allFillAnswers.map((fillAnswer) => (
            <FillAnswerOverlay
              key={fillAnswer.id}
              fillAnswer={fillAnswer}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Audio Icons Layer - from page and all sections */}
          {allAudio.map((audioRef) => (
            <AudioIcon
              key={audioRef.id}
              audioRef={audioRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Video Icons Layer - from page and all sections */}
          {allVideo.map((videoRef) => (
            <VideoIcon
              key={videoRef.id}
              videoRef={videoRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}

          {/* Activity Icons Layer - from page and all sections */}
          {allActivities.map((activityRef) => (
            <ActivityIcon
              key={activityRef.id}
              activityRef={activityRef}
              pageWidth={imageDimensions.width}
              pageHeight={imageDimensions.height}
            />
          ))}
        </div>
      )}

      {/* Annotation Canvas Layer */}
      {displayDimensions.width > 0 && displayDimensions.height > 0 && (
        <AnnotationCanvas
          pageIndex={pageIndex}
          width={displayDimensions.width}
          height={displayDimensions.height}
          isInteractive={isAnnotationInteractive}
        />
      )}
    </div>
  );
}

export function PageViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { config, currentPageIndex } = useFlowbookBookStore();
  const { viewMode, zoomLevel, panX, panY, isPanning, resetPan } =
    useFlowbookUIStore();
  const { activeTool } = useAnnotationStore();

  // Enable zoom gestures (wheel, pinch, double-click) and panning
  useZoomGestures(containerRef);

  // Reset pan when page changes
  useEffect(() => {
    resetPan();
  }, [currentPageIndex, resetPan]);

  // Prefetch next 2 pages for instant navigation
  useEffect(() => {
    if (!config) return;
    const pagesToPrefetch = [currentPageIndex + 1, currentPageIndex + 2];
    for (const idx of pagesToPrefetch) {
      if (idx < config.pages.length) {
        const pageImage = config.pages[idx].image;
        if (pageImage) {
          getPageImageUrl(pageImage).then((url) => {
            if (url) {
              const img = new Image();
              img.src = url;
            }
          });
        }
      }
    }
  }, [currentPageIndex, config]);

  if (!config) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading book...</span>
        </div>
      </div>
    );
  }

  if (config.pages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-slate-400">No pages available</span>
      </div>
    );
  }

  const spreadPages = getSpreadPages(
    currentPageIndex,
    config.pages.length,
    viewMode,
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        zoomLevel > 1 && !isPanning && activeTool === null && "cursor-grab",
        isPanning && activeTool === null && "cursor-grabbing",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 h-full",
          viewMode === "double" && "gap-1",
          !isPanning && "transition-transform duration-100",
        )}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
          transformOrigin: "center center",
        }}
      >
        {spreadPages.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-slate-400 shadow-lg">
            <p>No pages to display</p>
          </div>
        ) : (
          spreadPages.map((pageIdx) => {
            const page = config.pages[pageIdx];
            if (!page) {
              return (
                <div
                  key={pageIdx}
                  className="flex h-full w-[250px] items-center justify-center rounded-lg bg-slate-200"
                >
                  <span className="text-slate-400">
                    Page {pageIdx + 1} not found
                  </span>
                </div>
              );
            }

            return (
              <PageImage
                key={pageIdx}
                page={page}
                pageIndex={pageIdx}
                viewMode={viewMode}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
