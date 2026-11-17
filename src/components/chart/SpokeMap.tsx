import { Fragment } from "react";
import { friendColourClasses } from "@/components/chart/friendColours";
import {
  chartName,
  placeLabels,
  REFERENCE_SIZE,
  type LabelRequest,
  type Marker,
} from "@/components/chart/labelPlacement";
import { ChartFrame } from "@/components/chart/QuadrantChart";
import {
  CHART_SIZE,
  chartX,
  chartY,
  toPercent,
} from "@/components/chart/scale";
import type { MemberRating } from "@/components/film/RatingCards";
import {
  clusterPoints,
  groupAverage,
  memberColours,
  spokesFrom,
} from "@/lib/quadrant";

type Props = {
  /** Every member's current rating of the film, the viewer's included. */
  ratings: readonly MemberRating[];
};

/** The id the group average's label is placed under. */
const AVERAGE_ID = "average";

/**
 * A name's pill. Its height (18 px) and padding (6 px each side) are what
 * labelPlacement.ts assumes when it works out where names fit; whitespace-
 * nowrap keeps the text on one line, as the estimate does.
 */
const LABEL =
  "absolute h-[18px] rounded-full px-1.5 text-xs leading-[18px] font-medium whitespace-nowrap";

/** Centres a marker on the position given by its left and top. */
const CENTRED = "absolute -translate-x-1/2 -translate-y-1/2";

/**
 * The three kinds of marker. They differ in SHAPE and FILL, not in colour,
 * so they can be told apart in black and white (NFR14):
 *
 *   viewer   a solid dot with a ring round it: the hub
 *   friend   an outlined dot
 *   average  an outlined square turned on its corner (a diamond)
 *
 * The same class names draw the small copies in the key under the chart, so
 * the key cannot drift from what it explains.
 */
const SHAPES = {
  viewer:
    "rounded-full bg-accent text-on-accent ring-2 ring-ink ring-offset-2 ring-offset-card",
  friend: "rounded-full border-2 border-ink bg-card text-ink",
  average: "rotate-45 border-2 border-ink bg-card",
} as const;

/**
 * A friend's marker on the map, without its outline colour: that is the
 * friend's own (R67), or ink for a marker shared by several friends.
 */
const FRIEND_MARKER = "rounded-full border-2 bg-card text-ink";

/**
 * The spoke map on a film's page: where every member put this one film, and
 * how far each friend is from the viewer (R38–R40).
 *
 * It is the same frame as the chart on My films with different things on
 * top. There, each point is a film; here, each point is a PERSON, and all
 * the points are the same film. Lines (spokes) run from the viewer's own
 * point, the hub, to each friend's. The longer the line, the more the two of
 * them disagree: its length is exactly the number in the disagreement table.
 *
 * Unlike the films chart, nothing here can be selected, so there is no
 * state and no "use client": the names are written beside the points, and
 * the tables under the chart hold every number (NFR13).
 */
export function SpokeMap({ ratings }: Props) {
  // R38: there is only a map once somebody has rated the film.
  if (ratings.length === 0) return null;

  // Members who gave identical scores would be drawn exactly on top of each
  // other, so they share one marker with a count, as films do on My films
  // (R31). A distance of 0 merges only identical whole-number scores.
  const places = clusterPoints(ratings, 0);

  // R67: a colour of their own for each friend, the same one from film to
  // film where possible (design 17.7). The viewer stays yellow.
  const viewerId = ratings.find((rating) => rating.isViewer)?.userId ?? "";
  const colours = memberColours(
    viewerId,
    ratings.filter((rating) => !rating.isViewer).map((r) => r.userId),
  );
  const colourOf = (userId: string) =>
    friendColourClasses(colours.get(userId) ?? 1);
  type Place = (typeof places)[number];
  const isHub = (place: Place) => place.items.some((rating) => rating.isViewer);
  const hub = places.find(isHub);

  // One spoke to each OTHER place. A friend who agrees exactly is on the hub
  // itself, a spoke of length 0, so there is no line to draw for them (E13).
  // With no rating from the viewer there is no hub and so no spokes (R40).
  const spokes = hub
    ? spokesFrom(
        hub.point,
        places.filter((place) => !isHub(place)),
      )
    : [];

  // With one rating the average IS that rating (R45). A second marker on the
  // same spot would only cover the first, so it is left out (E11).
  const average =
    ratings.length > 1 ? groupAverage(ratings.map((r) => r.point)) : null;

  // ---- Where every name goes (R66, design 17.6) ----------------------
  // placeLabels works in pixels on the narrowest chart; these turn the
  // chart's own units into those pixels.
  const toPixels = (units: number) => (units / CHART_SIZE) * REFERENCE_SIZE;
  const pixelPoint = (quality: number, enjoyment: number) => ({
    x: toPixels(chartX(quality)),
    y: toPixels(chartY(enjoyment)),
  });
  // How far each marker reaches from its centre, in pixels: half its size,
  // plus the viewer's ring (2 px wide, 2 px from the dot).
  const markerOf = (place: Place): Marker => {
    const half = place.items.length > 1 ? 12 : 8;
    return {
      ...pixelPoint(place.point.quality, place.point.enjoyment),
      radius: isHub(place) ? half + 4 : half,
    };
  };
  // The diamond is a 20 px square turned on its corner: about 14 px out.
  const averageMarker: Marker | null = average
    ? { ...pixelPoint(average.quality, average.enjoyment), radius: 14 }
    : null;
  const markers = [
    ...places.map(markerOf),
    ...(averageMarker ? [averageMarker] : []),
  ];

  /** What a place's label says: "You", or names cut to 16 characters. */
  const namesAt = (place: Place) =>
    place.items.map((rating) =>
      rating.isViewer ? "You" : chartName(rating.displayName),
    );

  // The most important names choose first: "You", then friends from the
  // furthest away (the longest spokes are what the map is about), then
  // anyone else, then "Average".
  const furthestFirst = [...spokes]
    .sort((a, b) => b.disagreement - a.disagreement)
    .map(({ item }) => item);
  const ordered = [
    ...(hub ? [hub] : []),
    ...furthestFirst,
    ...places.filter(
      (place) => !isHub(place) && !furthestFirst.includes(place),
    ),
  ];
  const requests: LabelRequest[] = ordered.map((place) => ({
    id: place.items[0].userId,
    text: namesAt(place).join(", "),
    point: markerOf(place),
  }));
  if (averageMarker) {
    requests.push({ id: AVERAGE_ID, text: "Average", point: averageMarker });
  }
  const placement = new Map(
    placeLabels(requests, markers).map((label) => [label.id, label]),
  );

  const description =
    (ratings.length === 1
      ? "Chart of 1 member's rating of this film."
      : `Chart of ${ratings.length} members' ratings of this film and the group average.`) +
    " The tables below give the same numbers.";

  return (
    <figure className="flex flex-col gap-3">
      {/* role="img" makes a screen reader treat the whole chart as one
          picture and read the description, instead of stepping through a
          scatter of names with no positions. The tables carry the detail. */}
      <div
        role="img"
        aria-label={description}
        className="relative mx-auto aspect-square w-full max-w-xl rounded-2xl bg-card"
      >
        <ChartFrame />

        {/* The spokes: a second drawing on the same 120-unit grid as the
            frame, so chartX and chartY place the line ends exactly where
            the markers are. */}
        <svg
          viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          {hub
            ? spokes.map(({ item: place, isLargest }) => (
                <line
                  key={place.items[0].userId}
                  // The longest spoke is drawn heavier: thickness, not
                  // colour, picks it out (NFR14).
                  data-spoke={isLargest ? "largest" : "other"}
                  x1={chartX(hub.point.quality)}
                  y1={chartY(hub.point.enjoyment)}
                  x2={chartX(place.point.quality)}
                  y2={chartY(place.point.enjoyment)}
                  className={"stroke-spoke"}
                  strokeWidth={isLargest ? 0.9 : 0.5}
                  strokeLinecap="round"
                />
              ))
            : null}
        </svg>

        {/* Joining lines, from a point to a name that had to move further
            out to find room (R66). Drawn in pixels of the reference chart,
            the units placeLabels works in. */}
        <svg
          viewBox={`0 0 ${REFERENCE_SIZE} ${REFERENCE_SIZE}`}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          {[...placement.values()].map((label) =>
            label.leader ? (
              <line
                key={label.id}
                data-leader
                {...label.leader}
                className="stroke-ink-muted"
                strokeWidth={1}
              />
            ) : null,
          )}
        </svg>

        {/* The group average, drawn first so it sits UNDER the members'
            points. It is slightly larger and hollow, so a member's dot at
            the same spot shows inside it instead of being hidden. */}
        {average ? (
          <div
            data-point="average"
            data-shape="diamond"
            style={{
              left: toPercent(chartX(average.quality)),
              top: toPercent(chartY(average.enjoyment)),
            }}
            className={`${CENTRED} h-5 w-5 ${SHAPES.average}`}
          />
        ) : null}

        {places.map((place) => {
          const count = place.items.length;
          const kind = isHub(place) ? "viewer" : "friend";
          const position = {
            left: toPercent(chartX(place.point.quality)),
            top: toPercent(chartY(place.point.enjoyment)),
          };
          // A friend alone at their spot is drawn in their own colour. A
          // marker shared by several cannot be in all their colours, so it
          // is drawn in ink, and each NAME keeps its colour (R31, R67).
          const onlyFriend =
            kind === "friend" && count === 1 ? place.items[0] : null;
          const markerClasses =
            kind === "viewer"
              ? SHAPES.viewer
              : `${FRIEND_MARKER} ${onlyFriend ? colourOf(onlyFriend.userId).border : "border-ink"}`;
          return (
            // A Fragment groups two elements without adding one to the page.
            // It is written out in full (not as <>) so it can take the key,
            // because it is what the list repeats.
            <Fragment key={place.items[0].userId}>
              <div
                data-point={kind}
                data-shape="circle"
                data-member={onlyFriend?.userId}
                style={position}
                className={`${CENTRED} flex items-center justify-center text-xs leading-none font-semibold ${
                  count > 1 ? "h-6 w-6" : "h-4 w-4"
                } ${markerClasses}`}
              >
                {count > 1 ? count : null}
              </div>
            </Fragment>
          );
        })}

        {/* Every name, drawn LAST so it sits above every line and point
            (R66), each on a solid pill. Drawn in chart order; placed in
            order of importance (above). */}
        {places.map((place) => {
          const label = placement.get(place.items[0].userId)!;
          const youAlone = place.items.length === 1 && isHub(place);
          return (
            <span
              key={place.items[0].userId}
              data-point-label
              style={{ left: label.left, top: label.top }}
              className={`${LABEL} ${
                youAlone
                  ? "bg-accent font-semibold text-on-accent ring-1 ring-accent-outline"
                  : "bg-card text-ink"
              }`}
            >
              {/* The viewer is "You"; everyone sharing the spot is named,
                  so no rating is hidden behind another (R31). */}
              {place.items.map((rating, index) => (
                <Fragment key={rating.userId}>
                  {index > 0 ? ", " : null}
                  <span
                    data-name-of={rating.userId}
                    className={
                      rating.isViewer
                        ? "font-semibold"
                        : colourOf(rating.userId).text
                    }
                  >
                    {rating.isViewer ? "You" : chartName(rating.displayName)}
                  </span>
                </Fragment>
              ))}
            </span>
          );
        })}
        {average ? (
          <span
            data-average-label
            style={{
              left: placement.get(AVERAGE_ID)!.left,
              top: placement.get(AVERAGE_ID)!.top,
            }}
            className={`${LABEL} bg-card text-ink`}
          >
            Average
          </span>
        ) : null}
      </div>

      {/* The key: what each shape means, in words (NFR14). */}
      <figcaption className="flex flex-col gap-2 text-sm">
        <ul
          data-testid="spoke-map-key"
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          {hub ? <KeyItem shape="viewer">You</KeyItem> : null}
          {places.some((place) => !isHub(place)) ? (
            <KeyItem shape="friend">A friend</KeyItem>
          ) : null}
          {average ? <KeyItem shape="average">Group average</KeyItem> : null}
        </ul>
        {hub ? (
          spokes.length > 0 ? (
            <p className="text-ink-muted">
              Each line runs from your rating to a friend&apos;s. The longer the
              line, the more you disagree.
            </p>
          ) : null
        ) : (
          // R40: no spokes without a rating of the viewer's own to draw
          // them from. The rating form is further up this page.
          <p>
            Rate this film to see how far your rating is from each
            friend&apos;s.
          </p>
        )}
      </figcaption>
    </figure>
  );
}

/** One entry in the key: a small copy of the marker, then what it means. */
function KeyItem({
  shape,
  children,
}: {
  shape: keyof typeof SHAPES;
  children: string;
}) {
  return (
    // gap-3, not gap-2: the hub's ring and the diamond's corners reach a
    // little outside their own box.
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-3 shrink-0 ${SHAPES[shape]}`}
      />
      {children}
    </li>
  );
}
