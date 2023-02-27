# add-toc

Google Spread ブックに目次シートを追加するスクリプト

# Getting Started

## Installing clasp

https://github.com/google/clasp

## Deployment

```
npm install
clasp push
```

## Parameter Configuration

### Script Property

名前 | 説明
---|---
`SPREADSHEET_ID`  | 対象となる Google Spread の ID
`TOC_SHEET_NAME`  | 目次シートの名前、同名のシートがある場合はそれを使い、ない場合は新規作成する
`START_ROW`       | 何列目から目次を書き出すかの指定

## Running Script

GAS 上で実行してください
