// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DisplayNameForm } from "@/components/profile/DisplayNameForm";

// The real action runs on the server; the form only needs something to
// hand to <form action>.
vi.mock("@/app/(app)/actions/profile", () => ({
  saveDisplayName: vi.fn(async () => ({})),
}));

afterEach(cleanup);

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";

function renderForm(
  props: Partial<Parameters<typeof DisplayNameForm>[0]> = {},
) {
  return render(
    <DisplayNameForm
      initialName="Cam"
      submitLabel="Save"
      showPicture={true}
      pictureUrl={GOOGLE}
      {...props}
    />,
  );
}

const checkbox = () =>
  screen.getByRole("checkbox", {
    name: /Show my Google picture to friends/,
  }) as HTMLInputElement;
const preview = () => screen.getByTestId("avatar");

describe("DisplayNameForm: the picture choice (R63)", () => {
  it("offers the choice, ticked when the picture is switched on", () => {
    renderForm({ showPicture: true });

    expect(checkbox().checked).toBe(true);
  });

  it("shows the stored choice when the picture is switched off", () => {
    renderForm({ showPicture: false });

    expect(checkbox().checked).toBe(false);
  });

  // The action reads the field by this name; an unticked box sends nothing.
  it("sends the choice as show_picture", () => {
    renderForm();

    expect(checkbox().name).toBe("show_picture");
  });

  it("shows the member what friends will see: their Google picture", () => {
    renderForm({ showPicture: true });

    expect(preview().querySelector("img")?.getAttribute("src")).toBe(GOOGLE);
  });

  it("shows their initial instead as soon as the box is unticked", () => {
    renderForm({ showPicture: true });

    fireEvent.click(checkbox());

    expect(checkbox().checked).toBe(false);
    expect(preview().querySelector("img")).toBeNull();
    expect(preview().textContent).toBe("C");
  });

  it("shows the picture again when the box is ticked again", () => {
    renderForm({ showPicture: false });
    expect(preview().textContent).toBe("C");

    fireEvent.click(checkbox());

    expect(preview().querySelector("img")?.getAttribute("src")).toBe(GOOGLE);
  });

  // E27
  it("says so when the Google account has no picture", () => {
    renderForm({ pictureUrl: null });

    expect(preview().textContent).toBe("C");
    expect(screen.getByText(/Your Google account has no picture/)).toBeTruthy();
    // The choice is still offered: it applies if they add one later.
    expect(checkbox().checked).toBe(true);
  });

  it("explains what friends see when it is off", () => {
    renderForm();

    expect(screen.getByText(/first letter of your name/)).toBeTruthy();
  });

  it("still has the display name field", () => {
    renderForm({ initialName: "Cam" });

    expect(
      (screen.getByLabelText("Display name") as HTMLInputElement).value,
    ).toBe("Cam");
  });
});
