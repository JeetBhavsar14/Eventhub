import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HostEventComponent } from './host-event.component';

describe('HostEventComponent', () => {
  let component: HostEventComponent;
  let fixture: ComponentFixture<HostEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostEventComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(HostEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default options and categories', () => {
    expect(component.benefits.length).toBeGreaterThan(0);
    expect(component.eventCategories.length).toBeGreaterThan(0);
    expect(component.timelineSteps.length).toBe(4);
    expect(component.requirements.length).toBe(6);
  });
});

