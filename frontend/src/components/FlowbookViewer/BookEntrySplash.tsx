/**
 * Book Entry Splash Screen Component
 *
 * Framer Motion "Curtain Reveal" animation sequence:
 * 1. Publisher logo fades in with blur-to-sharp + scale
 * 2. Publisher name slides up from below
 * 3. Logo section moves up, book cover enters with 3D perspective flip
 * 4. Book title + Open button fade in
 */

import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { useSoundContext } from "@/hooks/useSoundEffects";

interface BookEntrySplashProps {
  title: string;
  coverUrl: string | null;
  publisherName: string;
  publisherId: number;
  isLoading?: boolean;
  onOpen: () => void;
  onClose?: () => void;
}

export function BookEntrySplash({
  title,
  coverUrl,
  publisherName,
  publisherId,
  isLoading = false,
  onOpen,
  onClose,
}: BookEntrySplashProps) {
  const [logoError, setLogoError] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { play } = useSoundContext();

  const publisherLogoUrl = `/api/v1/publishers/${publisherId}/logo`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated background glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Publisher Section — moves up after delay */}
          <motion.div
            className="flex flex-col items-center"
            animate={{ y: [0, 0, -32] }}
            transition={{
              duration: 0.7,
              delay: 1.6,
              ease: "easeOut",
              times: [0, 0.1, 1],
            }}
          >
            {/* Logo — blur-to-sharp + scale */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.6, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-full bg-primary/20 blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />

              {/* Logo Circle */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden bg-white/10 backdrop-blur ring-2 ring-white/20 shadow-2xl flex items-center justify-center">
                {!logoError ? (
                  <img
                    src={publisherLogoUrl}
                    alt={publisherName}
                    className={`w-full h-full object-contain p-3 transition-opacity duration-300 ${
                      logoLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-4xl font-bold text-white/80">
                    {publisherName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Publisher Name */}
            <motion.h2
              className="mt-5 text-2xl font-semibold text-white/90 tracking-wide"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            >
              {publisherName}
            </motion.h2>
          </motion.div>

          {/* Book Section — 3D perspective reveal */}
          <motion.div
            className="mt-8 flex flex-col items-center"
            style={{ perspective: 800 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 2.0 }}
          >
            {/* Book Cover with 3D flip */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, rotateY: -60, scale: 0.85 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 2.0,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Cover glow */}
              <motion.div
                className="absolute -inset-3 bg-primary/10 rounded-lg blur-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 2.4 }}
              />

              {/* Shadow under book */}
              <motion.div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-6 bg-black/30 rounded-full blur-xl"
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.6, delay: 2.4 }}
              />

              <div className="relative w-52 aspect-[3/4] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookCover
                    coverUrl={null}
                    title={title}
                    size="lg"
                    className="w-full h-full"
                  />
                )}
              </div>
            </motion.div>

            {/* Book Title */}
            <motion.h1
              className="mt-5 text-xl font-medium text-white text-center max-w-xs leading-snug"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 2.6, ease: "easeOut" }}
            >
              {title}
            </motion.h1>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="mt-8 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 3.0, ease: "easeOut" }}
          >
            <Button
              size="lg"
              className="px-10 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:scale-105"
              onClick={() => {
                play("bookOpen");
                onOpen();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5 mr-2" />
                  Open Book
                </>
              )}
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                Back to Library
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
