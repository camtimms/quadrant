"use client";

// "use client": the photo is opened, moved, zoomed and cut out in the
// browser. The free plan cannot resize pictures on the server (design
// 16.9), so the browser sends only the finished 256 x 256 square.

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { savePicture } from "@/app/(app)/actions/picture";
import { buttonMain, buttonSecondary, focusRing } from "@/components/ui/styles";
import {
  clampOffset,
  clampZoom,
  MAX_ZOOM,
  OUTPUT_SIZE,
  sourceSquare,
} from "@/lib/cropMaths";

/** The circle on screen, in CSS pixels. */
const VIEW = 256;
/** How far one press of an arrow key moves the photo, for the keyboard. */
const KEY_STEP = 8;

type Props = {
  /** Called once the picture is saved. */
  onDone: () => void;
  /** Called when the member backs out without saving. */
  onCancel?: () => void;
};

/**
 * Choose a photo, fit it into the circle by dragging and zooming, and save
 * it (R80, design 23.3). All the arithmetic is in cropMaths.ts; this
 * component reads the pointer, the keys and the slider, and draws.
 */
export function PictureCropper({ onDone, onCancel }: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Free the temporary address of a photo once it is no longer shown.
  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  function choose(file: File | undefined) {
    setProblem(null);
    setPhoto(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    // A temporary address for the file, readable only by this page.
    setSource(file ? URL.createObjectURL(file) : null);
  }

  function move(next: { x: number; y: number }, nextZoom = zoom) {
    if (photo) setOffset(clampOffset(next, photo, VIEW, nextZoom));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    // Keep receiving the movement even if the finger leaves the circle.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current) {
      move({
        x: event.clientX - drag.current.x,
        y: event.clientY - drag.current.y,
      });
    }
  }

  async function save() {
    if (!photo || !image.current) return;
    setSaving(true);
    setProblem(null);
    const square = sourceSquare(photo, VIEW, zoom, offset);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    canvas
      .getContext("2d")
      ?.drawImage(
        image.current,
        square.x,
        square.y,
        square.size,
        square.size,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
    // JPEG, not WebP: Safari cannot make WebP from a canvas (design 23.3).
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) {
      setSaving(false);
      setProblem("That picture couldn't be made. Please try another photo.");
      return;
    }
    const form = new FormData();
    form.set("picture", blob, "avatar.jpg");
    const result = await savePicture(form);
    setSaving(false);
    if (result.status === "error") setProblem(result.message);
    else onDone();
  }

  const scale = photo ? (VIEW / Math.min(photo.width, photo.height)) * zoom : 1;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Choose a photo
        <input
          type="file"
          accept="image/*"
          onChange={(event) => choose(event.target.files?.[0])}
          className={`text-sm ${focusRing}`}
        />
      </label>

      {source ? (
        <>
          {/* The circle. Drag the photo with a finger or the mouse; with
              the keyboard, focus it and use the arrow keys (NFR12). */}
          <div
            role="group"
            aria-label="Move the photo within the circle with the arrow keys"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(event) => {
              const step: Record<string, [number, number]> = {
                ArrowLeft: [-KEY_STEP, 0],
                ArrowRight: [KEY_STEP, 0],
                ArrowUp: [0, -KEY_STEP],
                ArrowDown: [0, KEY_STEP],
              };
              const by = step[event.key];
              if (by) {
                event.preventDefault();
                move({ x: offset.x + by[0], y: offset.y + by[1] });
              }
            }}
            // touch-none: a drag moves the photo, not the page.
            className={`relative h-64 w-64 cursor-grab touch-none overflow-hidden rounded-full bg-well ring-2 ring-edge active:cursor-grabbing ${focusRing}`}
          >
            {/* A plain <img>: a temporary in-browser address, nothing for
                Next.js's image optimiser to do. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={image}
              data-testid="crop-photo"
              src={source}
              alt="Your photo, to be fitted in the circle"
              draggable={false}
              onLoad={(event) =>
                setPhoto({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => {
                setPhoto(null);
                setProblem("That file couldn't be opened as a picture.");
              }}
              style={
                photo
                  ? {
                      width: `${photo.width * scale}px`,
                      maxWidth: "none",
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }
                  : { opacity: 0 }
              }
              className="absolute top-1/2 left-1/2 select-none"
            />
          </div>

          {photo ? (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => {
                    const next = clampZoom(Number(event.target.value));
                    setZoom(next);
                    // Zooming out may leave the photo out of reach: pull it in.
                    move(offset, next);
                  }}
                  className={`accent-ink dark:accent-accent ${focusRing}`}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={buttonMain}
                >
                  {saving ? "Saving…" : "Save picture"}
                </button>
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className={buttonSecondary}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {problem ? (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
