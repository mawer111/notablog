import { createAgent } from 'notionapi-agent'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
import { SemanticString } from 'nast-types'

import { getPageIDFromCollectionPageURL } from './notion-utils'
import { SiteContext} from './types'
import { queryDataBase } from './notion-open-api'
import { resolvePageMeta } from './open-api-helper'
/**
 * Extract interested data for blog generation from a Notion table.
 */
export async function parseTable(
  collectionPageURL: string, 
  notionAgent: ReturnType<typeof createAgent>
): Promise<SiteContext> { 
  const db = await queryDataBase("cd36e765-8c64-4e12-9900-7a769a663560")
  const pages = await resolvePageMeta(db)
  const pageID = getPageIDFromCollectionPageURL(collectionPageURL)
  const pageCollection = (await getOnePageAsTree(pageID, notionAgent)) as NAST.CollectionPage

  
  const siteContext = {
    icon: pageCollection.icon,
    iconHTML: renderIconToHTML(pageCollection.icon),
    cover: pageCollection.cover,
    title: pageCollection.name,
    description: pageCollection.description,
    descriptionPlain: renderStyledStringToTXT(pageCollection.description),
    descriptionHTML: renderStyledStringToHTML(pageCollection.description),
    /**
     * Sort the pages so that the most recent post is at the top.
     */
    pages: pages.sort((later, former) => {
      const laterTimestamp = later.date
        ? (new Date(later.date)).getTime() : 0
      const formerTimestamp = former.date
        ? (new Date(former.date)).getTime() : 0
      if (laterTimestamp > formerTimestamp) return -1
      else if (laterTimestamp < formerTimestamp) return 1
      else return 0
    }),
    tagMap: new Map()
  }

  siteContext.pages = pages
  /**
   * Create tagMap
   */
  siteContext.pages.forEach(page => {
    page.tags.forEach(tag => {
      if (!siteContext.tagMap.has(tag.value)) {
        siteContext.tagMap.set(tag.value, [page])
      } else {
        siteContext.tagMap.get(tag.value).push(page)
      }
    })
    page.url = page.targetBlogUrl
    page.id = page.targetPageId
  })

  return siteContext
}

/**
 * Utility functions to get useful values from properties of Nast.Page
 */

function renderStyledStringToTXT(styledStringArr: SemanticString[] | undefined): string {
  if (styledStringArr) return styledStringArr.map(str => str[0]).join('')
  else return ''
}


function renderStyledStringToHTML(styledStringArr: SemanticString[] | undefined): string {
  if (styledStringArr) return renderToHTML(styledStringArr)
  else return ''
}

/**
 * If the icon is an url, wrap it with `<img>`.
 * @param {string} icon 
 */
function renderIconToHTML(icon) {
  const re = /^http/
  if (re.test(icon)) {
    return `<span><img class="inline-img-icon" src="${icon}"></span>`
  } else {
    return icon ? `<span>${icon}</span>` : ''
  }
}