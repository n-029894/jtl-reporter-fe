import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ItemsApiService } from '../items-api.service';
import { ItemDetail } from '../items.service.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { DecimalPipe } from '@angular/common';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';

exporting(Highcharts);

import {
  commonGraphSettings, threadLineSettings,
  errorLineSettings, overallChartSettings,
  throughputLineSettings
} from '../graphs/item-detail';
import { catchError, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { SharedMainBarService } from '../shared-main-bar.service';
import { ToastrService } from 'ngx-toastr';
import { ItemStatusValue } from './item-detail.model';
import { logScaleButton } from '../graphs/log-scale-button';

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss', '../shared-styles.css'],
  providers: [DecimalPipe]
})
export class ItemDetailComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  itemData: ItemDetail = {
    overview: null,
    environment: null,
    baseId: null,
    note: null,
    plot: null,
    reportStatus: null,
    hostname: null,
    statistics: [],
    testName: null,
    attachements: [],
    monitoringData: { mem: [], maxCpu: 0, maxMem: 0, cpu: [] },
    analysisEnabled: null,
  };
  responseTimeChartOptions;
  throughputChartOptions;
  overallChart;
  overallChartOptions;
  overallResponseTimeChart;
  updateChartFlag = false;
  monitoringChart;
  overallThroughput;
  itemParams;
  hasErrorsAttachment;
  comparedData;
  comparedMetadata;
  labelsData;
  Math: any;
  comparisonWarning = [];
  token: string;
  isAnonymous = false;
  toggleThroughputBandFlag = false;

  constructor(
    private route: ActivatedRoute,
    private itemsService: ItemsApiService,
    private spinner: NgxSpinnerService,
    private sharedMainBarService: SharedMainBarService,
    private toastr: ToastrService
  ) {
    this.Math = Math;
  }


  async ngOnInit() {
    this.spinner.show();
    this.route.params.pipe(
      withLatestFrom(_ => {
        this.sharedMainBarService.setProjectName(_.projectName);
        return _;
      })
    ).subscribe(_ => this.itemParams = _);
    this.route.queryParams.subscribe(_ => {
      this.token = _.token;
      if (this.token) {
        this.isAnonymous = true;
      }
    });
    this.itemsService.fetchItemDetail(
      this.itemParams.projectName,
      this.itemParams.scenarioName,
      this.itemParams.id,
      { token: this.token }
    )
      .pipe(catchError(r => {
        this.spinner.hide();
        return of(r);
      }))
      .subscribe((results) => {
        this.itemData = results;
        this.labelsData = this.itemData.statistics;
        this.hasErrorsAttachment = this.itemData.attachements.find((_) => _ === 'error');
        this.monitoringAlerts();
        this.generateCharts();
        this.spinner.hide();
        Highcharts.chart('container', this.throughputChartOptions);

      });
  }

  private generateCharts() {
    const { responseTime, throughput, threads, overallTimeResponse, overallThroughput, overAllFailRate } = this.itemData.plot;
    const threadLine = { ...threadLineSettings, name: 'virtual users', data: threads };
    const errorLine = { ...errorLineSettings, ...overAllFailRate };
    const throughputLine = { ...throughputLineSettings, ...overallThroughput };
    this.responseTimeChartOptions = {
      ...commonGraphSettings('ms'), series: [...responseTime, ...threadLine], ...logScaleButton
    };
    this.throughputChartOptions = { ...commonGraphSettings('hits/s'), series: [...throughput, ...threadLine], ...logScaleButton };
    this.overallChartOptions = {
      ...overallChartSettings('ms'), series: [
        threadLine, overallTimeResponse, throughputLine, errorLine,
      ],
    };
  }

  itemDetailChanged({ note, environment, hostname }) {
    this.itemData.note = note;
    this.itemData.environment = environment;
    this.itemData.hostname = hostname;
  }

  itemToCompare(data) {
    this.comparedMetadata = { id: data.id, maxVu: data.maxVu };
    if (data.maxVu !== this.itemData.overview.maxVu) {
      this.comparisonWarning.push(`VU do differ ${this.itemData.overview.maxVu} vs. ${data.maxVu}`);
    }

    this.comparedData = this.labelsData.map((_) => {
      const labelToBeCompared = data.statistics.find((__) => __.label === _.label);
      if (labelToBeCompared) {
        return {
          ..._,
          avgDiff: (_.avgResponseTime - labelToBeCompared.avgResponseTime),
          minDiff: (_.minResponseTime - labelToBeCompared.minResponseTime),
          maxDiff: (_.maxResponseTime - labelToBeCompared.maxResponseTime),
          // @ts-ignore
          bytesDiff: ((_.bytes - labelToBeCompared.bytes) / 1024).toFixed(2),
          n0Diff: (_.n0 - labelToBeCompared.n0),
          n5Diff: (_.n5 - labelToBeCompared.n5),
          n9Diff: (_.n9 - labelToBeCompared.n9),
          errorRateDiff: this.roundNumberTwoDecimals((_.errorRate - labelToBeCompared.errorRate)),
          throughputDiff: this.roundNumberTwoDecimals((_.throughput - labelToBeCompared.throughput))
        };
      } else {
        this.comparisonWarning.push(`${_.label} label not found`);
        return {
          ..._,
          avgDiff: null,
          minDiff: null,
          maxDiff: null,
          n0Diff: null,
          n5Diff: null,
          n9Diff: null,
          errorRateDiff: null,
          throughputDiff: null
        };
      }
    });
    if (data.environment !== this.itemData.environment) {
      this.comparisonWarning.push('Environments do differ');
    }
    this.labelsData = this.comparedData;

    if (this.comparisonWarning.length) {
      this.showComparisonWarnings();
    }
  }

  showComparisonWarnings() {
    this.toastr.warning(this.comparisonWarning.join('<br>'), 'Comparison Warning!',
      {
        closeButton: true,
        enableHtml: true,
        timeOut: 15000,
        positionClass: 'toast-bottom-right'
      });
    this.comparisonWarning = [];
  }

  monitoringAlerts() {
    const alertMessages = [];
    const { maxCpu, maxMem } = this.itemData.monitoringData;
    if (maxCpu > 90) {
      alertMessages.push(`High CPU usage`);
    }
    if (maxMem > 90) {
      alertMessages.push(`High memory usage`);
    }

    if (alertMessages.length > 0) {
      this.toastr.warning(alertMessages.join('<br>'), 'Monitoring Alert!',
        {
          closeButton: true,
          disableTimeOut: true,
          enableHtml: true,
        });
    }

  }

  resetStatsData() {
    this.comparedData = null;
    this.labelsData = this.itemData.statistics;
  }

  search(term: string) {
    const dataToFilter = this.comparedData || this.itemData.statistics;
    if (term) {
      this.labelsData = dataToFilter.filter(x =>
        x.label.trim().toLowerCase().includes(term.trim().toLowerCase())
      );
    } else {
      this.labelsData = dataToFilter;
    }
  }

  getTextStatus(status) {
    for (const k in ItemStatusValue) {
      if (ItemStatusValue[k] === status) {
        return k;
      }
    }
  }

  quickBaseComparison(id) {
    this.itemsService.fetchItemDetail(
      this.itemParams.projectName,
      this.itemParams.scenarioName,
      id).subscribe(_ => this.itemToCompare({
        statistics: _.statistics,
        maxVu: _.overview.maxVu,
        environment: _.environment,
        id
      }));
  }

  private roundNumberTwoDecimals = number => {
    return Math.round(number * 100) / 100;
  }

  bytesToMbps(bytes) {
    return this.roundNumberTwoDecimals(bytes / Math.pow(1024, 2));
  }

  toggleThroughputBand({ element, perfAnalysis }) {
    this.overallChartOptions.series.forEach(serie => {
      if (['response time', 'errors'].includes(serie.name)) {
        serie.visible = this.toggleThroughputBandFlag;
      }
      if (serie.name === 'throughput') {
        if (this.toggleThroughputBandFlag) {
          serie.zones = [];
          return;
        }
        serie.zones = [{
          value: this.itemData.overview.throughput,
          color: '#e74c3c'
        }];
      }
    });

    if (!this.toggleThroughputBandFlag) {
      element.textContent = 'Hide in chart';
      this.overallChartOptions.xAxis.plotBands = {
        color: '#e74c3c4f',
        from: perfAnalysis.throughputVariability.bandValues[0],
        to: perfAnalysis.throughputVariability.bandValues[1]
      };
      this.toggleThroughputBandFlag = true;
    } else {
      element.textContent = 'Display in chart';
      this.overallChartOptions.xAxis.plotBands = null;
      this.toggleThroughputBandFlag = false;
    }
    this.updateChartFlag = true;
  }

}
