import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventFilter } from './event-filter';

describe('EventFilter', () => {
  let component: EventFilter;
  let fixture: ComponentFixture<EventFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
