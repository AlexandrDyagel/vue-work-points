<template>
  <div class="bg-gray-800">
    <div class="pt-8 space-y-8">
      <!-- заголовок -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-3xl font-semibold tracking-tight text-white">
          🧾 Калькуляция блюда
        </h1>
        <button
          @click="resetToExample"
          class="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-xl shadow-sm transition"
        >
          ↻ Загрузить пример (рагу)
        </button>
      </div>

      <!-- сетка: ингредиенты слева (шире) + настройки и результаты справа -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <!-- левая колонка: список ингредиентов -->
        <div class="lg:col-span-2 space-y-5">
          <div
            class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/80 p-5"
          >
            <h2 class="text-lg font-medium flex items-center gap-2 text-gray-700 mb-3">
              🥕 Ингредиенты (брутто, с потерями)
            </h2>

            <!-- шапка таблицы -->
            <div class="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2 mb-1">
              <div class="col-span-4">Название</div>
              <div class="col-span-2 text-right">Вес, г</div>
              <div class="col-span-2 text-right">Цена, {{ currencySymbol }}/кг</div>
              <div class="col-span-2 text-right">Потери %</div>
              <div class="col-span-2"></div>
            </div>

            <!-- список ингредиентов -->
            <div
              v-for="ing in ingredients"
              :key="ing.id"
              class="grid grid-cols-12 gap-2 items-center py-2 px-2 border-b border-gray-100 last:border-0 text-sm"
            >
              <div class="col-span-4 font-medium text-gray-800 truncate">
                {{ ing.name }}
              </div>
              <div class="col-span-2 text-right text-gray-700">{{ ing.quantity }} г</div>
              <div class="col-span-2 text-right text-gray-700">
                {{ ing.pricePerKg.toFixed(2) }}
              </div>
              <div class="col-span-2 text-right text-gray-700">
                {{ ing.wastePercent }}%
              </div>
              <div class="col-span-2 text-right">
                <button
                  @click="removeIngredient(ing.id)"
                  class="text-red-400 hover:text-red-600 transition text-sm font-medium"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- форма добавления нового ингредиента -->
            <div class="mt-5 pt-3 border-t border-gray-200">
              <h3 class="text-sm font-medium text-gray-600 mb-2">
                ➕ Добавить ингредиент
              </h3>
              <div class="grid grid-cols-12 text-gray-500 gap-2 items-end">
                <div class="col-span-3">
                  <label class="block text-xs text-gray-500">Название</label>
                  <input
                    v-model="newIngredient.name"
                    type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Напр. Томаты"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500">Вес, г</label>
                  <input
                    v-model.number="newIngredient.quantity"
                    type="number"
                    min="1"
                    step="10"
                    class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500">Цена за кг</label>
                  <input
                    v-model.number="newIngredient.pricePerKg"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-gray-500">Потери %</label>
                  <input
                    v-model.number="newIngredient.wastePercent"
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    class="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div class="col-span-3">
                  <button
                    @click="addIngredient"
                    class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-2 px-3 rounded-lg border border-emerald-200 text-sm"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- краткая сводка по сырью -->
          <div
            class="bg-white rounded-xl shadow-sm border border-gray-200/70 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm"
          >
            <div>
              <div class="text-gray-500">Стоимость сырья (брутто)</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ formatNumber(totalRawCost) }} {{ currencySymbol }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">С учётом потерь</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ formatNumber(totalCostWithWaste) }} {{ currencySymbol }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">Вес брутто</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ formatNumber(totalRawWeightKg, 2) }} кг
              </div>
            </div>
            <div>
              <div class="text-gray-500">Готового блюда</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ formatNumber(finalDishWeightKg, 2) }} кг
              </div>
            </div>
          </div>
        </div>

        <!-- правая колонка: параметры и результаты -->
        <div class="space-y-6">
          <!-- настройки блюда -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200/80 p-5 space-y-4">
            <h2 class="text-md font-medium text-gray-700">⚙️ Параметры порции</h2>

            <div>
              <label class="block text-sm text-gray-500 mb-1">Вес порции (г)</label>
              <input
                v-model.number="dishSettings.portionWeight"
                type="number"
                min="10"
                step="10"
                class="w-full text-gray-500 border border-gray-300 rounded-xl px-4 py-2"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-1">Наценка (%)</label>
              <input
                v-model.number="dishSettings.markupPercent"
                type="number"
                min="0"
                max="1000"
                step="10"
                class="w-full text-gray-500 border border-gray-300 rounded-xl px-4 py-2"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-500 mb-1"
                >Упаковка ({{ currencySymbol }})</label
                >
                <input
                  v-model.number="dishSettings.packagingCost"
                  type="number"
                  min="0"
                  step="0.05"
                  class="w-full text-gray-500 border border-gray-300 rounded-xl px-4 py-2"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-1">Накладные %</label>
                <input
                  v-model.number="dishSettings.overheadPercent"
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  class="w-full text-gray-500 border border-gray-300 rounded-xl px-4 py-2"
                />
              </div>
            </div>
            <div class="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="deliveryToggle"
                v-model="dishSettings.includeDelivery"
                class="rounded border-gray-300"
              />
              <label for="deliveryToggle" class="text-sm text-gray-600"
              >Включить доставку в себестоимость</label
              >
            </div>
            <div v-if="dishSettings.includeDelivery" class="pl-6">
              <label class="block text-sm text-gray-500 mb-1"
              >Доля доставки на порцию ({{ currencySymbol }})</label
              >
              <input
                v-model.number="dishSettings.deliveryShare"
                type="number"
                min="0"
                step="0.1"
                class="w-full text-gray-500 border border-gray-300 rounded-xl px-4 py-2"
              />
            </div>
          </div>

          <!-- результаты калькуляции -->
          <div
            class="bg-white rounded-xl shadow-sm border border-indigo-100/80 p-5 space-y-4"
          >
            <h2 class="text-md font-medium text-indigo-800">
              📊 Итоги на порцию {{ dishSettings.portionWeight }} г
            </h2>

            <div class="text-gray-400 flex justify-between items-center border-b border-indigo-100 pb-2">
              <span class="text-gray-600">Продуктовая себестоимость</span>
              <span class="font-mono font-semibold"
              >{{ formatNumber(productCostPerPortion) }} {{ currencySymbol }}</span
              >
            </div>
            <div class="text-gray-400 flex justify-between items-center border-b border-indigo-100 pb-2">
              <span class="text-gray-600">+ Упаковка</span>
              <span class="font-mono"
              >{{ formatNumber(dishSettings.packagingCost) }} {{ currencySymbol }}</span
              >
            </div>
            <div v-if="dishSettings.includeDelivery" class="text-gray-400 flex justify-between items-center border-b border-indigo-100 pb-2">
              <span class="text-gray-600">+ Доставка</span>
              <span class="font-mono"
              >{{ formatNumber(dishSettings.deliveryShare) }} {{ currencySymbol }}</span
              >
            </div>
            <div class="text-gray-400 flex justify-between items-center border-b border-indigo-100 pb-2">
              <span class="text-gray-600">+ Накладные (э/э, газ)</span>
              <span class="font-mono"
              >{{ formatNumber(overheadPerPortion) }} {{ currencySymbol }}</span
              >
            </div>
            <div
              class="flex justify-between items-center border-b border-indigo-100 pb-2 text-gray-800 font-medium"
            >
              <span>💵 Полная себестоимость</span>
              <span class="font-mono text-lg"
              >{{ formatNumber(totalCostPerPortion) }} {{ currencySymbol }}</span
              >
            </div>
            <div class="flex justify-between items-center pt-1 text-lg font-semibold text-indigo-700">
              <span>💰 Цена продажи</span>
              <span class="font-mono">{{ formatNumber(sellingPrice) }} {{ currencySymbol }}</span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 text-sm">
              <div class="bg-gray-50 p-2 rounded-lg">
                <div class="text-gray-500">Фудкост %</div>
                <div class="font-bold text-gray-800">{{ formatNumber(foodCostPercent, 1) }}%</div>
              </div>
              <div class="bg-gray-50 p-2 rounded-lg">
                <div class="text-gray-500">Марж. прибыль</div>
                <div class="font-bold text-gray-800">
                  {{ formatNumber(contributionMargin) }} {{ currencySymbol }}
                </div>
              </div>
              <div class="bg-emerald-50 p-2 rounded-lg col-span-2">
                <div class="text-emerald-700 text-xs">Чистая прибыль (после всех расх.)</div>
                <div class="font-bold text-emerald-800 text-base">
                  {{ formatNumber(netProfitPerPortion) }} {{ currencySymbol }}
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-400 italic mt-2">
              *потери при обработке учтены в стоимости ингредиентов
            </div>
          </div>
        </div>
      </div>

      <!-- дополнительное описание логики -->
      <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <span class="font-medium">📌 Как это работает:</span> Для каждого ингредиента
        задаётся вес брутто, цена за кг и процент потерь (очистка, жарка). Общая стоимость с
        учётом потерь пересчитывается на вес готового блюда (с учётом уварки —
        фиксированный коэф. 0.9). Затем добавляются упаковка, накладные, доставка — и
        наценка. Все параметры можно менять.
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

// ---------- Типы ----------
interface Ingredient {
  id: string;
  name: string;
  quantity: number; // в граммах
  pricePerKg: number; // BYN за кг
  wastePercent: number; // потери при обработке %
}

interface DishSettings {
  portionWeight: number; // грамм
  markupPercent: number; // наценка %
  packagingCost: number; // BYN
  deliveryShare: number; // BYN на порцию
  includeDelivery: boolean;
  overheadPercent: number; // % от продуктовой себестоимости
}

// ---------- Состояние ----------
const currencySymbol = ref<string>('BYN');

const dishSettings = reactive<DishSettings>({
  portionWeight: 350,
  markupPercent: 350,
  packagingCost: 0.3,
  deliveryShare: 0.1,
  includeDelivery: false,
  overheadPercent: 5,
});

const ingredients = ref<Ingredient[]>([
  {
    id: '1',
    name: 'Капуста',
    quantity: 3000,
    pricePerKg: 1.6,
    wastePercent: 10,
  },
  {
    id: '2',
    name: 'Картофель',
    quantity: 700,
    pricePerKg: 1.2,
    wastePercent: 15,
  },
  {
    id: '3',
    name: 'Морковь',
    quantity: 200,
    pricePerKg: 2.0,
    wastePercent: 12,
  },
  {
    id: '4',
    name: 'Лук репчатый',
    quantity: 300,
    pricePerKg: 2.0,
    wastePercent: 10,
  },
  {
    id: '5',
    name: 'Масло подсолнечное',
    quantity: 50,
    pricePerKg: 3.5,
    wastePercent: 0,
  },
]);

const newIngredient = reactive({
  name: '',
  quantity: 100,
  pricePerKg: 2.0,
  wastePercent: 0,
});

// ---------- Константы ----------
const cookingLossFactor = 0.9; // 10% потерь при тушении

// ---------- Вычисляемые поля ----------
const totalRawCost = computed<number>(() => {
  return ingredients.value.reduce((acc, ing) => {
    return acc + (ing.quantity / 1000) * ing.pricePerKg;
  }, 0);
});

const totalCostWithWaste = computed<number>(() => {
  return ingredients.value.reduce((acc, ing) => {
    const netFactor = 1 - ing.wastePercent / 100;
    const effectiveMultiplier = netFactor > 0 ? 1 / netFactor : 1;
    const rawCost = (ing.quantity / 1000) * ing.pricePerKg;
    return acc + rawCost * effectiveMultiplier;
  }, 0);
});

const totalRawWeightKg = computed<number>(() => {
  return ingredients.value.reduce((acc, ing) => acc + ing.quantity / 1000, 0);
});

const totalNetWeightBeforeCooking = computed<number>(() => {
  return ingredients.value.reduce((acc, ing) => {
    const netFactor = 1 - ing.wastePercent / 100;
    return acc + (ing.quantity / 1000) * netFactor;
  }, 0);
});

const finalDishWeightKg = computed<number>(() => {
  return totalNetWeightBeforeCooking.value * cookingLossFactor;
});

const costPerKgProduct = computed<number>(() => {
  if (finalDishWeightKg.value <= 0) return 0;
  return totalCostWithWaste.value / finalDishWeightKg.value;
});

const productCostPerPortion = computed<number>(() => {
  return (costPerKgProduct.value * dishSettings.portionWeight) / 1000;
});

const overheadPerPortion = computed<number>(() => {
  return productCostPerPortion.value * (dishSettings.overheadPercent / 100);
});

const totalCostPerPortion = computed<number>(() => {
  const delivery = dishSettings.includeDelivery ? dishSettings.deliveryShare : 0;
  return productCostPerPortion.value + dishSettings.packagingCost + delivery + overheadPerPortion.value;
});

const sellingPrice = computed<number>(() => {
  return totalCostPerPortion.value * (1 + dishSettings.markupPercent / 100);
});

const contributionMargin = computed<number>(() => {
  const delivery = dishSettings.includeDelivery ? dishSettings.deliveryShare : 0;
  const variableCost = productCostPerPortion.value + dishSettings.packagingCost + delivery;
  return sellingPrice.value - variableCost;
});

const foodCostPercent = computed<number>(() => {
  if (sellingPrice.value === 0) return 0;
  return (productCostPerPortion.value / sellingPrice.value) * 100;
});

const netProfitPerPortion = computed<number>(() => {
  return sellingPrice.value - totalCostPerPortion.value;
});

// ---------- Методы ----------
const addIngredient = (): void => {
  if (!newIngredient.name.trim()) return;
  const id = Date.now() + Math.random().toString(36).substring(2, 6);
  ingredients.value.push({
    id,
    name: newIngredient.name,
    quantity: newIngredient.quantity,
    pricePerKg: newIngredient.pricePerKg,
    wastePercent: newIngredient.wastePercent,
  });
  // сброс
  newIngredient.name = '';
  newIngredient.quantity = 100;
  newIngredient.pricePerKg = 2.0;
  newIngredient.wastePercent = 0;
};

const removeIngredient = (id: string): void => {
  ingredients.value = ingredients.value.filter((ing) => ing.id !== id);
};

const formatNumber = (val: number, digits: number = 2): string => {
  if (val === undefined || val === null) return '0.00';
  return val.toFixed(digits);
};

const resetToExample = (): void => {
  ingredients.value = [
    {
      id: '1',
      name: 'Капуста',
      quantity: 3000,
      pricePerKg: 1.6,
      wastePercent: 10,
    },
    {
      id: '2',
      name: 'Картофель',
      quantity: 700,
      pricePerKg: 1.2,
      wastePercent: 15,
    },
    {
      id: '3',
      name: 'Морковь',
      quantity: 200,
      pricePerKg: 2.0,
      wastePercent: 12,
    },
    {
      id: '4',
      name: 'Лук репчатый',
      quantity: 300,
      pricePerKg: 2.0,
      wastePercent: 10,
    },
    {
      id: '5',
      name: 'Масло подсолнечное',
      quantity: 50,
      pricePerKg: 3.5,
      wastePercent: 0,
    },
  ];
  dishSettings.portionWeight = 350;
  dishSettings.markupPercent = 350;
  dishSettings.packagingCost = 0.3;
  dishSettings.deliveryShare = 0.1;
  dishSettings.includeDelivery = false;
  dishSettings.overheadPercent = 5;
};
</script>

<style scoped>
/* Небольшие дополнительные стили при необходимости */
</style>
