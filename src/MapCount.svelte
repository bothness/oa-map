<script>
	import { getContext, onMount } from 'svelte';
	
  export let count;
  export let key = "code";

	const { layer } = getContext('layer');
	const { getMap } = getContext('map');
	const map = getMap();

  function countFeatures() {
    if (map.getLayer(layer)) {
      let features = map.queryRenderedFeatures({layers: [layer]});
      if (features[0] && key) {
        features = features.map(f => f.properties[key]).filter((v, i, a) => a.indexOf(v) === i);
      }
      count = features.length;
    }
  }

  onMount(() => {
		map.on('moveend', () => {
      countFeatures();
    });
	});
  
</script>