/** Zooming and framing shared by the world map and the U.S. map; no map data, so it loads with the app. */

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapRender {
  /** Close-up view of the highlighted shape; paths are drawn at this zoom so it has full detail. */
  width: number;
  height: number;
  /** Zoomed-out view (the continent, or the whole country), in the same coordinates. */
  overview: ViewBox;
  /** Background behind the land. */
  spherePath: string;
  landPath: string;
  targetPath: string;
  /** Bounds of the highlighted shape's main part, for deciding when it needs a circle. */
  focus: ViewBox;
  center: { x: number; y: number };
  /** Where to mark a capital city, if there is one. */
  capital?: { x: number; y: number };
}

/**
 * Widest map window (width ÷ height) the drawn area covers, so a short window shows more map rather than cropping
 * it. The window is never taller than 3:2. Wider windows still show the whole shape, with blank edges when
 * zoomed out all the way.
 */
export const MAX_WINDOW_ASPECT = 3;
/** Shapes whose main part is smaller than this (in px) also get a circle so they can be spotted. */
const MARKER_THRESHOLD_PX = 20;
const MARKER_RADIUS_PX = 18;
const CAPITAL_RADIUS_PX = 5;

/** Grow a box to the given aspect ratio around its center. */
export const fitAspect = (box: ViewBox, aspect: number): ViewBox => {
  const width = Math.max(box.width, box.height * aspect);
  const height = width / aspect;
  return {
    x: box.x + box.width / 2 - width / 2,
    y: box.y + box.height / 2 - height / 2,
    width,
    height
  };
};

/**
 * View box `zoomOut` of the way (0 = close-up, 1 = overview), shaped to the map window (`aspect` =
 * width ÷ height) by showing more map, so nothing in the zoom's frame is ever cropped. Width changes
 * geometrically so each step feels like the same amount of zoom; the center pans in step with the width.
 */
export const viewBoxAt = (render: MapRender, zoomOut: number, aspect: number): ViewBox => {
  const { overview } = render;
  const width = render.width * (overview.width / render.width) ** zoomOut;
  const height = (width * render.height) / render.width;
  const pan = overview.width === render.width ? zoomOut : (width - render.width) / (overview.width - render.width);
  const centerX = render.width / 2 + (overview.x + overview.width / 2 - render.width / 2) * pan;
  const centerY = render.height / 2 + (overview.y + overview.height / 2 - render.height / 2) * pan;
  return fitAspect({ x: centerX - width / 2, y: centerY - height / 2, width, height }, aspect);
};

/** Circle (in map coordinates) around shapes too small to spot at this view, or null. */
export const markerAt = (render: MapRender, view: ViewBox): { cx: number; cy: number; r: number } | null => {
  const pxPerUnit = render.width / view.width;
  const tiny =
    render.focus.width * pxPerUnit < MARKER_THRESHOLD_PX && render.focus.height * pxPerUnit < MARKER_THRESHOLD_PX;
  return tiny ? { cx: render.center.x, cy: render.center.y, r: MARKER_RADIUS_PX / pxPerUnit } : null;
};

/** Dot (in map coordinates) for the capital city, the same size on screen at every zoom, or null. */
export const capitalAt = (render: MapRender, view: ViewBox): { cx: number; cy: number; r: number } | null =>
  render.capital
    ? { cx: render.capital.x, cy: render.capital.y, r: CAPITAL_RADIUS_PX / (render.width / view.width) }
    : null;
