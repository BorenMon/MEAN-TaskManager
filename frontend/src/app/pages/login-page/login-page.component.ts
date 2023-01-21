import { HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { faCheck, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from 'src/app/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  mailIcon = faEnvelope
  checkIcon = faCheck
  lockerIcon = faLock

  constructor(private authService: AuthService){}

  onLoginButtonClicked(email: string, password: string){
    this.authService.login(email, password).subscribe((res: HttpResponse<any>) => {
      	console.log(res)
    })
  }
}
