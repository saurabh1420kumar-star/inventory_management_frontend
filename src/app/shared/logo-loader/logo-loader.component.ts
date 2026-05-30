import { Component, ViewEncapsulation } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-logo-loader',
  standalone: true,
  imports: [AsyncPipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (loadingService.loading$ | async) {
      <div class="logo-loader-overlay">
        <div class="logo-loader-box">
          <div class="logo-wrapper">
            <div class="spinner-ring"></div>
            <img src="assets/images/nayla.jpeg" alt="Loading" class="logo-img" />
          </div>
          <div class="logo-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .logo-loader-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      animation: logo-overlay-in 0.2s ease;
    }

    .dark .logo-loader-overlay {
      background: #0d0d1a;
    }

    @keyframes logo-overlay-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .logo-loader-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    /* Wrapper holds the static logo + the spinning ring as separate layers */
    .logo-wrapper {
      position: relative;
      width: 116px;
      height: 116px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Spinning ring — only this rotates, NOT the image */
    .spinner-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 4px solid #ede9fe;
      border-top-color: #a855f7;
      border-right-color: #7c3aed;
      animation: logo-ring-spin 1s linear infinite;
    }

    .dark .spinner-ring {
      border-color: #2e1065;
      border-top-color: #a855f7;
      border-right-color: #c084fc;
    }

    @keyframes logo-ring-spin {
      to { transform: rotate(360deg); }
    }

    /* Logo stays perfectly still */
    .logo-img {
      width: 92px;
      height: 92px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    /* Bouncing dots */
    .logo-dots {
      display: flex;
      gap: 10px;
    }

    .logo-dots span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #a855f7;
      animation: logo-dot-bounce 1.3s ease-in-out infinite;
    }

    .logo-dots span:nth-child(2) { animation-delay: 0.2s; }
    .logo-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes logo-dot-bounce {
      0%, 80%, 100% { transform: translateY(0);    opacity: 0.45; }
      40%            { transform: translateY(-12px); opacity: 1; }
    }
  `]
})
export class LogoLoaderComponent {
  constructor(public loadingService: LoadingService) {}
}
