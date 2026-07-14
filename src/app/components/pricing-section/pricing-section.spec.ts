import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PricingSectionComponent } from './pricing-section';

describe('PricingSectionComponent', () => {
  it('renders the current free grant and paid credit packages', async () => {
    await TestBed.configureTestingModule({
      imports: [PricingSectionComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(PricingSectionComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Free');
    expect(text).toContain('20,000 AI credits');
    expect(text).toContain('Starter');
    expect(text).toContain('£7.99');
    expect(text).toContain('Standard');
    expect(text).toContain('£16.99');
    expect(text).toContain('Pro');
    expect(text).toContain('£34.99');
  });
});
