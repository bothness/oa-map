<script>
	// Components for working with Mapbox layers
	import { Map, MapSource, MapLayer, MapTooltip } from '@onsvisual/svelte-maps';
	import tilebelt from "@mapbox/tilebelt";
	import MapCount from "./MapCount.svelte";
	import MapCodes from "./MapCodes.svelte";
	import BreaksChart from "./BreaksChart.svelte";
	import { getData, getColor, getCentroid, setUnion, setDifference, sleep } from "./utils";
	import { colors, mapSources, baseMaps, bounds , layerNames } from "./config";
	
	// Bindings
	let map = null;
	let h, w;

	// Data
	let data = {};
	let data_quads = {};
	let breaks = {};
	let quads = {};
	let quads_show = false;
	let centroids; // Centroids for OA quads (used to calculate which layer to display)

	// State
	let hovered;
	let selected;
	let count = 0; // Number of OA quads in view
	let loaded = 0; // Number of features data has been loaded for
	let files = 0; // Number of source data files loaded
	let active = "lad"; // Active layer
	let hovered_val = null;
	let selected_val = null;

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
				type: "FeatureCollection",
				features
			};
			if (key == "oa") {
				centroids = {
					type: "FeatureCollection",
					features: features.map(d => getCentroid(d))
				};
				count = features.length;
			}
		}
	});
	
	// Get data for map
	fetch("./data/ownership/breaks.json")
	.then(res => res.json())
	.then(brks => {
		mapSources.map(d => d.id).forEach(key => {
			breaks[key] = brks[key];

			// if (["rgn", "lad"].includes(key)) {
			if (key == "lad") {
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
		let data_obj = hovered && data[active] ? data[active].find(d => d.areacd == hovered[key]) : null;
		hovered_val = data_obj ? data_obj.perc : null;
	}

	function doSelect(e) {
		let feature = e.detail.feature ? e.detail.feature : null;
		selected = feature ? feature.properties : null;

		let source = map.getSource("selected");
		if (feature && source) {
			fetch(`https://raw.githubusercontent.com/bothness/geo-bounds/main/output/${feature.id}.geojson`)
			.then(res => res.json())
			.then(json => {
				source.setData(json);

				let bounds = [[json.properties.minx, json.properties.miny], [json.properties.maxx, json.properties.maxy]];
				map.fitBounds(bounds, {padding: 40});
			});
		}

		let key = mapSources.find(d => d.id == active).promoteId;
		let data_obj = hovered && data[active] ? data[active].find(d => d.areacd == hovered[key]) : null;
		selected_val = data_obj ? data_obj.perc : null;
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
			let newactive = count * 1e6 / (w * h) > 40 ? "lad" : count * 1e6 / (w * h) > 3 ? "msoa" : "oa";
			if (newactive != active) {
				const layers = ["lad", "msoa", "oa"];

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

<aside>
	<div class="wrapper">
    <h1>Output area map test</h1>
		<strong>{layerNames[active]} layer visible</strong><br/>
		Data loaded for {loaded.toLocaleString()} features from {files.toLocaleString()} data files<br/>
		{count.toLocaleString()} OA quad centoids in view<br/>
		<label><input type="checkbox" bind:checked={quads_show} on:change={toggleQuads}/> Show quad boudaries (MSOA/OA only)</label><br/>
		{#if data[active] && breaks[active]}
		<BreaksChart breaks={breaks[active]} hovered={hovered_val} selected={selected_val} suffix="%"/>
		{/if}
  </div>
</aside>

<main bind:clientHeight={h} bind:clientWidth={w}>
	<Map id="map" style={baseMaps.onsMask} location={{bounds: bounds.ew}} bind:map controls={true}>
		{#if data.lad}
		{#each mapSources as source}
		<MapSource {...source}>
			{#if data[source.id]}
			{#each source.layers as layer}
			<MapLayer {...layer} data={data[source.id]} order="mask-raster" hover on:hover={doHover} select on:select={doSelect}>
				<MapTooltip content={hovered && hovered.areanm ? hovered.areanm : hovered && hovered.areacd ? hovered.areacd : ""}/>
			</MapLayer>
			<MapLayer
				id="{source.id}-line"
				type="line"
				paint={{
					'line-color': ['case',
						['==', ['feature-state', 'hovered'], true], 'orange',
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
		{/if}
		<MapSource id="selected" type="geojson" data={{'type': 'FeatureCollection', 'features': []}}>
			<MapLayer id="selected" type="line" paint={{'line-color': 'black', 'line-width': 2.5}}/>
		</MapSource>
		{#each ['msoa', 'oa'] as key}
		{#if quads[key]}
		<MapSource id="{key}-quads" type="geojson" data={quads[key]}>
			<MapLayer id="{key}-quads" type="line" paint={{'line-color': 'rgba(0,0,0,0)'}}>
				<MapCodes on:moveend={e => loadData(e, key)}/>
			</MapLayer>
		</MapSource>
		{/if}
		{#if centroids}
		<MapSource id="centroids" type="geojson" data={centroids}>
			<MapLayer id="centroids" type="circle" paint={{'circle-color': 'rgba(0,0,0,0)'}}>
				<MapCount bind:count/>
			</MapLayer>
		</MapSource>
		{/if}
		{/each}
	</Map>
</main>

<style>
	:global(body) {
		position: relative;
		margin: 0;
		padding: 0;
	}
	:global(*) {
		box-sizing: border-box;
	}
	main {
		position: fixed;
		top: 0;
		right: 0;
		width: calc(100% - 400px);
		height: 100vh;
	  margin: 0;
	  padding: 0;
	}
	aside {
		position: absolute;
		z-index: 10;
		top: 0;
		left: 0;
		width: 400px;
		height: 100vh;
	  margin: 0;
		padding: 20px;
		background-color: white;
		overflow-y: auto;
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
	@media (max-width: 799px) {
		main {
			width: 100%;
			height: 70vh;
			margin: 0;
			padding: 0;
		}
		aside {
			top: 70vh;
			width: 100%;
			height: fit-content;
			overflow-y: none;
		}
	}
</style>
