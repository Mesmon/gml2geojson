# gml2geojson

Convert GML features to GeoJSON.

## Install

```bash
npm install @mesmon/gml2geojson
```

## Usage

```ts
import { parseGML } from '@mesmon/gml2geojson'

const xml = '<gml...>' // gml data string
const geojson = parseGML(xml)
```

This library uses fast-xml-parser and works in both Node.js and browser environments.
