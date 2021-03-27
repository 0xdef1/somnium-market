<template>
    <div id="tooltip" class="tooltip">
        <svg width="40" height="40">
             <line x1="12" y1="17" x2="35" y2="40" />
        </svg>
        <div style="margin-left: 40px;"></div>
        <svg width="0" height="0">
        <filter id="sofGlow" height="300%" width="300%" x="-75%" y="-75%">
          <feMorphology
            operator="dilate"
            radius="10"
            in="SourceAlpha"
            result="thicken"
          />
          <feGaussianBlur in="thicken" stdDeviation="10" result="blurred" />
          <feFlood flood-color="rgb(0,0,0)" result="glowColor" />
          <feComposite
            in="glowColor"
            in2="blurred"
            operator="in"
            result="softGlow_colored"
          />
          <feMerge>
            <feMergeNode in="softGlow_colored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
    </div>
</template>

<script>
export default {
  name: 'Tooltip',
}
</script>

<style scoped>
.tooltip {
  position: absolute;
  text-align: center;
  padding: 2px;
  pointer-events: none;
  opacity: 0;
  font-size: 20px;
  text-align: left;
}

.tooltip line {
  stroke-width: 1.5px;
  stroke: #111;
  stroke-opacity: 0.6;
}

</style>