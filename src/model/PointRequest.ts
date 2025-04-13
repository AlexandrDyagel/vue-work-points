import { Location } from '@/model/Location.ts'

export class PointRequest {
  readonly type: string
  readonly name: string
  readonly direction: string
  readonly address: string
  readonly location: Location

  constructor(type: string, name: string, direction: string, address: string, location: Location) {
    this.type = type
    this.name = name
    this.direction = direction
    this.address = address
    this.location = location
  }
}
