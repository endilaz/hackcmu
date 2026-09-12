import { useCallback, useRef, useState } from "react";
import type { ButtonHTMLAttributes, PointerEvent, KeyboardEvent, AnimationEvent } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
  /** True once the press ended - the disc keeps growing while it fades out. */
  leaving: boolean;
};

/** The fade-out keyframe's name, matched in onAnimationEnd to know when to drop a ripple. */
const OUT_ANIMATION = "ripple-out";

/**
 * A `<button>` with a Material-style touch ripple.
 *
 * Port of a Framer Motion component, rebuilt on CSS keyframes so it adds no
 * dependency - `motion` would have been ~34kB gzipped for one effect, on an app
 * whose only runtime dependencies are React and Leaflet.
 *
 * Behaviour follows the original exactly: the disc is sized to reach the
 * farthest corner from the press point, it holds at full opacity while the
 * button is held, and it fades on release. Space/Enter ripple from the centre,
 * so keyboard users get the same feedback as pointer users.
 *
 * The ripple paints in `currentColor`, so it inherits each variant's own
 * foreground - cream on the filled primary, forest green on the outlined
 * secondary, red-brown on the danger button - with no per-variant CSS.
 */
export default function RippleButton({
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onBlur,
  onKeyDown,
  onKeyUp,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const addRipple = useCallback((clientX: number, clientY: number) => {
    const node = buttonRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    // Radius has to reach the farthest corner, or the disc stops short of the
    // edge when you press near one side.
    const farthestX = Math.max(x, box.width - x);
    const farthestY = Math.max(y, box.height - y);
    const size = Math.hypot(farthestX, farthestY) * 2;
    const id = ++nextId.current;
    setRipples((current) => [...current, { id, x, y, size, leaving: false }]);
  }, []);

  /** Releases the oldest still-held ripple; the CSS fade takes it from there. */
  const releaseRipple = useCallback(() => {
    setRipples((current) => {
      const index = current.findIndex((r) => !r.leaving);
      if (index === -1) return current;
      const next = [...current];
      next[index] = { ...next[index], leaving: true };
      return next;
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.isPrimary) addRipple(event.clientX, event.clientY);
      onPointerDown?.(event);
    },
    [addRipple, onPointerDown],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      // Held keys autorepeat; one press should mean one ripple.
      if (!event.repeat && (event.key === " " || event.key === "Enter")) {
        const node = buttonRef.current;
        if (node) {
          const box = node.getBoundingClientRect();
          addRipple(box.left + box.width / 2, box.top + box.height / 2);
        }
      }
      onKeyDown?.(event);
    },
    [addRipple, onKeyDown],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " " || event.key === "Enter") releaseRipple();
      onKeyUp?.(event);
    },
    [releaseRipple, onKeyUp],
  );

  /**
   * Unmount a ripple only when its fade finishes. The growth keyframe also
   * fires this event, so the name is checked - otherwise discs would vanish
   * mid-press.
   */
  const handleAnimationEnd = useCallback((event: AnimationEvent<HTMLSpanElement>, id: number) => {
    if (event.animationName !== OUT_ANIMATION) return;
    setRipples((current) => current.filter((r) => r.id !== id));
  }, []);

  return (
    <button
      {...rest}
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => {
        releaseRipple();
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        releaseRipple();
        onPointerCancel?.(e);
      }}
      onPointerLeave={(e) => {
        releaseRipple();
        onPointerLeave?.(e);
      }}
      onBlur={(e) => {
        releaseRipple();
        onBlur?.(e);
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {children}
      <span className="ripple-container" aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className={`ripple${ripple.leaving ? " ripple--out" : ""}`}
            style={{
              width: ripple.size,
              height: ripple.size,
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
            }}
            onAnimationEnd={(e) => handleAnimationEnd(e, ripple.id)}
          />
        ))}
      </span>
    </button>
  );
}
