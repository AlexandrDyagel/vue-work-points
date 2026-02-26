import { defineStore } from 'pinia'
import { ref } from 'vue'

interface UserProfile {
  userId:  number | undefined,
  firstName:  string | undefined,
  lastName:  string | undefined,
  username:  string | undefined,
  photoUrl:  string | undefined,
}

export const useTgProfileStore = defineStore('tgProfileStore', () => {
  const userProfile = ref<UserProfile>({
    userId: undefined,
    firstName: '',
    lastName: '',
    username: '',
    photoUrl: '',
  })

  return { userProfile }
})
