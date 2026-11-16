// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real actions run on the server; the form only needs stand-ins.
const removePicture = vi.hoisted(() => vi.fn());
vi.mock("@/app/(app)/actions/profile", () => ({
  saveDisplayName: vi.fn(async () => ({})),
}));
vi.mock("@/app/(app)/actions/picture", () => ({
  savePicture: vi.fn(),
  removePicture,
}));

import { DisplayNameForm } from "@/components/profile/DisplayNameForm";

afterEach(cleanup);
beforeEach(() => {
  removePicture.mockReset();
  removePicture.mockResolvedValue({ status: "ok" });
});

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";
const OWN = "/api/avatar/6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f?v=3";

function renderForm(
  props: Partial<Parameters<typeof DisplayNameForm>[0]> = {},
) {
  return render(
    <DisplayNameForm
      initialName="Cam"
      submitLabel="Save"
      pictureChoice="google"
      googlePicture={GOOGLE}
      ownPicture={null}
      {...props}
    />,
  );
}

const choice = (name: RegExp) =>
  screen.getByRole("radio", { name }) as HTMLInputElement;
const preview = () => screen.getByTestId("picture-preview");
const previewImage = () =>
  preview().querySelector("img")?.getAttribute("src") ?? null;

describe("DisplayNameForm: the picture choice (R79)", () => {
  it("offers three choices, sent as the 'picture' field", () => {
    renderForm();
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((radio) => radio.value)).toEqual([
      "google",
      "upload",
      "initial",
    ]);
    expect(radios.every((radio) => radio.name === "picture")).toBe(true);
  });

  it("starts on the stored choice", () => {
    renderForm({ pictureChoice: "initial" });
    expect(choice(/Just my initial/).checked).toBe(true);
  });

  // What friends will see, for whichever is chosen.
  it("previews the chosen picture", () => {
    renderForm({ ownPicture: OWN });
    expect(previewImage()).toBe(GOOGLE);

    fireEvent.click(choice(/My own picture/));
    expect(previewImage()).toBe(OWN);

    fireEvent.click(choice(/Just my initial/));
    expect(previewImage()).toBeNull();
    expect(preview().textContent).toBe("C");
  });

  // E27: no Google picture to choose.
  it("cannot choose Google's picture when the account has none", () => {
    renderForm({ googlePicture: null, pictureChoice: "initial" });
    expect(choice(/My Google picture/).disabled).toBe(true);
    expect(screen.getByText(/Your Google account has no picture/)).toBeTruthy();
  });

  // E69: nothing uploaded yet.
  it("needs an upload before 'my own picture' can be chosen", () => {
    renderForm({ ownPicture: null });
    expect(choice(/My own picture/).disabled).toBe(true);
    expect(
      screen.getByRole("button", { name: "Upload a picture" }),
    ).toBeTruthy();
  });

  it("offers to replace or remove an uploaded picture", () => {
    renderForm({ ownPicture: OWN, pictureChoice: "upload" });
    expect(choice(/My own picture/).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Replace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  it("opens the cropper to upload", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Upload a picture" }));
    expect(screen.getByLabelText("Choose a photo")).toBeTruthy();
  });

  it("removes the uploaded picture through the server", async () => {
    renderForm({ ownPicture: OWN, pictureChoice: "upload" });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Remove" })),
    );
    expect(removePicture).toHaveBeenCalled();
  });

  it("still has the display name field", () => {
    renderForm({ initialName: "Cam" });
    expect(
      (screen.getByLabelText("Display name") as HTMLInputElement).value,
    ).toBe("Cam");
  });
});
