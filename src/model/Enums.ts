export enum TypePoint {
  TP = 'тп',
  TA = 'та',
  PP = 'пп',
  Home = 'уч',
}

export enum TaskTag {
  LIGHTING = 'lighting',
  CAMERAS = 'cameras',
  OTHER = 'other',
}

export enum Routes {
  Home = '/',
  Points = '/points',
  AddPoint = '/points/add',
  EditPoint = '/points/edit',
  Tasks = '/tasks',
  TaskMap = '/tasks/map',
  Tracking = '/tracking',
  Map = '/full-map',
  TgSettingApp = '/tg_settings_app'
}

export enum TypeDirectionButton {
  TO_REGION = 'toRegion',
  FROM_REGION = 'fromRegion',
}

export enum TypeLocationNavButton {
  ROUTE = 'route',
  POINT = 'point',
  ANY = 'any',
}

export enum CloudStorageNames {
  TASK_ITEMS = 'task_items',
}

export enum LocalStorageNames {
  CACHE_POINTS = 'cache_points',
  SEARCH_FILTER = 'search_filter',
  USER_ROLE = 'user_role',
  LAST_UPDATE_TIME = 'last_update_time',
  CACHE_TASKS = 'cache_tasks',
  COMPLETED_TASKS = 'completed_tasks',
  TASK_TAGS = 'task_tags',
  TASK_NOTES = 'task_notes',
  /** Резервное хранилище фотографий заданий (основное — IndexedDB) */
  TASK_PHOTOS = 'task_photos',
  ADMIN_DEVICE = 'admin_device',
  SORT_TYPE = 'sort_type',
}

export enum FirestoreCollectionNames {
  POINTS = 'points',
  UPDATE = 'timeforupdate',
}

export enum TypeSearchFilter {
  NAME = 'name',
  ADDRESS = 'address',
  DIRECTION = 'direction',
}

export enum TypeSort {
  /** По алфавиту (А → Я) */
  NAME_ASC = 'name_asc',
  /** По алфавиту (Я → А) */
  NAME_DESC = 'name_desc',
  /** По дате добавления (новые сверху) */
  CREATED_DESC = 'created_desc',
  /** По дате добавления (старые сверху) */
  CREATED_ASC = 'created_asc',
  /** По дате обновления (новые сверху) */
  UPDATED_DESC = 'updated_desc',
  /** По дате обновления (старые сверху) */
  UPDATED_ASC = 'updated_asc',
  /** По типу точки (ТП → ТА → ПП → УЧ) */
  TYPE = 'type',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum Environment {
  DEVELOPMENT,
  PRODUCTION
}

export enum NavItemName {
  Points= 'Точки',
  Tasks = 'Задания',
  Tracking = 'Трекинг',
  Map = 'Карта',
}
