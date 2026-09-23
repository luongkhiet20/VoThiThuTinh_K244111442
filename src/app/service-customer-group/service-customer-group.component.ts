import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CustomerHttpService, ICustomerGroup } from '../services/customer-http.service';

@Component({
  selector: 'app-service-customer-group',
  standalone: false,
  templateUrl: './service-customer-group.component.html',
  styleUrls: ['./service-customer-group.component.css']
})
export class ServiceCustomerGroupComponent implements OnInit {
  customerGroups: ICustomerGroup[] = [];
  errMessage: string = '';

  constructor(
    private customerService: CustomerHttpService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customerGroups = data;
        console.log('Customer data loaded successfully:', data);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errMessage = err.message || err.toString();
        console.error('Lỗi khi tải dữ liệu khách hàng:', err);
        this.cdr.detectChanges();
      }
    });
  }
}
