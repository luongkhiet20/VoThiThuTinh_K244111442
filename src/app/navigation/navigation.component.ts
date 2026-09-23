import { Component } from '@angular/core';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  modules: string[] = [
    'Module 1',
    'Module 2',
    'Module 3',
    'Module 4',
    'Module 5',
    'Module 6',
    'Module 7'
  ];
}
