export default function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + ' км'
  }
  return Math.round(meters) + ' м'
}
