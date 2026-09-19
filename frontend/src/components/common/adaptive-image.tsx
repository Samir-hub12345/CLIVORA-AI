"use client";

import React, { useState, useEffect } from "react";
import { useConnectivity } from "@/lib/connectivity";
import { Image as ImageIcon, Download, WifiOff, CheckCircle2, Eye } from "lucide-react";

export interface AdaptiveImageProps {
  src: string;
  alt: string;
  isEssential?: boolean;
  className?: string;
  aspectRatio?: string;
  estimatedKb?: number;
  caption?: string;
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  alt,
  isEssential = false,
  className = "",
  aspectRatio = "aspect-video",
  estimatedKb = 40,
  caption,
}) => {
  const { state, isLowBandwidthActive } = useConnectivity();
  const [userRequestedLoad, setUserRequestedLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // In GOOD or NORMAL mode, or if isEssential, load automatically
  const shouldAutoLoad = isEssential || (!isLowBandwidthActive && state !== "OFFLINE");
  const shouldRenderImage = shouldAutoLoad || userRequestedLoad;

  // Reset user requested load if returning to Good connection
  useEffect(() => {
    if (!isLowBandwidthActive && state !== "OFFLINE") {
      setUserRequestedLoad(true);
    }
  }, [isLowBandwidthActive, state]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${aspectRatio} ${className}`}>
      {shouldRenderImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setLoadError(true)}
            loading={isEssential ? "eager" : "lazy"}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {!loaded && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading {isEssential ? "essential document..." : "image..."}</span>
              </div>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-100 text-slate-500 text-xs text-center">
              <WifiOff className="w-6 h-6 text-slate-400 mb-1" />
              <p className="font-semibold text-slate-700">Image not available</p>
              <p className="text-[11px] text-slate-400">Could not retrieve asset under current network</p>
            </div>
          )}

          {isEssential && isLowBandwidthActive && loaded && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Essential Clinical Asset</span>
            </div>
          )}
        </>
      ) : (
        /* Deferred placeholder in Low Bandwidth mode */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 text-center">
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-2">
            <ImageIcon className="w-5 h-5" />
          </div>

          <p className="text-xs font-bold text-slate-800">
            Image Deferred &bull; Data Saver Active
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-0.5 line-clamp-1">
            {caption || alt || "Non-essential visual media paused to preserve bandwidth"}
          </p>

          <button
            type="button"
            onClick={() => setUserRequestedLoad(true)}
            className="mt-3 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Image (~{estimatedKb} KB)</span>
          </button>
        </div>
      )}
    </div>
  );
};
