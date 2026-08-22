import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import { RouterLink } from '@angular/router';
import {PUBLIC_APP_CONFIG} from '../../config/public-app-config';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly config = inject(PUBLIC_APP_CONFIG);
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
