import { AuthService } from './../../auth.service';
import { Component } from '@angular/core';
import { faCheck, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-signup-page',
  templateUrl: './signup-page.component.html',
  styleUrls: ['./signup-page.component.scss']
})
export class SignupPageComponent {
  mailIcon = faEnvelope
  checkIcon = faCheck
  lockerIcon = faLock

  constructor(private authService: AuthService){}

  onSignupButtonClicked(email: string, password: string){
    this.authService.signup(email, password).subscribe((res: HttpResponse<any>) => {
      	console.log(res)
    })
  }
}
