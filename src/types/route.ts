/**
 * Valhalla Route Types
 * Based on Valhalla API specification
 */

/** Supported costing models for routing */
export type CostingModel = 'auto' | 'bicycle' | 'pedestrian' | 'truck'

/** Coordinate location */
export interface Location {
  lat: number
  lon: number
  /** Optional: Type of location (break, through, via) */
  type?: 'break' | 'through' | 'via'
  /** Optional: Preferred side of street */
  side_of_street?: 'same' | 'opposite' | 'either'
  /** Optional: Search radius in meters */
  search_radius?: number
  /** Optional: Heading in degrees (0-360) */
  heading?: number
  /** Optional: Heading tolerance in degrees */
  heading_tolerance?: number
  /** Optional: Street name hint */
  street?: string
  /** Optional: Minimum road class */
  minimum_reachability?: number
  /** Optional: Radius for snapping to road */
  radius?: number
}

/** Auto/Car costing options */
export interface AutoCostingOptions {
  /** Preference for toll roads (0-1, default 0.5) */
  toll_booth_penalty?: number
  /** Preference for highways (0-1, default 1.0) */
  use_highways?: number
  /** Preference for toll roads (0-1, default 0.5) */
  use_tolls?: number
  /** Preference for ferry routes (0-1, default 0.5) */
  use_ferry?: number
  /** Vehicle height in meters */
  height?: number
  /** Vehicle width in meters */
  width?: number
  /** Top speed in km/h */
  top_speed?: number
}

/** Bicycle costing options */
export interface BicycleCostingOptions {
  /** Bicycle type */
  bicycle_type?: 'Road' | 'Hybrid' | 'Cross' | 'Mountain'
  /** Cycling speed in km/h */
  cycling_speed?: number
  /** Preference for hills (0-1, default 0.5) */
  use_hills?: number
  /** Preference for roads (vs paths) (0-1, default 0.5) */
  use_roads?: number
  /** Avoid bad surfaces (0-1, default 0.25) */
  avoid_bad_surfaces?: number
}

/** Pedestrian costing options */
export interface PedestrianCostingOptions {
  /** Walking speed in km/h (default 5.1) */
  walking_speed?: number
  /** Walkway factor (default 1.0) */
  walkway_factor?: number
  /** Sidewalk factor (default 1.0) */
  sidewalk_factor?: number
  /** Alley factor (default 2.0) */
  alley_factor?: number
  /** Driveway factor (default 5.0) */
  driveway_factor?: number
  /** Step penalty in seconds */
  step_penalty?: number
  /** Max hiking difficulty (0-6) */
  max_hiking_difficulty?: number
}

/** Truck costing options */
export interface TruckCostingOptions {
  /** Vehicle height in meters */
  height?: number
  /** Vehicle width in meters */
  width?: number
  /** Vehicle length in meters */
  length?: number
  /** Vehicle weight in metric tons */
  weight?: number
  /** Axle load in metric tons */
  axle_load?: number
  /** Hazardous materials */
  hazmat?: boolean
}

/** Costing options union type */
export type CostingOptions = 
  | AutoCostingOptions 
  | BicycleCostingOptions 
  | PedestrianCostingOptions 
  | TruckCostingOptions

/** Directions output type */
export type DirectionsType = 'none' | 'maneuvers' | 'instructions'

/** Route request parameters */
export interface RouteRequest {
  /** Array of locations (minimum 2) */
  locations: Location[]
  /** Costing model to use */
  costing: CostingModel
  /** Costing options for the selected model */
  costing_options?: {
    auto?: AutoCostingOptions
    bicycle?: BicycleCostingOptions
    pedestrian?: PedestrianCostingOptions
    truck?: TruckCostingOptions
  }
  /** Type of directions to return */
  directions_type?: DirectionsType
  /** Units for distance (km or mi) */
  units?: 'kilometers' | 'miles'
  /** Language for maneuver instructions */
  language?: string
  /** Include shape in response */
  shape_format?: 'polyline5' | 'polyline6' | 'geojson'
  /** Number of alternate routes to return */
  alternates?: number
  /** Exclude specific road types */
  exclude_locations?: Location[]
  /** Date/time for time-dependent routing */
  date_time?: {
    type: 0 | 1 | 2 | 3
    value: string
  }
}

/** Maneuver type enumeration */
export type ManeuverType =
  | 'kNone'
  | 'kStart'
  | 'kStartRight'
  | 'kStartLeft'
  | 'kDestination'
  | 'kDestinationRight'
  | 'kDestinationLeft'
  | 'kBecomes'
  | 'kContinue'
  | 'kSlightRight'
  | 'kRight'
  | 'kSharpRight'
  | 'kUturnRight'
  | 'kUturnLeft'
  | 'kSharpLeft'
  | 'kLeft'
  | 'kSlightLeft'
  | 'kRampStraight'
  | 'kRampRight'
  | 'kRampLeft'
  | 'kExitRight'
  | 'kExitLeft'
  | 'kStayStraight'
  | 'kStayRight'
  | 'kStayLeft'
  | 'kMerge'
  | 'kRoundaboutEnter'
  | 'kRoundaboutExit'
  | 'kFerryEnter'
  | 'kFerryExit'
  | 'kTransit'
  | 'kTransitTransfer'
  | 'kTransitRemainOn'
  | 'kTransitConnectionStart'
  | 'kTransitConnectionTransfer'
  | 'kTransitConnectionDestination'
  | 'kPostTransitConnectionDestination'

/** Turn-by-turn maneuver */
export interface Maneuver {
  /** Type of maneuver */
  type: number
  /** Human-readable instruction */
  instruction: string
  /** Verbal instruction for TTS */
  verbal_pre_transition_instruction?: string
  /** Post-transition verbal instruction */
  verbal_post_transition_instruction?: string
  /** Verbal alert instruction */
  verbal_succinct_transition_instruction?: string
  /** Street names */
  street_names?: string[]
  /** Begin street names */
  begin_street_names?: string[]
  /** Length of this maneuver in units specified */
  length: number
  /** Estimated time in seconds */
  time: number
  /** Begin shape index */
  begin_shape_index: number
  /** End shape index */
  end_shape_index: number
  /** Toll road indicator */
  toll?: boolean
  /** Highway indicator */
  highway?: boolean
  /** Rough surface indicator */
  rough?: boolean
  /** Travel mode for this maneuver */
  travel_mode: string
  /** Travel type for this maneuver */
  travel_type: string
}

/** Route leg (between two consecutive locations) */
export interface RouteLeg {
  /** Summary information */
  summary: {
    /** Total length in units specified */
    length: number
    /** Total time in seconds */
    time: number
    /** Minimum latitude */
    min_lat: number
    /** Minimum longitude */
    min_lon: number
    /** Maximum latitude */
    max_lat: number
    /** Maximum longitude */
    max_lon: number
  }
  /** Array of maneuvers */
  maneuvers: Maneuver[]
  /** Encoded polyline shape */
  shape: string
}

/** Complete route response */
export interface RouteResponse {
  /** Route ID */
  id?: string
  /** Trip information */
  trip: {
    /** Array of route legs */
    legs: RouteLeg[]
    /** Trip summary */
    summary: {
      /** Total length */
      length: number
      /** Total time in seconds */
      time: number
      /** Minimum latitude */
      min_lat: number
      /** Minimum longitude */
      min_lon: number
      /** Maximum latitude */
      max_lat: number
      /** Maximum longitude */
      max_lon: number
    }
    /** Status code */
    status: number
    /** Status message */
    status_message: string
    /** Units used */
    units: string
    /** Language used */
    language: string
    /** Locations with additional info */
    locations: Array<Location & {
      original_index?: number
    }>
  }
  /** Alternate routes if requested */
  alternates?: RouteResponse[]
}

/** Route calculation error */
export interface RouteError {
  /** Error code */
  error_code: number
  /** Error message */
  error: string
  /** HTTP status code */
  status_code: number
  /** Status text */
  status: string
}
