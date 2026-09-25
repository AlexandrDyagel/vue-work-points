/**
 * Тёплая сессия камеры: один поток getUserMedia на всё время работы приложения.
 *
 * Зачем: WebView не запоминает решение пользователя по камере — Telegram Mini App
 * (а также WKWebView на iOS и встроенный браузер Telegram Desktop) показывает
 * системный запрос заново на каждый вызов getUserMedia. Если гасить дорожки при
 * каждом закрытии оверлея съёмки, то при следующем нажатии «Камера» пользователь
 * снова увидит запрос. Поэтому поток не останавливается сразу после съёмки: он
 * живёт в этой сессии и отдаётся повторно — новый getUserMedia не вызывается,
 * значит и разрешение не спрашивается.
 *
 * Камера при этом не работает впустую:
 *  - через `DEFAULT_IDLE_RELEASE_MS` после закрытия съёмки поток гасится (очередь
 *    снимков подряд укладывается в это окно и проходит без запроса);
 *  - сразу, если пользователь ушёл со страницы (`releaseCameraStream(0)`);
 *  - сразу, если дорожки остановила система: следующая съёмка запросит доступ
 *    заново обычным путём.
 *
 * В нативной сборке Capacitor окно ожидания не нужно: системное разрешение
 * выдаётся один раз на приложение, поэтому камера гасится сразу.
 */
import { Capacitor } from '@capacitor/core'
import { supportsLiveCamera, type CameraFacing } from '@/utils/camera.ts'

/**
 * Сколько миллисекунд поток остаётся тёплым после закрытия съёмки. Ноль в
 * нативной сборке: там повторный системный запрос не появляется.
 */
const DEFAULT_IDLE_RELEASE_MS = Capacitor.isNativePlatform() ? 0 : 180_000

/** Активный поток сессии */
let stream: MediaStream | null = null
/** Камера, с которой снят активный поток */
let streamFacing: CameraFacing = 'environment'
/** Поток нужен потребителю прямо сейчас (оверлей съёмки открыт) */
let inUse = false
/** Задержка, с которой попросили освободить поток */
let releaseDelay = DEFAULT_IDLE_RELEASE_MS
/** Таймер отложенного освобождения */
let releaseTimer: ReturnType<typeof setTimeout> | null = null
/** Незавершённый запрос доступа: параллельный вызов переиспользует его */
let pending: Promise<MediaStream> | null = null
let pendingFacing: CameraFacing = 'environment'
/** Поколение сессии: запросы, пережившие сброс, отбрасываются */
let generation = 0

function clearReleaseTimer(): void {
  if (releaseTimer === null) return
  clearTimeout(releaseTimer)
  releaseTimer = null
}

/** Живой поток сессии или null, если камеры в сессии нет */
function liveStream(): MediaStream | null {
  if (!stream) return null
  return stream.getVideoTracks().some((track) => track.readyState === 'live') ? stream : null
}

function stopTracks(target: MediaStream): void {
  target.getTracks().forEach((track) => {
    track.onended = null
    track.stop()
  })
}

/** Система отобрала камеру (фон, другое приложение) — сессия больше не годится */
function handleTrackEnded(event: Event): void {
  if (!stream) return

  const track = event.target as MediaStreamTrack | null
  if (track && !stream.getTracks().includes(track)) return

  resetSession()
}

/** Полный сброс: активный поток гасится, незавершённые запросы отбрасываются */
function resetSession(): void {
  generation += 1
  clearReleaseTimer()

  const active = stream
  stream = null
  inUse = false
  releaseDelay = DEFAULT_IDLE_RELEASE_MS

  if (active) stopTracks(active)
}

function scheduleRelease(delayMs: number): void {
  clearReleaseTimer()

  if (delayMs <= 0) {
    resetSession()
    return
  }

  releaseTimer = setTimeout(() => {
    releaseTimer = null
    if (!inUse) resetSession()
  }, delayMs)
}

function watchTracks(target: MediaStream): void {
  target.getTracks().forEach((track) => {
    track.onended = handleTrackEnded
  })
}

function requestStream(facing: CameraFacing): Promise<MediaStream> {
  if (!supportsLiveCamera()) return Promise.reject(new Error('getUserMedia недоступен'))

  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facing } },
    audio: false,
  })
}

/**
 * Переключение камеры в существующем потоке: новый запрос доступа не нужен,
 * поэтому в Telegram Mini App не появляется лишний системный запрос. Часть
 * платформ (десктоп) не сообщает facingMode — тогда поток берётся заново.
 */
async function switchStreamFacing(target: MediaStream, facing: CameraFacing): Promise<boolean> {
  const track = target.getVideoTracks()[0]
  if (!track) return false
  if (track.getSettings().facingMode === facing) return true

  try {
    await track.applyConstraints({ facingMode: { ideal: facing } })
  } catch (error) {
    console.error('cameraSession: не удалось переключить камеру', error)
    return false
  }

  return track.getSettings().facingMode === facing
}

/** Есть ли в сессии живой (тёплый) поток камеры */
export function isCameraStreamWarm(): boolean {
  return liveStream() !== null
}

/**
 * Поток камеры для съёмки. Пока в сессии есть живой поток, новый getUserMedia не
 * вызывается — значит, повторного запроса разрешения не будет.
 */
export async function acquireCameraStream(facing: CameraFacing): Promise<MediaStream> {
  // Потребитель пришёл: отложенное освобождение отменяется
  inUse = true
  releaseDelay = DEFAULT_IDLE_RELEASE_MS
  clearReleaseTimer()

  const existing = liveStream()

  if (existing) {
    if (streamFacing === facing) return existing

    if (await switchStreamFacing(existing, facing)) {
      streamFacing = facing
      return existing
    }

    // Камеру в текущем потоке переключить не удалось — берём новый
    resetSession()
    inUse = true
  }

  // Такой же запрос уже идёт: ждём его, второго разрешения не спрашиваем
  if (pending && pendingFacing === facing) return pending

  const gen = ++generation
  const request = requestStream(facing)
  pending = request
  pendingFacing = facing

  let next: MediaStream
  try {
    next = await request
  } finally {
    if (pending === request) pending = null
  }

  // Пока спрашивали доступ, сессию сбросили (уход со страницы, камеру забрали)
  if (gen !== generation) {
    stopTracks(next)
    return next
  }

  stream = next
  streamFacing = facing
  watchTracks(next)

  // Потребитель мог уйти, пока шёл запрос: камеру не держим вечно
  if (!inUse) scheduleRelease(releaseDelay)

  return next
}

/**
 * Поток больше не нужен. По умолчанию камера гасится через
 * `DEFAULT_IDLE_RELEASE_MS` — частые снимки подряд не спрашивают разрешение
 * заново; `delayMs = 0` гасит сразу (уход со страницы).
 */
export function releaseCameraStream(delayMs: number = DEFAULT_IDLE_RELEASE_MS): void {
  inUse = false
  releaseDelay = delayMs
  scheduleRelease(delayMs)
}
