import { APIInput, APIOutput, NewPost, port } from './api'

async function main() {
  let page_slug = ''
  let output = injectOutput()

  let version = +output.dataset.version! || 0
  version++
  output.dataset.version = version.toString()

  let frame_origin = 'http://localhost:' + port
  let _frame = window.open(frame_origin + '/frame.html')
  if (!_frame) return
  let frame = _frame

  putToOutput('frame created')

  await new Promise<void>(resolve => {
    window.addEventListener('message', event => {
      if (!isCurrentVersion()) return
      putToOutput({ event_origin: event.origin })
      if (event.origin != frame_origin) return
      putToOutput(event.data)
      if (event.data === 'frame ready') {
        sendToFrame({ type: 'init' })
        return
      }
      let output = event.data as APIOutput
      switch (output.type) {
        case 'init':
          page_slug = output.page_slug
          resolve()
          return
      }
    })
  })

  if (!isCurrentPage()) {
    return
  }

  function putToOutput(data: any) {
    output.value = (output.value + '\n\n' + JSON.stringify(data)).trim()
  }

  function sendToFrame(input: APIInput) {
    frame.postMessage(input, frame_origin)
  }

  function isCurrentPage() {
    if (!page_slug) return true
    return location.pathname.replace(/^\//, '').replace(/\/$/, '') == page_slug
  }

  function isCurrentVersion() {
    return isCurrentPage() && +output.dataset.version! == version
  }

  function injectOutput() {
    let div = document.querySelector('svg title')!.closest('div')!
    let textarea = div.querySelector('textarea')
    if (!textarea) {
      textarea = document.createElement('textarea')
      div.appendChild(textarea)
    }
    textarea.id = 'output'
    textarea.value = ''
    return textarea
  }

  function collectProfile() {
    function parseFromLastSpan(
      node: Element | null | undefined,
    ): string | null {
      if (!node) return null
      let spans = node.querySelectorAll('span')
      let span = spans[spans.length - 1]
      let text = span.innerText
      return text.replaceAll(',', '')
    }

    let followers = parseFromLastSpan(
      document.querySelector(`[href="/${page_slug}/followers/"]`),
    )

    let following = parseFromLastSpan(
      document.querySelector(`[href="/${page_slug}/following/"]`),
    )

    let posts = parseFromLastSpan(
      document
        .querySelector(`[href="/${page_slug}/following/"]`)
        ?.closest('ul')
        ?.querySelector('li'),
    )

    return { posts, followers, following }
  }

  function selectPosts() {
    return Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        `main [href*="/p/"][role="link"]`,
      ),
      a => {
        let id = a.href.match(/\/p\/(\w+)\//)?.[1]
        if (!id) return
        let img = a.querySelector('img')
        if (!img) return
        let alt = img.alt
        let src = img.src
        return { a, id, img, alt, src }
      },
    )
      .filter(post => post)
      .map(post => post!)
  }

  type PostItem = ReturnType<typeof selectPosts>[number]

  async function collectPosts() {
    let seenPosts = new Set<PostItem>()

    let last_posts = []

    async function waitNewPosts() {
      for (; isCurrentVersion(); ) {
        let posts = selectPosts()
        if (posts.length > last_posts.length) {
          last_posts = posts
          return posts
        }
        await sleep(1000 + Math.random() * 500)
      }
    }

    for (;;) {
      let posts = await waitNewPosts()
      if (!posts) return
      let index = -1
      for (let post of posts) {
        index++
        if (seenPosts.has(post)) continue
        post.a.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await sleep(100)
        if (!(post.img.naturalWidth * post.img.naturalHeight)) {
          putToOutput({
            src: post.img.src,
            width: post.img.naturalWidth,
            height: post.img.naturalHeight,
          })
          continue
        }
        let canvas = document.createElement('canvas')
        canvas.width = post.img.naturalWidth
        canvas.height = post.img.naturalHeight
        let context = canvas.getContext('2d')!
        context.drawImage(post.img, 0, 0)
        let dataUrl = canvas.toDataURL('image/webp', 0.5)
        let newPost: NewPost = {
          page_slug: page_slug,
          post_slug: post.id,
          alt: post.alt,
          dataUrl,
          index,
          newer_post_slug: posts[index - 1]?.id,
          older_post_slug: posts[index + 1]?.id,
        }
        sendToFrame({ type: 'post', post: newPost })
        putToOutput({ id: post.id, alt: post.alt })
        seenPosts.add(post)
      }
      await sleep(1000 + Math.random() * 500)
    }
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  let profile = collectProfile()
  putToOutput(profile)
  sendToFrame({
    type: 'page',
    page: {
      slug: page_slug,
      posts: profile.posts,
      followers: profile.followers,
      following: profile.following,
    },
  })
  collectPosts()
}
main().catch(e => console.error(e))
