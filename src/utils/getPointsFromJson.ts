import { PointResponse } from '@/model/PointResponse.ts'
import { Location } from '@/model/Location.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { TypePoint } from '@/model/Enums.ts'

interface RawPoint {
  uid: string
  type: string
  name: string
  direction: string
  address: string
  location: {
    toRegion: { latitude: string; longitude: string }
    fromRegion: { latitude: string; longitude: string }
  }
  createdAt: string
  updatedAt: string
}

/**
 * Возвращает точки из локального файла points.json в том же виде,
 * что и функция getPoints() (Promise<PointResponse[]>).
 */
export async function getPointsFromJson(): Promise<PointResponse[]> {
  const response = await fetch('/points.json')

  if (!response.ok) {
    throw new Error(`Не удалось загрузить points.json: ${response.status}`)
  }

  const rawPoints: RawPoint[] = await response.json()

  return rawPoints.map(
    (p) =>
      new PointResponse(
        p.uid,
        p.type as TypePoint,
        p.name,
        p.direction,
        p.address,
        new Location(
          new GeoPoint(p.location.toRegion.latitude, p.location.toRegion.longitude),
          new GeoPoint(p.location.fromRegion.latitude, p.location.fromRegion.longitude),
        ),
        p.createdAt,
        p.updatedAt,
      ),
  )
}
