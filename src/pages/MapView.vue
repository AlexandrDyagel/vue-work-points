<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import BottomSheetView from '@/components/BottomSheetView.vue'

const router = useRouter()

import { ref } from 'vue'
import { TypeSearchFilter } from '@/model/Enums.ts'

const bottomSheetRef = ref(null)

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const typeSearchFilter = ref(TypeSearchFilter.NAME)
</script>

<template>
  <BackButton @click="router.back" />
  <p>Карта</p>

  <button @click="openBottomSheet">Открыть панель</button>

  <BottomSheetView ref="bottomSheetRef">
    <p class="text-center text-[#ccc] text-2xl"><strong>Фильтры поиска</strong></p>
    <div class="ms-4 me-4 mt-4">
      <fieldset>
        <div>
          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.NAME" :name="TypeSearchFilter.NAME"
                 :value="TypeSearchFilter.NAME" />
          <label class="me-4 text-[#cccccc]" for="name">По названию точки</label>

          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.ADDRESS" :name="TypeSearchFilter.ADDRESS"
                 :value="TypeSearchFilter.ADDRESS" />
          <label for="address" class="text-[#cccccc]">По адресу точки</label>
        </div>
      </fieldset>

    </div>
  </BottomSheetView>
</template>

<style scoped>

</style>
