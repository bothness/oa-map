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
	let count = 0; // Number of OA quads in view
	let loaded = 0; // Number of features data has been loaded for
	let files = 0; // Number of source data files loaded
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
					loaded += arr.length;
					files += 1;
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
		sleep(100).then(() => {
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
						loaded += arr.length;
						files += 1;
					});
				});
			}
		});
	}

	function toggleLayers(count) {
		if (map) {
			let newactive = count > 450 ? "rgn" : count > 64 ? "lad" : count > 16 ? "msoa" : count > 4 ? "lsoa" : "oa";
			if (newactive != active) {
				const layers = ["rgn", "lad", "msoa", "lsoa", "oa"];

				// Make active layers visible
				if (map.getLayer(newactive)) map.setLayoutProperty(newactive, 'visibility', 'visible');
				if (map.getLayer(`${newactive}-line`)) map.setLayoutProperty(`${newactive}-line`, 'visibility', 'visible');
				if (map.getLayer(`${newactive}-line`)) map.setPaintProperty(`${newactive}-line`, 'line-width', ['case', ['==', ['feature-state', 'hovered'], true], 2, 0.5]);
				if (map.getLayer(`${newactive}-quads`) && quads_show) map.setPaintProperty(`${newactive}-quads`, 'line-color', 'rgba(0,0,0,0.5)');

				// Hide all other layers
				layers.filter(code => code != newactive).forEach(code => {
					if (map.getLayer(code)) map.setLayoutProperty(code, 'visibility', 'none');
					if (map.getLayer(`${code}-line`)) map.setLayoutProperty(`${code}-line`, 'visibility', 'none');
					if (map.getLayer(`${code}-quads`)) map.setPaintProperty(`${code}-quads`, 'line-color', 'rgba(0,0,0,0)');
				});
				
				// Make parent layer line layer visible + thicken line
				let index = layers.indexOf(newactive);
				if (index > 0) {
					let parent = layers[index - 1];
					if (map.getLayer(`${parent}-line`)) map.setLayoutProperty(`${parent}-line`, 'visibility', 'visible');
					if (map.getLayer(`${parent}-line`)) map.setPaintProperty(`${parent}-line`, 'line-width', ['case', ['==', ['feature-state', 'hovered'], true], 2, 1.5]);
				}

				active = newactive;
			}
		}
	}
	$: toggleLayers(count);

	function toggleQuads() {
		if (map.getLayer(`${active}-quads`)) map.setPaintProperty(`${active}-quads`, 'line-color', show_quads ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)');
	}
	
</script>

<section>
	<div class="wrapper">
    <h1>Output area map test</h1>
		<strong>{layerNames[active]} layer visible</strong>
		| Data loaded for {loaded.toLocaleString()} features from {files.toLocaleString()} data files<br/>
		{count.toLocaleString()} OA quads in view
		| <label><input type="checkbox" bind:checked={quads_show} on:change={toggleQuads}/> Show quad boudaries (MSOA/LSOA/OA only)</label><br/>
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
	label {
		display: inline-block;
		margin: 0;
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
