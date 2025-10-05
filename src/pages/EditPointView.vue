<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useEditPoint } from '@/store/Point.ts'
import { onMounted, ref } from 'vue'
import { PointRequest } from '@/model/PointRequest.ts'
import { Location } from '@/model/Location.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { BackButton } from 'vue-tg'
import { deletePoint, updatePoint } from '../../firebase/init.ts'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import { useInputFocus } from '@/store/TopAppBar.ts'

const router = useRouter()

const { clearCachePoints, setLastUpdateDataPoints, obtainCachedPoints } = useCache()
const inputTopAppBarStore = useInputFocus()

const editPointStore = useEditPoint()

const progressUpdate = ref(false)
const progressDelete = ref(false)

const point: PointResponse = editPointStore.editPoint

const isLoadingData = ref(false)
const directions = ref(new Set<string>())
const type = ref(point.type)
const name = ref(point.name)
const direction = ref(point.direction)
const address = ref(point.address)
const locationToRegion = ref(
  `${point.location.toRegion.latitude}, ${point.location.toRegion.longitude}`,
)
const locationFromRegion = ref(
  `${point.location.fromRegion.latitude}, ${point.location.fromRegion.longitude}`,
)

function formatPoints(locationString: string): string[] {
  const locPoints = locationString.toString().split(',')
  const lat = locPoints[0].trim()
  const lon = locPoints[1].trim()

  return [lat, lon]
}

onMounted(async () => {
  try {
    isLoadingData.value = true

    await obtainCachedPoints().then((cachedDataPoints) => {
      cachedDataPoints
        .map((point) => point.direction)
        .forEach((directionName) => {
          directions.value.add(directionName)
        })
    })
  } catch (e) {
    console.error(`Ошибка AddPointView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

function update() {
  try {
    progressUpdate.value = true
    const locToRegion = formatPoints(locationToRegion.value)
    const locFromRegion = formatPoints(locationFromRegion.value)

    const dateNow = Date.now().toString()

    const pointRequest = new PointRequest(
      type.value,
      name.value,
      direction.value,
      address.value,
      new Location(
        new GeoPoint(locToRegion[0], locToRegion[1]),
        new GeoPoint(locFromRegion[0], locFromRegion[1]),
      ),
      point.createdAt,
      dateNow,
    )

    updatePoint(point.uid, pointRequest).then(
      () => {
        console.log('Обнавлено в БД')
        setLastUpdateDataPoints(dateNow)
        clearCachePoints()
        progressUpdate.value = false
        router.back()
      },
      (error) => {
        console.log(`Ошибка error: ${error}`)
        progressUpdate.value = false
      },
    )
  } catch (e) {
    console.log(`Ошибка при обновлении: ${e}`)
    progressUpdate.value = false
  }
}

function delPoint() {
  try {
    progressDelete.value = true
    deletePoint(point.uid).then(
      () => {
        console.log('Удалено из БД')
        clearCachePoints()
        progressDelete.value = false
        router.back()
      },
      (error) => {
        console.log(`Ошибка error: ${error}`)
        progressDelete.value = false
      },
    )
  } catch (e) {
    console.log(`Ошибка при удалении: ${e}`)
    progressDelete.value = false
  }
}

const handleFocus = () => inputTopAppBarStore.changeFocus(true)

const handleBlur = () => inputTopAppBarStore.changeFocus(false)
</script>

<template>
  <BackButton @click="router.back" />
  <div
    class="fixed overflow-scroll start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528] pb-[80px]"
  >
    <p class="text-[#ccc] text-center text-2xl mt-4"><strong>Обновление точки</strong></p>
    <div class="ms-4 me-4 mt-4">
      <select
        v-model="type"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
      >
        <option value="тп">Тоннель пешеходный</option>
        <option value="та">Тоннель автодорожный</option>
        <option value="пп">Путепровод пешеходный. Переход надземный</option>
        <option value="уч">Участок</option>
      </select>
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="name"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Название"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <select
        v-model="direction"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
      >
        <option v-for="[index, dirName] of directions.entries()" :key="index" :value="dirName">
          {{ dirName }}
        </option>
      </select>
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="address"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Адрес"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="toRegion">В область (Внешняя)</label>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        id="toRegion"
        v-model="locationToRegion"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Координаты в регион"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="fromRegion">Из области (Внутренняя)</label>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        id="fromRegion"
        v-model="locationFromRegion"
        class="w-full shadow-xl start-4 end-4 bottom-4 rounded-lg bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Координаты из региона"
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

<style scoped></style>
