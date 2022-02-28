export const colors = {
	seq5: ['rgb(234, 236, 177)', 'rgb(169, 216, 145)', 'rgb(0, 167, 186)', 'rgb(0, 78, 166)', 'rgb(0, 13, 84)'],
	div10: ['#67001f','#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac','#053061']	
};

const paint = {
	fill: {
		'fill-color': ['case',
			['!=', ['feature-state', 'color'], null], ['feature-state', 'color'],
			'rgba(255, 255, 255, 0)'
		],
		'fill-opacity': 0.8
	}
}

const layout = {
	on: {'visibility': 'visible'},
	off: {'visibility': 'none'}
};

const filter = {
	rgn: [
		"all",
		["==", "region", "true"],
		["in", "country", "E", "W"]
	],
	lad: [
		"all",
		["==", "lower", "true"],
		["in", "country", "E", "W"]
	]
}

export const mapSources = [
	{
		id: "rgn",
		type: "vector",
		url: "https://cdn.jsdelivr.net/gh/bothness/map-tiles/authorities/{z}/{x}/{y}.pbf",
		promoteId: "areacd",
		layer: "region",
		maxzoom: 12,
		layers: [
			{
				id: "rgn",
				type: "fill",
				paint: paint.fill,
				filter: filter.rgn,
				layout: layout.on
			}
		]
	},
	{
		id: "lad",
		type: "vector",
		url: "https://cdn.jsdelivr.net/gh/bothness/map-tiles/authorities/{z}/{x}/{y}.pbf",
		promoteId: "areacd",
		layer: "authority",
		maxzoom: 12,
		layers: [
			{
				id: "lad",
				type: "fill",
				paint: paint.fill,
				filter: filter.lad,
				layout: layout.off
			}
		]
	},
	{
		id: "msoa",
		type: "vector",
		url: "https://cdn.jsdelivr.net/gh/bothness/map-tiles/msoa/{z}/{x}/{y}.pbf",
		promoteId: "areacd",
		layer: "boundaries",
		maxzoom: 12,
		layers: [
			{
				id: "msoa",
				type: "fill",
				paint: paint.fill,
				layout: layout.off
			}
		]
	},
	{
		id: "lsoa",
		type: "vector",
		url: "https://cdn.jsdelivr.net/gh/bothness/map-tiles/lsoa/{z}/{x}/{y}.pbf",
		promoteId: "areacd",
		layer: "boundaries",
		maxzoom: 12,
		layers: [
			{
				id: "lsoa",
				idKey: "areacd",
				type: "fill",
				paint: paint.fill,
				layout: layout.off
			}
		]
	},
	{
		id: "oa",
		type: "vector",
		url: "https://cdn.jsdelivr.net/gh/bothness/map-tiles/oa/{z}/{x}/{y}.pbf",
		promoteId: "areacd",
		layer: "boundaries",
		maxzoom: 12,
		layers: [
			{
				id: "oa",
				idKey: "areacd",
				type: "fill",
				paint: paint.fill,
				layout: layout.off
			}
		]
	}
];
	
export const baseMaps = {
	'osm': 'https://onsvisual.github.io/svelte-maps/data/style-osm.json',
	'osmGrey': 'https://onsvisual.github.io/svelte-maps/data/style-osm-grey.json',
	'ons': 'https://onsvisual.github.io/svelte-maps/data/style-ons-light.json',
	'onsMask': './data/style.json'
}

export const bounds = {
	uk: [[ -9, 49 ], [ 2, 61 ]],
	ew: [[-6, 49], [2, 56]]
};

export const layerNames = {
	rgn: "Region",
	lad: "Districts",
	msoa: "MSOA",
	lsoa: "LSOA",
	oa: "OA"
}