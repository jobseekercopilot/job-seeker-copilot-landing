import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_APP_CONFIG } from '../../config/public-app-config';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly menuOpen = signal(false);
  protected readonly appConfig = inject(PUBLIC_APP_CONFIG);
  protected readonly applicationAccessAvailable = Boolean(
    this.appConfig.mainApplicationUrl &&
    this.appConfig.registrationUrl &&
    this.appConfig.signInUrl,
  );

  protected toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
