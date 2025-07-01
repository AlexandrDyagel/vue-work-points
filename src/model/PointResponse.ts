import { Location } from '@/model/Location.ts'
import { TypePoint } from '@/model/Enums.ts'

export class PointResponse {
  readonly uid: string
  readonly type: TypePoint
  readonly name: string
  readonly direction: string
  readonly address: string
  readonly location: Location

  constructor(uid: string, type: TypePoint, name: string, direction: string, address: string, location: Location) {
    this.uid = uid
    this.type = type
    this.name = name
    this.direction = direction
    this.address = address
    this.location = location
  }
}
