// import { React } from "react";


export interface RichText {
    data: any[]
}

export function resolveHtml(text){
    let content = "";
    for (let e of text) {
        switch(e.type){
            case "mention":
                content = content + resolveMention(e)
                break;
            case "text":
                content = content + resolveText(e)
                break;
        }
        }
    
    return `<div>${content}</div>`
}

export function resolveMention(mention){
    return `<a href="${mention.href}">${mention.href}</a>`
}

export function resolveText(text){

    const a = text.annotations;

    if(a.bold){

    }
    if(a.italic){

    }
    if(a.underline){

    }
    if(a.code){

    }
    if(a.color){

    }

    return `<span>${text.plain_text}</span>`
}



export function resolvePlainText(text){
    const contents = text.map(value => {
        if (value.type == 'text') {
            return value.text.content
        }
        if (value.type == 'mention'){
            return value.href
        }
    })
    return contents.join("")
}

export function resolveMentionHrefs(text){
    if (text && text.type == 'mention') {
        return text.href
    }
    return null
}