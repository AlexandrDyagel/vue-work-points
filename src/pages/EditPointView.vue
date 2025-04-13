<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useEditPoint, useObtainPoints } from '../../store/Point.ts'
import { ref } from 'vue'
import { PointRequest } from '@/model/PointRequest.ts'
import { Location } from '@/model/Location.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { BackButton } from 'vue-tg'
import { deletePoint, updatePoint } from '../../firebase/init.ts'
import { PointResponse } from '@/model/PointResponse.ts'

const router = useRouter()
const editPointStore = useEditPoint()
const obtainPointsStore = useObtainPoints()

const progressUpdate = ref(false)
const progressDelete = ref(false)

const point: PointResponse = editPointStore.editPoint

const type = ref(point.type)
const name = ref(point.name)
const direction = ref(point.direction)
const address = ref(point.address)
const locationToRegion = ref(`${point.location.toRegion.latitude}, ${point.location.toRegion.longitude}`)
const locationFromRegion = ref(`${point.location.fromRegion.latitude}, ${point.location.fromRegion.longitude}`)

function formatPoints(locationString: string): string[] {
  const locPoints = locationString.toString().split(',')
  const lat = locPoints[0].trim()
  const lon = locPoints[1].trim()

  return [lat, lon]
}

function update() {
  try {
    progressUpdate.value = true
    const locToRegion = formatPoints(locationToRegion.value)
    const locFromRegion = formatPoints(locationFromRegion.value)

    const pointRequest = new PointRequest(
      type.value,
      name.value,
      direction.value,
      address.value,
      new Location(
        new GeoPoint(locToRegion[0], locToRegion[1]),
        new GeoPoint(locFromRegion[0], locFromRegion[1]),
      )
    )

    updatePoint(point.uid, pointRequest)
      .then(() => {
        console.log('Обнавлено в БД')
        obtainPointsStore.updatePoints(true)
        progressUpdate.value = false
        router.back()
      }, error => {
        console.log(`Ошибка error: ${error}`)
        progressUpdate.value = false
      })
  } catch (e) {
    console.log(`Ошибка при обновлении: ${e}`)
    progressUpdate.value = false
  }
}

function delPoint() {
  try {
    progressDelete.value = true
    deletePoint(point.uid)
      .then(() => {
        console.log('Удалено из БД')
        obtainPointsStore.updatePoints(true)
        progressDelete.value = false
        router.back()
      }, error => {
        console.log(`Ошибка error: ${error}`)
        progressDelete.value = false
      })
  } catch (e) {
    console.log(`Ошибка при удалении: ${e}`)
    progressDelete.value = false
  }
}

</script>

<template>

  <BackButton @click="router.back" />
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
    <p class="text-[#ccc] text-center text-2xl mt-4"><strong>Обновление точки</strong></p>
    <div class="ms-4 me-4 mt-4">
      <select
        v-model="type"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
      >
        <option value="тп">Тоннель пешеходный</option>
        <option value="та">Тоннель автодорожный</option>
        <option value="пп">Путепровод пешеходный. Переход надземный</option>
      </select>
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="name"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Name"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="direction"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Direction"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="address"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Address"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="toRegion">В область</label>
      <input
        id="toRegion"
        v-model="locationToRegion"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Location to region"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="fromRegion">Из области</label>
      <input
        id="fromRegion"
        v-model="locationFromRegion"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Location from region"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <div
        @click="update"
        class="text-center w-full shadow-xl start-4 end-4 mb-4 border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
      >
        {{ progressUpdate ? 'Выполняется обновление. Подождите...' : 'Обновить' }}
      </div>

      <div
        @click="delPoint"
        class="text-center w-full shadow-xl start-4 end-4 bottom-4 border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
      >
        {{ progressDelete ? 'Выполняется удаление. Подождите...' : 'Удалить' }}
      </div>

    </div>
  </div>

</template>

<style scoped>

</style>
