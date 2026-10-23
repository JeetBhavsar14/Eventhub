import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-pagination-bar',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pagination-bar.component.html',
  styleUrl: './pagination-bar.component.css'
})
export class PaginationBarComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() pageNumbers: number[] = [];
  @Input() startItem: number = 0;
  @Input() endItem: number = 0;
  @Input() totalItems: number = 0;
  @Input() itemLabel: string = 'items';
  @Input() pageSize?: number;
  @Input() pageSizeOptions?: number[];
  @Input() variant: 'standard' | 'panel' = 'standard';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get computedPageNumbers(): number[] {
    if (this.pageNumbers && this.pageNumbers.length > 0) {
      return this.pageNumbers;
    }
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  onSelectPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPrev(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onSelectPageSize(size: number): void {
    if (this.pageSize !== size) {
      this.pageSizeChange.emit(size);
    }
  }
}
