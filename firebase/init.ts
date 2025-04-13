import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js"
import { collection, getDocs, setDoc, doc, updateDoc, deleteDoc , addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js"
import { query, orderBy, limit, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js"
import { PointResponse } from '@/model/PointResponse.ts'
import type { PointRequest } from '@/model/PointRequest.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { Location } from '@/model/Location.ts'

const firebaseConfig = {
  apiKey: "AIzaSyAU1dbTQNeoTvXX-399VjvYXs0DHK-pKuc",
  projectId: "vue-work-points-firebase",
  appId: "vue-work-points-firebase"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function getPoints() {
  const pointsCol = collection(db, 'points');
  const pointSnapshot = await getDocs(pointsCol);

  return pointSnapshot.docs.map(doc => new PointResponse(
    doc.id,
    doc.data().type,
    doc.data().name,
    doc.data().direction,
    doc.data().address,
    new Location(
      new GeoPoint(
        doc.data().location.toRegion.latitude,
        doc.data().location.toRegion.longitude
      ),
      new GeoPoint(
        doc.data().location.fromRegion.latitude,
        doc.data().location.fromRegion.longitude
      )
    )
  ))
}

async function addPoint(point: PointRequest | null) {
  if (point === null) return
  const pointsCol = doc(collection(db, 'points'));
  await setDoc(pointsCol, JSON.parse(JSON.stringify(point)))
}

async function updatePoint(id: string, point: PointRequest) {
  const pointDocRef = doc(db, 'points', id);
  await updateDoc(pointDocRef, JSON.parse(JSON.stringify(point)))
}

/*async function getPoint(id: string) {
  const pointsColRef = collection(db, 'points')
  const q = query(pointsColRef, where('documentId', '==', id))
  const querySnapshot = await getDocs(q)

  return {
    documentId: querySnapshot.docs[0].id,
    data: querySnapshot.docs[0].data()
  }
}*/

async function deletePoint(id: string) {
  await deleteDoc(doc(db, "points", id));
}

export { getPoints, addPoint, updatePoint, deletePoint }
