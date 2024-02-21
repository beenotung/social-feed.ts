async function main() {
  let slug = ''

  if (!isCurrentPage()) {
    return
  }

  function isCurrentPage() {
    return location.pathname.replace(/^\//, '').replace(/\/$/, '') == slug
  }

  function isCurrentVersion() {
    return isCurrentPage() && +output.textarea.dataset.version! == version
  }

  function injectOutput() {
    let div = document.querySelector('svg title')!.closest('div')!
    let _textarea = div.querySelector('textarea')
    if (!_textarea) {
      _textarea = document.createElement('textarea')
      div.appendChild(_textarea)
    }
    let textarea = _textarea
    textarea.id = 'output'
    function add(data: any) {
      textarea.value = (textarea.value + '\n\n' + JSON.stringify(data)).trim()
    }
    return { textarea, add }
  }

  function collectProfile() {
    function parseFromLastSpan(node: Element | null | undefined) {
      if (!node) return null
      let spans = node.querySelectorAll('span')
      let span = spans[spans.length - 1]
      let text = span.innerText
      return text.replaceAll(',', '')
    }

    let followers = parseFromLastSpan(
      document.querySelector(`[href="/${slug}/followers/"]`),
    )

    let following = parseFromLastSpan(
      document.querySelector(`[href="/${slug}/following/"]`),
    )

    let posts = parseFromLastSpan(
      document
        .querySelector(`[href="/${slug}/following/"]`)
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

  type Post = {
    id: string
    alt: string
    dataUrl: string
  }

  async function collectPosts(cb: (post: Post) => void) {
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
      let lastPost: PostItem
      for (let post of posts) {
        if (seenPosts.has(post)) continue
        if (!(post.img.naturalWidth * post.img.naturalHeight)) {
          continue
        }
        let canvas = document.createElement('canvas')
        canvas.width = post.img.naturalWidth
        canvas.height = post.img.naturalHeight
        let context = canvas.getContext('2d')!
        context.drawImage(post.img, 0, 0)
        let dataUrl = canvas.toDataURL('image/webp', 0.5)
        cb({ id: post.id, alt: post.alt, dataUrl })
        seenPosts.add(post)
        lastPost = post
      }
      lastPost ||= posts[posts.length - 1]
      if (lastPost) {
        lastPost.a.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      await sleep(1000 + Math.random() * 500)
    }
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  let output = injectOutput()
  output.textarea.value = ''
  let version = +output.textarea.dataset.version! || 0
  version++
  output.textarea.dataset.version = version.toString()

  let profile = collectProfile()
  output.add(profile)
  collectPosts(post => {
		// TODO send to server
    output.add(post)
  })
}
main().catch(e => console.error(e))
