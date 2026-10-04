# flash-cards

A flash-card practice app for kids, covering 2nd through 6th grade, plus a Computer Science track for grown-up study. Pick a grade, choose a subject and unit, and work through shuffled cards in short rounds — multiple choice for most decks (every math deck), typing or voice for the 4th grade sight words.

Project summary: [dan-maguire.com/projects/flash-cards](https://dan-maguire.com/projects/flash-cards)

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # run the unit tests once
npm run coverage # run the tests with a coverage report
```

Built with Svelte 4, TypeScript, and Vite. The geography maps use `d3-geo`, `topojson-client`, `world-atlas`, and `us-atlas`.

## What's in it

### Grades and decks

| Grade | Subject | Decks |
|---|---|---|
| 2nd | Math | Addition, Subtraction (1- and 2-digit, never over 100 or below zero) |
| 2nd | Reading | Vocabulary: the 100 most common words (hear a word, find it among look-alikes) |
| 3rd | Math | Addition, Subtraction, Multiplication, Division, All Four Operations (sums and differences within 100; times tables through 10) |
| 3rd | Reading | Vocabulary (hear a word, find it among look-alikes) |
| 4th | Math | Addition, Subtraction, Multiplication, Division, All Four Operations (1- and 2-digit numbers: two 2-digit numbers added or subtracted, 2-digit × 1-digit, 2-digit ÷ 1-digit) |
| 4th | Geography | States, State Capitals (see below) |
| 4th | Reading | Vocabulary (hear a word, find it among look-alikes), Speech & Typing (sight words, typing or microphone) |
| 5th | Math | Multi-Digit Multiplication, Long Division (with remainders), Fractions (unlike denominators, multiplying), Decimals, Order of Operations, Mixed Review |
| 6th | Math | Unit 0: Calculation Practice (simplifying fractions, greatest common factor, least common multiple); Unit 1: Decimal Operations, one decimal and one whole number (88.88 ÷ 4), including money and measurement (Units 2–10 listed as coming soon) |
| 6th | Science | Cells, Human Body, Genetics, Evolution, Environmental Science |
| 6th | French | Unit 1: Alphabet — letters read aloud in French, accents included; Unit 3: Colors — 12 color words, French ↔ English plus example phrases (Communication, Food, and School listed as coming soon) |
| 6th | Geography | 11 regional country units plus a Final (see below) |
| Computer Science | Angular | Beginner, Intermediate, Expert, Mastery (read a definition, pick the term) |
| Computer Science | Azure Fundamentals | All Terms: 40 cloud, Azure service, security, and governance terms (read a definition, pick the term) |

Math gets a step harder each grade, and every math deck is multiple choice. Math decks are generated fresh every time, so no two games are the same. Wrong answers are built from common mistakes — a forgotten carry, a misplaced decimal, a remainder that's too big — rather than random numbers. Every math card has a hint.

### 6th grade Geography

Each card shows a blank black-and-white map with one country lightly highlighted, and asks which country it is.

- The map opens on the whole continent and animates in to the country. The **+** and **−** buttons step between the close-up and the full continent in 25% increments.
- The close-up frames the whole country, including big or nearby islands (both islands of New Zealand, all of Malaysia), but not far-off territories like Alaska or French Guiana. The view matches the map window's shape, so the country is never cut off on a short or wide screen.
- Tiny countries (island nations, microstates) get a dashed circle so they're findable.
- Wrong answers are the countries nearest the highlighted one. Hints give the first letter and a couple of bordering countries.
- The map data only downloads once a geography deck starts.

All 194 countries are split into units:

| Unit | Region | Countries |
|---|---|---|
| 1 | North America: Continental North & Central | 10 |
| 2 | North America: Island Nations | 13 |
| 3 | South America | 12 |
| 4 | Europe: West | 23 |
| 5 | Europe: East | 22 |
| 6 | Africa: North | 18 |
| 7 | Africa: Central | 21 |
| 8 | Africa: South | 15 |
| 9 | Asia: West | 25 |
| 10 | Asia: East | 22 |
| 11 | Oceania | 13 |
| Final | All Countries, in random order across every continent | 194 |

### 4th grade Geography

The same blank map, of the United States (Alaska and Hawaii inset, as on most U.S. maps), with the same zoom buttons.

- **States** highlights one state and asks which it is. Wrong answers are the nearest states; hints give the first letter and a couple of bordering states.
- **State Capitals** highlights a state, marks its capital with a red dot, and asks for the capital. Wrong answers are the capitals of nearby states.
- Small states like Rhode Island stay zoomed out enough to show their neighbors, with a dashed circle around them.
- Each state belongs to one of five regions (Northeast, Southeast, Midwest, Southwest, West), so a deck can quiz one region at a time. Both decks cover all 50 states for now.

### Playing a multiple-choice deck

- **Practice** goes at your own pace. **Timed** gives 20 seconds per question (`multipleChoice.secondsPerQuestion` in `flashcards.json`) and adds a Pause button.
- Every game opens on a **Ready?** card — tap the card to begin (taps anywhere else don't count), and the first question and timer start then. The card has keyboard focus, so Enter or Space starts too.
- Cards come in rounds of 10, with an encouragement screen between rounds. These numbers, the scoring below, and the messages are set in `flashcards.json` (see [Play settings and wording](#play-settings-and-wording)).
- Wrong picks turn red and stay red; the right answer turns green and the next card comes up. There are no feedback messages, so the screen stays compact.
- **Scoring:** 10 points for a first-try answer, minus 3 for each wrong pick and 1 for using the hint (never below 1). Skipped and timed-out cards score 0. The percentage is points earned out of points possible.
- While paused, the question is covered by a PAUSED card of the same size and the answers show only A–D, so nothing can be peeked at.
- The play screen always fits the window without scrolling, and the answers stay in two columns on phones.

### 2nd, 3rd, and 4th grade Vocabulary

The word is never shown. It's read aloud with the browser's built-in speech (the Web Speech API, no extra library) as each card appears, and the player taps it among look-alike words (`quiet`, `quite`, `quit`, `quilt`). Wrong answers are written into each card and never sound the same as the word, so there's no guessing between homophones. The hint is a fill-in-the-blank sentence. **Play again** reads the word once more. While the word is being read, a few soft bars pulse like a sound wave, and they stay still otherwise (or with reduced motion turned on). The voice speaks the card's language (see [Flashcard data](#flashcard-data)) at the speed set in `multipleChoice.speech.rate`. Voices vary by device, and if a browser can't speak at all, the word is shown instead.

### 6th grade French Alphabet

Each letter is read aloud by a French voice, and the player picks it from four look-alikes. Each card's question is the letter's French name (`bé`, `ji`, `i grec`, `double vé`), which is what gets read, and its answer is the letter. Accented letters are named the way French speakers say them (`e accent aigu` for é, `c cédille` for ç), so é, è, and ê sound different from each other and from plain e. The deck covers A–Z (the `letters` set) plus é, è, ê, ë, à, â, î, ï, ô, ù, û, and ç (`accented-letters`), and wrong answers are other letters from either set. If a letter sounds wrong on some device, change its question (the key in the set) to spell the name differently.

### 4th grade typing and voice

Speech & Typing (the sight words) accepts a typed answer or a spoken one through the browser's speech recognition. With the microphone on it keeps listening between cards.

Typed answers must be spelled exactly; only capitals and surrounding spaces are ignored. Spoken answers are more forgiving, because the recognizer often writes a sound-alike of the word that was said (`for` or `4` for "four", `here` for "hear"), so those count, along with a near-miss on longer words. The sound-alikes are listed in `src/nlp/AnswerInterpreter.ts`.

### Navigation and links

A house button at the top left of the panel goes straight back to the grade list from a grade or subject screen. It's hidden on the grade list itself. In a deck, the house sits in the header next to **← Back**, which returns to the deck list the deck came from.

The URL always reflects where you are, with blank values when a step isn't chosen. This allows for easy bookmarking. For example:

```
?grade=6&subject=geography&mode=timed&unit=europe-west
```

- `grade` and `subject` are set as you navigate the home screens.
- `mode` (`practice` or `timed`; `typing` or `microphone` for the 4th grade sight words) and `unit` are set when a deck starts, and cleared when you go back.
- Opening a link like the one above starts that deck directly. Browser back and forward move between the deck and the home screen.
- `unit` codes are readable names that never include the unit number, so units can be renumbered without breaking saved links. They're matched case-insensitively.

Each subject has a fixed color everywhere it appears: Math red, Science green, French purple, Reading blue, History yellow, Geography orange. Colors are set in `flashcards.json` (see [Grades, subjects, and decks](#grades-subjects-and-decks)).

## Project layout

```
src/
  App.svelte                  shell, deck start/stop, URL-driven deck launching, footer
  nav.ts                      reads and writes the grade/subject/mode/unit query string
  routes/index.svelte         home: grade → subject → unit
  routes/play.svelte          typing/voice play screen (4th grade)
  modes/multiple-choice/      multiple-choice play screen
  components/                 FlashCard, ListenCard (read-aloud card), CountryMap, and shared UI
  services/                   flashcardService.ts loads flashcards.json at startup
  data/cardSets.ts            turns flashcards.json card sets into playable cards
  data/wrongAnswers.ts        spreads wrong answers evenly across a deck
  data/decks.ts               reads the grade/subject/deck catalog and builds each deck when it starts
  data/CardTypes.ts           card, deck, card set, and catalog types
  data/subjects/
    math/                     grade 2–3, 5, and 6 generators; rules.ts has the shared rule shapes and random draws
    french/                   the colors deck builder (colors.ts)
    geography/                map rendering (atlas.ts for the world, usAtlas.ts for the U.S., mapView.ts shared) and the deck builders (countriesDeck.ts, statesDeck.ts)
  nlp/                        speech recognition, spoken-answer matching, and reading words aloud
```

### Flashcard data

Everything the home screen lists (grades, subjects, units, and decks), all written flashcards, and the rules for generated math decks live in `flashcards.json`, in its own repo: [DanM7/flash-cards-data](https://github.com/DanM7/flash-cards-data). Keeping the data separate means editing it never triggers a new site deploy.

The app fetches the file when it starts, showing "Loading flashcards…" until it arrives, or an error with a **Try again** button if it can't load.

- **Deployed:** the site reads the copy on GitHub (`REMOTE_URL` in `src/services/flashcardService.ts`), so changes go live within about 5 minutes of being pushed to the data repo's `main`, with no redeploy.
- **Development:** check out the data repo next to this one (`../flash-cards-data/flashcards.json`). `npm run dev` serves that copy at `/flashcards.json`, so local edits show up on reload, and the tests read it too. `flash-cards.code-workspace` in the parent folder opens both repos together.
- When a change needs new code and new data together (a new field or `build` type), deploy the site first if the old code would choke on the new data, or push the data first if the new code requires it.

The file has three groups:

- `appSettings`: the default card `language`, `home` screen text, play settings (`multipleChoice`, `typingAndVoice`), and play screen wording (`playText`).
- `catalog`: what the menus offer: `subjects` (names and colors) and `grades` (each grade's subjects, units, and decks).
- `subjectData`: each subject's content, keyed like `catalog.subjects` (`math`, `science`, `french`, `reading`, `geography`, `angular`, `azure-fundamentals`).

Written cards live in their subject's `cardSets`, keyed by set name, like `subjectData.science.cardSets.cells`. Each set maps a question to its answer:

```json
"cells": {
  "additionalIncorrectAnswers": ["Atom", "Tissue", "Organ", "Ribosome"],
  "cards": {
    "What is the basic unit of life?": "Cell",
    "What part of the cell contains DNA?": "Nucleus"
  }
}
```

- The key is what's shown and the value is what gets picked. A set with `"show": "value"` turns that around for plain text cards: the Angular and Azure sets are written term → definition (`"Observable": "A stream of asynchronous values."`), but show the definition and ask for the term, so the choices are short terms. Cards written as objects always show their key.
- An answer is a string, or an object with any of `answer` (left out, the question is the answer, as in vocabulary), `acceptedAnswers` (other answers that count), `incorrectAnswers`, and `hint`.
- **Wrong answers** are the other cards' answers in the same set (or sets, for a deck built from several), plus the set's optional `additionalIncorrectAnswers`. They're picked fresh each play, spread so every answer shows up about equally often across the deck, and never include the card's own answer (ignoring case). A card with its own `incorrectAnswers` uses those instead; vocabulary does this, so wrong answers look alike but never sound the same.
- Every card is in English (`appSettings.language`, `"en-US"`) unless its set has a `lang`, like `"fr-FR"` for the French alphabet. The language picks the voice and pronunciation when a card is read aloud.
- Spoken and typed answers that are numbers also accept the number as words ("5" or "five", up to one hundred), and common speech mix-ups ("four" for "for") are handled in code, so neither needs listing.

Three subjects also have their own compact formats in `subjectData`:

- `reading.sightWords`: a list of words per grade, like `"4": ["high", "every", ...]`. Each word is its own question and answer.
- `french.colors`: each color's French and English word, a short French `phrase` using it, and that phrase in English with the color left out (`"a {color} ball"`). Each color makes three cards (English to French, French to English, and what the phrase means) worded by `templates`. Wrong answers are other colors plus the non-color words in `additionalIncorrectAnswers` (French word → English word, like `"crayon": "pencil"`); phrase cards swap other colors into the same phrase. `phraseHint` replaces a phrase card's usual hint, for feminine forms.
- `geography`: the `question` asked on every map card, `nearbyCountries` (how many of the closest countries wrong answers come from), and `worldRegions`, each with the `continent` the map zooms out to (`north-america`, `south-america`, `europe`, `africa`, `asia`, or `oceania`) and its `countries`, each `{ "name": "France", "id": "250", "capital": "Paris" }` where `id` is the ISO 3166-1 numeric code the map data uses. Country capitals aren't used by any deck yet. For the U.S.: `stateQuestion` and `capitalQuestion` ("{state}" becomes the state's name), `nearbyStates`, and `unitedStates`, each `{ "name": "Texas", "capital": "Austin", "region": "southwest", "capitalCoordinates": [-97.743, 30.267] }` with the capital's [longitude, latitude] for the map dot. Regions are `northeast`, `southeast`, `midwest`, `southwest`, and `west`.

#### Math rules

Math problems are generated fresh every play, but the limits they follow live in `subjectData.math` in `flashcards.json`, so they can be changed without touching code:

- `wholeNumberOperations` (2nd to 4th grade): deck size, and for each grade the allowed range for numbers and answers, the chance of negative numbers, and which operations it practices. Each operation sets how big its numbers are (`second` gives the second number its own size, as in 4th grade's 2-digit × 1-digit), and `largerFirst` keeps subtraction from going below zero. Division sets its `divisor` and `quotient`, so it always divides evenly, and `dividendMax` can cap the number being divided.
- `grade5`: deck size, how often each topic comes up in Mixed Review, multiplication factor sizes, division divisors and remainders, fraction denominators, decimal places and sizes, and the order-of-operations expressions with a range for each letter.
- `decimalOperations` (6th grade): deck size, operations, answer range, units, and how often numbers have two places or divide evenly. `decimalOperands` is `"one"` (one decimal and one whole number, with `decimalFirstChance` picking which comes first) or `"both"` (both decimals).
- `calculationPractice` (6th grade Unit 0): deck size, how often each topic comes up (`simplify`, `gcf`, `lcm`), and number ranges: the denominator of the simplified fraction and the common factor it's scaled up by, the greatest common factor and the multipliers that make the two numbers, and the two numbers for a least common multiple.

A number rule is either one range, `{ "min": 1, "max": 9 }`, or a list of ranges picked by weight. For example, `[{ "min": 1, "max": 9, "weight": 0.3 }, { "min": 10, "max": 99, "weight": 0.7 }]` gives a 2-digit number 70% of the time. Wherever there are weights, they're relative, so `1, 1, 2` works the same as `0.25, 0.25, 0.5`, and a weight of 0 turns that option off.

The code still decides the kinds of problems, their hints, and how wrong answers are built from common mistakes. Deck descriptions on the home screen (like "never go over 100") are written by hand, so update them if you change a rule they describe.

#### Grades, subjects, and decks

The home screen is built from `appSettings.home` and the `catalog` group of `flashcards.json`:

- `home`: the `tagline` under the title and the `intro` above the grade list.
- `subjects`: each subject's `label` and tile `color` (`red`, `green`, `purple`, `blue`, `yellow`, or `orange`), keyed by a short name like `math` or `reading`.
- `grades`: one entry per grade tile, in order, with its `grade` (a number, or a name like `"computer-science"` for a track that isn't a school grade; it's the `?grade=` value), `label`, tile `color` (`sky`, `violet`, `teal`, `rose`, `amber`, or any subject color), and `subjects`. Set `"pickSubject": true` to show a subject step before the decks; without it, the grade goes straight to its decks.

Each of a grade's subjects has a `subject` key, a `summary` for the grade tile, a `blurb` for the subject tile (it falls back to the summary), and `"available": false` to show it as coming soon. It lists its decks one of two ways:

- `decks`: plain decks. On a grade without a subject step (every grade has one right now), each is badged with its subject name, since one list mixes subjects.
- `units`: numbered units, each with a `title` and a `deck`. Units are numbered "Unit 1", "Unit 2", ... in order; one with its own `label` (like "Final") keeps it and isn't counted. A unit that's just a string, like `"Fraction Operations"`, is listed as coming soon.

```json
{
  "unit": "addition",
  "title": "Addition",
  "description": "1- and 2-digit sums that never go over 100.",
  "build": { "type": "wholeNumberOperations", "topic": "add" }
}
```

- `unit` is the `?unit=` code: lowercase, hyphenated, and unique within its grade and subject.
- `description` can include `{count}`, which becomes the number of cards the deck draws from.
- `interaction` is `"multiple-choice"` (the default) or `"voice-or-type"`. Math decks are always multiple choice.
- `build` says where the cards come from:
  - `{ "type": "cards", "sets": ["cells"] }`: written cards from one or more of the deck subject's card sets (a science deck's `cells` is `subjectData.science.cardSets.cells`). `deckType` picks the play screen's labels (it defaults to the subject, so vocabulary decks set `"vocabulary"`), and math decks need an `operation` such as `"addition"`. `"listen": true` reads each question aloud instead of showing it.
  - `{ "type": "sightWords" }`: the grade's sight words from `reading.sightWords`.
  - `{ "type": "frenchColors" }`: the French colors deck.
  - `{ "type": "wholeNumberOperations", "topic": "add" }`: generated whole-number math (2nd to 4th grade) using that grade's rules (`add`, `sub`, `mul`, `div`, or `mixed`).
  - `{ "type": "grade5", "topic": "fractions" }`: generated 5th grade math (`multiplication`, `division`, `fractions`, `decimals`, `order-of-operations`, or `mixed`).
  - `{ "type": "decimalOperations" }`: generated 6th grade decimal operations.
  - `{ "type": "calculationPractice" }`: generated fraction-simplifying, greatest common factor, and least common multiple problems, mixed. Add `"topic": "simplify"`, `"gcf"`, or `"lcm"` for just one.
  - `{ "type": "countries", "regions": ["europe-west"] }`: map cards for every country in those `worldRegions`, with nearby countries as wrong answers. Leave out `regions` for every region, as the geography Final does.
  - `{ "type": "states", "regions": ["west"] }` and `{ "type": "stateCapitals", "regions": ["west"] }`: U.S. state map cards, or capital cards with the capital marked, for the states in those regions (every state when `regions` is left out).

#### Play settings and wording

Gameplay numbers and on-screen wording live in `appSettings`:

- `multipleChoice`: `secondsPerQuestion` (the Timed limit, also shown in the home screen hint), `lowTimeSeconds` (when the timer turns to a warning), `roundSize` (cards between encouragement screens), `wrongChoices` (wrong answers shown with each written or country card), `scoring` (`firstTry` points, minus `perWrongPick` per wrong pick and `hint` for using the hint, never below `minimum`), the `encouragement` messages shown between rounds, and `speech.rate` (how fast decks read aloud are spoken; 1 is normal speed).
- `typingAndVoice` (4th grade typing and voice decks): `cardsBeforeBreak`, how long the encouragement break lasts in `breakSeconds`, and its `encouragement` messages.
- `playText`: the play screen's `title`, the cue above each question (`choiceCue` for multiple choice, `listenCue` for cards read aloud, `typingCue` for typing and voice), `promptName` (as in "Your problem"), and the end-of-deck `finishedTitle`, `choiceFinished`, and `typingFinished`. Every field is set in `default`. An entry named after a subject (or a deck's `deckType`, like `sight-words`) overrides some of them, and math decks then apply an entry named after their operation (like `decimal-operations`).

The math generators always offer four answers, whatever `wrongChoices` says. While a game is paused, answers show as letters A–F, so keep `wrongChoices` at 5 or below.

### Adding a deck

1. Add its cards to `flashcards.json` in the data repo as a new card set in its subject's `cardSets` under `subjectData` (add the subject there if it's new). Generated math needs a generator under `src/data/subjects/math/` and a new `build` type in `src/data/decks.ts`.
2. Add the deck to its grade and subject in `catalog.grades`, under `decks` or as a unit's `deck`. A new grade or subject is just a new entry there (and in `catalog.subjects`).

Nothing else changes in code. Deck ids are worked out as `{grade}-{subject}-{unit}`.

## Testing

Unit tests use [Vitest](https://vitest.dev/) with jsdom and [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro). They live in `tests/`, mirroring `src/`:

```
tests/
  setup.ts            jest-dom matchers; resets the URL, timers, and stubs after each test
  helpers/            seeded Math.random, fake SpeechRecognition and speechSynthesis, animation-frame stubs, and flashcards.json fetch stubs
  data/               every deck builder and generator, flashcards.json checks, the deck catalog and unit codes
  services/           loading flashcards.json
  nlp/                answer matching and speech recognition
  components/         FlashCard, ListenCard, CountryMap, SubjectSelector
  modes/              multiple-choice play: Ready screen, scoring, hints, timer, pause, rounds
  routes/             home navigation, and typing/voice play (one-shot and continuous mic)
  App.test.ts         flashcard loading and errors, deck launching, deep links, back/forward, footer, and main.ts
```

`npm run coverage` fails if statements, branches, functions, or lines drop below 100%. The HTML report is written to `coverage/index.html`.

A few things to know when adding tests:

- Svelte components are compiled without dev mode for tests (see `vitest.config.ts`), because dev mode adds generated code that no test can reach.
- Random decks are made repeatable with `seedRandom(seed)`, or steered to a specific case with `queueRandom([...])`, both from `tests/helpers/random.ts`.
- A few modules export a `__testing` object so their internal safety nets (such as the decimal-operations fallbacks) can be tested directly.
- Svelte creates an `{#if}` block's content with a separate code path from the one that updates it. If a condition can never be true when its block first appears, that path can't be covered. The play screens toggle `hidden` on the pause overlay, hint panel, and feedback panels instead of wrapping them in `{#if}`.

## Scaffolded for later

The original scaffold also includes child profiles (`src/profiles/`), progress, streak, and accuracy tracking (`src/progress/`), character encouragement overlays (`src/characters/`), and a stats screen. These aren't connected to the app yet.

## Credits

Map data from [world-atlas](https://github.com/topojson/world-atlas), based on [Natural Earth](https://www.naturalearthdata.com/), and [us-atlas](https://github.com/topojson/us-atlas), based on the U.S. Census Bureau's cartographic boundary files.

© Dan Maguire
