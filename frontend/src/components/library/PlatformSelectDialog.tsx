/**
 * Platform Select Dialog Component
 * Story 29.3: Book Preview and Download Actions
 *
 * Dialog for selecting platform when downloading a book bundle.
 * Shows progress in dialog, auto-downloads when ready.
 */

import {
  AlertCircle,
  Apple,
  Check,
  Download,
  Loader2,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { booksApi, type Platform } from "@/services/booksApi";

interface PlatformOption {
  id: Platform;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const platformOptions: PlatformOption[] = [
  {
    id: "mac",
    label: "macOS",
    description: "For macOS 10.13 or later",
    icon: <Apple className="h-6 w-6" />,
  },
  {
    id: "win",
    label: "Windows",
    description: "For Windows 10/11",
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    id: "win7-8",
    label: "Windows 7/8",
    description: "For legacy Windows versions",
    icon: <Monitor className="h-6 w-6" />,
  },
  {
    id: "linux",
    label: "Linux",
    description: "For Linux distributions",
    icon: <Monitor className="h-6 w-6" />,
  },
];

type BundleState = "idle" | "preparing" | "ready" | "error";

interface PlatformSelectDialogProps {
  bookId: number;
  bookTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformSelectDialog({
  bookId,
  bookTitle,
  isOpen,
  onClose,
}: PlatformSelectDialogProps) {
  const [bundleState, setBundleState] = useState<BundleState>("idle");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handlePlatformSelect = async (platform: Platform) => {
    setSelectedPlatform(platform);
    setBundleState("preparing");
    setError(null);

    try {
      const response = await booksApi.requestBookBundle(bookId, platform);
      setBundleState("ready");

      // Auto-download
      window.location.href = response.download_url;

      // Close dialog after a moment
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to request bundle:", err);
      setError("Failed to generate download link. Please try again.");
      setBundleState("error");
    }
  };

  const handleClose = () => {
    if (bundleState !== "preparing") {
      setBundleState("idle");
      setSelectedPlatform(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Book
          </DialogTitle>
          <DialogDescription>
            {bundleState === "idle" &&
              `Select a platform to download "${bookTitle}" as a standalone application.`}
            {bundleState === "preparing" &&
              `Preparing "${bookTitle}" bundle — please don't refresh the page.`}
            {bundleState === "ready" && "Download started!"}
            {bundleState === "error" && "Something went wrong."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  selectedPlatform && handlePlatformSelect(selectedPlatform)
                }
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {bundleState === "preparing" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Preparing{" "}
              {platformOptions.find((p) => p.id === selectedPlatform)?.label}{" "}
              bundle...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a minute for large books
            </p>
          </div>
        )}

        {bundleState === "ready" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Check className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Download started!</p>
          </div>
        )}

        {bundleState === "idle" && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {platformOptions.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="h-auto flex-col gap-2 p-4 hover:border-primary hover:bg-primary/5"
                onClick={() => handlePlatformSelect(option.id)}
              >
                {option.icon}
                <div className="text-center">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
