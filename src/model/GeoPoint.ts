export class GeoPoint {
  readonly latitude: string
  readonly longitude: string

  constructor(latitude: string = "", longitude: string = "") {
    this.latitude = latitude
    this.longitude = longitude
  }
}
