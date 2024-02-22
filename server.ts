import express from 'express'
import { print } from 'listening-on'
import { env } from './env'
import { APIInput, APIOutput, port } from './api'
import { proxy } from './proxy'
import { count, find } from 'better-sqlite3-proxy'
import '@beenotung/tslib/image'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

let app = express()

app.use(express.static('public'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
  console.log(req.method, req.url, req.body?.type)
  next()
})

app.post('/frame/message', (req, res, next) => {
  let input: APIInput = req.body
  let output: APIOutput = api(input)
  res.json(output)
})

let image_dir = 'images'
mkdirSync(image_dir, { recursive: true })

function api(input: APIInput): APIOutput {
  switch (input.type) {
    case 'init':
      return { type: 'init', page_slug: env.PAGE_SLUG }
    case 'page': {
      let page = find(proxy.page, { slug: input.page.slug })
      if (page) {
        page.posts = input.page.posts
        page.followers = input.page.followers
        page.following = input.page.following
      } else {
        proxy.page.push(input.page)
      }
      return { type: 'ack' }
    }
    case 'post': {
      let post = input.post

      let page_id = find(proxy.page, { slug: post.page_slug })?.id
      if (!page_id) return { type: 'error', error: 'page not found' }

      let post_id = find(proxy.post, { slug: post.post_slug })?.id

      let position: number | null = null
      if (count(proxy.post, { page_id }) == 0) {
        position = 1
      }
      if (position == null && post.newer_post_slug) {
        let row = find(proxy.post, { slug: post.newer_post_slug })
        if (row) {
          position = row.position - 1
        }
      }
      if (position == null && post.older_post_slug) {
        let row = find(proxy.post, { slug: post.older_post_slug })
        if (row) {
          position = row.position + 1
        }
      }
      if (position == null) {
        return { type: 'error', error: 'unknown post position' }
      }

      if (!post_id) {
        let prefix = 'data:image/webp;base64,'
        if (!post.dataUrl.startsWith(prefix)) {
          return { type: 'error', error: 'invalid post.dataUrl' }
        }
        let content = Buffer.from(post.dataUrl.slice(prefix.length), 'base64')
        let file = join(image_dir, post.post_slug + '.webp')
        writeFileSync(file, content)
        post_id = proxy.post.push({
          page_id,
          slug: post.post_slug,
          alt: post.alt,
          position,
        })
      }

      return { type: 'ack' }
    }
    default:
      return { type: 'error', error: 'unknown input type' }
  }
}

app.listen(port, () => {
  print(port)
})
