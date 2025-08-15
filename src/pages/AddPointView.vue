<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { addPoint } from '../../firebase/init.ts'
import { BackButton } from 'vue-tg'
import { PointRequest } from '@/model/PointRequest.ts'
import { Location } from '@/model/Location.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { TypePoint } from '@/model/Enums.ts'
import { useCache } from '@/composables/useCache.ts'

const progress = ref(false)
const directRegion = ref('toRegion')

const type = ref(TypePoint.TP)
const name = ref('')
const direction = ref('')
const address = ref('')
const location = ref('')

const router = useRouter()

const { clearCachePoints, setLastUpdateDataPoints } = useCache()

function save() {
  progress.value = true
  const locPoints = location.value.toString().split(',')
  const lat = locPoints[0].trim()
  const lon = locPoints[1].trim()

  let point: PointRequest | null = null

  const dateNow = Date.now().toString()

  switch (directRegion.value) {
    case 'toRegion' : {
      point = new PointRequest(
        type.value,
        name.value,
        direction.value,
        address.value,
        new Location(new GeoPoint(lat, lon), new GeoPoint()),
        dateNow,
        dateNow
      )
    }
      break
    case 'fromRegion' : {
      point = new PointRequest(
        type.value,
        name.value,
        direction.value,
        address.value,
        new Location(new GeoPoint(), new GeoPoint(lat, lon)),
        dateNow,
        dateNow
      )
    }
      break
  }
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
  direction.value = ''
  address.value = ''
  location.value = ''
  progress.value = false
}
</script>

<template>

  <BackButton @click="router.back" />
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full body">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Добавление точки</strong></p>
    <div class="ms-4 me-4 mt-4">
      <select
        v-model="type"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
      >
        <option :value="TypePoint.TP">Тоннель пешеходный</option>
        <option :value="TypePoint.TA">Тоннель автодорожный</option>
        <option :value="TypePoint.PP">Путепровод пешеходный. Переход надземный</option>
      </select>
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="name"
        class="w-full bg-black  shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Name"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="direction"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Direction"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="address"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Address"
      />
    </div>
    <div class="ms-4 me-4 mt-4">
      <fieldset>
        <legend class="text-[#cccccc]">Направление движения:</legend>
        <div>
          <input v-model="directRegion" class="me-2" type="radio" id="toRegion" name="direction"
                 value="toRegion" />
          <label class="me-4 text-[#cccccc]" for="toRegion">В область</label>

          <input v-model="directRegion" class="me-2" type="radio" id="fromRegion" name="direction"
                 value="fromRegion" />
          <label for="fromRegion" class="text-[#cccccc]">Из области</label>
        </div>
      </fieldset>

    </div>
    <div class="ms-4 me-4 mt-4">
      <input
        v-model="location"
        class="w-full bg-black shadow-xl start-4 end-4 bottom-4 border-color-custom rounded-lg bg-[#18695A] border text-sm p-2.5 focus:outline-none"
        placeholder="Location"
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
