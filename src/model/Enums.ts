export enum TypePoint {
  TP = 'тп',
  TA = 'та',
  PP = 'пп'
}

export enum Routes {
  Points = "/points",
  AddPoint = "/points/add",
  EditPoint = "/points/edit",
  Tasks = "/tasks",
  Map = "/map",
  Settings = "/settings"
}

export enum TypeDirectionButton {
  TO_REGION = 'toRegion',
  FROM_REGION = 'fromRegion'
}

export enum TypeLocationNavButton {
  ROUTE = 'route',
  POINT = 'point',
  ANY = 'any',
}

export enum CloudStorageNames {
  TASK_ITEMS= 'task_items'
}

export enum LocalStorageNames {
  CACHE_POINTS = 'cache_points',
  SEARCH_FILTER = 'search_filter',
  USER_ROLE = 'user_role'
}

export enum TypeSearchFilter {
  NAME = 'name',
  ADDRESS = 'address',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

