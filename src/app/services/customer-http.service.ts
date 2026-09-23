import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs';

export interface ICustomer {
  Id: string;
  Name: string;
  Email: string;
  Age: number;
  Image: string;
}

export interface ICustomerGroup {
  CustomerTypeId: number;
  CustomterTypeName: string;
  Customers: Array<ICustomer>;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerHttpService {
  private _url: string = 'assets/data/customers.json';

  constructor(private _http: HttpClient) {}

  getCustomers(): Observable<ICustomerGroup[]> {
    return this._http.get<ICustomerGroup[]>(this._url).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(error.message));
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProductHttpService extends CustomerHttpService {}
