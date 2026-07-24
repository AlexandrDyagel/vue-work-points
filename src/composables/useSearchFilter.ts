import { LocalStorageNames, TypeSearchFilter } from '@/model/Enums.ts'
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

  return {
    userSearchFilter,
    updateUserSearchFilter,
    removeUserSearchFilter,
  }
}
