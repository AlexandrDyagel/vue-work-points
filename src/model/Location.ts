import type { GeoPoint } from '@/model/GeoPoint.ts'

export class Location {
  readonly toRegion: GeoPoint
  readonly fromRegion: GeoPoint

  constructor(toRegion: GeoPoint, fromRegion: GeoPoint) {
    this.toRegion = toRegion
    this.fromRegion = fromRegion
  }
}
