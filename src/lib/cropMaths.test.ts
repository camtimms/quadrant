import { describe, expect, it } from "vitest";
import {
  clampOffset,
  clampZoom,
  MAX_ZOOM,
  OUTPUT_SIZE,
  sourceSquare,
} from "@/lib/cropMaths";

// R80 (design 23.3): fitting a photo into the circle by moving and zooming.
// All sizes are in the cropper's own on-screen pixels; the circle is a
// VIEW pixels square.

const VIEW = 256;

describe("the output", () => {
  it("is a 256 x 256 square", () => {
    expect(OUTPUT_SIZE).toBe(256);
  });
});

describe("clampZoom", () => {
  it("runs from just filling the circle (1) to four times that", () => {
    expect(MAX_ZOOM).toBe(4);
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(9)).toBe(4);
  });
});

describe("clampOffset", () => {
  // A landscape photo 1000 x 500 at zoom 1: its height fills the circle
  // (scale 256/500), so it is 512 wide and can slide 128 either way, and
  // not at all up or down.
  const photo = { width: 1000, height: 500 };

  it("lets the photo slide only as far as it still fills the circle", () => {
    expect(clampOffset({ x: 400, y: 50 }, photo, VIEW, 1)).toEqual({
      x: 128,
      y: 0,
    });
    expect(clampOffset({ x: -400, y: -50 }, photo, VIEW, 1)).toEqual({
      x: -128,
      y: 0,
    });
  });

  it("leaves an offset alone when it is within reach", () => {
    expect(clampOffset({ x: 30, y: 0 }, photo, VIEW, 1)).toEqual({
      x: 30,
      y: 0,
    });
  });

  it("allows more room the more it is zoomed", () => {
    // Zoom 2: 1024 x 512 on screen, so 384 sideways and 128 up or down.
    expect(clampOffset({ x: 999, y: 999 }, photo, VIEW, 2)).toEqual({
      x: 384,
      y: 128,
    });
  });
});

describe("sourceSquare", () => {
  const photo = { width: 1000, height: 500 };

  it("is the middle square of the photo, centred, at zoom 1", () => {
    // The circle shows 500 x 500 photo pixels from the centre.
    expect(sourceSquare(photo, VIEW, 1, { x: 0, y: 0 })).toEqual({
      x: 250,
      y: 0,
      size: 500,
    });
  });

  it("is a smaller square when zoomed in", () => {
    expect(sourceSquare(photo, VIEW, 2, { x: 0, y: 0 })).toEqual({
      x: 375,
      y: 125,
      size: 250,
    });
  });

  // Moving the photo right on screen shows more of its LEFT side.
  it("follows the photo as it is moved", () => {
    const moved = sourceSquare(photo, VIEW, 1, { x: 128, y: 0 });
    expect(moved).toEqual({ x: 0, y: 0, size: 500 });
  });

  it("never reaches outside the photo, even with an offset out of reach", () => {
    const square = sourceSquare(photo, VIEW, 1, { x: 9999, y: -9999 });
    expect(square.x).toBeGreaterThanOrEqual(0);
    expect(square.y).toBeGreaterThanOrEqual(0);
    expect(square.x + square.size).toBeLessThanOrEqual(photo.width);
    expect(square.y + square.size).toBeLessThanOrEqual(photo.height);
  });

  it("works for a portrait photo too", () => {
    expect(
      sourceSquare({ width: 600, height: 900 }, VIEW, 1, { x: 0, y: 0 }),
    ).toEqual({
      x: 0,
      y: 150,
      size: 600,
    });
  });
});
