import { readFileSync } from 'fs';
import { parseGML } from '../../src';
import { FeatureCollection } from 'geojson';

test('parse multipolygon gml', () => {
  const xml = readFileSync(__dirname + '/../multipolygon.gml', 'utf8');
  const geojson = parseGML(xml) as FeatureCollection;
  expect(geojson.features.length).toBe(1);
  const feature = geojson.features[0];
  expect(feature.geometry.type).toBe('MultiPolygon');
  const coords = (feature.geometry as any).coordinates;
  expect(coords[0][0][0][0]).toBeCloseTo(120.374332275391);
  expect(coords[0][0][0][1]).toBeCloseTo(31.5866986766045);
});
