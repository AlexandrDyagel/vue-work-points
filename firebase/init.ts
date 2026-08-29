import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { PointResponse } from '@/model/PointResponse.ts'
import type { PointRequest } from '@/model/PointRequest.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { Location } from '@/model/Location.ts'
import { FirestoreCollectionNames, TypePoint } from '@/model/Enums.ts'

const firebaseConfig = {
  apiKey: 'AIzaSyAU1dbTQNeoTvXX-399VjvYXs0DHK-pKuc',
  projectId: 'vue-work-points-firebase',
  appId: 'vue-work-points-firebase'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

/**
 * Сериализует вложенную структуру Location в plain-объект для Firestore.
 */
function serializeLocation(location: Location) {
  return {
    toRegion: {
      latitude: location.toRegion.latitude,
      longitude: location.toRegion.longitude,
    },
    fromRegion: {
      latitude: location.fromRegion.latitude,
      longitude: location.fromRegion.longitude,
    },
  }
}

/**
 * Сериализует PointRequest в plain-объект для Firestore.
 * Заменяет уязвимую конструкцию JSON.parse(JSON.stringify(...)).
 */
function serializePoint(point: PointRequest) {
  return {
    type: point.type,
    name: point.name,
    direction: point.direction,
    address: point.address,
    location: serializeLocation(point.location),
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  }
}

/**
 * Преобразует документ Firestore в PointResponse с проверкой на отсутствующие поля.
 */
function mapDocToPoint(snapshotDoc: QueryDocumentSnapshot): PointResponse {
  const data = snapshotDoc.data()

  return new PointResponse(
    snapshotDoc.id,
    (data.type as TypePoint) ?? TypePoint.TP,
    data.name ?? '',
    data.direction ?? '',
    data.address ?? '',
    new Location(
      new GeoPoint(
        data.location?.toRegion?.latitude ?? '',
        data.location?.toRegion?.longitude ?? '',
      ),
      new GeoPoint(
        data.location?.fromRegion?.latitude ?? '',
        data.location?.fromRegion?.longitude ?? '',
      ),
    ),
    data.createdAt ?? '',
    data.updatedAt ?? '',
  )
}

async function getPoints(): Promise<PointResponse[]> {
  const pointsCol = collection(db, FirestoreCollectionNames.POINTS)
  const pointSnapshot = await getDocs(pointsCol)

  return pointSnapshot.docs.map(mapDocToPoint)
}

async function addPoint(point: PointRequest | null): Promise<void> {
  if (!point) return

  const pointsCol = doc(collection(db, FirestoreCollectionNames.POINTS))
  await setDoc(pointsCol, serializePoint(point))
}

async function updatePoint(id: string, point: PointRequest): Promise<void> {
  const pointDocRef = doc(db, FirestoreCollectionNames.POINTS, id)
  await updateDoc(pointDocRef, serializePoint(point))
}

// Последнее обновление данных
async function lastUpdatedPoints(): Promise<string> {
  const q = query(
    collection(db, FirestoreCollectionNames.POINTS),
    orderBy('updatedAt', 'desc'),
    limit(1)
  )
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs[0]?.data()?.updatedAt ?? ''
}

async function deletePoint(id: string): Promise<void> {
  await deleteDoc(doc(db, FirestoreCollectionNames.POINTS, id))
}

export { getPoints, addPoint, updatePoint, deletePoint, lastUpdatedPoints }
