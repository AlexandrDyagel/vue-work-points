/**
 * Фотография, прикреплённая к заданию.
 * Хранится в бинарном виде (Blob) в IndexedDB устройства.
 */
export interface TaskPhoto {
  /** Уникальный идентификатор фотографии */
  readonly id: string
  /** uid точки-задания, к которой прикреплена фотография */
  readonly uid: string
  /** Время добавления (ms) — используется для сортировки */
  readonly createdAt: number
  /** Содержимое изображения */
  readonly blob: Blob
}

/**
 * Фотография, подготовленная для отображения в интерфейсе:
 * содержит готовую objectURL для <img>.
 */
export interface TaskPhotoView {
  /** Уникальный идентификатор фотографии */
  readonly id: string
  /** Время добавления (ms) */
  readonly createdAt: number
  /** objectURL, созданный через URL.createObjectURL(blob) */
  readonly url: string
}
