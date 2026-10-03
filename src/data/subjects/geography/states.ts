export interface GeographyState {
  name: string;
  capital: string;
  /** northeast, southeast, midwest, southwest, or west. */
  region: string;
  /** [longitude, latitude] of the capital, marked on the map. */
  capitalCoordinates: [number, number];
}

export interface UnitedStatesGeography {
  /** Wrong answers on a state card come from this many of the closest states in the deck. */
  nearbyStates: number;
  /** Asked on every state map card. */
  stateQuestion: string;
  /** Asked on every capital card; "{state}" becomes the state's name. */
  capitalQuestion: string;
  unitedStates: GeographyState[];
}

/** The states in these regions, or every state when left out. */
export const statesIn = (geography: UnitedStatesGeography, regions: string[] | undefined): GeographyState[] =>
  regions ? geography.unitedStates.filter((state) => regions.includes(state.region)) : geography.unitedStates;
