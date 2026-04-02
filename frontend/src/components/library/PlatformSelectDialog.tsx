/**
 * Platform Select Dialog Component
 * Story 29.3: Book Preview and Download Actions
 *
 * Dialog for selecting platform when downloading a book bundle.
 * Closes immediately on selection, shows toast progress, auto-downloads.
 */

import { Apple, Download, Monitor } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
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
  const [preparing, setPreparing] = useState(false);

  const handlePlatformSelect = async (platform: Platform) => {
    setPreparing(true);
    onClose();

    const { update } = toast({
      title: "Preparing bundle...",
      description: `${bookTitle} (${platform})`,
    });

    try {
      const response = await booksApi.requestBookBundle(bookId, platform);

      update({
        id: "",
        title: "Bundle ready!",
        description: `Downloading ${response.file_name}`,
      });

      window.location.href = response.download_url;
    } catch {
      update({
        id: "",
        title: "Bundle failed",
        description: "Failed to generate download. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Book
          </DialogTitle>
          <DialogDescription>
            Select a platform to download &quot;{bookTitle}&quot; as a
            standalone application.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {platformOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className="h-auto flex-col gap-2 p-4 hover:border-primary hover:bg-primary/5"
              onClick={() => handlePlatformSelect(option.id)}
              disabled={preparing}
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

        <div className="text-xs text-muted-foreground text-center">
          Dialog will close — download starts automatically when ready.
        </div>
      </DialogContent>
    </Dialog>
  );
}
