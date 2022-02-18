<script>
	import { getContext } from 'svelte';
  import { onMount } from 'svelte';
	
	export let layer;
  export let count;
	
	const { getMap } = getContext('map');
	const map = getMap();

  function countFeatures() {
    if (map.getLayer(layer)) {
      let features = map.queryRenderedFeatures({layers: [layer]});
      count = features.length;
    }
  }

  onMount(() => {
		map.on('moveend', () => {
      countFeatures();
    });
	});
  
</script>