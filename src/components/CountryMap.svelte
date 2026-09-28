<script lang="ts">
  import { onDestroy } from "svelte";
  import type { CountryMapRender, ViewBox } from "../data/subjects/geography/atlas";

  export let countryId: string;
  export let cue = "Name this country";

  type Atlas = typeof import("../data/subjects/geography/atlas");

  const WIDTH = 600;
  const HEIGHT = 400;
  /** Zoom-out amount per +/− click (0 = country, 1 = whole continent). */
  const ZOOM_STEP = 0.25;
  const INTRO_DELAY_MS = 400;
  const INTRO_DURATION_MS = 1400;
  const STEP_DURATION_MS = 450;

  let atlas: Atlas | null = null;
  let rendered: CountryMapRender | null = null;
  let failed = false;
  let requestedId = "";
  /** Where the zoom is headed, in ZOOM_STEP increments. */
  let zoomLevel = 0;
  /** What's on screen right now; eases toward zoomLevel. */
  let shownZoom = 1;
  let frame: number | null = null;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const stopAnimation = () => {
    if (frame != null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  const animateTo = (target: number, durationMs: number, delayMs = 0) => {
    stopAnimation();
    if (prefersReducedMotion()) {
      shownZoom = target;
      return;
    }
    const from = shownZoom;
    const start = performance.now() + delayMs;
    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      shownZoom = from + (target - from) * easeInOut(progress);
      frame = progress < 1 ? requestAnimationFrame(step) : null;
    };
    frame = requestAnimationFrame(step);
  };

  const zoomBy = (delta: number) => {
    zoomLevel = Math.min(1, Math.max(0, zoomLevel + delta));
    animateTo(zoomLevel, STEP_DURATION_MS);
  };

  const load = async (id: string) => {
    requestedId = id;
    try {
      atlas ??= await import("../data/subjects/geography/atlas");
      if (requestedId !== id) {
        return;
      }
      rendered = atlas.renderCountryMap(id, WIDTH, HEIGHT);
      failed = rendered == null;
      stopAnimation();
      zoomLevel = 0;
      shownZoom = 1;
      animateTo(0, INTRO_DURATION_MS, INTRO_DELAY_MS);
    } catch {
      failed = true;
    }
  };

  $: load(countryId);

  onDestroy(stopAnimation);

  let view: ViewBox | null = null;
  $: view = atlas && rendered ? atlas.viewBoxAt(rendered, shownZoom) : null;
  $: marker = atlas && rendered && view ? atlas.markerAt(rendered, view) : null;
</script>

<article class="map-card">
  <p class="map-card__label">{cue}</p>
  {#if rendered && view}
    <div class="map-card__frame">
      <svg
        class="map-card__map"
        viewBox="{view.x} {view.y} {view.width} {view.height}"
        role="img"
        aria-label="Blank map with one country highlighted"
      >
        <path class="map-card__ocean" d={rendered.spherePath} />
        <path class="map-card__land" d={rendered.landPath} vector-effect="non-scaling-stroke" />
        <path class="map-card__target" d={rendered.targetPath} vector-effect="non-scaling-stroke" />
        {#if marker}
          <circle
            class="map-card__marker"
            cx={marker.cx}
            cy={marker.cy}
            r={marker.r}
            vector-effect="non-scaling-stroke"
          />
        {/if}
      </svg>
      <div class="map-card__zoom" role="group" aria-label="Map zoom">
        <button
          type="button"
          class="map-card__zoom-btn"
          aria-label="Zoom in"
          disabled={zoomLevel <= 0}
          on:click={() => zoomBy(-ZOOM_STEP)}
        >
          +
        </button>
        <button
          type="button"
          class="map-card__zoom-btn"
          aria-label="Zoom out"
          disabled={zoomLevel >= 1}
          on:click={() => zoomBy(ZOOM_STEP)}
        >
          −
        </button>
      </div>
    </div>
  {:else}
    <div class="map-card__placeholder">{failed ? "Couldn't load the map." : "Loading map…"}</div>
  {/if}
</article>

<style>
  .map-card {
    padding: var(--fc-space-md);
    border-radius: var(--fc-radius-lg);
    background: #fff;
    border: 1px solid var(--fc-border);
    box-shadow: var(--fc-shadow-lg);
    text-align: center;
  }

  .map-card__label {
    margin: 0 0 var(--fc-space-sm);
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--fc-text-muted);
  }

  .map-card__frame {
    position: relative;
  }

  .map-card__map,
  .map-card__placeholder {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 2;
    border-radius: var(--fc-radius-md);
    border: 1px solid #d4d4d4;
    background: #fff;
  }

  .map-card__placeholder {
    display: grid;
    place-items: center;
    color: var(--fc-text-muted);
    font-weight: 600;
  }

  .map-card__ocean {
    fill: #f3f4f6;
  }

  .map-card__land {
    fill: #fff;
    stroke: #1f1f1f;
    stroke-width: 0.6px;
    stroke-linejoin: round;
  }

  .map-card__target {
    fill: #fbe3cc;
    stroke: #1f1f1f;
    stroke-width: 1.4px;
    stroke-linejoin: round;
  }

  .map-card__marker {
    fill: none;
    stroke: #c2410c;
    stroke-width: 1.5px;
    stroke-dasharray: 4 3;
  }

  .map-card__zoom {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    flex-direction: column;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid #d4d4d4;
    box-shadow: var(--fc-shadow-sm);
  }

  .map-card__zoom-btn {
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    background: #fff;
    color: #1f1f1f;
    font: inherit;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .map-card__zoom-btn + .map-card__zoom-btn {
    border-top: 1px solid #d4d4d4;
  }

  .map-card__zoom-btn:hover:not(:disabled) {
    background: #f3f4f6;
  }

  .map-card__zoom-btn:disabled {
    color: #b5b5b5;
    cursor: default;
  }
</style>
