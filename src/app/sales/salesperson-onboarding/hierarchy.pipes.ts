import { Pipe, PipeTransform } from '@angular/core';
import { SalesPerson } from '../../services/sales-hierarchy.service';

@Pipe({ name: 'roleCount', standalone: true })
export class RoleCountPipe implements PipeTransform {
  transform(persons: SalesPerson[], role: string): number {
    return persons.filter(p => p.role === role).length;
  }
}

@Pipe({ name: 'roleFilter', standalone: true })
export class RoleFilterPipe implements PipeTransform {
  transform(persons: SalesPerson[], role: string): SalesPerson[] {
    return persons.filter(p => p.role === role);
  }
}
