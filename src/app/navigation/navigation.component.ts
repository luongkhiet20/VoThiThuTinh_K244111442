import { Component } from '@angular/core';

@Component({
  selector: 'app-navigation',
  standalone: false,
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  modules: string[] = [
    'Module 2',
    'Slug Fashion',
  ];
}
