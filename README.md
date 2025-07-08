# gml2geojson

Convert GML features to GeoJSON.

## Install

```bash
npm install gml2geojson
```

## Usage

```ts
import { parseGML } from 'gml2geojson'

const xml = '<gml...>' // gml data string
const geojson = parseGML(xml)
```

The library works in both browser and Node.js environments.
