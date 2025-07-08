# gml2geojson

Convert WFS GML responses to GeoJSON.

## Install

```bash
npm install gml2geojson
```

## Usage

```ts
import { parseGML } from 'gml2geojson';
import fs from 'node:fs';

const xml = fs.readFileSync('feature.gml', 'utf8');
const geojson = parseGML(xml);
console.log(JSON.stringify(geojson, null, 2));
```

The library works in both Node.js and browser environments. In the browser a UMD build is available via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/gml2geojson/dist/index.js"></script>
```
