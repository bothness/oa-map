import { csvParse, autoType } from 'd3-dsv';
import { feature } from 'topojson-client';
import ckmeans from 'ckmeans';

export async function getData(url) {
  let response = await fetch(url);
  let string = await response.text();
	let data = await csvParse(string, autoType);
  return data;
}

export async function getTopo(url, layer) {
  let response = await fetch(url);
  let json = await response.json();
  let geojson = await feature(json, layer);
  return geojson;
}

export function getColor(value, breaks, colors) {
  let color;
  let found = false;
  let i = 1;
  while (found == false) {
    if (value <= breaks[i]) {
      color = colors[i - 1];
      found = true;
    } else {
      i ++;
    }
  }
  return color ? color : 'lightgrey';
}

export function getBreaks(vals, count=5) {
  let len = vals.length;
  let sorted = [...vals].sort((a, b) => a - b);
  let breaks = ckmeans(sorted, count);
	breaks.push(sorted[len - 1]);
	return breaks;
}

export function setUnion(setA, setB) {
  console.log(setA, setB)
  let _union = new Set(setA)
  for (let elem of setB) {
      _union.add(elem)
  }
  return _union
}

export function setDifference(setA, setB) {
  console.log(setA, setB)
  let _difference = new Set(setA)
  for (let elem of setB) {
      _difference.delete(elem)
  }
  return _difference
}

export function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}