import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface InfoPageData { title: string; intro: string; sections: { heading: string; body: string }[]; }
@Component({ selector: 'app-info-page', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './info-page.component.html', styleUrl: './info-page.component.css' })
export class InfoPageComponent {
  private route = inject(ActivatedRoute);
  page = this.route.snapshot.data as InfoPageData;
}
