import { Client } from "@notionhq/client";

const notion = new Client({
  auth: "secret_4AAdacc0xv2VFGoMM3Cwlh1IVZlFx39T1Scd0hHTq9t",
});

export async function queryDataBase(databaseId:string) {
    return await notion.databases.query({
        database_id: databaseId,
        filter:{
            and:[
                {
                    property: 'publish',
                    checkbox: {
                        equals: true
                    }
                }
            ]
        },
        sorts: [
            {
                property: 'date',
                direction: 'ascending'
            }
        ]
    }
    )
}

export async function queryPage(pageId:string){
    return await notion.pages.retrieve({
        page_id:pageId
    })
}

