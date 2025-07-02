import { TypeSearchFilter } from '@/model/Enums.ts'

export function useSearchFilter() {

  const userSearchFilter = () => {
    const cachedSearchFilter = localStorage.getItem('search_filter');

    if (cachedSearchFilter) {
      return JSON.parse(cachedSearchFilter) as TypeSearchFilter
    } else {
      localStorage.setItem('search_filter', JSON.stringify(TypeSearchFilter.NAME))
      return JSON.parse(localStorage.getItem('search_filter')!) as TypeSearchFilter
    }
  }

  const updateUserSearchFilter = (typeSearchFilter: TypeSearchFilter) => localStorage.setItem('search_filter', JSON.stringify(typeSearchFilter))

  return {
    userSearchFilter,
    updateUserSearchFilter
  };
}
