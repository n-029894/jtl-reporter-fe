import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { ItemsApiService } from "src/app/items-api.service";
import { catchError } from "rxjs/operators";
import { of } from "rxjs";
import { NotificationMessage } from "src/app/notification/notification-messages";
import { ItemInput } from "src/app/scenario/item-controls/item-controls.model";
import { ItemsService } from "src/app/items.service";

@Component({
  selector: "app-edit-item",
  templateUrl: "./edit-item.component.html",
  styleUrls: ["./edit-item.component.css"],
})

export class EditItemComponent implements OnInit {

  myform: FormGroup;
  note;
  environment;
  hostname;
  base;
  isBase;
  disabled;
  name;
  resourcesLink;

  @Input() reloadItems: boolean;
  @Input() itemDetailData: ItemInput;
  @Output() itemDetailChange = new EventEmitter<{
    note: string, environment: string, hostname: string, name: string }>();

  constructor(
    private modalService: NgbModal,
    private itemsApiService: ItemsApiService,
    private itemsService: ItemsService,
    private notification: NotificationMessage
  ) { }

  ngOnInit(): void {
    this.isBase = this.itemDetailData.isBase;
    this.disabled = this.isBase;
    this.createFormControls();
    this.createForm();
  }

  createFormControls() {
    this.note = new FormControl(this.itemDetailData.note, [
      Validators.maxLength(100)
    ]);
    this.environment = new FormControl(this.itemDetailData.environment, [
      Validators.required,
      Validators.maxLength(150)
    ]);
    this.hostname = new FormControl(this.itemDetailData.hostname, [
      Validators.maxLength(200)
    ]);
    this.base = new FormControl(this.itemDetailData.isBase, []);
    this.name = new FormControl(this.itemDetailData.name, [
      Validators.maxLength(200)
    ])
    this.resourcesLink = new FormControl(this.itemDetailData.resourcesLink,
      [Validators.maxLength(350)])
  }

  createForm() {
    this.myform = new FormGroup({
      note: this.note,
      environment: this.environment,
      hostname: this.hostname,
      base: this.base,
      name: this.name,
      resourcesLink: this.resourcesLink,
    });
  }

  open(content) {
    this.modalService.open(content, { ariaLabelledBy: "modal-basic-title" });
  }

  onSubmit() {
    if (this.myform.valid) {
      const { note, environment, base, hostname, name, resourcesLink } = this.myform.value;
      const { projectName, id, scenarioName } = this.itemDetailData.params;
      this.itemsApiService.updateItemInfo(id, projectName, scenarioName,
        { environment, note, base, hostname, name, resourcesLink })
        .pipe(catchError(r => of(r)))
        .subscribe(_ => {
          this.itemDetailChange.emit({ note, environment, hostname, name });
          const message = this.notification.itemUpdate(_);
          return this.itemsApiService.setData(message);
        }).add((_) => {
          if (this.reloadItems) {
            this.itemsService.fetchItems(projectName, scenarioName);
          }
        });
      this.modalService.dismissAll();
    }
  }

}
