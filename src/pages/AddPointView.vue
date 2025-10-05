<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addPoint } from '../../firebase/init.ts'
import { BackButton } from 'vue-tg'
import { PointRequest } from '@/model/PointRequest.ts'
import { Location } from '@/model/Location.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { TypePoint } from '@/model/Enums.ts'
import { useCache } from '@/composables/useCache.ts'
import { useInputFocus } from '@/store/TopAppBar.ts'

const progress = ref(false)
const isLoadingData = ref(false)

const type = ref(TypePoint.TP)
const name = ref('')
const address = ref('')
const locToRegion = ref('')
const locFromRegion = ref('')
const directions = ref(new Set<string>())
const direction = ref()
const isAddNewDirection = ref(false)
const newDirection = ref('')

const router = useRouter()

const { clearCachePoints, setLastUpdateDataPoints, obtainCachedPoints } = useCache()
const inputTopAppBarStore = useInputFocus()

onMounted(async () => {
  try {
    isLoadingData.value = true

    await obtainCachedPoints().then((cachedDataPoints) => {
      cachedDataPoints
        .map((point) => point.direction)
        .forEach((directionName) => {
          directions.value.add(directionName)
        })
      directions.value.add('+')
      direction.value = Array.from(directions.value)[0]
    })
  } catch (e) {
    console.error(`Ошибка AddPointView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

function parseLocationString(stringLocation: string): { lat: string; lon: string } {
  const locPoints = stringLocation.split(',')
  return {
    lat: locPoints[0].trim(),
    lon: locPoints[1].trim(),
  }
}

function save() {
  progress.value = true

  if (locToRegion.value.trim() === '') locToRegion.value = ','
  if (locFromRegion.value.trim() === '') locFromRegion.value = ','

  const locPointToRegion = parseLocationString(locToRegion.value)
  const locPointFromRegion = parseLocationString(locFromRegion.value)

  const dateNow = Date.now().toString()

  const point: PointRequest = new PointRequest(
    type.value,
    name.value,
    direction.value,
    address.value,
    new Location(
      new GeoPoint(locPointToRegion.lat, locPointToRegion.lon),
      new GeoPoint(locPointFromRegion.lat, locPointFromRegion.lon),
    ),
    dateNow,
    dateNow,
  )

  addPoint(point)
    .then(() => {
      console.log('Сохранено в БД')
      setLastUpdateDataPoints(dateNow)
      clearInputs()
      clearCachePoints()
    })
    .catch((error) => {
      console.error(`Ошибка error: ${error.message}`)
      progress.value = false
    })
}

function clearInputs() {
  type.value = TypePoint.TP
  name.value = ''
  address.value = ''
  locToRegion.value = ''
  locFromRegion.value = ''
  progress.value = false
}

const handleFocus = () => inputTopAppBarStore.changeFocus(true)

const handleBlur = () => inputTopAppBarStore.changeFocus(false)

function addDirection(): void {
  directions.value.add(newDirection.value)
  isAddNewDirection.value = false
}

watch(direction, () => {
  if (direction.value === '+') {
    isAddNewDirection.value = true
  }
})
</script>

<template>
  <BackButton @click="router.back" />
  <div class="fixed overflow-scroll start-0 top-0 end-0 bottom-0 w-full h-full body pb-[80px]">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Добавление точки</strong></p>
    <div class="ms-4 me-4 mt-4">
      <select
        v-model="type"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
      >
        <option :value="TypePoint.TP">Тоннель пешеходный</option>
        <option :value="TypePoint.TA">Тоннель автодорожный</option>
        <option :value="TypePoint.PP">Путепровод пешеходный. Переход надземный</option>
        <option :value="TypePoint.Home">Участок</option>
      </select>
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="name"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
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
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Адрес"
      />
    </div>
    <!--    <div class="ms-4 me-4 mt-4">-->
    <!--      <fieldset>-->
    <!--        <legend class="text-[#cccccc]">Направление движения:</legend>-->
    <!--        <div>-->
    <!--          <input v-model="directRegion" class="me-2" type="radio" id="toRegion" name="direction"-->
    <!--                 value="toRegion" />-->
    <!--          <label class="me-4 text-[#cccccc]" for="toRegion">В область</label>-->

    <!--          <input v-model="directRegion" class="me-2" type="radio" id="fromRegion" name="direction"-->
    <!--                 value="fromRegion" />-->
    <!--          <label for="fromRegion" class="text-[#cccccc]">Из области</label>-->
    <!--        </div>-->
    <!--      </fieldset>-->

    <!--    </div>-->

    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="toRegion">В область (Внешняя)</label>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="locToRegion"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Координаты в регион"
      />
    </div>

    <div class="ms-4 me-4 mt-4">
      <label class="text-[#ccc]" for="fromRegion">Из области (Внутренняя)</label>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="locFromRegion"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Координаты из региона"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <div
        @click="save"
        class="text-center w-full shadow-xl start-4 end-4 bottom-4 border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
      >
        {{ progress ? 'Выполняется сохранение. Подождите...' : 'Сохранить' }}
      </div>
    </div>
    <div v-if="isAddNewDirection" class="flex gap-2 ms-4 me-4 mt-4">
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="newDirection"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Название нового направления"
      />
      <div @click="addDirection" class="py-2 px-4 border-[#5fb336] rounded-lg bg-[#5fb336] border">
        +
      </div>
    </div>
  </div>
</template>

<style scoped>
.body {
  background-color: #242528;
}

.border-color-custom {
  border-color: black;
}
</style>
