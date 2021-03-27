<template>
    <div class="somnium">
        <h1>SOMNIUM SPACE VR</h1>
        <div class="container">
            <div class="explainer">
                <ul>
                    <li><h2>Recent Sales</h2></li>
                    <li v-for="sale in sales" :key="sale.id">
                        <span class="date">{{sale.dateStr}}</span><br/>
                        <div class="circle" :style="{background: colorForSize(sale.size)}"></div>
                        {{sale.price}} {{sale.paymentToken}}
                        <a :href="sale.permalink" target="_blank">#{{sale.id}} →</a> 
                    </li>
                </ul>
            </div>
            <div class="chart">
                <div class="backdrop">
                    <div v-if="loading" class="loader"><Loading/></div>
                    <div :style="{display: loading ? 'none' : 'block'}">
                        <div class="title">Land Parcel Sales</div>
                        <div class="legend" style="">
                            <div>
                                <div class="circle" :style="{background: colorForSize('s')}"></div> Small
                            </div>
                            <div>
                                <div class="circle" :style="{background: colorForSize('m')}"></div> Medium
                            </div>
                            <div>
                                <div class="circle" :style="{background: colorForSize('xl')}"></div> Extra Large
                            </div>
                        </div>
                        <div ref="chart"></div>
                        <div ref="chart2"></div>
                        <div ref="chart3"></div>

                    </div>
                    <Tooltip ref="tooltip"/>
                </div>

            </div>
        </div>
        <div class="container">
            <div class="explainer">
                <ul>
                    <li><h2>For Sale</h2></li>
                    <li v-for="auction in auctions" :key="auction.id">
                        <span class="date">{{auction.dateStr}}</span><br/>
                        <div class="circle" :style="{background: colorForSize(auction.size)}"></div>
                        {{auction.price}} ETH
                        <a :href="auction.permalink" target="_blank">#{{auction.id}} →</a> 
                    </li>
                </ul>
            </div>
            <div class="chart">
                <div class="backdrop">
                    <div v-if="loadingAuctions" class="loader"><Loading/></div>
                    <div :style="{display: loadingAuctions ? 'none' : 'block'}">
                        <div class="title">List Prices</div>
                        <div ref="auctionsChart"></div>
                        <div ref="auctionsChart2"></div>
                        <div ref="auctionsChart3"></div>
                    </div>
                    <Tooltip ref="auctionsTooltip"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import Loading from '@/components/loading.vue';
import Tooltip from '@/components/tooltip.vue';
import axios from 'axios';
import _ from 'lodash';
var d3 = require('d3');
import abbreviateNumber from '@/util/abbreviate-number.js'
import sleep from '@/util/sleep.js'

export default {
  name: 'SomniumMarket',
  data() {
      return {
          loading: true,
          loadingAuctions: true,
          sales: [],
          auctions: [],
          colorForSize: colorForSize,
      }
  },
  components: {
      Loading,
      Tooltip
  },
  mounted() {
    Promise.all([
      getSales()
    ])
    .then((results) => {
       this.loading = false;
       this.sales = _.chain(results[0]).take(10).value()
       drawChart(this.$refs['chart'], this.$refs['tooltip'].$el, results[0].filter(s => s.size == 's'))
       drawChart(this.$refs['chart2'], this.$refs['tooltip'].$el, results[0].filter(s => s.size == 'm'))
       drawChart(this.$refs['chart3'], this.$refs['tooltip'].$el, results[0].filter(s => s.size == 'xl'))

    })
    getAuctions().then((onsale) => {
        this.loadingAuctions = false;
        this.auctions = _.chain(onsale).take(10).value()
        drawAuctions(this.$refs['auctionsChart'], this.$refs['auctionsTooltip'].$el, onsale.filter(a => a.size == 's'))
        drawAuctions(this.$refs['auctionsChart2'], this.$refs['auctionsTooltip'].$el, onsale.filter(a => a.size == 'm'))
        drawAuctions(this.$refs['auctionsChart3'], this.$refs['auctionsTooltip'].$el, onsale.filter(a => a.size == 'xl'))
    })
  },
}

function sizeForDescription(description) {
    var size = description.startsWith('Small') ? 's' :
    description.startsWith('Medium') ? 'm' : 
    description.startsWith('Extra Large') ? 'xl' : '?'
    return size;
}

const colorScheme = d3.scaleOrdinal()
    .domain(['s', 'm', 'xl'])
    .range(d3.schemeSet2)

function colorForSize(size) {
    return colorScheme(size);
}

async function getSales() {
    const api = 'https://api.opensea.io/api/v1/events?only_opensea=true&offset=0&limit=10000&asset_contract_address=0x913ae503153d9a335398d0785ba60a2d63ddb4e2&event_type=successful';
    const response = await axios({
        url: api,
        method: "get",
     });
     var sales = response.data.asset_events
        .filter(s => s.asset != null &&
            s.asset.asset_contract.address == "0x913ae503153d9a335398d0785ba60a2d63ddb4e2" &&
            (s.payment_token.symbol == "ETH" || s.payment_token.symbol == "WETH"))
        .map(s => ({
            id: s.asset.token_id,
            size: sizeForDescription(s.asset.description),
            date: new Date(s.created_date),
            dateStr: d3.timeFormat( "%Y-%m-%d %H:%M:%S")(new Date(s.created_date)),
            price: parseInt(s.total_price) / Math.pow(10, s.payment_token.decimals),
            paymentToken: s.payment_token.symbol,
            permalink: s.asset.permalink,
            assetContract: s.asset.asset_contract.address
        }))
     return sales;
}

async function getAuctions() {
    var results = [];
    var onsale = [];
    var offset = 0;

    do {
        await sleep(1000);
        var api = `https://api.opensea.io/wyvern/v1/orders?bundled=false&include_bundled=false&include_invalid=false&limit=50&offset=${offset}&order_by=eth_price&order_direction=asc&asset_contract_address=0x913ae503153d9a335398d0785ba60a2d63ddb4e2&side=1&payment_token_address=0x0000000000000000000000000000000000000000`;

        let response = await fetch(api);
        let json = await response.json();
        results = json.orders;

        json.orders.forEach((order) => {
            onsale.push({
                id: order.asset.token_id,
                permalink: order.asset.permalink,
                price: order.current_price / 1e18,
                size: sizeForDescription(order.asset.description),
                date: new Date(order.created_date),
                dateStr: d3.timeFormat( "%Y-%m-%d %H:%M:%S")(new Date(order.created_date)),
            });
        })

        offset += 50;
    } while (results.length > 0 && onsale.length < 200);
    
    return onsale;
}


function drawChart(el, tooltip, data) {

    var margin = {top: 10, right: 30, bottom: 40, left: 60},
        width = 460 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select(el)
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")  

    // Add X axis --> it is a date format
    var x = d3.scaleTime()
        .domain(d3.extent(data.map(d => d.date)))
        .range([ 0, width ]);
    svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(4))

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([ 0, d3.max(data, d => +d.price) * 1.2])
        .range([ height, 0 ]);
    svg.append("g")
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(3).tickFormat(abbreviateNumber))
        .append("text")
        .style("fill", "currentColor")
        .attr("transform", "rotate(-90)")
        .attr("y", 5)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Sale Price (Ξ)");

    var tip = d3.select(tooltip);

    svg.selectAll('.dot')
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 4)
        .attr("cx", d => {
            return x(d.date)
        })
        .attr("cy", d => {
            return y(d.price)
        })
        .style("fill", d => {
            return colorForSize(d.size);
        })
        .style("opacity", "0.5")
        .on("mouseover", () => {
            tip.transition().duration(100).style("opacity", 1);
        })
        .on("mouseout", () => {
            tip.transition().duration(100).style("opacity", 0);
        })
        .on("mousemove", (event, d) => {
            tip.style("left", event.pageX + "px").style("top", event.pageY + "px");
            tip
                .selectAll('div')
                .html(`#${d.id}<br/>${d.price} ${d.paymentToken}`)
        })

    
}

function drawAuctions(el, tooltip, data) {
    var margin = {top: 10, right: 30, bottom: 30, left: 60},
          width = 460 - margin.left - margin.right,
          height = 200 - margin.top - margin.bottom;
    
      // append the svg object to the body of the page
      var svg = d3.select(el)
        .append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");      
    
      // Add X axis --> it is a date format
      var x = d3.scaleLinear()
      .domain([0, data.length])
      .range([ 0, width ]);
      svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(4))
        .append("text")
        .style("fill", "currentColor")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Rank");
    
      var max = d3.max(data, d => +d.price);
      var min = d3.min(data, d => +d.price);
    
      // Add Y axis
      var y = d3.scaleLinear()
      .domain([min - ((max - min) * 0.3), max + ((max - min) * 0.2)])
      .range([ height, 0 ]);
      svg.append("g")
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(3))
        .append("text")
        .style("fill", "currentColor")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price (ETH)");
    

      // Add the line
      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", (d) => colorForSize(d[0].size))
        .attr("stroke-width", 1.5)
        .attr("d", d3.line().curve(d3.curveStepAfter)
              .x((d, i) => x(i))
              .y((d) => y(d.price))
        )

    var tip = d3.select(tooltip);

    svg
        .append('rect')
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', mouseover)
        .on('mousemove', mousemove)
        .on('mouseout', mouseout);

    var focus = svg
        .append('g')
        .append('path')
        .attr('class','focus');


    function mouseover() {
        tip.transition().duration(100).style("opacity", 1);
        focus.transition().duration(100).style("opacity", 1);
    }
    function mouseout() {
        tip.transition().duration(100).style("opacity", 0);
        focus.transition().duration(100).style("opacity", 0);
    }
    function mousemove(event) {
        var pointerX = d3.pointer(event)[0]
        var x0 = Math.floor(x.invert(pointerX));
        var datum = data[x0];

        focus
        .attr("d", function () {
            var d = "M" + pointerX + "," + 0;
            d += " " + pointerX + "," + height;
            d += "M" + 0 + "," + y(datum.price);
            d += " " + width + "," + y(datum.price);
            return d;
        })

        tip.style("left", event.pageX + "px").style("top", event.pageY + "px");
        tip
            .selectAll('div')
            .html(`#${datum.id}<br/>${datum.price} ETH`)
            .attr('fill', '#ffffff')
    }
}

</script>

<style scoped>
.somnium {
    text-align: center;
    font-size: 18px;
    color: #333;
}

ul {
    list-style-type: none;
}

li {
    margin-bottom: 10px;
}

.date {
    font-size: 15px;
    line-height: 25px;
}

.container {
  margin-top: 10px;
  margin-bottom: 70px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
}

.explainer {
  width: 400px;
  text-align: left;
  margin-right: 20px;
  margin-top: 20px;
}

.legend {
    margin-left: 60px; 
    display: flex; 
    flex-direction: column;
    font-size: 13px;
}

.circle {
    margin-right: '5px';
    margin-left: '5px';
    width: 10px; 
    height: 10px; 
    display: inline-block; 
    border-radius: 50%
}

.chart {
    width: 500px;
    text-align: left;
}

.chart >>> svg {
    cursor: crosshair;
}

.backdrop {
    border: 1px solid #111;
    padding-top: 10px;
    display: inline-block;
    margin: 20px;
}

.loader {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 460px;
    height: 420px;
}

.title {
  font-size: 32px;
  font-weight: bold;
  margin-left: 60px;
  margin-top: 10px;
  margin-bottom: 10px;
}



</style>

<style>

.axis text {
    font-family: monospace;
    font-size: 13px;
}

.focus {
    stroke: #111;
    stroke-width: 0.5px;
    stroke-dasharray: 5;
    opacity: 0;
    pointer-events: none;
}
</style>
<!-- Copyright 2021 0xdef1 -->