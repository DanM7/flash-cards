import { geoAlbersUsa, geoCentroid, geoDistance, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature, neighbors } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usData from "us-atlas/states-10m.json";
import { fitAspect, type MapRender } from "./mapView";

interface StateProperties {
  name: string;
}

type StateFeature = Feature<Polygon | MultiPolygon, StateProperties>;

const topology = usData as unknown as Topology<{
  states: GeometryCollection<StateProperties>;
  nation: GeometryCollection;
}>;
const geometries = topology.objects.states.geometries;
const features = (feature(topology, topology.objects.states) as FeatureCollection<Polygon | MultiPolygon, StateProperties>)
  .features as StateFeature[];
const nation = feature(topology, topology.objects.nation);
const adjacency = neighbors(geometries);
const centroids = features.map((state) => geoCentroid(state));
const indexByName = new Map(features.map((state, index) => [state.properties.name, index]));

/** FIPS codes above Wyoming's are territories (Puerto Rico, Guam, ...), which the U.S. map doesn't show. */
const LAST_STATE_FIPS = 56;
const onMap = features.map((state) => Number(state.id) <= LAST_STATE_FIPS);

/** Share of the view the state fills, so its neighbors show around it. */
const CONTEXT_ZOOM = 0.45;
/** Small states zoom in at most this much past the whole-country view, so neighbors stay in sight. */
const MAX_ZOOM = 6;
const OVERVIEW_PADDING = 0.03;
/** Covers every view; the U.S. map has no globe outline to shade behind the land. */
const BACKGROUND_PATH = "M-100000,-100000H100000V100000H-100000Z";

export const hasState = (name: string): boolean => indexByName.has(name);

/** Great-circle distance in radians between two states' centers. */
export const stateDistance = (a: string, b: string): number => {
  const ia = indexByName.get(a);
  const ib = indexByName.get(b);
  return ia == null || ib == null ? Number.POSITIVE_INFINITY : geoDistance(centroids[ia], centroids[ib]);
};

/** Names of the states (and D.C.) that share a border with this one. */
export const neighborNamesOf = (name: string): string[] => {
  const index = indexByName.get(name);
  return index == null ? [] : adjacency[index].map((other) => features[other].properties.name);
};

/**
 * Blank U.S. map (Alaska and Hawaii inset, as on most U.S. maps) centered on one state, which is kept separate
 * for highlighting. The overview takes in the whole country. `capital` is a [longitude, latitude] to mark.
 */
export const renderStateMap = (
  name: string,
  width: number,
  height: number,
  capital?: [number, number]
): MapRender | null => {
  const index = indexByName.get(name);
  if (index == null) {
    return null;
  }
  const state = features[index];
  const extent: [[number, number], [number, number]] = [
    [0, 0],
    [width, height]
  ];
  const countryScale = geoAlbersUsa().fitExtent(extent, nation).scale();
  const projection = geoAlbersUsa().fitExtent(extent, state);
  projection.scale(Math.min(projection.scale() * CONTEXT_ZOOM, countryScale * MAX_ZOOM));
  const [[bx0, by0], [bx1, by1]] = geoPath(projection).bounds(state);
  const [tx, ty] = projection.translate();
  projection.translate([tx + width / 2 - (bx0 + bx1) / 2, ty + height / 2 - (by0 + by1) / 2]);

  const path = geoPath(projection);
  const [[nx0, ny0], [nx1, ny1]] = path.bounds(nation);
  const padX = (nx1 - nx0) * OVERVIEW_PADDING;
  const padY = (ny1 - ny0) * OVERVIEW_PADDING;
  const overview = fitAspect(
    { x: nx0 - padX, y: ny0 - padY, width: nx1 - nx0 + 2 * padX, height: ny1 - ny0 + 2 * padY },
    width / height
  );

  const land: string[] = [];
  features.forEach((other, otherIndex) => {
    if (otherIndex !== index && onMap[otherIndex]) {
      land.push(path(other) as string);
    }
  });
  const [[x0, y0], [x1, y1]] = path.bounds(state);
  const point = capital ? projection(capital) : null;

  return {
    width,
    height,
    overview,
    spherePath: BACKGROUND_PATH,
    landPath: land.join(""),
    targetPath: path(state) as string,
    focus: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
    center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
    ...(point ? { capital: { x: point[0], y: point[1] } } : {})
  };
};
