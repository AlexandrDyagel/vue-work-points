// Интерфейс для точки маршрута
export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

// Интерфейс для узла дорожной сети
export interface RoadNode {
  id: string;
  lat: number;
  lng: number;
  connections: Set<string>;
}

// Интерфейс для дорожного пути
export interface RoadWay {
  nodes: string[];
  tags: Record<string, string>;
}

// Интерфейс для границ карты
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Интерфейс для построенного маршрута
export interface BuiltRoute {
  from: string;
  to: string;
  color: string;
  polyline: L.Polyline;
  points: number;
}

// Интерфейс для данных OSM
export interface OSMElement {
  type: string;
  id: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface OSMResponse {
  elements: OSMElement[];
}
