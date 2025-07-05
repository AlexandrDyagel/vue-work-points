import { LocalStorageNames, TypeSearchFilter } from '@/model/Enums.ts'

export function useSearchFilter() {

  const userSearchFilter = () => {
    const cachedSearchFilter = localStorage.getItem(LocalStorageNames.SEARCH_FILTER);

    if (cachedSearchFilter) {
      return JSON.parse(cachedSearchFilter) as TypeSearchFilter
    } else {
      localStorage.setItem(LocalStorageNames.SEARCH_FILTER, JSON.stringify(TypeSearchFilter.NAME))
      return JSON.parse(localStorage.getItem(LocalStorageNames.SEARCH_FILTER)!) as TypeSearchFilter
    }
  }

  const updateUserSearchFilter = (typeSearchFilter: TypeSearchFilter) =>
    localStorage.setItem(LocalStorageNames.SEARCH_FILTER, JSON.stringify(typeSearchFilter))

  const removeUserSearchFilter = () => localStorage.removeItem(LocalStorageNames.SEARCH_FILTER)

  return {
    userSearchFilter,
    updateUserSearchFilter,
    removeUserSearchFilter
  };
}
