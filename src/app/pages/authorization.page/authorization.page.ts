import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AnilistService } from '../../services/anilist.service';

@Component({
  selector: 'app-authorization.page',
  imports: [RouterLink],
  templateUrl: './authorization.page.html',
  styleUrl: './authorization.page.css',
})
export class AuthorizationPage implements OnInit {
  private readonly anilist = inject(AnilistService)
  private readonly router = inject(Router)
  private readonly activatedRoute = inject(ActivatedRoute)
  
  readonly error = signal<string>("")

  ngOnInit() {
    this.activatedRoute.fragment.subscribe((fragment) => {
      if(fragment) {
        const params = new URLSearchParams(fragment)

        const accessToken = params.get('access_token')
        const tokenType = params.get('token_type')
        const expiresIn = params.get('expires_in')

        if(!accessToken || !expiresIn) {
          return this.error.set("Missing URL fragment")
        }
        if(!Number(expiresIn)) {
          return this.error.set("Invalid URL fragment params")
        }
        this.anilist.authorize(accessToken, Number(expiresIn)).subscribe({
          next: (profile) => {
            this.router.navigate(["/"])
          },
          error: (err) => {
            console.error("ERROR WHILE AUTHORIZING:", err)
            const message = err.message
            this.error.set(message || "Unknown error when authorizing")
          }
        })
      } else {
        this.error.set("Missing URL fragment")
      }
    })
  }
}
