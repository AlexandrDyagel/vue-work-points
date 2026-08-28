const API_KEY = 'AIzaSyAU1dbTQNeoTvXX-399VjvYXs0DHK-pKuc'
const PROJECT_ID = 'vue-work-points-firebase'
const COLLECTION = 'points'
const OUTPUT_FILE = 'points.json'

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`

const stringValue = (field) => field?.stringValue ?? ''

function toPoint(doc) {
  const f = doc.fields
  const loc = f.location?.mapValue?.fields ?? {}

  const readGeo = (geo) => ({
    latitude: stringValue(geo?.mapValue?.fields?.latitude),
    longitude: stringValue(geo?.mapValue?.fields?.longitude),
  })

  return {
    uid: doc.name.split('/').pop(),
    type: stringValue(f.type),
    name: stringValue(f.name),
    direction: stringValue(f.direction),
    address: stringValue(f.address),
    location: {
      toRegion: readGeo(loc.toRegion),
      fromRegion: readGeo(loc.fromRegion),
    },
    createdAt: stringValue(f.createdAt),
    updatedAt: stringValue(f.updatedAt),
  }
}

async function main() {
  const points = []
  let nextPageToken = null

  do {
    const url = new URL(BASE)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('pageSize', '500')
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken)

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    }

    const data = await res.json()
    const docs = data.documents ?? []
    for (const doc of docs) points.push(toPoint(doc))

    nextPageToken = data.nextPageToken ?? null
    console.error(`Загружено документов: ${points.length}`)
  } while (nextPageToken)

  const { writeFileSync } = await import('node:fs')
  writeFileSync(OUTPUT_FILE, JSON.stringify(points, null, 2), 'utf8')
  console.error(`Готово. Всего точек: ${points.length}. Файл: ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
