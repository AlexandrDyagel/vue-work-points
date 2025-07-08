<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, ref, type Ref, watchEffect } from 'vue'
import { GeoPoint } from '@/model/GeoPoint.ts'

interface IShop {
  name: string
  geo: GeoPoint
}

const router = useRouter()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

const userLocation: Ref<GeoPoint> = ref(new GeoPoint())

// Функция для вычисления расстояния между двумя точками в метрах (формула гаверсинусов)
function getDistance(userLocation: GeoPoint, pointLocation: GeoPoint) {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = Number(userLocation.latitude) * Math.PI / 180; // Преобразование широты в радианы
  const φ2 = Number(pointLocation.latitude) * Math.PI / 180;
  const Δφ = (Number(pointLocation.latitude) - Number(userLocation.latitude)) * Math.PI / 180;
  const Δλ = (Number(pointLocation.longitude) - Number(userLocation.longitude)) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Расстояние в метрах
}

// Координаты человека
// const userLocation = new GeoPoint('55.7479', '37.6176')

// Список магазинов с их координатами
const shops: IShop[] = [
  { name: "Магазин А", geo: new GeoPoint('55.7600', '37.6200') },
  { name: "Магазин Б", geo: new GeoPoint('55.7500', '37.6000') },
  { name: "Магазин В", geo: new GeoPoint('55.7700', '37.6300') },
  { name: "Магазин Г", geo: new GeoPoint('55.7450', '37.6250') }
];

// Находим ближайший магазин
/*let closestShop: IShop = null;
let minDistance = Infinity;

shops.forEach(shop => {
  const distance = getDistance(userLocation.value, shop.geo);

  if (distance < minDistance) {
    minDistance = distance;
    closestShop = shop;
  }
});

/!*navigator.geolocation.getCurrentPosition(pos => {
  // userLocation.latitude = pos.coords.latitude;
  // userLocation.longitude = pos.coords.longitude;
  console.log(`userPos lat = ${pos.coords.latitude}`)
  console.log(`userPos lon = ${pos.coords.longitude}`)
  // Далее вызываем поиск ближайшего магазина
});*!/

console.log(`Ближайший магазин: ${closestShop.name}`);
console.log(`Расстояние: ${minDistance.toFixed(0)} метров`);
console.log(`Координаты: ${closestShop.geo.latitude}, ${closestShop.geo.longitude}`);*/
watchEffect(async () => {
  navigator.geolocation.getCurrentPosition(position => {
    userLocation.value = new GeoPoint(
      position.coords.latitude.toString(),
      position.coords.longitude.toString()
    )
  })
})
</script>

<template>
  <BackButton @click="router.back" />

    <p>Карта</p>
  <p>{{userLocation.latitude}}, {{userLocation.longitude}}</p>

</template>

<style scoped>
</style>
