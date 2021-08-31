import { PageMetadata } from './types'
import { resolveHtml, resolvePlainText, resolveMentionHrefs } from './notion-open/notion-rich-text'
import { MultiSelect } from './notion-open/notion-type'
import { queryPage } from './notion-open-api'

function renderIconToHTML(icon) {
  const re = /^http/
  if (icon && icon.type == 'emoji') {
    return icon.emoji ? `<span>${icon.emoji}</span>` : ''
  }
  if (re.test(icon)) {
    return `<span><img class="inline-img-icon" src="${icon}"></span>`
  } else {
    return icon ? `<span>${icon}</span>` : ''
  }
}

function resolveCoverUrl(cover) {
  if (cover && cover.type == 'external') {
    return cover.external.url
  }
  return null
}

function resolvePageNotionUrl(page) {
  const link = page.properties.link;
  if (link && link.type == 'rich_text') {
    const mentionUrl = resolveMentionHrefs(link.rich_text[0])
    if (mentionUrl) {
      return mentionUrl
    }
  }
  return page.url
}

function resolveTargetId(page) {
  const link = page.properties.link;
  if (link && link.type == 'rich_text') {
    const text = link.rich_text[0]
    if (text && text.type == 'mention') {
      return text.mention.page.id
    }
  }
  return page.id
}

function resolvePageBlogUrl(url) {
  return `${url.split("/").pop().split("?")[0]}.html`
}

function resolveTagMultiSelect(property): MultiSelect[] {
  if (property && property.type == 'multi_select') {
    const element = property['multi_select']
    const selects: MultiSelect[] = element.map(e => {
      return e
    })
    return selects
  }
  return [];
}

function resolveDateString(rawDate: string) {
  return new Date(rawDate).toLocaleString()
}



export async function resolvePageMeta(db) {
  const pages:PageMetadata[] = await Promise.all(db.results.map(
    async (row) => {
      const properties = row.properties
      const targetPageId = resolveTargetId(row)
      const notionPage = await queryPage(targetPageId) as any
      return {
        id: row.id,
        icon: row.icon ? row.icon : null,
        iconHTML: renderIconToHTML(row.icon),
        cover: resolveCoverUrl(notionPage.cover),
        title: row.properties.title.title[0].text.content,
        tags: resolveTagMultiSelect(properties['tags']).map(e => { return { value: e.name, color: e.color } }),
        publish: properties.publish.checkbox,
        inMenu: properties.inMenu.checkbox,
        inList: properties.inList.checkbox,
        template: properties.template.select.name,
        url: row.url,
        description: resolvePlainText(properties.description.rich_text),
        descriptionPlain: resolvePlainText(properties.description.rich_text),
        // descriptionHTML: "<div>" + resolvePlainText(properties.description.rich_text) + "</div>",
        descriptionHTML: resolveHtml(properties.description.rich_text),
        date: properties.date.date ? properties.date.date.start : row.created_time,
        dateString: resolveDateString(row.properties.date.date ? row.properties.date.date.start : row.created_time),
        createdTime: row.created_time,
        lastEditedTime: row.last_edited_time,
        targetPageUrl: resolvePageNotionUrl(row),
        targetBlogUrl: resolvePageBlogUrl(resolvePageNotionUrl(row)),
        targetPageId: resolveTargetId(row)
      }
    }
  ));
  return pages
}
