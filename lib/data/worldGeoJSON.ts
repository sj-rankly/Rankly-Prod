// World GeoJSON data URL - we'll fetch this dynamically
export const WORLD_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'

// Fallback: simplified world data (will be replaced by fetched data)
export const worldGeoJSON = {
  type: 'FeatureCollection',
  features: []
}
