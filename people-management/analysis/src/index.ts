import * as Notion from "@notionhq/client";
import {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import * as CSV from "csv";
import * as fs from "fs";

interface Organization {
  id: string;
  name: string;
}
interface Score {
  [managerName: string]: number | null;
}
interface AllScore {
  [actionOrder: number]: Score;
}
interface Actions {
  [id: string]: {
    order: number;
    name: string;
  };
}

const notion = new Notion.Client({
  auth: process.env.NOTION_TOKEN,
  logLevel: Notion.LogLevel.WARN,
});

const ORGANIZATIONS_DATABASE_ID = "0e29cfb8bb3d4ccc98c9c49e03d3aeaf";
const ACTIONS: Actions = {
  a1a988e5ec994eb39e393ad305820d98: {
    order: 0,
    name: "定期 1on1",
  },
  "967e2371ed17475b8af9ecabdbddfa78": {
    order: 1,
    name: "評価 目標設定",
  },
  "1652cea61f074434bddf8e2b01060512": {
    order: 2,
    name: "評価 目標達成支援",
  },
  "08fc9d02f2b44f129066e088a116a939": {
    order: 3,
    name: "評価 評価実施",
  },
  f0f7a076ed4443c2850a76fc2718f793: {
    order: 4,
    name: "評価 評価フィードバック",
  },
  "8cf3bff2118b41738da80acf40c2d059": {
    order: 5,
    name: "チーム内コミュニケーション",
  },
  "54a944972d464153b65dd2a5d02c7353": {
    order: 6,
    name: "キャリア形成支援",
  },
  c17e62cbd36f4fe2b030ec8cb576e10c: {
    order: 7,
    name: "360度フィードバック",
  },
  "365f577392764a8885fb21f3a5f55613": {
    order: 8,
    name: "リアルタイムフィードバック",
  },
  "10f3bb1b0b8f451a9d076f4bdef1a670": {
    order: 9,
    name: "入社オンボーディング",
  },
  c4000ee496b745b3957d398534ae6293: {
    order: 10,
    name: "異動調整",
  },
  "4a406c4255e642a28e7cac9120be868d": {
    order: 11,
    name: "異動オンボーディング",
  },
  b5817aae448d4e0ab7af41490fa24b4e: {
    order: 12,
    name: "内定オファー",
  },
  "6b123cb4a97f4d6abeb9c6b783f2dee0": {
    order: 13,
    name: "スポット1on1",
  },
  b02a21ff90244ba8a35da7ba2804bc68: {
    order: 14,
    name: "退職オフボーディング",
  },
};

main();

async function main() {
  const organizations = await getAllOrganizations();

  for (const organization of organizations) {
    console.info(`collecting score of ${organization.name}`);
    const skillMapId = await getSkillMapDatabase(organization.id);
    const scores = await getScores(skillMapId);
    write(organization, scores);
  }
}

async function getAllOrganizations() {
  const response = await notion.databases.query({
    database_id: ORGANIZATIONS_DATABASE_ID,
  });
  return Promise.all(
    response.results.map(async (organization) => ({
      id: organization.id,
      name: await getOrganizationName(organization),
    }))
  );
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
      if (item.properties[propertyName].id === "title") {
        const action = await getActionName(
          item.id,
          item.properties[propertyName].id
        );
        result[action.order] = score;
        continue;
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
    if (organization.properties[propertyName].id !== "title") {
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

  throw new Error("unexpected error");
}

function write(organization: Organization, score: AllScore) {
  const transformed = transform(score);
  const output = CSV.stringify(transformed, (err, output) => {
    fs.writeFileSync(`dist/${organization.name}.csv`, output);
  });
}

type Data = Array<{ [name: string]: string | number | null }>;
function transform(score: AllScore) {
  const data: Data = Array.from({
    ...score,
    length: Object.keys(score).length,
  });
  const allScores = data.map((actionScores, index) => {
    const result = Object.keys(actionScores)
      .sort()
      .map((name) => actionScores[name]);
    return [index, ...result];
  });

  allScores.unshift(["", ...Object.keys(score[0]).sort()]);
  return allScores;
}
