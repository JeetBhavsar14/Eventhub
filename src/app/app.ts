import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ApiClient } from '@core/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
// for Testing purpose only 
export class App implements OnInit {
  private authService = inject(AuthService);
  private apiClient = inject(ApiClient);

  async ngOnInit() {
    console.log('--- RUNNING FOUNDATION TEST ---');
    
    // 1. Test Login
    console.log('Attempting login...');
    const result = await this.authService.login('jeet@eventhub.com', 'password123');
    
    console.log('Login Result:', result);
    
    if (result.success) {
      // 2. Test Signals and Storage
      console.log('User Signal:', this.authService.currentUser());
      console.log('Token Signal:', this.authService.token());
      console.log('Check Application -> Local Storage in DevTools to see the saved token!');
      
      // 3. Test Axios Interceptor
      console.log('Fetching events to test interceptor...');
      const events = await this.apiClient.get('/events');
      console.log('Events fetched:', events.data);
      console.log('Check the Network Tab -> click the "/events" request -> look at Request Headers. You should see Authorization: Bearer <token>');
    }
  }
}
