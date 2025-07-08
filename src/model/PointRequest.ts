import { Location } from '@/model/Location.ts'

export class PointRequest {
  readonly type: string
  readonly name: string
  readonly direction: string
  readonly address: string
  readonly location: Location
  readonly createdAt: string
  readonly updatedAt: string

  constructor(type: string,
              name: string,
              direction: string,
              address: string,
              location: Location,
              createdAt: string,
              updatedAt: string) {
    this.type = type
    this.name = name
    this.direction = direction
    this.address = address
    this.location = location
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }
}
