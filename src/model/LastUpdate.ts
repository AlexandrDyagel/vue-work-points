export class LastUpdate {
  id: string
  lastForUpdate: string

  constructor(id: string = '', lastForUpdate: string = '') {
    this.id = id
    this.lastForUpdate = lastForUpdate
  }
}
