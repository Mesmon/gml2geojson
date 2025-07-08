import { XMLParser } from 'fast-xml-parser';
import { FeatureCollection, Feature, Geometry } from 'geojson';

const GEO_NODE_NAMES = ['geometryproperty', 'shape', 'the_geom'];

export function parseGML(str: string): FeatureCollection {
  const parser = new XMLParser({ ignoreAttributes: false });
  const xmlObj = parser.parse(str);
  const rootKey = Object.keys(xmlObj).find(k => k.toLowerCase().includes('featurecollection'));
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  if (!rootKey) return empty;

  const fc = (xmlObj as any)[rootKey];
  let members: any = fc['gml:featureMember'] ?? fc['featureMember'];
  if (!members) return empty;
  if (!Array.isArray(members)) members = [members];

  const features: Feature[] = [];
  for (const m of members) {
    const featureKey = Object.keys(m)[0];
    const featureObj = m[featureKey];
    const props = getProperties(featureObj);
    const geometry = getGeometry(featureObj, props.isShape);
    if (!geometry) continue;
    const { isShape, ...properties } = props as any;
    features.push({ type: 'Feature', geometry, properties });
  }
  return { type: 'FeatureCollection', features };
}

function getGeometry(featureObj: any, isShape: boolean): Geometry | null {
  for (const [key, value] of Object.entries(featureObj)) {
    const lower = key.toLowerCase();
    if (GEO_NODE_NAMES.some(n => lower.includes(n))) {
      if (!value) return null;
      const geometryKey = Object.keys(value as any)[0];
      const type = geometryKey.split(':')[1];
      const gmlNode = (value as any)[geometryKey];
      const coordinates = parseGeometryNode(type, gmlNode, isShape);
      if (!coordinates) return null;
      return { type: type as Geometry['type'], coordinates } as Geometry;
    }
  }
  return null;
}

function getProperties(featureObj: any): Record<string, any> & { isShape: boolean } {
  const props: Record<string, any> = {};
  let isShape = false;
  for (const [key, value] of Object.entries(featureObj)) {
    const lower = key.toLowerCase();
    if (GEO_NODE_NAMES.some(n => lower.includes(n))) {
      if (lower.includes('shape')) isShape = true;
      continue;
    }
    if (key.startsWith('@_')) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const k = key.split(':')[1] || key;
      props[k] = value;
    }
  }
  (props as any).isShape = isShape;
  return props as any;
}

function parseGeometryNode(type: string, node: any, isShape: boolean): any {
  switch (type) {
    case 'Point':
      return parseCoordinates(node['gml:coordinates'] || node['gml:pos'], isShape)[0];
    case 'MultiPoint': {
      const members = asArray(node['gml:pointMember']);
      return members.map((m: any) =>
        parseCoordinates(m['gml:Point']['gml:coordinates'] || m['gml:Point']['gml:pos'], isShape)[0]
      );
    }
    case 'LineString':
      return parseCoordinates(node['gml:coordinates'] || node['gml:posList'], isShape);
    case 'MultiLineString': {
      const members = asArray(node['gml:lineStringMember']);
      return members.map((m: any) =>
        parseCoordinates(m['gml:LineString']['gml:coordinates'] || m['gml:LineString']['gml:posList'], isShape)
      );
    }
    case 'Polygon': {
      const text = node['gml:outerBoundaryIs']?.['gml:LinearRing']?.['gml:coordinates'] ||
        node['gml:exterior']?.['gml:LinearRing']?.['gml:posList'];
      return [parseCoordinates(text, isShape)];
    }
    case 'MultiPolygon': {
      const members = asArray(node['gml:polygonMember']);
      return members.map((m: any) => {
        const poly = m['gml:Polygon'];
        const text = poly['gml:outerBoundaryIs']?.['gml:LinearRing']?.['gml:coordinates'] ||
          poly['gml:exterior']?.['gml:LinearRing']?.['gml:posList'];
        return [parseCoordinates(text, isShape)];
      });
    }
  }
  return null;
}

function parseCoordinates(text: string, isShape: boolean): number[][] {
  if (!text) return [];
  const parts = text.trim().split(/\s+/);
  if (!parts[0].includes(',') && parts.length === 2) {
    const [x, y] = parts.map(p => parseFloat(p));
    return [[isShape ? y : x, isShape ? x : y]];
  }
  return parts.map(p => {
    const [x, y] = p.split(',').map(t => parseFloat(t));
    return [isShape ? y : x, isShape ? x : y];
  });
}

function asArray<T>(item: T | T[]): T[] {
  return Array.isArray(item) ? item : [item];
}
