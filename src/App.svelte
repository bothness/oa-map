<script>
	// Components for working with Mapbox layers
	import { Map, MapSource, MapLayer, MapTooltip } from '@onsvisual/svelte-maps';
	import MapCount from "./MapCount.svelte";
	import BreaksChart from "./BreaksChart.svelte";
	import { getData, getColor, getBreaks } from "./utils";
	import { colors, mapSources, baseMaps, bounds , layerNames } from "./config";
	
	// Bindings
	let map = null;

	// Data
	let data = {};
	let breaks = {};
	let centroids;
	let count = 0;
	let active = "rgn";
	let value = null;

	// State
	let hovered;

	// Get MSOA centroids
	getData("./data/msoa-centroids.csv")
	.then(arr => {
		let features = arr.map(d => ({
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [d.x, d.y]
			}
		}));
		count = features.length;
		centroids = {"type": "FeatureCollection", features};
	});
	
	// Get data for geojson maps
	mapSources.map(d => d.id).forEach(key => {
		getData(`./data/ownership-${key}.csv`)
		.then(arr => {
			arr.forEach(d => {
				d.perc = Math.round((d.value / d.total) * 10000) / 100;
			});

			let vals = arr.map(d => d.perc).sort((a, b) => a - b);
			let brks = getBreaks(vals);

			arr.forEach(d => {
				d.color = getColor(d.perc, brks, colors.seq5);
			});
			console.log(arr);

			data[key] = arr;
			breaks[key] = brks;
		});
	});

	function doHover(e) {
		hovered = e.detail.feature ? e.detail.feature.properties : null;
		value = hovered && data[active] ? data[active].find(d => d.areacd == hovered['areacd'] || d.areacd == hovered['AREACD'] || d.areacd == hovered['oa11cd']).perc : null;
	}

	function toggleLayers(count) {
		if (map) {
			let newactive = count > 7000 ? "rgn" : count > 1000 ? "lad" : count > 250 ? "msoa" : count > 50 ? "lsoa" : "oa";
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
		{count.toLocaleString()} MSOA centroids in view
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
							<MapTooltip content={hovered && hovered.areanm ? hovered.areanm : hovered && hovered.AREANM ? hovered.AREANM : hovered ? hovered.oa11cd : ""}/>
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
					{#if centroids}
					<MapSource id="centroids" type="geojson" data={centroids}>
						<MapLayer id="centroids" type="circle" paint={{'circle-radius': 1, 'circle-color': 'rgba(0,0,0,0)'}}/>
						<MapCount layer="centroids" bind:count/>
					</MapSource>
					{/if}
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
