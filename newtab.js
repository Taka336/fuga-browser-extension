const FEED_URL = 'https://kanshi.page/works-feed.json'
const LAST_WORK_KEY = 'fuga-last-work-id'

const elements = {
  artwork: document.querySelector('#artwork'),
  title: document.querySelector('#work-title'),
  author: document.querySelector('#work-author'),
  poemView: document.querySelector('.poem-view'),
  poem: document.querySelector('#poem'),
  workLink: document.querySelector('#work-link'),
}

function chooseWork(works, excludedId) {
  const candidates = works.length > 1
    ? works.filter((work) => work.id !== excludedId)
    : works
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function renderTitle(work) {
  const characters = Array.from(work.title)
  const breakAt = Number.isInteger(work.titleBreakAt)
    && work.titleBreakAt > 0
    && work.titleBreakAt < characters.length
    ? work.titleBreakAt
    : 0

  if (!breakAt) {
    elements.title.textContent = work.title
    return
  }

  const lineBreak = document.createElement('br')
  elements.title.replaceChildren(
    document.createTextNode(characters.slice(0, breakAt).join('')),
    lineBreak,
    document.createTextNode(characters.slice(breakAt).join('')),
  )
}

function renderWork(work) {
  renderTitle(work)
  elements.author.textContent = work.author

  const isBalancedLayout = [6, 8, 10].includes(work.lines.length)
  const linesPerRow = isBalancedLayout ? work.lines.length / 2 : 10
  const groups = work.lines.length > 10 || isBalancedLayout
    ? Array.from({ length: Math.ceil(work.lines.length / linesPerRow) }, (_, index) => (
        work.lines.slice(index * linesPerRow, (index + 1) * linesPerRow)
      ))
    : [work.lines]
  const breakBefore = isBalancedLayout
    ? [Math.ceil(work.lines.length / 2) + 1]
    : work.lines.length > 10
      ? [5, 9, 13, 17]
      : []

  elements.poem.classList.toggle('is-multirow', groups.length > 1)
  elements.poemView.classList.toggle('is-balanced-layout', isBalancedLayout)
  elements.poem.replaceChildren(...groups.flatMap((group, groupIndex) => {
    const lines = group.map((line, lineIndex) => {
      const absoluteIndex = groupIndex * linesPerRow + lineIndex + 1
      const paragraph = document.createElement('p')
      paragraph.className = `poem-line${breakBefore.includes(absoluteIndex) ? ' is-group-break' : ''}`
      paragraph.textContent = line
      return paragraph
    })

    if (groups.length === 1) return lines
    const row = document.createElement('div')
    row.className = 'poem-row'
    row.append(...lines)
    return [row]
  }))

  elements.artwork.src = work.image
  elements.artwork.alt = work.imageAlt
  elements.workLink.href = `https://kanshi.page/works/${encodeURIComponent(work.id)}`
  elements.workLink.hidden = false
  document.title = `${work.title} — 漢詩のひととき`
}

async function loadWorks() {
  try {
    const response = await fetch(FEED_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`作品一覧の取得に失敗しました (${response.status})`)
    const feed = await response.json()
    if (feed?.version !== 1 || !Array.isArray(feed.works) || feed.works.length === 0) {
      throw new Error('作品一覧の形式が正しくありません')
    }

    const works = feed.works.filter((work) => (
      typeof work?.id === 'string'
      && typeof work?.title === 'string'
      && typeof work?.author === 'string'
      && typeof work?.image === 'string'
      && typeof work?.imageAlt === 'string'
      && Array.isArray(work?.lines)
      && work.lines.length > 0
      && work.lines.length <= 10
      && work.lines.every((line) => typeof line === 'string')
    ))
    if (works.length === 0) throw new Error('表示できる作品がありません')

    const work = chooseWork(works, localStorage.getItem(LAST_WORK_KEY))
    renderWork(work)
    localStorage.setItem(LAST_WORK_KEY, work.id)
  } catch (error) {
    console.error('新しいタブの作品を読み込めませんでした', error)
  }
}

loadWorks()
