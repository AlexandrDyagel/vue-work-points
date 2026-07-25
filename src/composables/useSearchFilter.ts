import { LocalStorageNames, TypeSearchFilter, TypeSort } from '@/model/Enums.ts'
import { storage } from '@/utils/storage.ts'

export function useSearchFilter() {
  const userSearchFilter = async (): Promise<TypeSearchFilter> => {
    const cachedSearchFilter = await storage.get<TypeSearchFilter>(LocalStorageNames.SEARCH_FILTER)

    if (cachedSearchFilter) {
      return cachedSearchFilter
    } else {
      await storage.set(LocalStorageNames.SEARCH_FILTER, TypeSearchFilter.NAME)
      return (await storage.get<TypeSearchFilter>(LocalStorageNames.SEARCH_FILTER))!
    }
  }

  const updateUserSearchFilter = async (typeSearchFilter: TypeSearchFilter) =>
    storage.set(LocalStorageNames.SEARCH_FILTER, typeSearchFilter)

  const removeUserSearchFilter = async () => storage.remove(LocalStorageNames.SEARCH_FILTER)

  // --- Сортировка ---

  const userSortType = async (): Promise<TypeSort> => {
    const cachedSortType = await storage.get<TypeSort>(LocalStorageNames.SORT_TYPE)

    if (cachedSortType) {
      return cachedSortType
    } else {
      await storage.set(LocalStorageNames.SORT_TYPE, TypeSort.NAME_ASC)
      return (await storage.get<TypeSort>(LocalStorageNames.SORT_TYPE))!
    }
  }

  const updateUserSortType = async (typeSort: TypeSort) =>
    storage.set(LocalStorageNames.SORT_TYPE, typeSort)

  const removeUserSortType = async () => storage.remove(LocalStorageNames.SORT_TYPE)

  return {
    userSearchFilter,
    updateUserSearchFilter,
    removeUserSearchFilter,
    userSortType,
    updateUserSortType,
    removeUserSortType,
  }
}
