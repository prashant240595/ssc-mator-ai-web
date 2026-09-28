import { useEffect, useRef, useState } from "react";

type AndroidAdsBridge = {
  showNativeAd?: (
    slotId: string,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => void;
  updateSlotRect?: (
    slotId: string,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => void;
  hideNativeAd?: (slotId: string) => void;
};

type AdSlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

function readAdSlotRect(slotId: string): AdSlotRect {
  if (typeof window === "undefined") {
    return { x: 0, y: 0, width: 0, height: 0, visible: false };
  }
  const element = document.getElementById(slotId);
  if (!element) return { x: 0, y: 0, width: 0, height: 0, visible: false };
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    visible:
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth &&
      rect.width > 0 &&
      rect.height > 0,
  };
}

function getAdsBridge(): AndroidAdsBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { AndroidAds?: AndroidAdsBridge }).AndroidAds ?? null;
}

const activeNativeSlots = new Set<string>();

export function hideNativeAdSlot(slotId: string) {
  if (!activeNativeSlots.has(slotId)) return;
  try {
    getAdsBridge()?.hideNativeAd?.(slotId);
  } catch {
    /* App build does not expose native ads yet. */
  }
  activeNativeSlots.delete(slotId);
}

export function NativeAdSlot({ slotId }: { slotId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [adFree, setAdFree] = useState(false);

  useEffect(() => {
    const updateEntitlement = (event?: Event) => {
      const detail = (event as CustomEvent<{ adFree?: boolean }> | undefined)?.detail;
      setAdFree(detail?.adFree ?? Boolean((window as unknown as { sscAdFree?: boolean }).sscAdFree));
    };

    updateEntitlement();
    document.addEventListener("ssc:entitlement", updateEntitlement);
    return () => document.removeEventListener("ssc:entitlement", updateEntitlement);
  }, []);

  useEffect(() => {
    (
      window as unknown as {
        getAdSlotRect?: (requestedSlotId: string) => AdSlotRect;
      }
    ).getAdSlotRect = readAdSlotRect;
  }, []);

  useEffect(() => {
    const element = slotRef.current;
    if (!element || adFree) {
      hideNativeAdSlot(slotId);
      return;
    }

    let frame = 0;
    const syncPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = readAdSlotRect(slotId);
        const bridge = getAdsBridge();
        try {
          if (rect.visible && !activeNativeSlots.has(slotId) && bridge?.showNativeAd) {
            bridge.showNativeAd(slotId, rect.x, rect.y, rect.width, rect.height);
            activeNativeSlots.add(slotId);
          } else if (rect.visible && activeNativeSlots.has(slotId)) {
            bridge?.updateSlotRect?.(slotId, rect.x, rect.y, rect.width, rect.height);
          } else if (!rect.visible) {
            hideNativeAdSlot(slotId);
          }
        } catch {
          /* App build does not expose native ads yet. */
        }
      });
    };

    const observer = new ResizeObserver(syncPosition);
    observer.observe(element);
    window.addEventListener("scroll", syncPosition, { passive: true });
    window.addEventListener("resize", syncPosition);
    document.addEventListener("ssc:ads-ready", syncPosition);
    syncPosition();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", syncPosition);
      window.removeEventListener("resize", syncPosition);
      document.removeEventListener("ssc:ads-ready", syncPosition);
      hideNativeAdSlot(slotId);
    };
  }, [adFree, slotId]);

  if (adFree) return null;

  return (
    <section
      id={slotId}
      ref={slotRef}
      data-native-ad-slot={slotId}
      aria-label="Advertisement"
      className="relative min-h-[250px] w-full overflow-hidden rounded-lg border border-border bg-muted/30"
    >
      {import.meta.env.DEV && !getAdsBridge() && (
        <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
          Native ad · {slotId}
        </span>
      )}
    </section>
  );
}