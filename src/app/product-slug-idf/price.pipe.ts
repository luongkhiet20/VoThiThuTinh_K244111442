import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'priceFormat',
  standalone: false,
})
export class PriceFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }
    const num = Number(value);
    if (isNaN(num)) {
      return String(value);
    }
    return new Intl.NumberFormat('vi-VN').format(num);
  }
}
