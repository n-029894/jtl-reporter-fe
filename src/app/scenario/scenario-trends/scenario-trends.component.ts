import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import * as Highcharts from "highcharts";
import * as moment from "moment";
import { customScenarioTrends, labelTrends, responseTimeDegradationCurveOption } from "src/app/graphs/scenario-trends";
import { bytesToMbps } from "src/app/item-detail/calculations";
import { LabelTrendsData, ScenarioTrendsData, ScenarioTrendsUserSettings } from "src/app/items.service.model";
import { ScenarioService } from "src/app/scenario.service";
import { Metrics } from "../../item-detail/metrics";

@Component({
  selector: "app-scenario-trends",
  templateUrl: "./scenario-trends.component.html",
  styleUrls: ["./scenario-trends.component.scss"]
})
export class ScenarioTrendsComponent implements OnInit {
  @Input() params;
  Highcharts: typeof Highcharts = Highcharts;
  updateAggregatedScenarioTrendsChartFlag = false;
  updateLabelScenarioTrendsChartFlag = false;
  updateDegradationCurveChartFlag = false;

  aggregatedScenarioTrendChartOption = {
    ...customScenarioTrends(), series: []
  };
  labelScenarioTrendChartP90Option = {
    ...labelTrends("ms", "Response Time [P90]"), series: []
  };
  labelScenarioTrendChartThroughputOption = {
    ...labelTrends("req/s", "Throughput"), series: []
  };
  labelScenarioTrendChartErrorRateOption = {
    ...labelTrends("%", "ErrorRate"), series: []
  };
  responseTimeDegradationChartOption = {
    ...responseTimeDegradationCurveOption(), series: []
  };
  userSettings: ScenarioTrendsUserSettings;
  chartDataMapping;
  itemIds: Set<string> = new Set();
  labelDataTruncated = false;
  degradationCurveDisplayed = false;

  constructor(private scenarioService: ScenarioService, private router: Router,
  ) {
    this.chartDataMapping = new Map([
      ["percentil", { name: Metrics.ResponseTimeP90, onLoad: true, color: "rgb(17,122,139, 0.8)", tooltip: { valueSuffix: " ms" } }],
      ["avgResponseTime", { name: Metrics.ResponseTimeAvg, onLoad: false, tooltip: { valueSuffix: " ms" } }],
      ["avgLatency", { name: Metrics.LatencyAvg, onLoad: false, tooltip: { valueSuffix: " ms" } }],
      ["avgConnect", { name: Metrics.ConnectAvg, onLoad: false, tooltip: { valueSuffix: " ms" } }],
      ["throughput", { name: Metrics.Throughput, yAxis: 2, onLoad: true, color: "rgb(41,128,187, 0.8)", tooltip: { valueSuffix: " reqs/s" } }],
      ["maxVu", { name: Metrics.Threads, yAxis: 1, onLoad: true, type: "spline", color: "grey", }],
      ["errorRate", { name: Metrics.ErrorRate, yAxis: 3, onLoad: true, color: "rgb(231,76,60, 0.8)", tooltip: { valueSuffix: " %" } }],
      ["network", { name: Metrics.Network, yAxis: 4, onLoad: false, transform: this.networkTransform, tooltip: { valueSuffix: " mbps" } }],
    ]);
  }

  chartCallback: Highcharts.ChartCallbackFunction = function (chart): void {
    setTimeout(() => {
      chart.reflow();
    }, 0);
  };


  ngOnInit() {
    this.scenarioService.trends$.subscribe((_: {
      aggregatedTrends: ScenarioTrendsData[],
      labelTrends: LabelTrendsData[],
      userSettings: ScenarioTrendsUserSettings
      responseTimeDegradationCurve,
    }) => {
      if (!_) {
        return;
      }
      this.userSettings = _.userSettings;
      this.generateAggregateChartLines(_.aggregatedTrends);
      this.generateLabelChartLines(_.labelTrends);
      this.generateDegradationCurve(_.responseTimeDegradationCurve);
    });
  }

  generateAggregateChartLines(data: ScenarioTrendsData[]) {
    if (!Array.isArray(data)) {
      return;
    }
    const dates = data.map(_ => moment(_.overview.startDate).format("DD. MM. YYYY HH:mm:ss"));
    const series = [];
    const seriesData = data.reduce((acc, current) => {
      for (const key of Object.keys(current.overview)) {

        if (!["startDate", "endDate", "duration"].includes(key)) {
          if (!acc[key]) {
            acc[key] = [[current.overview[key]]];
          } else {
            acc[key].push([current.overview[key]]);
          }
        }
      }
      return acc;
    }, {});

    this.setItemIds(data)

    for (const key of Object.keys(seriesData)) {
      const chartSeriesSettings = this.chartDataMapping.get(key);
      if (!chartSeriesSettings) {
        continue;
      }

      series.push({
        name: chartSeriesSettings.name || key,
        data: chartSeriesSettings.transform ? chartSeriesSettings.transform(seriesData[key]) : seriesData[key],
        yAxis: chartSeriesSettings.yAxis || 0,
        visible: chartSeriesSettings.onLoad || false,
        color: chartSeriesSettings.color,
        type: chartSeriesSettings.type,
        tooltip: chartSeriesSettings.tooltip,
      });
    }
    this.aggregatedScenarioTrendChartOption.series = JSON.parse(JSON.stringify(series));
    this.aggregatedScenarioTrendChartOption.xAxis["categories"] = dates;

    this.updateAggregatedScenarioTrendsChartFlag = true;
  }

  generateLabelChartLines(data: LabelTrendsData[]) {
    if (!data) {
      return;
    }

    const seriesP90 = [];
    const seriesErrorRate = [];
    const seriesThroughput = [];

    for (const key of Object.keys(data)) {
      if (seriesP90.length < 20) {
        // Adding item id to correctly identify it when clicking a point.
        seriesP90.push({ name: key, data: data[key].percentile90.map(dataValue => ({ y: dataValue[1], name: dataValue[0], itemId: dataValue[2] })) });
        seriesErrorRate.push({ name: key, data: data[key].errorRate.map(dataValue => ({ y: dataValue[1], name: dataValue[0], itemId: dataValue[2] })) });
        seriesThroughput.push({ name: key, data: data[key].throughput.map(dataValue => ({ y: dataValue[1], name: dataValue[0], itemId: dataValue[2] })) });
      } else {
        this.labelDataTruncated = true;
        break;
      }


    }
    this.updateLabelChart(this.labelScenarioTrendChartP90Option, seriesP90);
    this.updateLabelChart(this.labelScenarioTrendChartThroughputOption, seriesThroughput);
    this.updateLabelChart(this.labelScenarioTrendChartErrorRateOption, seriesErrorRate);
    this.updateLabelScenarioTrendsChartFlag = true;
  }

  generateDegradationCurve(degradationCurve) {
    if (!degradationCurve) {
      return;
    }
    this.responseTimeDegradationChartOption.series = JSON.parse(JSON.stringify(degradationCurve));
    this.updateDegradationCurveChartFlag = true;

  }

  onPointSelect(event) {
    if (event && event.point && event.point) {
      // Label series have item id amended to open correct detail, it's needed for a case when a labels do not match, eg:
      // label2 start at point 0, but label2 starts at point 1, it leads to off by N issues.
      // It's not needed for aggregated trend chart, as that is column chart and only one point can be clicked.
      const boundItemId = event.point.series.data[event.point.index]?.options?.itemId

      const itemId = boundItemId || Array.from(this.itemIds)[event.point.index];
      const { projectName, scenarioName } = this.params;
      this.router.navigate([`./project/${projectName}/scenario/${scenarioName}/item/${itemId}`]);
    }
  }

  toggleDegradationCurve() {
    this.degradationCurveDisplayed = !this.degradationCurveDisplayed;
  }

  private updateLabelChart(chartOptions, series) {
    chartOptions.series = JSON.parse(JSON.stringify(series));
    chartOptions.xAxis.categories = this.itemIds;
  }

  private networkTransform = (data) => {
    const network = data.map(_ => bytesToMbps(_));
    return network;
  };

  private setItemIds = (data: ScenarioTrendsData[]) => {
    if (this.itemIds.size > 0) {
      this.itemIds.clear()
    }
    data.forEach(line => this.itemIds.add(line.id))
  }

}
