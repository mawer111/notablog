import fs from 'fs'
import path from 'path'
import { createAgent } from 'notionapi-agent'
import { TaskManager2 } from '@dnpr/task-manager'
import { copyDirSync } from '@dnpr/fsutil'

import { Cache } from './cache'
import { Config } from './config'
import { parseTable } from './parse-table'
import { EJSStrategy, Renderer, SqrlStrategy } from './renderer'
import { renderIndex } from './render-index'
import { renderPost } from './render-post'
import { log, parseJSON } from './utils'
import { toDashID } from './notion-utils'
import { RenderPostTask, ThemeManifest } from './types'

type GenerateOptions = {
  concurrency?: number
  verbose?: boolean
  ignoreCache?: boolean
}

/**
 * @typedef {Object} GenerateOptions
 * @property {string} workDir - A valid Notablog starter directory.
 * @property {number} concurrency - Concurrency for Notion page 
 * downloading and rendering.
 * @property {boolean} verbose - Whether to print more messages for 
 * debugging.
 */

/**
 * Generate a blog.
 * TODO Support link to a page
 */
export async function generate(workDir: string, opts: GenerateOptions = {}) {
  const { concurrency, verbose, ignoreCache } = opts  

  const notionAgent = createAgent({ debug: verbose })
  const cache = new Cache(path.join(workDir, 'cache'))
  const config = new Config(path.join(workDir, 'config.json'))

  /** Init dir paths. */
  const theme = config.get('theme')
  const themeDir = path.join(workDir, `themes/${theme}`)
  if (!fs.existsSync(themeDir)) {
    throw new Error(`Cannot find theme "${theme}" in themes/`)
  }

  const outDir = path.join(workDir, 'public')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const tagDir = path.join(workDir, 'public/tag')
  if (!fs.existsSync(tagDir)) {
    fs.mkdirSync(tagDir, { recursive: true })
  }

  const dirs = {
    workDir, themeDir, outDir, tagDir
  }

  /** Create TemplateProvider instance. */
  const templateDir = path.join(themeDir, 'layouts')
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Cannot find layouts/ in theme "${theme}"`)
  }
  const themeManifestPath = path.join(themeDir, 'manifest.json')
  const themeManifest = parseJSON(fs.readFileSync(themeManifestPath)) as ThemeManifest
  const templateEngine = themeManifest.templateEngine
  const renderStrategy = templateEngine === 'ejs' ? 
    new EJSStrategy(templateDir) : new SqrlStrategy(templateDir)
  const renderer = new Renderer(renderStrategy)

  /** Copy theme assets. */
  log.info('Copy theme assets')
  const assetDir = path.join(themeDir, 'assets')
  copyDirSync(assetDir, outDir)

  /** Fetch site metadata. */
  log.info('Fetch site metadata')
  const siteContext = await parseTable(config.get('url'), notionAgent)

  /** Render home page and tags */
  log.info('Render home page and tags')
  renderIndex({
    data: {
      siteContext: siteContext
    },
    tools: {
      renderer,
      notionAgent,
      cache
    },
    config: {
      ...dirs
    }
  })

  /** Render pages. */
  log.info('Fetch and render pages')
  const { pagesUpdated, pagesNotUpdated } = siteContext.pages
    .reduce((data, page) => {
      if (ignoreCache || cache.shouldUpdate('notion', toDashID(page.id), page.lastEditedTime)) {
        data.pagesUpdated.push(page)
      } else {
        data.pagesNotUpdated.push(page)
      }
      return data
    }, {
      pagesUpdated: [], pagesNotUpdated: []
    } as {
      pagesUpdated: typeof siteContext.pages
      pagesNotUpdated: typeof siteContext.pages
    })

  const pageTotalCount = siteContext.pages.length
  const pageUpdatedCount = pagesUpdated.length
  const pagePublishedCount = siteContext.pages
    .filter(page => page.publish).length
  log.info(`${pageUpdatedCount} of ${pageTotalCount} posts have been updated`)
  log.info(`${pagePublishedCount} of ${pageTotalCount} posts are published`)

  const tm2 = new TaskManager2({ concurrency })
  const tasks = []
  pagesUpdated.forEach(pageMetadata => {
    tasks.push(tm2.queue(renderPost, [{
      data: {
        siteContext, pageMetadata, doFetchPage: true
      },
      tools: {
        renderer, notionAgent, cache
      },
      config: {
        ...dirs
      }
    } as RenderPostTask]) as never)
  })
  pagesNotUpdated.forEach(pageMetadata => {
    tasks.push(tm2.queue(renderPost, [{
      data: {
        siteContext, pageMetadata, doFetchPage: false
      },
      tools: {
        renderer, notionAgent, cache
      },
      config: {
        ...dirs
      }
    } as RenderPostTask]) as never)
  })
  await Promise.all(tasks)
  return 0
}