// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const savePicture = vi.hoisted(() => vi.fn());
vi.mock("@/app/(app)/actions/picture", () => ({ savePicture }));

import { PictureCropper } from "@/components/profile/PictureCropper";

// R80, E65, E66 (design 23.3): choosing, fitting and saving a photo.

const drawImage = vi.fn();

beforeEach(() => {
  savePicture.mockReset();
  savePicture.mockResolvedValue({ status: "ok" });
  drawImage.mockReset();
  // jsdom has no image decoding and no canvas: stand-ins for both.
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({ drawImage }) as unknown as CanvasRenderingContext2D,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = function (callback, type) {
    callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type }));
  };
});
afterEach(cleanup);

/** Choose a file and let the "browser" finish opening it as a photo. */
async function choosePhoto(width = 1000, height = 500) {
  const input = screen.getByLabelText("Choose a photo");
  await act(async () =>
    fireEvent.change(input, {
      target: { files: [new File(["x"], "me.jpg", { type: "image/jpeg" })] },
    }),
  );
  const photo = screen.getByTestId("crop-photo") as HTMLImageElement;
  Object.defineProperty(photo, "naturalWidth", { value: width });
  Object.defineProperty(photo, "naturalHeight", { value: height });
  await act(async () => fireEvent.load(photo));
  return photo;
}

describe("PictureCropper", () => {
  it("starts with only a way to choose a photo", () => {
    render(<PictureCropper onDone={vi.fn()} />);
    expect(screen.getByLabelText("Choose a photo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save picture" })).toBeNull();
  });

  it("opens the chosen photo, just filling the circle", async () => {
    render(<PictureCropper onDone={vi.fn()} />);
    const photo = await choosePhoto(1000, 500);
    // The shorter side (500) fills the 256 px view: 512 px wide.
    expect(photo.style.width).toBe("512px");
    expect(screen.getByRole("button", { name: "Save picture" })).toBeTruthy();
  });

  it("zooms the photo with the slider", async () => {
    render(<PictureCropper onDone={vi.fn()} />);
    const photo = await choosePhoto(1000, 500);
    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "2" } });
    expect(photo.style.width).toBe("1024px");
  });

  // E65
  it("says so when the file cannot be opened as a picture", async () => {
    render(<PictureCropper onDone={vi.fn()} />);
    const input = screen.getByLabelText("Choose a photo");
    await act(async () =>
      fireEvent.change(input, {
        target: {
          files: [new File(["x"], "notes.txt", { type: "text/plain" })],
        },
      }),
    );
    await act(async () => fireEvent.error(screen.getByTestId("crop-photo")));
    expect(screen.getByRole("alert").textContent).toBe(
      "That file couldn't be opened as a picture.",
    );
  });

  it("saves the circle's square as a 256 px JPEG", async () => {
    const onDone = vi.fn();
    render(<PictureCropper onDone={onDone} />);
    await choosePhoto(1000, 500);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Save picture" })),
    );

    // The middle 500 x 500 of the photo, drawn onto 256 x 256.
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      250,
      0,
      500,
      500,
      0,
      0,
      256,
      256,
    );
    const sent = savePicture.mock.calls[0][0] as FormData;
    const file = sent.get("picture") as Blob;
    expect(file.type).toBe("image/jpeg");
    expect(onDone).toHaveBeenCalled();
  });

  // E66
  it("explains a failed save and stays open", async () => {
    savePicture.mockResolvedValue({
      status: "error",
      message: "That picture couldn't be saved. Please try again.",
    });
    const onDone = vi.fn();
    render(<PictureCropper onDone={onDone} />);
    await choosePhoto();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Save picture" })),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "That picture couldn't be saved. Please try again.",
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
