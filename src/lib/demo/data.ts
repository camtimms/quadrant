// Example data for showing the app off (task T43): six made-up members
// with ratings that overlap on some films and not others, so every page
// has something to show: all the placements, disagreements, spread curves
// (five or more ratings of a film), likes, rewatches and a busy feed.
//
// Added and removed by scripts/demo.ts. Nothing in the app reads this file.
// The members cannot sign in: their addresses are on the reserved
// ".invalid" domain, which no email or Google account can ever have, and
// they have no password.

/** Every demo member's address looks like demo-priya@quadrant.invalid. */
export const DEMO_EMAIL_DOMAIN = "quadrant.invalid";

export function demoEmail(slug: string): string {
  return `demo-${slug}@${DEMO_EMAIL_DOMAIN}`;
}

/** True only for addresses demoEmail makes: how removal finds them. */
export function isDemoEmail(email: string | undefined): boolean {
  return (
    typeof email === "string" && /^demo-[a-z]+@quadrant\.invalid$/.test(email)
  );
}

export type DemoMember = { slug: string; name: string };

export const DEMO_MEMBERS: readonly DemoMember[] = [
  { slug: "priya", name: "Priya" },
  { slug: "marcus", name: "Marcus" },
  { slug: "ellie", name: "Ellie" },
  { slug: "tom", name: "Tom" },
  { slug: "jess", name: "Jess" },
  { slug: "dan", name: "Dan" },
];

/**
 * Films by TMDB id, with the title TMDB should give back. The script
 * fetches each one from TMDB (never trusting this list for details) and
 * skips any whose title does not match, so a wrong id cannot slip in a
 * different film.
 */
export const DEMO_FILMS = {
  godfather: { tmdbId: 238, title: "The Godfather" },
  shawshank: { tmdbId: 278, title: "The Shawshank Redemption" },
  pulpFiction: { tmdbId: 680, title: "Pulp Fiction" },
  inception: { tmdbId: 27205, title: "Inception" },
  titanic: { tmdbId: 597, title: "Titanic" },
  shrek: { tmdbId: 808, title: "Shrek" },
  barbie: { tmdbId: 346698, title: "Barbie" },
  oppenheimer: { tmdbId: 872585, title: "Oppenheimer" },
  commando: { tmdbId: 10999, title: "Commando" },
  theRoom: { tmdbId: 17473, title: "The Room" },
  cats: { tmdbId: 536869, title: "Cats" },
  paddington2: { tmdbId: 346648, title: "Paddington 2" },
  madMax: { tmdbId: 76341, title: "Mad Max: Fury Road" },
  laLaLand: { tmdbId: 313369, title: "La La Land" },
  dieHard: { tmdbId: 562, title: "Die Hard" },
  loveActually: { tmdbId: 508, title: "Love Actually" },
  twilight: { tmdbId: 8966, title: "Twilight" },
  sharknado: { tmdbId: 205321, title: "Sharknado" },
  batmanRobin: { tmdbId: 415, title: "Batman & Robin" },
  eeaao: { tmdbId: 545611, title: "Everything Everywhere All at Once" },
  spiritedAway: { tmdbId: 129, title: "Spirited Away" },
  alien: { tmdbId: 348, title: "Alien" },
  mammaMia: { tmdbId: 11631, title: "Mamma Mia!" },
  interstellar: { tmdbId: 157336, title: "Interstellar" },
  parasite: { tmdbId: 496243, title: "Parasite" },
  backToTheFuture: { tmdbId: 105, title: "Back to the Future" },
} as const;

export type DemoFilm = keyof typeof DEMO_FILMS;

/** One viewing: scores, an optional review, and how many days ago. */
export type DemoViewing = {
  quality: number;
  enjoyment: number;
  review?: string;
  daysAgo: number;
};

export type DemoRating = DemoViewing & {
  member: string;
  film: DemoFilm;
  /** Earlier viewings, oldest first: makes this rating a rewatch (R83). */
  earlier?: readonly DemoViewing[];
};

// Shorthand to keep the table below readable: who, what, Q, E, days ago,
// and an optional review.
const r = (
  member: string,
  film: DemoFilm,
  quality: number,
  enjoyment: number,
  daysAgo: number,
  review?: string,
  earlier?: readonly DemoViewing[],
): DemoRating => ({
  member,
  film,
  quality,
  enjoyment,
  daysAgo,
  review,
  earlier,
});

export const DEMO_RATINGS: readonly DemoRating[] = [
  // Inception: everyone has seen it (six ratings: spread curves). Priya's
  // is a rewatch.
  r(
    "priya",
    "inception",
    9,
    9,
    3,
    "Even better knowing where it goes. The hallway fight still holds up.",
    [
      {
        quality: 7,
        enjoyment: 8,
        daysAgo: 58,
        review: "Clever, if a little in love with its own rules.",
      },
    ],
  ),
  r("marcus", "inception", 8, 9, 40, "Spinning top. Still arguing about it."),
  r("ellie", "inception", 7, 5, 37),
  r(
    "tom",
    "inception",
    6,
    4,
    33,
    "A heist film that explains itself for two hours.",
  ),
  r("jess", "inception", 9, 8, 29),
  r("dan", "inception", 8, 8, 21, "Bwaaam."),

  // Titanic: six ratings, and a big split.
  r("priya", "titanic", 8, 7, 52),
  r("marcus", "titanic", 4, 2, 50, "Three hours. There was room on the door."),
  r("ellie", "titanic", 9, 10, 48, "Cried at the string quartet. Every time."),
  r("tom", "titanic", 7, 4, 46),
  r("jess", "titanic", 6, 6, 45),
  r("dan", "titanic", 7, 8, 12),

  // Shrek: six ratings, everyone had fun.
  r("priya", "shrek", 7, 9, 20),
  r("marcus", "shrek", 7, 10, 19, "Peak 2001."),
  r("ellie", "shrek", 6, 9, 18),
  r("tom", "shrek", 8, 8, 16, "Better written than it has any right to be."),
  r("jess", "shrek", 6, 8, 9),
  r(
    "dan",
    "shrek",
    7,
    10,
    2,
    "Watched with the kids. Laughed more than they did.",
  ),

  // Barbie: five ratings.
  r("priya", "barbie", 8, 8, 30),
  r("ellie", "barbie", 9, 10, 31, "The monologue! The costumes! I'm Kenough."),
  r("tom", "barbie", 5, 3, 28, "Funny for an hour, then a lecture."),
  r("jess", "barbie", 7, 8, 27),
  r("dan", "barbie", 7, 9, 26),

  // Paddington 2: five ratings, near-universal love.
  r(
    "priya",
    "paddington2",
    9,
    10,
    14,
    "Flawless. Hugh Grant deserved an award.",
  ),
  r("marcus", "paddington2", 8, 9, 13),
  r("ellie", "paddington2", 9, 10, 11),
  r("jess", "paddington2", 8, 9, 7),
  r("dan", "paddington2", 9, 9, 5, "Marmalade sandwiches for tea afterwards."),

  // Oppenheimer: well made, not exactly fun for everyone.
  r(
    "priya",
    "oppenheimer",
    10,
    7,
    25,
    "Staggering. Not a film I'll put on for fun.",
  ),
  r("marcus", "oppenheimer", 8, 4, 24),
  r("tom", "oppenheimer", 9, 6, 22),
  r("jess", "oppenheimer", 8, 5, 23),

  // Guilty pleasures.
  r("marcus", "commando", 3, 10, 6, "Let off some steam, Bennett.", [
    { quality: 4, enjoyment: 8, daysAgo: 300, review: "Dumb. Loved it." },
    { quality: 4, enjoyment: 9, daysAgo: 120 },
  ]),
  r("dan", "commando", 2, 8, 39),
  r("jess", "commando", 3, 7, 41),
  r("marcus", "sharknado", 1, 8, 35, "Exactly what the title promises."),
  r("dan", "sharknado", 1, 6, 34),
  r("tom", "sharknado", 0, 2, 32, "No."),
  r("marcus", "batmanRobin", 2, 7, 44),
  r("tom", "batmanRobin", 1, 1, 43, "Ice to see you. Never again."),
  r("ellie", "twilight", 3, 8, 54, "Team Edward, no regrets."),
  r("jess", "twilight", 2, 3, 53),
  r("ellie", "mammaMia", 6, 10, 4, "Sang every word, again.", [
    { quality: 5, enjoyment: 8, daysAgo: 200 },
  ]),
  r("priya", "mammaMia", 5, 7, 47),

  // So bad: two famous ones.
  r(
    "tom",
    "theRoom",
    0,
    7,
    10,
    "You're tearing me apart, Lisa! Best worst film ever made.",
  ),
  r("marcus", "theRoom", 1, 9, 8),
  r("priya", "theRoom", 1, 3, 17),
  r("jess", "cats", 2, 1, 15, "I have seen things."),
  r("ellie", "cats", 3, 4, 16),

  // Classics: high quality, mixed enjoyment.
  r("priya", "godfather", 10, 8, 60),
  r("tom", "godfather", 10, 9, 59, "An offer I can't refuse to rewatch."),
  r("marcus", "godfather", 9, 5, 57),
  r("tom", "shawshank", 9, 9, 55),
  r("dan", "shawshank", 9, 10, 36, "Get busy living."),
  r("tom", "pulpFiction", 9, 9, 42, "Every scene is quotable."),
  r("ellie", "pulpFiction", 6, 3, 41, "Too much talking about burgers."),
  r("jess", "parasite", 10, 9, 38, "The peach scene. Wow."),
  r("priya", "parasite", 10, 10, 37),
  r("jess", "alien", 9, 8, 6, "Still the scariest dinner scene in film."),
  r("tom", "spiritedAway", 9, 9, 18),
  r("priya", "spiritedAway", 10, 9, 15, "No-Face deserves his own film."),
  r("dan", "backToTheFuture", 8, 10, 1, "Great Scott!"),
  r("jess", "interstellar", 8, 7, 12),

  // Big disagreements.
  r("ellie", "laLaLand", 9, 10, 9, "That ending wrecked me in the best way."),
  r("tom", "laLaLand", 8, 6, 30, "Grew on me the second time.", [
    {
      quality: 6,
      enjoyment: 4,
      daysAgo: 180,
      review: "Jazz bros explaining jazz.",
    },
  ]),
  r("marcus", "laLaLand", 5, 2, 29),
  r("marcus", "madMax", 9, 10, 26, "Two hours of chase and not a dull minute."),
  r("ellie", "madMax", 6, 3, 25),
  r("dan", "dieHard", 8, 9, 14, "It is a Christmas film."),
  r("ellie", "dieHard", 6, 6, 13, "It is not a Christmas film."),
  r("ellie", "loveActually", 7, 9, 12),
  r("tom", "loveActually", 3, 2, 11, "Half these stories are creepy."),
  r("jess", "eeaao", 9, 10, 20, "Hot dog fingers. Everything bagel. Perfect."),
  r("dan", "eeaao", 7, 4, 19, "I think I was too tired for this."),
];

/**
 * Likes, as [who likes, whose review, which film]. Only on demo members'
 * reviews: the demo never puts words or likes in real members' mouths.
 */
export const DEMO_LIKES: readonly (readonly [string, string, DemoFilm])[] = [
  ["marcus", "priya", "inception"],
  ["jess", "priya", "inception"],
  ["dan", "priya", "inception"],
  ["ellie", "marcus", "titanic"],
  ["tom", "marcus", "titanic"],
  ["priya", "ellie", "titanic"],
  ["jess", "ellie", "barbie"],
  ["dan", "ellie", "barbie"],
  ["priya", "ellie", "barbie"],
  ["marcus", "tom", "barbie"],
  ["ellie", "priya", "paddington2"],
  ["dan", "priya", "paddington2"],
  ["jess", "marcus", "commando"],
  ["dan", "marcus", "commando"],
  ["marcus", "tom", "theRoom"],
  ["jess", "tom", "theRoom"],
  ["ellie", "jess", "cats"],
  ["priya", "jess", "parasite"],
  ["tom", "dan", "dieHard"],
  ["marcus", "dan", "dieHard"],
  ["dan", "ellie", "dieHard"],
  ["priya", "jess", "eeaao"],
  ["tom", "ellie", "laLaLand"],
];
