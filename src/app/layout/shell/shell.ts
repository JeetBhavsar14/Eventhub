import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '@shared/components';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class ShellComponent {}
