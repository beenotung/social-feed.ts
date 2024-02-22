import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

export type Page = {
  id?: null | number
  slug: string
  posts: null | string
  followers: null | string
  following: null | string
}

export type Post = {
  id?: null | number
  page_id: number
  page?: Page
  slug: string
  alt: string
  position: number
}

export type DBProxy = {
  page: Page[]
  post: Post[]
}

export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
    page: [],
    post: [
      /* foreign references */
      ['page', { field: 'page_id', table: 'page' }],
    ],
  },
})
