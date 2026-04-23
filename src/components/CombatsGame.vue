<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-4xl font-bold text-center mb-8 text-red-500">БОЙЦОВСКИЙ КЛУБ</h1>

      <!-- Арена боя -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Игрок 1 -->
        <div class="bg-gray-700 rounded-lg p-6 shadow-xl">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold">{{ player1.name }}</h2>
            <div class="text-sm text-gray-300">Уровень {{ player1.level }}</div>
          </div>

          <!-- Полоска здоровья -->
          <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span>❤️ Здоровье</span>
              <span>{{ player1.currentHp }} / {{ player1.maxHp }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-4 overflow-hidden">
              <div
                class="bg-green-500 transition-all duration-300 h-full"
                :style="{ width: `${(player1.currentHp / player1.maxHp) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Полоска энергии -->
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-1">
              <span>⚡ Энергия</span>
              <span>{{ player1.currentEnergy }} / {{ player1.maxEnergy }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
              <div
                class="bg-yellow-500 transition-all duration-300 h-full"
                :style="{ width: `${(player1.currentEnergy / player1.maxEnergy) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Анимация удара -->
          <div v-if="activeAttacker === 'player1'" class="text-center text-3xl animate-pulse">
            💥 {{ lastMove.player1 }}
          </div>

          <!-- Статистика -->
          <div class="grid grid-cols-2 gap-2 text-sm mt-3">
            <div>⚔️ Сила: {{ player1.strength }}</div>
            <div>🛡️ Защита: {{ player1.defense }}</div>
            <div>🎯 Крит: {{ player1.critChance }}%</div>
            <div>💨 Уклонение: {{ player1.dodgeChance }}%</div>
          </div>
        </div>

        <!-- VS разделитель -->
        <div class="flex items-center justify-center text-6xl font-bold text-red-500">
          VS
        </div>

        <!-- Игрок 2 -->
        <div class="bg-gray-700 rounded-lg p-6 shadow-xl">
          <div class="text-center mb-4">
            <h2 class="text-2xl font-bold">{{ player2.name }}</h2>
            <div class="text-sm text-gray-300">Уровень {{ player2.level }}</div>
          </div>

          <!-- Полоска здоровья -->
          <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span>❤️ Здоровье</span>
              <span>{{ player2.currentHp }} / {{ player2.maxHp }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-4 overflow-hidden">
              <div
                class="bg-green-500 transition-all duration-300 h-full"
                :style="{ width: `${(player2.currentHp / player2.maxHp) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Полоска энергии -->
          <div class="mb-4">
            <div class="flex justify-between text-sm mb-1">
              <span>⚡ Энергия</span>
              <span>{{ player2.currentEnergy }} / {{ player2.maxEnergy }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
              <div
                class="bg-yellow-500 transition-all duration-300 h-full"
                :style="{ width: `${(player2.currentEnergy / player2.maxEnergy) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Анимация удара -->
          <div v-if="activeAttacker === 'player2'" class="text-center text-3xl animate-pulse">
            💥 {{ lastMove.player2 }}
          </div>

          <!-- Статистика -->
          <div class="grid grid-cols-2 gap-2 text-sm mt-3">
            <div>⚔️ Сила: {{ player2.strength }}</div>
            <div>🛡️ Защита: {{ player2.defense }}</div>
            <div>🎯 Крит: {{ player2.critChance }}%</div>
            <div>💨 Уклонение: {{ player2.dodgeChance }}%</div>
          </div>
        </div>
      </div>

      <!-- Лог боя -->
      <div class="bg-gray-800 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
        <h3 class="font-bold mb-2 text-yellow-500">📜 Лог боя:</h3>
        <div v-for="(log, index) in battleLog" :key="index" class="text-sm mb-1">
          {{ log }}
        </div>
      </div>

      <!-- Панель управления -->
      <div class="bg-gray-800 rounded-lg p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Управление игроком 1 -->
          <div class="space-y-3">
            <h3 class="text-xl font-bold text-center text-blue-400">Управление {{ player1.name }}</h3>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="performAttack('player1', 'light')"
                :disabled="gameOver || !isPlayer1Turn || player1.currentEnergy < 10"
                class="btn-action bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ Легкий удар (10⚡)
              </button>
              <button
                @click="performAttack('player1', 'heavy')"
                :disabled="gameOver || !isPlayer1Turn || player1.currentEnergy < 25"
                class="btn-action bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💥 Тяжелый удар (25⚡)
              </button>
              <button
                @click="performSpecial('player1')"
                :disabled="gameOver || !isPlayer1Turn || player1.currentEnergy < 40"
                class="btn-action bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
              >
                🔥 Спецприем! (40⚡)
              </button>
            </div>
            <div class="text-center text-sm text-gray-400">
              {{ isPlayer1Turn ? '🔥 Ваш ход!' : '⏳ Ожидание хода...' }}
            </div>
          </div>

          <!-- Управление игроком 2 -->
          <div class="space-y-3">
            <h3 class="text-xl font-bold text-center text-orange-400">Управление {{ player2.name }}</h3>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="performAttack('player2', 'light')"
                :disabled="gameOver || !isPlayer2Turn || player2.currentEnergy < 10"
                class="btn-action bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✨ Легкий удар (10⚡)
              </button>
              <button
                @click="performAttack('player2', 'heavy')"
                :disabled="gameOver || !isPlayer2Turn || player2.currentEnergy < 25"
                class="btn-action bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💥 Тяжелый удар (25⚡)
              </button>
              <button
                @click="performSpecial('player2')"
                :disabled="gameOver || !isPlayer2Turn || player2.currentEnergy < 40"
                class="btn-action bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
              >
                🔥 Спецприем! (40⚡)
              </button>
            </div>
            <div class="text-center text-sm text-gray-400">
              {{ isPlayer2Turn ? '🔥 Ваш ход!' : '⏳ Ожидание хода...' }}
            </div>
          </div>
        </div>

        <!-- Кнопка сброса -->
        <div class="mt-6 text-center">
          <button
            @click="resetGame"
            class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-lg transition-all"
          >
            🔄 Начать новый бой
          </button>
        </div>
      </div>

      <!-- Победитель -->
      <div v-if="gameOver && winner" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-8 text-center transform scale-110 transition-all">
          <div class="text-6xl mb-4">🏆</div>
          <h2 class="text-3xl font-bold mb-2">Победитель!</h2>
          <p class="text-2xl text-yellow-500 mb-4">{{ winner.name }}</p>
          <button
            @click="resetGame"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            Сыграть еще раз
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// Типы для игрока
interface Player {
  name: string
  level: number
  maxHp: number
  currentHp: number
  maxEnergy: number
  currentEnergy: number
  strength: number
  defense: number
  critChance: number
  dodgeChance: number
}

// Типы для атак
type AttackType = 'light' | 'heavy' | 'special'

// Данные игроков
const player1 = reactive<Player>({
  name: 'Боец Красный',
  level: 5,
  maxHp: 200,
  currentHp: 200,
  maxEnergy: 100,
  currentEnergy: 100,
  strength: 25,
  defense: 15,
  critChance: 20,
  dodgeChance: 15
})

const player2 = reactive<Player>({
  name: 'Боец Синий',
  level: 5,
  maxHp: 200,
  currentHp: 200,
  maxEnergy: 100,
  currentEnergy: 100,
  strength: 25,
  defense: 15,
  critChance: 20,
  dodgeChance: 15
})

// Состояние игры
const currentTurn = ref<'player1' | 'player2'>('player1')
const gameOver = ref(false)
const winner = ref<Player | null>(null)
const battleLog = ref<string[]>([])
const activeAttacker = ref<'player1' | 'player2' | null>(null)
const lastMove = ref({ player1: '', player2: '' })

// Вычисляемые свойства для очередности ходов
const isPlayer1Turn = computed(() => currentTurn.value === 'player1' && !gameOver.value)
const isPlayer2Turn = computed(() => currentTurn.value === 'player2' && !gameOver.value)

// Добавление сообщения в лог
function addLog(message: string) {
  battleLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`)
  if (battleLog.value.length > 20) {
    battleLog.value.pop()
  }
}

// Восстановление энергии
function regenerateEnergy(player: Player) {
  const energyGain = 15
  player.currentEnergy = Math.min(player.maxEnergy, player.currentEnergy + energyGain)
  addLog(`${player.name} восстанавливает ${energyGain} энергии ⚡`)
}

// Проверка уклонения
function checkDodge(player: Player): boolean {
  const dodge = Math.random() * 100
  return dodge < player.dodgeChance
}

// Расчет урона
function calculateDamage(attacker: Player, defender: Player, attackType: AttackType): { damage: number; isCrit: boolean } {
  let baseDamage = 0

  switch(attackType) {
    case 'light':
      baseDamage = attacker.strength * 0.8
      break
    case 'heavy':
      baseDamage = attacker.strength * 1.5
      break
    case 'special':
      baseDamage = attacker.strength * 2.5
      break
  }

  // Проверка крита
  const isCrit = Math.random() * 100 < attacker.critChance
  let finalDamage = baseDamage * (isCrit ? 1.5 : 1)

  // Учет защиты
  const damageReduction = defender.defense / 100
  finalDamage = finalDamage * (1 - damageReduction)

  // Минимальный урон
  finalDamage = Math.max(5, Math.floor(finalDamage))

  return { damage: finalDamage, isCrit }
}

// Выполнение атаки
function performAttack(playerId: 'player1' | 'player2', attackType: AttackType) {
  if (gameOver.value) return

  const attacker = playerId === 'player1' ? player1 : player2
  const defender = playerId === 'player1' ? player2 : player1

  // Проверка энергии
  let energyCost = 0
  let attackName = ''
  switch(attackType) {
    case 'light':
      energyCost = 10
      attackName = 'Легкий удар'
      break
    case 'heavy':
      energyCost = 25
      attackName = 'Тяжелый удар'
      break
    case 'special':
      energyCost = 40
      attackName = 'Спецприем'
      break
  }

  if (attacker.currentEnergy < energyCost) {
    addLog(`${attacker.name}: Недостаточно энергии для ${attackName}!`)
    return
  }

  // Списываем энергию
  attacker.currentEnergy -= energyCost

  // Анимация
  activeAttacker.value = playerId
  lastMove.value[playerId] = attackName
  setTimeout(() => {
    activeAttacker.value = null
    lastMove.value[playerId] = ''
  }, 1000)

  // Проверка уклонения
  if (checkDodge(defender)) {
    addLog(`${defender.name} уклонился от ${attackName}! 💨`)
    endTurn()
    return
  }

  // Расчет урона
  const { damage, isCrit } = calculateDamage(attacker, defender, attackType)

  // Нанесение урона
  defender.currentHp = Math.max(0, defender.currentHp - damage)

  // Логирование
  const critText = isCrit ? ' КРИТИЧЕСКИЙ УРОН! 💢' : ''
  addLog(`${attacker.name} использует ${attackName} и наносит ${damage} урона${critText}`)

  // Проверка смерти
  if (defender.currentHp <= 0) {
    gameOver.value = true
    winner.value = attacker
    addLog(`🏆 ${attacker.name} ПОБЕДИЛ! 🏆`)
    return
  }

  // Восстановление энергии после атаки
  regenerateEnergy(attacker)

  // Смена хода
  endTurn()
}

// Выполнение спецприема
function performSpecial(playerId: 'player1' | 'player2') {
  performAttack(playerId, 'special')
}

// Завершение хода
function endTurn() {
  if (gameOver.value) return
  currentTurn.value = currentTurn.value === 'player1' ? 'player2' : 'player1'
  addLog(`--- Ход переходит к ${currentTurn.value === 'player1' ? player1.name : player2.name} ---`)
}

// Сброс игры
function resetGame() {
  player1.currentHp = player1.maxHp
  player1.currentEnergy = player1.maxEnergy
  player2.currentHp = player2.maxHp
  player2.currentEnergy = player2.maxEnergy
  currentTurn.value = 'player1'
  gameOver.value = false
  winner.value = null
  battleLog.value = []
  activeAttacker.value = null
  lastMove.value = { player1: '', player2: '' }
  addLog('Новый бой начинается! Будьте осторожны... 👊')
}
</script>

<style scoped>
@reference "@/assets/main.css";

.btn-action {
  @apply text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-pulse {
  animation: pulse 0.5s ease-in-out;
}
</style>
