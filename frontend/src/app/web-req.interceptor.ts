import { HttpErrorResponse, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError, tap, empty } from 'rxjs'
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, switchMap } from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class WebReqInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

  refreshingAccessToken: boolean = false

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Handle the request
    request = this.addAuthHeader(request)

    // call next() and handle the response
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if(error.status === 401 && !this.refreshingAccessToken) {
          // 401 error, so we are unauthorized

          // refresh the access token
          return this.refreshAccessToken().pipe(
            switchMap(() => {
              request = this.addAuthHeader(request)
              return next.handle(request)
            }),
            catchError((err: any) => {
              console.log(err)
              this.authService.logout()
              return empty()
            })
          )
        }

        return throwError(error)
      })
    )
  }

  refreshAccessToken(){
    this.refreshingAccessToken = true
    // we want to call a method in the auth service to send a request to refresh the access token
    return this.authService.getNewAccessToken().pipe(
      tap(() => {
        this.refreshingAccessToken = false
        console.log("Access Token Refreshed")
      })
    )
  }

  addAuthHeader(request: HttpRequest<any>){
    // get the access token
    const token = this.authService.getAccessToken()

    if(token){
      // append the access token to the request header
      return request.clone({
        setHeaders: {
          'x-access-token': token
        }
      })
    }
    return request
  }
}
