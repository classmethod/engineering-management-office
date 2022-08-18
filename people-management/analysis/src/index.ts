import * as Notion from "@notionhq/client";
import {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

interface Score {
  [managerName: string]: number | null;
}
interface AllScore {
  [actionName: string]: Score;
}
interface Actions {
  [id: string]: string;
}

const notion = new Notion.Client({
  auth: process.env.NOTION_TOKEN,
  logLevel: Notion.LogLevel.WARN,
});

const ORGANIZATIONS_DATABASE_ID = "0e29cfb8bb3d4ccc98c9c49e03d3aeaf";
const ACTIONS: Actions = {
  a1a988e5ec994eb39e393ad305820d98: "定期 1on1",
  "967e2371ed17475b8af9ecabdbddfa78": "評価 目標設定",
  "1652cea61f074434bddf8e2b01060512": "評価 目標達成支援",
  "08fc9d02f2b44f129066e088a116a939": "評価 評価実施",
  f0f7a076ed4443c2850a76fc2718f793: "評価 評価フィードバック",
  "8cf3bff2118b41738da80acf40c2d059": "チーム内コミュニケーション",
  "54a944972d464153b65dd2a5d02c7353": "キャリア形成支援",
  c17e62cbd36f4fe2b030ec8cb576e10c: "360度フィードバック",
  "365f577392764a8885fb21f3a5f55613": "リアルタイムフィードバック",
  "10f3bb1b0b8f451a9d076f4bdef1a670": "入社オンボーディング",
  c4000ee496b745b3957d398534ae6293: "異動調整",
  "4a406c4255e642a28e7cac9120be868d": "異動オンボーディング",
  b5817aae448d4e0ab7af41490fa24b4e: "内定オファー",
  "6b123cb4a97f4d6abeb9c6b783f2dee0": "スポット1on1",
  b02a21ff90244ba8a35da7ba2804bc68: "退職オフボーディング",
};

main();

async function main() {
  const organizations = await getAllOrganizations();

  for (const organization of organizations) {
    const skillMapId = await getSkillMapDatabase(organization.id);
    const scores = await getScores(skillMapId);
    const organizationName = await getOrganizationName(organization);
    console.log(organizationName, scores);
  }
}

async function getAllOrganizations() {
  const response = await notion.databases.query({
    database_id: ORGANIZATIONS_DATABASE_ID,
  });
  return response.results;
}

async function getSkillMapDatabase(organizationId: string) {
  const blocks = await notion.blocks.children.list({
    block_id: organizationId,
  });

  for (const block of blocks.results) {
    if (Notion.isFullBlock(block) && block.type === "child_database") {
      return block.id;
    }
  }
  throw new Error("skill map database does not exists");
}

async function getScores(skillMapId: string) {
  const items = await notion.databases.query({
    database_id: skillMapId,
  });

  const result: AllScore = {};
  for (const item of items.results) {
    if (!Notion.isFullPage(item)) {
      continue;
    }

    const score: Score = {};
    for (const propertyName in item.properties) {
      if (propertyName === "Name") {
        const actionName: string = await getActionName(
          item.id,
          item.properties[propertyName].id
        );
        if (!(actionName in result)) {
          result[actionName] = score;
        }
      }

      const property = await notion.pages.properties.retrieve({
        page_id: item.id,
        property_id: item.properties[propertyName].id,
      });

      if (property.type !== "number") {
        continue;
      }

      score[propertyName] = property.number;
    }
  }
  return result;
}

async function getActionName(pageId: string, propertyId: string) {
  const property = await notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: propertyId,
  });
  if (property.type !== "property_item") {
    throw new Error("unexpected error");
  }

  for (const item of property.results) {
    if (item.type !== "title") {
      continue;
    }
    const { title } = item;
    if (title.type !== "mention") {
      continue;
    }
    const { mention } = title;
    if (mention.type !== "page") {
      continue;
    }
    const id = mention.page.id.replace(/-/g, "");
    return ACTIONS[id];
  }

  throw new Error("Can not get action name: invalid database");
}

async function getOrganizationName(
  organization: PageObjectResponse | PartialPageObjectResponse
) {
  if (!Notion.isFullPage(organization)) {
    throw new Error("unexpected error");
  }
  for (const propertyName in organization.properties) {
    if (propertyName !== "Name") {
      continue;
    }

    const property = await notion.pages.properties.retrieve({
      page_id: organization.id,
      property_id: organization.properties[propertyName].id,
    });
    if (property.type !== "property_item") {
      throw new Error("unexpected error");
    }

    for (const item of property.results) {
      if (item.type !== "title") {
        continue;
      }

      return item.title.plain_text;
    }
  }
}
