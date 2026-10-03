import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/** flashcards.json lives in the flash-cards-data repo, checked out next to this one. */
const flashcardsFile = fileURLToPath(new URL("../flash-cards-data/flashcards.json", import.meta.url));

/** In development the app fetches /flashcards.json; serve the local data repo's copy so edits show on reload. */
const localFlashcards = (): Plugin => ({
  name: "local-flashcards",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/flashcards.json", (_request, response) => {
      readFile(flashcardsFile).then(
        (contents) => {
          response.setHeader("Content-Type", "application/json");
          response.end(contents);
        },
        () => {
          response.statusCode = 404;
          response.end(`No flashcards file at ${flashcardsFile}.`);
        }
      );
    });
  }
});

export default defineConfig({
  plugins: [svelte(), localFlashcards()]
});
