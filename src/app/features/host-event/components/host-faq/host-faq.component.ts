import { Component, Input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaqItem } from '../../models/host-event.models';

@Component({
  selector: 'app-host-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './host-faq.component.html',
  styleUrl: './host-faq.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostFaqComponent {
  @Input({ required: true }) faqs: FaqItem[] = [];

  activeFaqCategory = signal<string>('all');
  faqSearchTerm = signal<string>('');

  filteredFaqs = computed(() => {
    const cat = this.activeFaqCategory();
    const search = this.faqSearchTerm().toLowerCase().trim();

    return this.faqs.filter(faq => {
      const matchesCategory = cat === 'all' || faq.category === cat;
      const matchesSearch = !search || 
        faq.question.toLowerCase().includes(search) || 
        faq.answer.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  });

  toggleFaq(faq: FaqItem): void {
    faq.isOpen = !faq.isOpen;
  }
}

