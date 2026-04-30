// ── Map Locations ────────────────────────────────────────────────────────────
// Each location ties to lesson completions. Completing linked lessons unlocks
// the location and upgrades its tier (bronze → silver → gold).

import type { MapLocation } from "@/lib/lesson-types";

// ── Mandarin Locations ───────────────────────────────────────────────────────

export const MANDARIN_LOCATIONS: MapLocation[] = [
  {
    id: "zh-map-street-beijing",
    name: "Streets of Beijing",
    country: "China",
    locationType: "street",
    lat: 39.9042,
    lng: 116.4074,
    languageCode: "zh",
    linkedLessonIds: ["zh-u1-l2", "zh-u6-l1"],
  },
  {
    id: "zh-map-hotel-beijing",
    name: "Hotel in Beijing",
    country: "China",
    locationType: "hotel",
    lat: 39.92,
    lng: 116.46,
    languageCode: "zh",
    linkedLessonIds: ["zh-u2-l1", "zh-u2-l2"],
  },
  {
    id: "zh-map-cafe-beijing",
    name: "Café in Beijing",
    country: "China",
    locationType: "cafe",
    lat: 39.93,
    lng: 116.39,
    languageCode: "zh",
    linkedLessonIds: ["zh-u4-l1", "zh-u4-l2", "zh-u3-l1"],
  },
  {
    id: "zh-map-market-beijing",
    name: "Market in Beijing",
    country: "China",
    locationType: "market",
    lat: 39.89,
    lng: 116.42,
    languageCode: "zh",
    linkedLessonIds: ["zh-u3-l1", "zh-u6-l1", "zh-u3-l2"],
  },
  {
    id: "zh-map-station-shanghai",
    name: "Train Station in Shanghai",
    country: "China",
    locationType: "station",
    lat: 31.2304,
    lng: 121.4737,
    languageCode: "zh",
    linkedLessonIds: ["zh-u5-l1", "zh-u5-l2"],
  },
  {
    id: "zh-map-airport-shanghai",
    name: "Airport in Shanghai",
    country: "China",
    locationType: "airport",
    lat: 31.14,
    lng: 121.81,
    languageCode: "zh",
    linkedLessonIds: ["zh-u5-l2", "zh-u2-l1"],
  },
];

// ── Spanish Locations ────────────────────────────────────────────────────────

export const SPANISH_LOCATIONS: MapLocation[] = [
  {
    id: "es-map-street-madrid",
    name: "Streets of Madrid",
    country: "Spain",
    locationType: "street",
    lat: 40.4168,
    lng: -3.7038,
    languageCode: "es",
    linkedLessonIds: ["es-u1-l1"],
  },
  {
    id: "es-map-hotel-madrid",
    name: "Hotel in Madrid",
    country: "Spain",
    locationType: "hotel",
    lat: 40.42,
    lng: -3.69,
    languageCode: "es",
    linkedLessonIds: ["es-u1-l2"],
  },
  {
    id: "es-map-cafe-madrid",
    name: "Café in Madrid",
    country: "Spain",
    locationType: "cafe",
    lat: 40.41,
    lng: -3.71,
    languageCode: "es",
    linkedLessonIds: ["es-u3-l1", "es-u2-l1"],
  },
  {
    id: "es-map-station-barcelona",
    name: "Station in Barcelona",
    country: "Spain",
    locationType: "station",
    lat: 41.3851,
    lng: 2.1734,
    languageCode: "es",
    linkedLessonIds: ["es-u4-l1"],
  },
];

// ── French Locations ─────────────────────────────────────────────────────────

export const FRENCH_LOCATIONS: MapLocation[] = [
  {
    id: "fr-map-street-paris",
    name: "Streets of Paris",
    country: "France",
    locationType: "street",
    lat: 48.8566,
    lng: 2.3522,
    languageCode: "fr",
    linkedLessonIds: ["fr-u1-l1"],
  },
  {
    id: "fr-map-hotel-paris",
    name: "Hotel in Paris",
    country: "France",
    locationType: "hotel",
    lat: 48.86,
    lng: 2.34,
    languageCode: "fr",
    linkedLessonIds: ["fr-u1-l2"],
  },
  {
    id: "fr-map-cafe-paris",
    name: "Café in Paris",
    country: "France",
    locationType: "cafe",
    lat: 48.85,
    lng: 2.36,
    languageCode: "fr",
    linkedLessonIds: ["fr-u2-l1"],
  },
  {
    id: "fr-map-station-paris",
    name: "Gare du Nord",
    country: "France",
    locationType: "station",
    lat: 48.88,
    lng: 2.36,
    languageCode: "fr",
    linkedLessonIds: ["fr-u3-l1"],
  },
];

// ── All locations ────────────────────────────────────────────────────────────

export const ALL_MAP_LOCATIONS: MapLocation[] = [
  ...MANDARIN_LOCATIONS,
  ...SPANISH_LOCATIONS,
  ...FRENCH_LOCATIONS,
];

export function getLocationsForLanguage(code: string): MapLocation[] {
  return ALL_MAP_LOCATIONS.filter((l) => l.languageCode === code);
}

export function getLocationById(id: string): MapLocation | undefined {
  return ALL_MAP_LOCATIONS.find((l) => l.id === id);
}

// ── Location type icons (Ionicons names) ─────────────────────────────────────

export const LOCATION_ICONS: Record<MapLocation["locationType"], string> = {
  cafe: "cafe-outline",
  airport: "airplane-outline",
  store: "storefront-outline",
  hotel: "bed-outline",
  street: "walk-outline",
  restaurant: "restaurant-outline",
  station: "train-outline",
  market: "cart-outline",
  school: "school-outline",
  hospital: "medkit-outline",
};
