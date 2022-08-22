import {
  GetPageResponse,
  BlockObjectResponse,
  GetPagePropertyResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  PartialPageObjectResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

export function main() {
  console.info("collecting all organizations");
  const organizations = getAllOrganizations();

  for (const organization of organizations) {
    console.info(`collecting score of ${organization.name}`);
    const skillMapId = getSkillMapDatabase(organization.id);
    const scores = getScores(skillMapId);
    write(organization, scores);
  }
}

function write(organization: Organization, score: Score) {
  const transformed = transform(score);
  const sheet = getSheet(organization.name);

  sheet.clear();
  sheet
    .getRange(1, 1, transformed.length, transformed[0].length)
    .setValues(transformed);
  SpreadsheetApp.flush();
}

function getSheet(organizationName: string) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(organizationName);
  if (sheet === null) {
    return spreadsheet.insertSheet(organizationName);
  }
  return sheet;
}

type Data = Array<{ [name: string]: string | number | null }>;
export function transform(score: Score) {
  const data: Data = Array.from({
    ...score,
    length: Object.keys(score).length,
  });
  const allScores = data.map((actionScores, index) => {
    const result = Object.keys(actionScores)
      .sort()
      .map((name) => actionScores[name]);
    return [ACTIONS_ARRAY[index], ...result];
  });

  allScores.unshift(["", ...Object.keys(score[0]).sort()]);
  return allScores;
}

interface Organization {
  id: string;
  name: string;
}
interface ManagerScore {
  [managerName: string]: number | null;
}
interface Score {
  [actionName: string]: ManagerScore;
}

const ORGANIZATIONS_DATABASE_ID = "0e29cfb8bb3d4ccc98c9c49e03d3aeaf";
const ACTIONS = {
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
const ACTIONS_ARRAY = Array.from(
  Object.values(ACTIONS).reduce(
    (result, action) => {
      result[action.order] = action.name;
      return result;
    },
    { length: 15 }
  )
);

function getAllOrganizations() {
  const response = notion.databases.query(ORGANIZATIONS_DATABASE_ID);
  return response.results.map((organization) => {
    return {
      id: organization.id,
      name: getOrganizationName(organization),
    };
  });
}

function getSkillMapDatabase(organizationId: string) {
  const blockList = notion.blocks.children.list(organizationId);
  for (const block of blockList.results) {
    if (notion.isFullBlock(block) && block.type === "child_database") {
      return block.id;
    }
  }
  throw new Error("skill map database does not exists");
}

function getScores(skillMapId: string) {
  const items = notion.databases.query(skillMapId);
  const result = {};
  for (const item of items.results) {
    if (!notion.isFullPage(item)) {
      continue;
    }

    const score = {};
    for (const propertyName in item.properties) {
      if (item.properties[propertyName].id === "title") {
        const action = getActionName(item.id, item.properties[propertyName].id);
        result[action.order] = score;
        continue;
      }
      const property = notion.pages.properties.retrieve(
        item.id,
        item.properties[propertyName].id
      );
      if (property.type !== "number") {
        continue;
      }
      score[propertyName] = property.number;
    }
  }
  return result;
}

function getActionName(pageId: string, propertyId: string) {
  const property = notion.pages.properties.retrieve(pageId, propertyId);
  if (property.type !== "property_item") {
    throw new Error("unexpected error");
  }

  for (const item of property.results) {
    if (item.type !== "title") {
      continue;
    }

    const title = item.title;
    if (title.type !== "mention") {
      continue;
    }

    const mention = title.mention;
    if (mention.type !== "page") {
      continue;
    }

    const id = mention.page.id.replace(/-/g, "");
    return ACTIONS[id];
  }

  throw new Error("Can not get action name: invalid database");
}

function getOrganizationName(
  organization: GetPageResponse | PartialPageObjectResponse
) {
  if (!notion.isFullPage(organization)) {
    throw new Error("unexpected error");
  }
  for (const propertyName in organization.properties) {
    if (organization.properties[propertyName].id !== "title") {
      continue;
    }
    const property = notion.pages.properties.retrieve(
      organization.id,
      organization.properties[propertyName].id
    );
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

function getVariable(key: string) {
  if (PropertiesService !== undefined) {
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty(key);
  }

  return process.env[key];
}

type HttpMethod = "get" | "delete" | "patch" | "post" | "put";
interface RequestOptions {
  contentType: string;
  headers: {
    Authorization: string;
    "Notion-Version": string;
  };
  method?: HttpMethod;
}
const notion = {
  request<T>(url: string, method?: HttpMethod) {
    const options: RequestOptions = {
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${getVariable("NOTION_TOKEN")}`,
        "Notion-Version": "2022-06-28",
      },
    };
    if (method !== undefined) {
      options.method = method;
    }
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText()) as T;
  },

  ENDPOINT: "https://api.notion.com/v1",
  databases: {
    query(databaseId: string) {
      const url = `${notion.ENDPOINT}/databases/${databaseId}/query`;
      return notion.request<QueryDatabaseResponse>(url, "post");
    },
  },
  blocks: {
    children: {
      list(blockId: string) {
        const url = `${notion.ENDPOINT}/blocks/${blockId}/children`;
        return notion.request<ListBlockChildrenResponse>(url);
      },
    },
  },
  pages: {
    properties: {
      retrieve(pageId: string, propertyId: string) {
        const url = `${notion.ENDPOINT}/pages/${pageId}/properties/${propertyId}`;
        return notion.request<GetPagePropertyResponse>(url);
      },
    },
  },

  isFullPage(
    response: PageObjectResponse | PartialPageObjectResponse
  ): response is PageObjectResponse {
    return "url" in response;
  },

  isFullBlock(
    response: BlockObjectResponse | PartialBlockObjectResponse
  ): response is BlockObjectResponse {
    return "type" in response;
  },
};
