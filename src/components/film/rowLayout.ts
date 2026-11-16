/**
 * Shared classes for a film row with buttons ("Update scores", "Film
 * page"), used by the film list and the chart's point panel (R65).
 *
 * The idea: on a phone a film's details (title, year, scores, placement)
 * are shorter than its poster, so there is empty space under the details,
 * to the right of the poster. The buttons go there instead of on a line of
 * their own under the whole row.
 *
 *  - FILM_LINK and FILM_DETAILS: the film's link and the details column
 *    inside it. The details keep 40px of padding at the bottom (pb-10):
 *    the space the buttons will sit in. Details are always at least four
 *    lines, so with the padding they are taller than the poster, and the
 *    space is always below the details, never beside the poster's middle.
 *  - ROW_BUTTONS: the buttons, which come AFTER the link in the page (a
 *    button inside a link would also follow the link). -mt-11 pulls them up
 *    into that space; ml-[6.25rem] lines them up with the details (8px link
 *    padding + 80px poster + 12px gap = 100px = 6.25rem). They stay in the
 *    normal flow, so on a very narrow screen a second line of buttons
 *    pushes the row down instead of covering anything. "relative" keeps
 *    them painted above the link's hover background, so taps reach them.
 *  - While the score editor is open it needs the whole width for its
 *    sliders. "has-[[data-editor-open]]:" applies a class only while
 *    something inside carries that mark (InlineRatingEditor sets it when
 *    open); the margins are then dropped and the editor sits full width
 *    under the film. Pure CSS: nothing has to tell the row it opened.
 */
// hover:bg-well: inside a white (or dark grey) card the row darkens to
// the theme's "well" colour on hover; a press dims it at once (NFR23).
export const FILM_LINK =
  "flex items-start gap-3 rounded-xl p-2 hover:bg-well active:brightness-95 dark:active:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export const FILM_DETAILS = "flex min-w-0 flex-col gap-0.5 pb-10";

export const ROW_BUTTONS =
  "relative -mt-11 ml-[6.25rem] mb-1 flex flex-wrap items-center gap-1.5 has-[[data-editor-open]]:mx-2 has-[[data-editor-open]]:mt-1 has-[[data-editor-open]]:flex-col has-[[data-editor-open]]:items-stretch";
