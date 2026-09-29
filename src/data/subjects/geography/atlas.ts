import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import { feature, neighbors } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-50m.json";
import { GEOGRAPHY_UNITS, type Continent } from "./countries";

interface CountryProperties {
  name: string;
}

type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

const world = worldData as unknown as Topology<{ countries: GeometryCollection<CountryProperties> }>;
const geometries = world.objects.countries.geometries;
const features = (feature(world, world.objects.countries) as FeatureCollection<Polygon | MultiPolygon, CountryProperties>)
  .features as CountryFeature[];
const adjacency = neighbors(geometries);

/** Unrecognized breakaway regions (no ISO code in the data) shaded with their country. */
const EXTRA_PARTS: Record<string, string[]> = {
  "706": ["Somaliland"],
  "196": ["N. Cyprus"]
};

/** Share of the view the country's main landmass fills, so neighbors show around it. */
const CONTEXT_ZOOM = 0.45;
/** Tiny countries still show at least this much of the globe... */
const MIN_SPAN_DEGREES = 12;
/** ...and enough to reach the nearest sizable landmass, up to this cap. */
const MAX_SPAN_DEGREES = 60;
const NEAREST_LAND_FACTOR = 2.2;
/** Landmasses of at least ~10,000 km² (in steradians) count as recognizable context. */
const SIZABLE_LAND_SR = 10_000 / 6371 ** 2;
/** Countries whose main landmass is smaller than this (in px) also get a circle so they can be spotted. */
const MARKER_THRESHOLD_PX = 20;
const MARKER_RADIUS_PX = 18;

const indexesById = new Map<string, number[]>();
features.forEach((country, index) => {
  const id = country.id == null ? null : String(country.id);
  if (id && !indexesById.has(id)) {
    indexesById.set(id, [index]);
  }
});
for (const [id, names] of Object.entries(EXTRA_PARTS)) {
  for (const name of names) {
    const index = features.findIndex((country) => country.properties.name === name);
    if (index >= 0) {
      indexesById.get(id)?.push(index);
    }
  }
}

/** Area in steradians, whichever way the ring winds (a reversed ring would otherwise measure the rest of the globe). */
export const sphericalArea = (coordinates: Position[][]): number => {
  const area = geoArea({ type: "Polygon", coordinates });
  return area > 2 * Math.PI ? 4 * Math.PI - area : area;
};

/** Main landmass, so far-off territories (French Guiana, Alaska) don't pull the zoom out. */
const largestPolygon = (country: CountryFeature): Feature<Polygon> => {
  const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
  let best = polygons[0];
  let bestArea = -1;
  for (const coordinates of polygons) {
    const area = sphericalArea(coordinates);
    if (area > bestArea) {
      best = coordinates;
      bestArea = area;
    }
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
};

const mainlands = features.map(largestPolygon);
const centroids = mainlands.map((mainland) => geoCentroid(mainland));
const mainlandAreas = mainlands.map((mainland) => sphericalArea(mainland.geometry.coordinates));

const eachVertex = (country: CountryFeature, visit: (point: Position) => void) => {
  const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
  polygons.forEach((rings) => rings.forEach((ring) => ring.forEach(visit)));
};

/** Bounding circle per country (center + angular radius) so off-screen shapes can be skipped quickly. */
const boundingCircles = features.map((country) => {
  const center = geoCentroid(country);
  let radius = 0;
  eachVertex(country, (point) => {
    radius = Math.max(radius, geoDistance(center, point as [number, number]));
  });
  return { center, radius };
});

export const hasCountry = (id: string): boolean => indexesById.has(id);

/** Great-circle distance in radians between two countries' main landmasses. */
export const countryDistance = (a: string, b: string): number => {
  const ia = indexesById.get(a)?.[0];
  const ib = indexesById.get(b)?.[0];
  return ia == null || ib == null ? Number.POSITIVE_INFINITY : geoDistance(centroids[ia], centroids[ib]);
};

/** ISO ids of countries that share a land border. */
export const neighborIdsOf = (id: string): string[] => {
  const own = new Set(indexesById.get(id) ?? []);
  const ids = new Set<string>();
  for (const index of own) {
    for (const other of adjacency[index]) {
      const otherId = features[other].id;
      if (!own.has(other) && otherId != null) {
        ids.add(String(otherId));
      }
    }
  }
  return [...ids];
};

const nearestLandDegrees = (index: number): number => {
  let nearest = Number.POSITIVE_INFINITY;
  centroids.forEach((centroid, other) => {
    if (other !== index && mainlandAreas[other] >= SIZABLE_LAND_SR) {
      nearest = Math.min(nearest, geoDistance(centroids[index], centroid));
    }
  });
  return (nearest * 180) / Math.PI;
};

/** Rough lon/lat box of each continent for the zoomed-out view (Oceania runs past 180° into the Pacific). */
const CONTINENT_FRAMES: Record<Continent, { lon: [number, number]; lat: [number, number] }> = {
  "north-america": { lon: [-168, -52], lat: [7, 75] },
  "south-america": { lon: [-82, -34], lat: [-56, 13] },
  europe: { lon: [-25, 60], lat: [34, 71] },
  africa: { lon: [-26, 58], lat: [-35, 38] },
  asia: { lon: [26, 146], lat: [-11, 56] },
  oceania: { lon: [112, 210], lat: [-48, 15] }
};
const FRAME_STEP_DEGREES = 2.5;
/** Frame points farther than this from the country are dropped; the projection distorts badly near 90°. */
const FRAME_MAX_DISTANCE = (85 * Math.PI) / 180;
const OVERVIEW_PADDING = 0.03;

const continentOf = (id: string): Continent | undefined =>
  GEOGRAPHY_UNITS.find((group) => group.countries.some((country) => country.id === id))?.continent;

const framePoints = (continent: Continent): [number, number][] => {
  const { lon, lat } = CONTINENT_FRAMES[continent];
  const points: [number, number][] = [];
  for (let x = lon[0]; x <= lon[1]; x += FRAME_STEP_DEGREES) {
    points.push([x, lat[0]], [x, lat[1]]);
  }
  for (let y = lat[0]; y <= lat[1]; y += FRAME_STEP_DEGREES) {
    points.push([lon[0], y], [lon[1], y]);
  }
  return points.map(([x, y]) => [x > 180 ? x - 360 : x, y]);
};

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CountryMapRender {
  /** Country view; paths are drawn at this zoom so it has full detail. */
  width: number;
  height: number;
  /** Zoomed-out view of the whole continent, in the same coordinates. */
  overview: ViewBox;
  spherePath: string;
  landPath: string;
  targetPath: string;
  /** Bounds of the country's main landmass, for deciding when it needs a circle. */
  focus: ViewBox;
  center: { x: number; y: number };
}

/** Grow a box to the given aspect ratio around its center. */
const fitAspect = (box: ViewBox, aspect: number): ViewBox => {
  const width = Math.max(box.width, box.height * aspect);
  const height = width / aspect;
  return {
    x: box.x + box.width / 2 - width / 2,
    y: box.y + box.height / 2 - height / 2,
    width,
    height
  };
};

/** Blank map centered on the country's main landmass, with the country's shapes kept separate for highlighting. */
export const renderCountryMap = (id: string, width: number, height: number): CountryMapRender | null => {
  const indexes = indexesById.get(id);
  if (!indexes) {
    return null;
  }
  const primary = indexes[0];
  const [lon, lat] = centroids[primary];
  const projection = geoAzimuthalEqualArea()
    .rotate([-lon, -lat])
    .clipAngle(90)
    // The 50m data is dense enough that adaptive resampling only costs time.
    .precision(0)
    .fitExtent(
      [
        [0, 0],
        [width, height]
      ],
      mainlands[primary]
    );

  const spanDegrees = Math.min(
    MAX_SPAN_DEGREES,
    Math.max(MIN_SPAN_DEGREES, nearestLandDegrees(primary) * NEAREST_LAND_FACTOR)
  );
  const maxScale = width / ((spanDegrees * Math.PI) / 180);
  projection.scale(Math.min(projection.scale() * CONTEXT_ZOOM, maxScale)).translate([width / 2, height / 2]);

  let [minX, minY, maxX, maxY] = [0, 0, width, height];
  const continent = continentOf(id);
  if (continent) {
    for (const point of framePoints(continent)) {
      if (geoDistance([lon, lat], point) > FRAME_MAX_DISTANCE) {
        continue;
      }
      const projected = projection(point);
      if (projected) {
        minX = Math.min(minX, projected[0]);
        minY = Math.min(minY, projected[1]);
        maxX = Math.max(maxX, projected[0]);
        maxY = Math.max(maxY, projected[1]);
      }
    }
  }
  const padX = (maxX - minX) * OVERVIEW_PADDING;
  const padY = (maxY - minY) * OVERVIEW_PADDING;
  const overview = fitAspect(
    { x: minX - padX, y: minY - padY, width: maxX - minX + 2 * padX, height: maxY - minY + 2 * padY },
    width / height
  );
  projection.clipExtent([
    [overview.x, overview.y],
    [overview.x + overview.width, overview.y + overview.height]
  ]);

  const path = geoPath(projection);
  const target = new Set(indexes);
  const land: string[] = [];
  const highlighted: string[] = [];
  // Angular radius of the overview's corners, padded because the projection stretches away from center.
  const farthestCorner = Math.max(
    ...[
      [overview.x, overview.y],
      [overview.x + overview.width, overview.y],
      [overview.x, overview.y + overview.height],
      [overview.x + overview.width, overview.y + overview.height]
    ].map(([x, y]) => Math.hypot(x - width / 2, y - height / 2))
  );
  const viewRadius = Math.min(Math.PI, (farthestCorner / projection.scale()) * 1.5);
  features.forEach((country, index) => {
    const circle = boundingCircles[index];
    if (geoDistance([lon, lat], circle.center) - circle.radius > viewRadius) {
      return;
    }
    const d = path(country);
    if (d) {
      (target.has(index) ? highlighted : land).push(d);
    }
  });

  // Measure the main landmass: spread-out island nations are wide overall but still specks.
  const [[x0, y0], [x1, y1]] = path.bounds(mainlands[primary]);

  return {
    width,
    height,
    overview,
    spherePath: path({ type: "Sphere" }) as string,
    landPath: land.join(""),
    targetPath: highlighted.join(""),
    focus: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    center: { x: width / 2, y: height / 2 }
  };
};

/**
 * View box `zoomOut` of the way (0 = country, 1 = continent). Width changes geometrically so each
 * step feels like the same amount of zoom; the center pans in step with the width.
 */
export const viewBoxAt = (render: CountryMapRender, zoomOut: number): ViewBox => {
  const { overview } = render;
  const width = render.width * (overview.width / render.width) ** zoomOut;
  const height = (width * render.height) / render.width;
  const pan = overview.width === render.width ? zoomOut : (width - render.width) / (overview.width - render.width);
  const centerX = render.width / 2 + (overview.x + overview.width / 2 - render.width / 2) * pan;
  const centerY = render.height / 2 + (overview.y + overview.height / 2 - render.height / 2) * pan;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
};

/** Circle (in map coordinates) around countries too small to spot at this view, or null. */
export const markerAt = (render: CountryMapRender, view: ViewBox): { cx: number; cy: number; r: number } | null => {
  const pxPerUnit = render.width / view.width;
  const tiny =
    render.focus.width * pxPerUnit < MARKER_THRESHOLD_PX && render.focus.height * pxPerUnit < MARKER_THRESHOLD_PX;
  return tiny ? { cx: render.center.x, cy: render.center.y, r: MARKER_RADIUS_PX / pxPerUnit } : null;
};
