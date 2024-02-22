import { Page } from './proxy'

export let port = 8100

export type APIInput =
  | {
      type: 'init'
    }
  | {
      type: 'page'
      page: Page
    }
  | {
      type: 'post'
      post: NewPost
    }

export type NewPost = {
  page_slug: string
  post_slug: string
  alt: string
  dataUrl: string
  index: number
  newer_post_slug: string | null
  older_post_slug: string | null
}

export type APIOutput =
  | {
      type: 'ack'
    }
  | {
      type: 'init'
      page_slug: string
    }
  | {
      type: 'error'
      error: string
    }
