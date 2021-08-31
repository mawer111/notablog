import { createAgent } from 'notionapi-agent'
import { SemanticString } from 'nast-types'

import { Cache } from './cache'
import { Renderer } from './renderer'

export interface Tag {
  value: string
  color: string
}

export interface SiteContext {
  icon: string | undefined
  iconHTML: string
  cover: string | undefined
  title: SemanticString[]
  description: SemanticString[] | undefined
  descriptionPlain: string
  descriptionHTML: string
  pages: PageMetadata[]
  /** tag name -> pages */
  tagMap: Map<string, PageMetadata[]>
}

export interface PageMetadata {
  /** No dashes. */
  id: string
  targetPageId: string
  icon: string | undefined
  iconHTML: string
  cover: string | undefined
  title: SemanticString[]
  tags: Tag[]
  publish: boolean
  inMenu: boolean
  inList: boolean
  template: string
  url: string 
  description: string | undefined
  descriptionPlain: string
  descriptionHTML: string
  date: string | undefined
  dateString: string | undefined
  createdTime: number
  lastEditedTime: number
  targetNotionUrl: string 
  targetBlogUrl: string 
}

export interface RenderTask {
  data: {}
  tools: {
    renderer: Renderer
    notionAgent: ReturnType<typeof createAgent>
    cache: Cache
  }
  config: {
    workDir: string
    themeDir: string
    outDir: string
    tagDir: string
  }
}

export interface RenderIndexTask extends RenderTask {
  data: {
    siteContext: SiteContext
  }
}

export interface RenderPostTask extends RenderTask {
  data: {
    siteContext: SiteContext
    pageMetadata: PageMetadata
    doFetchPage: boolean
  }
}

export interface ThemeManifest {
  notablogVersion: string
  templateEngine: string
}