import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { DEFAULT_PUBLIC_APP_CONFIG, PUBLIC_APP_CONFIG } from '../../config/public-app-config';
import { ContactResult, ContactService } from '../../services/contact.service';
import { ContactFormComponent } from './contact-form';

class ContactServiceStub {
  response: Observable<ContactResult> = of({ status: 'sent' });
  calls = 0;

  send(): Observable<ContactResult> {
    this.calls += 1;
    return this.response;
  }
}

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let service: ContactServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [
        provideRouter([]),
        { provide: PUBLIC_APP_CONFIG, useValue: DEFAULT_PUBLIC_APP_CONFIG },
        { provide: ContactService, useClass: ContactServiceStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactFormComponent);
    service = TestBed.inject(ContactService) as unknown as ContactServiceStub;
    fixture.detectChanges();
  });

  it('rejects missing and whitespace-only fields', () => {
    setField('#contact-name', '   ');
    submit();
    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter your name using no more than 120 characters.');
  });

  it('rejects an invalid email and enforces the displayed message limit', () => {
    fillValidForm();
    setField('#contact-email', 'invalid');
    setField('#contact-message', 'x'.repeat(3001));
    submit();
    expect(service.calls).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect((fixture.nativeElement.querySelector('#contact-message') as HTMLTextAreaElement).maxLength).toBe(3000);
  });

  it('submits a valid form and announces success', () => {
    fillValidForm();
    submit();
    expect(service.calls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Your message has been sent.');
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it('shows a safe backend error', () => {
    service.response = throwError(() => new Error('private provider detail'));
    fillValidForm();
    submit();
    expect(fixture.nativeElement.textContent).toContain('Your message could not be sent.');
    expect(fixture.nativeElement.textContent).not.toContain('private provider detail');
  });

  it('prevents repeated submission while sending', () => {
    service.response = new Subject<ContactResult>();
    fillValidForm();
    submit();
    submit();
    expect(service.calls).toBe(1);
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  function fillValidForm(): void {
    setField('#contact-name', 'Alex');
    setField('#contact-email', 'alex@example.com');
    setField('#contact-subject', 'Early access');
    setField('#contact-message', 'I would like to learn more about early access.');
  }

  function setField(selector: string, value: string): void {
    const field = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    fixture.detectChanges();
  }
});
