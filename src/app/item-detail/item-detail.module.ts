import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ItemDetailComponent } from "./item-detail.component";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { RequestStatsCompareComponent } from "./request-stats/request-stats-compare.component";
import { ThresholdsAlertComponent } from "./thresholds-alert/thresholds-alert.component";
import { PerformanceAnalysisComponent } from "./performance-analysis/performance-analysis.component";
import { AuthGuard } from "../auth.guard";
import { RouterModule, Routes } from "@angular/router";
import { SharedItemModule } from "../shared/shared-item/shared-item.module";
import { SharedModule } from "../shared/shared.module";
import { ZeroErrorToleranceWarningComponent } from "./zero-error-tolerance-warning/zero-error-tolerance-warning.component";
import { HighchartsChartModule } from "highcharts-angular";
import { LabelChartComponent } from "./label-chart/label-chart.component";
import { AnalyzeChartsComponent } from "./analyze-charts/analyze-charts.component";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { LabelHealthComponent } from "./request-stats/label-health/label-health.component";
import { LabelTrendComponent } from "./label-trend/label-trend.component";
import { StatsCompareComponent } from "./stats-compare/stats-compare.component";
import { AddMetricComponent } from "./analyze-charts/add-metric/add-metric.component";
import { ShareComponent } from "./share/share.component";
import { DeleteShareLinkComponent } from "./share/delete-share-link/delete-share-link.component";
import { CreateNewShareLinkComponent } from "./share/create-new-share-link/create-new-share-link.component";
import { MonitoringStatsComponent } from "./monitoring-stats/monitoring-stats.component";
import { DataTableModule } from "@pascalhonegger/ng-datatable";
import { RoleModule } from "../_directives/role.module";
import { ReloadCustomChartComponent } from "./analyze-charts/reload-custom-chart/reload-custom-chart.component";
import { ExcelService } from "../_services/excel.service";
import { ChartIntervalComponent } from "./chart-interval/chart-interval.component";
import { ForbiddenComponent } from "../forbidden/forbidden.component";
import { ThresholdFailureComponent } from "./request-stats/threshold-failure/threshold-failure.component";
import { ZoomChartsComponent } from "./zoom-charts/zoom-charts.component";
import { ErrorSummaryComponent } from "./error-summary/error-summary.component";


const routes: Routes = [{
  path: "project/:projectName/scenario/:scenarioName/item/:id", component: ItemDetailComponent,
  runGuardsAndResolvers: "always", canActivate: [AuthGuard],
}];


@NgModule({
  declarations: [ItemDetailComponent, RequestStatsCompareComponent, ThresholdsAlertComponent,
    PerformanceAnalysisComponent, ZeroErrorToleranceWarningComponent, LabelChartComponent, AnalyzeChartsComponent,
    LabelHealthComponent, LabelTrendComponent, StatsCompareComponent, AddMetricComponent, ShareComponent, DeleteShareLinkComponent,
    CreateNewShareLinkComponent, MonitoringStatsComponent, ReloadCustomChartComponent, ChartIntervalComponent, ForbiddenComponent, ThresholdFailureComponent, ZoomChartsComponent, ErrorSummaryComponent],
  imports: [
    CommonModule, NgbModule, RouterModule.forRoot(routes), DataTableModule, SharedItemModule, SharedModule, HighchartsChartModule,
    ReactiveFormsModule, FormsModule, RoleModule,
  ],
  exports: [],
  providers: [ExcelService]
})
export class ItemDetailModule {
}
