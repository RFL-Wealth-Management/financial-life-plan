"use client";

import { useEffect, useRef, useState } from "react";

const LOGO_SRC = "/logo.png";
const FALLBACK_SRC = "/logo.svg";

/**
 * Company logo.
 *
 * Reads `/public/logo.png` — drop the real RFL Wealth Management PNG there and
 * every place this renders (sidebar, login) updates automatically. Until that
 * file exists it falls back to the bundled placeholder mark (`/logo.svg`), so
 * there's never a broken-image icon.
 *
 * `height` sets the rendered height in px; width scales to the image's aspect
 * ratio so wordmarks and square marks both look right.
 */
export function Logo({
  height = 40,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const [src, setSrc] = useState(LOGO_SRC);
  const ref = useRef<HTMLImageElement>(null);

  // The <img> is server-rendered, so the browser may finish (and fail) loading
  // /logo.png before React hydrates and can attach onError — that error event
  // is then lost. Re-check after mount: a failed image is `complete` with a
  // naturalWidth of 0. onError below still covers post-hydration failures.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setSrc(FALLBACK_SRC);
    }
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- swappable brand asset with a runtime fallback; next/image can't switch src on error as cleanly.
    <img
      ref={ref}
      src={src}
      alt="RFL Wealth Management"
      onError={() => setSrc(FALLBACK_SRC)}
      style={{ height:'auto', width: "70%" }}
      className={className}
    />
  );
}
