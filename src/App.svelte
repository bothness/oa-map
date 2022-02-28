<script>
	// Components for working with Mapbox layers
	import { Map, MapSource, MapLayer, MapTooltip } from '@onsvisual/svelte-maps';
	import tilebelt from "@mapbox/tilebelt";
	import MapCount from "./MapCount.svelte";
	import MapCodes from "./MapCodes.svelte";
	import BreaksChart from "./BreaksChart.svelte";
	import { getData, getColor, setUnion, setDifference, sleep } from "./utils";
	import { colors, mapSources, baseMaps, bounds , layerNames } from "./config";
	
	// Bindings
	let map = null;

	// Data
	let data = {};
	let data_quads = {};
	let breaks = {};
	let quads = {};
	let quads_show = false;
	let count = 0;
	let active = "rgn";
	let value = null;

	// State
	let hovered;

	// Get data quads
	fetch("./data/quads.json")
	.then(res => res.json())
	.then(json => {
		for (const key in json) {
			let features = json[key].map(d => ({
				type: "Feature",
				geometry: tilebelt.tileToGeoJSON(d),
				properties: {
					code: d.join("_")
				}
			}));
			quads[key] = {
				"type": "FeatureCollection",
				features
			};
			if (key == "oa") count = features.length;
		}
	});
	
	// Get data for map
	fetch("./data/ownership/breaks.json")
	.then(res => res.json())
	.then(brks => {
		mapSources.map(d => d.id).forEach(key => {
			breaks[key] = brks[key];

			if (["rgn", "lad"].includes(key)) {
				getData(`./data/ownership/${key}.csv`)
				.then(arr => {
					arr.forEach(d => {
						d.perc = Math.round((d.value / d.total) * 10000) / 100;
						d.color = getColor(d.perc, breaks[key], colors.seq5);
					});

					data[key] = arr;
				});
			} else {
				data[key] = [];
				data_quads[key] = new Set([]);
			}
		});
	});

	function doHover(e) {
		hovered = e.detail.feature ? e.detail.feature.properties : null;
		let key = mapSources.find(d => d.id == active).promoteId;
		let feature = hovered && data[active] ? data[active].find(d => d.areacd == hovered[key]) : null;
		value = feature ? feature.perc : null;
	}

	function loadData(e, key) {
		sleep(50).then(() => {
			if (key == active) {
				let codes = new Set(e.detail.codes);
				let diff = setDifference(codes, data_quads[key]);
				data_quads[key] = setUnion(data_quads[key], codes);

				diff.forEach(code => {
					getData(`./data/ownership/${key}-${code}.csv`)
					.then(arr => {
						arr.forEach(d => {
							d.perc = Math.round((d.value / d.total) * 10000) / 100;
							d.color = getColor(d.perc, breaks[key], colors.seq5);
						});
						data[key].push(...arr);
						data[key] = [...data[key]];
					});
				});
			}
		});
	}

	function toggleLayers(count) {
		if (map) {
			let newactive = count > 450 ? "rgn" : count > 64 ? "lad" : count > 16 ? "msoa" : count > 4 ? "lsoa" : "oa";
			if (newactive != active) {
				if (map.getLayer(newactive)) map.setLayoutProperty(newactive, 'visibility', 'visible');
				if (map.getLayer(`${newactive}-line`)) map.setLayoutProperty(`${newactive}-line`, 'visibility', 'visible');
				if (map.getLayer(active)) map.setLayoutProperty(active, 'visibility', 'none');
				if (map.getLayer(`${active}-line`)) map.setLayoutProperty(`${active}-line`, 'visibility', 'none');
				active = newactive;
			}
		}
	}
	$: toggleLayers(count);
	
</script>

<section>
	<div class="wrapper">
    <h1>Output area map test</h1>
		{count.toLocaleString()} OA quads in view
		| {layerNames[active]} layer visible<br/>
		{#if data[active] && breaks[active]}
		<BreaksChart breaks={breaks[active]} {value} suffix="%"/>
		{/if}
  </div>
</section>

<section>
	<div class="grid">
		<div>
			<div class="map">
			  <Map id="map" style={baseMaps.onsMask} location={{bounds: bounds.ew}} bind:map controls={true}>
					{#each mapSources as source}
					<MapSource {...source}>
						{#if data[source.id]}
						{#each source.layers as layer}
						<MapLayer {...layer} data={data[source.id]} order="mask-raster" hover on:hover={doHover}>
							<MapTooltip content={hovered && hovered.areanm ? hovered.areanm : hovered && hovered.areacd ? hovered.areacd : ""}/>
						</MapLayer>
						<MapLayer
							id="{source.id}-line"
							type="line"
							paint={{
								'line-color': ['case',
				  				['==', ['feature-state', 'hovered'], true], 'black',
				  				'rgba(0,0,0,0.2)'
				  			],
								'line-width': ['case',
				  				['==', ['feature-state', 'hovered'], true], 2,
				  				0.5
				  			]
							}}
							layout={{'visibility': source.id == active ? "visible" : "none"}}/>
						{/each}
						{/if}
					</MapSource>
					{/each}
					{#each ['msoa', 'lsoa', 'oa'] as key}
					{#if quads[key]}
					<MapSource id="{key}-quads" type="geojson" data={quads[key]}>
						<MapLayer id="{key}-quads" type="line" paint={{'line-color': 'rgba(0,0,0,0)'}}>
							<MapCodes on:moveend={e => loadData(e, key)}/>
								{#if key == "oa"}<MapCount bind:count/>{/if}
						</MapLayer>
					</MapSource>
					{/if}
					{/each}
			  </Map>
			</div>
		</div>
  </div>
</section>

<style>
	section {
		display: -webkit-box;
		display: -ms-flexbox;
		display: flex;
		-webkit-box-pack: center;
		-ms-flex-pack: center;
		justify-content: center;
	  background-position: center;
	  background-repeat: no-repeat;
	  background-size: cover;
	  margin: 0;
		margin-bottom: 20px;
	  padding: 0;
	}
	button {
		padding: 0 2px;
		cursor: pointer;
	}
	.wrapper {
		width: 100%;
		max-width: 768px;
		margin: 0 16;
	}
	.grid {
		display: grid;
		width: 100%;
		max-width: 768px;
		margin: 0 16;
		grid-gap: 30px;
		grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
		justify-content: stretch;
	}
	.map {
		height: 450px;
	}
</style>
