import { XMLParser } from 'fast-xml-parser';

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: { [key: string]: any };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const GEONODE_NAMES = ['geometryproperty', 'shape', 'the_geom'];

const xmlParser = new XMLParser({ ignoreAttributes: false });

export function parseGML(str: string): GeoJSONFeatureCollection {
  const geojson: GeoJSONFeatureCollection = { type: 'FeatureCollection', features: [] };
  const xmlObj = xmlParser.parse(str);
  const rootKey = Object.keys(xmlObj).find(k => /featurecollection/i.test(k));
  if (!rootKey) {
    return geojson;
  }
  const featureCollection = xmlObj[rootKey];
  let members = featureCollection['gml:featureMember'];
  if (!members) {
    return geojson;
  }
  const memberArray = Array.isArray(members) ? members : [members];
  for (const mem of memberArray) {
    const featureObj = mem[Object.keys(mem)[0]]; // first child
    const properties = getFeatureProperties(featureObj);
    const geometry = getFeatureGeometry(featureObj, properties.isShape);
    if (!geometry) continue;
    geojson.features.push({ type: 'Feature', geometry, properties });
  }
  return geojson;
}

function getFeatureGeometry(featureObj: any, isShape: boolean) {
  for (const key of Object.keys(featureObj)) {
    const lower = key.toLowerCase();
    if (GEONODE_NAMES.some(n => lower.includes(n))) {
      const geoNode = featureObj[key];
      const typeKey = Object.keys(geoNode)[0];
      if (!typeKey) return null;
      const type = typeKey.replace('gml:', '');
      const geoContent = geoNode[typeKey];
      let coordinates: any[] | any = [];
      if (isMulti(typeKey)) {
        const memberKey = Object.keys(geoContent).find(k => k.toLowerCase().includes('member'));
        const members = memberKey ? geoContent[memberKey] : [];
        const arr = Array.isArray(members) ? members : [members];
        for (const m of arr) {
          const coordsText = findCoordsText(m);
          let coords = parseCoordinates(coordsText, isShape);
          if (!geoIsPolygon(type)) {
            coords = Array.isArray(coords) && Array.isArray(coords[0]) ? coords[0] : coords;
          }
          (coordinates as any[]).push(coords);
        }
        if ((coordinates as any[]).length === 1 && !type.includes('Multi')) {
          coordinates = (coordinates as any[])[0];
        }
      } else {
        const coordsText = findCoordsText(geoContent);
        coordinates = parseCoordinates(coordsText, isShape);
      }
      if (!coordinates || (Array.isArray(coordinates) && !coordinates.length)) {
        return null;
      }
      return { type, coordinates };
    }
  }
  return null;
}

function getFeatureProperties(featureObj: any) {
  const properties: any = {};
  let isShape = false;
  for (const key of Object.keys(featureObj)) {
    const lower = key.toLowerCase();
    if (GEONODE_NAMES.some(n => lower.includes(n))) {
      if (lower.includes('shape')) {
        isShape = true;
      }
      continue;
    }
    if (key.startsWith('@_')) continue;
    properties[key.split(':')[1] || key] = featureObj[key];
  }
  properties.isShape = isShape;
  return properties;
}

function isMulti(nodeName: string) {
  return nodeName.toLowerCase().includes('multi') || nodeName.toLowerCase().includes('member');
}

function geoIsPolygon(type: string) {
  return type.indexOf('Polygon') > -1;
}

function findCoordsText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node['gml:coordinates']) return node['gml:coordinates'];
  if (node['gml:pos']) return node['gml:pos'];
  if (node['gml:posList']) return node['gml:posList'];
  for (const k of Object.keys(node)) {
    const res = findCoordsText(node[k]);
    if (res) return res;
  }
  return '';
}

function parseCoordinates(text: string, isShape: boolean) {
  if (!text) return [];
  const coords = text.trim().split(/\s+/);
  let [c1, c2] = coords;
  if (c1.includes(',')) {
    const result: number[][] = [];
    for (const c of coords) {
      const [lng, lat] = c.split(',').map(n => parseFloat(n));
      result.push([lng, lat]);
    }
    return result.length > 1 ? result : result[0];
  } else {
    const l1 = parseFloat(c1);
    const l2 = parseFloat(c2);
    return isShape ? [l2, l1] : [l1, l2];
  }
}
