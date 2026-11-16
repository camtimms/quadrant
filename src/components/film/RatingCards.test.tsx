// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatingCards, type MemberRating } from "@/components/film/RatingCards";
import { PLACEMENT_LABELS } from "@/lib/quadrant";

// The like button inside a card talks to the server; these tests only
// check where it appears (its behaviour is in LikeButton.test.tsx).
vi.mock("@/app/(app)/actions/like", () => ({ setReviewLike: vi.fn() }));

afterEach(cleanup);

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";

function rating(
  displayName: string,
  quality: number,
  enjoyment: number,
  extra: Partial<MemberRating> = {},
): MemberRating {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    review: null,
    isViewer: false,
    ...extra,
  };
}

const cards = () => screen.getAllByTestId("rating-card");

/** The card belonging to the member with this name. */
function cardOf(name: string): HTMLElement {
  const card = cards().find((candidate) =>
    within(candidate).getByTestId("card-name").textContent?.startsWith(name),
  );
  if (!card) throw new Error(`No card for ${name}.`);
  return card;
}

describe("RatingCards (R60, R37)", () => {
  it("shows one card per member, in the order it is given", () => {
    render(
      <RatingCards
        ratings={[rating("Zoe", 1, 1), rating("Al", 2, 2), rating("Bob", 3, 3)]}
      />,
    );

    expect(
      cards().map((card) => within(card).getByTestId("card-name").textContent),
    ).toEqual(["Zoe", "Al", "Bob"]);
  });

  // "One list, not pages" (R60): a real list, so a screen reader can say
  // how many ratings there are.
  it("is a single list with one item per card", () => {
    render(<RatingCards ratings={[rating("Zoe", 1, 1), rating("Al", 2, 2)]} />);

    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows both scores, each with its label", () => {
    render(<RatingCards ratings={[rating("Bob", 3, 9)]} />);

    const scores = within(cardOf("Bob")).getByTestId("card-scores");
    expect(scores.textContent).toBe("Quality 3 · Enjoyment 9");
  });

  // E14: 0 is a real score and must not be shown as blank.
  it("shows a score of 0 as 0", () => {
    render(<RatingCards ratings={[rating("Bob", 0, 0)]} />);

    expect(within(cardOf("Bob")).getByTestId("card-scores").textContent).toBe(
      "Quality 0 · Enjoyment 0",
    );
  });

  it("shows the placement worked out from the scores", () => {
    render(
      <RatingCards
        ratings={[rating("Bob", 3, 9), rating("Zoe", 9, 9), rating("Al", 8, 5)]}
      />,
    );

    const placement = (name: string) =>
      within(cardOf(name)).getByTestId("card-placement").textContent;
    expect(placement("Bob")).toBe(PLACEMENT_LABELS["cheap-thrills"]);
    expect(placement("Zoe")).toBe(PLACEMENT_LABELS.masterpieces);
    // A score of exactly 5 puts the film on a line.
    expect(placement("Al")).toBe(PLACEMENT_LABELS.good);
  });

  // "Prominent" cannot be measured in a test browser, which has no screen.
  // This pins the two things that make it so: larger and bolder than the
  // card's other text.
  it("makes the placement label the most prominent text on the card", () => {
    render(<RatingCards ratings={[rating("Bob", 3, 9)]} />);

    const classes = within(cardOf("Bob")).getByTestId(
      "card-placement",
    ).className;
    expect(classes).toContain("text-xl");
    expect(classes).toContain("font-semibold");
  });

  describe("the picture (R61)", () => {
    it("shows the member's picture when there is one", () => {
      render(
        <RatingCards ratings={[rating("Bob", 3, 9, { avatarUrl: GOOGLE })]} />,
      );

      const avatar = within(cardOf("Bob")).getByTestId("avatar");
      expect(avatar.querySelector("img")?.getAttribute("src")).toBe(GOOGLE);
    });

    // E27, and a member who switched their picture off (R63).
    it("shows the member's initial when there is none", () => {
      render(<RatingCards ratings={[rating("bob", 3, 9)]} />);

      const avatar = within(cardOf("bob")).getByTestId("avatar");
      expect(avatar.querySelector("img")).toBeNull();
      expect(avatar.textContent).toBe("B");
    });
  });

  describe("the name", () => {
    it("marks the viewer's own card", () => {
      render(
        <RatingCards
          ratings={[
            rating("Cam", 5, 5, { isViewer: true }),
            rating("Bob", 3, 9),
          ]}
        />,
      );

      expect(cardOf("Cam").textContent).toContain("(you)");
      expect(cardOf("Bob").textContent).not.toContain("(you)");
    });

    // R46: a friend's name leads to their films.
    it("links a friend's name to their films, but not the viewer's own", () => {
      render(
        <RatingCards
          ratings={[
            rating("Cam", 5, 5, { isViewer: true }),
            rating("Bob", 3, 9),
          ]}
        />,
      );

      expect(
        within(cardOf("Bob"))
          .getByRole("link", { name: "Bob" })
          .getAttribute("href"),
      ).toBe("/members/id-Bob");
      expect(within(cardOf("Cam")).queryByRole("link")).toBeNull();
    });
  });

  describe("the review", () => {
    it("shows a review in full on its writer's card", () => {
      // 500 characters is the longest a review can be (R17).
      const long = "word ".repeat(100).trim();
      render(
        <RatingCards
          ratings={[
            rating("Bob", 3, 9, { review: "So bad it's good." }),
            rating("Zoe", 9, 9, { review: long }),
          ]}
        />,
      );

      expect(within(cardOf("Bob")).getByTestId("review").textContent).toBe(
        "So bad it's good.",
      );
      expect(within(cardOf("Zoe")).getByTestId("review").textContent).toBe(
        long,
      );
    });

    it("keeps the member's line breaks", () => {
      render(
        <RatingCards
          ratings={[rating("Bob", 3, 9, { review: "First line.\nSecond." })]}
        />,
      );

      const review = within(cardOf("Bob")).getByTestId("review");
      // The text still holds the line break, and this class is what tells
      // the browser to show it instead of folding it into a space.
      expect(review.textContent).toBe("First line.\nSecond.");
      expect(review.className).toContain("whitespace-pre-line");
    });

    // A review is text a member typed. It must come out as text.
    it("shows a review containing HTML as plain text", () => {
      render(
        <RatingCards
          ratings={[rating("Bob", 3, 9, { review: "<b>bold</b> claim" })]}
        />,
      );

      const review = within(cardOf("Bob")).getByTestId("review");
      expect(review.textContent).toBe("<b>bold</b> claim");
      expect(review.querySelector("b")).toBeNull();
    });

    it("has no review text on the card of a member who wrote none", () => {
      render(
        <RatingCards
          ratings={[
            rating("Bob", 3, 9, { review: "So bad it's good." }),
            rating("Zoe", 9, 9),
          ]}
        />,
      );

      expect(within(cardOf("Zoe")).queryByTestId("review")).toBeNull();
      expect(screen.getAllByTestId("review")).toHaveLength(1);
    });
  });

  it("says so when nobody has rated the film", () => {
    render(<RatingCards ratings={[]} />);

    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText(/Nobody has rated this film yet/)).toBeTruthy();
  });
});

// R69 (design 20.3): a like button on every card with a written review.
describe("RatingCards likes", () => {
  const VIEWER = { userId: "id-Cam", displayName: "Cam" };
  const likeButtons = () =>
    screen.queryAllByRole("button", { name: /like .*review/i });

  it("puts a like button on a card with a review", () => {
    render(
      <RatingCards
        viewer={VIEWER}
        ratings={[
          rating("Sam", 7, 3, { review: "Tense.", ratingId: 41, likes: [] }),
        ]}
      />,
    );
    expect(likeButtons().map((b) => b.getAttribute("aria-label"))).toEqual([
      "Like Sam's review",
    ]);
  });

  it("puts none on a card without a review", () => {
    render(
      <RatingCards
        viewer={VIEWER}
        ratings={[rating("Sam", 7, 3, { ratingId: 41, likes: [] })]}
      />,
    );
    expect(likeButtons()).toHaveLength(0);
  });

  // R71: the viewer's own review can be liked too.
  it("puts one on the viewer's own reviewed card", () => {
    render(
      <RatingCards
        viewer={VIEWER}
        ratings={[
          rating("Cam", 9, 9, {
            isViewer: true,
            userId: "id-Cam",
            review: "Mine.",
            ratingId: 7,
            likes: [],
          }),
        ]}
      />,
    );
    expect(likeButtons()[0].getAttribute("aria-label")).toBe(
      "Like your review",
    );
  });

  it("shows who liked a review", () => {
    render(
      <RatingCards
        viewer={VIEWER}
        ratings={[
          rating("Sam", 7, 3, {
            review: "Tense.",
            ratingId: 41,
            likes: [{ userId: "id-Zoe", displayName: "Zoe" }],
          }),
        ]}
      />,
    );
    expect(screen.getByText("Liked by Zoe")).toBeTruthy();
  });

  // Elsewhere (no viewer or no rating id given) cards stay as they were.
  it("puts none on cards given without a viewer", () => {
    render(
      <RatingCards
        ratings={[
          rating("Sam", 7, 3, { review: "Tense.", ratingId: 41, likes: [] }),
        ]}
      />,
    );
    expect(likeButtons()).toHaveLength(0);
  });
});

describe("RatingCards: times watched (R84)", () => {
  it("says how many times a member has watched the film", () => {
    render(
      <RatingCards
        ratings={[
          rating("Bob", 3, 9, { timesWatched: 3 }),
          rating("Zoe", 5, 5, { timesWatched: 2 }),
          rating("Al", 5, 5, { timesWatched: 1 }),
        ]}
      />,
    );
    expect(cardOf("Bob").textContent).toContain("Watched 3 times");
    expect(cardOf("Zoe").textContent).toContain("Watched twice");
    expect(cardOf("Al").textContent).not.toContain("Watched");
  });
});
